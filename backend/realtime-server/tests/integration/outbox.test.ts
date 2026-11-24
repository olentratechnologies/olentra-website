import { createInternshipMailer } from "../../src/infrastructure/email/mailer";
import { afterAll, beforeAll, expect, test } from "bun:test";
import { createHash, randomUUID } from "node:crypto";
import { internshipTestMongoUri } from "./config";
import { connectInternDatabase, createInternshipDomain } from "./domain";
import { OUTBOX_MAX_ATTEMPTS, createOutbox, type OutboxRow } from "../../src/modules/outbox/outbox";

const uri = internshipTestMongoUri();
if (!uri) throw new Error("Set INTERNSHIP_TEST_MONGODB_URI for isolated internship integration tests.");
const prefix = `test_intern_outbox_${randomUUID().replaceAll("-", "")}_`;
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
let connection: Awaited<ReturnType<typeof connectInternDatabase>>;
let domain: ReturnType<typeof createInternshipDomain>;
const sent: Array<{ type: string; to: string }> = [];

beforeAll(async () => {
  connection = await connectInternDatabase(uri!);
  domain = createInternshipDomain({ ...connection, prefix });
  domain.setHooks({
    async sendApplicationConfirmation(to) { sent.push({ type: "confirmation", to }); },
    async sendMagicLink(to) { sent.push({ type: "magic-link", to }); },
  });
  await domain.initialize();
  await domain.collection("programs").updateOne({ _id: "software-engineer" }, { $set: { enabled: true, fee: 0, stipend: 0 } });
  await domain.collection("settings").updateOne({ _id: "program" }, { $set: { programEnabled: true } });
}, 20000);
afterAll(async () => {
  if (!connection) return;
  const names = await connection.db.listCollections({}, { nameOnly: true }).toArray();
  for (const { name } of names) if (name.startsWith(prefix)) await connection.db.collection(name).drop();
  await connection.client.close();
}, 20000);

async function apply(email: string, key: string) {
  const fileId = `FILE-${randomUUID()}`, fileToken = randomUUID();
  await domain.collection("files").insertOne({ _id: fileId, kind: "resume", status: "ready", accessTokenHash: digest(fileToken) });
  return domain.execute("application.submit", { name: "Outbox Candidate", email, linkedin: "https://www.linkedin.com/in/outbox-candidate", programId: "software-engineer", schedule: "part_time", resumeAttachmentId: fileId, resumeAccessToken: fileToken }, null, key);
}
const rowsFor = (to: string) => domain.collection("outbox").find({ "payload.to": to }).toArray();

test("an application queues exactly one confirmation, sent only by the worker", async () => {
  const email = `outbox-${randomUUID()}@example.test`;
  const key = `outbox-apply-${randomUUID().slice(0, 8)}`;
  await apply(email, key);
  await apply(email, key).catch(() => undefined); // an idempotent retry must not queue again
  expect(await rowsFor(email)).toHaveLength(1);
  expect(sent.filter(e => e.to === email)).toHaveLength(0);
  await domain.processOutbox();
  expect(sent.filter(e => e.to === email)).toEqual([{ type: "confirmation", to: email }]);
  expect((await rowsFor(email))[0]).toMatchObject({ status: "sent", attempts: 1 });
  await domain.processOutbox();
  expect(sent.filter(e => e.to === email)).toHaveLength(1);
});

test("a repeat application is rejected without queuing another email", async () => {
  const email = `outbox-dup-${randomUUID()}@example.test`;
  await apply(email, `outbox-first-${randomUUID().slice(0, 8)}`);
  await domain.collection("applications").updateOne({ email }, { $set: { status: "Selected" } });
  await expect(apply(email.toUpperCase(), `outbox-again-${randomUUID().slice(0, 8)}`)).rejects.toMatchObject({ code: "ALREADY_APPLIED" });
  expect(await domain.collection("applications").countDocuments({ email })).toBe(1);
  const rows = await rowsFor(email);
  expect(rows.map(r => r.type)).toEqual(["applicationConfirmation"]);
  expect(rows.map(r => r.payload.applicationId).every(id => id === rows[0].payload.applicationId)).toBe(true);
  await domain.processOutbox();
  expect(sent.filter(e => e.to === email)).toEqual([
    { type: "confirmation", to: email },
  ]);
});

