import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { InternClient, internAuth, internToken, forgetInternToken, refreshInternSession, internCommandFailure } from "../src/lib/intern-client.mjs";

globalThis.crypto ||= webcrypto;
const storage = new Map();
globalThis.sessionStorage = { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
let handler = () => {};
class FakeWebSocket {
  static OPEN = 1;
  constructor() { this.readyState = 0; setTimeout(() => { this.readyState = 1; this.onopen?.(); }, 0); }
  send(data) { handler(this, JSON.parse(data)); }
  reply(request, body) { this.onmessage?.({ data: JSON.stringify({ type: "response", id: request.id, ...body }) }); }
  close() { if (this.readyState === 3) return; this.readyState = 3; this.onclose?.(); }
}
globalThis.WebSocket = FakeWebSocket;

test("command failures preserve RPC codes and a displayable message", () => {
  assert.deepEqual(internCommandFailure(Object.assign(new Error("Choose a role"), { code: "INVALID_REQUEST" })), { ok: false, error: "Choose a role", errorCode: "INVALID_REQUEST" });
  assert.equal(internCommandFailure(new Error("Offline")).errorCode, "SERVICE_UNAVAILABLE");
});

test("write retry preserves its idempotency key after an interrupted connection", async () => {
  forgetInternToken(); const keys = []; let attempts = 0;
  handler = (socket, request) => { keys.push(request.idempotencyKey); if (++attempts === 1) socket.close(); else socket.reply(request, { ok: true, data: { saved: true } }); };
  const client = new InternClient({});
  assert.deepEqual(await client.request("application.update", { id: "a" }, true), { saved: true });
  assert.equal(attempts, 2); assert.equal(keys[0], keys[1]); assert.ok(keys[0]); client.close();
});

test("reconnecting with an expired token refreshes and reauthenticates", async () => {
  let refreshes = 0;
  globalThis.fetch = async url => ({ ok: true, async json() { if (url.endsWith("refresh")) { refreshes++; return { ok: true, data: { token: "new-token" } }; } return { ok: true, data: { token: "old-token" } }; } });
  await internAuth("login", { email: "test@example.invalid", password: "test" });
  const tokens = [];
  handler = (socket, request) => { if (request.method === "auth.authenticate") { tokens.push(request.params.token); socket.reply(request, request.params.token === "old-token" ? { ok: false, error: { code: "UNAUTHENTICATED", message: "expired" } } : { ok: true, data: {} }); } else socket.reply(request, { ok: true, data: "ready" }); };
  const client = new InternClient({});
  assert.equal(await client.request("intern.snapshot"), "ready");
  assert.deepEqual(tokens, ["old-token", "new-token"]); assert.equal(refreshes, 1); client.close(); forgetInternToken();
});

test("manual retry after two ambiguous failures reuses the key, then clears it", async () => {
  forgetInternToken(); const keys = []; let attempts = 0;
  handler = (socket, request) => { keys.push(request.idempotencyKey); if (++attempts <= 2) socket.close(); else socket.reply(request, { ok: true, data: true }); };
  const client = new InternClient({});
  await assert.rejects(client.request("message.send", { body: "hello" }, true));
  assert.equal(await client.request("message.send", { body: "hello" }, true), true);
  assert.equal(keys[0], keys[1]); assert.equal(keys[1], keys[2]);
  assert.equal(await client.request("message.send", { body: "hello" }, true), true);
  assert.notEqual(keys[2], keys[3]); client.close();
});

test("definitive server rejection clears the retry key", async () => {
  forgetInternToken(); const keys = [];
  handler = (socket, request) => { keys.push(request.idempotencyKey); socket.reply(request, { ok: false, error: { code: "INVALID_REQUEST", message: "invalid" } }); };
  const client = new InternClient({});
  await assert.rejects(client.request("message.send", { body: "bad" }, true));
  await assert.rejects(client.request("message.send", { body: "bad" }, true));
  assert.notEqual(keys[0], keys[1]); client.close();
});

test("database failures retain the same idempotency key for an ambiguous write", async () => {
  forgetInternToken(); const keys = []; let attempts = 0;
  handler = (socket, request) => { keys.push(request.idempotencyKey); socket.reply(request, ++attempts === 1 ? { ok: false, error: { code: "SERVICE_UNAVAILABLE", message: "Retry" } } : { ok: true, data: true }); };
  const client = new InternClient({});
  await assert.rejects(client.request("settings.update", { patch: { programName: "Example" } }, true));
  assert.equal(await client.request("settings.update", { patch: { programName: "Example" } }, true), true);
  assert.equal(keys[0], keys[1]); client.close();
});

test("an authentication failure may follow a committed write, so its retry keeps the key", async () => {
  forgetInternToken(); const keys = []; let attempts = 0;
  handler = (socket, request) => { keys.push(request.idempotencyKey); socket.reply(request, ++attempts === 1 ? { ok: false, error: { code: "UNAUTHENTICATED", message: "Sign in again" } } : { ok: true, data: true }); };
  const client = new InternClient({});
  await assert.rejects(client.request("settings.update", { patch: { programName: "Example" } }, true));
  assert.equal(await client.request("settings.update", { patch: { programName: "Example" } }, true), true);
  assert.equal(keys[0], keys[1]); client.close();
});

test("refresh retries reuse their request ID after a lost response", async () => {
  forgetInternToken(); const requests = []; let count = 0;
  globalThis.fetch = async (url, options) => {
    if (url.endsWith("login")) return { ok: true, async json() { return { ok: true, data: { token: "access-old" } }; } };
    requests.push(options.headers["X-Intern-Refresh-Request"]);
    if (++count === 1) throw new TypeError("connection lost");
    return { ok: true, async json() { return { ok: true, data: { token: `access-${count}` } }; } };
  };
  await internAuth("login", { email: "test@example.invalid", password: "test" });
  await assert.rejects(refreshInternSession(), /connection lost/);
  assert.equal(internToken(), "access-old");
  await refreshInternSession();
  assert.equal(requests[0], requests[1]); assert.ok(requests[0]);
  await refreshInternSession();
  assert.notEqual(requests[1], requests[2]); forgetInternToken();
});

test("a pending refresh request ID survives a same-tab reload", async () => {
  forgetInternToken(); const requests = []; let attempts = 0;
  globalThis.fetch = async (url, options) => {
    if (url.endsWith("login")) return { ok: true, async json() { return { ok: true, data: { token: "old-token" } }; } };
    requests.push(options.headers["X-Intern-Refresh-Request"]);
    if (++attempts === 1) throw new TypeError("response lost");
    return { ok: true, async json() { return { ok: true, data: { token: "new-token" } }; } };
  };
  await internAuth("login", { email: "test@example.invalid", password: "test" });
  await assert.rejects(refreshInternSession(), /response lost/);
  const afterReload = await import("../src/lib/intern-client.mjs?refresh-reload-test");
  await afterReload.refreshInternSession();
  assert.equal(requests[0], requests[1]);
  assert.equal(afterReload.internToken(), "new-token");
  afterReload.forgetInternToken(); forgetInternToken();
});

test("an authentication deadline is a temporary error and retains the session", async () => {
  forgetInternToken();
  globalThis.fetch = async () => ({ ok: true, async json() { return { ok: true, data: { token: "access-old" } }; } });
  await internAuth("login", { email: "test@example.invalid", password: "test" });
  const originalTimeout = globalThis.setTimeout;
  try {
    globalThis.setTimeout = (callback, delay, ...args) => delay === 15000 ? (queueMicrotask(() => callback(...args)), 0) : originalTimeout(callback, delay, ...args);
    globalThis.fetch = async (_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true }));
    await assert.rejects(refreshInternSession(), error => error.code === "SERVICE_UNAVAILABLE");
    assert.equal(internToken(), "access-old");
  } finally { globalThis.setTimeout = originalTimeout; forgetInternToken(); }
});

