import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { connectInternDatabase, createInternshipDomain } from "./domain";
import { createInternshipServer } from "./server";
import { internshipTestMongoUri } from "./config";
import { INTERNSHIP_OPPORTUNITIES } from "../../src/modules/programs/opportunities.mjs";

const uri = internshipTestMongoUri();
if (!uri) throw new Error("Set INTERNSHIP_TEST_MONGODB_URI for isolated integration tests.");
const prefix = `test_opportunities_${randomUUID().replaceAll("-", "")}_`;
const origin = "http://localhost:3000";
const key = () => randomUUID().replaceAll("-", "");
let connection: Awaited<ReturnType<typeof connectInternDatabase>>;
let domain: ReturnType<typeof createInternshipDomain>;
let instance: Awaited<ReturnType<typeof createInternshipServer>>;
let base: string;
const sockets: WebSocket[] = [];
const confirmations = new Map<string, string>();

beforeAll(async () => {
  connection = await connectInternDatabase(uri);
  domain = createInternshipDomain({ ...connection, prefix });
  instance = await createInternshipServer({ domain, secret: "opportunities-test-secret-at-least-32-bytes", port: 0, allowedOrigins: [origin], siteOrigin: origin,
    mailer: { async sendApplicationConfirmation({ to, applicationId }: any) { confirmations.set(to, applicationId); return { ok: true, delivered: true }; }, async sendApplicantStatus() { return { ok: true, delivered: true }; } } as any });
  base = `http://127.0.0.1:${instance.server.port}`;
  await domain.createTestStaff("staff@example.test", "OpportunitiesPassword2026!");
  await domain.collection("programs").updateOne({ _id: "software-engineer" }, { $set: { enabled: true, fee: 0, stipend: 0 } });
  await domain.collection("programs").updateOne({ _id: "software-engineer" }, { $set: { enabled: true, fee: 0, stipend: 15000 } });
  await domain.collection("settings").updateOne({ _id: "program" }, { $set: { programEnabled: true, compensationMode: "free" } });
  domain.invalidatePublicData();
}, 30000);

afterAll(async () => {
  for (const socket of sockets) socket.terminate();
  await instance?.stop();
  if (connection) {
    for (const { name } of await connection.db.listCollections({}, { nameOnly: true }).toArray()) if (name.startsWith(prefix)) await connection.db.collection(name).drop();
    await connection.client.close();
  }
}, 30000);

async function socket() {
  const ws = new WebSocket(base.replace("http:", "ws:") + "/ws/intern");
  sockets.push(ws);
  const pending = new Map<string, { resolve: (value: any) => void; reject: (error: any) => void }>();
  const events: any[] = [];
  ws.onmessage = event => {
    const frame = JSON.parse(String(event.data));
    if (frame.type === "event") events.push(frame);
    const handler = pending.get(frame.id);
    if (!handler) return;
    pending.delete(frame.id);
    if (frame.ok) handler.resolve(frame.data); else handler.reject(frame.error);
  };
  await new Promise<void>((resolve, reject) => { ws.onopen = () => resolve(); ws.onerror = () => reject(new Error("Socket failed")); });
  const request = (method: string, params: Record<string, unknown> = {}, idempotencyKey?: string) => new Promise<any>((resolve, reject) => {
    const id = key(), timer = setTimeout(() => { pending.delete(id); reject(new Error("Request timed out")); }, 10000);
    pending.set(id, { resolve(value) { clearTimeout(timer); resolve(value); }, reject(error) { clearTimeout(timer); reject(error); } });
    ws.send(JSON.stringify({ type: "request", id, method, params, ...(idempotencyKey ? { idempotencyKey } : {}) }));
  });
  return { ws, request, events };
}

async function upload() {
  const response = await fetch(base + "/intern/files", { method: "POST", headers: { origin, "content-type": "application/pdf", "x-file-name": "resume.pdf", "x-file-kind": "resume" }, body: "%PDF-1.4 test resume" });
  expect(response.status).toBe(200);
  const { data } = await response.json() as any;
  return { resumeAttachmentId: data.id, resumeAccessToken: data.accessToken };
}

