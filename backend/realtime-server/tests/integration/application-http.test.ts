import { afterAll, beforeAll, expect, test } from "bun:test";
import { createHash, randomUUID } from "node:crypto";
import { internshipTestMongoUri } from "./config";
import { connectInternDatabase, createInternshipDomain } from "./domain";
import { createInternshipServer } from "../../src/server";

const uri = internshipTestMongoUri();
if (!uri) throw new Error("Set INTERNSHIP_TEST_MONGODB_URI for isolated internship integration tests.");
const prefix = `test_apply_http_${randomUUID().replaceAll("-", "")}_`, origin = "http://localhost:3000";
let connection: any, domain: any, server: any, base = "";
const admin: any = { id: "apply-admin", role: "company", staffRole: "admin", name: "Admin", email: "apply-admin@example.test", applicationId: null, sessionVersion: 1 };
const digest = (value: string) => createHash("sha256").update(value).digest("hex");

beforeAll(async () => {
  connection = await connectInternDatabase(uri!);
  domain = createInternshipDomain({ ...connection, prefix });
  await domain.initialize();
  await domain.collection("accounts").insertOne({ _id: admin.id, ...admin });
  await domain.execute("program.configure", { programId: "software-engineer", fee: 0, stipend: 0, enabled: true }, admin, `apply-http-track-${randomUUID()}`);
  await domain.execute("settings.update", { patch: { programEnabled: true } }, admin, `apply-http-open-${randomUUID()}`);
  server = await createInternshipServer({ domain, secret: "testing-secret-with-at-least-32-bytes", port: 0, allowedOrigins: [origin] });
  base = `http://127.0.0.1:${server.server.port}`;
}, 30000);
afterAll(async () => {
  await server?.stop?.();
  if (!connection) return;
  for (const { name } of await connection.db.listCollections({}, { nameOnly: true }).toArray()) if (name.startsWith(prefix)) await connection.db.collection(name).drop();
  await connection.client.close();
}, 30000);

test("the apply form's HTTP endpoint saves one application per key and email", async () => {
  await domain.collection("files").insertOne({ _id: "http-resume", kind: "resume", status: "ready", accessTokenHash: digest("http-token") });
  const payload = { name: "Http Applicant", email: "http-applicant@example.test", linkedin: "https://www.linkedin.com/in/http-applicant", programId: "software-engineer", schedule: "part_time", resumeAttachmentId: "http-resume", resumeAccessToken: "http-token" };
  const send = (key: string) => fetch(`${base}/intern/applications`, { method: "POST", headers: { origin, "content-type": "application/json", "idempotency-key": key }, body: JSON.stringify(payload) });
  const key = randomUUID().replaceAll("-", "");
  const first = await send(key);
  expect(first.status).toBe(200);
  const body = await first.json() as any;
  expect(body.ok).toBe(true);
  expect(body.data.applicationId).toBeTruthy();
  expect(first.headers.get("access-control-allow-origin")).toBe(origin);
  // A retry with the same key returns the same reference ID.
  expect(((await (await send(key)).json()) as any).data.applicationId).toBe(body.data.applicationId);
  // A new key for the same email is a duplicate.
  const duplicate = await send(randomUUID().replaceAll("-", ""));
  expect(duplicate.status).toBe(409);
  expect(((await duplicate.json()) as any).error.code).toBe("ALREADY_APPLIED");
  expect(await domain.collection("applications").countDocuments({ email: "http-applicant@example.test" })).toBe(1);
}, 30000);
