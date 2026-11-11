import { createHash, randomUUID } from "node:crypto";
import type { Collection } from "mongodb";
import { DomainError } from "../../shared/errors";

type Attempt = { id: string; at: Date; failed: boolean };
/** Each admission reserves all three hashed counters before password verification. */
export type AttemptStore = {
  reserve(key: string, attempt: Attempt, since: Date, expiresAt: Date, limit: number): Promise<boolean>;
  release(keys: string[], attemptId: string): Promise<void>;
  fail(keys: string[], attemptId: string): Promise<void>;
  clearFailures(key: string): Promise<void>;
};
type Reservation = { id: string; keys: string[]; pair: string };

export type LoginThrottleOptions = {
  store: AttemptStore;
  windowMs?: number;
  /** Failures and in-flight sign-ins allowed for one email and client address. */
  perAccountAndIp?: number;
  /** Failures and in-flight sign-ins allowed for one email across all addresses. */
  perAccount?: number;
  /** Failures and in-flight sign-ins allowed from one client across all emails. */
  perIp?: number;
  now?: () => number;
};

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export function clientAddress(request: Request, peerAddress = "direct", trustProxy = false): string {
  if (!trustProxy) return peerAddress;
  const forwarded = request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0];
  return forwarded?.trim() || peerAddress;
}

/**
 * Atomic per-key reservations include in-flight verification, so concurrent
 * requests cannot all pass the limit before their Argon2 checks finish. A
 * partial admission is released; successful logins retain no account/IP charge.
 */
export function createLoginThrottle({ store, windowMs = 15 * 60_000, perAccountAndIp = 8, perAccount = 50, perIp = 30, now = Date.now }: LoginThrottleOptions) {
  const minutes = Math.round(windowMs / 60_000);
  return {
    async reserve(email: string, ip: string): Promise<Reservation> {
      const account = email.trim().toLowerCase();
      const pair = "pair:" + hash(account + "\n" + ip);
      const keys = [pair, "account:" + hash(account), "ip:" + hash(ip)];
      const limits = [perAccountAndIp, perAccount, perIp];
      const at = new Date(now()), since = new Date(at.getTime() - windowMs);
      const attempt: Attempt = { id: randomUUID(), at, failed: false };
      try {
        // Check the shared IP first, so a blocked password spray cannot create
        // new per-email counter documents on every rejected request.
        if (!await store.reserve(keys[2]!, attempt, since, new Date(at.getTime() + windowMs), limits[2]!)) {
          throw new DomainError("RATE_LIMITED", `Too many sign-in attempts. Wait ${minutes} minutes or reset your password.`);
        }
        // Settle both remaining admissions before releasing, including after a
        // DB error, so a late reservation cannot appear after cleanup.
        const admitted = await Promise.allSettled(keys.slice(0, 2).map((key, index) => store.reserve(key, attempt, since, new Date(at.getTime() + windowMs), limits[index]!)));
        const failure = admitted.find(result => result.status === "rejected");
        if (failure?.status === "rejected") throw failure.reason;
        if (admitted.some(result => result.status === "fulfilled" && !result.value)) {
          throw new DomainError("RATE_LIMITED", `Too many sign-in attempts. Wait ${minutes} minutes or reset your password.`);
        }
      } catch (error) {
        await store.release(keys, attempt.id);
        throw error;
      }
      return { id: attempt.id, keys, pair };
    },
    recordFailure: (attempt: Reservation) => store.fail(attempt.keys, attempt.id),
    release: (attempt: Reservation) => store.release(attempt.keys, attempt.id),
    async recordSuccess(attempt: Reservation) {
      await Promise.all([store.release(attempt.keys, attempt.id), store.clearFailures(attempt.pair)]);
    },
  };
}

export function mongoAttemptStore(collection: Collection<any>): AttemptStore & { initialize(): Promise<void> } {
  return {
    async initialize() { await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }); },
    async reserve(key, attempt, since, expiresAt, limit) {
      // Upserting only by _id avoids an upsert-on-quota-failure duplicate key.
      // Concurrent first use may race the insert; the winner supplies the row.
      try { await collection.updateOne({ _id: key }, { $setOnInsert: { attempts: [], expiresAt } }, { upsert: true }); }
      catch (error: any) { if (error?.code !== 11000) throw error; }
      const live = { $filter: { input: { $ifNull: ["$attempts", []] }, as: "attempt", cond: { $gte: ["$$attempt.at", since] } } };
      const row = await collection.findOneAndUpdate(
        { _id: key, $expr: { $lt: [{ $size: live }, limit] } },
        [{ $set: { attempts: { $concatArrays: [live, { $literal: [attempt] }] }, expiresAt } }],
        { returnDocument: "after" }
      );
      return row !== null;
    },
    async release(keys, attemptId) { await collection.updateMany({ _id: { $in: keys } }, { $pull: { attempts: { id: attemptId } } } as any); },
    async fail(keys, attemptId) { await collection.updateMany({ _id: { $in: keys }, "attempts.id": attemptId }, { $set: { "attempts.$[attempt].failed": true } }, { arrayFilters: [{ "attempt.id": attemptId }] }); },
    async clearFailures(key) { await collection.updateOne({ _id: key }, { $pull: { attempts: { failed: true } } } as any); },
  };
}

export function memoryAttemptStore(): AttemptStore {
  const rows = new Map<string, Attempt[]>();
  return {
    async reserve(key, attempt, since, _expiresAt, limit) {
      const live = (rows.get(key) || []).filter(row => row.at >= since);
      if (live.length >= limit) return false;
      rows.set(key, [...live, { ...attempt }]);
      return true;
    },
    async release(keys, attemptId) { for (const key of keys) rows.set(key, (rows.get(key) || []).filter(row => row.id !== attemptId)); },
    async fail(keys, attemptId) { for (const key of keys) for (const row of rows.get(key) || []) if (row.id === attemptId) row.failed = true; },
    async clearFailures(key) { rows.set(key, (rows.get(key) || []).filter(row => !row.failed)); },
  };
}
