import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { randomUUID } from "node:crypto";

const source = readFileSync(new URL("../src/lib/workspace-auth.mjs", import.meta.url), "utf8").replace(/^export /gm, "");
const account = { id: "staff-1", role: "company", staffRole: "admin", email: "staff@example.test" };
const success = data => ({ ok: true, status: 200, json: async () => ({ ok: true, data }) });
const failure = (code, status = 401) => ({ ok: false, status, json: async () => ({ ok: false, error: { code, message: code } }) });
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

function client(respond, { saved = new Map(), blocked = false } = {}) {
  const calls = [];
  const sessionStorage = {
    getItem: key => { if (blocked) throw new Error("Storage blocked"); return saved.get(key) ?? null; },
    setItem: (key, value) => { if (blocked) throw new Error("Storage blocked"); saved.set(key, value); },
    removeItem: key => { if (blocked) throw new Error("Storage blocked"); saved.delete(key); },
  };
  const api = runInNewContext(`${source}\n({signInToWorkspace,restoreWorkspaceSession,signOutOfWorkspace,workspaceAccessToken,withWorkspaceToken,changeWorkspacePassword,requestWorkspacePasswordReset,resetWorkspacePassword});`, {
    sessionStorage, crypto: { randomUUID }, AbortController, setTimeout, clearTimeout,
    process: { env: { NEXT_PUBLIC_INTERNSHIP_BACKEND_URL: "https://staff.example.test/" } },
    fetch: async (url, options) => { calls.push({ url, ...options }); return respond(url, options, calls.length); },
  });
  return { ...api, calls, saved };
}

test("login works with blocked browser storage and sends no stale bearer credential", async () => {
  const auth = client(() => success({ token: "staff-token", account }), { blocked: true });
  await auth.signInToWorkspace("staff@example.test", "long password");
  assert.equal(auth.workspaceAccessToken(), "staff-token");
  assert.equal(auth.calls[0].url, "https://staff.example.test/intern/auth/login");
  assert.equal(auth.calls[0].credentials, "include");
  assert.match(auth.calls[0].headers["X-Intern-Context"], /^[a-f0-9]{32}$/);
  assert.equal(auth.calls[0].headers.Authorization, undefined);
});

test("refresh coalesces requests and preserves the attempt ID after an uncertain response", async () => {
  const wait = deferred();
  const auth = client((_url, _options, count) => count === 1 ? wait.promise : success({ token: "new-token", account }));
  const first = auth.restoreWorkspaceSession();
  const second = auth.restoreWorkspaceSession();
  assert.equal(auth.calls.length, 1);
  wait.resolve(failure("SERVICE_UNAVAILABLE", 503));
  await assert.rejects(first, { code: "SERVICE_UNAVAILABLE" });
  await assert.rejects(second, { code: "SERVICE_UNAVAILABLE" });
  const attempt = auth.calls[0].headers["X-Intern-Refresh-Request"];
  await auth.restoreWorkspaceSession();
  assert.equal(auth.calls[1].headers["X-Intern-Refresh-Request"], attempt);
  assert.equal(auth.workspaceAccessToken(), "new-token");
  assert.equal(auth.saved.has("olentra_workspace_refresh_attempt_v1"), false);
});

test("an unauthenticated refresh clears the access token and consumed attempt", async () => {
  const auth = client((_url, _options, count) => count === 1 ? success({ token: "old-token", account }) : failure("UNAUTHENTICATED"));
  await auth.signInToWorkspace("staff@example.test", "long password");
  assert.equal(await auth.restoreWorkspaceSession(), null);
  assert.equal(auth.workspaceAccessToken(), null);
  assert.equal(auth.saved.has("olentra_workspace_refresh_attempt_v1"), false);
});

test("pending logout survives reload and must finish before an explicit new login", async () => {
  const saved = new Map();
  const first = client(() => failure("SERVICE_UNAVAILABLE", 503), { saved });
  await assert.rejects(first.signOutOfWorkspace(), { code: "SERVICE_UNAVAILABLE" });
  assert.equal(first.workspaceAccessToken(), null);
  const next = client(() => failure("SERVICE_UNAVAILABLE", 503), { saved });
  assert.equal(await next.restoreWorkspaceSession(), null);
  assert.equal(next.calls.length, 0);
  await assert.rejects(next.signInToWorkspace("staff@example.test", "long password"), { code: "SERVICE_UNAVAILABLE" });
  assert.equal(next.calls.length, 1);
  assert.match(next.calls[0].url, /\/logout$/);
  const recovered = client((url) => success(url.endsWith("/login") ? { token: "new-token", account } : {}), { saved });
  await recovered.signInToWorkspace("staff@example.test", "long password");
  assert.deepEqual(recovered.calls.map(call => call.url.split("/").at(-1)), ["logout", "login"]);
  assert.equal(saved.has("olentra_workspace_logout_pending_v1"), false);
});

test("new login waits for an in-flight refresh before replacing its cookie and token", async () => {
  const wait = deferred();
  const auth = client(url => url.endsWith("/refresh") ? wait.promise : success({ token: "login-token", account }));
  const restore = auth.restoreWorkspaceSession();
  const login = auth.signInToWorkspace("staff@example.test", "long password");
  assert.equal(auth.calls.length, 1);
  wait.resolve(success({ token: "refresh-token", account }));
  await restore;
  await login;
  assert.deepEqual(auth.calls.map(call => call.url.split("/").at(-1)), ["refresh", "login"]);
  assert.equal(auth.workspaceAccessToken(), "login-token");
});

test("staff-authorized API calls renew once on 401 and retry with the new token", async () => {
  const auth = client((_url, _options, count) => success({ token: count === 1 ? "old-token" : "new-token", account }));
  await auth.signInToWorkspace("staff@example.test", "long password");
  const tokens = [];
  const response = await auth.withWorkspaceToken(token => { tokens.push(token); return { status: tokens.length === 1 ? 401 : 200 }; });
  assert.equal(response.status, 200);
  assert.deepEqual(tokens, ["old-token", "new-token"]);
});

test("password change renews an expired session and drops the token after revocation", async () => {
  let changes = 0;
  const auth = client(url => {
    if (url.endsWith("/change-password")) return ++changes === 1 ? failure("UNAUTHENTICATED") : success({ changed: true });
    return success({ token: changes ? "new-token" : "old-token", account });
  });
  await auth.signInToWorkspace("staff@example.test", "long password");
  await auth.changeWorkspacePassword("old password", "new long password");
  assert.deepEqual(auth.calls.map(call => call.url.split("/").at(-1)), ["login", "change-password", "refresh", "change-password"]);
  assert.equal(auth.calls.at(-1).headers.Authorization, "Bearer new-token");
  assert.equal(auth.workspaceAccessToken(), null);
});

test("recovery requests target the workspace and never attach access tokens", async () => {
  const auth = client(url => success(url.endsWith("/login") ? { token: "staff-token", account } : { message: "Sent" }));
  await auth.signInToWorkspace("staff@example.test", "long password");
  await auth.requestWorkspacePasswordReset("staff@example.test");
  await auth.resetWorkspacePassword("one-use-link", "new long password");
  assert.equal(JSON.parse(auth.calls[1].body).app, "workspace");
  assert.equal(auth.calls[1].headers.Authorization, undefined);
  assert.equal(auth.calls[2].headers.Authorization, undefined);
});
