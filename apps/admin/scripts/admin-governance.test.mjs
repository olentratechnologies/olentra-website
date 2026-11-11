import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createInitialState, executeCommand, resolveDataset, validateSnapshot } from "../src/lib/admin/model.mjs";
import { selectOverview } from "../src/lib/admin/selectors.mjs";
import { STAFF, signedIn } from "./support/staff-session.mjs";

const fixture = (name) => JSON.parse(readFileSync(new URL(`../src/data/admin/${name}.json`, import.meta.url), "utf8"));
const seed = createInitialState([fixture("core"), fixture("content"), fixture("operations"), fixture("governance")]);
// Workspaces start signed in as the owner, as a verified staff session would.
const initial = signedIn(seed);
const fresh = () => structuredClone(initial);
const K = {
  approvals: "olentra-admin-governance-approvals-v1", audit: "olentra-admin-governance-audit-v1",
  company: "olentra-admin-company-settings-v1", backups: "olentra-admin-backups-v1",
  notifications: "olentra-admin-notifications-v1", account: "olentra-admin-account-v1",
};
function dispatch(state, type, payload = {}) { return executeCommand(state, type, payload, { initial }); }
function success(state, type, payload = {}) {
  const result = dispatch(state, type, payload);
  assert.equal(result.ok, true, `${type}: ${result.error || "command failed"}`);
  return result;
}
function failure(state, type, payload, pattern) {
  const result = dispatch(state, type, payload);
  assert.equal(result.ok, false, `${type} should fail`);
  if (pattern) assert.match(result.error, pattern);
  assert.deepEqual(result.state, state, `${type} must roll back all state changes`);
  return result;
}

test("approval publishes the requested feature snapshot and refuses a second decision", () => {
  let state = fresh();
  assert.equal(state.datasets["published-features:Production"].internships, false);
  assert.equal(state.datasets["published-features:Production"].applications, false);
  const pendingBefore = selectOverview(state).pendingApprovals;
  state = success(state, "approval.decide", { id: "CHG-024", decision: "approve" }).state;
  assert.equal(state.datasets["published-features:Production"].internships, true);
  assert.equal(state.datasets["features:Production"].applications, true);
  assert.equal(state.datasets["published-features:Production"].portal, true);
  assert.equal(state.datasets[K.approvals].find((item) => item.id === "CHG-024").status, "approved");
  assert.equal(selectOverview(state).pendingApprovals, pendingBefore - 1);
  assert.ok(state.datasets[K.audit].some((item) => item.action === "Approved change" && item.approval === "CHG-024"));
  failure(state, "approval.decide", { id: "CHG-024", decision: "approve" }, /already been decided/i);
});

test("rejection requires a reason and preserves the published content", () => {
  let state = fresh();
  failure(state, "approval.decide", { id: "CHG-025", decision: "reject", reason: "  " }, /review note/i);
  const before = structuredClone(state.datasets["olentra-admin-published-page-homepage"]);
  state = success(state, "approval.decide", { id: "CHG-025", decision: "reject", reason: "Revise the introduction before publishing." }).state;
  const request = state.datasets[K.approvals].find((item) => item.id === "CHG-025");
  assert.equal(request.status, "rejected");
  assert.equal(request.decisionNote, "Revise the introduction before publishing.");
  assert.deepEqual(state.datasets["olentra-admin-published-page-homepage"], before);
});

test("identical pending content requests are deduplicated despite a new version ID or property order", () => {
  let state = fresh();
  const model = { title: "Review this introduction", description: "A new description.", button: "Contact us", destination: "/contact" };
  const request = { kind: "content", title: "Review about page", scope: "English", target: { id: "about", model, versionId: "first-version" } };
  state = success(state, "approval.request", request).state;
  const count = state.datasets[K.approvals].length;
  const duplicate = { ...request, title: "Another label for the same change", target: { id: "about", versionId: "new-version", model: { destination: "/contact", button: "Contact us", description: "A new description.", title: "Review this introduction" } } };
  failure(state, "approval.request", duplicate, /already awaiting review/i);
  assert.equal(state.datasets[K.approvals].length, count);
  const changed = { ...request, target: { ...request.target, model: { ...model, title: "A different revision" } } };
  assert.equal(success(state, "approval.request", changed).state.datasets[K.approvals].length, count + 1);
});

