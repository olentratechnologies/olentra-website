"use client";

import { LoadingAnimation } from "@olentra/ui/LoadingIndicator";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const MIN_VISIBLE_MS = 600;
const FADE_OUT_MS = 400;

export default function Loader({ isInitialLoad = true }) {
  const pathname = usePathname();
  // The public program at /careers/intern uses the normal website loader.
  const privateInternRoute = /^\/intern\/(login|register|reset-password|verify|portal|dashboard)(\/|$)/.test(pathname);
  // Never cover server-rendered content while JavaScript is still downloading.
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState("show");

  useEffect(() => {
    setMounted(true);
    // Route fallbacks stay visible until Next.js replaces them with the page.
    if (!isInitialLoad) return undefined;

    // Images, fonts and third-party resources must not block access to the page.
    const timer = window.setTimeout(() => setPhase("hide"), MIN_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [isInitialLoad]);

  useEffect(() => {
    if (phase !== "hide") return undefined;
    const t = window.setTimeout(() => setPhase("done"), FADE_OUT_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  if (pathname.startsWith("/dashboard") || privateInternRoute || (isInitialLoad && !mounted) || phase === "done") return null;

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center text-white transition-all motion-reduce:transition-none isolate ${
        phase === "hide" ? "pointer-events-none opacity-0 scale-[0.98]" : "opacity-100 scale-100"
      }`}
      style={{
        transitionDuration: `${FADE_OUT_MS}ms`,
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
        background: "#000000",
      }}
      aria-busy={phase === "show"}
      role="status"
    >
      <span className="sr-only">Loading Olentra</span>

      <LoadingAnimation priority />
    </div>
  );
}
