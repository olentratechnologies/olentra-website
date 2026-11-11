"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  LayoutGrid,
  FileText,
  Mail,
  PieChart,
  Settings,
  LogOut,
  Bell,
} from "lucide-react";
import { NexaLogo } from "./DailySupplyLogo";
import {
  DualSplineChart,
  GlowingBarChart,
  ProgressRing,
} from "./Charts";

const DEPARTMENT_TABS = [
  {
    id: "grocery",
    label: "Grocery & Supermarket",
    revenueMetric: "₹3.28L",
    revenueDelta: "+18.05%",
    invoiceScore: "99.8%",
    efficiency: "+24% Basket Size",
    primarySpline: [12, 16, 14, 18, 16, 30, 28, 32, 29, 27, 31, 28],
    ledgerSpline: [10, 9, 13, 14, 12, 16, 15, 22, 19, 25],
    bars: [42, 48, 60, 78, 74, 66, 56, 92, 75, 54, 68, 72],
  },
  {
    id: "milk",
    label: "Milk & Dairy Vendors",
    revenueMetric: "₹1.92L",
    revenueDelta: "+12.10%",
    invoiceScore: "100%",
    efficiency: "+31% Delivery SLA",
    primarySpline: [16, 19, 22, 20, 27, 25, 31, 34, 30, 35, 33, 38],
    ledgerSpline: [11, 14, 12, 17, 19, 21, 20, 24, 23, 28],
    bars: [58, 64, 72, 85, 80, 74, 68, 95, 82, 70, 78, 88],
  },
  {
    id: "communities",
    label: "Residential Societies",
    revenueMetric: "1,420 Flats",
    revenueDelta: "+26.20%",
    invoiceScore: "99.4%",
    efficiency: "15-Min Delivery",
    primarySpline: [14, 15, 19, 22, 24, 28, 32, 29, 34, 31, 36, 35],
    ledgerSpline: [8, 11, 13, 15, 14, 18, 20, 19, 22, 26],
    bars: [50, 62, 55, 74, 82, 77, 70, 88, 84, 66, 75, 80],
  },
  {
    id: "pos",
    label: "Counter POS & Billing",
    revenueMetric: "₹8.45L",
    revenueDelta: "+9.40%",
    invoiceScore: "0.3s",
    efficiency: "100% Offline Mode",
    primarySpline: [10, 13, 15, 17, 21, 23, 25, 28, 30, 32, 34, 36],
    ledgerSpline: [9, 10, 12, 14, 16, 17, 19, 21, 23, 25],
    bars: [46, 52, 64, 70, 76, 80, 72, 85, 78, 68, 74, 82],
  },
  {
    id: "mobile",
    label: "Resident Mobile App",
    revenueMetric: "₹12.4L",
    revenueDelta: "+28.4%",
    invoiceScore: "4.9★",
    efficiency: "+34% Repeat Orders",
    primarySpline: [15, 20, 18, 25, 29, 27, 35, 33, 38, 36, 40, 42],
    ledgerSpline: [12, 15, 14, 18, 20, 22, 25, 24, 28, 31],
    bars: [52, 68, 60, 82, 88, 76, 84, 96, 86, 78, 84, 92],
  },
];

