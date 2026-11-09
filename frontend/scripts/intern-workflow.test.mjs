import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  emptyStore,
  normalizeStore,
  migrateLegacy,
  materialize,
  validSession,
  scopedRecords,
  reduceAction,
  SESSION_DURATION,
} from "../src/lib/intern/workflow.mjs";

const base = JSON.parse(
  fs.readFileSync(
    new URL("../src/data/intern-dashboard.json", import.meta.url),
    "utf8",
  ),
);
const fixtures = JSON.parse(
  fs.readFileSync(
    new URL("../src/data/intern-workflows.json", import.meta.url),
    "utf8",
  ),
);
const COMPANY = "company-admin";
const ACTIVE = "intern-active";
const PENDING = "intern-pending";
const SELECTED = "intern-selected";
const ACTIVE_APPLICATION = "OL-2026-0006";
const PENDING_APPLICATION = "OL-2026-0003";
const SELECTED_APPLICATION = "OL-2026-0001";
const HASH = "a".repeat(64);
const START = Date.parse("2026-11-10T10:00:00.000Z");

function harness(initial = emptyStore()) {
  let state = initial;
  let sequence = 0;
  const api = {
    get state() {
      return state;
    },
    get data() {
      return materialize(base, fixtures, state);
    },
    act(type, payload = {}, actor = COMPANY, now) {
      const before = structuredClone(state);
      const original = state;
      const output = reduceAction(base, fixtures, state, actor, {
        type,
        payload,
        id: `test-${++sequence}`,
        now: now || new Date(START + sequence * 1000).toISOString(),
      });
      assert.deepEqual(original, before, `${type} must not mutate its input`);
      if (output.result.ok) {
        assert.equal(output.state.revision, state.revision + 1);
        state = output.state;
      } else
        assert.strictEqual(
          output.state,
          state,
          `${type} must leave failed actions uncommitted`,
        );
      return output.result;
    },
    ok(type, payload = {}, actor = COMPANY, now) {
      const result = api.act(type, payload, actor, now);
      assert.equal(result.ok, true, `${type}: ${result.error || "failed"}`);
      return result.data;
    },
    deny(type, payload = {}, actor = COMPANY, error) {
      const result = api.act(type, payload, actor);
      assert.equal(result.ok, false, `${type} unexpectedly succeeded`);
      assert.equal(typeof result.error, "string");
      if (error) assert.match(result.error, error);
      return result;
    },
    scope(actorId) {
      return scopedRecords(
        api.data,
        state,
        api.data.accounts.find((account) => account.id === actorId),
      );
    },
  };
  return api;
}

function newApplicant(h, options = {}) {
  const application = h.ok(
    "SUBMIT_APPLICATION",
    {
      name: "Sample Applicant",
      email: "sample.applicant@example.com",
      programId: "innovator",
      resumeAttachmentId: "resume-local-test",
      ...options,
    },
    null,
  );
  const account = h.ok(
    "REGISTER",
    {
      applicationId: application.id,
      claimToken: application.claimToken,
      passwordHash: HASH,
    },
    null,
  );
  return { application, account };
}
function offerAndAccept(h, applicationId, accountId) {
  h.ok("UPDATE_APPLICATION", {
    id: applicationId,
    patch: { status: "Selected" },
  });
  const offer = h.ok("SEND_OFFER", {
    applicationId,
    startOn: "2026-11-16",
    endOn: "2027-02-16",
    stipend: 12000,
    message: "Welcome to the team.",
  });
  h.ok("ACCEPT_OFFER", { applicationId }, accountId);
  return offer;
}
function submitOnboarding(h, applicationId, accountId) {
  h.ok(
    "SAVE_ONBOARDING",
    {
      applicationId,
      details: {
        acknowledged: true,
        phone: "+91 00000 88888",
        college: "Demo Technical College",
        location: "Hyderabad, India",
        skills: ["React", "Git"],
        resumeAttachmentId: "resume-local-test",
      },
    },
    accountId,
  );
  h.ok("SUBMIT_ONBOARDING", { applicationId }, accountId);
}
function enrolled(h) {
  const record = newApplicant(h);
  offerAndAccept(h, record.application.id, record.account.id);
  submitOnboarding(h, record.application.id, record.account.id);
  const intern = h.ok("APPROVE_ONBOARDING", {
    applicationId: record.application.id,
  });
  return { ...record, intern };
}
function projectAndTask(h, applicationId, required = true) {
  const project = h.ok("CREATE_PROJECT", {
    project: {
      name: "Demo workflow project",
      description: "Build and review a complete local workflow.",
      program: "Tech Innovator",
      dueOn: "2026-12-20",
      team: [applicationId],
    },
  });
  const task = h.ok("CREATE_TASK", {
    projectId: project.id,
    applicationId,
    title: "Build the application summary",
    description: "Create the responsive summary and document the result.",
    dueOn: "2026-11-24",
    required,
  });
  return { project, task };
}

