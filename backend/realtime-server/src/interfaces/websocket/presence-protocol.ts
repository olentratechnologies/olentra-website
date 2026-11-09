import type { PresenceRole } from "./presence-topics";

export function parseConnectionQuery(url: URL): { role: PresenceRole; visitorId?: string } | { error: string } {
  const role = url.searchParams.get("role") === "dashboard" ? "dashboard" : "visitor";
  const visitorId = role === "visitor" ? url.searchParams.get("visitorId") || undefined : undefined;
  if (visitorId && !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(visitorId)) return { error: "Invalid visitorId" };
  return { role, visitorId };
}

export function handleLegacyMessage(text: string, send: (message: string) => void, direct: () => void) {
  if (text === "ping") { send("pong"); return; }
  try {
    const data = JSON.parse(text);
    if (data?.type === "ping") send(`{"type":"pong","timestamp":${Date.now()}}`);
    else if (data?.type === "get_presence") direct();
  } catch {
    // Malformed legacy messages do not change presence.
  }
}
