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
    status: "Applied",
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
