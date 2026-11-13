import { expect, test } from "bun:test";
import { checkinStreak, isoWeek } from "../../src/modules/checkins/weeks";

test("ISO weeks start on Monday and handle the year boundary", () => {
  expect(isoWeek(new Date("2026-11-12T12:00:00Z"))).toBe("2026-W46");
  expect(isoWeek(new Date("2026-11-09T00:00:00Z"))).toBe("2026-W46"); // Monday
  expect(isoWeek(new Date("2026-11-08T23:00:00Z"))).toBe("2026-W45"); // Sunday
  expect(isoWeek(new Date("2027-01-01T12:00:00Z"))).toBe("2026-W53");
});

test("a streak counts back from this week, or from last week if this one isn't in yet", () => {
  const now = new Date("2026-11-12T12:00:00Z");
  expect(checkinStreak(["2026-W46", "2026-W45", "2026-W44", "2026-W42"], now)).toBe(3);
  expect(checkinStreak(["2026-W45", "2026-W44"], now)).toBe(2);
  expect(checkinStreak(["2026-W43"], now)).toBe(0);
  expect(checkinStreak([], now)).toBe(0);
});
