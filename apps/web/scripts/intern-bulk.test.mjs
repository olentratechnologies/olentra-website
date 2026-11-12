import test from "node:test";
import assert from "node:assert/strict";
import { bulkActionsFor, canBulkUpdate, runBulk } from "../src/lib/intern/bulk.mjs";

test("runBulk reports successes and failures in input order", async () => {
  const outcome = await runBulk([1, 2, 3, 4, 5], async (n) => {
    if (n === 2) return { ok: false, error: "The application changed" };
    if (n === 4) throw new Error("Network down");
    return { ok: true };
  });
  assert.deepEqual(outcome.succeeded, [1, 3, 5]);
  assert.deepEqual(outcome.failed, [{ item: 2, error: "The application changed" }, { item: 4, error: "Network down" }]);
});

test("runBulk never runs more than the concurrency limit at once", async () => {
  let active = 0, peak = 0;
  await runBulk(Array.from({ length: 12 }, (_, i) => i), async () => {
    active++; peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active--;
    return { ok: true };
  }, 4);
  assert.equal(peak, 4);
});

test("runBulk handles an empty selection", async () => {
  assert.deepEqual(await runBulk([], async () => ({ ok: true })), { succeeded: [], failed: [] });
});

test("reject is admin-only and final decisions are protected", () => {
  assert.deepEqual(bulkActionsFor({ isAdmin: false }).map((a) => a.status), ["Under Review", "Shortlisted"]);
  assert.ok(bulkActionsFor({ isAdmin: true }).some((a) => a.status === "Rejected"));
  assert.equal(canBulkUpdate({ status: "Applied" }, { isAdmin: false }), true);
  assert.equal(canBulkUpdate({ status: "Selected" }, { isAdmin: false }), false);
  assert.equal(canBulkUpdate({ status: "Selected" }, { isAdmin: true }), true);
  assert.equal(canBulkUpdate({ status: "Joined" }, { isAdmin: true }), false);
});
