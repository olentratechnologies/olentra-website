import type { Server, ServerWebSocket } from "bun";
import { createPresenceTracker } from "./presence";

interface ClientData {
  connectionId: string;
  role: "visitor" | "dashboard";
  visitorId?: string;
}
export interface PresenceServerOptions {
  port?: number;
  hostname?: string;
  allowedOrigins?: string[];
  broadcastIntervalMs?: number;
  log?: boolean;
}
export function createPresenceServer(options: PresenceServerOptions = {}) {
  const allowedOrigins = new Set((options.allowedOrigins ?? []).map(origin => origin.toLowerCase()));
  const allowed = (origin: string | null) => !origin || allowedOrigins.size === 0 || allowedOrigins.has("*") || allowedOrigins.has(origin.toLowerCase());
  let server: Server<ClientData>;
  let stopped = false;
  const presence = createPresenceTracker({ broadcastIntervalMs: options.broadcastIntervalMs, broadcast: payload => server.publish("metrics:presence", payload, false) });
  const direct = (socket: ServerWebSocket<ClientData>) => socket.send(presence.serialize());
  server = Bun.serve<ClientData>({
    port: options.port ?? 3002,
    hostname: options.hostname ?? "127.0.0.1",
    fetch(request, instance) {
      const url = new URL(request.url);
      const origin = request.headers.get("origin");
      const cors = { "Access-Control-Allow-Origin": origin && allowed(origin) ? origin : "*", "Cache-Control": "no-store" };
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...cors, "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" } });
      if (url.pathname === "/health") return Response.json({ status: "healthy", uptimeSeconds: Math.round(process.uptime()), ...presence.getStats(), memoryUsageMb: Math.round(process.memoryUsage().rss / 1024 / 1024) }, { headers: cors });
      if (url.pathname === "/stats") return Response.json({ ...presence.getStats(), timestamp: Date.now() }, { headers: cors });
      if (url.pathname !== "/ws" && url.pathname !== "/") return new Response("Not Found", { status: 404 });
      if (!allowed(origin)) return new Response("Origin not allowed", { status: 403 });
      const role = url.searchParams.get("role") === "dashboard" ? "dashboard" : "visitor";
      const visitorId = role === "visitor" ? url.searchParams.get("visitorId") || undefined : undefined;
      if (visitorId && !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(visitorId)) return new Response("Invalid visitorId", { status: 400 });
      // Caller-provided ?id never owns a connection or its cleanup.
      if (instance.upgrade(request, { data: { connectionId: crypto.randomUUID(), role, visitorId } })) return;
      return new Response("WebSocket upgrade failed", { status: 400 });
    },
    websocket: {
      idleTimeout: 30,
      sendPings: true,
      maxPayloadLength: 1024,
      backpressureLimit: 65536,
      closeOnBackpressureLimit: true,
      perMessageDeflate: false,
      open(socket) {
        if (socket.data.role === "visitor") presence.addVisitor(socket.data.connectionId, socket.data.visitorId);
        else {
          presence.addDashboard(socket.data.connectionId);
          socket.subscribe("metrics:presence");
          direct(socket);
        }
      },
      message(socket, frame) {
        const text = typeof frame === "string" ? frame : new TextDecoder().decode(frame);
        if (text === "ping") { socket.send("pong"); return; }
        try {
          const data = JSON.parse(text);
          if (data?.type === "ping") socket.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
          else if (data?.type === "get_presence") direct(socket);
        } catch { /* Malformed legacy messages do not change presence. */ }
      },
      close(socket) { presence.remove(socket.data.connectionId); },
      error(error) { if (options.log) console.error("[presence] WebSocket handler error:", error.message); },
    },
  });
  if (options.log) console.info(`[presence] Listening on ${server.url}`);
  return {
    server,
    getStats: presence.getStats,
    stop() {
      if (stopped) return;
      stopped = true;
      presence.stop();
      return server.stop(true);
    },
  };
}
