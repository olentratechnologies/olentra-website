import test from "node:test";
import assert from "node:assert/strict";
import { internQueryScope } from "../src/lib/intern-query-scope.mjs";

const account = { id: "staff-one", role: "company", staffRole: "reviewer", sessionVersion: 1, permissions: ["applications.read", "interns.read"] };

test("read caches separate accounts, sessions, roles and permissions", () => {
  const original = internQueryScope(account);
  for (const patch of [{ id: "staff-two" }, { role: "intern" }, { sessionVersion: 2 }, { staffRole: "admin" }, { permissions: ["interns.read"] }]) {
    assert.notEqual(internQueryScope({ ...account, ...patch }), original);
  }
  assert.notEqual(internQueryScope(null), original);
});

test("profile updates and permission ordering preserve the same authorized cache", () => {
  assert.equal(internQueryScope({ ...account, name: "New name", permissions: [...account.permissions].reverse() }), internQueryScope(account));
  assert.equal(internQueryScope(undefined), "anonymous");
});
