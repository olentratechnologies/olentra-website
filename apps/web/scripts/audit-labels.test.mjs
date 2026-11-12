import test from "node:test";
import assert from "node:assert/strict";
import { describeAudit } from "../src/lib/intern/audit-labels.mjs";

test("audit rows read as plain sentences, with a fallback for unknown actions", () => {
  assert.equal(describeAudit({ action: "application.status", detail: { from: "Applied", to: "Shortlisted" } }), "Moved an application from Applied to Shortlisted");
  assert.equal(describeAudit({ action: "certificate.issued", detail: { certificateNumber: "OLENTRA-1" } }), "Issued certificate OLENTRA-1");
  assert.equal(describeAudit({ action: "staff.create" }), "Created a staff account");
  assert.equal(describeAudit({ action: "something.new" }), "something.new");
  assert.equal(describeAudit(null), "Change");
});
