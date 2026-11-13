import { randomUUID } from "node:crypto";
import type { ClientSession, Collection } from "mongodb";

/**
 * Transactional email outbox. A command writes a row inside its transaction,
 * so a rolled-back or retried transaction never sends mail. A worker sends
 * committed rows afterwards and retries failures with backoff. Each row is
 * claimed with a short lease, so several server instances can run the worker
 * and still send every email once.
 */
export type OutboxType = "applicationConfirmation" | "magicLink" | "applicantStatus" | "notice";
export type OutboxRow = {
  _id: string;
  type: OutboxType;
  payload: Record<string, string>;
  status: "pending" | "sent" | "failed";
  attempts: number;
  nextAttemptAt: Date;
  leaseUntil?: Date | null;
  lastError?: string;
  createdAt: Date;
  sentAt?: Date;
  /** Sent and failed rows are removed by a TTL index after a week. */
  expiresAt?: Date;
};

export const OUTBOX_MAX_ATTEMPTS = 6;
const LEASE_MS = 60_000;
const WEEK_MS = 7 * 86_400_000;
/** 30 s, 1 min, 2 min, 4 min, 8 min between attempts. */
export const outboxBackoff = (attempts: number) => Math.min(30_000 * 2 ** Math.max(0, attempts - 1), 30 * 60_000);

export function createOutbox(rows: Collection<OutboxRow>, now: () => number = Date.now) {
  return {
    async initialize() {
      await Promise.all([
        rows.createIndex({ status: 1, nextAttemptAt: 1 }),
        rows.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      ]);
    },
    async enqueue(type: OutboxType, payload: Record<string, string>, session?: ClientSession) {
      const at = new Date(now());
      await rows.insertOne({ _id: `MAIL-${randomUUID()}`, type, payload, status: "pending", attempts: 0, nextAttemptAt: at, leaseUntil: null, createdAt: at }, session ? { session } : undefined);
    },
    async enqueueMany(items: { type: OutboxType; payload: Record<string, string> }[], session?: ClientSession) {
      if (!items.length) return;
      const at = new Date(now());
      await rows.insertMany(items.map(({ type, payload }) => ({ _id: `MAIL-${randomUUID()}`, type, payload, status: "pending" as const, attempts: 0, nextAttemptAt: at, leaseUntil: null, createdAt: at })), session ? { session } : undefined);
    },
    /** Sends up to `limit` due rows through `send`, which must throw when delivery fails. */
    async process(send: (row: OutboxRow) => Promise<void>, limit = 20) {
      let handled = 0;
      while (handled < limit) {
        const at = new Date(now());
        const row = await rows.findOneAndUpdate(
          { status: "pending", nextAttemptAt: { $lte: at }, $or: [{ leaseUntil: null }, { leaseUntil: { $lt: at } }] },
          { $set: { leaseUntil: new Date(at.getTime() + LEASE_MS) }, $inc: { attempts: 1 } },
          { sort: { nextAttemptAt: 1 }, returnDocument: "after" },
        );
        if (!row) break;
        handled++;
        try {
          await send(row);
          await rows.updateOne({ _id: row._id, leaseUntil: row.leaseUntil }, { $set: { status: "sent", sentAt: new Date(now()), leaseUntil: null, expiresAt: new Date(now() + WEEK_MS) } });
        } catch (error) {
          const lastError = String((error as Error)?.message || error).slice(0, 300);
          const failed = row.attempts >= OUTBOX_MAX_ATTEMPTS;
          await rows.updateOne({ _id: row._id, leaseUntil: row.leaseUntil }, {
            $set: failed
              ? { status: "failed", leaseUntil: null, lastError, expiresAt: new Date(now() + WEEK_MS) }
              : { leaseUntil: null, lastError, nextAttemptAt: new Date(now() + outboxBackoff(row.attempts)) },
          });
        }
      }
      return handled;
    },
  };
}
export type Outbox = ReturnType<typeof createOutbox>;

/**
 * Runs `task` every `intervalMs` on at most one server instance at a time,
 * using a lease row per job name. Returns a stop function.
 */
export function runLeasedJob(leases: Collection<{ _id: string; until: Date; owner: string }>, name: string, intervalMs: number, task: () => Promise<unknown>, onError: (error: unknown) => void, now: () => number = Date.now) {
  const owner = randomUUID();
  let stopped = false, running = false;
  const tick = async () => {
    if (stopped || running) return;
    running = true;
    try {
      const at = new Date(now());
      try {
        await leases.updateOne(
          { _id: name, $or: [{ until: { $lt: at } }, { owner }] },
          { $set: { until: new Date(at.getTime() + intervalMs * 3), owner } },
          { upsert: true },
        );
      } catch (error: any) {
        if (error?.code === 11000) return; // another instance holds the lease
        throw error;
      }
      await task();
    } catch (error) { onError(error); }
    finally { running = false; }
  };
  const timer = setInterval(() => void tick(), intervalMs);
  timer.unref?.();
  void tick();
  return () => { stopped = true; clearInterval(timer); };
}