test("complete public application → offer → onboarding → work review → certificate journey", () => {
  const h = harness();
  const { application, account } = newApplicant(h);
  assert.equal(h.data.applications.length, base.applications.length + 1);
  assert.equal(h.scope(account.id).application.status, "Applied");
  h.ok("UPDATE_APPLICATION", {
    id: application.id,
    patch: { status: "Under Review" },
  });
  h.ok("UPDATE_APPLICATION", {
    id: application.id,
    patch: { status: "Shortlisted" },
  });
  offerAndAccept(h, application.id, account.id);
  assert.equal(h.scope(account.id).offer.status, "Accepted");
  submitOnboarding(h, application.id, account.id);
  assert.equal(h.scope(account.id).onboarding.status, "Submitted");
  assert.equal(
    h.scope(account.id).application.status,
    "Selected",
    "submitting onboarding must not enroll the applicant automatically",
  );
  assert.equal(
    h.scope(account.id).intern,
    null,
    "company approval is required to create an intern",
  );
  const intern = h.ok("APPROVE_ONBOARDING", { applicationId: application.id });
  assert.equal(h.scope(account.id).application.status, "Joined");
  assert.equal(h.scope(account.id).intern.status, "Active");
  const { project, task } = projectAndTask(h, application.id);
  assert(h.scope(account.id).projects.some((item) => item.id === project.id));
  h.ok("START_TASK", { taskId: task.id }, account.id);
  const first = h.ok(
    "SUBMIT_WORK",
    {
      taskId: task.id,
      notes: "The first implementation is ready.",
      url: "https://example.com/work/first",
    },
    account.id,
  );
  assert.equal(first.version, 1);
  h.ok("REVIEW_SUBMISSION", {
    id: first.id,
    decision: "Changes requested",
    feedback: "Please improve keyboard focus and mobile spacing.",
  });
  assert.equal(
    h.scope(account.id).tasks.find((item) => item.id === task.id).status,
    "Changes requested",
  );
  const second = h.ok(
    "SUBMIT_WORK",
    {
      taskId: task.id,
      notes: "Updated the layout and focus states.",
      attachmentId: "local-result-file",
    },
    account.id,
  );
  assert.equal(second.version, 2);
  h.ok("REVIEW_SUBMISSION", {
    id: second.id,
    decision: "Approved",
    feedback: "The update meets the acceptance criteria.",
  });
  h.ok("UPDATE_INTERN", { id: intern.id, patch: { status: "Completed" } });
  const certificates = h.ok("GENERATE_CERTIFICATES", {
    internIds: [intern.id],
  });
  assert.equal(certificates.length, 1);
  const own = h.scope(account.id);
  assert.equal(own.intern.status, "Completed");
  assert.equal(own.certificates.length, 1);
  assert.equal(own.certificates[0].applicationId, application.id);
  assert.equal(own.submissions.length, 2);
  assert.equal(
    own.submissions[0].feedback,
    "Please improve keyboard focus and mobile spacing.",
  );
  assert.equal(own.submissions[1].status, "Approved");
  assert(
    own.notifications.some(
      (notification) => notification.title === "Your certificate is ready",
    ),
  );
  const saved = normalizeStore(JSON.parse(JSON.stringify(h.state)));
  assert.deepEqual(
    scopedRecords(materialize(base, fixtures, saved), saved, account),
    own,
    "saved workflow must survive JSON persistence",
  );
});

test("public application validates resume, enabled tracks, and duplicate email", () => {
  const h = harness();
  h.deny(
    "SUBMIT_APPLICATION",
    {
      name: "Sample Applicant",
      email: "sample@example.com",
      programId: "explorer",
    },
    null,
    /resume/i,
  );
  h.deny(
    "SUBMIT_APPLICATION",
    {
      name: "A",
      email: "invalid",
      programId: "explorer",
      resumeAttachmentId: "file",
    },
    null,
  );
  h.ok("UPDATE_SETTINGS", { patch: { explorerEnabled: false } });
  h.deny(
    "SUBMIT_APPLICATION",
    {
      name: "Sample Applicant",
      email: "sample@example.com",
      programId: "explorer",
      resumeAttachmentId: "file",
    },
    null,
    /not accepting/i,
  );
  h.ok("UPDATE_SETTINGS", { patch: { explorerEnabled: true } });
  newApplicant(h);
  h.deny(
    "SUBMIT_APPLICATION",
    {
      name: "Another Applicant",
      email: " SAMPLE.APPLICANT@EXAMPLE.COM ",
      programId: "explorer",
      resumeAttachmentId: "file",
    },
    null,
    /already exists/i,
  );
  h.deny(
    "SUBMIT_APPLICATION",
    {
      name: "Another Applicant",
      email: "other@example.com",
      programId: "explorer",
      resumeAttachmentId: "file",
    },
    COMPANY,
    /sign out/i,
  );
});

test("registration requires the application claim, valid hash, and unique account", () => {
  const h = harness();
  const application = h.ok(
    "SUBMIT_APPLICATION",
    {
      name: "New Applicant",
      email: "new@example.com",
      programId: "explorer",
      resumeAttachmentId: "file",
    },
    null,
  );
  h.deny(
    "REGISTER",
    { applicationId: application.id, claimToken: "wrong", passwordHash: HASH },
    null,
  );
  h.deny(
    "REGISTER",
    {
      applicationId: application.id,
      claimToken: application.claimToken,
      passwordHash: "short",
    },
    null,
  );
  const account = h.ok(
    "REGISTER",
    {
      applicationId: application.id,
      claimToken: application.claimToken,
      passwordHash: HASH,
    },
    null,
  );
  assert.equal(account.applicationId, application.id);
  assert.equal(account.role, "intern");
  h.deny(
    "REGISTER",
    {
      applicationId: application.id,
      claimToken: application.claimToken,
      passwordHash: HASH,
    },
    null,
    /already exists/i,
  );
});

