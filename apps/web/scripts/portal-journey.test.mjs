import test from "node:test";
import assert from "node:assert/strict";
import { portalJourney } from "../src/lib/intern/portal-journey.mjs";
const application = { status: "Selected" };
const now = Date.parse("2026-11-17T10:00:00Z");
test("selection without an offer waits for receipt and does not unlock onboarding", () => {
  const state = portalJourney({ application }, now);
  assert.equal(state.pending, false);
  assert.equal(state.accepted, false);
  assert.equal(state.steps[1].done, false);
  assert.equal(state.steps[3].status, "Accept your offer first");
});
test("a sent offer completes receipt and points to the acceptance section", () => {
  const state = portalJourney({ application, offer: { status: "Sent", expiresOn: "2026-11-20" } }, now);
  assert.equal(state.pending, true);
  assert.equal(state.steps[1].done, true);
  assert.equal(state.steps[2].status, "Action required");
  assert.equal(state.steps[2].href, "/intern/portal/application#internship-offer");
});
test("accepted offers unlock onboarding; joined legacy applicants keep completed offer stages", () => {
  for (const my of [{ application, offer: { status: "Accepted" } }, { application: { status: "Joined" } }]) {
    const state = portalJourney(my, now);
    assert.equal(state.accepted, true);
    assert.equal(state.steps[1].done, true);
    assert.equal(state.steps[2].done, true);
    assert.equal(state.steps[3].status, "Ready to complete");
  }
});
test("expired and declined offers never offer an acceptance action", () => {
  for (const offer of [{ status: "Sent", expiresOn: "2026-11-16" }, { status: "Declined" }]) {
    const state = portalJourney({ application, offer }, now);
    assert.equal(state.pending, false);
    assert.equal(state.accepted, false);
    assert.equal(state.steps[2].action, undefined);
    assert.equal(state.steps[1].done, true);
  }
});

test("onboarding before the scheduled start does not claim the internship has started", () => {
  const state = portalJourney({ application:{status:"Joined"}, offer:{status:"Accepted",startOn:"2026-11-24"}, intern:{status:"Active"} }, now);
  assert.match(state.steps[4].status, /Starts Tuesday, 24 November 2026/);
});