test("failed sends are retried with backoff and marked failed after the last attempt", async () => {
  let clock = Date.now();
  const outbox = createOutbox(connection.db.collection<OutboxRow>(`${prefix}outbox_retry`), () => clock);
  await outbox.initialize();
  await outbox.enqueue("magicLink", { to: "retry@example.test", name: "R", applicationId: "OL-1" });
  let calls = 0;
  const failing = async () => { calls++; throw new Error("provider down"); };
  for (let attempt = 1; attempt <= OUTBOX_MAX_ATTEMPTS; attempt++) {
    expect(await outbox.process(failing)).toBe(1);
    expect(await outbox.process(failing)).toBe(0); // not due again until the backoff passes
    clock += 60 * 60_000;
  }
  expect(calls).toBe(OUTBOX_MAX_ATTEMPTS);
  const [row] = await connection.db.collection<OutboxRow>(`${prefix}outbox_retry`).find().toArray();
  expect(row).toMatchObject({ status: "failed", attempts: OUTBOX_MAX_ATTEMPTS, lastError: "provider down" });
});

test("a second application with the same LinkedIn profile is flagged on both records", async () => {
  const first = `dup-a-${randomUUID()}@example.test`, second = `dup-b-${randomUUID()}@example.test`;
  const fileFor = async () => { const fileId = `FILE-${randomUUID()}`, fileToken = randomUUID(); await domain.collection("files").insertOne({ _id: fileId, kind: "resume", status: "ready", accessTokenHash: digest(fileToken) }); return { resumeAttachmentId: fileId, resumeAccessToken: fileToken }; };
  await domain.execute("application.submit", { name: "Dup One", email: first, linkedin: "https://www.linkedin.com/in/Same-Person/", programId: "software-engineer", schedule: "part_time", ...(await fileFor()) }, null, `dup-one-${randomUUID().slice(0, 8)}`);
  await domain.execute("application.submit", { name: "Dup Two", email: second, linkedin: "https://linkedin.com/in/same-person?utm=x", programId: "software-engineer", schedule: "part_time", ...(await fileFor()) }, null, `dup-two-${randomUUID().slice(0, 8)}`);
  const a = await domain.collection("applications").findOne({ email: first }), b = await domain.collection("applications").findOne({ email: second });
  expect(b?.possibleDuplicates).toEqual([a?._id]);
  expect(a?.possibleDuplicates).toEqual([b?._id]);
});

