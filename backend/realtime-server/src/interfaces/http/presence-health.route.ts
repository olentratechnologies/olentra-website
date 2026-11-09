import type { ReturnTypeOfPresenceTracker } from "../../modules/presence/presence-tracker";

export function healthResponse(presence: ReturnTypeOfPresenceTracker, cors: Record<string, string>) {
  return Response.json({
    status: "healthy",
    uptimeSeconds: Math.round(process.uptime()),
    ...presence.getStats(),
    memoryUsageMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
  }, { headers: cors });
}
