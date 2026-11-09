"use client";

import { useSyncExternalStore } from "react";
import { getDashboardPresenceSnapshot, getServerPresenceSnapshot, subscribeDashboardPresence } from "@/lib/realtime";

export function useDashboardPresence() {
  return useSyncExternalStore(subscribeDashboardPresence, getDashboardPresenceSnapshot, getServerPresenceSnapshot);
}
