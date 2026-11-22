import { expect, test } from "bun:test";
import { createIntakeCheck } from "../../src/modules/programs/intake-cache";

test("a burst of submissions makes one call to the website", async () => {
  let calls = 0, clock = 0;
  const check = createIntakeCheck(async () => { calls++; return true; }, { now: () => clock });
  expect(await Promise.all(Array.from({ length: 50 }, () => check()))).toEqual(Array(50).fill(true));
  clock = 14_000;
  expect(await check()).toBe(true);
  expect(calls).toBe(1);
  clock = 16_000;
  await check();
  expect(calls).toBe(2);
});

test("a failed refresh keeps the last answer for a while, then closes", async () => {
  let clock = 0, fail = false, open = true;
  const check = createIntakeCheck(async () => { if (fail) throw new Error("site down"); return open; }, { now: () => clock });
  expect(await check()).toBe(true);
  fail = true; clock = 60_000;
  expect(await check()).toBe(true);           // last known answer
  clock = 6 * 60_000;
  expect(await check()).toBe(false);          // too old to trust
  fail = false; open = false; clock = 7 * 60_000;
  expect(await check()).toBe(false);          // closed stays closed
  const never = createIntakeCheck(async () => { throw new Error("down"); });
  expect(await never()).toBe(false);
});
