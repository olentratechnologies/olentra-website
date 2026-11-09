import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createInitialState, executeCommand, updateDataset, validateSnapshot, AUDIT_KEY, NOTICE_KEY } from "../src/lib/admin/model.mjs";
import { selectInternProgress, selectProjectProgress, selectOverview } from "../src/lib/admin/selectors.mjs";

const fixtureNames = ["core", "content", "operations", "governance"];
const fixtures = fixtureNames.map((name) => JSON.parse(readFileSync(new URL(`../src/data/admin/${name}.json`, import.meta.url), "utf8")));
const K = {
  applications: "olentra-admin-applications-v1",
  interns: "olentra-admin-interns",
  programs: "olentra-admin-opportunities",
  projects: "olentra-admin-projects",
  certificates: "olentra-admin-certificates",
  content: "olentra-admin-content-v1",
  approvals: "olentra-admin-governance-approvals-v1",
  enquiries: "olentra-admin-enquiries-v1",
};
const initial = () => createInitialState(fixtures);
const find = (state, key, id) => state.datasets[key].find((row) => row.id === id);
const clone = (value) => structuredClone(value);

function run(state, type, payload) {
  const original = clone(state);
  const result = executeCommand(state, type, payload);
  assert.equal(result.ok, true, `${type}: ${result.error || "command failed"}`);
  assert.deepEqual(state, original, `${type} must not mutate the caller's state`);
  return result;
}

function rejected(state, type, payload, message) {
  const original = clone(state);
  const result = executeCommand(state, type, payload);
  assert.equal(result.ok, false, `${type} must reject invalid input`);
  if (message) assert.match(result.error, message);
  assert.strictEqual(result.state, state, "Rejected commands must return the original state");
  assert.deepEqual(state, original, "Rejected commands must roll back records, audit and notifications");
  return result;
}

test("JSON fixtures have coherent application, intern, project, task and certificate relationships", () => {
  const state = initial();
  assert.equal(validateSnapshot(state, initial()), true);
  const programs = new Map(state.datasets[K.programs].map((row) => [row.id, row]));
  const applications = new Map(state.datasets[K.applications].map((row) => [row.id, row]));
  const interns = new Map(state.datasets[K.interns].map((row) => [row.id, row]));
  const projects = new Map(state.datasets[K.projects].map((row) => [row.id, row]));

  for (const application of applications.values()) {
    assert.ok(programs.has(application.programId), `Applicant ${application.id} has a program`);
    if (application.stage === "Joined") {
      const matches = [...interns.values()].filter((row) => row.applicationId === application.id);
      assert.equal(matches.length, 1, `Joined applicant ${application.id} has exactly one intern`);
      assert.equal(matches[0].programId, application.programId);
      assert.ok(application.onboarding.every((row) => row.status === "Completed"));
    }
  }
  for (const intern of interns.values()) {
    assert.ok(applications.has(intern.applicationId));
    assert.ok(programs.has(intern.programId));
    if (["Active", "Completed"].includes(intern.status)) {
      assert.ok(state.datasets[`olentra-admin-intern-checks-${intern.id}`].every(Boolean));
    }
    for (const projectId of intern.projectIds) {
      assert.ok(projects.get(projectId)?.internIds.includes(intern.id), `Intern ${intern.id} has reciprocal membership`);
    }
  }
  for (const project of projects.values()) {
    for (const internId of project.internIds) assert.ok(interns.get(internId)?.projectIds.includes(project.id));
    for (const task of state.datasets[`olentra-admin-project-tasks-${project.id}`]) {
      assert.equal(task.projectId, project.id);
      assert.ok(project.internIds.includes(task.internId || task.intern), `${task.id} is assigned to a project member`);
    }
  }
  for (const certificate of state.datasets[K.certificates]) {
    const intern = interns.get(certificate.internId || certificate.id);
    assert.ok(intern);
    if (certificate.status === "Issued") {
      assert.equal(intern.status, "Completed");
      assert.equal(selectInternProgress(state, intern.id).complete, true);
    }
  }
});

test("an invalid application stage jump rolls back all changes", () => {
  const state = initial();
  const applicant = state.datasets[K.applications].find((row) => row.stage === "New");
  assert.ok(applicant, "A New applicant is present in the fixture");
  rejected(state, "application.transition", { id: applicant.id, status: "Joined" }, /screening|interview|offer/i);
  assert.equal(find(state, K.applications, applicant.id).stage, "New");
  assert.equal(state.datasets[K.interns].filter((row) => row.applicationId === applicant.id).length, 0);
});

