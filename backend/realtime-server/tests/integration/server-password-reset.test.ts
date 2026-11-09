import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { internshipTestMongoUri } from "./config";
import { connectInternDatabase, createInternshipDomain } from "./domain";
import { createInternshipServer } from "./server";

const uri = internshipTestMongoUri();
if (!uri) throw new Error("Set INTERNSHIP_TEST_MONGODB_URI (or deprecated INTERN_TEST_MONGODB_URI) for isolated internship integration tests.");
const prefix = `test_intern_reset_${randomUUID().replaceAll("-", "")}_`;
let connection: Awaited<ReturnType<typeof connectInternDatabase>>;
let domain: ReturnType<typeof createInternshipDomain>;
let instance: Awaited<ReturnType<typeof createInternshipServer>>;
let base = "";
const origin = "http://localhost:3000";
const context = "resetcontext1234567890123456";

const sentEmails: Array<{ to: string; type: string; resetUrl?: string }> = [];

const mockMailer = {
  async sendApplicationConfirmation() {
    return { ok: true, delivered: true, id: "msg-1" };
  },
  async sendMagicLink() {
    return { ok: true, delivered: true, id: "msg-2" };
  },
  async sendPasswordResetLink({ to, resetUrl }: any) {
    sentEmails.push({ to, type: "password-reset", resetUrl });
    return { ok: true, delivered: true, id: "msg-3" };
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

test("request-password-reset validates email and dispatches email with reset token", async () => {
  const testEmail = `candidate-${randomUUID()}@example.test`;
  const initialPassword = "OldPassword123!";

  // 1. Create candidate user and account
  const userId = `ACC-test-${randomUUID()}`;
  const passwordHash = await Bun.password.hash(initialPassword, { algorithm: "argon2id" });
  await domain.collection("accounts").insertOne({
    _id: userId,
    name: "Reset Candidate",
    email: testEmail,
    role: "intern",
    sessionVersion: 1,
    createdAt: new Date(),
  });
  await domain.collection("test_credentials").insertOne({
    _id: userId,
    userId,
    passwordHash,
    createdAt: new Date(),
  });

  // 2. Invalid email format is rejected
  const badRes = await fetch(`${base}/intern/auth/request-password-reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ email: "invalid-email" }),
  });
  expect(badRes.status).toBe(400);

  // 3. Request reset for valid email
  const reqRes = await fetch(`${base}/intern/auth/request-password-reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ email: testEmail }),
  });
  expect(reqRes.status).toBe(200);
  const reqJson = (await reqRes.json()) as any;
  expect(reqJson.ok).toBe(true);

  // 4. Verify email was dispatched
  const emailItem = sentEmails.find((e) => e.to === testEmail);
  expect(emailItem).toBeDefined();
  expect(emailItem?.type).toBe("password-reset");
  expect(emailItem?.resetUrl).toContain(`${origin}/intern/reset-password?token=`);

  // 5. Extract reset token
  const token = new URL(emailItem!.resetUrl!).searchParams.get("token")!;
  expect(token).toBeTruthy();

  // 6. Reset password with short password fails
  const shortPassRes = await fetch(`${base}/intern/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ token, password: "short" }),
  });
  expect(shortPassRes.status).toBe(400);

  // 7. Reset password with tampered token fails
  const tamperedRes = await fetch(`${base}/intern/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ token: token + "invalid", password: "NewStrongPassword2026!" }),
  });
  expect(tamperedRes.status).toBe(401);

  // 8. Successful password reset
  const resetRes = await fetch(`${base}/intern/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ token, password: "NewStrongPassword2026!" }),
  });
  expect(resetRes.status).toBe(200);
  const resetJson = (await resetRes.json()) as any;
  expect(resetJson.ok).toBe(true);

  // 9. Login with old password fails
  const oldLoginRes = await fetch(`${base}/intern/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin, "X-Intern-Context": context },
    body: JSON.stringify({ email: testEmail, password: initialPassword }),
  });
  expect(oldLoginRes.status).toBe(401);

  // 10. Login with new password succeeds
  const newLoginRes = await fetch(`${base}/intern/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin, "X-Intern-Context": context },
    body: JSON.stringify({ email: testEmail, password: "NewStrongPassword2026!" }),
  });
  expect(newLoginRes.status).toBe(200);
  const newLoginJson = (await newLoginRes.json()) as any;
  expect(newLoginJson.ok).toBe(true);
  expect(newLoginJson.data.account.email).toBe(testEmail);
});
