import { expect, test } from "bun:test";
import { isDigestTime } from "../../src/modules/reminders/reminders";

test("the digest goes out on Monday from 9am India time", () => {
  expect(isDigestTime(new Date("2026-11-16T03:30:00Z"))).toBe(true);  // Mon 09:00 IST
  expect(isDigestTime(new Date("2026-11-16T03:29:00Z"))).toBe(false); // Mon 08:59 IST
  expect(isDigestTime(new Date("2026-11-15T20:00:00Z"))).toBe(false); // Mon 01:30 IST
  expect(isDigestTime(new Date("2026-11-17T04:00:00Z"))).toBe(false); // Tuesday
});
