import { createPresenceServer } from "./server";

const instance = createPresenceServer({
  port: Number(process.env.PORT || 3002),
  hostname: process.env.HOST || "0.0.0.0",
  allowedOrigins: (process.env.ALLOWED_ORIGINS || "").split(",").map(origin => origin.trim()).filter(Boolean),
  broadcastIntervalMs: Number(process.env.PRESENCE_BROADCAST_INTERVAL_MS || 100),
  log: process.env.PRESENCE_LOG === "true",
});

console.info(`[presence] Listening on ${instance.server.url} (unique browsers; ${process.env.PRESENCE_BROADCAST_INTERVAL_MS || 100}ms updates)`);
for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => { void instance.stop(); });
