import test from "node:test";
import assert from "node:assert/strict";
import { buildPresenceUrl, createPresenceConnection, parsePresenceSnapshot } from "@olentra/realtime/presence-connection";
import { createPresenceStore, INITIAL_PRESENCE } from "@olentra/realtime/presence-store";
import { createVisitorIdentity, VISITOR_ID_KEY } from "@olentra/realtime/visitor-identity";
import { getDashboardPresenceSnapshot, getServerPresenceSnapshot, subscribeDashboardPresence, subscribeVisitorTracking } from "@olentra/realtime/realtime";

class Clock {
  now = 0;
  nextId = 0;
  jobs = new Map();
  setTimer = (callback, delay) => {
    const id = ++this.nextId;
    this.jobs.set(id, { callback, delay, at: this.now + delay });
    return id;
  };
  clearTimer = (id) => this.jobs.delete(id);
  next() {
    const [id, job] = [...this.jobs].sort((a, b) => a[1].at - b[1].at)[0] || [];
    assert.ok(job, "expected a pending timer");
    this.jobs.delete(id);
    this.now = job.at;
    job.callback();
    return job.delay;
  }
  advance(ms) {
    const end = this.now + ms;
    while ([...this.jobs.values()].some((job) => job.at <= end)) this.next();
    this.now = end;
  }
  delay() {
    assert.equal(this.jobs.size, 1, "only one transport timer may be scheduled");
    return [...this.jobs.values()][0].delay;
  }
}

class Socket {
  readyState = 0;
  closes = 0;
  sent = [];
  constructor(url) { this.url = url; }
  open() { this.readyState = 1; this.onopen?.(); }
  message(data) { this.onmessage?.({ data: typeof data === "string" ? data : JSON.stringify(data) }); }
  fail() { this.onerror?.(); }
  remoteClose() { this.readyState = 3; this.onclose?.(); }
  close() { this.closes += 1; this.readyState = 3; }
  send(data) { this.sent.push(data); }
}

const presence = (activeVisitors, totalConnections = activeVisitors + 1) => ({ type: "presence", activeVisitors, totalConnections });
function transportOptions(role = "dashboard", extras = {}) {
  const clock = new Clock(), sockets = [];
  return {
    clock, sockets,
    options: {
      role, getUrl: () => "ws://localhost/ws?role=" + role,
      createSocket: (url) => { const socket = new Socket(url); sockets.push(socket); return socket; },
      setTimer: clock.setTimer, clearTimer: clock.clearTimer, random: () => 0.5,
      ...extras,
    },
  };
}

test("presence URLs preserve configured queries and safely encode the visitor identity", () => {
  const visitor = new URL(buildPresenceUrl("wss://live.example/ws?token=a%2Bb&role=old", { role: "visitor", visitorId: "browser & one" }));
  assert.equal(visitor.searchParams.get("token"), "a+b");
  assert.equal(visitor.searchParams.getAll("role").length, 1);
  assert.equal(visitor.searchParams.get("role"), "visitor");
  assert.equal(visitor.searchParams.get("visitorId"), "browser & one");
  const dashboard = new URL(buildPresenceUrl(visitor, { role: "dashboard" }));
  assert.equal(dashboard.searchParams.get("token"), "a+b");
  assert.equal(dashboard.searchParams.has("visitorId"), false);
  assert.throws(() => buildPresenceUrl("https://live.example/ws", { role: "dashboard" }));
  assert.throws(() => buildPresenceUrl("ws://live.example/ws", { role: "visitor" }));
});

test("only complete finite nonnegative integer presence messages count as snapshots", () => {
  assert.deepEqual(parsePresenceSnapshot(JSON.stringify(presence(0, 0))), { activeVisitors: 0, totalConnections: 0 });
  for (const payload of ["pong", "{", "null", JSON.stringify({ type: "other", activeVisitors: 2, totalConnections: 3 }),
    JSON.stringify(presence(-1)), JSON.stringify(presence(0.5)), JSON.stringify(presence(3, 2)),
    JSON.stringify({ type: "presence", activeVisitors: 1 }), JSON.stringify(presence("2", 3)),
    JSON.stringify(presence(Number.MAX_SAFE_INTEGER + 1, Number.MAX_SAFE_INTEGER + 2))]) {
    assert.equal(parsePresenceSnapshot(payload), null);
  }
});

