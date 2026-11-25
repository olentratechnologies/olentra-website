import test from "node:test";
import assert from "node:assert/strict";
import { confirmPhraseFor, confirmsPhrase, earliestStartFor, offerTerms, previewParams, termsProblem } from "../src/lib/intern/offer-wizard.mjs";

const base = { kind: "formal", startOn: "2026-12-08", stipend: 0, maxStipend: 5000, message: "Welcome", agreementNote: "", today: "2026-11-25", leadDays: 3 };

test("earliest start: formal waits for the lead time, instant and direct can start today", () => {
  assert.equal(earliestStartFor("instant", "2026-11-25", 3), "2026-11-25");
  assert.equal(earliestStartFor("direct", "2026-11-25", 3), "2026-11-25");
  assert.ok(earliestStartFor("formal", "2026-11-25", 3) > "2026-11-25");
});

test("confirm phrases per kind", () => {
  assert.equal(confirmPhraseFor("formal", 12), "OFFER 12");
  assert.equal(confirmPhraseFor("instant", 1), "OFFER 1");
  assert.equal(confirmPhraseFor("direct", 3), "ENROL 3");
  assert.equal(confirmsPhrase("direct", " enrol 3", 3), true);
  assert.equal(confirmsPhrase("formal", "OFFER 11", 12), false);
  assert.equal(confirmsPhrase("formal", "OFFER 0", 0), false);
});

test("terms are checked per kind", () => {
  assert.equal(termsProblem(base), "");
  assert.match(termsProblem({ ...base, startOn: "" }), /start date/);
  assert.match(termsProblem({ ...base, startOn: "2026-11-26" }), /close 3 days before/);
  assert.equal(termsProblem({ ...base, kind: "instant", startOn: "2026-11-25" }), "");
  assert.match(termsProblem({ ...base, kind: "instant", startOn: "2026-11-24" }), /today or a later/);
  assert.match(termsProblem({ ...base, stipend: 6000 }), /₹0 to ₹5,000/);
  assert.match(termsProblem({ ...base, message: "  " }), /welcome message/);
  assert.match(termsProblem({ ...base, kind: "direct", startOn: "2026-11-25" }), /how and when/);
  assert.equal(termsProblem({ ...base, kind: "direct", startOn: "2026-11-25", agreementNote: "Agreed at the campus drive" }), "");
});

test("preview params per kind", () => {
  assert.deepEqual(previewParams("formal", "A", "2026-12-08", "7"), { applicationId: "A", startOn: "2026-12-08", expiresInDays: 7 });
  assert.deepEqual(previewParams("instant", "A", "2026-12-08"), { applicationId: "A", startOn: "2026-12-08", route: "instant" });
  assert.deepEqual(previewParams("direct", "A", "2026-12-08"), { applicationId: "A", startOn: "2026-12-08", direct: true });
});

test("terms never carry the previewed applicant's id to other applicants", () => {
  const preview = { applicationId: "FIRST", startOn: "2026-12-08", endOn: "2027-01-07", configRevision: "r1", expiresOn: "x", durationLabel: "1 month" };
  for (const kind of ["formal", "instant", "direct"]) assert.equal("applicationId" in offerTerms(kind, preview, { stipend: "100", message: " Hi ", expiresInDays: 7, agreementNote: " ok " }), false);
  assert.deepEqual(offerTerms("formal", preview, { stipend: "100", message: " Hi ", expiresInDays: "7" }), { startOn: "2026-12-08", endOn: "2027-01-07", configRevision: "r1", expiresInDays: 7, stipend: 100, message: "Hi" });
  assert.equal(offerTerms("instant", preview, { stipend: 0, message: "Hi" }).route, "instant");
  assert.equal(offerTerms("direct", preview, { stipend: 0, message: "Hi", agreementNote: " Agreed " }).agreementNote, "Agreed");
});
