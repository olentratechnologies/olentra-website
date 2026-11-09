import { realtimeTopic } from "./topic-registry";

export const PRESENCE_TOPIC = realtimeTopic("presence", "presence");
export type PresenceRole = "visitor" | "dashboard";
export type PresenceSocketData = { kind: "presence"; connectionId: string; role: PresenceRole; visitorId?: string };
