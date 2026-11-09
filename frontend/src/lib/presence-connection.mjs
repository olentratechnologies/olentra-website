const noop = () => {};

export function buildPresenceUrl(base, { role, visitorId } = {}) {
  const url = new URL(base);
  if (!["ws:", "wss:"].includes(url.protocol)) throw new Error("Use a WebSocket URL.");
  if (!["visitor", "dashboard"].includes(role)) throw new Error("Choose a presence role.");
  url.hash = "";
  url.searchParams.set("role", role);
  if (role === "visitor") {
    if (!visitorId) throw new Error("A visitor identity is required.");
    url.searchParams.set("visitorId", visitorId);
  } else {
    url.searchParams.delete("visitorId");
  }
  return url.toString();
}

export function parsePresenceSnapshot(message) {
  if (typeof message !== "string") return null;
  let data;
  try { data = JSON.parse(message); } catch { return null; }
  if (data?.type !== "presence" || !Number.isSafeInteger(data.activeVisitors) ||
      !Number.isSafeInteger(data.totalConnections) || data.activeVisitors < 0 ||
      data.totalConnections < data.activeVisitors) return null;
  return Object.freeze({ activeVisitors: data.activeVisitors, totalConnections: data.totalConnections });
}

// Injected browser dependencies keep transport behavior deterministic and SSR-safe.
export function createPresenceConnection({
  role, getUrl, createSocket, onPresence = noop, onDisconnected = noop,
  setTimer = setTimeout, clearTimer = clearTimeout, random = Math.random,
  stableConnectionMs = 10000, snapshotTimeoutMs = 10000, connectionTimeoutMs = 10000,
}) {
  let running = false, generation = 0, socket = null, timer = null, attempt = 0;

  function clearScheduled() {
    if (timer !== null) clearTimer(timer);
    timer = null;
  }

  function releaseSocket() {
    const previous = socket;
    socket = null;
    if (!previous) return;
    previous.onopen = previous.onmessage = previous.onclose = previous.onerror = null;
    try { previous.close(); } catch {}
  }

  function current(candidate, token) {
    return running && generation === token && socket === candidate;
  }

  function scheduleRetry() {
    if (!running || timer !== null) return;
    const ceiling = Math.min(1000 * 2 ** Math.min(attempt, 4), 10000);
    attempt = Math.min(attempt + 1, 4);
    const sample = Number(random());
    const jitter = Number.isFinite(sample) ? Math.max(0, Math.min(1, sample)) : 0.5;
    const delay = Math.round(ceiling / 2 + jitter * ceiling / 2);
    const ticket = generation;
    timer = setTimer(() => {
      if (!running || generation !== ticket) return;
      timer = null;
      connect();
    }, delay);
  }

  function disconnect(candidate, token) {
    if (!current(candidate, token)) return;
    generation += 1;
    clearScheduled();
    releaseSocket();
    onDisconnected();
    scheduleRetry();
  }

  function connect() {
    if (!running) return;
    clearScheduled();
    const token = ++generation;
    try {
      const candidate = createSocket(getUrl());
      socket = candidate;
      timer = setTimer(() => {
        if (!current(candidate, token)) return;
        timer = null;
        disconnect(candidate, token);
      }, connectionTimeoutMs);
      candidate.onopen = () => {
        if (!current(candidate, token)) return;
        clearScheduled();
        // An open TCP connection is not yet a usable dashboard snapshot.
        timer = setTimer(() => {
          if (!current(candidate, token)) return;
          timer = null;
          if (role === "visitor") attempt = 0;
          else disconnect(candidate, token);
        }, role === "visitor" ? stableConnectionMs : snapshotTimeoutMs);
      };
      candidate.onmessage = (event) => {
        if (!current(candidate, token) || role !== "dashboard") return;
        const snapshot = parsePresenceSnapshot(event.data);
        if (!snapshot) return;
        clearScheduled();
        attempt = 0;
        onPresence(snapshot);
      };
      candidate.onclose = () => disconnect(candidate, token);
      // Retry even when a failed transport never dispatches a later close event.
      candidate.onerror = () => disconnect(candidate, token);
    } catch {
      if (!running || generation !== token) return;
      generation += 1;
      releaseSocket();
      onDisconnected();
      scheduleRetry();
    }
  }

  function start() {
    if (running) return;
    running = true;
    attempt = 0;
    connect();
  }

  function stop() {
    if (!running) return;
    running = false;
    generation += 1;
    clearScheduled();
    releaseSocket();
    onDisconnected();
  }

  return { start, stop, restart() { stop(); start(); } };
}
