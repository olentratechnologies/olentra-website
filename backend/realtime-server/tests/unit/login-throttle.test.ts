import { describe, expect, test } from "bun:test";
import { clientAddress, createLoginThrottle, memoryAttemptStore } from "../../src/modules/auth/login-throttle";
import { STAFF_PERMISSIONS } from "../../src/modules/staff/staff.service";

const rejection = (promise: Promise<unknown>) => promise.then(() => null, (error: any) => error);

describe("login throttle", () => {
  test("blocks after the per-pair failure limit and expires old attempts", async () => {
    let now = Date.parse("2026-11-11T10:00:00Z");
    const throttle = createLoginThrottle({ store: memoryAttemptStore(), perAccountAndIp: 3, now: () => now });
    for (let index = 0; index < 3; index++) await throttle.recordFailure(await throttle.reserve("Admin@Example.com", "1.1.1.1"));
    expect((await rejection(throttle.reserve("admin@example.com", "1.1.1.1")))?.code).toBe("RATE_LIMITED");
    await throttle.release(await throttle.reserve("admin@example.com", "2.2.2.2"));
    now += 15 * 60_000 + 1;
    await throttle.reserve("admin@example.com", "1.1.1.1");
  });

  test("a successful sign-in clears pair failures without clearing other in-flight reservations", async () => {
    const throttle = createLoginThrottle({ store: memoryAttemptStore(), perAccountAndIp: 3 });
    await throttle.recordFailure(await throttle.reserve("staff@example.com", "1.1.1.1"));
    const success = await throttle.reserve("staff@example.com", "1.1.1.1");
    const inFlight = await throttle.reserve("staff@example.com", "1.1.1.1");
    await throttle.recordSuccess(success);
    await throttle.reserve("staff@example.com", "1.1.1.1");
    await throttle.reserve("staff@example.com", "1.1.1.1");
    expect((await rejection(throttle.reserve("staff@example.com", "1.1.1.1")))?.code).toBe("RATE_LIMITED");
    await throttle.recordFailure(inFlight);
  });

  test("caps total guesses per account across addresses and per address across accounts", async () => {
    const perAccount = createLoginThrottle({ store: memoryAttemptStore(), perAccountAndIp: 100, perAccount: 3 });
    for (const ip of ["1.0.0.1", "1.0.0.2", "1.0.0.3"]) await perAccount.recordFailure(await perAccount.reserve("target@example.com", ip));
    expect((await rejection(perAccount.reserve("target@example.com", "9.9.9.9")))?.code).toBe("RATE_LIMITED");

    const perIp = createLoginThrottle({ store: memoryAttemptStore(), perAccountAndIp: 100, perIp: 3 });
    for (const email of ["a@example.com", "b@example.com", "c@example.com"]) await perIp.recordFailure(await perIp.reserve(email, "5.5.5.5"));
    expect((await rejection(perIp.reserve("d@example.com", "5.5.5.5")))?.code).toBe("RATE_LIMITED");
  });

  test("concurrent bursts cannot start more password checks than the pair or IP quota", async () => {
    const sameAccount = createLoginThrottle({ store: memoryAttemptStore() });
    const pairBurst = await Promise.allSettled(Array.from({ length: 40 }, () => sameAccount.reserve("staff@example.com", "1.1.1.1")));
    expect(pairBurst.filter(result => result.status === "fulfilled")).toHaveLength(8);
    expect(pairBurst.filter(result => result.status === "rejected" && result.reason.code === "RATE_LIMITED")).toHaveLength(32);

    const sameIp = createLoginThrottle({ store: memoryAttemptStore() });
    const ipBurst = await Promise.allSettled(Array.from({ length: 40 }, (_, index) => sameIp.reserve(`staff${index}@example.com`, "1.1.1.1")));
    expect(ipBurst.filter(result => result.status === "fulfilled")).toHaveLength(30);
    expect(ipBurst.filter(result => result.status === "rejected" && result.reason.code === "RATE_LIMITED")).toHaveLength(10);
  });

  test("denied partial reservations and completed successes leave no unrelated account/IP charge", async () => {
    const throttle = createLoginThrottle({ store: memoryAttemptStore(), perAccountAndIp: 1, perAccount: 1, perIp: 1 });
    const first = await throttle.reserve("first@example.com", "1.1.1.1");
    expect((await rejection(throttle.reserve("other@example.com", "1.1.1.1")))?.code).toBe("RATE_LIMITED");
    const other = await throttle.reserve("other@example.com", "2.2.2.2");
    await throttle.recordSuccess(first);
    await throttle.recordSuccess(other);
    await throttle.reserve("first@example.com", "2.2.2.2");
  });

  test("an exhausted IP quota does not allocate counters for a new email", async () => {
    const memory = memoryAttemptStore(), keys: string[] = [];
    const store = { ...memory, reserve: async (...args: Parameters<typeof memory.reserve>) => { keys.push(args[0]); return memory.reserve(...args); } };
    const throttle = createLoginThrottle({ store, perIp: 1 });
    await throttle.recordFailure(await throttle.reserve("first@example.com", "1.1.1.1"));
    const before = keys.length;
    expect((await rejection(throttle.reserve("new@example.com", "1.1.1.1")))?.code).toBe("RATE_LIMITED");
    expect(keys.slice(before)).toHaveLength(1);
    expect(keys.at(-1)).toStartWith("ip:");
  });

  test("a storage failure settles late reservations before releasing them", async () => {
    const memory = memoryAttemptStore(); let offline = true;
    const store = { ...memory, reserve: async (...args: Parameters<typeof memory.reserve>) => {
      if (offline && args[0].startsWith("pair:")) throw new Error("storage unavailable");
      await new Promise(resolve => setTimeout(resolve, 5));
      return memory.reserve(...args);
    } };
    const throttle = createLoginThrottle({ store, perAccountAndIp: 1, perAccount: 1, perIp: 1 });
    expect((await rejection(throttle.reserve("staff@example.com", "1.1.1.1")))?.message).toBe("storage unavailable");
    offline = false;
    await throttle.reserve("staff@example.com", "1.1.1.1");
  });

  test("client address ignores spoofed headers unless proxy trust is explicit", () => {
    expect(clientAddress(new Request("http://x", { headers: { "cf-connecting-ip": "3.3.3.3", "x-forwarded-for": "4.4.4.4, 5.5.5.5" } }), "127.0.0.1", true)).toBe("3.3.3.3");
    expect(clientAddress(new Request("http://x", { headers: { "x-forwarded-for": "4.4.4.4, 5.5.5.5" } }), "127.0.0.1", true)).toBe("4.4.4.4");
    expect(clientAddress(new Request("http://x", { headers: { "x-real-ip": "spoofed" } }), "127.0.0.1")).toBe("127.0.0.1");
    expect(clientAddress(new Request("http://x"))).toBe("direct");
  });
});

describe("staff permission catalog", () => {
  test("offers every company workspace access level", () => {
    const ids = STAFF_PERMISSIONS.map(permission => permission.id);
    for (const level of ["administrator", "editor", "recruiter", "analyst"]) expect(ids).toContain(`workspace.${level}` as any);
  });
});
