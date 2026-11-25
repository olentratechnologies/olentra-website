import type { Collection, Document } from "mongodb";
import type { OutboxRow } from "../outbox/outbox";
import { AUTOMATED_EMAILS } from "../email-templates/automated-templates";

/**
 * A staff-only record of every email sent to an applicant, shown on their
 * timeline. One entry per outbox row (same id), written once the email has
 * finally been sent or has failed for good. Emails the system decided not
 * to send (an outdated reminder, rejection emails switched off) are not logged.
 */
export type EmailLogEntry = {
  _id: string;
  applicationId: string;
  to: string;
  label: string;
  status: "sent" | "failed";
  error?: string;
  at: Date;
};

const STATUS_LABELS: Record<string, string> = {
  ...Object.fromEntries(AUTOMATED_EMAILS.map(email => [email.id, email.name])),
  rejected: "Application not selected",
};

export function createEmailLog({ collection }: { collection: (name: string) => Collection<any> }) {
  const log = collection("email_log") as Collection<EmailLogEntry>;
  const applications = collection("applications");

  /** Works out who an outbox email was for and what to call it; null when it isn't about an applicant. */
  async function describe(row: OutboxRow): Promise<{ applicationId: string; to: string; label: string } | null> {
    const p = row.payload || {};
    let applicationId = String(p.applicationId || "");
    let application: Document | null = null;
    if (!applicationId && row.type === "customEmail" && p.to) {
      application = await applications.findOne({ email: String(p.to).trim().toLowerCase() }, { projection: { email: 1 } });
      applicationId = application ? String(application._id) : "";
    }
    if (!applicationId) return null;
    application ||= await applications.findOne({ _id: applicationId as any }, { projection: { email: 1 } });
    if (!application) return null;
    const to = String(p.to || application.email || "");
    let label: string;
    switch (row.type) {
      case "applicationConfirmation": label = "Application received"; break;
      case "magicLink": label = "Sign-in link"; break;
      case "applicantStatus": label = STATUS_LABELS[p.status || ""] || `Status update (${p.status})`; break;
      case "interview": label = p.status === "Cancelled" ? "Interview cancelled" : "Interview scheduled or updated"; break;
      case "interviewReminder": label = "Interview reminder"; break;
      case "taskAssigned":
      case "taskReminder": {
        const task = await collection("tasks").findOne({ _id: p.taskId }, { projection: { title: 1 } });
        label = `${row.type === "taskReminder" ? "Task reminder" : "New task assigned"}${task?.title ? `: ${task.title}` : ""}`;
        break;
      }
      case "customEmail": {
        const campaign = await collection("custom_email_campaigns").findOne({ _id: p.campaignId }, { projection: { subject: 1 } });
        label = `Custom email${campaign?.subject ? `: ${campaign.subject}` : ""}`;
        break;
      }
      case "notice": label = String(p.subject || "Notice"); break;
      default: label = String(row.type);
    }
    return { applicationId, to, label: label.replace(/[\r\n]+/g, " ").slice(0, 200) };
  }

  return {
    async initialize() {
      await log.createIndex({ applicationId: 1, at: -1 });
    },

    /** Records one outbox email's final outcome; superseded (deliberately unsent) emails are skipped. */
    async recordOutbox(row: OutboxRow, outcome: "sent" | "superseded" | "failed", error?: string, at = new Date()) {
      if (outcome === "superseded") return;
      const described = await describe(row);
      if (!described) return;
      await log.updateOne(
        { _id: row._id },
        { $setOnInsert: { ...described, status: outcome, ...(error ? { error: error.slice(0, 300) } : {}), at } },
        { upsert: true },
      );
    },

    /** Records an email sent directly rather than through the outbox (e.g. a requested sign-in link). */
    async recordDirect(entry: Omit<EmailLogEntry, "_id" | "at"> & { at?: Date }) {
      await log.insertOne({ _id: `MAIL-${crypto.randomUUID()}`, ...entry, at: entry.at || new Date() });
    },

    /** Copies emails the outbox still remembers (it keeps them a week) into the log. Safe to repeat. */
    async backfill(outboxRows: Collection<OutboxRow>) {
      let copied = 0;
      for await (const row of outboxRows.find({ status: { $in: ["sent", "failed"] } })) {
        const before = await log.countDocuments({ _id: row._id }, { limit: 1 });
        if (before) continue;
        await this.recordOutbox(row, row.status as "sent" | "failed", row.lastError, row.sentAt || row.createdAt);
        copied++;
      }
      return copied;
    },

    async list(applicationId: string, limit = 200) {
      const rows = await log.find({ applicationId }).sort({ at: -1 }).limit(limit).toArray();
      return rows.map(row => ({ id: row._id, label: row.label, to: row.to, status: row.status, ...(row.error ? { error: row.error } : {}), at: row.at.toISOString() }));
    },
  };
}
