"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const LOGO_SRC = "/images/branding/Logo/Olentra-Logo-Without-Background.png";
/** Keeps the splash visible briefly so it feels intentional, not a flicker. */
const MIN_VISIBLE_MS = 550;
const FADE_OUT_MS = 380;

export default function Loader() {
  const [phase, setPhase] = useState("show");

  useEffect(() => {
    let cancelled = false;
    const t0 = performance.now();

    const scheduleHide = () => {
      if (cancelled) return;
      const elapsed = performance.now() - t0;
      const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
      window.setTimeout(() => {
        if (!cancelled) setPhase("hide");
      }, wait);
    };

    if (document.readyState === "complete") {
      scheduleHide();
    } else {
      window.addEventListener("load", scheduleHide, { once: true });
    }

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (phase !== "hide") return undefined;
    const t = window.setTimeout(() => setPhase("done"), FADE_OUT_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  if (phase === "done") return null;

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background transition-opacity motion-reduce:transition-none ${
        phase === "hide" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={{ transitionDuration: `${FADE_OUT_MS}ms` }}
      aria-busy={phase === "show"}
      role="status"
    >
      <span className="sr-only">Loading Olentra</span>

      <div className="pointer-events-none fixed inset-0 bg-cyber-grid opacity-[0.05]" aria-hidden />
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(37,99,235,0.14),transparent_55%)] dark:bg-[radial-gradient(circle_at_50%_42%,rgba(37,99,235,0.22),transparent_55%)]"
        aria-hidden
      />

      <div className="relative z-10 flex flex-col items-center">
        <div className="relative flex h-[5.5rem] w-[5.5rem] items-center justify-center">
          <div
            className="absolute inset-0 rounded-2xl border-2 border-transparent border-t-primary border-r-primary/50 motion-safe:animate-spin motion-reduce:animate-none"
            style={{ animationDuration: "2.4s" }}
            aria-hidden
          />
          <div className="relative flex h-[4.25rem] w-[4.25rem] items-center justify-center overflow-hidden rounded-xl border border-border/50 bg-card/90 p-2.5 shadow-[0_0_36px_rgba(37,99,235,0.22)] backdrop-blur-sm dark:bg-white/5">
            <Image
              src={LOGO_SRC}
              alt=""
              width={52}
              height={52}
              className="h-full w-full object-contain"
              priority
            />
          </div>
        </div>

        <p className="mt-8 font-display text-[10px] font-black uppercase tracking-[0.28em] text-primary">
          Olentra
        </p>

        <div
          className="mt-5 h-0.5 w-28 overflow-hidden rounded-full bg-border/70"
          aria-hidden
        >
          <div className="h-full w-2/5 rounded-full bg-primary motion-safe:animate-pulse motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  );
}
