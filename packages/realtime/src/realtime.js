import { buildPresenceUrl, createPresenceConnection } from "./presence-connection.mjs";
import { createPresenceStore, INITIAL_PRESENCE } from "./presence-store.mjs";
import { createVisitorIdentity } from "./visitor-identity.mjs";

const RUNTIME_KEY = Symbol.for("olentra.presence.browser.v1");

function configuredPresenceUrl() {
  return process.env.NEXT_PUBLIC_REALTIME_WS_URL;
}

export function getWebSocketUrl(path = "/ws") {
  const configured = configuredPresenceUrl();
  if (configured) return configured;
  if (typeof window === "undefined") return `ws://127.0.0.1:3003${path}`;
  const { protocol, hostname, host } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") return `ws://127.0.0.1:3003${path}`;
  return `${protocol === "https:" ? "wss" : "ws"}://${host}${path}`;
}

// Lazily created in a browser, and retained across development module refreshes.
function browserRuntime() {
  if (typeof window === "undefined") return null;
  if (window[RUNTIME_KEY]) return window[RUNTIME_KEY];
  let storage;
  try { storage = window.localStorage; } catch {}
  const identity = createVisitorIdentity({
    storage,
    eventTarget: window,
    createId: () => window.crypto?.randomUUID?.() || `visitor-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
  });
  const createSocket = (url) => new window.WebSocket(url);
  const dashboard = createPresenceStore({
    createSocket,
    getUrl: () => buildPresenceUrl(getWebSocketUrl(), { role: "dashboard" }),
  });
  const visitor = createPresenceConnection({
    role: "visitor",
    createSocket,
    getUrl: () => buildPresenceUrl(getWebSocketUrl(), { role: "visitor", visitorId: identity.getId() }),
  });
  let visitors = 0, stopTicket = 0, unsubscribeIdentity = null;
  const runtime = {
    dashboard,
    subscribeVisitor() {
      visitors += 1;
      stopTicket += 1;
      if (visitors === 1 && !unsubscribeIdentity) {
        // A storage race can elect another tab's ID after this socket opened.
        unsubscribeIdentity = identity.subscribe(() => visitor.restart());
        visitor.start();
      }
      let subscribed = true;
      return () => {
        if (!subscribed) return;
        subscribed = false;
        visitors -= 1;
        if (visitors) return;
        const ticket = ++stopTicket;
        queueMicrotask(() => {
          if (visitors || ticket !== stopTicket) return;
          unsubscribeIdentity?.();
          unsubscribeIdentity = null;
          visitor.stop();
        });
      };
    },
  };
  window[RUNTIME_KEY] = runtime;
  return runtime;
}

export const getServerPresenceSnapshot = () => INITIAL_PRESENCE;
export const getDashboardPresenceSnapshot = () => browserRuntime()?.dashboard.getSnapshot() || INITIAL_PRESENCE;
export const subscribeDashboardPresence = (listener) => browserRuntime()?.dashboard.subscribe(listener) || (() => {});
export const subscribeVisitorTracking = () => browserRuntime()?.subscribeVisitor() || (() => {});
