"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Phone, Mail } from "lucide-react";
import { PricingCalculator } from "./PricingCalculator";

export function PricingAndCtaSection() {
  return (
    <>
      {/* SECTION 7 (DARK): ENTERPRISE PRICING (#020617) */}
      <section
        id="pricing"
        data-theme="dark"
        className="relative w-full py-16 sm:py-24 bg-[#020617] text-white overflow-hidden border-t border-white/[0.08] transition-colors duration-500"
      >
        {/* Dark Cyber Grid & Radial Glow */}
        <div className="pointer-events-none absolute inset-0 bg-cyber-grid opacity-[0.03]" />
        <div className="pointer-events-none absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.08),transparent_70%)]" />

        <div className="relative z-10 px-4 sm:px-6 lg:px-10 max-w-6xl mx-auto">
          {/* Section Header (Dark Theme) */}
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-4 shadow-sm">
              TRANSPARENT STORE LICENSING
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tighter uppercase leading-[1.05]">
              Simple, Predictable Plans for{" "}
              <span className="text-primary italic">Community Stores</span>
            </h2>
            <p className="mt-4 text-sm sm:text-base text-slate-400 font-medium leading-relaxed">
              From standalone grocery POS counters to complete society commerce with automated inventory and milk subscriptions.
            </p>
          </div>

          <PricingCalculator />
        </div>
      </section>

      {/* SECTION 8 (WHITE): COMMUNITY COMMERCE CTA BANNER (#FFFFFF) */}
      <section
        id="cta"
        data-theme="light"
        className="relative w-full py-20 sm:py-28 bg-white text-slate-900 overflow-hidden border-t border-slate-200 transition-colors duration-500"
      >
        {/* Light Cyber Grid & Radial Glow */}
        <div className="pointer-events-none absolute inset-0 bg-cyber-grid-light opacity-60" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.06),transparent_70%)]" />

        <div className="relative z-10 px-4 sm:px-6 lg:px-10 max-w-6xl mx-auto">
          {/* High-Contrast Light Callout Card */}
          <div className="relative rounded-2xl px-6 py-12 sm:px-16 sm:py-16 text-center bg-slate-50 border border-slate-200 shadow-[0_25px_70px_rgba(15,23,42,0.08)] overflow-hidden">
            {/* Top Primary Accent Bar */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-primary to-transparent" />

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-5">
              JOIN THE COMMUNITY COMMERCE NETWORK
            </div>

            <h3 className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase max-w-3xl mx-auto leading-[1.08]">
              Ready to Run Your Entire Community Retail Business{" "}
              <span className="text-primary italic">
                with DailySupply?
              </span>
            </h3>
            <p className="mt-4 text-sm sm:text-base text-slate-600 font-medium max-w-2xl mx-auto leading-relaxed">
              Empower your grocery store or milk agency with lightning-fast POS, society marketplace connectivity, and automated khata collections.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/contact"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-primary hover:bg-blue-700 px-8 py-4 text-xs font-black uppercase tracking-[0.2em] text-white shadow-[0_10px_25px_rgba(37,99,235,0.35)] transition-all duration-300"
                style={{
                  clipPath:
                    "polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)",
                }}
              >
                <span>Request Store Demo</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="tel:+919100125055"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-black uppercase tracking-[0.2em] text-slate-900 transition-all duration-300 shadow-sm"
              >
                <Phone className="w-3.5 h-3.5 text-primary" />
                <span>+91 9100125055</span>
              </a>
              <a
                href="mailto:madhu@dailysupply.in"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-black uppercase tracking-[0.2em] text-slate-900 transition-all duration-300 shadow-sm"
              >
                <Mail className="w-3.5 h-3.5 text-primary" />
                <span>madhu@dailysupply.in</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
