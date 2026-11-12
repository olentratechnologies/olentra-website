import { randomUUID } from "node:crypto";
import type { ClientSession, Collection, Document } from "mongodb";
import { DomainError } from "../../shared/errors";
import type { Principal } from "../../shared/principal";
import { can, isAdmin } from "../access/policy";

type Row = Document & { _id: string };
type Tx = <T>(key: string, actor: Principal | null, input: unknown, fn: (session: ClientSession) => Promise<T>) => Promise<T>;

export const MAX_QUOTE = 280;
export const MIN_QUOTE = 20;
export const PUBLIC_LIMIT = 12;
const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** Public name for a story: first name and last initial only ("Priya S."). */
export function displayNameFor(name: unknown) {
  const parts = text(name).split(/\s+/).filter(Boolean);
  if (!parts.length) return "Olentra intern";
  const first = parts[0]!.slice(0, 40);
  return parts.length > 1 ? `${first} ${parts.at(-1)![0]!.toUpperCase()}.` : first;
}

/** Validates an intern's story submission; consent must be explicit. */
export function validateStory(params: Record<string, unknown>) {
  const quote = text(params.quote).replace(/\s+/g, " ");
  if (params.consent !== true) throw new DomainError("INVALID_REQUEST", "Please confirm Olentra may show your story publicly.");
  if (quote.length < MIN_QUOTE || quote.length > MAX_QUOTE) throw new DomainError("INVALID_REQUEST", `Write between ${MIN_QUOTE} and ${MAX_QUOTE} characters.`);
  return { quote };
}

const publicStory = (row: Row) => ({ id: row._id, displayName: row.displayName, program: row.program, programId: row.programId, quote: row.quote });
const ownStory = (row: Row | null) => (row ? { id: row._id, displayName: row.displayName, program: row.program, quote: row.quote, status: row.status, submittedOn: row.submittedOn, reviewedOn: row.reviewedOn ?? null } : null);

/**
 * Success stories: certified interns opt in with a short quote; an admin
 * approves it before it appears on the public careers page.
 */
export function createStories({ collection, transact }: { collection: (name: string) => Collection<Row>; transact: Tx }) {
  const stories = collection("stories"), applications = collection("applications"), certificates = collection("certificates"), events = collection("events");
  const methods = new Set(["story.submit", "story.mine", "story.withdraw", "story.list", "story.review", "story.public"]);
  const intern = (actor: Principal | null) => {
    if (actor?.role !== "intern" || !actor.applicationId) throw new DomainError("FORBIDDEN", "Sign in to your intern account to share a story.");
    return actor.applicationId;
  };
  const changed = (session: ClientSession, applicationId: string) =>
    events.insertOne({ _id: `EVT-${randomUUID()}`, type: "story.changed", public: true, applicationIds: [applicationId], createdAt: new Date() }, { session });

  async function initialize() {
    await Promise.all([stories.createIndex({ applicationId: 1 }, { unique: true }), stories.createIndex({ status: 1, reviewedOn: -1 })]);
  }

  async function execute(method: string, params: Record<string, any>, actor: Principal | null, key: string) {
    if (method === "story.public") {
      const rows = await stories.find({ status: "Approved" }).sort({ reviewedOn: -1, _id: 1 }).limit(PUBLIC_LIMIT).toArray();
      return rows.map(publicStory);
    }
    if (method === "story.mine") return ownStory(await stories.findOne({ applicationId: intern(actor) }));
    if (method === "story.list") {
      if (actor?.role !== "company" || !can(actor, "certificates.read")) throw new DomainError("FORBIDDEN", "Your role cannot view success stories.");
      const rows = await stories.find({}).sort({ submittedOn: -1 }).limit(200).toArray();
      return rows.map(row => ({ ...ownStory(row), applicationId: row.applicationId, programId: row.programId })).sort((a, b) => Number(b.status === "Pending") - Number(a.status === "Pending"));
    }
    if (method === "story.submit") {
      const applicationId = intern(actor), { quote } = validateStory(params);
      return transact(key, actor, { method, params: { quote } }, async session => {
        const [app, certificate] = await Promise.all([
          applications.findOne({ _id: applicationId }, { session, projection: { name: 1, program: 1, programId: 1 } }),
          certificates.findOne({ applicationId }, { session, projection: { _id: 1 } }),
        ]);
        if (!app || !certificate) throw new DomainError("CONFLICT", "Stories open once your internship certificate is issued.");
        const now = new Date().toISOString();
        const old = await stories.findOne({ applicationId }, { session });
        const row: Row = { _id: old?._id || `STORY-${randomUUID()}`, applicationId, displayName: displayNameFor(app.name), program: app.program || "", programId: app.programId || "", quote, consent: true, consentedOn: now, status: "Pending", submittedOn: now, reviewedOn: null };
        await stories.replaceOne({ applicationId }, row, { session, upsert: true });
        await changed(session, applicationId);
        return ownStory(row);
      });
    }
    if (method === "story.withdraw") {
      const applicationId = intern(actor);
      return transact(key, actor, { method, params: {} }, async session => {
        await stories.deleteOne({ applicationId }, { session });
        await changed(session, applicationId);
        return null;
      });
    }
    if (method === "story.review") {
      if (!isAdmin(actor)) throw new DomainError("FORBIDDEN", "Only an internship admin can publish stories.");
      const id = text(params.id), decision = text(params.decision);
      if (!id || !["Approved", "Rejected"].includes(decision)) throw new DomainError("INVALID_REQUEST", "Choose approve or reject.");
      return transact(key, actor, { method, params: { id, decision } }, async session => {
        const updated = await stories.findOneAndUpdate({ _id: id }, { $set: { status: decision, reviewedOn: new Date().toISOString(), reviewerAccountId: actor!.id } }, { session, returnDocument: "after" });
        if (!updated) throw new DomainError("NOT_FOUND", "This story was withdrawn.");
        await changed(session, updated.applicationId);
        return ownStory(updated);
      });
    }
    throw new DomainError("NOT_IMPLEMENTED", "This story action is not available.");
  }

  return { initialize, supports: (method: string) => methods.has(method), execute };
}