test("reviewing a New application through every stage creates one Onboarding intern and updates program counts", () => {
  let state = initial();
  const applicant = state.datasets[K.applications].find((row) => row.stage === "New");
  const beforeProgram = clone(find(state, K.programs, applicant.programId));
  const auditCount = state.datasets[AUDIT_KEY].length;
  const noticeCount = state.datasets[NOTICE_KEY].length;
  for (const status of ["Screening", "Interview", "Offer", "Joined"]) {
    state = run(state, "application.transition", { id: applicant.id, status }).state;
    assert.equal(find(state, K.applications, applicant.id).stage, status);
  }
  const matches = state.datasets[K.interns].filter((row) => row.applicationId === applicant.id);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].status, "Onboarding");
  assert.equal(matches[0].programId, applicant.programId);
  assert.deepEqual(matches[0].projectIds, []);
  assert.equal(selectInternProgress(state, matches[0].id).complete, false);
  assert.equal(find(state, K.programs, applicant.programId).interns, beforeProgram.interns + 1);
  assert.equal(find(state, K.programs, applicant.programId).applications, beforeProgram.applications);
  assert.equal(state.datasets[AUDIT_KEY].length, auditCount + 4);
  assert.equal(state.datasets[NOTICE_KEY].length, noticeCount + 4);
  assert.ok(find(state, K.applications, applicant.id).activity.some((row) => row.action === "Moved to Joined"));
  rejected(state, "application.transition", { id: applicant.id, status: "Joined" }, /already/i);
  assert.equal(state.datasets[K.interns].filter((row) => row.applicationId === applicant.id).length, 1);
});

test("a task change request requires useful feedback and records the review without approving work", () => {
  let state = initial();
  const projectId = "website-refresh";
  const taskId = "contact";
  const progress = selectInternProgress(state, "024").progress;
  rejected(state, "task.review", { projectId, taskId, decision: "changes", feedback: "  " }, /feedback/i);
  const result = run(state, "task.review", { projectId, taskId, decision: "changes", feedback: "Please improve keyboard focus and spacing on mobile." });
  state = result.state;
  assert.equal(find(state, `olentra-admin-project-tasks-${projectId}`, taskId).status, "Changes requested");
  assert.equal(result.value.feedback, "Please improve keyboard focus and spacing on mobile.");
  assert.equal(state.datasets[`olentra-admin-project-reviews-${projectId}`].at(-1).taskId, taskId);
  assert.equal(selectInternProgress(state, "024").progress, progress);
});

test("approving submitted work increases both the intern and project progress", () => {
  let state = initial();
  const beforeIntern = selectInternProgress(state, "003");
  const beforeProject = selectProjectProgress(state, "cloud-observability");
  assert.equal(beforeIntern.complete, false);
  state = run(state, "task.review", { projectId: "cloud-observability", taskId: "deploy", decision: "approve", feedback: "Monitoring dashboard verified." }).state;
  const after = selectInternProgress(state, "003");
  assert.equal(after.complete, true);
  assert.equal(after.progress, 100);
  assert.ok(after.progress > beforeIntern.progress);
  assert.equal(find(state, K.interns, "003").progress, after.progress);
  assert.equal(selectProjectProgress(state, "cloud-observability").approved, beforeProject.approved + 1);
  assert.equal(selectProjectProgress(state, "cloud-observability").progress, 100);
});

test("creating a task rejects an assignee from another project and automatically chooses an active project member", () => {
  let state = initial();
  const projectId = "cloud-observability";
  const taskKey = `olentra-admin-project-tasks-${projectId}`;
  const beforeCount = state.datasets[taskKey].length;
  rejected(state, "task.create", { projectId, title: "Review dashboard keyboard controls", internId: "024" }, /project|member|assignee/i);
  assert.equal(state.datasets[taskKey].length, beforeCount);
  const created = run(state, "task.create", { projectId, title: "Review dashboard keyboard controls" });
  state = created.state;
  assert.equal(created.value.projectId, projectId);
  assert.equal(created.value.status, "To do");
  const assignee = find(state, K.interns, created.value.internId || created.value.intern);
  assert.equal(assignee.status, "Active");
  assert.ok(assignee.projectIds.includes(projectId));
  assert.ok(find(state, K.projects, projectId).internIds.includes(assignee.id));
  assert.equal(state.datasets[taskKey].length, beforeCount + 1);
});

