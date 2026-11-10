"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { pendingWorkspaceDestination, workspacePath } from "@/lib/intern/workspace-navigation.mjs";

export default function useWorkspaceNavigation(pathname) {
  const router = useRouter();
  const [destination, setDestination] = useState(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const cancelPreview = () => setDestination(null);
    window.addEventListener("popstate", cancelPreview);
    return () => window.removeEventListener("popstate", cancelPreview);
  }, []);

  const navigate = useCallback(href => {
    const samePage = workspacePath(href) === workspacePath(pathname);
    if (samePage && !pending) return;
    // Keep this update urgent: route data/code can still be loading in DEV.
    setDestination(samePage ? null : href);
    if (!samePage) window.scrollTo({ top: 0, behavior: "instant" });
    // A same-page click during another navigation also cancels that navigation
    // through Next's router rather than only clearing our visual feedback.
    startTransition(() => router.push(href));
  }, [pathname, pending, router]);

  return {
    navigate,
    pendingPathname: pendingWorkspaceDestination(destination, pathname, pending),
  };
}
