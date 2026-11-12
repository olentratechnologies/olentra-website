// Shared transport for the dedicated internship service. Tokens stay in memory;
// the refresh credential is an HttpOnly cookie scoped to a tab-specific context.
const endpoint = () => {
  const configured = process.env.NEXT_PUBLIC_INTERNSHIP_BACKEND_URL;
  const legacy = process.env.NEXT_PUBLIC_INTERN_BACKEND_URL;
  if (!configured && legacy && !warnedLegacyInternshipEnv) {
    warnedLegacyInternshipEnv = true;
    console.warn("[deprecated-env] NEXT_PUBLIC_INTERN_BACKEND_URL is deprecated; use NEXT_PUBLIC_INTERNSHIP_BACKEND_URL.");
  }
  const localHost = typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname) ? window.location.hostname : "localhost";
  return (configured || legacy || `http://${localHost}:3003`).replace(/\/$/, "");
};
let accessToken = null;
let context;
let refreshing;
let refreshAttempt;
let logoutPending = false;
let warnedLegacyInternshipEnv = false;
const REFRESH_ATTEMPT_KEY = "olentra_intern_refresh_attempt_v1";
const LOGOUT_PENDING_KEY = "olentra_intern_logout_pending_v1";
const uncertainError = error => !error?.code || ["SERVICE_UNAVAILABLE", "INTERNAL", "UNAUTHENTICATED"].includes(error.code);
const apiError = (error) => Object.assign(new Error(error?.message || "The internship service is unavailable. Please try again."), { code: error?.code });
function sessionContext() {
  if (context) return context;
  try {
    context = sessionStorage.getItem("olentra_intern_context_v1");
    if (!context) { context = crypto.randomUUID().replaceAll("-", ""); sessionStorage.setItem("olentra_intern_context_v1", context); }
  } catch { context = crypto.randomUUID().replaceAll("-", ""); }
  return context;
}
export function internEndpoint() { return endpoint(); }
export function realtimeWebSocketEndpoint() {
  const configured = process.env.NEXT_PUBLIC_REALTIME_WS_URL;
  const base = configured || endpoint();
  const url = new URL(base);
  url.protocol = url.protocol === "https:" || url.protocol === "wss:" ? "wss:" : "ws:";
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}
export function internToken() { return accessToken; }
function clearRefreshAttempt() { refreshAttempt = null; try { sessionStorage.removeItem(REFRESH_ATTEMPT_KEY); } catch {} }
function currentRefreshAttempt() {
  if (refreshAttempt) return refreshAttempt;
  try { refreshAttempt = sessionStorage.getItem(REFRESH_ATTEMPT_KEY); } catch {}
  if (!refreshAttempt || !/^[A-Za-z0-9_-]{16,128}$/.test(refreshAttempt)) {
    refreshAttempt = crypto.randomUUID().replaceAll("-", "");
    try { sessionStorage.setItem(REFRESH_ATTEMPT_KEY, refreshAttempt); } catch {}
  }
  return refreshAttempt;
}
function hasPendingLogout() { try { return logoutPending || sessionStorage.getItem(LOGOUT_PENDING_KEY) === "1"; } catch { return logoutPending; } }
export const internLogoutPending = () => hasPendingLogout();
function setPendingLogout(value) { logoutPending = value; try { if (value) sessionStorage.setItem(LOGOUT_PENDING_KEY, "1"); else sessionStorage.removeItem(LOGOUT_PENDING_KEY); } catch {} }
export async function internAuth(action, input, options = {}) {
  // Do not restore an old HttpOnly cookie after the user asked to sign out.
  // Before an explicit new login, finish any pending server-side revocation.
  if (action === "login" && hasPendingLogout()) await internAuth("logout");
  if (action === "logout") { setPendingLogout(true); if (refreshing) { try { await refreshing; } catch {} } }
  const abort = new AbortController(), timer = setTimeout(() => abort.abort(), 15000);
  try {
    const response = await fetch(`${endpoint()}/intern/auth/${action}`, { method: "POST", credentials: "include", signal: abort.signal, headers: { "Content-Type": "application/json", "X-Intern-Context": sessionContext(), ...(options.refreshRequestId ? { "X-Intern-Refresh-Request": options.refreshRequestId } : {}), ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }, ...(input ? { body: JSON.stringify(input) } : {}) });
    const result = await response.json();
    if (!response.ok || !result.ok) throw apiError(result.error);
    if (result.data?.token) accessToken = result.data.token;
    if (action === "login" || action === "logout") { clearRefreshAttempt(); setPendingLogout(false); }
    if (action === "logout") accessToken = null;
    return result.data;
  } catch (error) {
    if (abort.signal.aborted) throw apiError({ code: "SERVICE_UNAVAILABLE", message: "The internship service is taking too long. Please retry." });
    throw error;
  } finally { clearTimeout(timer); }
}
export async function refreshInternSession() {
  if (hasPendingLogout()) throw apiError({ code: "UNAUTHENTICATED", message: "You are signed out." });
  if (!refreshing) refreshing = internAuth("refresh", undefined, { refreshRequestId: currentRefreshAttempt() }).then(value => { clearRefreshAttempt(); return value; }).catch(error => { if (error.code === "UNAUTHENTICATED") clearRefreshAttempt(); throw error; }).finally(() => { refreshing = null; });
  return refreshing;
}
export function forgetInternToken() { accessToken = null; clearRefreshAttempt(); }

