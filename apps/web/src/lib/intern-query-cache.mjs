const IDLE = Object.freeze({ data: undefined, error: "", loading: false, loaded: false });
const CLEARED = "The workspace session changed. Load this data again.";

export function internQueryKey(method, params = {}) {
  return JSON.stringify([method, params ?? {}], (_key, value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return value;
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, value[key]]));
  });
}

function immutable(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(immutable));
  if (value && typeof value === "object") return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, item]) => [key, immutable(item)])));
  return value;
}

function failure(error) {
  const message = typeof error === "string" ? error : error?.message;
  return { ok: false, error: typeof message === "string" && message.trim() ? message : "Could not load this data." };
}

/** Browser-memory query history. Never persist workspace records or credentials. */
export function createInternQueryCache(request, { maxEntries = 100 } = {}) {
  const limit = Number.isSafeInteger(maxEntries) && maxEntries > 0 ? maxEntries : 100;
  const entries = new Map(), subscriptions = new Map();
  let epoch = 0, scope = "", disposed = false;

  function notify(key) {
    for (const listener of [...(subscriptions.get(key) || [])]) {
      // One subscriber must not prevent another mounted view from updating.
      try { listener(); } catch {}
    }
  }

  function touch(key, entry) {
    entries.delete(key);
    entries.set(key, entry);
  }

  function trim() {
    // Mounted queries and pending requests are pinned; cap the remaining history.
    for (const [key, entry] of entries) {
      if (entries.size <= limit) break;
      if (entry.pending || subscriptions.get(key)?.size) continue;
      entries.delete(key);
    }
  }

  function get(key) {
    const entry = entries.get(key);
    if (!entry) return IDLE;
    touch(key, entry);
    return entry.snapshot;
  }

  function publish(entry, snapshot) {
    entry.snapshot = Object.freeze(snapshot);
    notify(entry.key);
  }

  function fetch(method, params = {}, { force = false } = {}) {
    if (disposed) return Promise.resolve(failure(CLEARED));
    const key = internQueryKey(method, params);
    let entry = entries.get(key);
    if (!entry) {
      entry = { key, method, params: immutable(JSON.parse(key)[1]), snapshot: IDLE, stale: true, revision: 0, pending: null, resolve: null };
      entries.set(key, entry);
    }
    touch(key, entry);
    if (entry.pending) return entry.pending;
    if (entry.snapshot.loaded && !entry.stale && !force) return Promise.resolve({ ok: true, data: entry.snapshot.data });

    const currentEpoch = epoch;
    const current = () => !disposed && epoch === currentEpoch && entries.get(key) === entry;
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    entry.pending = promise;
    entry.resolve = resolve;
    publish(entry, { ...entry.snapshot, error: "", loading: true });
    trim();

    async function run() {
      while (current()) {
        const revision = entry.revision;
        let result;
        try {
          const response = await request(entry.method, entry.params);
          result = response?.ok === true ? { ok: true, data: immutable(response.data) } : failure(response?.error);
        } catch (error) { result = failure(error); }
        if (!current()) return failure(CLEARED);
        // A change event makes this response older than the committed data.
        // Multiple changes during one request require only one additional pass.
        if (revision !== entry.revision) continue;
        entry.stale = !result.ok;
        publish(entry, {
          data: result.ok ? result.data : entry.snapshot.data,
          error: result.ok ? "" : result.error,
          loading: false,
          loaded: result.ok || entry.snapshot.loaded,
        });
        if (!current()) return failure(CLEARED);
        // A listener can invalidate synchronously while receiving the result.
        if (revision !== entry.revision) {
          publish(entry, { ...entry.snapshot, loading: true });
          continue;
        }
        entry.pending = null;
        entry.resolve = null;
        trim();
        return result;
      }
      return failure(CLEARED);
    }
    void run().then(resolve);
    return promise;
  }

  function subscribe(key, listener) {
    if (disposed) return () => {};
    const listeners = subscriptions.get(key) || new Set();
    subscriptions.set(key, listeners);
    listeners.add(listener);
    const entry = entries.get(key);
    if (entry?.stale && !entry.pending) void fetch(entry.method, entry.params);
    return () => {
      listeners.delete(listener);
      if (!listeners.size && subscriptions.get(key) === listeners) subscriptions.delete(key);
      trim();
    };
  }

  function invalidate() {
    if (disposed) return Promise.resolve([]);
    const pending = [];
    for (const entry of [...entries.values()]) {
      entry.stale = true;
      entry.revision++;
      if (entry.pending) pending.push(entry.pending);
      else if (subscriptions.get(entry.key)?.size) pending.push(fetch(entry.method, entry.params));
    }
    return Promise.all(pending);
  }

  function clear() {
    epoch++;
    for (const entry of entries.values()) entry.resolve?.(failure(CLEARED));
    entries.clear();
    for (const key of [...subscriptions.keys()]) notify(key);
  }

  return {
    get, subscribe, fetch, invalidate, clear,
    setScope(next) { if (next !== scope) { scope = next; clear(); } },
    dispose() { disposed = true; clear(); subscriptions.clear(); },
  };
}
