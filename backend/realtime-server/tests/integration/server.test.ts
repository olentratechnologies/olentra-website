import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { MongoNetworkError } from "mongodb";
import { internshipTestMongoUri } from "./config";
import { connectInternDatabase, createInternshipDomain } from "./domain";
import { createInternshipServer } from "./server";

const uri = internshipTestMongoUri();
if (!uri) throw new Error("Set INTERNSHIP_TEST_MONGODB_URI (or deprecated INTERN_TEST_MONGODB_URI) for isolated internship integration tests.");
const prefix = `test_intern_server_${randomUUID().replaceAll("-", "")}_`;
let connection: Awaited<ReturnType<typeof connectInternDatabase>>;
let domain: ReturnType<typeof createInternshipDomain>;
let instance: Awaited<ReturnType<typeof createInternshipServer>>;
let base = "";
const clients: WebSocket[] = [];
const context = "testcontext1234567890";
const origin = "http://localhost:3000";

beforeAll(async () => {
  connection = await connectInternDatabase(uri!);
  domain = createInternshipDomain({ ...connection, prefix });
  instance = await createInternshipServer({ domain, secret: "testing-secret-with-at-least-32-bytes", port: 0, allowedOrigins: [origin] });
  base = `http://127.0.0.1:${instance.server.port}`;
  await domain.createTestStaff("staff@example.test", "StaffPassword2026!");
}, 20000);
afterAll(async () => {
  for (const socket of clients) socket.terminate();
  await instance?.stop();
  if (connection) {
    const names = await connection.db.listCollections({}, { nameOnly: true }).toArray();
    for (const { name } of names) if (name.startsWith(prefix)) await connection.db.collection(name).drop();
    await connection.client.close();
  }
}, 20000);

async function login(email: string, password: string) {
  const response = await fetch(base + "/intern/auth/login", { method: "POST", headers: { origin, "content-type": "application/json", "x-intern-context": context }, body: JSON.stringify({ email, password }) });
  const body = await response.json() as any;
  return { response, body, cookie: response.headers.get("set-cookie")?.split(";")[0] || "" };
}
async function socket(url = base) {
  const ws = new WebSocket(url.replace("http:", "ws:") + "/ws/intern"); clients.push(ws);
  const pending = new Map<string, { resolve: (v: any) => void; reject: (v: Error) => void }>();
  let onEvent: (() => void) | null = null;
  ws.onmessage = event => { const frame = JSON.parse(String(event.data)); if (frame.type === "event" && frame.event === "intern.changed") { onEvent?.(); onEvent = null; } if (frame.type === "response") { const p = pending.get(frame.id); if (p) { pending.delete(frame.id); frame.ok ? p.resolve(frame.data) : p.reject(new Error(frame.error.code + ":" + frame.error.message)); } } };
  await new Promise<void>((resolve, reject) => { const timeout = setTimeout(() => reject(new Error("Socket connection timeout")), 5000); ws.onopen = () => { clearTimeout(timeout); resolve(); }; ws.onerror = () => { clearTimeout(timeout); reject(new Error("Socket connection failed")); }; });
  return { ws, nextEvent() { return new Promise<void>((resolve, reject) => { const timer = setTimeout(() => { onEvent = null; reject(new Error("Event timeout")); }, 15000); onEvent = () => { clearTimeout(timer); resolve(); }; }); }, request(method: string, params: Record<string, unknown> = {}, key?: string) { const id = randomUUID(); return new Promise<any>((resolve, reject) => { const timer = setTimeout(() => { pending.delete(id); reject(new Error("Request timeout")); }, 20000); pending.set(id, { resolve: v => { clearTimeout(timer); resolve(v); }, reject: e => { clearTimeout(timer); reject(e); } }); ws.send(JSON.stringify({ type: "request", id, method, params, idempotencyKey: key })); }); } };
}