test("a failed nested publication rolls back the approval, audit history and notifications", () => {
  let state = fresh();
  const submitted = success(state, "approval.request", { kind: "content", title: "Invalid nested publication", target: { id: "missing-content", model: { title: "Valid title", description: "Valid draft." } } });
  state = submitted.state;
  const id = submitted.value.id;
  failure(state, "approval.decide", { id, decision: "approve" }, /could not be found/i);
  assert.equal(state.datasets[K.approvals].find((item) => item.id === id).status, "pending");
});

test("audit restoration restores the real typed company configuration", () => {
  let state = fresh();
  const before = structuredClone(state.datasets[K.company]);
  state = success(state, "settings.save", { section: "company", values: { ...before, company: "Renamed company" } }).state;
  assert.equal(state.datasets[K.company].company, "Renamed company");
  const event = state.datasets[K.audit].find((item) => item.restore?.key === K.company);
  assert.ok(event);
  state = success(state, "audit.restore", { id: event.id }).state;
  assert.deepEqual(state.datasets[K.company], before);
  assert.equal(state.datasets[K.audit][0].action, "Restored previous configuration");
});
test("integration tests require saved configuration and never retain typed credentials", () => {
  let state = fresh();
  failure(state, "integration.test", { id: "recruitment" }, /credential/i);
  const key = "olentra-admin-integration-config-recruitment-v1";
  const config = { ...state.datasets[key], credentialConfigured: true, credential: "PLAINTEXT-MUST-NOT-BE-STORED", signingSecret: "SECRET-MUST-NOT-BE-STORED" };
  state = success(state, "integration.save", { id: "recruitment", config }).state;
  assert.equal(JSON.stringify(state).includes("PLAINTEXT-MUST-NOT-BE-STORED"), false);
  assert.equal(JSON.stringify(state).includes("SECRET-MUST-NOT-BE-STORED"), false);
  const tested = success(state, "integration.test", { id: "recruitment" });
  state = tested.state;
  assert.equal(tested.value.localOnly, true);
  assert.equal(state.datasets[key].lastTestStatus, "passed");
  state = success(state, "integration.connect", { id: "recruitment" }).state;
  assert.equal(state.datasets["olentra-admin-integrations-v1"].recruitment, "connected");
});

test("account identity comes from the staff account while preferences stay editable", () => {
  let state = fresh();
  const profile = state.datasets[K.account];
  assert.equal(profile.email, STAFF.owner.email);
  assert.equal(profile.role, "Owner");
  failure(state, "settings.save", { section: "account", values: { ...profile, name: "Someone else" } }, /Staff & roles/);
  failure(state, "settings.save", { section: "account", values: { ...profile, email: "other@example.com" } }, /Staff & roles/);
  failure(state, "settings.save", { section: "account", values: { ...profile, role: "Editor" } }, /Staff & roles/);
  state = success(state, "settings.save", { section: "account", values: { ...profile, jobTitle: "Founder", timezone: "UTC" } }).state;
  assert.equal(state.datasets[K.account].jobTitle, "Founder");
  assert.equal(state.datasets[K.account].timezone, "UTC");
});
test("JSON backups capture state, require confirmation and preserve authentication and audit history", () => {
  let state = fresh();
  const savedName = state.datasets[K.company].company;
  const created = success(state, "backup.create");
  state = created.state;
  const backup = created.value;
  assert.ok(backup.snapshot.datasets[K.company]);
  assert.equal(backup.snapshot.datasets[K.backups], undefined);
  assert.equal(backup.snapshot.datasets["auth-accounts"], undefined);
  state = success(state, "settings.save", { section: "company", values: { company: "Changed after backup" } }).state;
  const accountsBeforeRestore = structuredClone(state.datasets["auth-accounts"]);
  const sessionBeforeRestore = structuredClone(state.datasets["auth-session"]);
  const auditBeforeRestore = state.datasets[K.audit].map((item) => item.id);
  failure(state, "backup.restore", { id: backup.id, confirmation: "wrong" }, /RESTORE/);
  assert.equal(state.datasets[K.company].company, "Changed after backup");
  state = success(state, "backup.restore", { id: backup.id, confirmation: "RESTORE" }).state;
  assert.equal(state.datasets[K.company].company, savedName);
  assert.deepEqual(state.datasets["auth-accounts"], accountsBeforeRestore);
  assert.deepEqual(state.datasets["auth-session"], sessionBeforeRestore);
  assert.ok(auditBeforeRestore.every((id) => state.datasets[K.audit].some((item) => item.id === id)));
  assert.ok(state.datasets[K.backups].some((item) => item.id === backup.id));
});