test("new task mail uses current assignment details, retries delivery, and suppresses removed assignments", async () => {
  const applicationId = "mail-intern", projectId = "mail-project";
  const staff = { id: "task-admin", role: "company", staffRole: "admin", name: "Admin", email: "admin@example.test", applicationId: null, sessionVersion: 1 } as const;
  await domain.collection("accounts").insertOne({ ...staff, _id: staff.id });
  const to = "task-intern@example.test";
  await domain.collection("applications").insertOne({ _id: applicationId, name: "Test Intern", email: to, status: "Joined" });
  await domain.collection("interns").insertOne({ _id: "mail-internship", applicationId, status: "Active" });
  await domain.collection("projects").insertOne({ _id: projectId, team: [applicationId], name: "Portal project" });
  const assignment = { applicationId, projectId, title: "Review navigation", description: "Initial instructions", required: true, dueOn: "2026-12-01" };
  const assign = (input = assignment, key = randomUUID()) => domain.execute("task.create", input, staff, key);
  const queue = domain.collection("outbox");
  const filter = { type: "taskAssigned", "payload.applicationId": applicationId };
  await expect(assign({ ...assignment, applicationId: "other" })).rejects.toThrow();
  expect(await queue.countDocuments({ type: "taskAssigned" })).toBe(0);
  const key = randomUUID();
  const task = await assign(assignment, key);
  await assign(assignment, key);
  expect(await queue.countDocuments(filter)).toBe(1);

  const messages: any[] = [];
  const transport = Bun.serve({
    hostname: "127.0.0.1", port: 0,
    async fetch(request) {
      messages.push(await request.json());
      return messages.length === 1 ? new Response(null, { status: 503 }) : Response.json({ success: true, id: "test-mail" });
    },
  });
  try {
    const mailer = createInternshipMailer("test-token", transport.url.origin);
    domain.setHooks({ async sendNotice(notice) {
      const result = await mailer.sendNotice({ ...notice, ctaUrl: "https://example.test" + notice.ctaPath });
      if (!result.ok) throw new Error(result.error);
    } });
    await domain.processOutbox();
    expect(await queue.findOne(filter)).toMatchObject({ status: "pending", attempts: 1 });
    await domain.execute("task.update", { id: task.id, patch: { description: "Review <mobile> layouts", dueOn: "2026-12-05", required: false } }, staff, randomUUID());
    await queue.updateOne(filter, { $set: { nextAttemptAt: new Date(0) } });
    await domain.processOutbox();
    expect(await queue.countDocuments(filter)).toBe(1);
    expect(await queue.findOne(filter)).toMatchObject({ status: "sent", attempts: 2 });
    const mail = messages[1];
    expect(mail.to).toEqual([to]);
    expect(mail.subject).toBe("New task assigned: Review navigation");
    for (const text of ["Hi Test Intern", "Portal project", "2026-12-05", "Required for internship completion: No", "Open project", "https://example.test/intern/portal/projects/mail-project"]) {
      expect(mail.text).toContain(text);
      expect(mail.html).toContain(text);
    }
    expect(mail.html).toContain("Review &lt;mobile&gt; layouts");
    expect(mail.text).toContain("Review <mobile> layouts");
    const removed = await assign();
    await domain.execute("task.delete", { id: removed.id }, staff, randomUUID());
    await domain.processOutbox();
    expect(await queue.findOne({ ...filter, "payload.taskId": removed.id })).toMatchObject({ status: "superseded" });
    expect(messages).toHaveLength(2);
  } finally {
    transport.stop(true);
  }
});