test("company commands reject intern and anonymous actors without partial writes", () => {
  const actions = [
    [
      "UPDATE_APPLICATION",
      { id: PENDING_APPLICATION, patch: { status: "Selected" } },
    ],
    [
      "SEND_OFFER",
      {
        applicationId: SELECTED_APPLICATION,
        startOn: "2026-11-16",
        endOn: "2027-01-16",
        stipend: 1000,
      },
    ],
    ["APPROVE_ONBOARDING", { applicationId: SELECTED_APPLICATION }],
    [
      "CREATE_PROJECT",
      {
        project: {
          name: "A project",
          description: "A valid project description",
          team: [],
        },
      },
    ],
    ["UPDATE_PROJECT", { id: "PRJ-001", patch: { progress: 100 } }],
    [
      "CREATE_TASK",
      {
        projectId: "PRJ-001",
        applicationId: ACTIVE_APPLICATION,
        title: "Task",
        description: "Description",
        dueOn: "2026-11-20",
      },
    ],
    ["UPDATE_TASK", { id: "TASK-DEMO-001", patch: { required: false } }],
    [
      "REVIEW_SUBMISSION",
      { id: "SUB-DEMO-001", decision: "Approved", feedback: "Good" },
    ],
    ["UPDATE_INTERN", { id: "INT-2026-0001", patch: { status: "Completed" } }],
    ["GENERATE_CERTIFICATES", { internIds: ["INT-2026-0521"] }],
    ["ANNOUNCEMENT", { subject: "Update", message: "An announcement." }],
    ["UPDATE_SETTINGS", { patch: { maxStipend: 5000 } }],
    [
      "ADD_ACTIVITY",
      {
        title: "Forged company audit event",
        detail: "Intern must not publish this.",
      },
    ],
    ["LEGACY_READ", {}],
    ["RESET_DEMO", {}],
  ];
  for (const actor of [PENDING, null]) {
    const h = harness();
    for (const [type, payload] of actions)
      h.deny(type, payload, actor, /company admin/i);
    assert.equal(h.state.revision, 0);
  }
});

test("owner-only actions reject another applicant and do not change their records", () => {
  const h = harness();
  h.deny(
    "ACCEPT_OFFER",
    { applicationId: SELECTED_APPLICATION },
    PENDING,
    /another account/i,
  );
  h.deny(
    "DECLINE_OFFER",
    { applicationId: SELECTED_APPLICATION },
    PENDING,
    /another account/i,
  );
  h.deny(
    "SAVE_ONBOARDING",
    { applicationId: SELECTED_APPLICATION, details: { acknowledged: true } },
    PENDING,
    /another account/i,
  );
  h.deny(
    "SUBMIT_ONBOARDING",
    { applicationId: SELECTED_APPLICATION },
    PENDING,
    /another account/i,
  );
  h.deny(
    "START_TASK",
    { taskId: "TASK-DEMO-001" },
    PENDING,
    /another account/i,
  );
  h.deny(
    "SUBMIT_WORK",
    {
      taskId: "TASK-DEMO-001",
      notes: "Wrong owner",
      url: "https://example.com",
    },
    PENDING,
    /another account/i,
  );
  h.deny(
    "SEND_MESSAGE",
    {
      applicationId: SELECTED_APPLICATION,
      subject: "Wrong owner",
      body: "Private message",
    },
    PENDING,
    /another account/i,
  );
  h.deny(
    "UPDATE_PROFILE",
    { name: "Company cannot edit through intern endpoint" },
    COMPANY,
    /another account/i,
  );
});

test("Joined is reached through onboarding approval and remains an application terminal stage", () => {
  const h = harness();
  h.deny(
    "UPDATE_APPLICATION",
    { id: PENDING_APPLICATION, patch: { status: "Joined" } },
    COMPANY,
    /onboarding/i,
  );
  h.deny(
    "UPDATE_APPLICATION",
    { id: ACTIVE_APPLICATION, patch: { status: "Rejected" } },
    COMPANY,
    /interns page/i,
  );
  h.deny(
    "APPROVE_ONBOARDING",
    { applicationId: SELECTED_APPLICATION },
    COMPANY,
    /submit onboarding/i,
  );
  const record = enrolled(h);
  const count = h.data.interns.length;
  const repeated = h.ok("APPROVE_ONBOARDING", {
    applicationId: record.application.id,
  });
  assert.equal(repeated.id, record.intern.id);
  assert.equal(
    h.data.interns.length,
    count,
    "approval must not duplicate an intern",
  );
});

test("offers have a single decision and declined offers do not activate onboarding", () => {
  const h = harness();
  h.ok("ACCEPT_OFFER", { applicationId: SELECTED_APPLICATION }, SELECTED);
  h.deny(
    "ACCEPT_OFFER",
    { applicationId: SELECTED_APPLICATION },
    SELECTED,
    /no longer/i,
  );
  h.deny(
    "DECLINE_OFFER",
    { applicationId: SELECTED_APPLICATION },
    SELECTED,
    /no longer/i,
  );
  h.deny(
    "SEND_OFFER",
    {
      applicationId: SELECTED_APPLICATION,
      startOn: "2026-11-16",
      endOn: "2027-01-16",
      stipend: 1000,
    },
    COMPANY,
    /already.*accepted/i,
  );
  const declined = harness();
  declined.ok(
    "DECLINE_OFFER",
    { applicationId: SELECTED_APPLICATION, reason: "Another opportunity" },
    SELECTED,
  );
  assert.equal(declined.scope(SELECTED).application.status, "Declined");
  declined.deny(
    "ACCEPT_OFFER",
    { applicationId: SELECTED_APPLICATION },
    SELECTED,
  );
  declined.deny(
    "SAVE_ONBOARDING",
    { applicationId: SELECTED_APPLICATION, details: { acknowledged: true } },
    SELECTED,
    /accept.*offer/i,
  );
});