test("one unified process serves presence and internship WebSockets concurrently", async () => {
  const presence = new WebSocket(base.replace("http:", "ws:") + "/ws?role=dashboard");
  clients.push(presence);
  const snapshot = new Promise<any>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Presence snapshot timeout")), 5000);
    presence.onmessage = event => { clearTimeout(timer); resolve(JSON.parse(String(event.data))); };
    presence.onerror = () => { clearTimeout(timer); reject(new Error("Presence WebSocket failed")); };
  });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Presence connection timeout")), 5000);
    presence.onopen = () => { clearTimeout(timer); resolve(); };
    presence.onerror = () => { clearTimeout(timer); reject(new Error("Presence WebSocket failed")); };
  });
  expect(await snapshot).toMatchObject({ type: "presence", activeVisitors: 0, totalConnections: 1 });
  const internship = await socket();
  expect((await internship.request("intern.snapshot")).account).toBeNull();
  internship.ws.close(); presence.close();
}, 20000);

test("login, streaming resume, application, registration, live status and refresh", async () => {
  const bad = await login("staff@example.test", "incorrect"); expect(bad.response.status).toBe(401);
  const staff = await login("staff@example.test", "StaffPassword2026!"); expect(staff.response.status).toBe(200); expect(staff.cookie).toContain("intern_refresh_"); expect(staff.response.headers.get("set-cookie")).toContain("HttpOnly");
  const admin = await socket(); await admin.request("auth.authenticate", { token: staff.body.data.token });
  await expect(admin.request("auth.authenticate", { token: "invalid-token" })).rejects.toThrow("UNAUTHENTICATED");
  expect((await admin.request("intern.snapshot")).account).toBeNull();
  await admin.request("auth.authenticate", { token: staff.body.data.token });
  await admin.request("program.configure", { programId: "explorer", fee: 0, stipend: 0, enabled: true }, "program-config-test-0001");
  await admin.request("settings.update", { patch: { programEnabled: true } }, "program-enable-test-0001");
  const file = await fetch(base + "/intern/files", { method: "POST", headers: { origin, "content-type": "application/pdf", "x-file-name": "resume.pdf", "x-file-kind": "resume" }, body: "%PDF-1.4 test resume" });
  expect(file.status).toBe(200); const uploaded = (await file.json() as any).data;
  const applicant = await socket();
  const application = await applicant.request("application.submit", { name: "Test Applicant", email: "applicant@example.test", linkedin: "https://www.linkedin.com/in/test-candidate", programId: "explorer", resumeAttachmentId: uploaded.id, resumeAccessToken: uploaded.accessToken }, "submit-application-test-01");
  const registered = await applicant.request("account.register", { applicationId: application.id, claimToken: application.claimToken, password: "ApplicantPassword2026!" }, "register-applicant-test-01");
  expect(registered.role).toBe("intern");
  const intern = await login("applicant@example.test", "ApplicantPassword2026!"); expect(intern.response.status).toBe(200);
  await applicant.request("auth.authenticate", { token: intern.body.data.token });
  const changed = await admin.request("application.update", { id: application.id, status: "Under Review", expectedVersion: 1 }, "update-application-test-01");
  expect(changed.status).toBe("Under Review");
  const mine = await applicant.request("application.get", { id: application.id }); expect(mine.status).toBe("Under Review"); expect(mine.claimHash).toBeUndefined(); expect(mine.notes).toBeUndefined();
  const resume = await fetch(base + "/intern/files/" + uploaded.id, { headers: { origin, authorization: "Bearer " + intern.body.data.token } }); expect(await resume.text()).toBe("%PDF-1.4 test resume"); expect(resume.headers.get("x-content-type-options")).toBe("nosniff"); expect(resume.headers.get("content-type")).toBe("application/pdf");
  const anonymousWork = await fetch(base + "/intern/files", { method: "POST", headers: { origin, "content-type": "text/plain", "x-file-name": "work.txt", "x-file-kind": "work" }, body: "test work" }); expect(anonymousWork.status).toBe(401);
  const work = await fetch(base + "/intern/files", { method: "POST", headers: { origin, authorization: "Bearer " + intern.body.data.token, "content-type": "text/plain", "x-file-name": "work.txt", "x-file-kind": "work" }, body: "test work" }); expect(work.status).toBe(200);
  const workFile = (await work.json() as any).data;
  expect((await fetch(base + "/intern/files/" + workFile.id, { headers: { origin } })).status).toBe(403);
  expect(await (await fetch(base + "/intern/files/" + workFile.id, { headers: { origin, authorization: "Bearer " + intern.body.data.token } })).text()).toBe("test work");
  const refreshed = await fetch(base + "/intern/auth/refresh", { method: "POST", headers: { origin, "x-intern-context": context, cookie: intern.cookie } }); expect(refreshed.status).toBe(200);
  const replay = await fetch(base + "/intern/auth/refresh", { method: "POST", headers: { origin, "x-intern-context": context, cookie: intern.cookie } });
  expect(replay.status).toBe(401);
  expect(await replay.json()).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
  const rotatedCookie = refreshed.headers.get("set-cookie")?.split(";")[0] || "";
  const revoked = await fetch(base + "/intern/auth/refresh", { method: "POST", headers: { origin, "x-intern-context": context, cookie: rotatedCookie } }); expect(revoked.status).toBe(401);
  const other = await login("applicant@example.test", "ApplicantPassword2026!");
  const forged = other.cookie.replace(/\.[^.]+$/, ".not-a-real-refresh-secret");
  expect((await fetch(base + "/intern/auth/refresh", { method: "POST", headers: { origin, "x-intern-context": context, cookie: forged } })).status).toBe(401);
  expect((await instance.auth.verify(other.body.data.token)).account.email).toBe("applicant@example.test");
  const logout = await fetch(base + "/intern/auth/logout", { method: "POST", headers: { origin, "x-intern-context": context, cookie: other.cookie, authorization: "Bearer expired-token" } });
  expect(logout.status).toBe(200);
  expect((await fetch(base + "/intern/auth/refresh", { method: "POST", headers: { origin, "x-intern-context": context, cookie: other.cookie } })).status).toBe(401);
  const active = await login("applicant@example.test", "ApplicantPassword2026!");
  await admin.request("account.resetPassword", { accountId: registered.id, password: "ReplacementPassword2026!" }, "reset-password-test-0001");
  await expect(instance.auth.verify(active.body.data.token)).rejects.toThrow();
  expect((await login("applicant@example.test", "ApplicantPassword2026!")).response.status).toBe(401);
  expect((await login("applicant@example.test", "ReplacementPassword2026!")).response.status).toBe(200);
}, 60000);