test("every role and schedule persists through the real socket, resume, email-link and portal flow", async () => {
  const admin = await socket();
  const login = await instance.auth.login("staff@example.test", "OpportunitiesPassword2026!");
  await admin.request("auth.authenticate", { token: login.token });
  const duration = "8-10 weeks";
  await admin.request("settings.update", { patch: { duration } }, key());
  const anonymous = await socket();
  const publicData = await anonymous.request("intern.public");
  expect(publicData.opportunities).toEqual({ ...INTERNSHIP_OPPORTUNITIES, duration });
  expect(publicData.settings.duration).toBe(duration);
  let firstApplicationId: string | undefined;
  for (const [index, schedule] of ["part_time", "full_time"].entries()) {
    const email = `${schedule}@example.test`, requestKey = key();
    const payload = { name: "Test Candidate", email, programId: "software-engineer", ...(index === 0 ? { roleId: "build" } : {}), schedule, workMode: "onsite", durationMonths: 999, linkedin: `https://linkedin.com/in/${schedule}`, ...await upload() };
    const received = await anonymous.request("application.submit", payload, requestKey);
    expect(received.received).toBe(true);
    expect(await anonymous.request("application.submit", payload, requestKey)).toEqual(received);
    expect(await domain.collection("applications").countDocuments({ email })).toBe(1);
    const stored = (await domain.collection("applications").findOne({ email }))!;
    const expected = { schedule, workMode: "remote", duration };
    expect(stored).toMatchObject(expected);
    expect(stored).not.toHaveProperty("roleId");
    firstApplicationId ||= stored._id;
    expect(await admin.request("application.get", { id: stored._id })).toMatchObject(expected);
    expect((await admin.request("application.list", { search: email })).items[0]).toMatchObject(expected);
    await domain.processOutbox();
    expect(confirmations.get(email)).toBe(stored._id);
    await expect(domain.autoProvisionAccount(stored._id, email)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await admin.request("application.update", { id: stored._id, status: "Selected", expectedVersion: stored.version }, key());
    const token = await instance.auth.generateMagicLinkToken(email, stored._id);
    const verified = await fetch(base + "/intern/auth/verify-magic-link", { method: "POST", headers: { origin, "content-type": "application/json", "x-intern-context": key() }, body: JSON.stringify({ token }) });
    expect(verified.status).toBe(200);
    const session = await verified.json() as any;
    const applicant = await socket();
    await applicant.request("auth.authenticate", { token: session.data.token });
    const mine = (await applicant.request("intern.snapshot")).my.application;
    expect(mine).toMatchObject(expected);
    expect(mine).not.toHaveProperty("notes");
    await expect(anonymous.request("application.get", { id: stored._id })).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    for (let n = 0; n < 100 && !admin.events.some(event => event.event === "intern.application_created" && event.applicationId === stored._id); n++) await Bun.sleep(20);
    expect(admin.events.some(event => event.event === "intern.application_created" && event.applicationId === stored._id)).toBe(true);
  }
  await admin.request("settings.update", { patch: { duration: "4-6 months" } }, key());
  const updatedPublicData = await anonymous.request("intern.public");
  expect(updatedPublicData.opportunities.duration).toBe("4-6 months");
  expect(await domain.collection("applications").findOne({ _id: firstApplicationId })).toMatchObject({ duration });
  await admin.request("settings.update", { patch: { duration: INTERNSHIP_OPPORTUNITIES.duration } }, key());
}, 30000);

test("invalid schedules, the paid track and expired intake are refused without consuming the resume", async () => {
  const applicant = await socket();
  const file = await upload();
  const payload = { name: "Invalid Candidate", email: "invalid@example.test", linkedin: "https://linkedin.com/in/invalid", programId: "software-engineer", schedule: "part_time", ...file };
  for (const [index, patch] of [{ schedule: "" }, { schedule: "hybrid" }].entries()) {
    await expect(applicant.request("application.submit", { ...payload, email: `invalid-${index}@example.test`, ...patch }, key())).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  }
  await expect(applicant.request("application.submit", { ...payload, programId: "software-engineer" }, key())).rejects.toMatchObject({ code: "CLOSED" });
  await domain.collection("settings").updateOne({ _id: "program" }, { $set: { applicationDeadline: new Date(Date.now() - 1).toISOString() } });
  try { await expect(applicant.request("application.submit", payload, key())).rejects.toMatchObject({ code: "CLOSED" }); }
  finally { await domain.collection("settings").updateOne({ _id: "program" }, { $set: { applicationDeadline: null } }); }
  expect(await domain.collection("applications").countDocuments({ email: payload.email })).toBe(0);
  expect(await domain.collection("files").findOne({ _id: file.resumeAttachmentId })).not.toHaveProperty("applicationId");
}, 15000);