test("onboarding requires complete profile, resume, acknowledgement, and a single submission", () => {
  const h = harness();
  const { application, account } = newApplicant(h);
  offerAndAccept(h, application.id, account.id);
  h.deny(
    "SUBMIT_ONBOARDING",
    { applicationId: application.id },
    account.id,
    /complete.*profile/i,
  );
  h.ok(
    "SAVE_ONBOARDING",
    {
      applicationId: application.id,
      details: {
        phone: "000",
        college: "Demo",
        location: "Demo",
        acknowledged: false,
      },
    },
    account.id,
  );
  h.deny(
    "SUBMIT_ONBOARDING",
    { applicationId: application.id },
    account.id,
    /acknowledg/i,
  );
  submitOnboarding(h, application.id, account.id);
  h.deny(
    "SUBMIT_ONBOARDING",
    { applicationId: application.id },
    account.id,
    /already waiting/i,
  );
  h.deny(
    "SAVE_ONBOARDING",
    { applicationId: application.id, details: { phone: "changed" } },
    account.id,
    /already waiting/i,
  );
});

test("onboarding approval rejects a stale submission after the application was rejected", () => {
  const h = harness();
  const { application, account } = newApplicant(h);
  offerAndAccept(h, application.id, account.id);
  submitOnboarding(h, application.id, account.id);
  h.ok("UPDATE_APPLICATION", {
    id: application.id,
    patch: { status: "Rejected" },
  });
  h.deny("APPROVE_ONBOARDING", { applicationId: application.id });
  assert.equal(h.scope(account.id).application.status, "Rejected");
  assert.equal(h.scope(account.id).intern, null);
});

test("required tasks gate completion and pending work cannot be submitted twice", () => {
  const h = harness();
  h.deny(
    "UPDATE_INTERN",
    { id: "INT-2026-0001", patch: { status: "Completed" } },
    COMPANY,
    /required task/i,
  );
  assert.deepEqual(
    h.ok("GENERATE_CERTIFICATES", { internIds: ["INT-2026-0001"] }),
    [],
  );
  h.deny(
    "SUBMIT_WORK",
    { taskId: "TASK-DEMO-001", notes: "   ", url: "  " },
    ACTIVE,
    /notes.*link.*attachment/i,
  );
  h.deny(
    "SUBMIT_WORK",
    {
      taskId: "TASK-DEMO-001",
      notes: "Invalid link",
      url: "javascript:alert(1)",
    },
    ACTIVE,
    /http/i,
  );
  const submission = h.ok(
    "SUBMIT_WORK",
    {
      taskId: "TASK-DEMO-001",
      notes: "Ready for review",
      url: "https://example.com/demo/result",
    },
    ACTIVE,
  );
  h.deny(
    "SUBMIT_WORK",
    {
      taskId: "TASK-DEMO-001",
      notes: "Duplicate",
      url: "https://example.com/demo/result",
    },
    ACTIVE,
    /already submitted/i,
  );
  h.deny(
    "REVIEW_SUBMISSION",
    { id: submission.id, decision: "Changes requested", feedback: "  " },
    COMPANY,
    /explain/i,
  );
  h.ok("REVIEW_SUBMISSION", {
    id: submission.id,
    decision: "Approved",
    feedback: "Complete",
  });
  h.deny(
    "SUBMIT_WORK",
    {
      taskId: "TASK-DEMO-001",
      notes: "Already approved",
      url: "https://example.com/demo/result",
    },
    ACTIVE,
    /already submitted or approved/i,
  );
});

test("work submissions accept notes, a work URL, or an attachment independently", () => {
  for (const [payload, expected] of [
    [
      {
        notes: "  Implemented the assigned component and checked its layout.  ",
      },
      {
        notes: "Implemented the assigned component and checked its layout.",
        url: "",
        attachmentId: null,
      },
    ],
    [
      { url: "  https://example.com/work/link-only  " },
      {
        notes: "",
        url: "https://example.com/work/link-only",
        attachmentId: null,
      },
    ],
    [
      { attachmentId: "local-attachment-only" },
      { notes: "", url: "", attachmentId: "local-attachment-only" },
    ],
  ]) {
    const h = harness();
    const submission = h.ok(
      "SUBMIT_WORK",
      { taskId: "TASK-DEMO-001", ...payload },
      ACTIVE,
    );
    assert.equal(submission.status, "Submitted");
    assert.equal(submission.notes, expected.notes);
    assert.equal(submission.url, expected.url);
    assert.equal(submission.attachmentId, expected.attachmentId);
    assert.equal(
      h.scope(ACTIVE).tasks.find((task) => task.id === "TASK-DEMO-001").status,
      "Under review",
    );
  }
});

test("empty or whitespace-only work submissions are rejected without creating a version", () => {
  const h = harness();
  for (const payload of [
    {},
    { notes: "   " },
    { notes: "\n", url: "  ", attachmentId: "  " },
  ]) {
    h.deny(
      "SUBMIT_WORK",
      { taskId: "TASK-DEMO-001", ...payload },
      ACTIVE,
      /notes.*link.*attachment/i,
    );
  }
  assert.equal(
    h.data.submissions.filter(
      (submission) => submission.taskId === "TASK-DEMO-001",
    ).length,
    0,
  );
  assert.equal(h.state.revision, 0);
});