test("a newly created task can be submitted, returned for changes, resubmitted and approved entirely through commands", () => {
  let state = initial();
  const projectId = "cloud-observability";
  const taskKey = `olentra-admin-project-tasks-${projectId}`;
  const created = run(state, "task.create", { projectId, title: "Add an accessible monitoring summary" });
  state = created.state;
  const taskId = created.value.id;
  const internId = created.value.internId || created.value.intern;
  const initialVersion = Number(created.value.version || 0);
  rejected(state, "task.submit", { projectId, taskId, notes: "  " }, /notes|describe|required/i);
  const first = run(state, "task.submit", { projectId, taskId, notes: "Added summary landmarks and keyboard navigation.", workLink: "https://example.com/sample-monitoring-work" });
  state = first.state;
  let task = find(state, taskKey, taskId);
  assert.equal(task.status, "In review");
  assert.equal(task.version, initialVersion + 1);
  assert.equal(task.notes, "Added summary landmarks and keyboard navigation.");
  assert.equal(task.workLink, "https://example.com/sample-monitoring-work");
  assert.ok(task.submitted);
  const firstVersion = task.version;
  state = run(state, "task.review", { projectId, taskId, decision: "changes", feedback: "Please add visible focus treatment to the filter control." }).state;
  assert.equal(find(state, taskKey, taskId).status, "Changes requested");
  state = run(state, "task.submit", { projectId, taskId, notes: "Added focus styles and verified keyboard-only use." }).state;
  task = find(state, taskKey, taskId);
  assert.equal(task.status, "In review");
  assert.equal(task.version, firstVersion + 1);
  const beforeApproval = selectInternProgress(state, internId).approved.length;
  state = run(state, "task.review", { projectId, taskId, decision: "approve", feedback: "Keyboard flow and visible focus verified." }).state;
  assert.equal(find(state, taskKey, taskId).status, "Approved");
  assert.equal(selectInternProgress(state, internId).approved.length, beforeApproval + 1);
  assert.equal(state.datasets[`olentra-admin-project-reviews-${projectId}`].filter((row) => row.taskId === taskId).length, 2);
  rejected(state, "task.submit", { projectId, taskId, notes: "Attempt to overwrite approved work." }, /approved|submission|review|closed/i);
});

test("completion requires approved tasks and mentor/closure checks; issued certificates cannot duplicate and revocation hides the portal copy", () => {
  let state = initial();
  rejected(state, "intern.transition", { id: "003", status: "Completed" }, /required.*tasks|approved/i);
  rejected(state, "certificate.issue", { internId: "003" }, /complete.*internship/i);
  state = run(state, "task.review", { projectId: "cloud-observability", taskId: "deploy", decision: "approve", feedback: "All required work approved." }).state;
  rejected(state, "intern.transition", { id: "003", status: "Completed" }, /mentor|closure/i);
  state = updateDataset(state, "olentra-admin-intern-completion-003", [true, true, false]);
  rejected(state, "intern.transition", { id: "003", status: "Completed" }, /mentor|closure/i);
  state = updateDataset(state, "olentra-admin-intern-completion-003", [true, true, true]);
  state = run(state, "intern.transition", { id: "003", status: "Completed" }).state;
  assert.equal(find(state, K.interns, "003").status, "Completed");
  assert.equal(selectInternProgress(state, "003").complete, true);
  const issued = run(state, "certificate.issue", { internId: "003" });
  state = issued.state;
  assert.equal(issued.value.status, "Issued");
  assert.equal(issued.value.portalPublished, true);
  assert.equal(issued.value.internId, "003");
  rejected(state, "certificate.issue", { internId: "003" }, /already.*issued/i);
  assert.equal(state.datasets[K.certificates].filter((row) => row.internId === "003").length, 1);
  rejected(state, "certificate.revoke", { id: issued.value.id, reason: "" }, /reason/i);
  state = run(state, "certificate.revoke", { id: issued.value.id, reason: "Completion record needs correction." }).state;
  const revoked = find(state, K.certificates, issued.value.id);
  assert.equal(revoked.status, "Revoked");
  assert.equal(revoked.portalPublished, false);
  assert.equal(revoked.reason, "Completion record needs correction.");
  rejected(state, "certificate.publish", { id: revoked.id }, /issued/i);
});

