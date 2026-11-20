import test from "node:test";
import assert from "node:assert/strict";
import { decisionDeadline, earliestStartDate, formatDeadline, maxOpenDays, offerWindowProblem } from "../src/lib/intern/offer-policy.mjs";

test("the dashboard and server share one offer deadline rule", () => {
  const deadline = decisionDeadline("2030-11-15T05:00:00.000Z", 4);
  assert.equal(formatDeadline(deadline), "Tuesday, 19 November 2030, 11:59 PM IST");
  assert.equal(offerWindowProblem({ startOn: "2030-11-22", deadlineIso: deadline, leadDays: 3 }), null);
  assert.match(offerWindowProblem({ startOn: "2030-11-21", deadlineIso: deadline, leadDays: 3 }), /at least 3 days before the start date/);
  assert.equal(maxOpenDays("2030-11-30", "2030-11-20", 3), 7);
  assert.equal(earliestStartDate("2030-11-20", 3), "2030-11-24");
});