test("dashboard store shares one socket, caches immutable snapshots and retains last values offline", () => {
  const { clock, sockets, options } = transportOptions();
  const cleanup = [];
  const store = createPresenceStore({ ...options, queueTask: (job) => cleanup.push(job) });
  const initial = store.getSnapshot();
  assert.equal(initial, INITIAL_PRESENCE);
  assert.equal(store.getSnapshot(), initial);
  assert.ok(Object.isFrozen(initial));
  let updates = 0;
  const unsubscribeA = store.subscribe(() => updates++);
  const unsubscribeB = store.subscribe(() => updates++);
  assert.equal(sockets.length, 1);
  sockets[0].open();
  sockets[0].message("pong");
  sockets[0].message({ type: "presence", activeVisitors: -1, totalConnections: 2 });
  assert.equal(store.getSnapshot(), initial);
  sockets[0].message(presence(7, 10));
  const live = store.getSnapshot();
  assert.deepEqual(live, { activeVisitors: 7, totalConnections: 10, isConnected: true, hasSnapshot: true });
  assert.equal(updates, 2);
  assert.ok(Object.isFrozen(live));
  assert.equal(clock.jobs.size, 0);
  sockets[0].message(presence(7, 10));
  assert.equal(store.getSnapshot(), live);
  assert.equal(updates, 2);
  sockets[0].remoteClose();
  assert.deepEqual(store.getSnapshot(), { ...live, isConnected: false });
  assert.equal(clock.delay(), 750);
  clock.next();
  assert.equal(sockets.length, 2);
  sockets[1].open();
  assert.equal(store.getSnapshot().isConnected, false);
  sockets[1].message(presence(0, 2));
  assert.equal(store.getSnapshot().isConnected, true);
  assert.equal(store.getSnapshot().activeVisitors, 0);
  unsubscribeA();
  assert.equal(sockets[1].closes, 0);
  unsubscribeB();
  cleanup.forEach((job) => job());
  assert.equal(sockets[1].closes, 1);
  assert.equal(clock.jobs.size, 0);
});

test("StrictMode resubscribe reuses the tab socket; final cleanup fences old handlers", () => {
  const { clock, sockets, options } = transportOptions();
  const jobs = [];
  const store = createPresenceStore({ ...options, queueTask: (job) => jobs.push(job) });
  const first = store.subscribe(() => {});
  const lateMessage = sockets[0].onmessage, lateClose = sockets[0].onclose;
  first();
  const second = store.subscribe(() => {});
  jobs.splice(0).forEach((job) => job());
  assert.equal(sockets.length, 1);
  assert.equal(sockets[0].closes, 0);
  second();
  jobs.splice(0).forEach((job) => job());
  lateMessage({ data: JSON.stringify(presence(99)) });
  lateClose();
  assert.equal(store.getSnapshot(), INITIAL_PRESENCE);
  assert.equal(clock.jobs.size, 0);
  assert.equal(sockets[0].closes, 1);
});

test("dispose followed by late unsubscriptions cannot corrupt a new subscription's refcount", () => {
  const { clock, sockets, options } = transportOptions();
  const jobs = [];
  const store = createPresenceStore({ ...options, queueTask: (job) => jobs.push(job) });
  const oldA = store.subscribe(() => {}), oldB = store.subscribe(() => {});
  store.dispose();
  const current = store.subscribe(() => {});
  oldA(); oldB(); oldA();
  jobs.splice(0).forEach((job) => job());
  assert.equal(sockets.length, 2);
  assert.equal(sockets[1].closes, 0);
  current();
  jobs.splice(0).forEach((job) => job());
  assert.equal(sockets[1].closes, 1);
  assert.equal(clock.jobs.size, 0);
});