test("notification read, read-all and delete update the shared overview unread count", () => {
  let state = fresh();
  const first = state.datasets[K.notifications].find((item) => !item.read);
  const unread = selectOverview(state).unreadNotifications;
  state = success(state, "notification.read", { id: first.id, read: true }).state;
  assert.equal(selectOverview(state).unreadNotifications, unread - 1);
  state = success(state, "notification.readAll").state;
  assert.equal(selectOverview(state).unreadNotifications, 0);
  state = success(state, "notification.read", { id: first.id, read: false }).state;
  assert.equal(selectOverview(state).unreadNotifications, 1);
  state = success(state, "notification.delete", { id: first.id }).state;
  assert.equal(selectOverview(state).unreadNotifications, 0);
  assert.equal(state.datasets[K.notifications].some((item) => item.id === first.id), false);
});

test("SEO review approval publishes the reviewed metadata snapshot", () => {
  let state = fresh();
  const page = state.datasets["admin-seo-pages"][0];
  state = success(state, "seo.save", { id: page.id, patch: { title: "Reviewed metadata title", status: "In review" } }).state;
  const approval = state.datasets[K.approvals].find((item) => item.kind === "seo" && item.target.id === page.id);
  assert.ok(approval);
  state = success(state, "approval.decide", { id: approval.id, decision: "approve" }).state;
  assert.equal(state.datasets["admin-seo-published"].find((item) => item.id === page.id).title, "Reviewed metadata title");
  assert.equal(state.datasets[K.approvals].find((item) => item.id === approval.id).status, "approved");
});

test("enquiry UI statuses and follow-up payload update the shared inbox", () => {
  let state = fresh();
  const id = "018";
  state = success(state, "enquiry.update", { id, patch: { owner: "Sales lead", status: "Assigned" } }).state;
  assert.equal(state.datasets["olentra-admin-enquiries-v1"].find((item) => item.id === id).status, "Assigned");
  state = success(state, "enquiry.update", { id, patch: { status: "Awaiting reply" } }).state;
  assert.equal(state.datasets["olentra-admin-enquiries-v1"].find((item) => item.id === id).status, "Awaiting reply");
  const followup = { date: "2026-11-15", time: "10:00", saved: true };
  state = success(state, "enquiry.update", { id, patch: { followup } }).state;
  assert.deepEqual(state.datasets[`olentra-admin-enquiry-followup-${id}`], followup);
  assert.deepEqual(state.datasets["olentra-admin-enquiries-v1"].find((item) => item.id === id).followup, followup);
});

test("submission review history exposes the version/status/feedback fields rendered by the UI", () => {
  let state = fresh();
  const projectId = "website-refresh";
  const key = `olentra-admin-project-tasks-${projectId}`;
  const task = state.datasets[key].find((item) => item.status === "In review");
  assert.ok(task);
  const feedback = "Please add keyboard navigation and resubmit.";
  state = success(state, "task.review", { projectId, taskId: task.id, decision: "changes", feedback }).state;
  const updated = state.datasets[key].find((item) => item.id === task.id);
  const history = updated.history.at(-1);
  assert.equal(history.version, task.version || 1);
  assert.equal(history.status, "Changes requested");
  assert.equal(history.feedback, feedback);
});

