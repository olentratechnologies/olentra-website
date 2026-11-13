import { afterAll, beforeAll, expect, test } from "bun:test";
import { createHash, randomUUID } from "node:crypto";
import { GridFSBucket } from "mongodb";
import { internshipTestMongoUri } from "./config";
import { connectInternDatabase, createInternshipDomain, type Principal } from "./domain";
import { createInternshipServer } from "./server";

const uri = internshipTestMongoUri();
if (!uri) throw new Error("Set INTERNSHIP_TEST_MONGODB_URI (or deprecated INTERN_TEST_MONGODB_URI) for isolated internship tests.");
const prefix = `test_rbac_network_${randomUUID().replaceAll("-", "")}_`;
let connection: Awaited<ReturnType<typeof connectInternDatabase>>;
let domain: ReturnType<typeof createInternshipDomain>;
let instance: Awaited<ReturnType<typeof createInternshipServer>>;
let admin: Principal;
let base: string;
const clients: WebSocket[] = [];
const key = () => randomUUID().replaceAll("-", "");
const password = "NetworkTestingPassword2026!";

beforeAll(async () => {
  connection = await connectInternDatabase(uri!);
  domain = createInternshipDomain({ ...connection, prefix });
  instance = await createInternshipServer({ domain, secret: "network-test-secret-at-least-32-bytes", port: 0 });
  base = `http://127.0.0.1:${instance.server.port}`;
  admin = await domain.createTestStaff("admin@example.test", password);
  for (const role of ["viewer", "recruiter", "mentor", "manager"]) await domain.execute("staff.create", { name: role, email: `${role}@example.test`, password, staffRole: role }, admin, key());
  await domain.collection("applications").insertMany([
    { _id: "app-review", name: "Private Applicant", email: "private@example.test", program: "Tech Explorer", programId: "explorer", status: "Applied", notes: [{ text: "private note" }], version: 1 },
    { _id: "app-intern", name: "Private Intern", email: "intern@example.test", program: "Tech Explorer", programId: "explorer", status: "Joined", notes: [], version: 1 },
  ]);
  // Mentors only see interns assigned to them, so the test mentor mentors this intern.
  const mentorAccount = await domain.collection("accounts").findOne({ email: "mentor@example.test" });
  await domain.collection("interns").insertOne({ _id: "intern-1", applicationId: "app-intern", status: "Active", revision: 1, mentorId: mentorAccount!._id, mentorName: "mentor" });
  await domain.collection("projects").insertOne({ _id: "project-1", name: "Test Project", description: "Private description", team: ["app-intern"], status: "In progress", progress: 10, program: "Tech Explorer" });
  await domain.collection("tasks").insertOne({ _id: "task-1", projectId: "project-1", applicationId: "app-intern", title: "Work", status: "Under review", submissionVersion: 1, required: true });
  await domain.collection("submissions").insertOne({ _id: "submission-1", taskId: "task-1", applicationId: "app-intern", version: 1, status: "Submitted", notes: "Private submitted work" });
  await domain.collection("messages").insertMany([
    { _id: "message-app", applicationId: "app-review", subject: "Applicant private", body: "private applicant conversation", senderRole: "intern", createdOn: new Date().toISOString() },
    { _id: "message-intern", applicationId: "app-intern", subject: "Intern private", body: "private intern conversation", senderRole: "intern", createdOn: new Date().toISOString() },
  ]);
  await domain.collection("notifications").insertOne({ _id: "notification-private", recipientRole: "company", applicationId: "app-review", title: "Private Applicant", body: "private notification", createdOn: new Date().toISOString() });
  const bucket = new GridFSBucket(connection.db, { bucketName: prefix + "uploads" });
  for (const [name, kind, owner] of [["resume.pdf", "resume", "app-review"], ["work.txt", "work", "app-intern"]]) {
    const upload = bucket.openUploadStream(name!);
    upload.end(Buffer.from("test file"));
    await new Promise<void>((resolve, reject) => { upload.once("finish", resolve); upload.once("error", reject); });
    await domain.collection("files").insertOne({ _id: name!, gridId: upload.id, kind, status: "ready", name, type: "text/plain", size: 9, applicationId: owner, accessTokenHash: createHash("sha256").update("known-token").digest("hex") });
  }
}, 30000);

afterAll(async () => {
  for (const ws of clients) ws.terminate();
  await instance?.stop();
  if (connection) {
    for (const { name } of await connection.db.listCollections({}, { nameOnly: true }).toArray()) if (name.startsWith(prefix)) await connection.db.collection(name).drop();
    await connection.client.close();
  }
}, 30000);

