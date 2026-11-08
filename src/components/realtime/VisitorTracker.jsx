"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { subscribeVisitorTracking } from "@/lib/realtime";

export default function VisitorTracker() {
  const pathname = usePathname();
  const eligible = Boolean(pathname && !pathname.startsWith("/dashboard"));
  // Count a browser while connected; public route changes do not reconnect it.
  useEffect(() => eligible ? subscribeVisitorTracking() : undefined, [eligible]);
  return null;
}
