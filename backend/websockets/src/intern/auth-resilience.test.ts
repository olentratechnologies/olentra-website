import { expect, test } from "bun:test";
import { MongoNetworkError } from "mongodb";
import { SignJWT } from "jose";
import { createInternshipAuth } from "./auth";
import type { createInternshipDomain } from "./domain";

const secret = "isolated-auth-test-secret-over-thirty-two-bytes";
const principal = { id: "staff", name: "Staff", email: "staff@example.test", role: "company" as const, applicationId: null, sessionVersion: 1, staffRole: "admin", permissions: [] };

test("a database outage during token verification is not mistaken for an expired session", async () => {
  const offline = new MongoNetworkError("simulated outage");
  const sessions = { aggregate: () => ({ toArray: async () => { throw offline; } }) };
  const domain = { collection: (name: string) => name === "sessions" ? sessions : { collectionName: name } } as unknown as ReturnType<typeof createInternshipDomain>;
  const auth = createInternshipAuth(domain, secret);
  const token = await new SignJWT({ sid: "session", role: "company", ver: 1 }).setProtectedHeader({ alg: "HS256" }).setIssuer("olentra-intern").setAudience("olentra-intern-client").setSubject(principal.id).setExpirationTime("5m").sign(new TextEncoder().encode(secret));
  await expect(auth.verify(token)).rejects.toBe(offline);
  await expect(auth.verify("invalid-token")).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
});

test("a failed account read does not consume a valid rotating refresh token", async () => {
  const offline = new MongoNetworkError("simulated outage"); let rotations = 0;
  const sessions = { aggregate: () => ({ toArray: async () => { throw offline; } }), findOneAndUpdate: async () => { rotations++; return null; }, updateOne: async () => { rotations++; } };
  const domain = { collection: (name: string) => name === "sessions" ? sessions : { collectionName: name } } as unknown as ReturnType<typeof createInternshipDomain>;
  const auth = createInternshipAuth(domain, secret);
  await expect(auth.refresh("session.secret", "request-identifier-123456")).rejects.toBe(offline);
  expect(rotations).toBe(0);
});
