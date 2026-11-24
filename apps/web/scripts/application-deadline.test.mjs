import test from "node:test";
import assert from "node:assert/strict";
import { deadlineTime, fromLocalInputValue, isDeadlinePassed, timeRemaining, toLocalInputValue } from "../src/lib/intern/application-deadline.mjs";

test("no deadline is never passed", () => {
  assert.equal(deadlineTime(null), null);
  assert.equal(isDeadlinePassed(null), false);
  assert.equal(isDeadlinePassed("nonsense"), false);
});

test("passed once the time is reached", () => {
  const at = "2026-11-20T12:00:00.000Z", time = Date.parse(at);
  assert.equal(isDeadlinePassed(at, time - 1), false);
  assert.equal(isDeadlinePassed(at, time), true);
});

test("splits the time left into units and floors at zero", () => {
  const start = Date.parse("2026-11-15T00:00:00Z");
  const left = timeRemaining(start + ((2 * 24 + 3) * 3600 + 4 * 60 + 5) * 1000, start);
  assert.deepEqual([left.days, left.hours, left.minutes, left.seconds], [2, 3, 4, 5]);
  assert.equal(timeRemaining(start - 1000, start).total, 0);
});

test("datetime-local values round-trip", () => {
  const iso = fromLocalInputValue("2026-11-30T23:59");
  assert.equal(toLocalInputValue(iso), "2026-11-30T23:59");
  assert.equal(fromLocalInputValue(""), null);
});

test("results are due three days after the deadline", async () => {
  const { REVIEW_DAYS, resultsBy } = await import("../src/lib/intern/application-deadline.mjs");
  assert.equal(REVIEW_DAYS, 3);
  assert.equal(resultsBy(Date.parse("2026-11-28T18:29:00Z")), Date.parse("2026-12-01T18:29:00Z"));
});
