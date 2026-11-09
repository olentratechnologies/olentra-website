import type { ServerWebSocket } from "bun";
import type { ReturnTypeOfPresenceTracker } from "../../modules/presence/presence-tracker";
import { PRESENCE_TOPIC, type PresenceSocketData } from "./presence-topics";
import { handleLegacyMessage } from "./presence-protocol";
import { logger } from "../../infrastructure/observability/logger";

export function createPresenceWebSocketHandlers({
  presence,
  publish,
  log,
}: {
  presence: ReturnTypeOfPresenceTracker;
  publish: (payload: string) => void;
  log: boolean;
}) {
  const textDecoder = new TextDecoder();
  const direct = (socket: ServerWebSocket<PresenceSocketData>) => socket.send(presence.serialize());
  return {
    open(socket: ServerWebSocket<PresenceSocketData>) {
      if (socket.data.role === "visitor") presence.addVisitor(socket.data.connectionId, socket.data.visitorId);
      else {
        presence.addDashboard(socket.data.connectionId);
        socket.subscribe(PRESENCE_TOPIC);
        direct(socket);
      }
    },
    message(socket: ServerWebSocket<PresenceSocketData>, frame: string | Buffer) {
      const text = typeof frame === "string" ? frame : textDecoder.decode(frame);
      handleLegacyMessage(text, message => socket.send(message), () => direct(socket));
    },
    close(socket: ServerWebSocket<PresenceSocketData>) {
      presence.remove(socket.data.connectionId);
    },
    error(error: Error) {
      if (log) logger.error("WebSocket handler error", { error });
    },
    publish,
  };
}
