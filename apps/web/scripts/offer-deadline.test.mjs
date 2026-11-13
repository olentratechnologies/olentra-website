import test from "node:test";
import assert from "node:assert/strict";
import { offerTimeLeft } from "../src/lib/intern/offer-deadline.mjs";

test("offer countdown reads in days, then hours, then expired", () => {
  const now = Date.parse("2026-11-01T00:00:00Z");
  assert.equal(offerTimeLeft("2026-11-06T00:00:00Z", now).label, "5 days left to decide");
  assert.deepEqual(offerTimeLeft("2026-11-01T05:30:00Z", now), { expired: false, label: "5 hours left to decide", urgent: true });
  assert.equal(offerTimeLeft("2026-11-01T00:20:00Z", now).label, "Less than an hour left to decide");
  assert.equal(offerTimeLeft("2026-10-31T00:00:00Z", now).expired, true);
  assert.equal(offerTimeLeft(undefined, now), null);
});
