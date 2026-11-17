import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { internshipTestMongoUri } from "./config";
import { connectInternDatabase, createInternshipDomain } from "./domain";
import { createInternshipServer } from "./server";

const uri = internshipTestMongoUri();
if (!uri) throw new Error("Set INTERNSHIP_TEST_MONGODB_URI (or deprecated INTERN_TEST_MONGODB_URI) for isolated internship integration tests.");
const prefix = `test_intern_magic_${randomUUID().replaceAll("-", "")}_`;
let connection: Awaited<ReturnType<typeof connectInternDatabase>>;
let domain: ReturnType<typeof createInternshipDomain>;
let instance: Awaited<ReturnType<typeof createInternshipServer>>;
let base = "";
const origin = "http://localhost:3000";
const context = "magiclinkcontext1234567890";

const sentEmails: Array<{ to: string; type: string; magicLinkUrl: string }> = [];

const mockMailer = {
  async sendApplicationConfirmation({ to, magicLinkUrl }: any) {
    sentEmails.push({ to, type: "confirmation", magicLinkUrl });
    return { ok: true, delivered: true, id: "msg-1" };
  },
  async sendMagicLink({ to, magicLinkUrl }: any) {
    sentEmails.push({ to, type: "magic-link", magicLinkUrl });
    return { ok: true, delivered: true, id: "msg-2" };
  },
};

beforeAll(async () => {
  connection = await connectInternDatabase(uri!);
  domain = createInternshipDomain({ ...connection, prefix });
  instance = await createInternshipServer({
    domain,
    secret: "testing-secret-with-at-least-32-bytes-long",
    port: 0,
    allowedOrigins: [origin],
    mailer: mockMailer as any,
    siteOrigin: origin,
  });
  base = `http://127.0.0.1:${instance.server.port}`;
}, 25000);

afterAll(async () => {
  await instance?.stop();
  if (connection) {
    const names = await connection.db.listCollections({}, { nameOnly: true }).toArray();
    for (const { name } of names) if (name.startsWith(prefix)) await connection.db.collection(name).drop();
    await connection.client.close();
  }
}, 25000);

test("magic link endpoint returns ok and sends email when application exists", async () => {
  // 1. Manually insert an application into domain collection
  const now = new Date();
  const testAppId = `OL-test-${randomUUID()}`;
  const testEmail = `candidate-${randomUUID()}@example.test`;
  await domain.collection("applications").insertOne({
    _id: testAppId,
    name: "Enterprise Candidate",
    email: testEmail,
    programId: "explorer",
    program: "Tech Explorer",
    status: "Selected",
    appliedOn: now.toISOString().slice(0, 10),
    version: 1,
  });

  // 2. Request magic link
  const res = await fetch(`${base}/intern/auth/magic-link`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
    },
    body: JSON.stringify({ email: testEmail }),
  });
  expect(res.status).toBe(200);
  const json = (await res.json()) as any;
  expect(json.ok).toBe(true);

  // 3. Verify email was dispatched
  const dispatched = sentEmails.find((e) => e.to === testEmail);
  expect(dispatched).toBeDefined();
  expect(dispatched?.type).toBe("magic-link");
  expect(dispatched?.magicLinkUrl).toContain(`${origin}/intern/verify?token=`);

  // 4. Extract token from magic link URL
  const token = new URL(dispatched!.magicLinkUrl).searchParams.get("token")!;
  expect(token).toBeTruthy();

  // 5. Verify magic link via POST /intern/auth/verify-magic-link
  const verifyRes = await fetch(`${base}/intern/auth/verify-magic-link`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      "X-Intern-Context": context,
    },
    body: JSON.stringify({ token }),
  });

  expect(verifyRes.status).toBe(200);
  const verifyJson = (await verifyRes.json()) as any;
  expect(verifyJson.ok).toBe(true);
  expect(verifyJson.data.account.email).toBe(testEmail);
  expect(verifyJson.data.account.role).toBe("intern");
  expect(verifyJson.data.account.applicationId).toBe(testAppId);
  expect(typeof verifyJson.data.token).toBe("string");

  // Check Set-Cookie was returned
  const setCookie = verifyRes.headers.get("set-cookie");
  expect(setCookie).toContain(`intern_refresh_${context}=`);

  // 6. Verify an intern account was auto-provisioned in accounts collection
  const autoAccount = await domain.collection("accounts").findOne({ email: testEmail });
  expect(autoAccount).toBeDefined();
  expect(autoAccount?.role).toBe("intern");
  expect(autoAccount?.applicationId).toBe(testAppId);
});

