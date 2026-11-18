import { createHash, randomUUID } from "node:crypto";
import { DomainError } from "../../shared/errors";
import type { AttemptStore } from "./login-throttle";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const MINUTE = 60_000, HOUR = 60 * MINUTE;

/** Anonymous actions that send email or store data, and how often each may run. */
export const RATE_LIMITS = {
  /** Magic-link and password-reset requests. */
  emailLink: { ip: { limit: 20, windowMs: 15 * MINUTE }, target: { limit: 5, windowMs: 15 * MINUTE }, message: "Too many requests for a sign-in or reset link. Please wait 15 minutes and try again." },
  /** New applications from the careers page. */
  apply: { target: { limit: 5, windowMs: HOUR }, message: "Too many attempts for this email address. Please wait an hour and try again." },
  /** File uploads. `target` is the signed-in account, when there is one. */
  upload: { ip: { limit: 10, windowMs: HOUR }, target: { limit: 60, windowMs: HOUR }, message: "Too many uploads. Please wait an hour and try again." },
  verifiedResume: { target: { limit: 3, windowMs: HOUR }, message: "Resume upload limit reached. Verify again to retry your application." },
} as const;
export type RateLimitName = keyof typeof RATE_LIMITS;

/**
 * Counts each request against the address or target configured for its action.
 * Counters live in the shared store, so limits hold
 * across sockets, reconnects and server instances. Hashed keys keep emails and
 * addresses out of the collection.
 */
export function createRateLimiter(store: AttemptStore, now = Date.now) {
  return {
    async consume(name: RateLimitName, address: string | null, target?: string | null) {
      const policy = RATE_LIMITS[name];
      const rules = [
        ...("ip" in policy ? [{ key: `${name}:ip:${hash(address || "unknown")}`, ...policy.ip }] : []),
        ...(target ? [{ key: `${name}:target:${hash(target.trim().toLowerCase())}`, ...policy.target }] : []),
      ];
      const at = new Date(now());
      // The address is checked first, so a blocked client can't create new per-email counters.
      for (const rule of rules) {
        const allowed = await store.reserve(rule.key, { id: randomUUID(), at, failed: false }, new Date(at.getTime() - rule.windowMs), new Date(at.getTime() + rule.windowMs), rule.limit);
        if (!allowed) throw new DomainError("RATE_LIMITED", policy.message);
      }
    },
  };
}
export type RateLimiter = ReturnType<typeof createRateLimiter>;
