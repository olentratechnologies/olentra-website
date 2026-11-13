import { randomUUID } from "node:crypto";
import type { ClientSession, Collection, Document } from "mongodb";
import { DomainError } from "../../shared/errors";
import type { Principal } from "../../shared/principal";
import { isAdmin } from "../access/policy";

type Row = Document & { _id: string };
type Tx = <T>(key: string, actor: Principal | null, input: unknown, fn: (session: ClientSession) => Promise<T>) => Promise<T>;
export const RESOURCE_TYPES = ["article", "video", "course", "doc"] as const;
const PROGRAMS = ["explorer", "innovator"];
const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** Validates an admin's resource. An empty track list means every track. */
export function validateResource(params: Record<string, unknown>) {
  const title = text(params.title).slice(0, 120), url = text(params.url), type = text(params.type) || "article", minutes = Number(params.minutes ?? 0);
  if (!title) throw new DomainError("INVALID_REQUEST", "Give the resource a title.");
  let parsed: URL | null = null; try { parsed = new URL(url); } catch { /* invalid */ }
  if (!parsed || !["http:", "https:"].includes(parsed.protocol) || url.length > 2000) throw new DomainError("INVALID_REQUEST", "Enter a valid http or https link.");
  if (!(RESOURCE_TYPES as readonly string[]).includes(type)) throw new DomainError("INVALID_REQUEST", "Choose a resource type.");
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 6000) throw new DomainError("INVALID_REQUEST", "Estimated time must be 0 to 6,000 minutes.");
  const programIds = Array.isArray(params.programIds) ? [...new Set(params.programIds.filter((id): id is string => typeof id === "string" && PROGRAMS.includes(id)))] : [];
  return { title, url, type, minutes, programIds };
}

/** Curated learning links per track; interns tick them off. */
export function createResources({ collection, transact }: { collection: (name: string) => Collection<Row>; transact: Tx }) {
  const resources = collection("resources"), progress = collection("resource_progress"), applications = collection("applications");
  const methods = new Set(["resource.list", "resource.save", "resource.delete", "resource.complete"]);
  const shape = (row: Row) => ({ id: row._id, title: row.title, url: row.url, type: row.type, minutes: row.minutes, programIds: row.programIds || [] });

  async function initialize() {
    await Promise.all([resources.createIndex({ order: 1 }), progress.createIndex({ applicationId: 1, resourceId: 1 }, { unique: true })]);
  }

  /** Resources for this intern's track, each with `done`. Staff get every resource. */
  async function snapshot(actor: Principal | null) {
    if (actor?.role === "company") return (await resources.find({}).sort({ order: 1, _id: 1 }).limit(200).toArray()).map(shape);
    if (actor?.role !== "intern" || !actor.applicationId) return [];
    const application = await applications.findOne({ _id: actor.applicationId }, { projection: { programId: 1 } });
    const programId = String(application?.programId || "");
    const [rows, done] = await Promise.all([
      resources.find({ $or: [{ programIds: { $size: 0 } }, { programIds: programId }] }).sort({ order: 1, _id: 1 }).limit(200).toArray(),
      progress.find({ applicationId: actor.applicationId }, { projection: { resourceId: 1 } }).toArray(),
    ]);
    const finished = new Set(done.map(row => row.resourceId));
    return rows.map(row => ({ ...shape(row), done: finished.has(row._id) }));
  }

  async function execute(method: string, params: Record<string, any>, actor: Principal | null, key: string) {
    if (method === "resource.complete") {
      if (actor?.role !== "intern" || !actor.applicationId) throw new DomainError("FORBIDDEN", "Sign in to your intern account.");
      const resourceId = text(params.resourceId), applicationId = actor.applicationId;
      return transact(key, actor, { method, params }, async session => {
        if (!(await resources.findOne({ _id: resourceId }, { session, projection: { _id: 1 } }))) throw new DomainError("NOT_FOUND", "Resource not found.");
        if (params.done === false) await progress.deleteOne({ applicationId, resourceId }, { session });
        else await progress.updateOne({ applicationId, resourceId }, { $setOnInsert: { _id: `RP-${randomUUID()}`, applicationId, resourceId, completedOn: new Date().toISOString() } }, { session, upsert: true });
        return { resourceId, done: params.done !== false };
      });
    }
    if (actor?.role !== "company") throw new DomainError("FORBIDDEN", "Staff access is required.");
    if (method === "resource.list") return snapshot(actor);
    if (!isAdmin(actor)) throw new DomainError("FORBIDDEN", "Only an admin can manage learning resources.");
    if (method === "resource.delete") {
      return transact(key, actor, { method, params }, async session => {
        const id = text(params.id);
        const removed = await resources.deleteOne({ _id: id }, { session });
        if (!removed.deletedCount) throw new DomainError("NOT_FOUND", "Resource not found.");
        await progress.deleteMany({ resourceId: id }, { session });
        return { deleted: true };
      });
    }
    const values = validateResource(params);
    return transact(key, actor, { method, params }, async session => {
      const id = text(params.id);
      if (id) {
        const updated = await resources.findOneAndUpdate({ _id: id }, { $set: values }, { session, returnDocument: "after" });
        if (!updated) throw new DomainError("NOT_FOUND", "Resource not found.");
        return shape(updated);
      }
      if (await resources.countDocuments({}, { session }) >= 200) throw new DomainError("INVALID_REQUEST", "Keep at most 200 resources.");
      const row: Row = { _id: `RES-${randomUUID()}`, ...values, order: Date.now(), createdOn: new Date().toISOString() };
      await resources.insertOne(row, { session });
      return shape(row);
    });
  }
  return { initialize, supports: (method: string) => methods.has(method), execute, snapshot };
}