export class InternClient {
  constructor({ onChange, onConnection, onSessionChanged }) { this.onChange = onChange; this.onConnection = onConnection; this.onSessionChanged = onSessionChanged; this.pending = new Map(); this.retryKeys = new Map(); this.closed = false; this.socket = null; this.opening = null; this.authenticatedToken = null; this.authenticatedAccount = null; this.insightsListeners = new Set(); this.staffListeners = new Set(); }
  /** Staff-only live events, e.g. `intern.application_created` with the applicant's name and track. */
  addStaffListener(listener) { this.staffListeners.add(listener); return () => this.staffListeners.delete(listener); }
  /** Receives pushed public insights (`intern.insights`) and viewer-count (`intern.insights.viewers`) events. */
  addInsightsListener(listener) { this.insightsListeners.add(listener); return () => this.insightsListeners.delete(listener); }
  connect() {
    if (this.closed) return Promise.reject(new Error("The internship service is unavailable."));
    if (this.socket?.readyState === WebSocket.OPEN) return Promise.resolve();
    if (this.opening) return this.opening;
    this.opening = new Promise((resolve, reject) => {
      const url = new URL(`${realtimeWebSocketEndpoint()}/ws/intern`);
      const socket = new WebSocket(url); this.socket = socket;
      let settled = false;
      socket.onopen = async () => {
        try { if (accessToken) { try { const token=accessToken; this.authenticatedAccount=await this.send("auth.authenticate", { token }); this.authenticatedToken=token; } catch (error) { if (error.code !== "UNAUTHENTICATED") throw error; try { await refreshInternSession(); const token=accessToken; this.authenticatedAccount=await this.send("auth.authenticate", { token }); this.authenticatedToken=token; } catch (refreshError) { if (refreshError.code !== "UNAUTHENTICATED") throw refreshError; forgetInternToken(); await this.send("auth.authenticate", { token: null }); this.authenticatedToken=null; this.authenticatedAccount=null; } } } settled = true; this.onConnection?.(true); resolve(); this.onChange?.("connected"); }
        catch (error) { settled = true; reject(error); socket.close(); }
      };
      socket.onmessage = (event) => {
        let message; try { message = JSON.parse(event.data); } catch { return; }
        if (message.type === "event" && message.event === "intern.session_changed") { forgetInternToken(); this.onSessionChanged?.(); socket.close(); return; }
        if (message.type === "event" && message.event === "intern.changed") this.onChange?.("changed");
        if (message.type === "event" && (message.event === "intern.insights" || message.event === "intern.insights.viewers")) { for (const listener of this.insightsListeners) listener(message); return; }
        if (message.type === "event" && message.event === "intern.application_created") { for (const listener of this.staffListeners) listener(message); return; }
        if (message.type !== "response") return;
        const pending = this.pending.get(message.id); if (!pending) return;
        this.pending.delete(message.id); clearTimeout(pending.timer);
        if (message.ok) pending.resolve(message.data); else pending.reject(apiError(message.error));
      };
      socket.onclose = () => {
        if (this.socket !== socket) return;
        this.socket = null;
        this.authenticatedToken = null; this.authenticatedAccount = null;
        this.onConnection?.(false);
        for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(new Error("Connection interrupted. Please retry.")); }
        this.pending.clear();
        if (!settled) { settled = true; reject(new Error("The internship service is unavailable. Please try again.")); }
        if (!this.closed) this.retryTimer = setTimeout(() => this.connect().catch(() => {}), 2000);
      };
      socket.onerror = () => socket.close();
    }).finally(() => { this.opening = null; });
    return this.opening;
  }
  send(method, params = {}, idempotencyKey) {
    return new Promise((resolve, reject) => {
      if (this.socket?.readyState !== WebSocket.OPEN) return reject(new Error("The internship service is unavailable. Please try again."));
      const id = crypto.randomUUID();
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error("The request timed out. Please retry.")); }, 20000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ type: "request", id, method, params, ...(idempotencyKey ? { idempotencyKey } : {}) }));
    });
  }
  async request(method, params = {}, write = false) {
    let fingerprint, key;
    if (write) {
      const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify({ method, params })));
      fingerprint = Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, "0")).join("");
      const now = Date.now();
      for (const [hash, value] of this.retryKeys) if (now - value.createdAt > 60 * 60 * 1000) this.retryKeys.delete(hash);
      let saved = this.retryKeys.get(fingerprint);
      if (!saved) { if (this.retryKeys.size >= 128) this.retryKeys.delete(this.retryKeys.keys().next().value); saved = { key: crypto.randomUUID().replaceAll("-", ""), createdAt: now }; this.retryKeys.set(fingerprint, saved); }
      key = saved.key;
    }
    try {
      await this.connect();
      let value;
      try { value = await this.send(method, params, key); }
      catch (error) {
        if (error.code === "UNAUTHENTICATED" && accessToken) { await refreshInternSession(); await this.authenticate(); value = await this.send(method, params, key); }
        else if (!error.code && write) { await this.connect(); value = await this.send(method, params, key); }
        else throw error;
      }
      if (fingerprint) this.retryKeys.delete(fingerprint);
      return value;
    } catch (error) {
      // An explicit server rejection is final; network errors may have occurred
      // after commit, so a manual retry must reuse the same key.
      if (fingerprint && !uncertainError(error)) this.retryKeys.delete(fingerprint);
      throw error;
    }
  }
  async authenticate() { await this.connect(); const token=accessToken; if(this.authenticatedToken===token)return this.authenticatedAccount; const account=await this.send("auth.authenticate", { token }); this.authenticatedToken=token; this.authenticatedAccount=account; return account; }
  close() { this.closed = true; this.retryKeys.clear(); clearTimeout(this.retryTimer); this.socket?.close(); }
}
