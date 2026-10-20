"use client";

import React from "react";
import {
  AlertTriangle,
  BarChart3,
  Users,
  Settings,
  Cpu,
  ChevronDown,
} from "lucide-react";
import { DualSplineChart, GlowingBarChart } from "./Charts";

export function BentoFeaturesSection() {
  return (
    <section
      id="capabilities"
      data-theme="dark"
      className="relative w-full bg-[#020617] text-white py-16 sm:py-24 overflow-hidden border-b border-white/[0.08] transition-colors duration-500"
    >
      {/* Olentra Dark Cyber Grid & Accent Wash */}
      <div className="pointer-events-none absolute inset-0 bg-cyber-grid opacity-[0.04] z-0" />
      <div className="pointer-events-none absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary/10 to-transparent z-0" />

      <div className="relative z-10 px-4 sm:px-6 lg:px-10 max-w-6xl mx-auto">
        {/* Olentra Dark Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/5 border border-white/10 mb-4 font-black text-[9px] tracking-[0.3em] text-primary uppercase">
            COMMUNITY COMMERCE SUITE
          </div>
          <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter leading-[0.95] text-white">
            Everything Your Society &amp; Store Needs,{" "}
            <span className="text-primary italic">In One System</span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-400 font-medium leading-relaxed max-w-2xl mx-auto">
            From multi-scanner POS billing and daily milk subscriptions to community marketplaces and GST khata accounting.
          </p>
        </div>

        {/* 2x2 Asymmetric Bento Grid (Dark Card Surface + Dark Telemetry Screens) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-7">
          {/* ============================================================
              BENTO CARD 1: Smart POS System & Offline Billing (6 cols)
             ============================================================ */}
          <article className="group lg:col-span-6 rounded-2xl p-5 sm:p-7 border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-primary/50 hover:shadow-[0_20px_50px_rgba(37,99,235,0.2)] transition-all duration-300 relative overflow-hidden backdrop-blur-xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="mb-4">
              <span className="text-[9px] font-black text-primary tracking-[0.3em] uppercase block mb-1">
                01 // BILLING &amp; POS COUNTER
              </span>
              <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight group-hover:text-primary transition-colors">
                Smart POS System &amp; Offline Billing
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-stretch">
              {/* Left Mini Spline + Balance Box */}
              <div className="sm:col-span-5 flex flex-col justify-between gap-3">
                <div className="p-3 rounded-xl bg-[#0F172A] border border-slate-800 shadow-md">
                  <DualSplineChart
                    primaryData={[12, 22, 19, 28, 34]}
                    secondaryData={[10, 14, 24, 21, 30]}
                    labels={["", "", "", "", ""]}
                    yAxisLabels={["300", "200", "10"]}
                    height={95}
                  />
                </div>
                <div className="p-3 rounded-xl bg-white/[0.06] border border-white/10 shadow-sm grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                      Daily Cash
                    </span>
                    <span className="text-sm font-black text-white">
                      ₹14,750
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                      UPI &amp; Khata
                    </span>
                    <span className="text-sm font-black text-primary">
                      ₹34,890
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Main Predictive Wave + Anomaly Alert Pill */}
              <div className="sm:col-span-7 relative p-3 pt-9 pb-9 sm:pt-3 sm:pb-3 rounded-xl bg-[#0F172A] border border-slate-800 shadow-md flex flex-col justify-end">
                <div className="absolute top-2.5 right-3 sm:top-3 sm:right-4 z-10 px-3 py-1 rounded-md bg-primary/20 border border-primary/40 text-[10px] font-bold uppercase tracking-wider text-blue-200">
                  Barcode Auto-Sync
                </div>

                <DualSplineChart
                  primaryData={[
                    14, 16, 15, 22, 21, 30, 28, 33, 29, 32, 35, 31,
                  ]}
                  secondaryData={[4, 6, 5, 8, 7, 12, 11, 16, 14, 15, 17, 14]}
                  labels={["", "", "", "", "", "", "", "", "", "", "", ""]}
                  yAxisLabels={["", "", ""]}
                  height={155}
                />

                {/* Reorder Alert Pill */}
                <div className="absolute bottom-2.5 right-3 sm:bottom-4 sm:right-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/90 border border-amber-500/40 text-amber-200 text-xs font-semibold shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Reorder Alert (Amul 500ml)</span>
                </div>
              </div>
            </div>
          </article>

          {/* ============================================================
              BENTO CARD 2: Milk Subscription Management (6 cols)
             ============================================================ */}
          <article className="group lg:col-span-6 rounded-2xl p-5 sm:p-7 border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-primary/50 hover:shadow-[0_20px_50px_rgba(37,99,235,0.2)] transition-all duration-300 relative overflow-hidden backdrop-blur-xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="mb-4">
              <span className="text-[9px] font-black text-primary tracking-[0.3em] uppercase block mb-1">
                02 // SUBSCRIPTION ENGINE
              </span>
              <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight group-hover:text-primary transition-colors">
                Milk Subscription &amp; Daily Deliveries
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Automated recurring delivery tracking &amp; pause/resume rules
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              {/* Left: 6 Glowing Cyan-to-Violet Capacity Bars */}
              <div className="sm:col-span-5 flex items-end gap-2 p-3 rounded-xl bg-[#0F172A] border border-slate-800 shadow-md">
                <div className="flex flex-col justify-between h-[145px] pb-6 text-[10px] text-slate-400 font-medium">
                  <span>150k</span>
                  <span>100k</span>
                  <span>50k</span>
                  <span>0</span>
                </div>
                <div className="flex-1">
                  <GlowingBarChart
                    values={[62, 85, 88, 80, 65, 76]}
                    labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun"]}
                    variant="cyan-mint"
                    height={145}
                    showTrack
                  />
                </div>
              </div>

              {/* Right: Dark World Map with Glowing Supply Chain Route Nodes */}
              <div className="sm:col-span-7 relative h-[170px] rounded-xl bg-[#0F172A] border border-slate-800 shadow-md p-3 overflow-hidden flex items-center justify-center">
                <svg viewBox="0 0 320 150" className="w-full h-full">
                  <g fill="rgba(148, 163, 184, 0.16)">
                    <path d="M30,25 Q55,18 75,35 L82,55 Q65,68 58,62 L72,85 Q88,95 85,120 L70,138 Q58,115 52,90 L35,55 Z" />
                    <path d="M135,22 Q165,16 185,32 L180,55 Q195,75 182,122 L160,132 Q145,105 142,72 L130,45 Z" />
                    <path d="M188,24 Q245,15 285,38 L278,78 Q245,92 220,76 L195,58 Z" />
                    <path d="M248,104 Q272,100 282,118 L268,132 Q250,128 248,104 Z" />
                  </g>

                  <g
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth="1.8"
                    style={{ filter: "drop-shadow(0 0 6px #2563EB)" }}
                  >
                    <path d="M 55 52 L 50 75 L 88 112" />
                    <path d="M 155 55 L 228 48 L 245 75 L 182 88 L 152 72 Z" />
                    <path d="M 55 52 Q 105 32 155 55" strokeDasharray="3 3" />
                  </g>

                  {[
                    [55, 52],
                    [50, 75],
                    [88, 112],
                    [155, 55],
                    [152, 72],
                    [182, 88],
                    [228, 48],
                    [245, 75],
                  ].map(([cx, cy], idx) => (
                    <g key={idx}>
                      <circle
                        cx={cx}
                        cy={cy}
                        r="6"
                        fill="rgba(37, 99, 235, 0.35)"
                      />
                      <circle
                        cx={cx}
                        cy={cy}
                        r="3"
                        fill="#FFFFFF"
                        stroke="#2563EB"
                        strokeWidth="1.5"
                      />
                    </g>
                  ))}
                </svg>

                <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-md bg-primary/20 border border-primary/40 text-[10px] font-bold uppercase tracking-wider text-blue-100 shadow-md">
                  Optimized Society Routes
                </div>
              </div>
            </div>
          </article>

          {/* ============================================================
              BENTO CARD 3: Community Marketplace & Store Sync (6 cols)
             ============================================================ */}
          <article className="group lg:col-span-6 rounded-2xl p-5 sm:p-7 border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-primary/50 hover:shadow-[0_20px_50px_rgba(37,99,235,0.2)] transition-all duration-300 relative overflow-hidden backdrop-blur-xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center h-full">
              {/* Left Sub-box: Title + Residents -> Core Orb */}
              <div className="sm:col-span-5 flex flex-col justify-between h-full">
                <div>
                  <span className="text-[9px] font-black text-primary tracking-[0.3em] uppercase block mb-1">
                    03 // COMMUNITY ECOSYSTEM
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight leading-snug group-hover:text-primary transition-colors">
                    Community Marketplace &amp; Store Sync
                  </h3>
                </div>

                <div className="relative flex items-center justify-between py-4 sm:py-6 mt-2">
                  {/* Residents Node */}
                  <div className="flex flex-col items-center gap-1.5 z-10">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-sm">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">
                      Resident
                    </span>
                  </div>

                  {/* Glowing Connector Line */}
                  <div className="flex-1 h-[2px] bg-gradient-to-r from-primary via-indigo-500 to-primary mx-2" />

                  {/* Core Orb */}
                  <div className="relative w-16 h-16 rounded-full bg-[#0F172A] border-2 border-primary flex items-center justify-center shadow-[0_0_25px_rgba(37,99,235,0.35)] z-10">
                    <span className="text-[10px] font-black uppercase text-white">
                      Hub
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Sub-box: DailySupply Central Neural Hub connected to Store POS, Milk, Society, Delivery */}
              <div className="sm:col-span-7 relative rounded-xl bg-[#0F172A] border border-slate-800 shadow-md p-3.5 sm:p-5 min-h-[185px] sm:min-h-[195px] flex items-center justify-center">
                <svg
                  viewBox="0 0 280 160"
                  className="absolute inset-0 w-full h-full pointer-events-none"
                >
                  <g
                    fill="none"
                    stroke="url(#syncLine)"
                    strokeWidth="2"
                    style={{ filter: "drop-shadow(0 0 6px #3B82F6)" }}
                  >
                    <path d="M 0 80 L 105 80" />
                    <path d="M 65 40 L 95 40 Q 110 40 115 62" />
                    <path d="M 65 122 L 95 122 Q 110 122 115 98" />
                    <path d="M 215 40 L 185 40 Q 170 40 165 62" />
                    <path d="M 215 122 L 185 122 Q 170 122 165 98" />
                  </g>
                  <defs>
                    <linearGradient id="syncLine" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#60A5FA" />
                      <stop offset="50%" stopColor="#FFFFFF" />
                      <stop offset="100%" stopColor="#818CF8" />
                    </linearGradient>
                  </defs>
                </svg>

                <div className="relative z-10 w-full flex items-center justify-between px-1 sm:px-2">
                  {/* Left Column Nodes: Store POS & Milk Vendor */}
                  <div className="flex flex-col justify-between gap-8">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-primary/40 flex items-center justify-center text-blue-300">
                        <Users className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] font-bold text-slate-300">
                        POS
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-primary/40 flex items-center justify-center text-blue-300">
                        <Users className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] font-bold text-slate-300">
                        Milk
                      </span>
                    </div>
                  </div>

                  {/* Center DailySupply Orb */}
                  <div className="w-18 h-18 sm:w-20 sm:h-20 p-2 rounded-full bg-gradient-to-br from-primary to-indigo-700 border-2 border-blue-300 flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.65)] text-center">
                    <span className="text-[10px] font-black text-white tracking-tight leading-tight">
                      Daily<br />Supply
                    </span>
                  </div>

                  {/* Right Column Nodes: Society & Delivery */}
                  <div className="flex flex-col justify-between gap-8">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-primary/40 flex items-center justify-center text-blue-300">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] font-bold text-slate-300">
                        Society
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-primary/40 flex items-center justify-center text-blue-300">
                        <Settings className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] font-bold text-slate-300">
                        Orders
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </article>

          {/* ============================================================
              BENTO CARD 4: Customer Khata Ledger & GST Compliance (6 cols)
             ============================================================ */}
          <article className="group lg:col-span-6 rounded-2xl p-5 sm:p-7 border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-primary/50 hover:shadow-[0_20px_50px_rgba(37,99,235,0.2)] transition-all duration-300 relative overflow-hidden backdrop-blur-xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="mb-4">
              <span className="text-[9px] font-black text-primary tracking-[0.3em] uppercase block mb-1">
                04 // KHATA &amp; GST FINANCE
              </span>
              <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight group-hover:text-primary transition-colors">
                Customer Khata Ledger &amp; GST Compliance
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              {/* Left: Isometric 3D Stacked DailySupply Khata Cards */}
              <div className="sm:col-span-5 relative h-[165px] sm:h-[180px] rounded-xl bg-[#0F172A] border border-slate-800 shadow-md flex items-center justify-center">
                <div className="relative w-40 h-24 scale-90 sm:scale-95">
                  <div
                    className="absolute inset-0 translate-y-7 scale-95 rounded-xl border border-white/15 opacity-55"
                    style={{
                      background:
                        "linear-gradient(135deg, #0F172A 0%, #334155 100%)",
                      transform: "rotate(-12deg) skewX(14deg) translateY(24px)",
                    }}
                  />
                  <div
                    className="absolute inset-0 translate-y-3.5 rounded-xl border border-teal-300/30 opacity-75"
                    style={{
                      background:
                        "linear-gradient(135deg, #0D9488 0%, #38BDF8 100%)",
                      transform: "rotate(-12deg) skewX(14deg) translateY(12px)",
                    }}
                  />
                  <div
                    className="absolute inset-0 rounded-xl p-3 border border-white/30 shadow-[0_15px_35px_rgba(37,99,235,0.45)] flex flex-col justify-between"
                    style={{
                      background:
                        "linear-gradient(135deg, #10B981 0%, #059669 40%, #4F46E5 80%, #2563EB 100%)",
                      transform: "rotate(-12deg) skewX(14deg)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-6 h-4 rounded bg-amber-200/90 border border-white/40" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-white">
                        KHATA
                      </span>
                    </div>
                    <div className="text-[9px] font-mono text-white/90 tracking-widest">
                      DAILY SUPPLY
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Khata & GST Compliance Rows */}
              <div className="sm:col-span-7 space-y-2.5">
                {/* Row 1 */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.06] border border-white/10 shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="flex -space-x-1.5">
                      <span className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center text-xs font-bold text-emerald-400">
                        ₹
                      </span>
                      <span className="w-6 h-6 rounded-full bg-blue-500/15 border border-blue-400/40 flex items-center justify-center text-xs">
                        📱
                      </span>
                      <span className="w-6 h-6 rounded-full bg-indigo-500/15 border border-indigo-400/40 flex items-center justify-center text-xs">
                        ⚡
                      </span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">
                        Khata Auto-Settlement
                      </div>
                      <div className="text-[10px] text-slate-400">WhatsApp reminders</div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                    Active <ChevronDown className="w-3 h-3" />
                  </span>
                </div>

                {/* Row 2 */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.06] border border-white/10 shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="flex -space-x-1.5">
                      <span className="w-6 h-6 rounded-full bg-indigo-500/15 border border-indigo-400/40 flex items-center justify-center text-xs">
                        🇮🇳
                      </span>
                      <span className="w-6 h-6 rounded-full bg-teal-500/15 border border-teal-400/40 flex items-center justify-center text-xs">
                        📑
                      </span>
                      <span className="w-6 h-6 rounded-full bg-slate-500/15 border border-slate-400/40 flex items-center justify-center text-xs">
                        🏦
                      </span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">
                        GST Ready (GSTR-1 &amp; 3B)
                      </div>
                      <div className="text-[10px] text-slate-400">
                        1-Click JSON export
                      </div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/20 border border-primary/40 text-blue-300 text-[10px] font-bold uppercase tracking-wider">
                    Compliant <ChevronDown className="w-3 h-3" />
                  </span>
                </div>

                {/* Row 3: Real-time rolling collection feed */}
                <div className="p-3 rounded-xl bg-[#0F172A] border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-white">
                      Real-time rolling collection feed
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      ₹1,99,990 collected of ₹2.40L balance
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-primary font-bold">
                    Live
                  </span>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
