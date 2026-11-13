import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { internshipTestMongoUri } from "./config";
import { connectInternDatabase, createInternshipDomain } from "./domain";
import { createInternshipServer } from "./server";

const uri = internshipTestMongoUri();
if (!uri) throw new Error("Set INTERNSHIP_TEST_MONGODB_URI for isolated internship integration tests.");
const prefix = `test_intern_sitef_${randomUUID().replaceAll("-", "")}_`;
let connection: Awaited<ReturnType<typeof connectInternDatabase>>;
let domain: ReturnType<typeof createInternshipDomain>;
let instance: Awaited<ReturnType<typeof createInternshipServer>>;
let base = "";
const password = "StaffPassword2026!";

beforeAll(async () => {
  connection = await connectInternDatabase(uri!);
  domain = createInternshipDomain({ ...connection, prefix });
  instance = await createInternshipServer({ domain, secret: "testing-secret-with-at-least-32-bytes", port: 0 });
  base = `http://127.0.0.1:${instance.server.port}`;
  const admin = await domain.createTestStaff("owner@example.test", password);
  await domain.execute("staff.create", { name: "Recruiter", email: "recruiter@example.test", password, staffRole: "recruiter" }, admin, `create-recruiter-${randomUUID()}`);
}, 25000);
afterAll(async () => {
  await instance?.stop();
  if (connection) {
    const names = await connection.db.listCollections({}, { nameOnly: true }).toArray();
    for (const { name } of names) if (name.startsWith(prefix)) await connection.db.collection(name).drop();
    await connection.client.close();
  }
}, 25000);

const token = async (email: string) => {
  const response = await fetch(base + "/intern/auth/login", { method: "POST", headers: { "content-type": "application/json", "x-intern-context": "sitefeaturescontext123" }, body: JSON.stringify({ email, password }) });
  return ((await response.json()) as any).data.token as string;
};
const state = (revision: number, maintenance: boolean) => ({ schemaVersion: 1, revision, environments: { Production: { maintenance, internships: true } } });
const put = (auth: string | null, body: unknown) => fetch(base + "/intern/site-features", { method: "PUT", headers: { "content-type": "application/json", ...(auth ? { authorization: `Bearer ${auth}` } : {}) }, body: JSON.stringify(body) });

test("the website reads switches; only owners and workspace admins can save them", async () => {
  expect(((await (await fetch(base + "/intern/site-features")).json()) as any).data).toBeNull();
  expect((await put(null, { state: state(1, true), expectedRevision: 0 })).status).toBe(401);
  expect((await put(await token("recruiter@example.test"), { state: state(1, true), expectedRevision: 0 })).status).toBe(403);
  const owner = await token("owner@example.test");
  expect((await put(owner, { state: state(1, true), expectedRevision: 0 })).status).toBe(200);
  const saved = ((await (await fetch(base + "/intern/site-features")).json()) as any).data;
  expect(saved).toMatchObject({ revision: 1, environments: { Production: { maintenance: true } } });
});

test("a save based on an old revision is refused instead of overwriting", async () => {
  const owner = await token("owner@example.test");
  const current = ((await (await fetch(base + "/intern/site-features")).json()) as any).data.revision;
  expect((await put(owner, { state: state(current + 1, false), expectedRevision: current })).status).toBe(200);
  expect((await put(owner, { state: state(current + 1, true), expectedRevision: current })).status).toBe(409);
  expect((await put(owner, { state: { ...state(current + 2, true), environments: { Production: { maintenance: "yes" } } }, expectedRevision: current + 1 })).status).toBe(400);
});
