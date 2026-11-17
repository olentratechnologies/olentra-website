import test from "node:test";
import assert from "node:assert/strict";
import { offerDocumentState } from "../src/lib/intern/offer-document.mjs";
const application = { id: "OL-83c1c055-96e7-470f-b03f-7f2fa1eb673e" };
const now = Date.parse("2026-11-17T10:00:00Z");
test("only accepted offers with an application can be downloaded", () => {
  for (const status of ["Sent", "Declined", "Expired", undefined]) {
    assert.equal(offerDocumentState(application, { status }, now).downloadable, false);
  }
  assert.equal(offerDocumentState(application, { status: "Accepted" }, now).downloadable, true);
  assert.equal(offerDocumentState(null, { status: "Accepted" }, now).downloadable, false);
});
test("sent offers show the real deadline and sent date, not an invented issued status", () => {
  const offer = { status: "Sent", sentOn: "2026-11-15", expiresOn: "2026-11-16" };
  const state = offerDocumentState(application, offer, now);
  assert.equal(state.visible, true);
  assert.equal(state.status, "Expired");
  assert.equal(state.date, offer.sentOn);
  assert.equal(offerDocumentState(application, { ...offer, expiresOn: "2026-11-20" }, now).status, "Pending acceptance");
});
test("document reference and acceptance date match the generated offer letter", () => {
  const state = offerDocumentState(application, { status: "Accepted", decidedOn: "2026-11-17", sentOn: "2026-11-15" }, now);
  assert.equal(state.reference, "OL-OFR-83c1c055-96e7-470f");
  assert.equal(state.date, "2026-11-17");
  assert.equal(state.dateLabel, "Accepted");
});
