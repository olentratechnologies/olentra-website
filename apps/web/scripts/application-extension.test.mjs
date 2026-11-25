import test from "node:test";
import assert from "node:assert/strict";
import { extensionLabel, previewExtension } from "../src/lib/intern/application-deadline.mjs";

const now = Date.parse("2026-11-25T10:00:00.000Z");
const hour = 3_600_000;

test("a closed window reopens, counted from now", () => {
  const preview = previewExtension(new Date(now - 5 * hour).toISOString(), 2, "hours", now);
  assert.deepEqual(preview, { deadline: now + 2 * hour, reopened: true, error: "" });
});

test("an open window gets the time added to its deadline", () => {
  const deadline = now + 3 * hour;
  const preview = previewExtension(new Date(deadline).toISOString(), 2, "days", now);
  assert.deepEqual(preview, { deadline: deadline + 48 * hour, reopened: false, error: "" });
});

test("extensions need a deadline, a known unit and a sensible amount", () => {
  assert.match(previewExtension(null, 1, "days", now).error, /no end date/);
  assert.match(previewExtension(new Date(now).toISOString(), 1, "weeks", now).error, /hours or days/);
  assert.match(previewExtension(new Date(now).toISOString(), 0, "days", now).error, /1 to 60 days/);
  assert.match(previewExtension(new Date(now).toISOString(), 721, "hours", now).error, /1 to 720 hours/);
  assert.match(previewExtension(new Date(now).toISOString(), 1.5, "days", now).error, /1 to 60 days/);
});

test("extension labels read naturally", () => {
  assert.equal(extensionLabel({ amount: 1, unit: "days" }), "1 day");
  assert.equal(extensionLabel({ amount: 12, unit: "hours" }), "12 hours");
});

test("a switched-off program reopens from now, whatever its old deadline", () => {
  assert.deepEqual(previewExtension(null, 3, "days", now, false), { deadline: now + 72 * hour, reopened: true, error: "" });
  assert.deepEqual(previewExtension(new Date(now + 10 * hour).toISOString(), 1, "days", now, false), { deadline: now + 24 * hour, reopened: true, error: "" });
});
