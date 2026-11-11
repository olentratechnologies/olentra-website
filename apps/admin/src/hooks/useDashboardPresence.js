"use client";

import { useSyncExternalStore } from "react";
import { getDashboardPresenceSnapshot, getServerPresenceSnapshot, subscribeDashboardPresence } from "@olentra/realtime/realtime";

export function useDashboardPresence() {
  return useSyncExternalStore(subscribeDashboardPresence, getDashboardPresenceSnapshot, getServerPresenceSnapshot);
}
