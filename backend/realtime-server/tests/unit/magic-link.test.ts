import { expect, test } from "bun:test";
import { SignJWT } from "jose";
import { createInternshipAuth } from "./auth";
import type { createInternshipDomain } from "./domain";

const secret = "magic-link-test-secret-at-least-thirty-two-bytes-long";

function createMockAuth() {
  const sessions = {
    createIndex: async () => {},
    aggregate: () => ({ toArray: async () => [] }),
  };
  const domain = {
    collection: (name: string) => (name === "sessions" ? sessions : { collectionName: name }),
  } as unknown as ReturnType<typeof createInternshipDomain>;
  return createInternshipAuth(domain, secret);
}

test("magic link token roundtrip succeeds with correct claims", async () => {
  const auth = createMockAuth();
  const email = "candidate@example.com";
  const applicationId = "OL-candidate-123";

  const token = await auth.generateMagicLinkToken(email, applicationId);
  expect(typeof token).toBe("string");
  expect(token.split(".").length).toBe(3);

  const verified = await auth.verifyMagicLinkToken(token);
  expect(verified.email).toBe(email);
  expect(verified.applicationId).toBe(applicationId);
});

test("magic link token normalizes email to lowercase", async () => {
  const auth = createMockAuth();
  const token = await auth.generateMagicLinkToken("  TEST.User@Example.COM  ", "OL-456");
  const verified = await auth.verifyMagicLinkToken(token);
  expect(verified.email).toBe("test.user@example.com");
  expect(verified.applicationId).toBe("OL-456");
});

test("magic link verification rejects tampered token", async () => {
  const auth = createMockAuth();
  const token = await auth.generateMagicLinkToken("user@example.com", "OL-789");
  const tampered = token.slice(0, -5) + "abcde";
  await expect(auth.verifyMagicLinkToken(tampered)).rejects.toMatchObject({
    code: "UNAUTHENTICATED",
  });
});

test("magic link verification rejects expired token", async () => {
  const auth = createMockAuth();
  const key = new TextEncoder().encode(secret);
  const now = Math.floor(Date.now() / 1000);
  const expiredToken = await new SignJWT({ aid: "OL-expired" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer("olentra-intern-magic")
    .setAudience("olentra-intern-portal")
    .setSubject("expired@example.com")
    .setIssuedAt(now - 100)
    .setExpirationTime(now - 1)
    .sign(key);

  await expect(auth.verifyMagicLinkToken(expiredToken)).rejects.toMatchObject({
    code: "UNAUTHENTICATED",
  });
});

test("magic link verification rejects wrong issuer or audience", async () => {
  const auth = createMockAuth();
  const key = new TextEncoder().encode(secret);
  const now = Math.floor(Date.now() / 1000);

  const wrongAudience = await new SignJWT({ aid: "OL-wrong" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer("olentra-intern-magic")
    .setAudience("wrong-audience")
    .setSubject("user@example.com")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  await expect(auth.verifyMagicLinkToken(wrongAudience)).rejects.toMatchObject({
    code: "UNAUTHENTICATED",
  });
});
