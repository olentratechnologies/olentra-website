import { createPresenceConnection } from "./presence-connection.mjs";

export const INITIAL_PRESENCE = Object.freeze({
  activeVisitors: 0, totalConnections: 0, isConnected: false, hasSnapshot: false,
});

export function createPresenceStore({ queueTask = queueMicrotask, ...transport }) {
  let snapshot = INITIAL_PRESENCE, subscriberCount = 0, stopTicket = 0, lifecycle = 0;
  const listeners = new Map();

  function publish(patch) {
    const next = { ...snapshot, ...patch };
    if (Object.keys(next).every((key) => next[key] === snapshot[key])) return;
    snapshot = Object.freeze(next);
    for (const listener of [...listeners.keys()]) listener();
  }

  const connection = createPresenceConnection({
    ...transport,
    role: "dashboard",
    onPresence: (data) => publish({ ...data, isConnected: true, hasSnapshot: true }),
    onDisconnected: () => publish({ isConnected: false }),
  });

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      const subscriptionLifecycle = lifecycle;
      stopTicket += 1;
      listeners.set(listener, (listeners.get(listener) || 0) + 1);
      subscriberCount += 1;
      if (subscriberCount === 1) connection.start();
      let subscribed = true;
      return () => {
        if (!subscribed) return;
        subscribed = false;
        if (subscriptionLifecycle !== lifecycle) return;
        const count = listeners.get(listener) || 0;
        if (count <= 1) listeners.delete(listener);
        else listeners.set(listener, count - 1);
        subscriberCount -= 1;
        if (subscriberCount !== 0) return;
        const ticket = ++stopTicket;
        // React StrictMode immediately resubscribes. Reuse that tab's socket.
        queueTask(() => { if (subscriberCount === 0 && ticket === stopTicket) connection.stop(); });
      };
    },
    dispose() {
      lifecycle += 1;
      stopTicket += 1;
      listeners.clear();
      subscriberCount = 0;
      connection.stop();
    },
  };
}