async function socket(role: string) {
  const loggedIn = await instance.auth.login(`${role}@example.test`, password);
  const ws = new WebSocket(base.replace("http:", "ws:") + "/ws/intern"); clients.push(ws);
  const pending = new Map<string, { resolve: (value: any) => void; reject: (error: Error) => void }>();
  ws.onmessage = event => {
    const frame = JSON.parse(String(event.data));
    if (frame.type !== "response") return;
    const handler = pending.get(frame.id); if (!handler) return;
    pending.delete(frame.id); frame.ok ? handler.resolve(frame.data) : handler.reject(new Error(frame.error.code));
  };
  await new Promise<void>((resolve, reject) => { ws.onopen = () => resolve(); ws.onerror = () => reject(new Error("WebSocket failed")); });
  const request = (method: string, params: Record<string, unknown> = {}, write = false) => new Promise<any>((resolve, reject) => {
    const id = randomUUID(), timer = setTimeout(() => { pending.delete(id); reject(new Error("Request timed out")); }, 10000);
    pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } });
    ws.send(JSON.stringify({ type: "request", id, method, params, ...(write ? { idempotencyKey: key() } : {}) }));
  });
  await request("auth.authenticate", { token: loggedIn.token });
  return { ws, request, token: loggedIn.token, account: loggedIn.account };
}

test("role permissions are enforced over WebSockets, snapshots and files", async () => {
  const viewer = await socket("viewer"), recruiter = await socket("recruiter"), mentor = await socket("mentor"), manager = await socket("manager");
  const snapshot = await viewer.request("intern.snapshot");
  const contents = JSON.stringify(snapshot);
  expect(contents).not.toContain("private@example.test");
  expect(contents).not.toContain("private intern conversation");
  expect(contents).not.toContain("private notification");
  expect(snapshot.data.applications).toEqual([]); expect(snapshot.data.messages).toEqual([]); expect(snapshot.data.notifications).toEqual([]);
  expect(snapshot.data.projects[0].team).toBeUndefined();
  const summary = await viewer.request("project.list", {}); expect(summary.items[0].team).toBeUndefined(); expect(summary.items[0].members).toBeUndefined();
  for (const method of ["application.list", "intern.list", "task.list", "submission.list", "message.list", "staff.list", "role.list"]) await expect(viewer.request(method, { applicationId: "app-review" })).rejects.toThrow("FORBIDDEN");
  expect((await recruiter.request("application.get", { id: "app-review" })).name).toBe("Private Applicant");
  expect((await recruiter.request("message.list", { applicationId: "app-review" })).items[0].subject).toBe("Applicant private");
  await expect(recruiter.request("message.list", { applicationId: "app-intern" })).rejects.toThrow("FORBIDDEN");
  expect((await mentor.request("message.list", { applicationId: "app-intern" })).items[0].subject).toBe("Intern private");
  await expect(mentor.request("message.list", { applicationId: "app-review" })).rejects.toThrow("FORBIDDEN");
  expect((await recruiter.request("notification.list")).items[0].title).toBe("Private Applicant");
  expect((await mentor.request("notification.list")).items).toEqual([]);
  await expect(recruiter.request("application.update", { id: "app-review", status: "Selected", expectedVersion: 1 }, true)).rejects.toThrow("FORBIDDEN");
  expect((await recruiter.request("application.update", { id: "app-review", status: "Under Review", expectedVersion: 1 }, true)).status).toBe("Under Review");
  await expect(mentor.request("submission.review", { id: "submission-1", decision: "Approved" }, true)).rejects.toThrow("FORBIDDEN");
  expect((await mentor.request("submission.review", { id: "submission-1", decision: "Changes requested", feedback: "Please revise" }, true)).status).toBe("Changes requested");
  await expect(manager.request("certificate.generate", { internIds: ["intern-1"] }, true)).rejects.toThrow("FORBIDDEN");
  const download = (name: string, token: string) => fetch(base + "/intern/files/" + name, { headers: { authorization: `Bearer ${token}` } });
  expect((await download("resume.pdf", viewer.token)).status).toBe(403);
  expect((await download("resume.pdf", mentor.token)).status).toBe(403);
  expect((await download("resume.pdf", recruiter.token)).status).toBe(200);
  expect((await download("work.txt", mentor.token)).status).toBe(200);
  expect((await download("work.txt", recruiter.token)).status).toBe(403);
  expect((await fetch(base + "/intern/files/resume.pdf", { headers: { "x-file-token": "known-token" } })).status).toBe(403);
  expect((await fetch(base + "/intern/files/resume.pdf", { headers: { "x-file-token": "known-token", authorization: `Bearer ${viewer.token}` } })).status).toBe(403);
}, 60000);

