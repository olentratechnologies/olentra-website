import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createInitialState, executeCommand, updateDataset, validateSnapshot } from "../src/lib/admin/model.mjs";
import { can, effectiveFeatures } from "../src/lib/admin/selectors.mjs";

const parts = ["core", "content", "operations", "governance"].map((name) => JSON.parse(readFileSync(new URL(`../src/data/admin/${name}.json`, import.meta.url), "utf8")));
import { STAFF, signedIn } from "./support/staff-session.mjs";
// Workspaces start signed in as the owner, as a verified staff session would.
const initial = () => signedIn(createInitialState(parts));
const LEVEL = { owner: "owner", "admin-01": "administrator", "editor-02": "editor", "recruiter-01": "recruiter", "analyst-01": "analyst" };
const hoursAfter = (at, hours) => new Date(Date.parse(at) + hours * 3600000).toISOString();

function run(state, type, payload = {}, options = {}) {
  const before = structuredClone(state);
  const result = executeCommand(state, type, payload, options);
  assert.equal(result.ok, true, `${type}: ${result.error || "command failed"}`);
  assert.deepEqual(state, before, `${type} must not mutate the caller's state`);
  return result;
}

function reject(state, type, payload = {}, errorPattern, options = {}) {
  const before = structuredClone(state);
  const result = executeCommand(state, type, payload, options);
  assert.equal(result.ok, false, `${type} should reject this operation`);
  if (errorPattern) assert.match(result.error, errorPattern);
  assert.strictEqual(result.state, state, "Validation failure must return the original state");
  assert.deepEqual(state, before, "Rejected operations must not change data, audit or notifications");
  return result;
}

function signIn(state, id = "owner", options = {}) {
  return signedIn(state, LEVEL[id] || id, options);
}

test("roles enforce read-only analytics access and reject unauthorized feature/content changes", () => {
  let state = signIn(run(initial(), "auth.signOut").state, "analyst-01");
  assert.equal(can(state, "Analytics & SEO", "view"), true);
  assert.equal(can(state, "Analytics & SEO", "edit"), false);
  reject(state, "features.publish", { environment: "Production", values: { services: false } }, /role|cannot/i);
  reject(state, "content.save", { id: "about", model: state.datasets["olentra-admin-page-about"], status: "Draft" }, /role|cannot/i);
  state = signIn(run(state, "auth.signOut").state, "editor-02");
  assert.equal(can(state, "Content & Media", "edit"), true);
  state = run(state, "content.save", { id: "about", model: { ...state.datasets["olentra-admin-page-about"], title: "An editor's saved draft" }, status: "Draft" }).state;
  reject(state, "features.publish", { environment: "Production", values: { services: false } }, /role|cannot/i);
});

test("Careers permission cannot grant application-edit access when Applications permission is revoked", () => {
  let state = initial();
  const key = "admin-role-permissions-recruiter";
  state = updateDataset(state, key, state.datasets[key].map((row) => row.name === "Applications" ? { ...row, view: false, edit: false } : row));
  state = signIn(run(state, "auth.signOut").state, "recruiter-01");
  assert.equal(can(state, "Careers & Internships", "edit"), true);
  assert.equal(can(state, "Applications", "edit"), false);
  reject(state, "application.transition", { id: "110", status: "Screening" }, /role|cannot/i);
});

test("Applications-only permission allows applicant review without granting other career administration", () => {
  let state = initial();
  const key = "admin-role-permissions-recruiter";
  state = updateDataset(state, key, state.datasets[key].map((row) => row.name === "Careers & Internships" ? { ...row, view: false, edit: false } : row));
  state = signIn(run(state, "auth.signOut").state, "recruiter-01");
  assert.equal(can(state, "Applications", "edit"), true);
  assert.equal(can(state, "Careers & Internships", "edit"), false);
  state = run(state, "application.transition", { id: "110", status: "Screening" }).state;
  assert.equal(state.datasets["olentra-admin-applications-v1"].find((row) => row.id === "110").stage, "Screening");
  reject(state, "task.review", { projectId: "website-refresh", taskId: "contact", decision: "approve", feedback: "Checked" }, /role|cannot/i);
});