test("reconnection does not clear the token when refresh is temporarily unavailable", async () => {
  forgetInternToken();
  globalThis.fetch = async url => url.endsWith("login") ? { ok: true, async json() { return { ok: true, data: { token: "old-token" } }; } } : { ok: false, async json() { return { ok: false, error: { code: "SERVICE_UNAVAILABLE", message: "Retry" } }; } };
  await internAuth("login", { email: "test@example.invalid", password: "test" });
  handler = (socket, request) => socket.reply(request, { ok: false, error: { code: "UNAUTHENTICATED", message: "expired" } });
  const client = new InternClient({});
  await assert.rejects(client.connect(), error => error.code === "SERVICE_UNAVAILABLE");
  assert.equal(internToken(), "old-token"); client.close(); forgetInternToken();
});

test("a failed logout prevents silent restoration until explicit login revokes the old session", async () => {
  forgetInternToken(); const calls = []; let logoutAttempts = 0;
  globalThis.fetch = async url => {
    const action = url.slice(url.lastIndexOf("/") + 1); calls.push(action);
    if (action === "logout" && ++logoutAttempts === 1) throw new TypeError("offline");
    return { ok: true, async json() { return { ok: true, data: action === "login" ? { token: "new-token" } : undefined }; } };
  };
  await internAuth("login", { email: "test@example.invalid", password: "test" });
  await assert.rejects(internAuth("logout"), /offline/);
  forgetInternToken();
  await assert.rejects(refreshInternSession(), error => error.code === "UNAUTHENTICATED");
  assert.deepEqual(calls, ["login", "logout"]);
  await internAuth("login", { email: "test@example.invalid", password: "test" });
  assert.deepEqual(calls, ["login", "logout", "logout", "login"]);
  assert.equal(internToken(), "new-token"); forgetInternToken();
});

