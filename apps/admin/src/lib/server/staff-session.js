import { workspaceRole } from "../workspace-access.mjs";

// Server-to-server address of the realtime account service. Falls back to the
// browser-facing URL, which is the same service in most deployments.
const accountService = () => (process.env.INTERNSHIP_BACKEND_URL || process.env.NEXT_PUBLIC_INTERNSHIP_BACKEND_URL || "http://127.0.0.1:3003").replace(/\/$/, "");

/**
 * Resolves the staff account behind a request's bearer access token by asking
 * the account service, which checks the session, role and revocation state.
 * Returns { account, role } or a { status, error } failure.
 */
export async function verifyStaffRequest(request) {
  const header = request.headers.get("authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "");
  if (!token || token === header) return { status: 401, error: "Sign in to the company workspace to change live settings." };
  let response;
  try {
    response = await fetch(accountService() + "/intern/auth/session", { headers: { Authorization: "Bearer " + token }, cache: "no-store", signal: AbortSignal.timeout(8000) });
  } catch {
    return { status: 503, error: "The account service is unavailable. Try again shortly." };
  }
  if (response.status === 401) return { status: 401, error: "Your session has expired. Sign in again." };
  if (!response.ok) return { status: 503, error: "The account service could not verify your session." };
  const result = await response.json().catch(() => null);
  const account = result?.data?.account;
  if (result?.ok !== true || !account || typeof account.id !== "string" || typeof account.email !== "string") return { status: 503, error: "The account service returned an invalid session." };
  const role = workspaceRole(account);
  if (!role) return { status: 403, error: "Your staff role has no company workspace access." };
  return { account, role };
}