test("project membership and active lifecycle gate task assignment and submissions", () => {
  const h = harness();
  h.deny(
    "CREATE_PROJECT",
    {
      project: {
        name: "Invalid team",
        description: "Contains a pending applicant",
        team: [PENDING_APPLICATION],
      },
    },
    COMPANY,
    /active interns/i,
  );
  h.deny(
    "CREATE_TASK",
    {
      projectId: "PRJ-002",
      applicationId: ACTIVE_APPLICATION,
      title: "Wrong team",
      description: "A task",
      dueOn: "2026-11-20",
    },
    COMPANY,
    /project team/i,
  );
  const project = h.data.projects.find((item) => item.id === "PRJ-001");
  h.deny(
    "UPDATE_PROJECT",
    {
      id: project.id,
      patch: { team: project.team.filter((id) => id !== ACTIVE_APPLICATION) },
    },
    COMPANY,
    /finish.*assigned tasks/i,
  );
  h.ok("UPDATE_INTERN", { id: "INT-2026-0001", patch: { status: "Dropped" } });
  h.deny(
    "START_TASK",
    { taskId: "TASK-DEMO-001" },
    ACTIVE,
    /active interns only/i,
  );
  h.deny(
    "SUBMIT_WORK",
    {
      taskId: "TASK-DEMO-001",
      notes: "Cannot submit while dropped",
      url: "https://example.com",
    },
    ACTIVE,
    /active interns only/i,
  );
});

test("a seeded required submission under review blocks completion after other required work is approved", () => {
  const h = harness();
  const first = h.ok(
    "SUBMIT_WORK",
    {
      taskId: "TASK-DEMO-001",
      notes: "The component is ready.",
      url: "https://example.com/complete-first-task",
    },
    ACTIVE,
  );
  h.ok("REVIEW_SUBMISSION", {
    id: first.id,
    decision: "Approved",
    feedback: "Meets the requirements.",
  });
  const outstanding = h.data.tasks.filter(
    (task) =>
      task.applicationId === ACTIVE_APPLICATION &&
      task.required &&
      task.status !== "Approved",
  );
  assert.deepEqual(
    outstanding.map((task) => [task.id, task.status]),
    [["TASK-DEMO-003", "Under review"]],
  );
  h.deny(
    "UPDATE_INTERN",
    { id: "INT-2026-0001", patch: { status: "Completed" } },
    COMPANY,
    /required task/i,
  );
  assert.equal(h.scope(ACTIVE).intern.status, "Active");
  h.ok("REVIEW_SUBMISSION", {
    id: "SUB-DEMO-001",
    decision: "Approved",
    feedback: "Mobile review accepted.",
  });
  h.ok("UPDATE_INTERN", {
    id: "INT-2026-0001",
    patch: { status: "Completed" },
  });
  assert.equal(h.scope(ACTIVE).intern.status, "Completed");
});

test("profile updates stay on the actor’s application and ignore foreign identity or company-only fields", () => {
  const h = harness();
  const foreignBefore = structuredClone(
    h.data.applications.find(
      (application) => application.id === ACTIVE_APPLICATION,
    ),
  );
  const ownBefore = structuredClone(
    h.data.applications.find(
      (application) => application.id === PENDING_APPLICATION,
    ),
  );
  h.ok(
    "UPDATE_PROFILE",
    {
      id: ACTIVE_APPLICATION,
      applicationId: ACTIVE_APPLICATION,
      name: "Updated Pending Applicant",
      phone: "+91 00000 22222",
      email: "attempted-identity-change@example.com",
      role: "company",
      status: "Joined",
      notes: [{ text: "Forged private review" }],
      claimToken: "forged-token",
    },
    PENDING,
  );
  const own = h.data.applications.find(
    (application) => application.id === PENDING_APPLICATION,
  );
  assert.equal(own.name, "Updated Pending Applicant");
  assert.equal(own.phone, "+91 00000 22222");
  assert.equal(own.email, ownBefore.email);
  assert.equal(own.id, PENDING_APPLICATION);
  assert.equal(own.status, ownBefore.status);
  assert.deepEqual(own.notes, ownBefore.notes);
  assert.equal(own.claimToken, ownBefore.claimToken);
  assert.equal(
    h.data.accounts.find((account) => account.id === PENDING).role,
    "intern",
  );
  assert.equal(
    h.data.accounts.find((account) => account.id === PENDING).name,
    own.name,
  );
  assert.deepEqual(
    h.data.applications.find(
      (application) => application.id === ACTIVE_APPLICATION,
    ),
    foreignBefore,
  );
});

