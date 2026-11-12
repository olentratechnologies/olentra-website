import { expect, test } from "bun:test";
import { createInternshipAuth } from "./auth";
import type { createInternshipDomain } from "./domain";
import { createAuthRoutes } from "../../src/interfaces/http/auth.routes";

const secret = "single-use-magic-link-secret-over-thirty-two-bytes";

function authWithUseStore() {
  const used = new Map<string, unknown>();
  const uses = {
    collectionName: "magic_link_uses",
    createIndex: async () => {},
    insertOne: async (row: { _id: string }) => {
      if (used.has(row._id)) throw Object.assign(new Error("duplicate key"), { code: 11000 });
      used.set(row._id, row);
    },
  };
  const domain = { collection: (name: string) => (name === "magic_link_uses" ? uses : { collectionName: name }) } as unknown as ReturnType<typeof createInternshipDomain>;
  return { auth: createInternshipAuth(domain, secret), used };
}

test("a magic link signs in once; the second use is refused", async () => {
  const { auth, used } = authWithUseStore();
  const token = await auth.generateMagicLinkToken("candidate@example.test", "OL-1");
  expect(await auth.redeemMagicLinkToken(token)).toEqual({ email: "candidate@example.test", applicationId: "OL-1" });
  await expect(auth.redeemMagicLinkToken(token)).rejects.toMatchObject({ code: "UNAUTHENTICATED", message: expect.stringContaining("already been used") });
  expect(used.size).toBe(1);
  const [row] = [...used.values()] as Array<{ _id: string; expiresAt: Date }>;
  expect(row._id).not.toContain("-"); // stored as a hash, not the raw jti
  expect(row.expiresAt.getTime()).toBeGreaterThan(Date.now());
});

test("a different link for the same applicant still works", async () => {
  const { auth } = authWithUseStore();
  const first = await auth.generateMagicLinkToken("candidate@example.test", "OL-1");
  const second = await auth.generateMagicLinkToken("candidate@example.test", "OL-1");
  await auth.redeemMagicLinkToken(first);
  await expect(auth.redeemMagicLinkToken(second)).resolves.toMatchObject({ applicationId: "OL-1" });
});

test("a tampered link is refused before it is recorded", async () => {
  const { auth, used } = authWithUseStore();
  const token = await auth.generateMagicLinkToken("candidate@example.test", "OL-1");
  await expect(auth.redeemMagicLinkToken(token.slice(0, -4) + "abcd")).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  expect(used.size).toBe(0);
});

test("a reset request for an applicant without an account sends a sign-in link and creates nothing", async () => {
  const { auth } = authWithUseStore();
  const magic: any[] = [], resets: any[] = [];
  let provisioned = 0;
  const routes = createAuthRoutes({
    auth,
    domain: {
      findUserByEmail: async () => null,
      findApplicationByEmail: async () => ({ _id: "OL-2", email: "applicant@example.test", name: "Applicant" }),
      autoProvisionAccount: async () => { provisioned++; throw new Error("must not provision"); },
    } as any,
    mailer: {
      sendMagicLink: async (message: unknown) => { magic.push(message); },
      sendPasswordResetLink: async (message: unknown) => { resets.push(message); },
    } as any,
    siteOrigin: "https://site.example.test",
    sendJson: (body, _origin, status = 200) => Response.json(body, { status }),
  });
  const response = await routes.requestPasswordReset(new Request("https://api.example.test/intern/auth/request-password-reset", { method: "POST", body: JSON.stringify({ email: "applicant@example.test" }) }), null);
  expect(response.status).toBe(200);
  expect(provisioned).toBe(0);
  expect(resets).toHaveLength(0);
  expect(magic).toHaveLength(1);
  expect(magic[0].magicLinkUrl).toStartWith("https://site.example.test/intern/verify?token=");
});
