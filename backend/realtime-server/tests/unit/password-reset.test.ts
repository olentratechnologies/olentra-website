import { expect, test } from "bun:test";
import { SignJWT } from "jose";
import { createInternshipAuth } from "./auth";
import type { createInternshipDomain } from "./domain";
import { createAuthRoutes } from "../../src/interfaces/http/auth.routes";

const secret = "password-reset-test-secret-over-thirty-two-bytes";
const key = new TextEncoder().encode(secret);
const auth = createInternshipAuth({ collection: (name: string) => ({ collectionName: name }) } as unknown as ReturnType<typeof createInternshipDomain>, secret);

test("reset tokens carry an explicit version and cannot be used as sign-in tokens", async () => {
  const token = await auth.generatePasswordResetToken("  ADMIN@EXAMPLE.TEST ", "staff", 4);
  expect(await auth.verifyPasswordResetToken(token)).toEqual({ email: "admin@example.test", userId: "staff", version: 4 });
  await expect(auth.verify(token)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
});

test("reset verification rejects legacy unbound, invalid-version, expired and tampered links", async () => {
  for (const version of [undefined, 0, -1, 1.5, "1"]) {
    const token = await new SignJWT({ uid: "staff", ...(version === undefined ? {} : { ver: version }) })
      .setProtectedHeader({ alg: "HS256" }).setIssuer("olentra-intern-reset").setAudience("olentra-intern-portal")
      .setSubject("admin@example.test").setExpirationTime("1h").sign(key);
    await expect(auth.verifyPasswordResetToken(token)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  }
  const expired = await new SignJWT({ uid: "staff", ver: 1 }).setProtectedHeader({ alg: "HS256" })
    .setIssuer("olentra-intern-reset").setAudience("olentra-intern-portal").setSubject("admin@example.test")
    .setExpirationTime(Math.floor(Date.now() / 1000) - 1).sign(key);
  await expect(auth.verifyPasswordResetToken(expired)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  await expect(auth.verifyPasswordResetToken((await auth.generatePasswordResetToken("admin@example.test", "staff", 1)) + "tampered")).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
});

test("workspace recovery targets staff only and passes the signed version to the atomic reset", async () => {
  let role = "company";
  const messages: any[] = [], resets: any[] = [];
  const routes = createAuthRoutes({
    auth,
    domain: {
      findUserByEmail: async () => ({ _id: "staff", email: "person@example.test", role, sessionVersion: 7 }),
      selfResetPassword: async (...args: any[]) => { resets.push(args); },
    } as any,
    mailer: { sendPasswordResetLink: async (message: unknown) => { messages.push(message); } } as any,
    siteOrigin: "https://site.example.test",
    workspaceOrigin: "https://workspace.example.test",
    sendJson: (body, _origin, status = 200) => Response.json(body, { status }),
  });
  const request = () => new Request("https://api.example.test/intern/auth/request-password-reset", { method: "POST", body: JSON.stringify({ email: "person@example.test", app: "workspace" }) });
  await routes.requestPasswordReset(request(), null);
  expect(messages[0].resetUrl).toStartWith("https://workspace.example.test/dashboard/reset-password?token=");
  const token = new URL(messages[0].resetUrl).searchParams.get("token");
  await routes.resetPassword(new Request("https://api.example.test/intern/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password: "LongPassword2026!" }) }), null);
  expect(resets).toEqual([["staff", "LongPassword2026!", 7]]);
  role = "intern";
  await routes.requestPasswordReset(request(), null);
  expect(messages[1].resetUrl).toStartWith("https://site.example.test/intern/reset-password?token=");
});