test("reviewing a seeded submission overrides its record without duplicating the version", () => {
  const h = harness();
  const original = structuredClone(fixtures.submissions[0]);
  h.ok("REVIEW_SUBMISSION", {
    id: original.id,
    decision: "Changes requested",
    feedback: "Please include a narrow mobile layout.",
  });
  let versions = h.data.submissions.filter(
    (item) => item.taskId === original.taskId,
  );
  assert.equal(versions.length, 1);
  assert.equal(versions[0].id, original.id);
  assert.equal(versions[0].status, "Changes requested");
  assert.deepEqual(
    fixtures.submissions[0],
    original,
    "fixture source must remain unchanged",
  );
  const second = h.ok(
    "SUBMIT_WORK",
    {
      taskId: original.taskId,
      notes: "Added narrow-screen recommendations.",
      url: "https://example.com/work/v2",
    },
    ACTIVE,
  );
  assert.equal(second.version, 2);
  h.deny("REVIEW_SUBMISSION", {
    id: original.id,
    decision: "Approved",
    feedback: "Stale version",
  });
  h.ok("REVIEW_SUBMISSION", {
    id: second.id,
    decision: "Approved",
    feedback: "Looks good",
  });
  h.deny("REVIEW_SUBMISSION", {
    id: second.id,
    decision: "Approved",
    feedback: "Repeated",
  });
  versions = h.data.submissions.filter(
    (item) => item.taskId === original.taskId,
  );
  assert.equal(versions.length, 2);
  assert.equal(
    versions.find((item) => item.version === 1).feedback,
    "Please include a narrow mobile layout.",
  );
  assert.equal(
    h.data.tasks.find((item) => item.id === original.taskId).status,
    "Approved",
  );
});

test("certificates are generated once, only for completed interns", () => {
  const h = harness();
  const record = enrolled(h);
  assert.deepEqual(
    h.ok("GENERATE_CERTIFICATES", { internIds: [record.intern.id] }),
    [],
  );
  h.ok("UPDATE_INTERN", {
    id: record.intern.id,
    patch: { status: "Completed" },
  });
  const created = h.ok("GENERATE_CERTIFICATES", {
    internIds: [record.intern.id, record.intern.id],
  });
  assert.equal(created.length, 1);
  assert.deepEqual(
    h.ok("GENERATE_CERTIFICATES", { internIds: [record.intern.id] }),
    [],
  );
  assert.equal(
    h.data.certificates.filter(
      (certificate) => certificate.internId === record.intern.id,
    ).length,
    1,
  );
});

test("completed internships and their tasks are terminal while issued certificates remain accessible", () => {
  const h = harness();
  const first = h.ok(
    "SUBMIT_WORK",
    { taskId: "TASK-DEMO-001", notes: "Completed the component." },
    ACTIVE,
  );
  h.ok("REVIEW_SUBMISSION", {
    id: first.id,
    decision: "Approved",
    feedback: "Approved.",
  });
  h.ok("REVIEW_SUBMISSION", {
    id: "SUB-DEMO-001",
    decision: "Approved",
    feedback: "Approved.",
  });
  h.ok("UPDATE_INTERN", {
    id: "INT-2026-0001",
    patch: { status: "Completed" },
  });
  const originalTask = structuredClone(
    h.data.tasks.find((task) => task.id === "TASK-DEMO-002"),
  );
  for (const patch of [
    { required: true },
    { title: "Changed after completion" },
    { description: "Different historical work" },
    { dueOn: "2027-01-01" },
  ]) {
    h.deny(
      "UPDATE_TASK",
      { id: "TASK-DEMO-002", patch },
      COMPANY,
      /read-only.*completion/i,
    );
  }
  assert.deepEqual(
    h.data.tasks.find((task) => task.id === "TASK-DEMO-002"),
    originalTask,
  );
  h.deny(
    "UPDATE_INTERN",
    { id: "INT-2026-0001", patch: { status: "Active" } },
    COMPANY,
    /completed.*cannot/i,
  );
  h.deny(
    "UPDATE_INTERN",
    { id: "INT-2026-0001", patch: { status: "Dropped" } },
    COMPANY,
    /completed.*cannot/i,
  );
  assert.equal(h.scope(ACTIVE).intern.status, "Completed");
  const certificates = h.ok("GENERATE_CERTIFICATES", {
    internIds: ["INT-2026-0001"],
  });
  assert.equal(certificates.length, 1);
  assert.equal(h.scope(ACTIVE).certificates.length, 1);
  assert(
    h.scope("intern-completed").certificates.length > 0,
    "seeded issued certificates must remain available",
  );
});

test("certificate generation skips legacy completed records with unfinished required work", () => {
  const initial = emptyStore();
  initial.interns["INT-2026-0001"] = { status: "Completed" };
  const h = harness(initial);
  assert(
    h.data.tasks.some(
      (task) =>
        task.applicationId === ACTIVE_APPLICATION &&
        task.required &&
        task.status !== "Approved",
    ),
  );
  assert.deepEqual(
    h.ok("GENERATE_CERTIFICATES", { internIds: ["INT-2026-0001"] }),
    [],
  );
  assert.equal(h.scope(ACTIVE).certificates.length, 0);
  assert(h.scope("intern-completed").certificates.length > 0);
});