test("committed changes notify authorized clients connected to another server", async () => {
  const second = await createInternshipServer({ domain, secret: "testing-secret-with-at-least-32-bytes", port: 0, allowedOrigins: [origin] });
  try {
    const staff = await login("staff@example.test", "StaffPassword2026!");
    const writer = await socket(); await writer.request("auth.authenticate", { token: staff.body.data.token });
    const observer = await socket(`http://127.0.0.1:${second.server.port}`); await observer.request("auth.authenticate", { token: staff.body.data.token });
    const event = observer.nextEvent();
    await writer.request("program.configure", { programId: "innovator", fee: 0, stipend: 0, enabled: true }, "program-second-server-0001");
    await event;
    observer.ws.terminate(); writer.ws.terminate();
  } finally { await second.stop(); }
}, 30000);

test("lost refresh responses can be retried without weakening replay detection", async () => {
  const current = await login("staff@example.test", "StaffPassword2026!");
  const requestId = "refresh-lost-response-000001";
  const headers = { origin, "x-intern-context": context, cookie: current.cookie, "x-intern-refresh-request": requestId };
  const first = await fetch(base + "/intern/auth/refresh", { method: "POST", headers }); expect(first.status).toBe(200);
  const rotated = first.headers.get("set-cookie")?.split(";")[0] || "";
  // The response to the first successful rotation is assumed lost. Retrying
  // its old cookie with the same request ID recovers exactly that rotation.
  const retry = await fetch(base + "/intern/auth/refresh", { method: "POST", headers }); expect(retry.status).toBe(200);
  expect(retry.headers.get("set-cookie")?.split(";")[0]).toBe(rotated);
  const replay = await fetch(base + "/intern/auth/refresh", { method: "POST", headers: { ...headers, "x-intern-refresh-request": "different-refresh-request-0001" } }); expect(replay.status).toBe(401);
  expect((await fetch(base + "/intern/auth/refresh", { method: "POST", headers: { ...headers, cookie: rotated, "x-intern-refresh-request": "next-refresh-request-00000001" } })).status).toBe(401);
}, 30000);

