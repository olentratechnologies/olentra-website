"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LOGO_SRC = "/images/branding/Logo/Olentra-Logo-Without-Background.png";
const MIN_VISIBLE_MS = 600;
const FADE_OUT_MS = 400;

export default function Loader({ isInitialLoad = true }) {
  const pathname = usePathname();
  // The public program at /careers/intern uses the normal website loader.
  const privateInternRoute = /^\/intern\/(login|register|reset-password|portal|dashboard)(\/|$)/.test(pathname);
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

      <div className="relative z-10 flex flex-col items-center">
        {/* Apple/Linear style minimal pulsing logo */}
        <div className="relative flex h-16 w-16 items-center justify-center transition-transform duration-700 ease-out">
          <Image
            src={LOGO_SRC}
            alt="Olentra"
            width={58}
            height={58}
            className="h-full w-full object-contain drop-shadow-[0_0_24px_rgba(59,130,246,0.5)] animate-pulse"
            style={{ animationDuration: "2s" }}
            priority
          />
        </div>

        {/* Minimal Linear Laser Progress Bar */}
        <div
          className="relative mt-8 h-[2px] w-32 overflow-hidden rounded-full bg-white/10"
          aria-hidden
        >
          <div
            className="absolute top-0 bottom-0 w-1/2 rounded-full bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_8px_rgba(59,130,246,0.9)] animate-laser"
          />
        </div>
      </div>

      <style jsx global>{`
        @keyframes laser-sweep {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(250%);
          }
        }
        .animate-laser {
          animation: laser-sweep 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
}
