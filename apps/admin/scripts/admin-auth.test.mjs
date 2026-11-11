import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createInitialState, executeCommand, migrateSnapshot, validateSnapshot } from "../src/lib/admin/model.mjs";
import { can } from "../src/lib/admin/selectors.mjs";
import { canControlWebsite, workspaceRole } from "../src/lib/workspace-access.mjs";
import { STAFF } from "./support/staff-session.mjs";

const parts = ["core", "content", "operations", "governance"].map(name => JSON.parse(readFileSync(new URL(`../src/data/admin/${name}.json`, import.meta.url), "utf8")));
const fresh = () => createInitialState(parts);
const run = (state, type, payload) => { const result = executeCommand(state, type, payload); assert.equal(result.ok, true, result.error); return result.state; };

test("fixtures ship without demo accounts or credentials and start signed out", () => {
  const state = fresh();
  assert.deepEqual(state.datasets["auth-accounts"], []);
  assert.equal(state.datasets["auth-session"].status, "anonymous");
  const text = JSON.stringify(parts);
  for (const secret of ["passwordDigest", "mfaCode", "recoveryDigests", "authDemo", "OlentraDemo"]) assert.equal(text.includes(secret), false, secret + " must not ship");
  assert.equal(can(state, "Overview", "view"), false);
  assert.equal(executeCommand(state, "features.set", { environment: "Production", feature: "services", enabled: false }).ok, false);
});

test("a verified staff identity signs in without storing credentials and audits once", () => {
  let state = run(fresh(), "auth.session.establish", STAFF.editor);
  assert.deepEqual(state.datasets["auth-accounts"], [{ ...STAFF.editor, enabled: true }]);
  assert.equal(state.datasets["auth-session"].status, "authenticated");
  assert.equal(state.datasets["auth-session"].expiresAt, null, "the server owns session lifetime");
  assert.equal(state.datasets["olentra-admin-account-v1"].email, STAFF.editor.email);
  assert.equal(can(state, "Content & Media", "edit"), true);
  assert.equal(can(state, "Website Controls", "edit"), false);
  const signIns = rows => rows.filter(row => row.action === "Signed in to company workspace").length;
  const audited = signIns(state.datasets["olentra-admin-governance-audit-v1"]);
  state = run(state, "auth.session.establish", STAFF.editor);
  assert.equal(signIns(state.datasets["olentra-admin-governance-audit-v1"]), audited, "a session refresh is not a new sign-in");
  state = run(state, "auth.signOut");
  assert.deepEqual(state.datasets["auth-accounts"], []);
  assert.equal(state.datasets["auth-session"].status, "anonymous");
});

test("establishing a session rejects unverified or unknown access levels", () => {
  for (const payload of [{}, { ...STAFF.owner, role: "Superuser" }, { ...STAFF.owner, email: "not-an-email" }, { ...STAFF.owner, id: "" }]) {
    assert.equal(executeCommand(fresh(), "auth.session.establish", payload).ok, false);
  }
});

test("account preferences survive restoring a fresh server session without leaking another staff profile", () => {
  let state = run(fresh(), "auth.session.establish", STAFF.owner);
  state = run(state, "settings.save", { section: "account", values: { jobTitle: "Operations", language: "Hindi" } });
  state.datasets["auth-session"] = { status: "anonymous", userId: null };
  state.datasets["auth-accounts"] = [];
  state = run(state, "auth.session.establish", STAFF.owner);
  assert.equal(state.datasets["olentra-admin-account-v1"].jobTitle, "Operations");
  assert.equal(state.datasets["olentra-admin-account-v1"].language, "Hindi");
  state = run(state, "auth.signOut");
  state = run(state, "auth.session.establish", STAFF.editor);
  assert.equal(state.datasets["olentra-admin-account-v1"].email, STAFF.editor.email);
  assert.equal(state.datasets["olentra-admin-account-v1"].jobTitle, "");
  state = run(state, "auth.signOut");
  state = run(state, "auth.session.establish", STAFF.owner);
  assert.equal(state.datasets["olentra-admin-account-v1"].jobTitle, "Operations");
});

test("saved browser data is scrubbed of demo credentials and retired demo datasets", () => {
  const legacy = fresh();
  legacy.datasets["auth-accounts"] = [{ id: "owner", email: "owner@example.com", name: "Company owner", role: "Owner", enabled: true, passwordDigest: "a".repeat(64), mfaCode: "123456", recoveryDigests: [] }];
  legacy.datasets["auth-session"] = { status: "authenticated", userId: "owner", role: "Owner", expiresAt: null };
  for (const key of ["auth-pending", "auth-reset", "auth-trusted-devices", "auth-remembered-email", "admin-team-members", "admin-team-invitations", "olentra-admin-security-sessions-v1", "olentra-admin-sso-preview-v1", "olentra-admin-security-policy-v1"]) legacy.datasets[key] = [];
  const migrated = migrateSnapshot({ meta: legacy.meta, datasets: legacy.datasets });
  assert.deepEqual(migrated.datasets["auth-accounts"], []);
  assert.equal(migrated.datasets["auth-session"].status, "anonymous");
  for (const key of ["auth-pending", "admin-team-members", "olentra-admin-sso-preview-v1"]) assert.equal(key in migrated.datasets, false);
  assert.equal(JSON.stringify(migrated).includes("passwordDigest"), false);
  assert.equal(validateSnapshot(migrated, fresh()), true);
});

test("staff accounts map to workspace access levels", () => {
  const staff = (staffRole, permissions = []) => ({ id: "ACC-1", role: "company", staffRole, permissions });
  assert.equal(workspaceRole(staff("admin")), "Owner");
  assert.equal(workspaceRole(staff("manager", ["workspace.editor", "workspace.analyst"])), "Editor", "the highest granted level wins");
  assert.equal(workspaceRole(staff("viewer", ["workspace.analyst"])), "Analyst");
  assert.equal(workspaceRole(staff("recruiter", ["applications.read"])), null, "internship-only roles have no workspace access");
  assert.equal(workspaceRole({ id: "ACC-2", role: "intern", staffRole: null }), null);
  assert.equal(workspaceRole(null), null);
  assert.equal(canControlWebsite(staff("admin")), true);
  assert.equal(canControlWebsite(staff("ops", ["workspace.administrator"])), true);
  assert.equal(canControlWebsite(staff("editor", ["workspace.editor"])), false);
});
