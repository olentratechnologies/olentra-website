import test from "node:test";
import assert from "node:assert/strict";
import { authorizeStaff } from "../../src/modules/access/policy";

test("interview scheduling requires application review permission", () => {
  const reader = {
    id: "reader",
    role: "company" as const,
    staffRole: "reviewer",
    permissions: ["applications.read"],
    name: "Reader",
    email: "reader@example.test",
    applicationId: null,
    sessionVersion: 1,
  };
  const reviewer = {
    ...reader,
    permissions: ["applications.read", "applications.review"],
  };

  assert.throws(() => authorizeStaff("interview.schedule", {}, reader), /does not allow/);
  assert.doesNotThrow(() => authorizeStaff("interview.schedule", {}, reviewer));
});
