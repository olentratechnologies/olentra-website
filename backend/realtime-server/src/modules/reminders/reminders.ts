import { createHash } from "node:crypto";
import type { ClientSession } from "mongodb";
import type { Principal } from "../../shared/principal";
import type { Collection, Document } from "mongodb";
import type { Outbox } from "../outbox/outbox";
import { isoWeek } from "../checkins/weeks";

type Tx = <T>(key: string, actor: Principal | null, input: unknown, fn: (session: ClientSession) => Promise<T>) => Promise<T>;
type Row = Document & { _id: string };
export const REVIEW_AFTER_DAYS = 3;
const DAY = 86_400_000;

/** Monday, 9am or later, India time: when the weekly digest goes out. */
export function isDigestTime(now: Date) {
  const ist = new Date(now.getTime() + 5.5 * 3_600_000);
  return ist.getUTCDay() === 1 && ist.getUTCHours() >= 9;
}

/**
 * Hourly reminder run. Every email is queued on the outbox (so it retries),
 * and each reminder is marked sent so it goes out once:
 * - interview reminders to applicants ~24 hours ahead (always on)
 * - review reminders for applications waiting 3+ days (setting: reviewReminder)
 * - Monday digest for admins (setting: weeklyDigest)
 */
export async function runReminders({ collection, outbox, transact, now = new Date() }: { collection: (name: string) => Collection<Row>; outbox: Outbox; transact: Tx; now?: Date }) {
  const applications = collection("applications"), interviews = collection("interviews"), accounts = collection("accounts"), settings = collection("settings"), tasks = collection("tasks");
  const config = await settings.findOne({ _id: "program" }, { projection: { reviewReminder: 1, weeklyDigest: 1, lastDigestWeek: 1 } });
  const sent = { interviews: 0, reviews: 0, digests: 0 };
  const admins = async () => (await accounts.find({ role: "company", staffRole: "admin", disabled: { $ne: true } }, { projection: { email: 1, name: 1 } }).toArray()).filter(row => typeof row.email === "string" && row.email);

  // Interview reminders, about a day ahead.
  const soon = await interviews.find({ status: { $ne: "Cancelled" }, reminderSentOn: { $exists: false }, scheduledAt: { $gt: now.toISOString(), $lte: new Date(now.getTime() + DAY).toISOString() } }).limit(100).toArray();
  for (const interview of soon) {
    const sequence = String(interview.sequence || 0);
    const key = createHash("sha256").update(`interview-reminder:${interview._id}:${sequence}`).digest("hex");
    const queued = await transact(key, null, { interviewId: interview._id, sequence }, async session => {
      const claimed = await interviews.updateOne({ _id: interview._id, scheduledAt: interview.scheduledAt, sequence: interview.sequence ?? { $exists: false }, status: { $ne: "Cancelled" }, reminderSentOn: { $exists: false } }, { $set: { reminderSentOn: now.toISOString() } }, { session });
      if (!claimed.modifiedCount) return false;
      await outbox.enqueue("interviewReminder", { applicationId: String(interview.applicationId), interviewId: interview._id, sequence, scheduledAt: String(interview.scheduledAt), meetingUrl: String(interview.meetingUrl || "") }, session);
      return true;
    });
    if (queued) sent.interviews++;

  }

  // Review reminders: one email per reviewer listing what's waiting on them.
  if (config?.reviewReminder === true) {
    const cutoff = new Date(now.getTime() - REVIEW_AFTER_DAYS * DAY).toISOString().slice(0, 10);
    const waiting = await applications.find({ status: { $in: ["Applied", "Under Review"] }, appliedOn: { $lte: cutoff }, reviewReminderSentOn: { $exists: false } }, { projection: { name: 1, program: 1, assignedTo: 1 } }).limit(200).toArray();
    if (waiting.length) {
      const byReviewer = new Map<string, Row[]>();
      for (const application of waiting) { const key = String(application.assignedTo || ""); byReviewer.set(key, [...(byReviewer.get(key) || []), application]); }
      const adminRows = await admins();
      for (const [reviewerId, list] of byReviewer) {
        const recipients = reviewerId ? await accounts.find({ _id: reviewerId, disabled: { $ne: true } }, { projection: { email: 1 } }).toArray() : adminRows;
        for (const recipient of recipients) {
          await outbox.enqueue("notice", {
            to: String(recipient.email), subject: `${list.length} ${list.length === 1 ? "application is" : "applications are"} waiting for review`,
            intro: reviewerId ? `These applications assigned to you have waited more than ${REVIEW_AFTER_DAYS} days.` : `These unassigned applications have waited more than ${REVIEW_AFTER_DAYS} days.`,
            items: list.slice(0, 20).map(application => `${String(application.name)} · ${String(application.program || "")}`).join("\n") + (list.length > 20 ? `\n…and ${list.length - 20} more` : ""),
            ctaLabel: "Review applications", ctaPath: reviewerId ? "/intern/dashboard/applications?assignee=me" : "/intern/dashboard/applications",
          });
        }
      }
      await applications.updateMany({ _id: { $in: waiting.map(application => application._id) } }, { $set: { reviewReminderSentOn: now.toISOString() } });
      sent.reviews = waiting.length;
    }
  }

  // Weekly digest for admins, once per ISO week.
  const week = isoWeek(now);
  if (config?.weeklyDigest === true && isDigestTime(now) && config?.lastDigestWeek !== week) {
    const claimed = await settings.updateOne({ _id: "program", lastDigestWeek: { $ne: week } }, { $set: { lastDigestWeek: week } });
    if (claimed.modifiedCount) {
      const since = new Date(now.getTime() - 7 * DAY).toISOString().slice(0, 10), today = now.toISOString().slice(0, 10);
      const [newApplications, pending, shortlisted, overdue] = await Promise.all([
        applications.countDocuments({ appliedOn: { $gte: since } }),
        applications.countDocuments({ status: { $in: ["Applied", "Under Review"] } }),
        applications.countDocuments({ status: "Shortlisted" }),
        tasks.countDocuments({ dueOn: { $lt: today }, status: { $nin: ["Approved"] } }),
      ]);
      for (const admin of await admins()) {
        await outbox.enqueue("notice", {
          to: String(admin.email), subject: "Your weekly internship summary",
          intro: `Here's where things stand for ${week}.`,
          items: [`New applications in the last 7 days: ${newApplications}`, `Waiting for review: ${pending}`, `Shortlisted: ${shortlisted}`, `Overdue intern tasks: ${overdue}`].join("\n"),
          ctaLabel: "Open the dashboard", ctaPath: "/intern/dashboard",
        });
        sent.digests++;
      }
    }
  }
  return sent;
}
