import type { ReturnTypeOfPresenceTracker } from "../../modules/presence/presence-tracker";

export function statsResponse(presence: ReturnTypeOfPresenceTracker, cors: Record<string, string>) {
  return Response.json({ ...presence.getStats(), timestamp: Date.now() }, { headers: cors });
}