test("verify-magic-link rejects invalid or tampered token with 401", async () => {
  const verifyRes = await fetch(`${base}/intern/auth/verify-magic-link`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      "X-Intern-Context": context,
    },
    body: JSON.stringify({ token: "not-a-valid-token" }),
  });

  expect(verifyRes.status).toBe(401);
  const verifyJson = (await verifyRes.json()) as any;
  expect(verifyJson.ok).toBe(false);
  expect(verifyJson.error.code).toBe("UNAUTHENTICATED");
});

async function requestLink(email: string) {
  const res = await fetch(`${base}/intern/auth/magic-link`, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify({ email }) });
  expect(res.status).toBe(200);
  const sent = sentEmails.filter((e) => e.to === email).at(-1);
  expect(sent).toBeDefined();
  return new URL(sent!.magicLinkUrl).searchParams.get("token")!;
}
const verify = (token: string) => fetch(`${base}/intern/auth/verify-magic-link`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: origin, "X-Intern-Context": context },
  body: JSON.stringify({ token }),
});
async function insertApplication(email: string) {
  const applicationId = `OL-test-${randomUUID()}`;
  await domain.collection("applications").insertOne({ _id: applicationId, name: "Link Candidate", email, programId: "explorer", program: "Tech Explorer", status: "Selected", appliedOn: new Date().toISOString().slice(0, 10), version: 1 });
  return applicationId;
}

test("a magic link signs in once; reusing it is refused", async () => {
  const email = `once-${randomUUID()}@example.test`;
  await insertApplication(email);
  const token = await requestLink(email);
  expect((await verify(token)).status).toBe(200);
  const second = await verify(token);
  expect(second.status).toBe(401);
  expect(((await second.json()) as any).error.code).toBe("UNAUTHENTICATED");
});

test("a magic link never signs in to a staff account that shares the applicant's email", async () => {
  const email = `staff-collision-${randomUUID()}@example.test`;
  const staffId = `ACC-staff-${randomUUID()}`;
  await domain.collection("accounts").insertOne({ _id: staffId, role: "company", staffRole: "admin", name: "Staff Person", email, applicationId: null, sessionVersion: 1, createdAt: new Date() });
  await insertApplication(email);
  const res = await verify(await requestLink(email));
  expect(res.status).toBe(401);
  expect(res.headers.get("set-cookie")).toBeNull();
  const staff = await domain.collection("accounts").findOne({ _id: staffId });
  expect(staff?.applicationId).toBeNull();
  expect(await domain.collection("accounts").countDocuments({ email })).toBe(1);
});

test("two different links used at the same moment create a single intern account", async () => {
  const email = `race-${randomUUID()}@example.test`;
  const applicationId = await insertApplication(email);
  const first = await requestLink(email);
  const second = await requestLink(email);
  const results = await Promise.all([verify(first), verify(second)]);
  expect(results.map((r) => r.status)).toEqual([200, 200]);
  expect(await domain.collection("accounts").countDocuments({ email })).toBe(1);
  expect((await domain.collection("accounts").findOne({ email }))?.applicationId).toBe(applicationId);
});

test("a password reset request for an applicant without an account creates no account", async () => {
  const email = `reset-noacct-${randomUUID()}@example.test`;
  await insertApplication(email);
  const res = await fetch(`${base}/intern/auth/request-password-reset`, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify({ email }) });
  expect(res.status).toBe(200);
  expect(await domain.collection("accounts").countDocuments({ email })).toBe(0);
  expect(sentEmails.filter((e) => e.to === email).at(-1)?.type).toBe("magic-link");
});
