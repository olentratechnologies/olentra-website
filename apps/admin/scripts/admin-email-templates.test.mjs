import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createInitialState, createSnapshot, executeCommand, migrateSnapshot, updateDataset, validateSnapshot } from "../src/lib/admin/model.mjs";
import { can } from "../src/lib/admin/selectors.mjs";
import { EMAIL_TEMPLATE_CATALOG, EMAIL_TEMPLATE_SELECTION_KEY as KEY, getEmailTemplateVariant } from "../src/lib/admin/email-template-catalog.mjs";

const parts = ["core", "content", "operations", "governance"].map(name => JSON.parse(readFileSync(new URL(`../src/data/admin/${name}.json`, import.meta.url), "utf8")));
const fresh = () => createInitialState(parts);
const auditKey = "olentra-admin-governance-audit-v1";
const backupKey = "olentra-admin-backups-v1";
const backupSettingsKey = "olentra-admin-backup-settings-v1";
const sampleType = "account.registered";
const selection = (preset = "warm", typeId = sampleType) => ({ typeId, variantId: `${typeId}.${preset}` });

function run(state, type, payload = {}) {
  const before = structuredClone(state);
  const result = executeCommand(state, type, payload);
  assert.equal(result.ok, true, `${type}: ${result.error || "failed"}`);
  assert.deepEqual(state, before, "commands must not mutate the previous state");
  return result;
}

function rejected(state, type, payload, pattern) {
  const before = structuredClone(state);
  const result = executeCommand(state, type, payload);
  assert.equal(result.ok, false);
  assert.match(result.error, pattern);
  assert.strictEqual(result.state, state);
  assert.deepEqual(state, before, "rejection must leave selections, audit, and unrelated records unchanged");
}

function signIn(state, email) {
  const account = state.datasets["auth-accounts"].find(row => row.email === email);
  assert.ok(account);
  const first = run(state, "auth.signIn", { email, passwordDigest: account.passwordDigest });
  return first.value.requiresMfa ? run(first.state, "auth.verify", { code: account.mfaCode }).state : first.state;
}

function legacySnapshot(state = fresh()) {
  const snapshot = createSnapshot(state, { all: true });
  delete snapshot.datasets[KEY];
  for (const [key, rows] of Object.entries(snapshot.datasets)) {
    if (key.startsWith("admin-role-permissions-")) snapshot.datasets[key] = rows.filter(row => row.name !== "Email Templates");
  }
  return snapshot;
}

test("the catalog is reference data and all unconfigured types resolve to Professional", () => {
  const state = fresh();
  assert.deepEqual(state.reference.governance.emailTemplates, EMAIL_TEMPLATE_CATALOG);
  assert.deepEqual(state.datasets[KEY], {});
  for (const type of EMAIL_TEMPLATE_CATALOG) {
    assert.equal(getEmailTemplateVariant(type.id, state.datasets[KEY][type.id]).presetId, "professional");
  }
  assert.equal(can(state, "Email Templates", "manage"), true);
  assert.ok(state.reference.operations.permissionModules.includes("Email Templates"));
});

test("choosing a preset saves a workspace-wide default and an audit entry without notifications", () => {
  let state = fresh();
  const notices = structuredClone(state.datasets["olentra-admin-notifications-v1"]);
  const auditCount = state.datasets[auditKey].length;
  const result = run(state, "emailTemplate.select", selection());
  state = result.state;
  assert.deepEqual(result.value, selection());
  assert.equal(state.datasets[KEY][sampleType], `${sampleType}.warm`);
  assert.equal(state.datasets[auditKey].length, auditCount + 1);
  assert.equal(state.datasets[auditKey][0].category, "Email Templates");
  assert.equal(state.datasets[auditKey][0].before, `${sampleType}.professional`);
  assert.equal(state.datasets[auditKey][0].after, `${sampleType}.warm`);
  assert.equal(state.datasets[auditKey][0].localOnly, true);
  assert.deepEqual(state.datasets["olentra-admin-notifications-v1"], notices);
  state = updateDataset(state, "environment", "Staging");
  state = updateDataset(state, "scope", "Europe");
  assert.equal(state.datasets[KEY][sampleType], `${sampleType}.warm`);
  const again = run(state, "emailTemplate.select", selection()).state;
  assert.equal(again.datasets[auditKey].length, state.datasets[auditKey].length, "reselecting an explicitly saved preset does not duplicate audit records");
});

