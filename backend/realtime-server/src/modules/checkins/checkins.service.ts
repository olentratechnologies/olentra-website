import { randomUUID } from "node:crypto";
import type { ClientSession, Collection, Document } from "mongodb";
import { DomainError } from "../../shared/errors";
import type { Principal } from "../../shared/principal";
import { can, isAdmin } from "../access/policy";
import { checkinStreak, isoWeek } from "./weeks";

type Row = Document & { _id: string };
type Tx = <T>(key: string, actor: Principal | null, input: unknown, fn: (session: ClientSession) => Promise<T>) => Promise<T>;
const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

/**
 * Weekly check-ins: an active intern writes what they did, any blockers and
 * a 1-5 mood once per ISO week (editable that week). Admins and staff who
 * give work feedback can reply; the intern is notified.
 */
export function createCheckins({ collection, transact, now = () => new Date() }: { collection: (name: string) => Collection<Row>; transact: Tx; now?: () => Date }) {
  const checkins = collection("checkins"), interns = collection("interns"), notifications = collection("notifications"), events = collection("events");
  const methods = new Set(["checkin.submit", "checkin.list", "checkin.reply"]);
  const shape = (row: Row) => ({ id: row._id, applicationId: row.applicationId, week: row.week, done: row.done, blockers: row.blockers || "", mood: row.mood, submittedOn: row.submittedOn, reply: row.reply || "", repliedBy: row.repliedByName || "", repliedOn: row.repliedOn || null });
  const canReply = (actor: Principal) => isAdmin(actor) || can(actor, "submissions.feedback");

  async function initialize() { await checkins.createIndex({ applicationId: 1, week: -1 }, { unique: true }); }

  /** The intern's recent check-ins, this week's (if any) and their streak. */
  async function summary(applicationId: string) {
    const rows = await checkins.find({ applicationId }).sort({ week: -1 }).limit(12).toArray();
    const week = isoWeek(now());
    return { week, current: rows.find(row => row.week === week) ? shape(rows.find(row => row.week === week)!) : null, recent: rows.map(shape), streak: checkinStreak(rows.map(row => String(row.week)), now()) };
  }

  async function execute(method: string, params: Record<string, any>, actor: Principal | null, key: string) {
    if (method === "checkin.submit") {
      if (actor?.role !== "intern" || !actor.applicationId) throw new DomainError("FORBIDDEN", "Sign in to your intern account.");
      const applicationId = actor.applicationId, done = text(params.done, 2000), blockers = text(params.blockers, 2000), mood = Number(params.mood);
      if (!done) throw new DomainError("INVALID_REQUEST", "Share what you worked on this week.");
      if (!Number.isInteger(mood) || mood < 1 || mood > 5) throw new DomainError("INVALID_REQUEST", "Choose how the week felt, from 1 to 5.");
      return transact(key, actor, { method, params }, async session => {
        if (!(await interns.findOne({ applicationId, status: "Active" }, { session, projection: { _id: 1 } }))) throw new DomainError("CONFLICT", "Check-ins open once your internship starts.");
        const week = isoWeek(now()), at = now().toISOString();
        await checkins.updateOne({ applicationId, week }, { $set: { done, blockers, mood, submittedOn: at }, $setOnInsert: { _id: `CHK-${randomUUID()}`, applicationId, week } }, { session, upsert: true });
        await events.insertOne({ _id: `EVT-${randomUUID()}`, type: "checkin.submitted", applicationIds: [applicationId], createdAt: new Date() }, { session });
        return shape((await checkins.findOne({ applicationId, week }, { session }))!);
      });
    }
    if (method === "checkin.list") {
      const applicationId = text(params.applicationId, 120) || actor?.applicationId || "";
      if (actor?.role === "intern" ? actor.applicationId !== applicationId : !(actor?.role === "company" && (isAdmin(actor) || can(actor, "interns.read")))) throw new DomainError("FORBIDDEN", "You can't view these check-ins.");
      return { ...(await summary(applicationId)), canReply: actor?.role === "company" && canReply(actor) };
    }
    // checkin.reply
    if (actor?.role !== "company" || !canReply(actor)) throw new DomainError("FORBIDDEN", "Your role can't reply to check-ins.");
    const reply = text(params.reply, 2000);
    if (!reply) throw new DomainError("INVALID_REQUEST", "Write a reply.");
    return transact(key, actor, { method, params }, async session => {
      const at = now().toISOString();
      const row = await checkins.findOneAndUpdate({ _id: text(params.id, 120) }, { $set: { reply, repliedBy: actor.id, repliedByName: actor.name, repliedOn: at } }, { session, returnDocument: "after" });
      if (!row) throw new DomainError("NOT_FOUND", "Check-in not found.");
      await notifications.insertOne({ _id: `NTF-${randomUUID()}`, recipientRole: "intern", applicationId: row.applicationId, title: "Reply to your weekly check-in", body: reply.slice(0, 200), href: "/intern/portal", createdOn: at }, { session });
      await events.insertOne({ _id: `EVT-${randomUUID()}`, type: "checkin.replied", applicationIds: [row.applicationId], createdAt: new Date() }, { session });
      return shape(row);
    });
  }
  return { initialize, supports: (method: string) => methods.has(method), execute, summary };
}