test("Production and Staging feature drafts and publications remain independent", () => {
  let state = initial();
  const staging = structuredClone(state.datasets["published-features:Staging"]);
  state = run(state, "features.publish", { environment: "Production", values: { services: false } }).state;
  assert.equal(effectiveFeatures(state, { environment: "Production" }).services, false);
  assert.deepEqual(state.datasets["published-features:Staging"], staging);
  state = run(state, "features.draft", { environment: "Staging", values: { products: false } }).state;
  assert.equal(effectiveFeatures(state, { environment: "Staging", draft: true }).products, false);
  assert.equal(effectiveFeatures(state, { environment: "Staging", draft: false }).products, staging.products);
  assert.equal(state.datasets["features:Production"].services, false);
});

test("feature region rules and scheduled windows affect only the target environment, region and time", () => {
  let state = initial();
  state = updateDataset(state, "feature-schedules", []);
  state = run(state, "features.publish", { environment: "Production", values: { internships: false, maintenance: false } }).state;
  state = run(state, "features.publish", { environment: "Staging", values: { internships: false, maintenance: false } }).state;
  state = run(state, "features.availability", { environment: "Production", featureId: "internships", rule: { mode: "Selected regions", regions: ["Europe"], fallback: "Hidden" } }).state;
  state = run(state, "features.schedule.save", { environment: "Production", schedule: { featureId: "internships", date: "2026-11-15", timezone: "UTC", start: "09:00", end: "10:00", action: "Make visible", regions: ["Europe"] } }).state;
  const visible = (now, region = "Europe", environment = "Production") => effectiveFeatures(state, { now, region, environment }).internships;
  assert.equal(visible("2026-11-15T08:59:59.000Z"), false);
  assert.equal(visible("2026-11-15T09:00:00.000Z"), true);
  assert.equal(visible("2026-11-15T09:59:59.000Z"), true);
  assert.equal(visible("2026-11-15T10:00:00.000Z"), false, "Scheduled visibility ends at the exclusive end boundary");
  assert.equal(visible("2026-11-15T09:30:00.000Z", "Americas"), false);
  assert.equal(visible("2026-11-15T09:30:00.000Z", "Asia Pacific"), false);
  assert.equal(visible("2026-11-15T09:30:00.000Z", "Europe", "Staging"), false);
  assert.equal(state.datasets["published-features:Production"].internships, false, "Evaluation must not overwrite the baseline flag");
});

test("overlapping schedules roll back, while adjacent windows and a different environment remain valid", () => {
  let state = updateDataset(initial(), "feature-schedules", []);
  const schedule = { featureId: "services", date: "2026-11-15", timezone: "UTC", start: "09:00", end: "10:00", action: "Hide feature", regions: ["Europe"] };
  state = run(state, "features.schedule.save", { environment: "Production", schedule }).state;
  reject(state, "features.schedule.save", { environment: "Production", schedule: { ...schedule, start: "09:30", end: "11:00" } }, /overlap/i);
  state = run(state, "features.schedule.save", { environment: "Production", schedule: { ...schedule, start: "10:00", end: "11:00" } }).state;
  state = run(state, "features.schedule.save", { environment: "Staging", schedule: { ...schedule, start: "09:30", end: "11:00" } }).state;
  assert.equal(state.datasets["feature-schedules"].length, 3);
});

test("maintenance suppresses every public feature and new applications while preserving existing intern access", () => {
  let state = initial();
  const publicKeys = ["services", "products", "internships", "blog", "assistant", "applications"];
  const values = Object.fromEntries(publicKeys.map((key) => [key, true]));
  state = run(state, "features.publish", { environment: "Production", values: { ...values, maintenance: true, portal: true } }).state;
  const flags = effectiveFeatures(state, { environment: "Production", region: "Europe" });
  assert.equal(flags.maintenance, true);
  for (const key of publicKeys) assert.equal(flags[key], false, `${key} must be suppressed during maintenance`);
  assert.equal(flags.portal, true, "Existing intern access must survive public-site maintenance");
  state = run(state, "features.publish", { environment: "Production", values: { maintenance: false } }).state;
  const resumed = effectiveFeatures(state, { environment: "Production", region: "Europe" });
  for (const key of publicKeys) assert.equal(resumed[key], true, `${key} must restore its baseline after maintenance`);
});