test("logout waits for an in-flight rotation before revoking the session", async () => {
  forgetInternToken(); let finishRefresh, logoutCalls = 0, logoutBearer;
  globalThis.fetch = async (url, options) => {
    if (url.endsWith("login")) return { ok: true, async json() { return { ok: true, data: { token: "old-token" } }; } };
    if (url.endsWith("refresh")) return await new Promise(resolve => { finishRefresh = () => resolve({ ok: true, async json() { return { ok: true, data: { token: "rotated-token" } }; } }); });
    logoutCalls++; logoutBearer = options.headers.Authorization;
    return { ok: true, async json() { return { ok: true }; } };
  };
  await internAuth("login", { email: "test@example.invalid", password: "test" });
  const refreshing = refreshInternSession(), logout = internAuth("logout");
  await Promise.resolve(); assert.equal(logoutCalls, 0);
  finishRefresh(); await refreshing; await logout;
  assert.equal(logoutCalls, 1); assert.equal(logoutBearer, "Bearer rotated-token"); assert.equal(internToken(), null);
});

test("a session-change event clears the token and notifies the workspace", async () => {
  globalThis.fetch = async () => ({ ok:true, async json() { return { ok:true, data:{token:"staff-token"} }; } });
  await internAuth("login", { email:"staff@example.test", password:"test" });
  handler = (socket, request) => socket.reply(request, {ok:true,data:{}});
  let changed = 0; const client = new InternClient({onSessionChanged:()=>changed++});
  await client.connect();
  client.socket.onmessage({ data:JSON.stringify({ type:"event",event:"intern.session_changed" }) });
  assert.equal(changed, 1); assert.equal(internToken(), null); assert.equal(client.socket, null);
  client.close();
});