test("program review creates an approval and publishes the captured program snapshot", () => {
  let state = fresh();
  const id = "frontend";
  const key = `olentra-admin-program-${id}`;
  const publishedKey = `olentra-admin-published-program-${id}`;
  const beforePublished = structuredClone(state.datasets[publishedKey]);
  const model = { ...resolveDataset(state, key), title: "Reviewed engineering internship", applications: true };
  state = success(state, "program.save", { id, model, status: "In review" }).state;
  assert.deepEqual(state.datasets[publishedKey], beforePublished);
  const approval = state.datasets[K.approvals].find((item) => item.kind === "program" && item.target.id === id);
  assert.ok(approval);
  assert.equal(approval.target.model.title, model.title);
  assert.equal(approval.target.model.capacity, model.capacity);
  failure(state, "program.save", { id, model: { ...state.datasets[key] }, status: "In review" }, /already awaiting review/i);
  state = success(state, "approval.decide", { id: approval.id, decision: "approve" }).state;
  assert.equal(state.datasets[publishedKey].title, model.title);
  assert.equal(state.datasets[publishedKey].applications, true);
  assert.equal(state.datasets[publishedKey].portal, true);
  assert.equal(state.datasets[publishedKey].capacity, model.capacity);
  assert.equal(state.datasets[key].status, "Published");
  assert.equal(state.datasets["olentra-admin-opportunities"].find((item) => item.id === id).publicationStatus, "Published");
  assert.equal(state.datasets[K.approvals].find((item) => item.id === approval.id).status, "approved");
});

test("snapshot validation rejects null objects, missing required fields and invalid nested field types", () => {
  const nullCompany = fresh();
  nullCompany.datasets[K.company] = null;
  assert.throws(() => validateSnapshot(nullCompany, initial), /Invalid dataset type/i);
  const missingName = fresh();
  delete missingName.datasets[K.company].company;
  assert.throws(() => validateSnapshot(missingName, initial), /Missing required field/i);
  const wrongNameType = fresh();
  wrongNameType.datasets[K.company].company = { unexpected: "object" };
  assert.throws(() => validateSnapshot(wrongNameType, initial), /Invalid field type/i);
  const nullTranslationFields = fresh();
  nullTranslationFields.datasets["admin-translation-en-products"].fields = null;
  assert.throws(() => validateSnapshot(nullTranslationFields, initial), /Invalid field type/i);
});

test("snapshot validation rejects extra accounts, stored credentials and sessions referencing missing accounts", () => {
  const extraAccount = fresh();
  extraAccount.datasets["auth-accounts"].push({ ...STAFF.editor, enabled: true });
  assert.throws(() => validateSnapshot(extraAccount, initial), /only the signed-in account/i);
  const storedSecret = fresh();
  storedSecret.datasets["auth-accounts"][0].passwordDigest = "a".repeat(64);
  assert.throws(() => validateSnapshot(storedSecret, initial), /credentials/i);
  const danglingSession = fresh();
  danglingSession.datasets["auth-session"] = { status: "authenticated", userId: "missing-account", role: "Owner" };
  assert.throws(() => validateSnapshot(danglingSession, initial), /missing account/i);
  const mismatchedRole = fresh();
  mismatchedRole.datasets["auth-session"].role = "Editor";
  assert.throws(() => validateSnapshot(mismatchedRole, initial), /role does not match/i);
});
test("snapshot validation accepts signed-in and signed-out workspace state", () => {
  assert.equal(validateSnapshot(fresh(), initial), true);
  const anonymous = success(fresh(), "auth.signOut").state;
  assert.equal(anonymous.datasets["auth-session"].status, "anonymous");
  assert.deepEqual(anonymous.datasets["auth-accounts"], []);
  assert.equal(validateSnapshot(anonymous, initial), true);
});
