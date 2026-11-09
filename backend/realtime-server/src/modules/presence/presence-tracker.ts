export interface PresenceOptions {
  broadcastIntervalMs?: number;
  now?: () => number;
  schedule?: (callback: () => void, delay: number) => unknown;
  cancel?: (handle: unknown) => void;
  broadcast: (payload: string) => number | void;
}

export type ReturnTypeOfPresenceTracker = ReturnType<typeof createPresenceTracker>;

/** One-node connection ownership and latest-count coalescing, independent of transport. */
export function createPresenceTracker(options: PresenceOptions) {
  const interval = options.broadcastIntervalMs ?? 100;
  if (!Number.isFinite(interval) || interval < 1) throw new Error("broadcastIntervalMs must be positive.");
  const now = options.now ?? Date.now;
  const schedule = options.schedule ?? ((callback, delay) => setTimeout(callback, delay));
  const cancel = options.cancel ?? (handle => clearTimeout(handle as ReturnType<typeof setTimeout>));
  const visitors = new Map<string, string>();
  const browsers = new Map<string, number>();
  const dashboards = new Set<string>();
  const counters = { connectionEvents: 0, broadcasts: 0, snapshots: 0, serializedBytes: 0, backpressureEvents: 0, droppedBroadcasts: 0 };
  let timer: unknown = null;
  let stopped = false;
  let previous = "";
  const counts = () => ({ activeVisitors: browsers.size, totalConnections: visitors.size + dashboards.size, dashboardSubscribers: dashboards.size });
  const signature = () => `${browsers.size}:${visitors.size + dashboards.size}`;
  function serialize() {
    const payload = `{"type":"presence","activeVisitors":${browsers.size},"totalConnections":${visitors.size + dashboards.size},"timestamp":${now()}}`;
    counters.snapshots++;
    counters.serializedBytes += payload.length; // ASCII keys and numbers only.
    return payload;
  }
  function dirty() {
    if (stopped || dashboards.size === 0 || timer !== null) return;
    timer = schedule(() => {
      timer = null;
      if (stopped || dashboards.size === 0 || previous === signature()) return;
      previous = signature();
      const result = options.broadcast(serialize());
      counters.broadcasts++;
      if (result === -1) counters.backpressureEvents++;
      if (result === 0) counters.droppedBroadcasts++;
    }, interval);
  }
  function cancelPending() {
    if (timer !== null) cancel(timer);
    timer = null;
  }
  return {
    addVisitor(connectionId: string, visitorId?: string) {
      if (stopped || visitors.has(connectionId) || dashboards.has(connectionId)) return false;
      const browserId = visitorId ? `browser:${visitorId}` : `connection:${connectionId}`;
      visitors.set(connectionId, browserId);
      browsers.set(browserId, (browsers.get(browserId) ?? 0) + 1);
      counters.connectionEvents++;
      dirty();
      return true;
    },
    addDashboard(connectionId: string) {
      if (stopped || visitors.has(connectionId) || dashboards.has(connectionId)) return false;
      const first = dashboards.size === 0;
      dashboards.add(connectionId);
      counters.connectionEvents++;
      if (first) previous = signature();
      else dirty();
      return true;
    },
    remove(connectionId: string) {
      const browserId = visitors.get(connectionId);
      if (browserId !== undefined) {
        visitors.delete(connectionId);
        const remaining = (browsers.get(browserId) ?? 1) - 1;
        if (remaining > 0) browsers.set(browserId, remaining);
        else browsers.delete(browserId);
      } else if (!dashboards.delete(connectionId)) return false;
      counters.connectionEvents++;
      if (dashboards.size === 0) cancelPending();
      else dirty();
      return true;
    },
    serialize,
    getStats: () => ({ ...counts(), ...counters, pendingBroadcast: timer !== null }),
    stop() {
      stopped = true;
      cancelPending();
      visitors.clear();
      browsers.clear();
      dashboards.clear();
    },
  };
}