test("snapshot validation rejects duplicate IDs, unsafe properties, orphan references and disabling the last owner", async (t) => {
  const baseline = initial();
  assert.equal(validateSnapshot(structuredClone(baseline), baseline), true);
  const cases = [
    ["duplicate IDs", (state) => state.datasets["olentra-admin-content-v1"].push(structuredClone(state.datasets["olentra-admin-content-v1"][0])), /duplicate/i],
    ["unsafe properties", (state) => Object.defineProperty(state.datasets, "__proto__", { value: { polluted: true }, enumerable: true }), /unsafe/i],
    ["unknown program", (state) => { state.datasets["olentra-admin-applications-v1"][0].programId = "missing-program"; }, /unknown program/i],
    ["unknown task assignee", (state) => { state.datasets["olentra-admin-project-tasks-website-refresh"][0].internId = "missing-intern"; }, /invalid assignee|unknown intern/i],
    ["second stored account", (state) => { state.datasets["auth-accounts"].push({ ...STAFF.editor, enabled: true }); }, /only the signed-in account/i],
    ["stored demo credentials", (state) => { state.datasets["auth-accounts"][0].passwordDigest = "a".repeat(64); }, /credentials/i],
  ];
  for (const [name, mutate, pattern] of cases) await t.test(name, () => {
    const candidate = structuredClone(baseline);
    mutate(candidate);
    assert.throws(() => validateSnapshot(candidate, baseline), pattern);
    assert.equal(validateSnapshot(baseline, initial()), true, "Rejecting a candidate must not alter the baseline");
  });
});

test("an expired session cannot perform a mutation before the next clock tick", () => {
  let state = initial();
  state.datasets["auth-session"].expiresAt = state.meta.clock;
  const before = structuredClone(state.datasets["features:Production"]);
  const result = executeCommand(state, "features.draft", { environment: "Production", values: { internships: true } });
  assert.equal(result.ok, false);
  assert.match(result.error, /expired/i);
  assert.equal(result.state.datasets["auth-session"].status, "anonymous");
  assert.deepEqual(result.state.datasets["features:Production"], before);
});


test("generic JSON collection edits enforce role permissions and foreign keys", () => {
  let state = initial();
  const applications = state.datasets["olentra-admin-applications-v1"];
  assert.throws(() => updateDataset(state, "olentra-admin-applications-v1", [...applications, { ...applications[0], id: "bad-program", programId: "missing" }]), /unknown program/i);
  state = signIn(run(state, "auth.signOut").state, "analyst-01");
  assert.throws(() => updateDataset(state, "olentra-admin-content-v1", []), /role|cannot/i);
});


test("backup recovery preserves the current signed-in staff identity", () => {
  let state = initial();
  const backup = run(state, "backup.create", { label: "Identity preservation" });
  const id = backup.state.datasets["olentra-admin-backups-v1"][0].id;
  state = signIn(backup.state, "admin-01");
  const result = run(state, "backup.restore", { id, scope: "Content and configuration", confirmation: "RESTORE" });
  assert.equal(result.state.datasets["auth-session"].userId, STAFF.administrator.id);
  assert.deepEqual(result.state.datasets["auth-accounts"].map(row => row.email), [STAFF.administrator.email]);
});


test("feature approval cannot accidentally publish a newer unrelated draft", () => {
  let state = initial();
  state = run(state, "features.draft", { environment: "Production", values: { services: false } }).state;
  state = run(state, "approval.decide", { id: "CHG-024", decision: "approve" }).state;
  assert.equal(state.datasets["published-features:Production"].services, true);
  assert.equal(state.datasets["published-features:Production"].internships, true);
  assert.equal(state.datasets["features:Production"].services, false);
});


test("manual feature switches apply immediately despite review policy and do not create approvals", () => {
  let state = initial();
  const before = state.datasets["olentra-admin-governance-approvals-v1"].length;
  assert.equal(state.datasets["olentra-admin-approval-policy-v1"].production, true);
  state = run(state, "features.set", { environment: "Production", feature: "services", enabled: false }).state;
  assert.equal(state.datasets["features:Production"].services, false);
  assert.equal(state.datasets["published-features:Production"].services, false);
  assert.equal(state.datasets["olentra-admin-governance-approvals-v1"].length, before);
  assert.ok(state.datasets["olentra-admin-governance-audit-v1"].some(row => row.action === "Disabled services"));
  state = signIn(run(state, "auth.signOut").state, "analyst-01");
  reject(state, "features.set", { environment: "Production", feature: "services", enabled: true }, /role|cannot/i);
});