test("concurrent retries share one rotation and an expired retry window revokes replay", async () => {
  const current = await login("staff@example.test", "StaffPassword2026!");
  const headers = { origin, "x-intern-context": context, cookie: current.cookie, "x-intern-refresh-request": "same-concurrent-refresh-0001" };
  const [first, retry] = await Promise.all([
    fetch(base + "/intern/auth/refresh", { method: "POST", headers }),
    fetch(base + "/intern/auth/refresh", { method: "POST", headers }),
  ]);
  expect(first.status).toBe(200); expect(retry.status).toBe(200);
  const rotated = first.headers.get("set-cookie")?.split(";")[0] || "";
  expect(retry.headers.get("set-cookie")?.split(";")[0]).toBe(rotated);
  const token = decodeURIComponent(current.cookie.slice(current.cookie.indexOf("=") + 1));
  await domain.collection("sessions").updateOne({ _id: token.split(".")[0] }, { $set: { refreshRetryUntil: new Date(0) } });
  expect((await fetch(base + "/intern/auth/refresh", { method: "POST", headers })).status).toBe(401);
  expect((await fetch(base + "/intern/auth/refresh", { method: "POST", headers: { ...headers, cookie: rotated, "x-intern-refresh-request": "expired-followup-request-0001" } })).status).toBe(401);
}, 30000);

test("anonymous careers page receives live aggregate insights without applicant identity", async () => {
  const viewer = await socket();
  const pushes: any[] = [];
  viewer.ws.addEventListener("message", event => { const frame = JSON.parse(String(event.data)); if (frame.type === "event" && String(frame.event).startsWith("intern.insights")) pushes.push(frame); });
  const initial = await viewer.request("insights.subscribe");
  expect(initial.viewers).toBeGreaterThanOrEqual(1);
  expect(initial.totals.applied).toBeGreaterThanOrEqual(0);
  const before = initial.totals.applied;
  const file = await fetch(base + "/intern/files", { method: "POST", headers: { origin, "content-type": "application/pdf", "x-file-name": "resume.pdf", "x-file-kind": "resume" }, body: "%PDF-1.4 insights resume" });
  const uploaded = (await file.json() as any).data;
  const applicant = await socket();
  await applicant.request("application.submit", { name: "Insights Applicant", email: "insights-applicant@example.test", linkedin: "https://www.linkedin.com/in/insights-applicant", videoUrl: "https://youtu.be/aqz-KE-bpKQ", programId: "explorer", resumeAttachmentId: uploaded.id, resumeAccessToken: uploaded.accessToken }, "insights-application-0001");
  expect((await domain.collection("applications").findOne({ email: "insights-applicant@example.test" }))?.hasVideo).toBe(true);
  const deadline = Date.now() + 15000;
  while (!pushes.some(frame => frame.event === "intern.insights" && frame.data.totals.applied === before + 1) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 100));
  const update = pushes.find(frame => frame.event === "intern.insights" && frame.data.totals.applied === before + 1);
  expect(update).toBeDefined();
  expect(update.data.recent[0]).toEqual({ track: "explorer", at: expect.any(String) });
  expect(JSON.stringify(update.data)).not.toContain("insights-applicant@example.test");
  expect(JSON.stringify(update.data)).not.toContain("Insights Applicant");
  await viewer.request("insights.unsubscribe");
  viewer.ws.close(); applicant.ws.close();
}, 30000);