test("synchronous connection failures retry with one capped equal-jitter exponential timer", () => {
  let attempts = 0;
  const { clock, options } = transportOptions("dashboard", { createSocket: () => { attempts++; throw new Error("offline"); } });
  const connection = createPresenceConnection(options);
  connection.start();
  for (const expected of [750, 1500, 3000, 6000, 7500, 7500]) {
    assert.equal(clock.delay(), expected);
    clock.next();
  }
  assert.equal(attempts, 7);
  connection.stop();
  assert.equal(clock.jobs.size, 0);
});

test("connection and first-snapshot deadlines recover stalled transports without reporting connected", () => {
  let snapshots = 0;
  const { clock, sockets, options } = transportOptions("dashboard", { onPresence: () => snapshots++ });
  const connection = createPresenceConnection(options);
  connection.start();
  assert.equal(clock.delay(), 10000);
  clock.next();
  assert.equal(sockets[0].closes, 1);
  assert.equal(clock.delay(), 750);
  clock.next();
  sockets[1].open();
  sockets[1].message("not a snapshot");
  assert.equal(clock.delay(), 10000);
  clock.next();
  assert.equal(snapshots, 0);
  assert.equal(sockets[1].closes, 1);
  assert.equal(clock.delay(), 1500);
  connection.stop();
});

test("stale socket and cancelled timer events cannot close or overwrite a newer connection", () => {
  const received = [];
  const { clock, sockets, options } = transportOptions("dashboard", { onPresence: (value) => received.push(value) });
  const connection = createPresenceConnection(options);
  connection.start();
  const staleOpen = sockets[0].onopen, staleMessage = sockets[0].onmessage, staleError = sockets[0].onerror;
  sockets[0].fail();
  const staleRetry = [...clock.jobs.values()][0].callback;
  connection.restart();
  sockets[1].open();
  sockets[1].message(presence(4));
  staleOpen(); staleMessage({ data: JSON.stringify(presence(99)) }); staleError(); staleRetry();
  assert.equal(sockets.length, 2);
  assert.equal(sockets[1].closes, 0);
  assert.deepEqual(received, [{ activeVisitors: 4, totalConnections: 5 }]);
  assert.equal(clock.jobs.size, 0);
  sockets[1].remoteClose();
  assert.equal(clock.delay(), 750, "a valid snapshot resets backoff");
  connection.stop();
});

test("flapping visitor sockets retain backoff until stable and send no application heartbeat", () => {
  const { clock, sockets, options } = transportOptions("visitor");
  const connection = createPresenceConnection(options);
  connection.start();
  sockets[0].fail();
  assert.equal(clock.next(), 750);
  sockets[1].open();
  clock.advance(9999);
  sockets[1].remoteClose();
  assert.equal(clock.next(), 1500);
  sockets[2].open();
  clock.advance(60000);
  assert.equal(clock.jobs.size, 0);
  assert.deepEqual(sockets[2].sent, []);
  sockets[2].remoteClose();
  assert.equal(clock.delay(), 750);
  connection.stop();
});

function eventTarget() {
  const handlers = new Set();
  return {
    handlers,
    addEventListener(type, listener) { assert.equal(type, "storage"); handlers.add(listener); },
    removeEventListener(type, listener) { assert.equal(type, "storage"); handlers.delete(listener); },
    dispatch(event) { for (const listener of [...handlers]) listener(event); },
  };
}

test("visitor identity persists and blocked-storage fallback remains stable per document", () => {
  const values = new Map([[VISITOR_ID_KEY, "visitor-existing"]]);
  const storage = { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value) };
  const identity = createVisitorIdentity({ storage, createId: () => { throw new Error("must use saved ID"); } });
  assert.equal(identity.getId(), "visitor-existing");
  const target = eventTarget();
  let generated = 0;
  const fallback = createVisitorIdentity({
    eventTarget: target, createId: () => `visitor-fallback-${++generated}`,
    storage: { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } },
  });
  const unsubscribe = fallback.subscribe(() => {});
  assert.equal(fallback.getId(), fallback.getId());
  assert.equal(generated, 1);
  target.dispatch({ key: "unrelated", newValue: "visitor-another" });
  assert.equal(fallback.getId(), "visitor-fallback-1");
  unsubscribe();
  assert.equal(target.handlers.size, 0);
});