test("content review publishes its submitted snapshot while preserving a newer draft and version history", () => {
  let state = initial();
  const id = "about";
  const historyKey = `olentra-admin-page-history-${id}`;
  const draftKey = `olentra-admin-page-${id}`;
  const historyCount = state.datasets[historyKey].length;
  const pendingCount = selectOverview(state).pendingApprovals;
  const submitted = { ...clone(state.datasets[draftKey]), title: "Reviewed company introduction", description: "Content approved for the public release." };
  state = run(state, "content.save", { id, model: submitted, status: "In review" }).state;
  const request = state.datasets[K.approvals].find((row) => row.kind === "content" && row.target?.id === id && row.status === "pending");
  assert.ok(request);
  assert.deepEqual(request.target.model, submitted);
  assert.equal(selectOverview(state).pendingApprovals, pendingCount + 1);
  const newerDraft = { ...submitted, title: "Unreviewed next iteration" };
  state = run(state, "content.save", { id, model: newerDraft, status: "Draft" }).state;
  state = run(state, "approval.decide", { id: request.id, decision: "approve" }).state;
  assert.deepEqual(state.datasets[`olentra-admin-published-page-${id}`], submitted);
  assert.deepEqual(state.datasets[draftKey], newerDraft);
  assert.equal(find(state, K.content, id).status, "Draft");
  assert.equal(find(state, K.approvals, request.id).status, "approved");
  assert.equal(selectOverview(state).pendingApprovals, pendingCount);
  assert.equal(state.datasets[historyKey].length, historyCount + 3);
  assert.ok(state.datasets[historyKey].some((row) => row.status === "Published" && row.model.title === submitted.title));
});

test("restoring a content version creates a draft without replacing the published page", () => {
  let state = initial();
  const id = "about";
  const historyKey = `olentra-admin-page-history-${id}`;
  const draftKey = `olentra-admin-page-${id}`;
  const originalVersion = clone(state.datasets[historyKey][0]);
  const publicModel = { ...clone(state.datasets[draftKey]), title: "Published company story", description: "The released public introduction." };
  state = run(state, "content.save", { id, model: publicModel, status: "Draft" }).state;
  state = run(state, "content.publish", { id, model: publicModel }).state;
  const beforeHistory = state.datasets[historyKey].length;
  state = run(state, "content.restore", { id, versionId: originalVersion.id }).state;
  assert.deepEqual(state.datasets[draftKey], originalVersion.model);
  assert.deepEqual(state.datasets[`olentra-admin-published-page-${id}`], publicModel);
  assert.equal(find(state, K.content, id).status, "Draft");
  assert.equal(state.datasets[historyKey].length, beforeHistory + 1);
  assert.equal(state.datasets[historyKey][0].status, "Draft");
});

test("editing program intake in a draft does not open applications before the reviewed snapshot is published", () => {
  let state = initial();
  const id = "frontend";
  const beforeStatus = find(state, K.programs, id).status;
  const model = { ...clone(state.datasets[`olentra-admin-program-${id}`]), title: "Reviewed frontend internship", applications: true };
  state = run(state, "program.save", { id, model, status: "Draft" }).state;
  assert.equal(find(state, K.programs, id).status, beforeStatus);
  assert.equal(state.datasets[`olentra-admin-program-${id}`].applications, true, "The changed switch remains in the editable draft");
  state = run(state, "program.save", { id, model, status: "In review" }).state;
  assert.equal(find(state, K.programs, id).status, beforeStatus);
  const request = state.datasets[K.approvals].find((row) => row.kind === "program" && row.target?.id === id && row.status === "pending");
  assert.ok(request);
  state = run(state, "approval.decide", { id: request.id, decision: "approve" }).state;
  assert.equal(find(state, K.programs, id).status, "Open");
  assert.equal(state.datasets[`olentra-admin-published-program-${id}`].applications, true);
  assert.equal(find(state, K.approvals, request.id).status, "approved");
});

test("recording an enquiry reply updates the directory, conversation, draft and activity together", () => {
  let state = initial();
  const id = "020";
  const replyKey = `olentra-admin-enquiry-replies-${id}`;
  const draftKey = `olentra-admin-enquiry-draft-${id}`;
  const privateKey = `olentra-admin-enquiry-notes-${id}`;
  state = updateDataset(state, draftKey, "Prepared reply draft");
  const repliesBefore = state.datasets[replyKey].length;
  const privateBefore = clone(state.datasets[privateKey]);
  const openBefore = selectOverview(state).openEnquiries;
  rejected(state, "enquiry.reply", { id, text: " " }, /message/i);
  const reply = run(state, "enquiry.reply", { id, text: "Thank you. Our team can discuss scope and availability." });
  state = reply.state;
  assert.equal(find(state, K.enquiries, id).status, "Awaiting reply");
  assert.equal(state.datasets[replyKey].length, repliesBefore + 1);
  assert.equal(state.datasets[replyKey].at(-1).text, "Thank you. Our team can discuss scope and availability.");
  assert.equal(state.datasets[replyKey].at(-1).private, false);
  assert.equal(state.datasets[draftKey], "");
  assert.deepEqual(state.datasets[privateKey], privateBefore);
  assert.ok(find(state, K.enquiries, id).activity.some((row) => row.action === "Reply recorded"));
  assert.equal(selectOverview(state).openEnquiries, openBefore);
  assert.ok(state.datasets[AUDIT_KEY].some((row) => row.action === "Enquiry reply recorded"));
});
