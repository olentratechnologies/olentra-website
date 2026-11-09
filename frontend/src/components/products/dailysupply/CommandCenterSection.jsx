"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Wand2,
  Search,
  Bell,
  LayoutGrid,
  Activity,
  Layers,
  CreditCard,
  Settings,
  Plus,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  Lock,
  Share,
  Copy,
} from "lucide-react";
import { NexaLogo } from "./DailySupplyLogo";
import {
  DualSplineChart,
  ProgressRing,
  MultiSegmentDonut,
  HolographicVisaCard,
} from "./Charts";

const STAGE_WIDTH = 1280;
const STAGE_HEIGHT = 548;

export function CommandCenterSection() {
  const stageWrapperRef = useRef(null);
  const [stageScale, setStageScale] = useState(1);

  useEffect(() => {
    const el = stageWrapperRef.current;
    if (!el) return;

    const updateScale = () => {
      const parentW = el.parentElement?.clientWidth || window.innerWidth;
      const w = Math.min(window.innerWidth, parentW, STAGE_WIDTH);
      if (w > 0) {
        setStageScale(Math.min(1, w / STAGE_WIDTH));
      }
    };

    updateScale();
    const ro = new ResizeObserver(updateScale);
    if (el.parentElement) ro.observe(el.parentElement);
    window.addEventListener("resize", updateScale);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, []);

  return (
    <section
      id="command-center"
      data-theme="light"
      className="relative w-full bg-white text-slate-900 pt-8 pb-16 sm:pt-10 sm:pb-20 overflow-hidden border-b border-slate-200 transition-colors duration-500"
    >
      {/* Olentra Light Cyber Grid & Radial Spotlight */}
      <div className="pointer-events-none absolute inset-0 bg-cyber-grid-light opacity-60 z-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_40%,rgba(37,99,235,0.06),transparent_70%)] z-0" />

      {/* Full-Bleed Command Center Canvas */}
      <div className="relative w-full max-w-[1280px] mx-auto flex flex-col justify-between">
        {/* ============================================================
            SECTION HEADER & EDITORIAL COPY BLOCK
           ============================================================ */}
        <div className="relative z-20 mx-auto w-full max-w-[960px] px-5 sm:px-10 lg:px-12 pt-2 sm:pt-4 pb-10 sm:pb-14 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[44px] font-black uppercase tracking-tighter leading-[1.06] text-slate-900 text-balance">
            The Complete Commerce Platform for{" "}
            <span className="text-primary italic">Community Stores & Vendors</span>
          </h2>

          <p className="mx-auto mt-4 max-w-[640px] text-sm sm:text-base text-slate-600 font-medium leading-relaxed text-pretty">
            DailySupply connects local grocery stores, milk vendors, and residential societies into one seamless commerce network with smart POS, subscriptions, and khata credit.
          </p>


        </div>

        {/* ============================================================
            DUAL OVERLAPPING BROWSER WINDOWS STAGE (Identical on Desktop & Mobile)
           ============================================================ */}
        <div
          ref={stageWrapperRef}
          className="relative z-20 w-full max-w-[1280px] mx-auto"
          style={{
            height: `${Math.round(STAGE_HEIGHT * stageScale)}px`,
          }}
        >
          <div
            className="relative origin-top-left select-none"
            style={{
              width: `${STAGE_WIDTH}px`,
              height: `${STAGE_HEIGHT}px`,
              transform: `scale(${stageScale})`,
            }}
          >
            {/* Continuous Electric Blue-White Rim Glow along Top of Front-Right Window */}
            <div
              className="pointer-events-none absolute top-[6px] left-[485px] w-[755px] h-[14px] rounded-full blur-[8px] opacity-75 z-10"
              style={{
                background:
                  "linear-gradient(90deg, rgba(37,99,235,0.85) 0%, rgba(147,197,253,1) 32%, #FFFFFF 56%, rgba(147,197,253,1) 80%, rgba(37,99,235,0.8) 100%)",
                boxShadow:
                  "0 0 24px 6px rgba(59,130,246,0.6), 0 0 44px 10px rgba(37,99,235,0.35)",
              }}
            />

            {/* Continuous Rim Glow along Top of Back-Left Window */}
            <div
              className="pointer-events-none absolute top-[102px] left-[45px] w-[455px] h-[14px] rounded-full blur-[8px] opacity-75 z-0"
              style={{
                background:
                  "linear-gradient(90deg, rgba(37,99,235,0.75) 0%, rgba(147,197,253,0.95) 55%, #FFFFFF 95%)",
                boxShadow:
                  "0 0 22px 5px rgba(59,130,246,0.55), 0 0 40px 9px rgba(37,99,235,0.3)",
              }}
            />

            {/* ============================================================
                1. BACK-LEFT BROWSER WINDOW (Portfolio / Supply Chain)
               ============================================================ */}
            <div className="absolute left-[50px] top-[110px] bottom-0 w-[520px] rounded-t-2xl bg-[#0F172A] border-t border-l border-blue-400/60 shadow-[0_-6px_32px_rgba(37,99,235,0.35)] overflow-hidden z-10">
              {/* macOS Window Chrome */}
              <div className="flex items-center justify-between px-3.5 py-2 bg-[#1E293B] border-b border-white/[0.07]">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
                  </div>
                  <div className="flex items-center gap-1 text-slate-500 ml-2">
                    <ChevronLeft className="w-3 h-3" />
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-4 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.06] text-[9px] text-slate-300 font-mono">
                  <Lock className="w-2.5 h-2.5 text-slate-400" />
                  <span>https://dailysupply.co.in/store/subscriptions</span>
                </div>
                <div className="w-8" />
              </div>

              {/* Inner Top Navbar with Center Blue Spotlight */}
              <div className="relative flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
                {/* Top-center blue radial spotlight */}
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-20"
                  style={{
                    background:
                      "radial-gradient(ellipse at 48% 0%, rgba(37,99,235,0.42) 0%, transparent 72%)",
                  }}
                />
                <div className="relative z-10">
                  <NexaLogo size="sm" variant="cube" />
                </div>
                <div className="relative z-10 flex items-center gap-0.5 bg-slate-900/90 p-1 rounded-full border border-white/10 text-[9.5px]">
                  <span className="px-3 py-0.5 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold shadow-[0_0_12px_rgba(37,99,235,0.7)]">
                    Overview
                  </span>
                  <span className="px-2.5 py-0.5 text-slate-300">Deliveries</span>
                  <span className="px-2.5 py-0.5 text-slate-300">Subscribers</span>
                  <span className="px-2.5 py-0.5 text-slate-300">Khata</span>
                  <span className="px-2.5 py-0.5 text-slate-300">Billing</span>
                </div>
                <div className="w-6" />
              </div>

              {/* Window Body */}
              <div className="relative flex p-3.5 gap-3">
                {/* Left Vertical Icon Pill Bar */}
                <div className="flex flex-col items-center gap-2.5 py-2.5 px-1.5 rounded-full bg-slate-800/80 border border-white/[0.07] h-fit">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center text-white shadow-[0_0_12px_rgba(37,99,235,0.8)]">
                    <LayoutGrid className="w-3 h-3" />
                  </div>
                  <div className="w-6 h-6 rounded-full bg-white/[0.05] flex items-center justify-center text-slate-400">
                    <Activity className="w-3 h-3" />
                  </div>
                  <div className="w-6 h-6 rounded-full bg-white/[0.05] flex items-center justify-center text-slate-400">
                    <Layers className="w-3 h-3" />
                  </div>
                  <div className="w-6 h-6 rounded-full bg-white/[0.05] flex items-center justify-center text-slate-400">
                    <CreditCard className="w-3 h-3" />
                  </div>
                  <div className="w-6 h-6 rounded-full bg-white/[0.05] flex items-center justify-center text-slate-400">
                    <Settings className="w-3 h-3" />
                  </div>
                </div>

                {/* Main Portfolio / Supply Chain Content */}
                <div className="flex-1 space-y-2.5 pr-12">
                  <div>
                    <h3 className="text-xs font-bold text-white">Society Subscriptions</h3>
                    <p className="text-[9px] text-slate-400">
                      Manage daily milk deliveries and khata collections in one click
                    </p>
                  </div>

                  {/* Portfolio Value Card */}
                  <div className="relative p-3.5 rounded-xl bg-[#1B1A29]/95 border border-white/[0.08] h-[142px] flex flex-col justify-between overflow-hidden">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[9.5px] text-slate-300 font-medium">
                          Monthly Subscription MRR
                        </span>
                        <div className="text-lg font-bold text-white mt-0.5">
                          ₹2,41,130
                        </div>
                        <p className="text-[8.5px] text-slate-400 mt-1 max-w-[175px] leading-relaxed">
                          Your milk delivery profit is{" "}
                          <span className="text-slate-200 font-semibold">
                            ₹24,800
                          </span>{" "}
                          that&apos;s the best result in the last one month.
                        </p>
                      </div>

                      <div className="mr-14">
                        <div className="inline-flex items-center gap-1 text-blue-400 text-xs font-bold">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>+16.5%</span>
                        </div>
                        <p className="text-[8px] text-slate-400">
                          better than last month
                        </p>
                      </div>
                    </div>

                    {/* Stepping Rounded Blue Bars in Bottom-Right */}
                    <div className="absolute bottom-3 right-3 flex items-end gap-2 h-[82px]">
                      {[30, 44, 72, 54, 92, 65].map((pct, i) => (
                        <div
                          key={i}
                          className="w-6 rounded-t-md"
                          style={{
                            height: `${pct}%`,
                            background:
                              i === 2 || i === 4
                                ? "linear-gradient(180deg, #60A5FA 0%, #2563EB 100%)"
                                : "linear-gradient(180deg, rgba(37,99,235,0.55) 0%, rgba(59,130,246,0.4) 100%)",
                            boxShadow:
                              i === 2 || i === 4
                                ? "0 0 14px rgba(37,99,235,0.65)"
                                : "none",
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Bottom 2 Mini Cards: Total Income & Total Expense */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-xl bg-[#1B1A29]/95 border border-white/[0.08] flex items-end justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[9.5px] text-slate-300 font-medium">
                            Society Collections
                          </span>
                        </div>
                        <div className="text-xs font-bold text-white mt-1">
                          ₹1,42,200
                        </div>
                        <p className="text-[8px] text-slate-400 mt-1 leading-snug">
                          Collection rate increased{" "}
                          <span className="text-blue-400 font-semibold">
                            +2.5%
                          </span>
                          <br />
                          with auto-pay
                        </p>
                      </div>
                      {/* Glowing blue dot-matrix pyramid */}
                      <div className="flex items-end gap-0.5 shrink-0">
                        {[1, 2, 3, 5, 4, 2, 1].map((h, i) => (
                          <div key={i} className="flex flex-col gap-0.5">
                            {Array.from({ length: h }).map((_, j) => (
                              <span
                                key={j}
                                className="w-1 h-1 rounded-[1px] bg-blue-400 shadow-[0_0_4px_#3B82F6]"
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#1B1A29]/95 border border-white/[0.08] flex items-end justify-between">
                      <div>
                        <span className="text-[9.5px] text-slate-300 font-medium">
                          Vendor Procurement
                        </span>
                        <div className="text-xs font-bold text-white mt-1">
                          ₹44,890
                        </div>
                        <p className="text-[8px] text-slate-400 mt-1 leading-snug">
                          Procurement cost saved
                          <br />
                          <span className="text-rose-400 font-semibold">
                            -2.0%
                          </span>{" "}
                          via wholesale rates
                        </p>
                      </div>
                      {/* Glowing peach/coral dot-matrix pyramid */}
                      <div className="flex items-end gap-0.5 shrink-0">
                        {[1, 3, 4, 3, 2].map((h, i) => (
                          <div key={i} className="flex flex-col gap-0.5">
                            {Array.from({ length: h }).map((_, j) => (
                              <span
                                key={j}
                                className="w-1 h-1 rounded-[1px] bg-orange-200/90"
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ============================================================
                2. FRONT-RIGHT BROWSER WINDOW (Dashboard / Executive ERP Command Center)
               ============================================================ */}
            <div className="absolute left-[490px] top-[14px] bottom-0 w-[742px] rounded-t-2xl bg-[#0F172A] border-t border-x border-blue-300/80 shadow-[0_-6px_36px_rgba(37,99,235,0.38)] overflow-hidden z-20">
              {/* macOS Window Chrome */}
              <div className="flex items-center justify-between px-4 py-2 bg-[#1E293B] border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
                  </div>
                  <div className="flex items-center gap-1 text-slate-500 ml-2">
                    <ChevronLeft className="w-3 h-3" />
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-6 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.06] text-[9.5px] text-slate-300 font-mono">
                  <Lock className="w-2.5 h-2.5 text-slate-400" />
                  <span>https://dailysupply.co.in/store/pos-dashboard</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-400">
                  <Share className="w-3 h-3" />
                  <Plus className="w-3 h-3" />
                  <Copy className="w-3 h-3" />
                </div>
              </div>

              {/* Inner Dashboard Top Header with Centered Blue Spotlight */}
              <div className="relative flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-24"
                  style={{
                    background:
                      "radial-gradient(ellipse at 44% 0%, rgba(37,99,235,0.48) 0%, rgba(59,130,246,0.18) 45%, transparent 72%)",
                  }}
                />

                <div className="relative z-10">
                  <NexaLogo size="sm" variant="cube" />
                </div>

                <div className="relative z-10 flex items-center gap-0.5 bg-slate-900/90 p-1 rounded-full border border-white/10 text-[10px]">
                  <span className="px-3 py-0.5 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold shadow-[0_0_12px_rgba(37,99,235,0.75)]">
                    POS Counter
                  </span>
                  <span className="px-2.5 py-0.5 text-slate-300">Inventory</span>
                  <span className="px-2.5 py-0.5 text-slate-300">Khata</span>
                  <span className="px-2.5 py-0.5 text-slate-300">Orders</span>
                  <span className="px-2.5 py-0.5 text-slate-300">Reports</span>
                </div>

                <div className="relative z-10 flex items-center gap-1.5">
                  <button className="w-6 h-6 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-slate-300">
                    <Search className="w-3 h-3" />
                  </button>
                  <button className="w-6 h-6 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-slate-300">
                    <Bell className="w-3 h-3" />
                  </button>
                  <button className="w-6 h-6 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-slate-300">
                    <Settings className="w-3 h-3" />
                  </button>
                  <div className="flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full bg-white/[0.07] border border-white/10">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-blue-600 via-blue-500 to-sky-400 flex items-center justify-center text-[8.5px] font-bold text-white">
                      DS
                    </div>
                    <div className="leading-tight text-left">
                      <div className="text-[8.5px] font-semibold text-white">
                        DailySupply Store
                      </div>
                      <div className="text-[7.5px] text-slate-400">
                        madhu@dailysupply.in
                      </div>
                    </div>
                    <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Inner Dashboard Body */}
              <div className="flex p-3.5 gap-3">
                {/* Left Vertical Icon Pill Sidebar */}
                <div className="flex flex-col items-center gap-2.5 py-2.5 px-1.5 rounded-full bg-slate-800/80 border border-white/[0.07] h-fit">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center text-white shadow-[0_0_12px_rgba(37,99,235,0.85)]">
                    <LayoutGrid className="w-3 h-3" />
                  </div>
                  <div className="w-6 h-6 rounded-full bg-white/[0.05] flex items-center justify-center text-slate-400">
                    <Activity className="w-3 h-3" />
                  </div>
                  <div className="w-6 h-6 rounded-full bg-white/[0.05] flex items-center justify-center text-slate-400">
                    <Layers className="w-3 h-3" />
                  </div>
                  <div className="w-6 h-6 rounded-full bg-white/[0.05] flex items-center justify-center text-slate-400">
                    <CreditCard className="w-3 h-3" />
                  </div>
                  <div className="w-6 h-6 rounded-full bg-white/[0.05] flex items-center justify-center text-slate-400">
                    <Settings className="w-3 h-3" />
                  </div>
                </div>

                {/* Main 2-Section Dashboard Content */}
                <div className="flex-1 min-w-0 space-y-2.5">
                  {/* TOP SECTION: Left 9 Cols (Dashboard Header + Total Balance + Transaction Overview) | Right 3 Cols (Your Card spanning full height) */}
                  <div className="grid grid-cols-12 gap-2.5 items-stretch">
                    {/* Left 9 Columns: Title Row + 2 Cards */}
                    <div className="col-span-9 flex flex-col justify-between gap-2">
                      {/* Title Bar */}
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-bold text-white">
                            POS Command Center
                          </h3>
                          <p className="text-[9px] text-slate-400">
                            Real-time counter billing, inventory syncing, and society orders
                          </p>
                        </div>
                        <button className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.08] border border-white/15 text-[9px] text-slate-200 font-medium">
                          <Plus className="w-2.5 h-2.5" />
                          <span>Hold Cart</span>
                        </button>
                      </div>

                      {/* Sub-grid: Total Balance (4 cols) + Transaction Overview (8 cols) */}
                      <div className="grid grid-cols-12 gap-2.5 flex-1">
                        {/* Widget 1: Total Balance */}
                        <div className="col-span-4 p-2.5 rounded-xl bg-[#1B1A29]/95 border border-white/[0.08] flex flex-col justify-between">
                          <div>
                            <span className="text-[9px] text-slate-400">
                              Today's POS Sales
                            </span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                              <span className="text-xs font-bold text-white">
                                ₹5,46,890
                              </span>
                              <span className="text-[8px] font-semibold text-blue-400">
                                ↗ +10.5%
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 mt-2">
                              <button className="py-1 rounded-full bg-white/[0.07] border border-white/10 text-[8.5px] text-slate-200 font-medium">
                                Add Stock
                              </button>
                              <button className="py-1 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 text-[8.5px] text-white font-semibold shadow-[0_0_10px_rgba(37,99,235,0.5)]">
                                Quick Bill
                              </button>
                            </div>
                          </div>

                          <div className="mt-2 pt-2 border-t border-white/[0.07]">
                            <div className="grid grid-cols-2 gap-1 text-[8px]">
                              <div>
                                <span className="text-slate-400 block">
                                  Cash & UPI
                                </span>
                                <span className="text-white font-semibold text-[9.5px]">
                                  ₹3,47,560
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block">
                                  Khata Credit
                                </span>
                                <span className="text-white font-semibold text-[9.5px]">
                                  ₹1,99,330
                                </span>
                              </div>
                            </div>
                            <div className="w-full h-1 rounded-full bg-white/10 mt-1.5 overflow-hidden">
                              <div className="w-[35%] h-full bg-gradient-to-r from-blue-600 to-sky-400 rounded-full" />
                            </div>
                            <div className="flex justify-between text-[7.5px] text-slate-400 mt-1">
                              <span>₹1,40,000 credit collected</span>
                              <span>35%</span>
                            </div>
                          </div>
                        </div>

                        {/* Widget 2: Transaction Overview Spline Chart */}
                        <div className="col-span-8 p-2.5 rounded-xl bg-[#1B1A29]/95 border border-white/[0.08] flex flex-col justify-between">
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-[9px] text-slate-400">
                                Store Turnover Overview
                              </span>
                              <div className="text-xs font-bold text-white">
                                ₹3,41,240
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="inline-flex items-center gap-1 text-[8.5px] text-slate-300 bg-white/[0.05] px-2 py-0.5 rounded-full border border-white/10">
                                This Month <ChevronDown className="w-2.5 h-2.5" />
                              </span>
                              <div className="flex items-center gap-2 mt-1 text-[8px] text-slate-400">
                                <span className="inline-flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                  Counter POS
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                                  App Subscriptions
                                </span>
                              </div>
                            </div>
                          </div>

                          <DualSplineChart
                            primaryData={[14, 17, 15, 25, 29, 27, 34, 30, 32]}
                            secondaryData={[4, 7, 6, 9, 8, 12, 11, 13, 10]}
                            labels={[
                              "Jan",
                              "Feb",
                              "Mar",
                              "Apr",
                              "May",
                              "Jun",
                              "Jul",
                              "Aug",
                              "Sept",
                            ]}
                            primaryColor="#2563EB"
                            secondaryColor="#38BDF8"
                            height={215}
                            highlightIndex={3}
                            highlightPrimaryLabel="₹24,250"
                            highlightSecondaryLabel="₹8,230"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right 3 Columns: Your Card (starts aligned with top of Dashboard Header) */}
                    <div className="col-span-3 p-2.5 rounded-xl bg-[#1B1A29]/95 border border-white/[0.08] flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-white">
                            Store Card
                          </span>
                          <span className="text-[8.5px] text-slate-400">
                            Merchant POS
                          </span>
                        </div>
                        <span className="inline-block px-1.5 py-0.5 rounded bg-blue-500/25 text-blue-300 text-[7.5px] font-medium mt-1">
                          DailySupply Verified
                        </span>
                      </div>
                      <HolographicVisaCard compact />
                    </div>
                  </div>

                  {/* BOTTOM ROW: Financial Goals (5 cols) + All Activity (3.5 cols) + Recent Transaction (3.5 cols) */}
                  <div className="grid grid-cols-12 gap-2.5">
                    {/* Widget 4: Store Growth Milestones (5 cols) */}
                    <div className="col-span-5 p-2.5 rounded-xl bg-[#1B1A29]/95 border border-white/[0.08]">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-semibold text-white">
                          Store Milestones
                        </span>
                        <ChevronRight className="w-3 h-3 text-slate-400" />
                      </div>
                      <div className="space-y-1.5">
                        {[
                          {
                            pct: 70,
                            color: "#2563EB",
                            title: "Milk Subscriptions (500 flats)",
                            date: "Target: Society Phase 1",
                            saved: "₹30,000",
                            goal: "₹2,20,000",
                          },
                          {
                            pct: 50,
                            color: "#2DD4BF",
                            title: "Daily Counter POS Billing",
                            date: "Target: ₹50k / day",
                            saved: "₹25,000",
                            goal: "₹1,80,000",
                          },
                          {
                            pct: 35,
                            color: "#EC4899",
                            title: "Barcode Catalog (5,000 SKUs)",
                            date: "Target: Onboarding Complete",
                            saved: "₹15,000",
                            goal: "₹1,20,000",
                          },
                          {
                            pct: 20,
                            color: "#F59E0B",
                            title: "Society Residents Onboarded",
                            date: "Target: 1,200 Residents",
                            saved: "₹20,000",
                            goal: "₹1,50,000",
                          },
                        ].map((g, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-[8.5px]"
                          >
                            <div className="flex items-center gap-2">
                              <ProgressRing
                                percent={g.pct}
                                size={25}
                                strokeWidth={2.8}
                                color={g.color}
                              />
                              <div>
                                <div className="text-white font-medium leading-tight">
                                  {g.title}
                                </div>
                                <div className="text-[7.5px] text-slate-400">
                                  {g.date}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2.5 text-right">
                              <div>
                                <div className="text-[7px] text-slate-400">
                                  Achieved
                                </div>
                                <div className="text-white font-semibold">
                                  {g.saved}
                                </div>
                              </div>
                              <div>
                                <div className="text-[7px] text-slate-400">
                                  Target
                                </div>
                                <div className="text-white font-semibold">
                                  {g.goal}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Widget 5: All Activity Donut (3 cols) */}
                    <div className="col-span-3 p-2.5 rounded-xl bg-[#1B1A29]/95 border border-white/[0.08] flex flex-col items-center justify-between">
                      <div className="w-full flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-white">
                          Order Split
                        </span>
                        <ChevronRight className="w-3 h-3 text-slate-400" />
                      </div>
                      <div className="my-0.5">
                        <MultiSegmentDonut
                          size={96}
                          strokeWidth={10}
                          centerTitle="Today"
                          centerValue="₹45,090"
                          segments={[
                            { value: 42, color: "#EC4899" },
                            { value: 28, color: "#2563EB" },
                            { value: 18, color: "#3B82F6" },
                            { value: 12, color: "#F59E0B" },
                          ]}
                        />
                      </div>
                      <div className="flex items-center gap-2.5 text-[7.5px] text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                          Groceries
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                          Milk
                        </span>
                      </div>
                    </div>

                    {/* Widget 6: Recent Transaction (4 cols) */}
                    <div className="col-span-4 p-2.5 rounded-xl bg-[#1B1A29]/95 border border-white/[0.08]">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-semibold text-white">
                          Recent Counter Orders
                        </span>
                        <ChevronRight className="w-3 h-3 text-slate-400" />
                      </div>
                      <div className="space-y-1">
                        {[
                          {
                            name: "PhonePe UPI QR",
                            time: "10 mins ago",
                            amt: "₹1,700",
                            type: "Counter QR",
                            bg: "bg-blue-600 text-white",
                            sym: "₹",
                          },
                          {
                            name: "Google Pay UPI",
                            time: "25 mins ago",
                            amt: "₹2,500",
                            type: "UPI Online",
                            bg: "bg-blue-500/20 text-blue-400",
                            sym: "G",
                          },
                          {
                            name: "Resident Khata Settle",
                            time: "1 hour ago",
                            amt: "₹900",
                            type: "Khata",
                            bg: "bg-blue-500/20 text-blue-400",
                            sym: "K",
                          },
                          {
                            name: "Milk Monthly Sub",
                            time: "2 hours ago",
                            amt: "₹1,850",
                            type: "Auto-Debit",
                            bg: "bg-sky-500/20 text-sky-400",
                            sym: "M",
                          },
                          {
                            name: "Cash POS Bill",
                            time: "3 hours ago",
                            amt: "₹420",
                            type: "Counter Cash",
                            bg: "bg-blue-500/20 text-blue-400",
                            sym: "C",
                          },
                        ].map((tx, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-[8.5px]"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-4 h-4 rounded-full flex items-center justify-center font-bold text-[8px] ${tx.bg}`}
                              >
                                {tx.sym}
                              </div>
                              <div>
                                <div className="text-white font-medium leading-tight">
                                  {tx.name}
                                </div>
                                <div className="text-[7px] text-slate-400">
                                  {tx.time}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-white font-semibold">
                                {tx.amt}
                              </div>
                              <div className="text-[7px] text-slate-400">
                                {tx.type}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="relative z-20 mt-8 sm:mt-10 px-5 flex items-center justify-center gap-3">
          <a
            href="#dashboards"
            className="btn-neon-pill btn-neon-pill-blue inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-full text-[11px] sm:text-sm font-semibold text-white shadow-[0_0_25px_rgba(37,99,235,0.6)]"
          >
            <Wand2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            <span>Explore All 5 Modules</span>
          </a>
        </div>
      </div>
    </section>
  );
}

export const HeroSection = CommandCenterSection;