test("task reminders respect the assignment clock, current status, permissions and delivery retries", async () => {
  const staff = { id: "reminder-admin", role: "company", staffRole: "admin", name: "Admin", email: "reminder-admin@example.test", applicationId: null, sessionVersion: 1 } as const;
  const applicationId = "reminder-intern", projectId = "reminder-project", to = "reminder@example.test";
  const mentor = { ...staff, id: "other-mentor", email: "reminder-mentor@example.test", staffRole: "mentor", permissions: ["tasks.manage", "tasks.read"] };
  for (const actor of [staff, mentor]) await domain.collection("accounts").insertOne({ ...actor, _id: actor.id });
  await domain.collection("applications").insertOne({ _id: applicationId, email: to, name: "Reminder Intern", status: "Joined" });
  await domain.collection("interns").insertOne({ _id: "reminder-internship", applicationId, status: "Active" });
  await domain.collection("projects").insertOne({ _id: projectId, name: "Reminder project", team: [applicationId] });
  const call = (method: string, params: Record<string, unknown>, key = randomUUID()) => domain.execute(method, params, staff, key);
  const assignment = { applicationId, projectId, title: "Review layout", description: "Check mobile", dueOn: "2030-01-12" };
  const task = await call("task.create", assignment);
  const tasks = domain.collection("tasks"), queue = domain.collection("outbox");
  const filter = { type: "taskReminder", "payload.taskId": task.id };
  const patch = (reminderAfterDays: number | null) => call("task.update", { id: task.id, patch: { reminderAfterDays } });
  const at = (hours: number) => new Date(Date.parse(task.createdOn) + hours * 3600000);
  const mails: any[] = [];
  let fail = false;
  const transport = Bun.serve({ hostname: "127.0.0.1", port: 0, async fetch(request) {
    if (fail) return new Response(null, { status: 503 });
    mails.push(await request.json());
    return Response.json({ success: true, id: "mail" });
  } });
  try {
    const mailer = createInternshipMailer("test", transport.url.origin);
    domain.setHooks({ async sendNotice(notice) {
      const result = await mailer.sendNotice({ ...notice, ctaUrl: "https://example.test" + notice.ctaPath });
      if (!result.ok) throw new Error(result.error);
    } });
    const reminders = () => mails.filter(m => m.subject === "Task reminder: Review layout" && m.to.includes(to));
    expect(task.reminderAfterDays).toBe(1);
    await expect(patch(31)).rejects.toThrow();
    await domain.runReminders(at(23.99));
    expect(await queue.countDocuments(filter)).toBe(0);
    await domain.runReminders(at(24));
    expect(await queue.countDocuments(filter)).toBe(1);
    await patch(null);
    await domain.processOutbox();
    expect(reminders()).toHaveLength(0);
    await patch(2);
    await domain.runReminders(at(47.99));
    expect(await queue.countDocuments({ ...filter, status: "pending" })).toBe(0);
    await Promise.all([domain.runReminders(at(48)), domain.runReminders(at(48))]);
    expect(await queue.countDocuments({ ...filter, status: "pending" })).toBe(1);
    fail = true;
    await domain.processOutbox();
    expect(await queue.findOne({ ...filter, status: "pending" })).toMatchObject({ attempts: 1 });
    fail = false;
    await queue.updateOne({ ...filter, status: "pending" }, { $set: { nextAttemptAt: new Date(0) } });
    await domain.processOutbox();
    expect(reminders()).toHaveLength(1);
    expect(reminders()[0].text).toContain("Start task");
    expect(reminders()[0].html).toContain("https://example.test/intern/portal/projects/reminder-project");
    await patch(1);
    await domain.runReminders(at(72));
    expect(await queue.countDocuments(filter)).toBe(2); // one cancelled, one delivered
    const params = { taskId: task.id }, key = randomUUID();
    await expect(domain.execute("task.remind", params, mentor, randomUUID())).rejects.toThrow();
    await expect(domain.execute("task.remind", params, { ...mentor, permissions: ["tasks.read"] }, randomUUID())).rejects.toThrow();
    await call("task.remind", params, key);
    await call("task.remind", params, key);
    await call("task.remind", params);
    expect(await queue.countDocuments({ ...filter, "payload.mode": "manual" })).toBe(1);
    await tasks.updateOne({ _id: task.id }, { $set: { status: "In progress" } });
    await domain.processOutbox();
    expect(reminders()[1].text).toContain("Continue your task");
    await tasks.updateOne({ _id: task.id }, { $set: { status: "Changes requested" }, $unset: { lastManualReminderAt: "" } });
    await call("task.remind", params);
    await domain.processOutbox();
    expect(reminders()[2].text).toContain("resubmit");
    for (const status of ["Under review", "Approved"]) {
      await tasks.updateOne({ _id: task.id }, { $set: { status } });
      await expect(call("task.remind", params)).rejects.toThrow();
    }
    const pending = await call("task.create", assignment);
    await domain.runReminders(at(72));
    await tasks.updateOne({ _id: pending.id }, { $set: { status: "In progress" } });
    await domain.processOutbox();
    expect(reminders()).toHaveLength(3);
    await call("task.remind", { taskId: pending.id });
    await call("task.delete", { id: pending.id });
    await domain.processOutbox();
    expect(reminders()).toHaveLength(3);
    await tasks.insertOne({ _id: "legacy-reminder", ...assignment, status: "Todo", createdOn: task.createdOn });
    await domain.runReminders(at(200));
    expect(await queue.countDocuments({ type: "taskReminder", "payload.taskId": "legacy-reminder" })).toBe(0);
  } finally {
    transport.stop(true);
  }
});
