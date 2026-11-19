import { randomUUID } from "node:crypto";
import type { ClientSession, Collection, Document } from "mongodb";
import { DomainError } from "../../shared/errors";
import type { Principal } from "../../shared/principal";
import type { Outbox } from "../outbox/outbox";
import { isAdmin } from "../access/policy";

type Row = Document & { _id: string };
type Tx = <T>(key: string, actor: Principal | null, input: unknown, fn: (session: ClientSession) => Promise<T>) => Promise<T>;
const MAX_RECIPIENTS = 500;
const MAX_BODY_LENGTH = 100_000;
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const text = (value: unknown) => typeof value === "string" ? value : "";

/** Admin-only, individually addressed email campaigns sent through the shared delivery outbox. */
export function createCustomEmails({ collection, transact, outbox }: {
  collection: (name: string) => Collection<Row>;
  transact: Tx;
  outbox: Outbox;
}) {
  const campaigns = collection("custom_email_campaigns");
  const deliveries = collection("outbox");
  const methods = new Set(["customEmail.send", "customEmail.status", "customEmail.latest"]);

  async function initialize() {
    await Promise.all([
      campaigns.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      campaigns.createIndex({ createdBy: 1, createdAt: -1 }),
      deliveries.createIndex({ "payload.campaignId": 1 }),
    ]);
  }

  async function execute(method: string, params: Record<string, any>, actor: Principal | null, key: string) {
    if (!isAdmin(actor)) throw new DomainError("FORBIDDEN", "Only an admin can send custom emails.");

    if (method === "customEmail.status" || method === "customEmail.latest") {
      let campaignId = text(params.campaignId).trim();
      if (method === "customEmail.latest") {
        const latest = await campaigns.findOne({ createdBy: actor!.id }, {
          projection: { _id: 1 },
          sort: { createdAt: -1 },
        });
        if (!latest) return null;
        campaignId = latest._id;
      }
      if (!campaignId) throw new DomainError("INVALID_REQUEST", "Choose an email campaign to check.");
      const campaign = await campaigns.findOne({ _id: campaignId }, { projection: { createdBy: 1, subject: 1, createdAt: 1, recipients: 1 } });
      if (!campaign) throw new DomainError("NOT_FOUND", "This email campaign is no longer available.");
      if (campaign.createdBy !== actor!.id) throw new DomainError("FORBIDDEN", "You can only view campaigns you created.");
      const recipients = Array.isArray(campaign.recipients) ? campaign.recipients : [];
      const deliveryRows = await deliveries.find({ "payload.campaignId": campaignId }, {
        projection: { status: 1, attempts: 1, lastError: 1, nextAttemptAt: 1 },
      }).toArray();
      const sent = recipients.filter((recipient: any) => recipient.status === "sent").length;
      const failedRecipients = recipients.filter((recipient: any) => recipient.status === "failed").map((recipient: any) => recipient.email);
      const queued = recipients.length - sent - failedRecipients.length;
      const retryingRows = deliveryRows.filter(row => row.status === "pending" && row.attempts > 0);
      const latestError = [...deliveryRows].filter(row => row.lastError).sort((a, b) => Number(b.attempts) - Number(a.attempts))[0]?.lastError || "";
      const nextRetryAt = retryingRows.map(row => row.nextAttemptAt).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] || null;
      return {
        campaignId,
        subject: campaign.subject,
        total: recipients.length,
        sent,
        queued,
        failed: failedRecipients.length,
        failedRecipients,
        retrying: retryingRows.length,
        lastError: latestError,
        nextRetryAt,
        complete: queued === 0,
        createdAt: campaign.createdAt,
      };
    }

    const subject = text(params.subject).trim();
    const body = text(params.body);
    const format = params.format === "html" ? "html" : params.format === "text" ? "text" : "";
    if (!subject || subject.length > 160 || /[\r\n]/.test(subject)) {
      throw new DomainError("INVALID_REQUEST", "Enter an email subject of up to 160 characters.");
    }
    if (!format || !body.trim() || body.length > MAX_BODY_LENGTH) {
      throw new DomainError("INVALID_REQUEST", "Choose a template with a message of up to 100,000 characters.");
    }
    if (!Array.isArray(params.recipients) || params.recipients.length < 1 || params.recipients.length > MAX_RECIPIENTS) {
      throw new DomainError("INVALID_REQUEST", `Add between 1 and ${MAX_RECIPIENTS} email addresses.`);
    }
    const recipients = [...new Set(params.recipients.map((value: unknown) => text(value).trim().toLowerCase()))];
    if (recipients.some(email => email.length > 254 || /[\r\n]/.test(email) || !EMAIL_RE.test(email))) {
      throw new DomainError("INVALID_REQUEST", "Check the recipient list and remove any invalid email addresses.");
    }

    return transact(key, actor, { method, params: { ...params, recipients } }, async session => {
      const campaignId = `CEM-${randomUUID()}`;
      const createdAt = new Date();
      const row: Row = {
        _id: campaignId,
        createdBy: actor!.id,
        subject,
        body,
        format,
        createdAt,
        recipients: recipients.map(email => ({ email, status: "queued" })),
      };
      await campaigns.insertOne(row, { session });
      await outbox.enqueueMany(recipients.map(to => ({ type: "customEmail" as const, payload: { campaignId, to } })), session);
      return { campaignId, total: recipients.length, queued: true, createdAt: createdAt.toISOString() };
    });
  }

  return { initialize, supports: (method: string) => methods.has(method), execute };
}
