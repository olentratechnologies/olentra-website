import test from "node:test";
import assert from "node:assert/strict";
import { createSnapshotRefresh } from "../src/lib/intern-snapshot-refresh.mjs";

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

test("concurrent snapshot requests share one load", async () => {
  const first = deferred(); let calls = 0;
  const refresh = createSnapshotRefresh(async () => { calls++; await first.promise; });
  const a = refresh.request(), b = refresh.request(), c = refresh.request();
  assert.equal(calls, 1);
  first.resolve(); await Promise.all([a, b, c]);
  assert.equal(calls, 1);
});

test("changes during a load trigger a follow-up snapshot", async () => {
  const first = deferred(), second = deferred(); let calls = 0;
  const refresh = createSnapshotRefresh(async () => { calls++; await (calls === 1 ? first.promise : second.promise); });
  const initial = refresh.request(), changed = refresh.invalidate(), another = refresh.invalidate();
  assert.equal(calls, 1);
  first.resolve(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls, 2);
  second.resolve(); await Promise.all([initial, changed, another]);
  assert.equal(calls, 2);
});

test("a failed load can be retried", async () => {
  let calls = 0;
  const refresh = createSnapshotRefresh(async () => { if (++calls === 1) throw new Error("offline"); });
  await assert.rejects(refresh.request(), /offline/);
  await refresh.request();
  assert.equal(calls, 2);
});

test("an authentication change starts a new snapshot without waiting for an older one", async () => {
  const first = deferred(), second = deferred(); let calls = 0;
  const refresh = createSnapshotRefresh(async () => { calls++; await (calls === 1 ? first.promise : second.promise); });
  const old = refresh.request();
  const current = refresh.reset();
  assert.equal(calls, 2);
  second.resolve(); await current;
  // The old request may complete later, but it must not disrupt later refreshes.
  first.resolve(); await old;
  await refresh.request(); assert.equal(calls, 3);
});
