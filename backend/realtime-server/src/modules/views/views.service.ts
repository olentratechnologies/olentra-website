import { randomUUID } from "node:crypto";
import type { ClientSession, Collection, Document } from "mongodb";
import { DomainError } from "../../shared/errors";
import type { Principal } from "../../shared/principal";

type Row = Document & { _id: string };
type Tx = <T>(key: string, actor: Principal | null, input: unknown, fn: (session: ClientSession) => Promise<T>) => Promise<T>;
export const MAX_VIEWS = 20;

/** Only known Applications filters are kept, each as a short string. */
const FILTER_KEYS = ["search", "status", "programId", "video", "skill", "dateFrom", "dateTo", "assignee", "sortKey", "sortDirection", "videosFirst"];
export function cleanFilters(value: unknown) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const filters: Record<string, string> = {};
  for (const key of FILTER_KEYS) {
    const raw = source[key];
    if (typeof raw === "boolean") filters[key] = String(raw);
    else if (typeof raw === "string" && raw.trim() && raw.length <= 120) filters[key] = raw.trim();
  }
  return filters;
}

/** Each staff member's saved Applications filters; private to them. */
export function createViews({ collection, transact }: { collection: (name: string) => Collection<Row>; transact: Tx }) {
  const views = collection("staff_views");
  const methods = new Set(["view.list", "view.save", "view.delete"]);
  const shape = (row: Row) => ({ id: row._id, name: row.name, filters: row.filters || {} });
  async function initialize() { await views.createIndex({ ownerId: 1, name: 1 }); }
  async function execute(method: string, params: Record<string, any>, actor: Principal | null, key: string) {
    if (actor?.role !== "company") throw new DomainError("FORBIDDEN", "Staff access is required.");
    if (method === "view.list") return (await views.find({ ownerId: actor.id }).sort({ name: 1 }).limit(MAX_VIEWS).toArray()).map(shape);
    if (method === "view.delete") {
      return transact(key, actor, { method, params }, async session => {
        const removed = await views.deleteOne({ _id: String(params.id || ""), ownerId: actor.id }, { session });
        if (!removed.deletedCount) throw new DomainError("NOT_FOUND", "Saved view not found.");
        return { deleted: true };
      });
    }
    const name = typeof params.name === "string" ? params.name.trim().slice(0, 40) : "";
    if (!name) throw new DomainError("INVALID_REQUEST", "Name this view.");
    const filters = cleanFilters(params.filters);
    return transact(key, actor, { method, params }, async session => {
      // Saving with an existing name replaces that view.
      const existing = await views.findOne({ ownerId: actor.id, name }, { session });
      if (existing) {
        await views.updateOne({ _id: existing._id }, { $set: { filters, updatedOn: new Date().toISOString() } }, { session });
        return shape({ ...existing, filters });
      }
      if (await views.countDocuments({ ownerId: actor.id }, { session }) >= MAX_VIEWS) throw new DomainError("INVALID_REQUEST", `Keep at most ${MAX_VIEWS} saved views.`);
      const row: Row = { _id: `VIEW-${randomUUID()}`, ownerId: actor.id, name, filters, createdOn: new Date().toISOString() };
      await views.insertOne(row, { session });
      return shape(row);
    });
  }
  return { initialize, supports: (method: string) => methods.has(method), execute };
}