test("tabs elect one persistent identity after a concurrent-start race, including stale events", () => {
  let stored = null;
  const queued = [], targetA = eventTarget(), targetB = eventTarget();
  let staleReadB = true;
  const storageA = {
    getItem: () => stored,
    setItem(key, value) { stored = value; queued.push(() => targetB.dispatch({ key, newValue: value, storageArea: storageB })); },
  };
  const storageB = {
    getItem: () => { if (staleReadB) { staleReadB = false; return null; } return stored; },
    setItem(key, value) { stored = value; queued.push(() => targetA.dispatch({ key, newValue: value, storageArea: storageA })); },
  };
  const a = createVisitorIdentity({ storage: storageA, eventTarget: targetA, createId: () => "visitor-aaaa" });
  const b = createVisitorIdentity({ storage: storageB, eventTarget: targetB, createId: () => "visitor-zzzz" });
  const changedB = [];
  const stopA = a.subscribe(() => {}), stopB = b.subscribe((id) => changedB.push(id));
  for (let processed = 0; queued.length; processed++) {
    assert.ok(processed < 10, "identity writes must converge rather than loop");
    queued.shift()();
  }
  assert.equal(a.getId(), "visitor-aaaa");
  assert.equal(b.getId(), "visitor-aaaa");
  assert.equal(stored, "visitor-aaaa");
  assert.deepEqual(changedB, ["visitor-aaaa"]);
  stopA(); stopB();
  assert.equal(targetA.handlers.size + targetB.handlers.size, 0);
});

test("browser adapters import without window and provide a stable SSR snapshot", () => {
  assert.equal(typeof window, "undefined");
  assert.equal(getDashboardPresenceSnapshot(), INITIAL_PRESENCE);
  assert.equal(getServerPresenceSnapshot(), INITIAL_PRESENCE);
  subscribeDashboardPresence(() => { throw new Error("must not subscribe during SSR"); })();
  subscribeVisitorTracking()();
});

test("browser singleton shares subscribers through remounts and reconnects an already-open visitor when tab identity converges", async () => {
  const previousWindow = globalThis.window;
  const target = eventTarget(), sockets = [];
  let stored = "visitor-zzzz";
  const storage = { getItem: () => stored, setItem: (key, value) => { stored = value; } };
  globalThis.window = {
    ...target, localStorage: storage, location: { protocol: "http:", hostname: "localhost", host: "localhost:3000" },
    WebSocket: class extends Socket { constructor(url) { super(url); sockets.push(this); } },
  };
  let visitorStop, dashboardA, dashboardB;
  try {
    visitorStop = subscribeVisitorTracking();
    assert.equal(new URL(sockets[0].url).searchParams.get("visitorId"), "visitor-zzzz");
    sockets[0].open();
    visitorStop();
    visitorStop = subscribeVisitorTracking();
    await Promise.resolve();
    assert.equal(sockets.length, 1, "StrictMode retains the same visitor socket");
    assert.equal(target.handlers.size, 1, "StrictMode retains one identity subscription");
    stored = "visitor-aaaa";
    target.dispatch({ key: VISITOR_ID_KEY, newValue: stored, storageArea: storage });
    assert.equal(sockets[0].closes, 1);
    assert.equal(new URL(sockets[1].url).searchParams.get("visitorId"), "visitor-aaaa");
    dashboardA = subscribeDashboardPresence(() => {});
    dashboardB = subscribeDashboardPresence(() => {});
    assert.equal(sockets.length, 3, "two dashboard consumers share a socket");
    sockets[2].open();
    assert.equal(getDashboardPresenceSnapshot().hasSnapshot, false);
    sockets[2].message(presence(2, 4));
    assert.equal(getDashboardPresenceSnapshot().hasSnapshot, true);
    dashboardA(); dashboardB(); visitorStop();
    await Promise.resolve();
    assert.equal(sockets[1].closes, 1);
    assert.equal(sockets[2].closes, 1);
    assert.equal(target.handlers.size, 0);
  } finally {
    visitorStop?.(); dashboardA?.(); dashboardB?.();
    await Promise.resolve();
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
