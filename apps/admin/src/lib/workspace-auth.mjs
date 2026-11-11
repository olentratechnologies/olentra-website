// Company workspace sign-in against the realtime server's staff accounts.
// Access tokens stay in memory; the refresh credential is an HttpOnly cookie
// scoped to this browser tab (the same model as the internship dashboard).
const CONTEXT_KEY = "olentra_workspace_context_v1";
const REFRESH_ATTEMPT_KEY = "olentra_workspace_refresh_attempt_v1";
const LOGOUT_PENDING_KEY = "olentra_workspace_logout_pending_v1";

let accessToken = null;
let context;
let refreshing = null;
let refreshAttempt = null;
let logoutPending = false;

export function workspaceAuthEndpoint() {
  const configured = process.env.NEXT_PUBLIC_INTERNSHIP_BACKEND_URL;
  const localHost = typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname) ? window.location.hostname : "localhost";
  return (configured || `http://${localHost}:3003`).replace(/\/$/, "");
}

const storage = () => { try { return globalThis.sessionStorage || null; } catch { return null; } };
const randomId = () => globalThis.crypto.randomUUID().replaceAll("-", "");
const apiError = (error, status) => Object.assign(new Error(error?.message || "The sign-in service is unavailable. Please try again."), { code: error?.code || (status ? "HTTP_" + status : "SERVICE_UNAVAILABLE") });

function sessionContext() {
  if (context) return context;
  try { context = storage()?.getItem(CONTEXT_KEY) || null; } catch {}
  if (!context || !/^[A-Za-z0-9_-]{16,128}$/.test(context)) { context = randomId(); try { storage()?.setItem(CONTEXT_KEY, context); } catch {} }
  return context;
}
function currentRefreshAttempt() {
  if (refreshAttempt) return refreshAttempt;
  try { refreshAttempt = storage()?.getItem(REFRESH_ATTEMPT_KEY) || null; } catch {}
  if (!refreshAttempt || !/^[A-Za-z0-9_-]{16,128}$/.test(refreshAttempt)) {
    refreshAttempt = randomId();
    try { storage()?.setItem(REFRESH_ATTEMPT_KEY, refreshAttempt); } catch {}
  }
  return refreshAttempt;
}
function clearRefreshAttempt() { refreshAttempt = null; try { storage()?.removeItem(REFRESH_ATTEMPT_KEY); } catch {} }
function hasPendingLogout() { try { return logoutPending || storage()?.getItem(LOGOUT_PENDING_KEY) === "1"; } catch { return logoutPending; } }
function setPendingLogout(value) { logoutPending = value; try { if (value) storage()?.setItem(LOGOUT_PENDING_KEY, "1"); else storage()?.removeItem(LOGOUT_PENDING_KEY); } catch {} }

async function call(path, { method = "POST", body, refreshRequestId, bearer = true } = {}) {
  const abort = new AbortController(), timer = setTimeout(() => abort.abort(), 15000);
  try {
    const response = await fetch(workspaceAuthEndpoint() + path, {
      method,
      credentials: "include",
      signal: abort.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Intern-Context": sessionContext(),
        ...(refreshRequestId ? { "X-Intern-Refresh-Request": refreshRequestId } : {}),
        ...(bearer && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    let result = null;
    try { result = await response.json(); } catch {}
    if (!response.ok || !result?.ok) throw apiError(result?.error, response.status);
    return result.data;
  } catch (error) {
    if (abort.signal.aborted) throw apiError({ code: "SERVICE_UNAVAILABLE", message: "The sign-in service is taking too long. Please retry." });
    if (error?.code) throw error;
    throw apiError({ code: "SERVICE_UNAVAILABLE", message: "The sign-in service is unreachable. Check your connection and retry." });
  } finally { clearTimeout(timer); }
}

export const workspaceAccessToken = () => accessToken;

export async function signInToWorkspace(email, password) {
  // A refresh rotates the cookie. Let it finish before login replaces it so a
  // delayed refresh response cannot overwrite the newly signed-in session.
  if (refreshing) { try { await refreshing; } catch {} }
  // Finish any pending server-side sign-out before starting a new session.
  if (hasPendingLogout()) await signOutOfWorkspace();
  const data = await call("/intern/auth/login", { body: { email, password }, bearer: false });
  accessToken = data.token; clearRefreshAttempt(); setPendingLogout(false);
  return data.account;
}

/** Restores or renews the session. Resolves to the account, or null when signed out. */
export async function restoreWorkspaceSession() {
  if (hasPendingLogout()) return null;
  if (!refreshing) {
    refreshing = call("/intern/auth/refresh", { refreshRequestId: currentRefreshAttempt(), bearer: false })
      .then(data => { accessToken = data.token; clearRefreshAttempt(); return data.account; })
      .catch(error => { if (error.code === "UNAUTHENTICATED") { accessToken = null; clearRefreshAttempt(); return null; } throw error; })
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}

export async function signOutOfWorkspace() {
  setPendingLogout(true);
  if (refreshing) { try { await refreshing; } catch {} }
  try { await call("/intern/auth/logout"); setPendingLogout(false); }
  finally { accessToken = null; clearRefreshAttempt(); }
}

/** Drops the in-memory token without contacting the server (e.g. after revocation). */
export function forgetWorkspaceSession() { accessToken = null; clearRefreshAttempt(); }

export async function changeWorkspacePassword(currentPassword, newPassword) {
  if (!accessToken) await restoreWorkspaceSession();
  let data;
  try { data = await call("/intern/auth/change-password", { body: { currentPassword, newPassword } }); }
  catch (error) {
    if (error.code !== "UNAUTHENTICATED" || !await restoreWorkspaceSession()) throw error;
    data = await call("/intern/auth/change-password", { body: { currentPassword, newPassword } });
  }
  forgetWorkspaceSession();
  return data;
}

export const requestWorkspacePasswordReset = email => call("/intern/auth/request-password-reset", { body: { email, app: "workspace" }, bearer: false });
export const resetWorkspacePassword = (token, password) => call("/intern/auth/reset-password", { body: { token, password }, bearer: false });

/** Calls an admin-app API with the staff access token, renewing it once on 401. */
export async function withWorkspaceToken(request) {
  if (!accessToken) await restoreWorkspaceSession();
  let response = await request(accessToken);
  if (response.status === 401 && await restoreWorkspaceSession()) response = await request(accessToken);
  return response;
}
