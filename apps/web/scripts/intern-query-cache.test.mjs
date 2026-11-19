import test from "node:test";
import assert from "node:assert/strict";
import { createInternQueryCache, internQueryKey } from "../src/lib/intern-query-cache.mjs";

function deferred() {
  let resolve, reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

const turn = () => new Promise(resolve => setImmediate(resolve));

test("keys sort nested object fields while preserving array order and method isolation", () => {
  const a = { page: 2, filter: { status: "Applied", tracks: ["software-engineer"] } };
  const b = { filter: { tracks: ["software-engineer"], status: "Applied" }, page: 2 };
  assert.equal(internQueryKey("application.list", a), internQueryKey("application.list", b));
  assert.notEqual(internQueryKey("application.list", a), internQueryKey("intern.list", a));
  assert.notEqual(internQueryKey("application.list", a), internQueryKey("application.list", { ...a, page: 1 }));
  assert.notEqual(internQueryKey("application.list", a), internQueryKey("application.list", { ...a, filter: { ...a.filter, tracks: ["other-program", "software-engineer"] } }));
});

test("idle and loaded snapshots remain stable and cached rows are immediately available", async () => {
  let calls = 0;
  const source = { items: [{ id: "first" }], total: 1 };
  const cache = createInternQueryCache(async () => { calls++; return { ok: true, data: source }; });
  const key = internQueryKey("application.list", { page: 1 });
  const idle = cache.get(key);
  assert.deepEqual(idle, { data: undefined, error: "", loading: false, loaded: false });
  assert.equal(cache.get(key), idle);
  assert.ok(Object.isFrozen(idle));
  await cache.fetch("application.list", { page: 1 });
  const loaded = cache.get(key);
  assert.equal(loaded.loaded, true);
  assert.equal(cache.get(key), loaded);
  assert.deepEqual(loaded.data, source);
  assert.ok(Object.isFrozen(loaded));
  assert.ok(Object.isFrozen(loaded.data.items[0]));
  source.items[0].id = "changed outside the cache";
  assert.equal(loaded.data.items[0].id, "first");
  assert.deepEqual(await cache.fetch("application.list", { page: 1 }), { ok: true, data: loaded.data });
  assert.equal(calls, 1);
});

test("concurrent requests deduplicate by exact key, including forced refreshes", async () => {
  const response = deferred();
  let calls = 0;
  const cache = createInternQueryCache(() => { calls++; return response.promise; });
  const first = cache.fetch("application.list", { page: 1, query: "Alex" });
  const second = cache.fetch("application.list", { query: "Alex", page: 1 }, { force: true });
  assert.equal(first, second);
  assert.equal(calls, 1);
  response.resolve({ ok: true, data: { items: [] } });
  await first;
  assert.equal(calls, 1);
});

test("pages, filters and methods never reuse another exact key's data", async () => {
  const cache = createInternQueryCache(async (method, params) => ({ ok: true, data: { method, params } }));
  await cache.fetch("application.list", { page: 1, status: "Applied" });
  const absent = cache.get(internQueryKey("application.list", { page: 2, status: "Applied" }));
  assert.equal(absent.data, undefined);
  await cache.fetch("application.list", { page: 2, status: "Applied" });
  await cache.fetch("application.list", { page: 1, status: "Selected" });
  await cache.fetch("intern.list", { page: 1, status: "Applied" });
  for (const [method, params] of [["application.list", { page: 1, status: "Applied" }], ["application.list", { page: 2, status: "Applied" }], ["application.list", { page: 1, status: "Selected" }], ["intern.list", { page: 1, status: "Applied" }]]) {
    assert.deepEqual(cache.get(internQueryKey(method, params)).data, { method, params });
  }
});

test("invalidation retains inactive cached rows and revalidates active queries only", async () => {
  const next = deferred();
  const calls = [];
  const cache = createInternQueryCache((method, params) => { calls.push(params.page); return calls.length <= 2 ? Promise.resolve({ ok: true, data: { page: params.page, version: 1 } }) : next.promise; });
  await cache.fetch("application.list", { page: 1 });
  await cache.fetch("application.list", { page: 2 });
  const key = internQueryKey("application.list", { page: 1 });
  let updates = 0;
  const unsubscribe = cache.subscribe(key, () => { updates++; });
  const refreshing = cache.invalidate();
  assert.deepEqual(calls, [1, 2, 1]);
  assert.deepEqual(cache.get(key).data, { page: 1, version: 1 });
  assert.equal(cache.get(key).loading, true);
  assert.deepEqual(cache.get(internQueryKey("application.list", { page: 2 })).data, { page: 2, version: 1 });
  next.resolve({ ok: true, data: { page: 1, version: 2 } });
  await refreshing;
  assert.equal(cache.get(key).data.version, 2);
  assert.ok(updates >= 2);
  unsubscribe();
});

test("several invalidations during one pending query coalesce into one fresh follow-up", async () => {
  const first = deferred(), second = deferred();
  let calls = 0;
  const cache = createInternQueryCache(() => ++calls === 1 ? first.promise : second.promise);
  const key = internQueryKey("application.list", { page: 1 });
  const initial = cache.fetch("application.list", { page: 1 });
  const invalidated = cache.invalidate(), invalidatedAgain = cache.invalidate();
  first.resolve({ ok: true, data: { version: 1 } });
  await turn();
  assert.equal(calls, 2);
  assert.equal(cache.get(key).loading, true);
  assert.equal(cache.get(key).data, undefined);
  second.resolve({ ok: true, data: { version: 2 } });
  assert.equal((await initial).data.version, 2);
  await Promise.all([invalidated, invalidatedAgain]);
  assert.equal(cache.get(key).data.version, 2);
  assert.equal(calls, 2);
});

test("background failures preserve the exact-key data and normalize rejected requests", async () => {
  let calls = 0;
  const cache = createInternQueryCache(async () => { if (++calls === 1) return { ok: true, data: { items: ["cached"] } }; if (calls === 2) return { ok: false, error: "Offline" }; throw new Error("Connection lost"); });
  const key = internQueryKey("application.list", {});
  await cache.fetch("application.list");
  const original = cache.get(key).data;
  assert.deepEqual(await cache.fetch("application.list", {}, { force: true }), { ok: false, error: "Offline" });
  assert.equal(cache.get(key).data, original);
  assert.equal(cache.get(key).loaded, true);
  assert.equal(cache.get(key).loading, false);
  assert.equal(cache.get(key).error, "Offline");
  assert.deepEqual(await cache.fetch("application.list", {}, { force: true }), { ok: false, error: "Connection lost" });
  assert.equal(cache.get(key).data, original);
});

test("scope changes immediately reset subscribed state and discard late replies", async () => {
  const first = deferred(), second = deferred();
  let calls = 0, updates = 0;
  const cache = createInternQueryCache(() => ++calls === 1 ? first.promise : second.promise);
  cache.setScope("admin-one");
  const key = internQueryKey("application.list", {});
  const unsubscribe = cache.subscribe(key, () => { updates++; });
  const previous = cache.fetch("application.list");
  cache.setScope("admin-two");
  assert.equal(cache.get(key).loaded, false);
  const oldResult = await previous;
  assert.equal(oldResult.ok, false);
  assert.equal("data" in oldResult, false);
  const current = cache.fetch("application.list");
  second.resolve({ ok: true, data: { account: "admin-two" } });
  await current;
  first.resolve({ ok: true, data: { account: "admin-one" } });
  await turn();
  assert.deepEqual(cache.get(key).data, { account: "admin-two" });
  const snapshot = cache.get(key);
  cache.setScope("admin-two");
  assert.equal(cache.get(key), snapshot);
  assert.ok(updates >= 3);
  unsubscribe();
});

test("subscriptions can precede metadata and stale known queries refresh on subscription", async () => {
  let calls = 0;
  const cache = createInternQueryCache(async () => ({ ok: true, data: ++calls }));
  const unknown = cache.subscribe(internQueryKey("application.list", { page: 1 }), () => {});
  assert.equal(calls, 0);
  await cache.fetch("application.list", { page: 2 });
  await cache.invalidate();
  assert.equal(calls, 1);
  const known = cache.subscribe(internQueryKey("application.list", { page: 2 }), () => {});
  assert.equal(calls, 2);
  await turn();
  assert.equal(cache.get(internQueryKey("application.list", { page: 2 })).data, 2);
  unknown(); known();
});

test("least recently used inactive entries are evicted from the bounded cache", async () => {
  const cache = createInternQueryCache(async (_method, params) => ({ ok: true, data: params.page }), { maxEntries: 2 });
  await cache.fetch("application.list", { page: 1 });
  await cache.fetch("application.list", { page: 2 });
  cache.get(internQueryKey("application.list", { page: 1 }));
  await cache.fetch("application.list", { page: 3 });
  assert.equal(cache.get(internQueryKey("application.list", { page: 1 })).data, 1);
  assert.equal(cache.get(internQueryKey("application.list", { page: 2 })).loaded, false);
  assert.equal(cache.get(internQueryKey("application.list", { page: 3 })).data, 3);
});

test("clear and dispose reject pending results without leaking old data", async () => {
  const response = deferred();
  const cache = createInternQueryCache(() => response.promise);
  const key = internQueryKey("application.list", {});
  const pending = cache.fetch("application.list");
  cache.clear();
  assert.equal((await pending).ok, false);
  response.resolve({ ok: true, data: { secret: "old record" } });
  await turn();
  assert.deepEqual(cache.get(key), { data: undefined, error: "", loading: false, loaded: false });
  cache.dispose();
  assert.equal((await cache.fetch("application.list")).ok, false);
});
