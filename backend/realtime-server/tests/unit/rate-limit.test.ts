import { expect, test } from "bun:test";
import { memoryAttemptStore } from "../../src/modules/auth/login-throttle";
import { createRateLimiter, RATE_LIMITS } from "../../src/modules/auth/rate-limit";

test("the 6th link request for one email in 15 minutes is refused, other emails still work", async () => {
  const limiter = createRateLimiter(memoryAttemptStore());
  for (let i = 0; i < RATE_LIMITS.emailLink.target.limit; i++) await limiter.consume("emailLink", "203.0.113.1", "Person@Example.test");
  await expect(limiter.consume("emailLink", "203.0.113.2", "person@example.test")).rejects.toMatchObject({ code: "RATE_LIMITED" });
  await expect(limiter.consume("emailLink", "203.0.113.1", "someone-else@example.test")).resolves.toBeUndefined();
});

test("one address is capped across every email it targets", async () => {
  const limiter = createRateLimiter(memoryAttemptStore());
  for (let i = 0; i < RATE_LIMITS.emailLink.ip.limit; i++) await limiter.consume("emailLink", "198.51.100.7", `p${i}@example.test`);
  await expect(limiter.consume("emailLink", "198.51.100.7", "new@example.test")).rejects.toMatchObject({ code: "RATE_LIMITED" });
});

test("limits reset once the window has passed, and each action has its own counters", async () => {
  let clock = Date.now();
  const limiter = createRateLimiter(memoryAttemptStore(), () => clock);
  for (let i = 0; i < RATE_LIMITS.upload.ip.limit; i++) await limiter.consume("upload", "192.0.2.9");
  await expect(limiter.consume("upload", "192.0.2.9")).rejects.toMatchObject({ code: "RATE_LIMITED" });
  await expect(limiter.consume("apply", "192.0.2.9", "a@example.test")).resolves.toBeUndefined();
  clock += RATE_LIMITS.upload.ip.windowMs + 1;
  await expect(limiter.consume("upload", "192.0.2.9")).resolves.toBeUndefined();
});
