"use client";

import React, { useState, useEffect, useRef } from "react";
import { Wand2 } from "lucide-react";

const VIDEO_URL = "/videos/dailysupply-hero.mp4";

const FEATS = [
  "Smart Retail POS",
  "Milk Subscriptions",
  "Society Marketplace",
  "Credit Khata Ledger",
];

export function VideoHeroSection() {
  const [isEntered, setIsEntered] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      if (!videoRef.current) return;
      if (query.matches) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      } else {
        void videoRef.current.play().catch(() => {});
      }
    };
    sync();

    if (query.addEventListener) query.addEventListener("change", sync);
    else query.addListener(sync);

    const timer = window.setTimeout(() => {
      setIsEntered(true);
    }, 3200);

    return () => {
      if (query.removeEventListener) query.removeEventListener("change", sync);
      else query.removeListener(sync);
      clearTimeout(timer);
    };
  }, []);

  return (
    <section
      id="home"
      data-theme="dark"
      className={`cc-hero relative w-full h-[100vh] min-h-[640px] overflow-hidden bg-[#02060f] text-white flex flex-col justify-between ${
        isEntered ? "is-entered" : ""
      }`}
    >
      {/* Neural Warp Video Background */}
      <video
        ref={videoRef}
        className="cc-art absolute inset-0 w-full h-full object-cover object-center z-0 pointer-events-none select-none"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        src={VIDEO_URL}
      />

      {/* Atmospheric Radial Veil */}
      <div className="cc-veil absolute inset-0 z-[1] pointer-events-none" aria-hidden="true" />

      {/* Main Hero Animation & Typography Stage */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center text-center px-3 sm:px-4 md:px-6 pt-0 sm:pt-4 md:pt-8 my-auto">
        {/* Localized Dark Scrim Backdrop */}
        <div
          className="pointer-events-none absolute inset-0 max-w-4xl mx-auto rounded-full blur-3xl opacity-80 z-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 50% 50%, rgba(2, 6, 23, 0.92) 0%, rgba(2, 6, 23, 0.50) 60%, transparent 100%)",
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center w-full">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/20 mb-5 font-black text-[9px] tracking-[0.3em] text-blue-300 uppercase backdrop-blur-md">
            DAILYSUPPLY ENTERPRISE ERP
          </div>

          {/* Headline with Sora Typography and Entrance Reveal */}
          <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-[66px] font-bold tracking-tight leading-[1.1] sm:leading-[1.08] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)]">
            <span className="block cc-anim-h1a">
              Run Your Entire Community Retail Business,
            </span>
            <span className="block mt-1 sm:mt-2 text-primary italic font-black cc-anim-h1b drop-shadow-[0_0_35px_rgba(37,99,235,0.7)]">
              In One Intelligent Platform.
            </span>
          </h1>

          {/* Subtitle with High-Contrast Legibility */}
          <p className="mt-3 sm:mt-4 md:mt-6 text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl text-slate-100 font-medium leading-relaxed max-w-2xl mx-auto drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]">
            <span className="block sm:inline cc-anim-sub1">
              DailySupply powers stores, vendors, and communities with a complete commerce system —{" "}
            </span>
            <span className="block sm:inline cc-anim-sub2">
              POS, marketplace, subscriptions, inventory, credit ledger, and AI analytics.
            </span>
          </p>

          {/* Glassmorphic Animated CTA Button with Signature Blue Glow */}
          <div className="mt-5 sm:mt-7 md:mt-9 cc-anim-cta">
            <div className="snake-border">
              <a
                href="#command-center"
                className="cc-cta px-5 sm:px-7 md:px-9 py-3 sm:py-3.5 md:py-4 gap-2 sm:gap-2.5 md:gap-3 text-xs sm:text-sm md:text-base font-bold text-white tracking-wide shadow-[0_0_30px_rgba(37,99,235,0.45)] hover:shadow-[0_0_40px_rgba(37,99,235,0.7)]"
              >
                <Wand2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                <span>Explore the Platform</span>
                <svg
                  className="w-3.5 h-2.5 sm:w-4 sm:h-3 cc-arrow ml-1"
                  viewBox="0 0 16 11"
                  aria-hidden="true"
                >
                  <path d="M0 5.5 H14.6 M10.3 1.2 L14.9 5.5 L10.3 9.8" />
                </svg>
              </a>
            </div>
          </div>

          {/* Feature Chevrons */}
          <ul className="mt-6 sm:mt-8 md:mt-12 flex flex-wrap items-center justify-center gap-3 sm:gap-4 md:gap-8 lg:gap-10 w-full">
            {FEATS.map((feat, index) => (
              <li
                key={feat}
                className={`flex items-center gap-1.5 sm:gap-2 md:gap-2.5 text-[10px] sm:text-xs md:text-sm font-semibold text-slate-100 cc-anim-f${
                  index + 1
                }`}
              >
                <svg
                  className="w-2 h-3.5 sm:w-2.5 sm:h-4 cc-chev shrink-0 text-primary drop-shadow-[0_0_8px_rgba(37,99,235,0.8)]"
                  viewBox="0 0 11 20"
                  aria-hidden="true"
                >
                  <path d="M1.15 1.15 L9.6 10 L1.15 18.85" />
                </svg>
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
