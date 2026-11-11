import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PUT } from "../../../apps/admin/src/app/api/site-features/route.js";
import { readSiteFeatures } from "../src/server/store.mjs";

const principal = (overrides = {}) => ({ id: "staff-test", email: "staff@example.test", name: "Test staff", role: "company", staffRole: "admin", permissions: [], ...overrides });
const request = ({ token = "staff-access-token", origin = "http://localhost:3002", body = { feature: "services", enabled: false, actor: "Forged actor" } } = {}) => new Request("http://localhost:3002/api/site-features", {
  method: "PUT",
  headers: { "Content-Type": "application/json", ...(origin ? { Origin: origin } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  body: JSON.stringify(body),
});
async function store(t) {
  const directory = await mkdtemp(path.join(tmpdir(), "olentra-feature-auth-"));
  const previous = { OLENTRA_FEATURE_STORE_PATH: process.env.OLENTRA_FEATURE_STORE_PATH, OLENTRA_FEATURE_SITE_ORIGIN: process.env.OLENTRA_FEATURE_SITE_ORIGIN, INTERNSHIP_BACKEND_URL: process.env.INTERNSHIP_BACKEND_URL };
  process.env.OLENTRA_FEATURE_STORE_PATH = path.join(directory, "features.json");
  process.env.INTERNSHIP_BACKEND_URL = "http://accounts.example.test/";
  delete process.env.OLENTRA_FEATURE_SITE_ORIGIN;
  t.after(async () => {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    await rm(directory, { recursive: true, force: true });
  });
  return readSiteFeatures();
}
const sessionResponse = (account) => Response.json({ ok: true, data: { account } });

test("live switches accept server-verified admins and workspace administrators and record the verified actor", async (t) => {
  const before = await store(t);
  let account = principal();
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => { calls.push({ url, options }); return sessionResponse(account); });
  for (const overrides of [{}, { staffRole: "custom-manager", permissions: ["workspace.administrator"] }]) {
    account = principal(overrides);
    const current = await readSiteFeatures();
    const result = await PUT(request({ body: { feature: "services", enabled: !current.environments.Production.services, actor: "Forged actor" } }));
    assert.equal(result.status, 200);
    const state = await result.json();
    assert.equal(state.lastChange.actor, account.email);
    assert.equal(state.revision, current.revision + 1);
  }
  assert.equal((await readSiteFeatures()).revision, before.revision + 2);
  for (const { url, options } of calls) {
    assert.equal(url, "http://accounts.example.test/intern/auth/session");
    assert.equal(options.headers.Authorization, "Bearer staff-access-token");
    assert.equal(options.cache, "no-store");
  }
});

test("live switches reject editors, recruiters, analysts, unassigned staff and interns without changing data", async (t) => {
  const before = await store(t);
  let account;
  t.mock.method(globalThis, "fetch", async () => sessionResponse(account));
  for (const overrides of [
    { staffRole: "manager", permissions: ["workspace.editor"] },
    { staffRole: "recruiter", permissions: ["workspace.recruiter"] },
    { staffRole: "viewer", permissions: ["workspace.analyst"] },
    { staffRole: "manager", permissions: [] },
    { role: "intern", staffRole: "admin", permissions: ["workspace.administrator"] },
  ]) {
    account = principal(overrides);
    assert.equal((await PUT(request())).status, 403);
  }
  assert.deepEqual(await readSiteFeatures(), before);
});

test("missing bearer tokens and foreign origins are rejected before consulting the account service", async (t) => {
  const before = await store(t);
  const fetch = t.mock.method(globalThis, "fetch", async () => { throw new Error("must not be called"); });
  assert.equal((await PUT(request({ token: "" }))).status, 401);
  assert.equal((await PUT(request({ origin: "https://foreign.example" }))).status, 403);
  assert.equal((await PUT(request({ origin: "" }))).status, 403);
  assert.equal(fetch.mock.callCount(), 0);
  assert.deepEqual(await readSiteFeatures(), before);
});

test("revoked sessions and failed or malformed account-service responses fail closed", async (t) => {
  const before = await store(t);
  let respond;
  t.mock.method(globalThis, "fetch", async () => respond());
  for (const [response, expected] of [
    [() => new Response(null, { status: 401 }), 401],
    [() => new Response(null, { status: 500 }), 503],
    [() => { throw new TypeError("offline"); }, 503],
    [() => new Response("not JSON"), 503],
    [() => Response.json({ ok: false, data: { account: principal() } }), 503],
    [() => sessionResponse({ role: "company", staffRole: "admin" }), 503],
  ]) {
    respond = response;
    assert.equal((await PUT(request())).status, expected);
  }
  assert.deepEqual(await readSiteFeatures(), before);
});