test("connection and change events are distinguishable for snapshot coalescing", async () => {
  forgetInternToken();
  const reasons = [];
  handler = (socket, request) => socket.reply(request, { ok: true, data: {} });
  const client = new InternClient({ onChange: reason => reasons.push(reason) });
  await client.connect();
  client.socket.onmessage({ data: JSON.stringify({ type: "event", event: "intern.changed" }) });
  assert.deepEqual(reasons, ["connected", "changed"]);
  client.close();
});

test("public application and resume upload leave a signed-in staff session intact", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    return { ok: true, json: async () => ({ ok: true, data: url.endsWith("login") ? { token: "staff-session" } : { id: "resume", accessToken: "upload-proof" } }) };
  };
  const client = new InternClient({ publicOnly: true });
  try {
    await internAuth("login", { email: "admin@example.test", password: "test" });
    const methods = [];
    handler = (socket, request) => { methods.push(request.method); socket.reply(request, { ok: true, data: { received: true } }); };
    assert.deepEqual(await client.request("application.submit", { email: "candidate@example.test" }, true), { received: true });
    assert.deepEqual(methods, ["application.submit"]);
    assert.equal(await client.authenticate(), null);
    const { saveAttachment } = await import("../src/lib/intern-attachments.mjs");
    const file = { name: "resume.pdf", size: 100, type: "application/pdf" };
    await saveAttachment(file, "resume", { publicUpload: true });
    assert.equal(requests.at(-1).options.headers.Authorization, undefined);
    assert.equal(requests.at(-1).options.credentials, "omit");
    await saveAttachment(file, "work");
    assert.equal(requests.at(-1).options.headers.Authorization, "Bearer staff-session");
    assert.equal(internToken(), "staff-session");
  } finally { client.close(); forgetInternToken(); globalThis.fetch = originalFetch; }
});

test("the apply form submits over one HTTP request and reuses its key on retry", async () => {
  const { submitApplication } = await import("../src/lib/intern-client.mjs");
  const calls = [];
  let failFirst = true;
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (failFirst) { failFirst = false; throw new TypeError("network down"); }
    return { ok: true, status: 200, json: async () => ({ ok: true, data: { received: true, applicationId: "OL-1" } }) };
  };
  const payload = { email: "candidate@example.test", name: "Candidate" };
  assert.deepEqual(await submitApplication(payload, { fetchImpl }), { received: true, applicationId: "OL-1" });
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /\/intern\/applications$/);
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.credentials, "omit");
  assert.equal(calls[0].options.headers["Content-Type"], "application/json");
  assert.match(calls[0].options.headers["Idempotency-Key"], /^[a-f0-9]{32}$/);
  assert.equal(calls[1].options.headers["Idempotency-Key"], calls[0].options.headers["Idempotency-Key"]);
  assert.deepEqual(JSON.parse(calls[0].options.body), payload);
});

test("application errors keep their code and a fresh key follows a rejection", async () => {
  const { submitApplication, internCommandFailure } = await import("../src/lib/intern-client.mjs");
  const keys = [];
  const fetchImpl = async (_url, options) => {
    keys.push(options.headers["Idempotency-Key"]);
    return { ok: false, status: 409, json: async () => ({ ok: false, error: { code: "ALREADY_APPLIED", message: "An application already exists for this email address." } }) };
  };
  const payload = { email: "dupe@example.test" };
  const error = await submitApplication(payload, { fetchImpl }).catch(caught => caught);
  assert.deepEqual(internCommandFailure(error), { ok: false, error: "An application already exists for this email address.", errorCode: "ALREADY_APPLIED" });
  await submitApplication(payload, { fetchImpl }).catch(() => {});
  assert.equal(keys.length, 2);
  assert.notEqual(keys[0], keys[1]);
  const unavailable = await submitApplication({ email: "x@example.test" }, { fetchImpl: async () => ({ ok: false, status: 502, json: async () => { throw new Error("html"); } }) }).catch(caught => caught);
  assert.equal(unavailable.code, "SERVICE_UNAVAILABLE");
});