test("removing a completed project member preserves their own project and submission history without exposing teammates", () => {
  const h = harness();
  for (const taskId of ["TASK-DEMO-001", "TASK-DEMO-002"]) {
    const submission = h.ok(
      "SUBMIT_WORK",
      { taskId, notes: `Completed work for ${taskId}.` },
      ACTIVE,
    );
    h.ok("REVIEW_SUBMISSION", {
      id: submission.id,
      decision: "Approved",
      feedback: "Work approved.",
    });
  }
  h.ok("REVIEW_SUBMISSION", {
    id: "SUB-DEMO-001",
    decision: "Approved",
    feedback: "Mobile review approved.",
  });
  h.ok("UPDATE_INTERN", {
    id: "INT-2026-0001",
    patch: { status: "Completed" },
  });
  const originalProject = h.data.projects.find(
    (project) => project.id === "PRJ-001",
  );
  h.ok("UPDATE_PROJECT", {
    id: originalProject.id,
    patch: {
      team: originalProject.team.filter((id) => id !== ACTIVE_APPLICATION),
    },
  });
  assert(
    !h.data.projects
      .find((project) => project.id === originalProject.id)
      .team.includes(ACTIVE_APPLICATION),
    "the completed intern must actually be removed from the current team",
  );
  const own = h.scope(ACTIVE);
  const retained = own.projects.find(
    (project) => project.id === originalProject.id,
  );
  assert(retained, "assigned-task history retains the project context");
  assert.deepEqual(retained.team, [ACTIVE_APPLICATION]);
  assert.equal(retained.memberCount, originalProject.team.length - 1);
  assert.equal(own.intern.status, "Completed");
  assert.equal(own.tasks.length, 3);
  assert.equal(own.submissions.length, 3);
  assert(own.tasks.every((task) => task.applicationId === ACTIVE_APPLICATION));
  assert(
    own.submissions.every(
      (submission) => submission.applicationId === ACTIVE_APPLICATION,
    ),
  );
  assert(
    own.submissions.every((submission) => submission.status === "Approved"),
  );
  assert(
    !own.projects.some((project) => project.id === "PRJ-002"),
    "unassigned projects must remain hidden",
  );
  assert(
    !h
      .scope(PENDING)
      .projects.some((project) => project.id === originalProject.id),
    "another applicant must not inherit this retained history",
  );
});

test("private notes stay company-only while messages and published feedback are shared with their owner", () => {
  const h = harness();
  h.ok("UPDATE_APPLICATION", {
    id: ACTIVE_APPLICATION,
    patch: {
      notes: [{ id: "private-note", text: "Private reviewer note" }],
      internalNotes: "Company discussion",
    },
  });
  h.ok("SEND_MESSAGE", {
    applicationId: ACTIVE_APPLICATION,
    subject: "Next steps",
    body: "Please review the task.",
  });
  h.ok(
    "SEND_MESSAGE",
    {
      applicationId: ACTIVE_APPLICATION,
      subject: "Re: Next steps",
      body: "Thanks, I will share an update.",
    },
    ACTIVE,
  );
  h.ok("SEND_MESSAGE", {
    applicationId: PENDING_APPLICATION,
    subject: "Another applicant",
    body: "A different conversation.",
  });
  const own = h.scope(ACTIVE);
  assert(!("notes" in own.application));
  assert(!("internalNotes" in own.application));
  assert(!("claimToken" in own.application));
  assert(
    own.messages.some((message) => message.body === "Please review the task."),
  );
  assert(own.messages.some((message) => message.senderRole === "intern"));
  assert(
    own.messages.every(
      (message) => message.applicationId === ACTIVE_APPLICATION,
    ),
  );
  assert(!JSON.stringify(own).includes("Private reviewer note"));
  assert(
    h.data.applications.find((item) => item.id === ACTIVE_APPLICATION).notes
      .length === 1,
  );
  assert(own.tasks.every((task) => task.applicationId === ACTIVE_APPLICATION));
  assert(
    own.submissions.every(
      (submission) => submission.applicationId === ACTIVE_APPLICATION,
    ),
  );
  assert(
    own.projects.every((project) =>
      project.team.every((id) => id === ACTIVE_APPLICATION),
    ),
  );
});

test("notification audiences and read state remain scoped to the signed-in account", () => {
  const h = harness();
  h.ok("SEND_MESSAGE", {
    applicationId: ACTIVE_APPLICATION,
    subject: "Private update",
    body: "For the active intern only.",
  });
  h.ok("ANNOUNCEMENT", {
    audience: "all-interns",
    subject: "Program update",
    message: "For enrolled interns.",
  });
  const own = h.scope(ACTIVE);
  const notice = own.notifications.find(
    (item) =>
      item.title === "A message from Olentra" &&
      item.applicationId === ACTIVE_APPLICATION,
  );
  assert(notice);
  assert(own.notifications.some((item) => item.title === "Program update"));
  assert(
    !h
      .scope(PENDING)
      .notifications.some((item) => item.title === "Program update"),
  );
  assert(!h.scope(PENDING).notifications.some((item) => item.id === notice.id));
  h.ok("MARK_READ", { ids: [notice.id] }, PENDING);
  assert.equal(
    h.scope(ACTIVE).notifications.find((item) => item.id === notice.id).unread,
    true,
  );
  h.ok("MARK_READ", { ids: [notice.id] }, ACTIVE);
  assert.equal(
    h.scope(ACTIVE).notifications.find((item) => item.id === notice.id).unread,
    false,
  );
});

test("sessions expire and password reset revokes existing account sessions", () => {
  const h = harness();
  const time = START;
  const session = {
    accountId: ACTIVE,
    epoch: h.state.epoch,
    accountVersion: 1,
    expiresAt: time + SESSION_DURATION,
  };
  assert.equal(validSession(session, h.data, h.state, time).id, ACTIVE);
  assert.equal(validSession(session, h.data, h.state, session.expiresAt), null);
  assert.equal(
    validSession({ ...session, epoch: "old-epoch" }, h.data, h.state, time),
    null,
  );
  assert.equal(
    validSession({ ...session, accountVersion: 99 }, h.data, h.state, time),
    null,
  );
  const active = h.data.accounts.find((account) => account.id === ACTIVE);
  const request = h.ok(
    "REQUEST_RESET",
    { email: active.email, role: "intern" },
    null,
  );
  h.deny(
    "RESET_PASSWORD",
    { resetId: request.resetId, code: "wrong", passwordHash: HASH },
    null,
  );
  h.ok(
    "RESET_PASSWORD",
    { resetId: request.resetId, code: request.code, passwordHash: HASH },
    null,
  );
  assert.equal(validSession(session, h.data, h.state, time), null);
  assert.equal(
    h.data.accounts.find((account) => account.id === ACTIVE).sessionVersion,
    2,
  );
  h.deny(
    "RESET_PASSWORD",
    { resetId: request.resetId, code: request.code, passwordHash: HASH },
    null,
    /invalid or expired/i,
  );
});