test("communication events reach only staff with the matching conversation scope", async () => {
  const recruiter = await socket("recruiter"), mentor = await socket("mentor");
  // Let events committed by the previous test drain before observing this pair.
  await new Promise(resolve => setTimeout(resolve, 500));
  const received = { recruiter: 0, mentor: 0 };
  for (const [name, client] of [["recruiter", recruiter], ["mentor", mentor]] as const) client.ws.addEventListener("message", event => {
    const frame = JSON.parse(String(event.data)); if (frame.type === "event" && frame.event === "intern.changed") received[name]++;
  });
  await recruiter.request("message.send", { applicationId: "app-review", subject: "Applicant message", body: "Testing applicant scope" }, true);
  await new Promise(resolve => setTimeout(resolve, 1200));
  expect(received.recruiter).toBeGreaterThan(0); expect(received.mentor).toBe(0);
  received.recruiter = 0; received.mentor = 0;
  await mentor.request("message.send", { applicationId: "app-intern", subject: "Intern message", body: "Testing intern scope" }, true);
  await new Promise(resolve => setTimeout(resolve, 1200));
  expect(received.mentor).toBeGreaterThan(0); expect(received.recruiter).toBe(0);
  recruiter.ws.terminate(); mentor.ws.terminate();
}, 30000);

test("an in-flight read is discarded when staff access is revoked", async () => {
  const viewer = await socket("viewer");
  const original = domain.execute;
  let release!: () => void, entered!: () => void;
  const blocked = new Promise<void>(resolve => { release = resolve; });
  const started = new Promise<void>(resolve => { entered = resolve; });
  domain.execute = async (method, params, actor, requestKey) => {
    const result = await original(method, params, actor, requestKey);
    if (method === "intern.snapshot" && actor?.id === viewer.account.id) { entered(); await blocked; }
    return result;
  };
  try {
    const result = viewer.request("intern.snapshot");
    await started;
    // No change event is emitted here: the test verifies the response fence itself.
    await domain.collection("accounts").updateOne({ _id: viewer.account.id }, { $inc: { sessionVersion: 1 } });
    release();
    await expect(result).rejects.toThrow("UNAUTHENTICATED");
  } finally { release(); domain.execute = original; viewer.ws.terminate(); }
}, 30000);

test("role changes invalidate existing access and cannot grant admin-only permissions", async () => {
  const viewer = await socket("viewer");
  await expect(viewer.request("staff.list")).rejects.toThrow("FORBIDDEN");
  await expect(domain.execute("role.create", { name: "Unsafe role", permissions: ["staff.manage"] }, admin, key())).rejects.toThrow();
  const closed = new Promise<void>((resolve, reject) => { const timer = setTimeout(() => reject(new Error("Revoked socket did not close")), 10000); viewer.ws.addEventListener("close", () => { clearTimeout(timer); resolve(); }, { once: true }); });
  await domain.execute("staff.update", { id: viewer.account.id, staffRole: "recruiter" }, admin, key());
  await closed;
  await expect(instance.auth.verify(viewer.token)).rejects.toThrow();
  const changed = await socket("viewer");
  expect(changed.account.staffRole).toBe("recruiter");
  expect((await changed.request("application.get", { id: "app-review" })).name).toBe("Private Applicant");
}, 30000);

test("concurrent full-path changes retain an active admin", async () => {
  const second = await domain.execute("staff.create", { name: "Second admin", email: "second@example.test", password, staffRole: "admin" }, admin, key());
  const secondAdmin = await domain.account(second.id);
  const results = await Promise.allSettled([
    domain.execute("staff.update", { id: admin.id, staffRole: "viewer" }, admin, key()),
    domain.execute("staff.update", { id: second.id, staffRole: "viewer" }, secondAdmin, key()),
  ]);
  expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
  expect(results.filter(result => result.status === "rejected")).toHaveLength(1);
  expect(await domain.collection("accounts").countDocuments({ role: "company", staffRole: "admin", disabled: { $ne: true } })).toBe(1);
}, 30000);
