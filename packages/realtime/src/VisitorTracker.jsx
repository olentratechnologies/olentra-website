"use client";

import { useEffect } from "react";
import { subscribeVisitorTracking } from "./realtime.js";

export default function VisitorTracker() {
  // Count every browser route, including dashboard and internship workspaces.
  // The backend keeps presence and internship protocols isolated by path.
  useEffect(() => subscribeVisitorTracking(), []);
  return null;
}
