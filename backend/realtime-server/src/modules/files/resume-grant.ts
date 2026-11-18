import { randomUUID } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { DomainError } from "../../shared/errors";

const AUDIENCE = "olentra-resume-upload";
const LIFETIME_SECONDS = 15 * 60;
export const RESUME_GRANT_PATH = "/intern/files/resume-grant";

export function createResumeGrants(secret: string, turnstileSecret: string) {
  const key = new TextEncoder().encode(secret);

  return {
    async verifyChallenge(value: string, hostname: string) {
      if (!value || value.length > 2048) throw new DomainError("INVALID_REQUEST", "Complete the security check before uploading your resume.");
      let verification: { success?: boolean; hostname?: string; action?: string } | null;
      try {
        const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
          method: "POST",
          body: new URLSearchParams({ secret: turnstileSecret, response: value }),
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) throw new Error("Verification unavailable");
        verification = await response.json() as typeof verification;
      } catch {
        throw new DomainError("SERVICE_UNAVAILABLE", "The security check is temporarily unavailable. Please try again.");
      }
      if (verification?.success !== true || verification.hostname !== hostname || verification.action !== "resume_upload") {
        throw new DomainError("FORBIDDEN", "The security check expired or could not be verified. Please try again.");
      }
      const expiresAt = Math.floor(Date.now() / 1000) + LIFETIME_SECONDS;
      const token = await new SignJWT({})
        .setProtectedHeader({ alg: "HS256" })
        .setAudience(AUDIENCE)
        .setJti(randomUUID())
        .setExpirationTime(expiresAt)
        .sign(key);
      return { token, expiresAt: expiresAt * 1000 };
    },

    async draftId(token: string) {
      try {
        if (!token || token.length > 2048) throw new Error("Missing grant");
        const { payload } = await jwtVerify(token, key, { audience: AUDIENCE, algorithms: ["HS256"], requiredClaims: ["exp", "jti"] });
        if (!payload.jti) throw new Error("Missing draft ID");
        return payload.jti;
      } catch {
        throw new DomainError("FORBIDDEN", "Verify the security check again before uploading your resume.");
      }
    },
  };
}
