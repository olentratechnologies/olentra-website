import type { createInternshipDomain } from "../../app/command-dispatcher";
import type { createInternshipAuth } from "../../modules/auth/auth.service";
import type { createInternshipMailer } from "../../infrastructure/email/mailer";
import { DomainError } from "../../shared/errors";
import { bearerToken } from "./middleware";
import { clientAddress } from "../../modules/auth/login-throttle";
import type { RateLimiter } from "../../modules/auth/rate-limit";
import { cookieName } from "./router";
import { parseCookies, refreshCookie, safeContext } from "./cookies";
import type { createSigninEmailTemplateSettings } from "../../modules/email-templates/signin-template-settings";

export const AUTH_PATHS = {
  login: "/intern/auth/login",
  magicLink: "/intern/auth/magic-link",
  verifyMagicLink: "/intern/auth/verify-magic-link",
  requestPasswordReset: "/intern/auth/request-password-reset",
  resetPassword: "/intern/auth/reset-password",
  refresh: "/intern/auth/refresh",
  logout: "/intern/auth/logout",
  session: "/intern/auth/session",
  changePassword: "/intern/auth/change-password",
} as const;

export const isAuthPath = (pathname: string) => pathname.startsWith("/intern/auth/");

type Domain = ReturnType<typeof createInternshipDomain>;
type Auth = ReturnType<typeof createInternshipAuth>;
type Mailer = ReturnType<typeof createInternshipMailer>;
type SendJson = (body: unknown, origin: string | null, status?: number, extra?: Record<string, string>) => Response;