export function UnifiedPlatformSection() {
  const [activeTabId, setActiveTabId] = useState("grocery");
  const activeTab =
    DEPARTMENT_TABS.find((t) => t.id === activeTabId) || DEPARTMENT_TABS[0];

  return (
    <section
      id="unified-platform"
      data-theme="light"
      className="relative w-full bg-white text-slate-900 py-16 sm:py-24 overflow-hidden border-b border-slate-200 transition-colors duration-500"
    >
      {/* Olentra Light Cyber Grid & Radial Spotlight */}
      <div className="pointer-events-none absolute inset-0 bg-cyber-grid-light opacity-60 z-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.06),transparent_60%)] z-0" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        <div
          className="absolute top-[56%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[760px] h-[340px] sm:h-[480px] rounded-full blur-[90px] sm:blur-[120px]"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(37,99,235,0.12) 0%, rgba(79,70,229,0.06) 45%, transparent 75%)",
          }}
        />
      </div>

      <div className="relative z-10 px-4 sm:px-6 lg:px-10 max-w-6xl mx-auto">
        {/* Olentra Light Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-100 border border-slate-200 mb-3 font-black text-[9px] tracking-[0.3em] text-primary uppercase">
            UNIFIED COMMERCE ARCHITECTURE
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 uppercase tracking-tighter leading-[0.95]">
            One Unified Platform for{" "}
            <span className="text-primary italic">
              Every Retail Stakeholder
            </span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-600 font-medium leading-relaxed">
            Bringing together local grocers, dairy vendors, residential societies, and consumers on one unified technology backbone.
          </p>
        </div>

        {/* Interactive 5-Department Pill Tab Bar */}
        <div className="relative z-20 flex justify-center mb-10 sm:mb-14">
          <div className="inline-flex flex-wrap items-center justify-center gap-1.5 p-1.5 rounded-2xl sm:rounded-full bg-slate-100 border border-slate-200 shadow-sm">
            {DEPARTMENT_TABS.map((tab) => {
              const isActive = tab.id === activeTabId;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`px-3.5 sm:px-5 py-2 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                    isActive
                      ? "bg-primary text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Central Dashboard Frame + 3 Floating Callout Cards */}
        <div className="relative z-10 max-w-[1220px] mx-auto flex flex-col lg:flex-row items-center justify-center gap-5 sm:gap-6">
          {/* ============================================================
              LEFT FLOATING CALLOUT CARD: AI Product Onboarding
             ============================================================ */}
          <div className="order-2 lg:order-1 w-full lg:w-[235px] lg:-mr-6 z-20 p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wide text-slate-900 leading-snug">
                AI Product Onboarding
              </span>
              <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 shrink-0 shadow-sm">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-3">
              {activeTab.invoiceScore}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-primary mt-1">
              Barcode scan accuracy
            </div>
          </div>

          {/* ============================================================
              CENTER GLOWING ERP WORKSPACE WINDOW
             ============================================================ */}
          <div className="order-1 lg:order-2 w-full lg:w-[720px] rounded-2xl bg-[#0B1120]/98 border-2 border-primary/50 shadow-[0_0_70px_rgba(37,99,235,0.45)] overflow-hidden z-10">
            {/* Top Inner Bar */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/[0.07] bg-[#0F172A]">
              <NexaLogo size="sm" variant="n-wave" />
              <div className="flex items-center gap-2.5">
                <button className="w-6 h-6 rounded-md bg-white/[0.06] flex items-center justify-center text-slate-400 text-xs">
                <Bell className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-2 pl-1 pr-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/10">
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-emerald-400 to-indigo-600 text-[9px] font-bold flex items-center justify-center text-white">
                  DS
                </div>
                <div className="text-left leading-tight">
                  <div className="text-[9px] font-semibold text-white">
                    Madhu
                  </div>
                  <div className="text-[7.5px] text-slate-400">
                    madhu@dailysupply.in
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Workspace Body */}
          <div className="flex p-3 sm:p-4 gap-3 sm:gap-3.5">
            {/* Left Vertical Icon Sidebar */}
            <div className="hidden sm:flex flex-col items-center justify-between py-2 px-1.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <div className="flex flex-col items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-violet-600/30 border border-violet-400/50 flex items-center justify-center text-violet-300">
                  <LayoutGrid className="w-3.5 h-3.5" />
                </div>
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <PieChart className="w-3.5 h-3.5 text-slate-500" />
                <Settings className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
            </div>

            {/* Main Charts Grid */}
            <div className="flex-1 min-w-0 space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Store Command Center</h3>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-white/[0.06] border border-white/10 text-[9.5px] text-slate-300">
                    + Quick Sale
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-gradient-to-r from-indigo-500 to-violet-600 text-[9.5px] text-white font-semibold shadow">
                    + Scan SKU
                  </span>
                </div>
              </div>

              {/* Top Row: Real-time Revenue + Ledger Graph */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl erp-widget-surface">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold text-white">
                      Daily Turnovers
                    </span>
                    <div className="flex items-center gap-1.5 text-[9px]">
                      <span className="text-slate-300">
                        • {activeTab.revenueMetric}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold">
                        {activeTab.revenueDelta}
                      </span>
                    </div>
                  </div>
                  <DualSplineChart
                    primaryData={activeTab.primarySpline}
                    secondaryData={[8, 9, 8, 10, 9, 12, 11, 13, 12, 11, 13, 12]}
                    labels={[
                      "Jan",
                      "Feb",
                      "Mar",
                      "Apr",
                      "May",
                      "Jun",
                      "Jul",
                      "Aug",
                      "Sep",
                    ]}
                    yAxisLabels={["₹40k", "₹30k", "₹20k", "₹10k", "0"]}
                    height={118}
                    secondaryColor="transparent"
                  />
                </div>

                <div className="p-3 rounded-xl erp-widget-surface">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold text-white">
                      Khata Collections
                    </span>
                  </div>
                  <DualSplineChart
                    primaryData={activeTab.ledgerSpline}
                    secondaryData={[5, 5, 6, 7, 6, 8, 7, 9, 8, 10]}
                    labels={[
                      "Jan",
                      "Feb",
                      "Mar",
                      "Apr",
                      "May",
                      "Jun",
                      "Jul",
                      "Aug",
                      "Sep",
                    ]}
                    yAxisLabels={[
                      "₹1.9L",
                      "₹1.2L",
                      "₹1.0L",
                      "₹60k",
                      "₹22k",
                    ]}
                    height={118}
                    secondaryColor="transparent"
                  />
                </div>
              </div>

              {/* Bottom Row: Fulfillment Velocity Emerald Bars + Society Health */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-8 p-3 rounded-xl erp-widget-surface">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold text-white">
                      Fulfillment Velocity
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[8.5px] font-medium">
                      • Daily Deliveries
                    </span>
                  </div>
                  <GlowingBarChart
                    values={activeTab.bars}
                    labels={[
                      "Jan",
                      "Feb",
                      "Mar",
                      "Apr",
                      "May",
                      "Jun",
                      "Jul",
                      "Aug",
                      "Sep",
                      "Nov",
                      "Dec",
                    ]}
                    variant="emerald"
                    height={105}
                  />
                </div>

                <div className="sm:col-span-4 p-3 rounded-xl erp-widget-surface flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-white">
                    Operations Health
                  </span>

                  <div className="space-y-2.5 my-auto pt-2">
                    {[
                      {
                        name: "Society Orders",
                        level: "96%",
                        pct: "96%",
                        color: "bg-emerald-400",
                        badge: "text-emerald-400",
                      },
                      {
                        name: "Milk Delivery SLA",
                        level: "99%",
                        pct: "99%",
                        color: "bg-emerald-400",
                        badge: "text-emerald-400",
                      },
                      {
                        name: "Pending Khata",
                        level: "14%",
                        pct: "14%",
                        color: "bg-amber-400",
                        badge: "text-amber-400",
                      },
                    ].map((d, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between text-[9px] mb-1">
                          <span className="text-slate-300">{d.name}</span>
                          <span className={`font-semibold ${d.badge}`}>
                            • {d.level}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${d.color}`}
                            style={{ width: d.pct }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================
            RIGHT FLOATING CALLOUT CARDS: Auto Combo Generation + KPIs
           ============================================================ */}
        <div className="order-3 lg:order-3 w-full lg:w-[250px] lg:-ml-6 z-20 grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-col gap-4 sm:gap-5">
          {/* Top-Right Callout: Auto Combo Generation */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">
              Auto Combo Generation
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {activeTab.efficiency}
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              {/* Mini emerald wave */}
              <svg viewBox="0 0 110 38" className="w-28 h-9 overflow-visible">
                <defs>
                  <linearGradient id="miniEmerald" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 2 32 Q 15 22, 26 26 T 52 16 T 78 18 T 106 6 L 106 36 L 2 36 Z"
                  fill="url(#miniEmerald)"
                />
                <path
                  d="M 2 32 Q 15 22, 26 26 T 52 16 T 78 18 T 106 6"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.2"
                />
              </svg>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                Smart Cross-Sell
              </span>
            </div>
          </div>

          {/* Bottom-Right Callout: Society Delivery KPIs */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <span className="text-xs text-slate-900 font-bold uppercase tracking-wider block mb-3">
              Society Fulfillment KPIs
            </span>
            <div className="flex items-center justify-around sm:justify-between gap-2">
              <ProgressRing
                percent={98}
                size={56}
                strokeWidth={5.5}
                color="#10B981"
              />
              <ProgressRing
                percent={92}
                size={56}
                strokeWidth={5.5}
                color="#0284C7"
              />
              <ProgressRing
                percent={89}
                size={56}
                strokeWidth={5.5}
                color="#7C3AED"
              />
            </div>
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}
