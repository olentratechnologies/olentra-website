"use client";

import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
gsap.registerPlugin(useGSAP);

const VIDEO_URL = "/videos/hero-video.mp4";
const POSTER_URL = "/videos/hero-poster.jpg";

const FEATS = [
  "Enterprise Modernization",
  "Data Intelligence",
  "Applied AI",
  "Cyber Resilience",
];

export default function Hero() {
  const videoRef = useRef(null);
  const root = useRef(null);

  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo("[data-hero-enter]", { autoAlpha: 0, y: 18 }, {
        autoAlpha: 1, y: 0, duration: 0.75, stagger: 0.12, ease: "power3.out", delay: 1.25,
      });
    });
    return () => media.revert();
  }, { scope: root });

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

    return () => {
      if (query.removeEventListener) query.removeEventListener("change", sync);
      else query.removeListener(sync);
    };
  }, []);

  return (
    <>
      <section
        data-testid="hero-section"
        ref={root}
        className="cc-hero is-entered relative w-full h-[100vh] min-h-[640px] overflow-hidden bg-[#070b12] text-white flex flex-col justify-between"
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
          poster={POSTER_URL}
          src={VIDEO_URL}
        />

        {/* Atmospheric Radial Veil */}
        <div className="cc-veil absolute inset-0 z-[1] pointer-events-none" aria-hidden="true" />

        {/* Hero Content */}
        <div className="relative z-20 flex-1 flex flex-col items-center justify-center text-center px-3 sm:px-4 md:px-6 pt-0 sm:pt-4 md:pt-8 my-auto">
          {/* Localized Dark Scrim Backdrop to insulate text from the bright video flares */}
          <div
            className="pointer-events-none absolute inset-0 max-w-4xl mx-auto rounded-full blur-3xl opacity-80 z-0"
            style={{
              background:
                "radial-gradient(ellipse 70% 55% at 50% 50%, rgba(2, 6, 23, 0.92) 0%, rgba(2, 6, 23, 0.50) 60%, transparent 100%)",
            }}
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center w-full">
            <h1 data-hero-enter
              className="text-[clamp(2rem,6vw,4.1rem)] font-semibold text-white tracking-tight leading-[1.05] sm:leading-[1] mb-6 drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)]"
            >
              Transforming Businesses Through
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-primary to-blue-600 drop-shadow-[0_0_30px_rgba(37,99,235,0.35)]">
                {" "}
                Technology
              </span>
            </h1>

            <p data-hero-enter
              className="text-[0.98rem] md:text-[1.1rem] text-slate-300/90 leading-relaxed mb-10 sm:mb-12 max-w-3xl font-medium drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]"
            >
              We design, build, and operate production-grade systems across
              cloud, data, and AI. Expect disciplined execution, clear
              milestones, and measurable outcomes.
            </p>

            <div data-hero-enter
              className="flex justify-center w-full sm:w-auto"
            >
              <div className="snake-border">
                <a
                  href="#contact"
                  className="cc-cta px-5 sm:px-7 md:px-9 py-3 sm:py-3.5 md:py-4 gap-2 sm:gap-2.5 md:gap-3 text-xs sm:text-sm md:text-base font-bold text-white tracking-wide shadow-[0_0_30px_rgba(37,99,235,0.45)] hover:shadow-[0_0_40px_rgba(37,99,235,0.7)]"
                >
                  <span>Partner With Us</span>
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
                <li data-hero-enter
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
    </>
  );
}