/** HTTP authentication adapter. Domain authorization and token claims stay in their modules. */
export function createAuthRoutes({ auth, domain, mailer, siteOrigin, workspaceOrigin = "http://localhost:3002", sendJson, limiter, signinEmailTemplates }: {
  auth: Auth;
  domain: Domain;
  mailer: Mailer;
  siteOrigin: string;
  /** Company workspace origin; staff who reset from the workspace return there. */
  workspaceOrigin?: string;
  sendJson: SendJson;
  /** Limits anonymous requests that send email; omitted in unit tests. */
  limiter?: RateLimiter;
  signinEmailTemplates?: ReturnType<typeof createSigninEmailTemplateSettings>;
}) {
  const trustProxy = () => /^(true|1)$/i.test(process.env.REALTIME_TRUST_PROXY || "");
  const requireBearer = async (request: Request) => {
    const token = bearerToken(request);
    if (!token) throw new DomainError("UNAUTHENTICATED", "Sign in to continue.");
    return auth.verify(token);
  };
  const sendSigninLink = async (email: string, name: string, applicationId: string) => {
    const token = await auth.generateMagicLinkToken(email, applicationId);
    const templateVariant = (await signinEmailTemplates?.read())?.variantId || "professional";
    const delivery = await mailer.sendMagicLink({ to: email, name, magicLinkUrl: `${siteOrigin}/intern/verify?token=${token}`, templateVariant });
    if (!delivery?.ok) throw new DomainError("SERVICE_UNAVAILABLE", "Email delivery is temporarily unavailable. Please try again.");
    // Shows on the applicant's email timeline; a logging problem never blocks sign-in.
    await domain.recordEmail?.({ applicationId, to: email, label: "Sign-in link (requested by applicant)", status: "sent" }).catch(() => undefined);
  };
  const refresh = async (request: Request, origin: string | null) => {
    const context = safeContext(request.headers.get("x-intern-context"));
    if (!context) throw new DomainError("INVALID_REQUEST", "A browser session is required.");
    const value = parseCookies(request)[cookieName(context)];
    // No cookie is the normal signed-out state (new tab, after logout, expired),
    // so answer 401 directly instead of raising it as a request failure.
    if (!value) return sendJson({ ok: false, error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, origin, 401);
    const result = await auth.refresh(value, request.headers.get("x-intern-refresh-request"));
    return sendJson({ ok: true, data: { account: result.account, token: result.token, expiresAt: result.expiresAt } }, origin, 200, { "Set-Cookie": refreshCookie(request, context, result.refreshToken, 604800) });
  };

  return {
    async login(request: Request, origin: string | null, peerAddress = "direct") {
      const context = safeContext(request.headers.get("x-intern-context"));
      if (!context) throw new DomainError("INVALID_REQUEST", "A browser session is required.");
      const input = await request.json() as { email?: string; password?: string };
      const result = await auth.login(String(input.email || ""), String(input.password || ""), clientAddress(request, peerAddress, /^(true|1)$/i.test(process.env.REALTIME_TRUST_PROXY || "")));
      return sendJson({ ok: true, data: { account: result.account, token: result.token, expiresAt: result.expiresAt } }, origin, 200, { "Set-Cookie": refreshCookie(request, context, result.refreshToken, 604800) });
    },

    async magicLink(request: Request, origin: string | null, peerAddress = "direct") {
      const input = await request.json() as { email?: string };
      const email = String(input.email || "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new DomainError("INVALID_REQUEST", "Please enter a valid email address.");
      await limiter?.consume("emailLink", clientAddress(request, peerAddress, trustProxy()), email);
      const application = await domain.findApplicationByEmail(email);
      const eligibleForPortal = application && ["Selected", "Joined"].includes(application.status);
      if (eligibleForPortal) await sendSigninLink(application.email, application.name, application._id);
      return sendJson({ ok: true, data: { message: "If an active account exists for this email, a sign-in link has been sent to your inbox." } }, origin);
    },

    async verifyMagicLink(request: Request, origin: string | null) {
      const context = safeContext(request.headers.get("x-intern-context"));
      if (!context) throw new DomainError("INVALID_REQUEST", "A browser session is required.");
      const input = await request.json() as { token?: string };
      const rawToken = String(input.token || "").trim();
      if (!rawToken) throw new DomainError("INVALID_REQUEST", "A sign-in token is required.");
      const { email, applicationId } = await auth.redeemMagicLinkToken(rawToken);
      const account = await domain.autoProvisionAccount(applicationId, email);
      const result = await auth.createSessionForAccount(account);
      return sendJson({ ok: true, data: { account: result.account, token: result.token, expiresAt: result.expiresAt } }, origin, 200, { "Set-Cookie": refreshCookie(request, context, result.refreshToken, 604800) });
    },

    async requestPasswordReset(request: Request, origin: string | null, peerAddress = "direct") {
      const input = await request.json() as { email?: string; app?: string };
      const email = String(input.email || "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new DomainError("INVALID_REQUEST", "Please enter a valid email address.");
      await limiter?.consume("emailLink", clientAddress(request, peerAddress, trustProxy()), email);
      const user = await domain.findUserByEmail(email);
      if (!user) {
        // An applicant without an account has no password to reset. Send a
        // sign-in link instead; the account is created only when they use it.
        const application = await domain.findApplicationByEmail(email);
        const eligibleForPortal = application && ["Selected", "Joined"].includes(application.status);
        if (eligibleForPortal) await sendSigninLink(application.email, application.name, application._id);
      } else {
        const token = await auth.generatePasswordResetToken(user.email, user._id, Number(user.sessionVersion) || 1);
        const workspace = input.app === "workspace" && user.role === "company";
        const resetUrl = workspace ? `${workspaceOrigin}/dashboard/reset-password?token=${token}` : `${siteOrigin}/intern/reset-password?token=${token}`;
        const delivery = await mailer.sendPasswordResetLink({ to: user.email, name: user.name, resetUrl });
        if (!delivery?.ok) throw new DomainError("SERVICE_UNAVAILABLE", "Email delivery is temporarily unavailable. Please try again.");
      }
      return sendJson({ ok: true, data: { message: "If an account exists with this email, password reset instructions have been sent to your inbox." } }, origin);
    },

    async resetPassword(request: Request, origin: string | null) {
      const input = await request.json() as { token?: string; password?: string };
      const rawToken = String(input.token || "").trim();
      const password = String(input.password || "");
      if (!rawToken) throw new DomainError("INVALID_REQUEST", "A reset token is required.");
      if (password.length < 8 || password.length > 256) throw new DomainError("INVALID_REQUEST", "Password must be at least 8 characters.");
      const { userId, version } = await auth.verifyPasswordResetToken(rawToken);
      await domain.selfResetPassword(userId, password, version);
      return sendJson({ ok: true, data: { message: "Your password has been successfully reset. Sign in to continue." } }, origin);
    },

    refresh,

    /** Current principal for a bearer access token, checked against the database. */
    async session(request: Request, origin: string | null) {
      const { account } = await requireBearer(request);
      return sendJson({ ok: true, data: { account } }, origin);
    },

    /** Changes the signed-in account's password and signs it out everywhere. */
    async changePassword(request: Request, origin: string | null) {
      const { account } = await requireBearer(request);
      const input = await request.json() as { currentPassword?: string; newPassword?: string };
      await domain.changePassword(account.id, String(input.currentPassword || ""), String(input.newPassword || ""));
      return sendJson({ ok: true, data: { message: "Your password was changed. Sign in again on every device." } }, origin);
    },

    async logout(request: Request, origin: string | null) {
      const context = safeContext(request.headers.get("x-intern-context"));
      if (!context) throw new DomainError("INVALID_REQUEST", "A browser session is required.");
      const value = parseCookies(request)[cookieName(context)];
      if (value) await auth.revokeRefresh(value);
      const token = bearerToken(request);
      if (token) {
        try { await auth.revoke((await auth.verify(token)).sessionId); }
        catch { /* Expired access tokens can still log out through their refresh cookie. */ }
      }
      return sendJson({ ok: true }, origin, 200, { "Set-Cookie": refreshCookie(request, context, "", 0) });
    },
  };
}