test("expired reset codes do not change passwords or sessions", () => {
  const h = harness();
  const account = h.data.accounts.find((person) => person.id === ACTIVE);
  const request = h.ok(
    "REQUEST_RESET",
    { email: account.email, role: "intern" },
    null,
    "2026-11-10T10:00:00.000Z",
  );
  const result = h.act(
    "RESET_PASSWORD",
    { resetId: request.resetId, code: request.code, passwordHash: HASH },
    null,
    "2026-11-10T10:15:00.000Z",
  );
  assert.equal(result.ok, false);
  assert.equal(
    h.data.accounts.find((person) => person.id === ACTIVE).passwordHash,
    account.passwordHash,
  );
  assert.equal(
    h.data.accounts.find((person) => person.id === ACTIVE).sessionVersion,
    account.sessionVersion,
  );
});

test("legacy migration preserves IDs, edits, private notes, generated records, and account profile", () => {
  const legacy = {
    version: 1,
    applications: {
      [PENDING_APPLICATION]: {
        status: "Shortlisted",
        notes: [{ text: "Private legacy note" }],
      },
    },
    interns: { "INT-2026-0001": { status: "Completed" } },
    projects: { "PRJ-001": { progress: 81 } },
    createdProjects: [
      {
        id: "PRJ-legacy",
        name: "Legacy project",
        description: "Existing locally created work",
        team: [ACTIVE_APPLICATION],
        progress: 20,
      },
    ],
    certificates: [
      {
        id: "CERT-legacy",
        internId: "INT-2026-0001",
        applicationId: ACTIVE_APPLICATION,
        recipient: "Ananya Singh",
        program: "Tech Explorer",
        programId: "explorer",
        issuedOn: "2026-11-10",
        status: "Issued",
      },
    ],
    settings: {
      maxStipend: 15000,
      profile: { name: "Updated Admin", email: "updated-admin@example.com" },
    },
    activity: [
      { id: "ACT-legacy", title: "Legacy update", detail: "Company-only" },
    ],
    readActivity: ["ACT-legacy"],
  };
  const original = structuredClone(legacy);
  const state = migrateLegacy(legacy);
  assert.equal(state.version, 2);
  assert.equal(state.epoch, "migrated-v2");
  const data = materialize(base, fixtures, state);
  assert.equal(
    data.applications.find(
      (application) => application.id === PENDING_APPLICATION,
    ).status,
    "Shortlisted",
  );
  assert.equal(
    data.interns.find((intern) => intern.id === "INT-2026-0001").status,
    "Completed",
  );
  assert.equal(
    data.projects.find((project) => project.id === "PRJ-001").progress,
    81,
  );
  assert(data.projects.some((project) => project.id === "PRJ-legacy"));
  assert(
    data.certificates.some((certificate) => certificate.id === "CERT-legacy"),
  );
  assert.equal(data.settings.maxStipend, 15000);
  assert.equal(
    data.accounts.find((account) => account.id === COMPANY).name,
    "Updated Admin",
  );
  assert(
    !JSON.stringify(
      scopedRecords(
        data,
        state,
        data.accounts.find((account) => account.id === PENDING),
      ),
    ).includes("Private legacy note"),
  );
  assert.deepEqual(legacy, original);
  assert.deepEqual(normalizeStore(JSON.parse(JSON.stringify(state))), state);
});

test("demo reset clears workflow state and invalidates sessions through a new epoch", () => {
  const h = harness();
  const { account } = newApplicant(h);
  const session = {
    accountId: COMPANY,
    epoch: h.state.epoch,
    accountVersion: 1,
    expiresAt: START + SESSION_DURATION,
  };
  assert(validSession(session, h.data, h.state, START));
  h.ok("RESET_DEMO");
  assert.equal(h.state.createdApplications.length, 0);
  assert.equal(h.state.createdAccounts.length, 0);
  assert.equal(h.state.messages.length, 0);
  assert.equal(h.data.applications.length, base.applications.length);
  assert(!h.data.accounts.some((person) => person.id === account.id));
  assert.equal(validSession(session, h.data, h.state, START), null);
});

test("store normalization tolerates missing and incorrectly typed collections", () => {
  assert.deepEqual(normalizeStore(null), emptyStore());
  assert.deepEqual(
    normalizeStore({ version: 1, applications: {} }),
    emptyStore(),
  );
  const value = normalizeStore({
    version: 2,
    revision: "invalid",
    applications: [],
    messages: {},
    offers: [],
    epoch: "test-epoch",
  });
  assert.equal(value.revision, 0);
  assert.deepEqual(value.applications, {});
  assert.deepEqual(value.messages, []);
  assert.deepEqual(value.offers, {});
  assert.equal(value.epoch, "test-epoch");
});
