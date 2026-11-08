"use client";

import { Radio } from "lucide-react";
import { useDashboardPresence } from "@/hooks/useDashboardPresence";
import { Stat } from "./ui";

const countLabel = count => count === 1 ? "user" : "users";
const statusLabel = ({ isConnected, hasSnapshot }) => isConnected ? "LIVE" : hasSnapshot ? "RECONNECTING" : "CONNECTING";
const countValue = presence => presence.hasSnapshot ? presence.activeVisitors.toLocaleString("en-GB") : "—";

// Only these small counters subscribe to presence updates. The surrounding
// navigation, charts and JSON metric calculations do not rerender on each tick.
export function LiveUserPill() {
  const presence = useDashboardPresence();
  const { activeVisitors, isConnected, hasSnapshot } = presence;
  const status = statusLabel(presence);
  return <div
    className={"ad-live-pill" + (isConnected ? "" : " is-offline")}
    data-presence-status={status.toLowerCase()}
    title={isConnected ? "Each active browser counts once across its website tabs." : hasSnapshot ? "Connection interrupted. Showing the last received count while reconnecting." : "Connecting to the live user count…"}
  >
    <span className="ad-live-dot" />
    <span><b data-presence-count={hasSnapshot ? activeVisitors : ""}>{countValue(presence)}</b> {countLabel(activeVisitors)} {isConnected ? "live" : "· " + status.toLowerCase()}</span>
  </div>;
}

export function LiveUsersStat() {
  const presence = useDashboardPresence();
  return <Stat
    spark={false}
    label="Live website users"
    value={<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }} data-presence-count={presence.hasSnapshot ? presence.activeVisitors : ""}>
      {countValue(presence)}
      <span className={"ad-live-pill" + (presence.isConnected ? "" : " is-offline")} data-presence-status={statusLabel(presence).toLowerCase()} style={{ fontSize: 10, padding: "2px 7px" }} title="Each active browser counts once across its website tabs.">
        <span className="ad-live-dot" />{statusLabel(presence)}
      </span>
    </span>}
    icon={Radio}
    color="#10b981"
  />;
}