test("logout revokes a rotated session even if the browser has the old cookie", async () => {
  const current = await login("staff@example.test", "StaffPassword2026!");
  const rotated = await fetch(base + "/intern/auth/refresh", { method: "POST", headers: { origin, "x-intern-context": context, cookie: current.cookie, "x-intern-refresh-request": "logout-stale-cookie-0000001" } }); expect(rotated.status).toBe(200);
  const next = rotated.headers.get("set-cookie")?.split(";")[0] || "";
  const logout = await fetch(base + "/intern/auth/logout", { method: "POST", headers: { origin, "x-intern-context": context, cookie: current.cookie, authorization: "Bearer expired-token" } }); expect(logout.status).toBe(200);
  expect((await fetch(base + "/intern/auth/refresh", { method: "POST", headers: { origin, "x-intern-context": context, cookie: next, "x-intern-refresh-request": "retry-after-logout-0000001" } })).status).toBe(401);
}, 30000);

test("a staff role change prevents rotation of an earlier session", async () => {
  const admin = await domain.login("staff@example.test", "StaffPassword2026!");
  const person = await domain.execute("staff.create", { name: "Refresh role test", email: "refresh-role@example.test", password: "RefreshRolePassword2026!", staffRole: "viewer" }, admin, "refresh-role-create-000001");
  const session = await login("refresh-role@example.test", "RefreshRolePassword2026!"); expect(session.response.status).toBe(200);
  const sid = decodeURIComponent(session.cookie.slice(session.cookie.indexOf("=") + 1)).split(".")[0]!;
  const before = await domain.collection("sessions").findOne({ _id: sid });
  await domain.execute("staff.update", { id: person.id, staffRole: "recruiter" }, admin, "refresh-role-update-000001");
  const refresh = await fetch(base + "/intern/auth/refresh", { method: "POST", headers: { origin, "x-intern-context": context, cookie: session.cookie, "x-intern-refresh-request": "role-version-check-0000001" } });
  expect(refresh.status).toBe(401);
  const after = await domain.collection("sessions").findOne({ _id: sid });
  expect(after?.revoked).toBe(true); expect(after?.refreshHash).toBe(before?.refreshHash);
}, 30000);

test("database outages are retryable and a committed settings request remains idempotent", async () => {
  const originalLogin = domain.login;
  try {
    domain.login = async () => { throw new MongoNetworkError("simulated outage"); };
    const unavailable = await login("staff@example.test", "StaffPassword2026!");
    expect(unavailable.response.status).toBe(503); expect(unavailable.body.error.code).toBe("SERVICE_UNAVAILABLE");
  } finally { domain.login = originalLogin; }
  const staff = await login("staff@example.test", "StaffPassword2026!"), client = await socket();
  await client.request("auth.authenticate", { token: staff.body.data.token });
  const requestKey = "committed-database-error-0001", original = domain.execute; let failOnce = true;
  const before = await domain.collection("activity").countDocuments({ title: "Program settings updated" });
  try {
    domain.execute = async (method, params, actor, key) => {
      const result = await original(method, params, actor, key);
      if (method === "settings.update" && failOnce) { failOnce = false; throw new MongoNetworkError("response interrupted after commit"); }
      return result;
    };
    await expect(client.request("settings.update", { patch: { programName: "Retry test" } }, requestKey)).rejects.toThrow("SERVICE_UNAVAILABLE");
    expect(await client.request("settings.update", { patch: { programName: "Retry test" } }, requestKey)).toBe(true);
    expect(await domain.collection("activity").countDocuments({ title: "Program settings updated" })).toBe(before + 1);
  } finally { domain.execute = original; }
}, 30000);