test("unknown types and mismatched variants are rejected atomically; direct writes cannot bypass the command", () => {
  const state = fresh();
  rejected(state, "emailTemplate.select", selection("warm", "unknown"), /valid email template type/i);
  rejected(state, "emailTemplate.select", { typeId: sampleType, variantId: "application.received.warm" }, /valid preset/i);
  rejected(state, "emailTemplate.select", { typeId: sampleType, variantId: null }, /valid preset/i);
  rejected(state, "emailTemplate.select", { typeId: "__proto__", variantId: "warm" }, /valid email template type/i);
  assert.throws(() => updateDataset(state, KEY, { [sampleType]: `${sampleType}.warm` }), /emailTemplate.select/);
});

test("Administrator can select presets while other default roles cannot view or manage them", () => {
  const admin = signIn(fresh(), "admin@example.com");
  assert.equal(can(admin, "Email Templates", "view"), true);
  assert.equal(can(admin, "Email Templates", "manage"), true);
  assert.equal(run(admin, "emailTemplate.select", selection()).state.datasets[KEY][sampleType], `${sampleType}.warm`);
  for (const email of ["editor@example.com", "recruiter@example.com", "analyst@example.com"]) {
    const state = signIn(fresh(), email);
    assert.equal(can(state, "Email Templates", "view"), false);
    rejected(state, "emailTemplate.select", selection(), /role cannot/i);
  }
  rejected(run(fresh(), "auth.signOut").state, "emailTemplate.select", selection(), /role cannot/i);
});

test("existing role controls grant read-only access separately from managing selections", () => {
  let state = fresh();
  let permissions = state.datasets["admin-role-permissions-recruiter"].map(row => row.name === "Email Templates" ? { ...row, view: true } : row);
  state = run(state, "role.save", { roleId: "recruiter", permissions }).state;
  state = signIn(state, "recruiter@example.com");
  assert.equal(can(state, "Email Templates", "view"), true);
  assert.equal(can(state, "Email Templates", "manage"), false);
  rejected(state, "emailTemplate.select", selection(), /role cannot/i);
  state = signIn(state, "owner@example.com");
  permissions = state.datasets["admin-role-permissions-recruiter"].map(row => row.name === "Email Templates" ? { ...row, manage: true } : row);
  state = run(state, "role.save", { roleId: "recruiter", permissions }).state;
  state = signIn(state, "recruiter@example.com");
  assert.equal(run(state, "emailTemplate.select", selection()).state.datasets[KEY][sampleType], `${sampleType}.warm`);
});

test("migration adds only missing template data and permission rows without altering saved workspace records", () => {
  const old = legacySnapshot();
  old.datasets["olentra-admin-company-settings-v1"].company = "My saved company";
  const custom = old.datasets["admin-role-permissions-administrator"].find(row => row.name === "Integrations");
  custom.view = false; custom.edit = false; custom.publish = false; custom.manage = false;
  const before = structuredClone(old);
  const migrated = migrateSnapshot(old);
  assert.deepEqual(old, before);
  assert.deepEqual(migrated.datasets[KEY], {});
  assert.equal(migrated.datasets["olentra-admin-company-settings-v1"].company, "My saved company");
  assert.deepEqual(migrated.datasets["admin-role-permissions-administrator"].find(row => row.name === "Integrations"), custom);
  for (const [key, value] of Object.entries(old.datasets)) {
    if (!key.startsWith("admin-role-permissions-")) assert.deepEqual(migrated.datasets[key], value, key);
    else assert.deepEqual(migrated.datasets[key].filter(row => row.name !== "Email Templates"), value, key);
  }
  assert.equal(validateSnapshot(migrated, fresh()), true);
  assert.deepEqual(migrateSnapshot(migrated), migrated, "migration is idempotent");
  const existing = createSnapshot(run(fresh(), "emailTemplate.select", selection("minimal")).state, { all: true });
  existing.datasets["admin-role-permissions-administrator"].find(row => row.name === "Email Templates").manage = false;
  assert.deepEqual(migrateSnapshot(existing), existing, "existing selections and custom permission entries are preserved");
});

