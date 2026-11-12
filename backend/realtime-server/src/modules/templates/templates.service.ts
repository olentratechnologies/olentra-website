import { randomUUID } from "node:crypto";
import type { ClientSession, Collection, Document } from "mongodb";
import { DomainError } from "../../shared/errors";
import type { Principal } from "../../shared/principal";
import { can, isAdmin } from "../access/policy";

type Row = Document & { _id: string };
type Tx = <T>(key: string, actor: Principal | null, input: unknown, fn: (session: ClientSession) => Promise<T>) => Promise<T>;
const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const MAX_TEMPLATES = 50;

/**
 * Reusable messages for applicants and interns. Admins manage them; anyone
 * who can message applicants or interns can use them. Placeholders such as
 * {firstName} are filled in by the composer, never on the server.
 */
export function createTemplates({ collection, transact }: { collection: (name: string) => Collection<Row>; transact: Tx }) {
  const templates = collection("message_templates");
  const methods = new Set(["template.list", "template.save", "template.delete"]);
  const shape = (row: Row) => ({ id: row._id, name: row.name, subject: row.subject, body: row.body, updatedOn: row.updatedOn });

  async function initialize() { await templates.createIndex({ name: 1 }); }

  async function execute(method: string, params: Record<string, any>, actor: Principal | null, key: string) {
    if (actor?.role !== "company") throw new DomainError("FORBIDDEN", "Staff access is required.");
    if (method === "template.list") {
      if (!isAdmin(actor) && !can(actor, "messages.applicants") && !can(actor, "messages.interns")) throw new DomainError("FORBIDDEN", "Your role cannot send messages.");
      return (await templates.find({}).sort({ name: 1 }).limit(MAX_TEMPLATES).toArray()).map(shape);
    }
    if (!isAdmin(actor)) throw new DomainError("FORBIDDEN", "Only an admin can manage message templates.");
    if (method === "template.delete") {
      return transact(key, actor, { method, params }, async session => {
        const removed = await templates.deleteOne({ _id: text(params.id) }, { session });
        if (!removed.deletedCount) throw new DomainError("NOT_FOUND", "Template not found.");
        return { deleted: true };
      });
    }
    const name = text(params.name).slice(0, 60), subject = text(params.subject).slice(0, 160), body = text(params.body);
    if (!name || !subject || !body || body.length > 5000) throw new DomainError("INVALID_REQUEST", "Give the template a name, a subject and a message of up to 5,000 characters.");
    return transact(key, actor, { method, params }, async session => {
      const now = new Date().toISOString(), id = text(params.id);
      if (id) {
        const updated = await templates.findOneAndUpdate({ _id: id }, { $set: { name, subject, body, updatedOn: now } }, { session, returnDocument: "after" });
        if (!updated) throw new DomainError("NOT_FOUND", "Template not found.");
        return shape(updated);
      }
      if (await templates.countDocuments({}, { session }) >= MAX_TEMPLATES) throw new DomainError("INVALID_REQUEST", `Keep at most ${MAX_TEMPLATES} templates.`);
      const row: Row = { _id: `TPL-${randomUUID()}`, name, subject, body, createdOn: now, updatedOn: now };
      await templates.insertOne(row, { session });
      return shape(row);
    });
  }
  return { initialize, supports: (method: string) => methods.has(method), execute };
}
