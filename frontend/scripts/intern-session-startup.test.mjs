import test from "node:test";
import assert from "node:assert/strict";
import { prepareInternSession } from "../src/lib/intern-session-startup.mjs";

function deferred() {
  let resolve, reject;
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}

test("restoration and socket connection run concurrently before authentication", async () => {
  const restore = deferred(), connect = deferred(), calls = [];
  const startup = prepareInternSession({
    restore: () => { calls.push("restore"); return restore.promise; },
    connect: () => { calls.push("connect"); return connect.promise; },
    authenticate: async () => { calls.push("authenticate"); return { id: "staff", role: "company" }; },
    clear: () => calls.push("clear"), isActive: () => true,
  });
  assert.deepEqual(calls, ["restore", "connect"]);
  connect.resolve(); await Promise.resolve();
  assert.deepEqual(calls, ["restore", "connect"]);
  restore.resolve({ account: { id: "staff" } });
  assert.deepEqual(await startup, { account: { id: "staff", role: "company" } });
  assert.deepEqual(calls, ["restore", "connect", "authenticate"]);
});

test("a missing refresh cookie clears a stale token before binding an anonymous socket", async () => {
  const calls = [];
  const result = await prepareInternSession({
    restore: async () => { throw Object.assign(new Error("no cookie"), { code: "UNAUTHENTICATED" }); }, connect: async () => {},
    authenticate: async () => { calls.push("authenticate"); return null; },
    clear: () => calls.push("clear"), isActive: () => true,
  });
  assert.deepEqual(result, { account: null });
  assert.deepEqual(calls, ["clear", "authenticate"]);
});

test("a temporary restoration failure does not clear or replace the session", async () => {
  let cleared = false, authenticated = false;
  const failure = Object.assign(new Error("database unavailable"), { code: "SERVICE_UNAVAILABLE" });
  await assert.rejects(prepareInternSession({ restore: async () => { throw failure; }, connect: async () => {}, authenticate: async () => { authenticated = true; }, clear: () => { cleared = true; }, isActive: () => true }), error => error === failure);
  assert.equal(cleared, false); assert.equal(authenticated, false);
});

test("an abandoned startup cannot clear or authenticate a newer session", async () => {
  const restore = deferred(), connect = deferred(); let active = true, touched = false;
  const startup = prepareInternSession({ restore: () => restore.promise, connect: () => connect.promise, authenticate: async () => { touched = true; }, clear: () => { touched = true; }, isActive: () => active });
  active = false; restore.reject(new Error("expired")); connect.resolve();
  assert.equal(await startup, null); assert.equal(touched, false);
});

test("expired socket authentication is cleared and retried anonymously", async () => {
  let attempts = 0, cleared = false;
  const result = await prepareInternSession({ restore: async () => ({}), connect: async () => {}, authenticate: async () => { if (++attempts === 1) throw Object.assign(new Error("expired"), { code: "UNAUTHENTICATED" }); return null; }, clear: () => { cleared = true; }, isActive: () => true });
  assert.deepEqual(result, { account: null }); assert.equal(cleared, true); assert.equal(attempts, 2);
});