test("migration does not repair malformed values or unrelated missing fields", () => {
  for (const invalid of [null, [], { unknown: "unknown.warm" }, { [sampleType]: "application.received.warm" }]) {
    const snapshot = createSnapshot(fresh(), { all: true });
    snapshot.datasets[KEY] = invalid;
    const migrated = migrateSnapshot(snapshot);
    assert.deepEqual(migrated.datasets[KEY], invalid);
    assert.throws(() => validateSnapshot(migrated, fresh()), /dataset type|selections|template type|valid preset/i);
  }
  const old = legacySnapshot();
  delete old.datasets["auth-accounts"];
  assert.throws(() => validateSnapshot(migrateSnapshot(old), fresh()), /Missing required dataset/);
  const unsafe = JSON.parse('{"meta":{"schemaVersion":2},"datasets":{"__proto__":{}}}');
  assert.throws(() => migrateSnapshot(unsafe), /unsafe property/i);
  const permissions = createSnapshot(fresh(), { all: true });
  permissions.datasets["admin-role-permissions-editor"].find(row => row.name === "Email Templates").manage = "yes";
  assert.throws(() => validateSnapshot(migrateSnapshot(permissions), fresh()), /Invalid Email Templates permissions/i);
});

test("JSON snapshots carry selections without copying the immutable catalog", () => {
  const state = run(fresh(), "emailTemplate.select", selection("minimal")).state;
  const exported = createSnapshot(state, { all: true });
  assert.equal(exported.reference, undefined);
  const imported = migrateSnapshot(JSON.parse(JSON.stringify(exported)));
  assert.equal(validateSnapshot(imported, fresh()), true);
  assert.deepEqual(imported.datasets[KEY], state.datasets[KEY]);
  assert.deepEqual(fresh().datasets[KEY], {}, "reset state returns to Professional defaults");
});

test("configuration backups restore selections; content-only restore keeps current choices", () => {
  let state = run(fresh(), "emailTemplate.select", selection("warm")).state;
  const created = run(state, "backup.create");
  state = created.state;
  assert.equal(created.value.snapshot.datasets[KEY][sampleType], `${sampleType}.warm`);
  state = run(state, "emailTemplate.select", selection("minimal")).state;
  state = run(state, "emailTemplate.select", selection("warm", "enquiry.received")).state;
  state.datasets[backupSettingsKey].scope = "Content only";
  state = run(state, "backup.restore", { id: created.value.id, confirmation: "RESTORE" }).state;
  assert.equal(state.datasets[KEY][sampleType], `${sampleType}.minimal`);
  state.datasets[backupSettingsKey].scope = "Configuration only";
  state = run(state, "backup.restore", { id: created.value.id, confirmation: "RESTORE" }).state;
  assert.deepEqual(state.datasets[KEY], { [sampleType]: `${sampleType}.warm` });
});

test("restoring a pre-template backup migrates missing configuration and keeps the snapshot intact", () => {
  let state = fresh();
  const created = run(state, "backup.create");
  state = created.state;
  const oldBackup = state.datasets[backupKey].find(row => row.id === created.value.id);
  delete oldBackup.snapshot.datasets[KEY];
  for (const [key, rows] of Object.entries(oldBackup.snapshot.datasets)) {
    if (key.startsWith("admin-role-permissions-")) oldBackup.snapshot.datasets[key] = rows.filter(row => row.name !== "Email Templates");
  }
  const preserved = structuredClone(oldBackup.snapshot);
  state = run(state, "emailTemplate.select", selection()).state;
  state = run(state, "backup.restore", { id: oldBackup.id, confirmation: "RESTORE" }).state;
  assert.deepEqual(state.datasets[KEY], {});
  assert.deepEqual(state.datasets[backupKey].find(row => row.id === oldBackup.id).snapshot, preserved);
  assert.equal(validateSnapshot(state, fresh()), true);
});
