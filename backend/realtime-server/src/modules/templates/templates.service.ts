import { AUTOMATED_EMAILS, emailDefinition, validateEmailTemplate, type AutomatedEmailId } from "../email-templates/automated-templates";
import { createInternshipMailer } from "../../infrastructure/email/mailer";
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
  const automated = collection("automated_email_templates");
  const methods = new Set(["template.list", "template.save", "template.delete", "automatedEmail.list", "automatedEmail.save", "automatedEmail.preview", "automatedEmail.reset"]);
  const shape = (row: Row) => ({ id: row._id, name: row.name, subject: row.subject, body: row.body, updatedOn: row.updatedOn });

  async function readAutomated(id: AutomatedEmailId) {
    const definition = emailDefinition(id);
    const saved = await automated.findOne({ _id: id });
    return saved ? validateEmailTemplate(id, saved) : { subject: definition.subject, body: definition.body };
  }
  async function initialize() { await templates.createIndex({ name: 1 }); }

  async function execute(method: string, params: Record<string, any>, actor: Principal | null, key: string) {
    if (actor?.role !== "company") throw new DomainError("FORBIDDEN", "Staff access is required.");
    if (method.startsWith("automatedEmail.")) {
      if (!isAdmin(actor)) throw new DomainError("FORBIDDEN", "Only an admin can manage automated emails.");
      if (method === "automatedEmail.list") {
        const saved = new Map((await automated.find({}).toArray()).map(row => [row._id, row]));
        return AUTOMATED_EMAILS.map(definition => ({ ...definition, ...(saved.has(definition.id) ? validateEmailTemplate(definition.id, saved.get(definition.id)!) : {}), customized: saved.has(definition.id) }));
      }
      const definition = emailDefinition(text(params.id));
      if (method === "automatedEmail.preview") {
        const template = validateEmailTemplate(definition.id, params);
        const preview = createInternshipMailer("").renderAutomated(definition.id, {
          name: "Alex Kumar", programName: "Software Engineer Intern", applicationId: "OL-SAMPLE-123",
          scheduledAt: "2030-01-15T10:00:00.000Z", meetingUrl: "https://example.test/interview", portalUrl: definition.id === "selected" ? "https://example.test/intern/verify?token=sample-only" : "https://example.test/intern/portal",
          magicLinkUrl: "https://example.test/intern/verify?token=sample-only", certificateVerifyUrl: "https://example.test/certificates/verify/SAMPLE",
          linkedinShareUrl: definition.id === "offer-accepted" ? "https://www.linkedin.com/feed/?shareActive=true" : "https://www.linkedin.com/sharing/share-offsite/?url=sample", schedule: {durationLabel:"1 calendar month",startOn:"2030-01-24",endOn:"2030-02-23",expiresOn:"2030-01-20T18:29:59.000Z",workMode:"Remote",schedule:"Part-time"}, interviewId: "INTV-SAMPLE", sequence: 1, cancelReason: definition.id === "interview-cancelled" ? "The interviewer is unavailable." : "",
        }, template);
        return preview;
      }
      const template = method === "automatedEmail.save" ? validateEmailTemplate(definition.id, params) : null;
      return transact(key, actor, { method, params }, async session => {
        if (template) await automated.updateOne({ _id: definition.id }, { $set: { ...template, updatedOn: new Date().toISOString(), updatedBy: actor.id } }, { session, upsert: true });
        else await automated.deleteOne({ _id: definition.id }, { session });
        return { ...definition, ...(template || {}), customized: !!template };
      });
    }
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
  return { initialize, readAutomated, supports: (method: string) => methods.has(method), execute };
}
