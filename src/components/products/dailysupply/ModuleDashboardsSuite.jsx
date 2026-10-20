"use client";

import React, { useState } from "react";
import {
  Search,
  Bell,
  LayoutGrid,
  Clock,
  CreditCard,
  Database,
  Users,
  Globe,
  Settings,
  HelpCircle,
  LogOut,
  Box,
  Bot,
  ShieldCheck,
  Check,
  Briefcase,
  TrendingUp,
  FileText,
  ChevronRight,
  Plus,
} from "lucide-react";
import { NexaLogo } from "./DailySupplyLogo";
import {
  DualSplineChart,
  GlowingBarChart,
  ProgressRing,
  MultiSegmentDonut,
  HolographicVisaCard,
} from "./Charts";

const SUITE_FILTERS = [
  { id: "all", label: "All", icon: LayoutGrid },
  { id: "finance", label: "POS", icon: CreditCard },
  { id: "inventory", label: "Warehouse", icon: Box },
  { id: "operations", label: "Milk", icon: Clock },
  { id: "hr", label: "Khata", icon: ShieldCheck },
  { id: "crm", label: "Vendors", icon: Globe },
];

export function ModuleDashboardsSuite() {
  const [selectedFilter, setSelectedFilter] = useState("all");

  const show = (id) =>
    selectedFilter === "all" || selectedFilter === id;

  return (
    <section
      id="dashboards"
      data-theme="dark"
      className="relative w-full bg-[#020617] text-white py-16 sm:py-24 overflow-hidden border-b border-white/[0.08] transition-colors duration-500"
    >
      {/* Olentra Dark Cyber Grid & Accent Wash */}
      <div className="pointer-events-none absolute inset-0 bg-cyber-grid opacity-[0.03] z-0" />
      <div className="pointer-events-none absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary/10 to-transparent z-0" />

      <div className="relative z-10 px-4 sm:px-6 lg:px-10 max-w-6xl mx-auto">
        {/* Olentra Split Editorial Section Header (Dark Theme) */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-10 sm:mb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-px bg-primary/40" />
              <p className="text-[10px] md:text-xs font-black text-primary uppercase tracking-[0.4em]">
                STORE &amp; VENDOR COMMAND SUITE
              </p>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white uppercase leading-[0.9] tracking-tighter">
              Deep-Dive <br />{" "}
              <span className="text-primary italic">Store &amp; Operations Dashboards</span>
            </h2>
          </div>

          <div className="max-w-[360px] space-y-3 border-l-2 border-primary/25 pl-6 py-1">
            <p className="text-[11px] md:text-[13px] font-semibold text-slate-400 tracking-wider uppercase leading-relaxed">
              Every DailySupply module engineered with real-time barcode scanning,
              predictive replenishment, and automated society billing.
            </p>
            <div className="flex items-center gap-2 text-primary font-black text-[9px] tracking-[0.25em] uppercase">
              LIVE TELEMETRY MODULES
            </div>
          </div>
        </div>

        {/* Modern Filter Pills with Icons */}
        <div className="flex justify-center mb-10 sm:mb-14">
          <div className="inline-flex flex-wrap items-center justify-center gap-2 sm:gap-3 p-2 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            {SUITE_FILTERS.map((f) => {
              const Icon = f.icon;
              return (
                <button
                  key={f.id}
                  onClick={() => setSelectedFilter(f.id)}
                  className={`group relative flex items-center gap-2 sm:gap-2.5 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl transition-all duration-300 ${
                    selectedFilter === f.id
                      ? "bg-gradient-to-r from-primary/20 to-violet-600/20 border border-primary/50 shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                      : "bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-white/10"
                  }`}
                >
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${
                    selectedFilter === f.id ? "text-primary" : "text-slate-400 group-hover:text-slate-300"
                  }`} />
                  <span className={`text-[11px] sm:text-xs font-semibold whitespace-nowrap ${
                    selectedFilter === f.id ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                  }`}>
                    {f.label}
                  </span>

                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-12 sm:space-y-20 text-white">
          {/* ====================================================================
              DASHBOARD 05: FINANCIAL COMMAND CENTER (05-dashboard-finance-accounting.png)
             ==================================================================== */}
          {show("finance") && (
            <div className="relative rounded-2xl bg-[#0F0E1B] border border-slate-800 shadow-[0_25px_70px_rgba(15,23,42,0.22)] ring-1 ring-slate-900/10 overflow-hidden">
            {/* macOS Window Chrome */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-[#18162B] border-b border-white/[0.07]">
              <span className="w-3 h-3 rounded-full bg-[#FF5F56]" />
              <span className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
              <span className="w-3 h-3 rounded-full bg-[#27C93F]" />
            </div>

            {/* Top Navigation Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 sm:px-6 py-3 sm:py-3.5 border-b border-white/[0.07] bg-[#121122]">
              <NexaLogo size="md" variant="n-wave" />

              <div className="order-3 lg:order-2 w-full lg:w-auto flex items-center gap-1 overflow-x-auto no-scrollbar bg-white/[0.04] p-1 rounded-full border border-white/10 text-xs">
                <span className="px-4 py-1.5 rounded-full bg-white/[0.1] text-white font-semibold whitespace-nowrap">
                  Overview
                </span>
                <span className="px-3.5 py-1.5 text-slate-400 whitespace-nowrap">
                  Ledger
                </span>
                <span className="px-3.5 py-1.5 text-slate-400 whitespace-nowrap">
                  Cash Flow
                </span>
                <span className="px-3.5 py-1.5 text-slate-400 whitespace-nowrap">
                  Treasury
                </span>
                <span className="px-3.5 py-1.5 text-slate-400 whitespace-nowrap">
                  Tax &amp; Audit
                </span>
                <span className="px-3.5 py-1.5 text-slate-400 whitespace-nowrap">
                  Reports
                </span>
              </div>

              <div className="order-2 lg:order-3 flex items-center gap-2 sm:gap-2.5">
                <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs text-slate-400 w-44">
                  <Search className="w-3.5 h-3.5" />
                  <span>Search</span>
                </div>
                <button className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center text-slate-300">
                  <Bell className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 pl-1.5 pr-2.5 sm:pr-3 py-1 rounded-full bg-white/[0.05] border border-white/10">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-400 to-emerald-400 flex items-center justify-center text-[10px] font-bold text-white">
                    UN
                  </div>
                  <div className="hidden xs:block sm:block text-left leading-tight">
                    <div className="text-[10px] font-semibold text-white">
                      User Name
                    </div>
                    <div className="text-[8.5px] text-slate-400">
                      neslu@noana
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="flex p-3.5 sm:p-5 gap-3.5 sm:gap-5">
              {/* Left Vertical Icon Sidebar */}
              <div className="hidden sm:flex flex-col items-center justify-between py-4 px-2.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex flex-col items-center gap-4">
                  <LayoutGrid className="w-4 h-4 text-slate-400" />
                  <Clock className="w-4 h-4 text-slate-400" />
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-[0_0_16px_#8B5CF6]">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <Database className="w-4 h-4 text-slate-400" />
                  <Users className="w-4 h-4 text-slate-400" />
                  <Globe className="w-4 h-4 text-slate-400" />
                  <Settings className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex flex-col items-center gap-4">
                  <HelpCircle className="w-4 h-4 text-slate-400" />
                  <LogOut className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 min-w-0 space-y-4 sm:space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg sm:text-2xl font-bold text-white">
                      Financial Command Center
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                      Real-time liquidity, automated ledger reconciliation, and
                      treasury oversight
                    </p>
                  </div>
                  <button className="btn-neon-pill inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white">
                    <Plus className="w-4 h-4" />
                    <span>New Transaction</span>
                  </button>
                </div>

                {/* Row 1: KPI Liquidity + Revenue vs OPEX Forecast + Corporate Treasury Card */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Card 1: KPI Liquidity (3 cols) */}
                  <div className="lg:col-span-3 p-4 sm:p-5 rounded-2xl erp-widget-surface flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">
                        KPI
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 text-xs font-semibold">
                        +18.4%
                      </span>
                    </div>

                    <div className="my-5 sm:my-6">
                      <span className="text-xs text-slate-400 block">
                        Total Store POS Turnover
                      </span>
                      <div className="text-2xl sm:text-3xl font-bold text-white mt-1 tracking-tight">
                        ₹48,42,690.00
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <button className="py-2 rounded-xl btn-neon-pill text-xs font-semibold text-white">
                        Settle UPI
                      </button>
                      <button className="py-2 rounded-xl bg-white/[0.05] border border-white/15 text-xs font-medium text-slate-200 hover:bg-white/10 transition">
                        Khata Sync
                      </button>
                    </div>
                  </div>

                  {/* Card 2: Revenue vs. OPEX Forecast (6 cols) */}
                  <div className="lg:col-span-6 p-4 sm:p-5 rounded-2xl erp-widget-surface">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-white">
                        Counter Sales vs. Procurement
                      </span>
                      <span className="text-slate-400 text-xs">•••</span>
                    </div>
                    <DualSplineChart
                      primaryData={[
                        38, 52, 46, 68, 56, 88, 66, 70, 86, 68, 74, 88,
                      ]}
                      secondaryData={[
                        15, 22, 19, 28, 34, 45, 50, 54, 65, 58, 62, 66,
                      ]}
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
                        "Oct",
                        "Nov",
                        "Dec",
                      ]}
                      yAxisLabels={["₹10L", "₹7.5L", "₹5.0L", "₹2.5L", "0"]}
                      height={175}
                      showDots
                      highlightIndex={5}
                    />
                  </div>

                  {/* Card 3: Corporate Treasury Card (3 cols) */}
                  <div className="lg:col-span-3 p-4 sm:p-5 rounded-2xl erp-widget-surface flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-white">
                        Store Merchant Card
                      </span>
                      <span className="text-slate-400 text-xs">•••</span>
                    </div>
                    <HolographicVisaCard
                      last4="4821"
                      fullNumber="4821 •••• •••• 4821"
                      holder="DailySupply Merchant Account"
                      limitSpent="₹35,000"
                      limitPercent={72}
                    />
                  </div>
                </div>

                {/* Row 2: Department Budget Allocation + AI Audit & Tax Compliance + Real-Time Ledger Transactions */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Card 4: Department Budget Allocation (4 cols) */}
                  <div className="lg:col-span-4 p-4 sm:p-5 rounded-2xl erp-widget-surface flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-semibold text-white">
                        Department Budget Allocation
                      </span>
                      <span className="text-slate-400 text-xs">•••</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-around gap-3 py-2">
                      <ProgressRing
                        percent={78}
                        size={82}
                        strokeWidth={6.5}
                        color="#6366F1"
                        label="Engineering"
                      />
                      <ProgressRing
                        percent={64}
                        size={82}
                        strokeWidth={6.5}
                        color="#A855F7"
                        label="Operations"
                      />
                      <ProgressRing
                        percent={45}
                        size={82}
                        strokeWidth={6.5}
                        color="#F59E0B"
                        label="Marketing"
                      />
                    </div>
                  </div>

                  {/* Card 5: AI Audit & Tax Compliance (4 cols) */}
                  <div className="lg:col-span-4 p-5 rounded-2xl erp-widget-surface flex flex-col items-center justify-between">
                    <div className="w-full flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-white">
                        AI Audit &amp; Tax Compliance
                      </span>
                      <span className="text-slate-400 text-xs">•••</span>
                    </div>
                    <MultiSegmentDonut
                      size={146}
                      strokeWidth={10}
                      centerValue="99.4%"
                      centerTitle="Compliance"
                      concentric
                      segments={[
                        { value: 55, color: "#2DD4BF" },
                        { value: 30, color: "#38BDF8" },
                        { value: 15, color: "#F59E0B" },
                      ]}
                    />
                  </div>

                  {/* Card 6: Real-Time Ledger Transactions (4 cols) */}
                  <div className="lg:col-span-4 p-5 rounded-2xl erp-widget-surface">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-white">
                        Real-Time Ledger Transactions
                      </span>
                      <span className="text-slate-400 text-xs">•••</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2 border-b border-white/10">
                      <span>Activity</span>
                      <span>Score</span>
                    </div>
                    <div className="divide-y divide-white/[0.06] mt-1">
                      {[
                        {
                          name: "PhonePe UPI QR",
                          time: "10 mins ago",
                          amt: "+₹1,335.00",
                          badge: "UPI",
                          bg: "bg-indigo-600 text-white",
                        },
                        {
                          name: "Resident Khata Settle",
                          time: "25 mins ago",
                          amt: "+₹550.00",
                          badge: "K",
                          bg: "bg-emerald-600 text-white",
                        },
                        {
                          name: "Milk Monthly Sub",
                          time: "1 hour ago",
                          amt: "+₹1,200.00",
                          badge: "M",
                          bg: "bg-violet-600 text-white",
                        },
                        {
                          name: "FMCG Wholesale Payout",
                          time: "2 hours ago",
                          amt: "-₹4,180.00",
                          badge: "W",
                          bg: "bg-rose-500/30 text-rose-300",
                        },
                      ].map((tx, i) => (
                        <div
                          key={i}
                          className="py-2.5 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] ${tx.bg}`}
                            >
                              {tx.badge}
                            </div>
                            <div>
                              <div className="text-white font-semibold">
                                {tx.name}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {tx.time}
                              </div>
                            </div>
                          </div>
                          <span className="text-white font-semibold">
                            {tx.amt}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            DASHBOARD 06: SUPPLY CHAIN & WAREHOUSE OVERVIEW (06-dashboard-inventory-supply-chain.png)
           ==================================================================== */}
        {show("inventory") && (
          <div className="relative rounded-2xl bg-[#0F0E1B] border border-slate-800 shadow-[0_25px_70px_rgba(15,23,42,0.22)] overflow-hidden">
            {/* macOS Window Chrome */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-[#18162B] border-b border-white/[0.07]">
              <span className="w-3 h-3 rounded-full bg-[#FF5F56]" />
              <span className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
              <span className="w-3 h-3 rounded-full bg-[#27C93F]" />
            </div>

            {/* Top Navigation Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 sm:px-6 py-3 sm:py-3.5 border-b border-white/[0.07] bg-[#121122]">
              <NexaLogo size="md" variant="n-wave" />

              <div className="order-3 lg:order-2 w-full lg:w-auto flex items-center gap-1 overflow-x-auto no-scrollbar bg-white/[0.04] p-1 rounded-full border border-white/10 text-xs">
                <span className="px-4 py-1.5 rounded-full bg-white/[0.1] text-white font-semibold whitespace-nowrap">
                  Overview
                </span>
                <span className="px-3.5 py-1.5 text-slate-400 whitespace-nowrap">
                  Warehouses
                </span>
                <span className="px-3.5 py-1.5 text-slate-400 whitespace-nowrap">
                  Inventory
                </span>
                <span className="px-3.5 py-1.5 text-slate-400 whitespace-nowrap">
                  Procurement
                </span>
                <span className="px-3.5 py-1.5 text-slate-400 whitespace-nowrap">
                  Shipments
                </span>
                <span className="px-3.5 py-1.5 text-slate-400 whitespace-nowrap">
                  Suppliers
                </span>
              </div>

              <div className="order-2 lg:order-3 flex items-center gap-2 sm:gap-2.5">
                <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs text-slate-400 w-44">
                  <Search className="w-3.5 h-3.5" />
                  <span>Search</span>
                </div>
                <button className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center text-slate-300">
                  <Bell className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 pl-1.5 pr-2.5 sm:pr-3 py-1 rounded-full bg-white/[0.05] border border-white/10">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-violet-400 to-teal-400 flex items-center justify-center text-[10px] font-bold text-white">
                    UN
                  </div>
                  <div className="text-left leading-tight">
                    <div className="text-[10px] font-semibold text-white">
                      User Name
                    </div>
                    <div className="text-[8.5px] text-slate-400">
                      neslu@noana
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="flex p-3.5 sm:p-5 gap-3.5 sm:gap-5">
              {/* Left Vertical Icon Sidebar */}
              <div className="hidden sm:flex flex-col items-center justify-between py-4 px-2.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex flex-col items-center gap-4">
                  <LayoutGrid className="w-4 h-4 text-slate-400" />
                  <Clock className="w-4 h-4 text-slate-400" />
                  <CreditCard className="w-4 h-4 text-slate-400" />
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-[0_0_16px_#8B5CF6]">
                    <Box className="w-4 h-4" />
                  </div>
                  <Users className="w-4 h-4 text-slate-400" />
                  <Globe className="w-4 h-4 text-slate-400" />
                  <Settings className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex flex-col items-center gap-4">
                  <HelpCircle className="w-4 h-4 text-slate-400" />
                  <LogOut className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 min-w-0 space-y-4 sm:space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg sm:text-2xl font-bold text-white">
                      Supply Chain &amp; Warehouse Overview
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                      Global logistics velocity, stock level tracking, and
                      predictive fulfillment
                    </p>
                  </div>
                  <button className="btn-neon-pill inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white">
                    <Plus className="w-4 h-4" />
                    <span>Create PO</span>
                  </button>
                </div>

                {/* Row 1: Total SKU Stock Value + Procurement Velocity + AI Restock Alerts */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Card 1: Total SKU Stock Value (3 cols) */}
                  <div className="lg:col-span-3 p-4 sm:p-5 rounded-2xl erp-widget-surface flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">
                        Total SKU Stock Value
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 text-xs font-semibold">
                        +12.1%
                      </span>
                    </div>

                    <div className="my-3">
                      <span className="text-xs text-slate-400 block">
                        Total SKU Stock Value
                      </span>
                      <div className="text-2xl font-bold text-white mt-0.5">
                        ₹19,20,450.00
                      </div>
                    </div>

                    <GlowingBarChart
                      values={[
                        42, 60, 48, 38, 52, 46, 82, 70, 58, 45, 62, 78,
                      ]}
                      variant="purple"
                      height={74}
                    />
                  </div>

                  {/* Card 2: Procurement & Fulfillment Velocity (6 cols) */}
                  <div className="lg:col-span-6 p-4 sm:p-5 rounded-2xl erp-widget-surface">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <span className="text-sm font-semibold text-white">
                        Procurement &amp; Fulfillment Velocity
                      </span>
                      <div className="flex items-center gap-3 text-[11px] text-slate-300">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-violet-500" />
                          Inbound Orders
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          Outbound Shipments
                        </span>
                      </div>
                    </div>

                    <DualSplineChart
                      primaryData={[
                        36, 50, 44, 65, 54, 86, 64, 68, 84, 66, 72, 86,
                      ]}
                      secondaryData={[
                        14, 21, 18, 27, 33, 44, 48, 52, 64, 56, 60, 65,
                      ]}
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
                        "Oct",
                        "Nov",
                        "Dec",
                      ]}
                      yAxisLabels={["100k", "75k", "50k", "25k", "0"]}
                      height={175}
                      showDots
                      highlightIndex={5}
                    />
                  </div>

                  {/* Card 3: AI Restock Alerts & Predictive Demand (3 cols) */}
                  <div className="lg:col-span-3 p-4 sm:p-5 rounded-2xl erp-widget-surface flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between">
                        <span className="text-sm font-semibold text-white leading-snug">
                          AI Restock Alerts &amp; Predictive Demand
                        </span>
                        <span className="text-slate-400 text-xs">•••</span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-3">
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[9.5px] font-medium">
                          Critical Stock
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9.5px] font-medium">
                          Auto-Reorder
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-300 text-[9.5px] font-medium">
                          High Demand
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 mt-4">
                      {[
                        "Microcontroller ICs",
                        "Lithium Packs",
                        "Sensors",
                      ].map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-xs"
                        >
                          <span className="text-white font-medium truncate">
                            {item}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-white/[0.08] text-[10px] text-slate-300 shrink-0">
                            ETA delivery
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Row 2: Global Warehouse Capacity + Shipment Status Breakdown + Active Purchase Orders */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Card 4: Global Warehouse Capacity (4 cols) */}
                  <div className="lg:col-span-4 p-4 sm:p-5 rounded-2xl erp-widget-surface flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-semibold text-white">
                        Global Warehouse Capacity
                      </span>
                      <span className="text-slate-400 text-xs">•••</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-around gap-3 py-2">
                      <ProgressRing
                        percent={88}
                        size={82}
                        strokeWidth={6.5}
                        color="#6366F1"
                        label="North America"
                      />
                      <ProgressRing
                        percent={74}
                        size={82}
                        strokeWidth={6.5}
                        color="#A855F7"
                        label="Europe"
                      />
                      <ProgressRing
                        percent={92}
                        size={82}
                        strokeWidth={6.5}
                        color="#818CF8"
                        label="APAC"
                      />
                    </div>
                  </div>

                  {/* Card 5: Shipment Status Breakdown (4 cols) */}
                  <div className="lg:col-span-4 p-4 sm:p-5 rounded-2xl erp-widget-surface flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-white">
                        Shipment Status Breakdown
                      </span>
                      <span className="text-slate-400 text-xs">•••</span>
                    </div>
                    <div className="relative flex items-center justify-center py-1">
                      <span className="absolute left-1 sm:left-2 top-2 sm:top-3 text-[11px] sm:text-xs text-cyan-300 font-medium">
                        In Transit
                      </span>
                      <span className="absolute right-1 sm:right-2 top-2 sm:top-3 text-[11px] sm:text-xs text-emerald-300 font-medium">
                        Delivered
                      </span>
                      <span className="absolute left-1 sm:left-2 bottom-2 sm:bottom-3 text-[11px] sm:text-xs text-amber-300 font-medium">
                        Customs
                      </span>
                      <span className="absolute right-1 sm:right-2 bottom-2 sm:bottom-3 text-[11px] sm:text-xs text-violet-300 font-medium">
                        Processing
                      </span>

                      <MultiSegmentDonut
                        size={140}
                        strokeWidth={12}
                        centerValue="14,820"
                        centerTitle="Units"
                        concentric
                        segments={[
                          { value: 28, color: "#34D399" },
                          { value: 24, color: "#A855F7" },
                          { value: 24, color: "#FBBF24" },
                          { value: 24, color: "#38BDF8" },
                        ]}
                      />
                    </div>
                  </div>

                  {/* Card 6: Active Purchase Orders (4 cols) */}
                  <div className="lg:col-span-4 p-4 sm:p-5 rounded-2xl erp-widget-surface overflow-x-auto no-scrollbar">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-white">
                        Active Purchase Orders
                      </span>
                      <span className="text-slate-400 text-xs">•••</span>
                    </div>

                    <div className="min-w-[270px]">
                      <div className="grid grid-cols-4 text-[11px] text-slate-400 pb-2 border-b border-white/10">
                        <span>PO Feed</span>
                        <span>Supplier</span>
                        <span>Status</span>
                        <span className="text-right">Value</span>
                      </div>

                      <div className="divide-y divide-white/[0.06] mt-1">
                        {[
                          {
                            po: "PO-8821",
                            sup: "Amul Dairy",
                            status: "Dispatched",
                            sClass:
                              "bg-amber-500/20 border-amber-500/40 text-amber-300",
                            val: "₹13,500.00",
                          },
                          {
                            po: "PO-8834",
                            sup: "ITC Wholesale",
                            status: "Docked",
                            sClass:
                              "bg-blue-500/20 border-blue-500/40 text-blue-300",
                            val: "₹15,000.00",
                          },
                          {
                            po: "PO-8840",
                            sup: "Tata Consumer",
                            status: "Cleared",
                            sClass:
                              "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
                            val: "₹17,000.00",
                          },
                        ].map((row, i) => (
                          <div
                            key={i}
                            className="py-3 grid grid-cols-4 items-center text-xs"
                          >
                            <span className="text-indigo-400 font-medium">
                              {row.po}
                            </span>
                            <span className="text-white font-medium truncate">
                              {row.sup}
                            </span>
                            <span>
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-medium whitespace-nowrap ${row.sClass}`}
                              >
                                {row.status}
                              </span>
                            </span>
                            <span className="text-right text-white font-semibold">
                              {row.val}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            DASHBOARD 07: OPERATIONS & RESOURCE EXECUTION (07-dashboard-operations-projects.png)
           ==================================================================== */}
        {show("operations") && (
          <div className="relative rounded-2xl bg-[#0F0E1B] border border-slate-800 shadow-[0_25px_70px_rgba(15,23,42,0.22)] overflow-hidden">
            {/* macOS Window Chrome */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-[#18162B] border-b border-white/[0.07]">
              <span className="w-3 h-3 rounded-full bg-[#FF5F56]" />
              <span className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
              <span className="w-3 h-3 rounded-full bg-[#27C93F]" />
            </div>

            {/* Top Navigation Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 sm:px-6 py-3 sm:py-3.5 border-b border-white/[0.07] bg-[#121122]">
              <NexaLogo size="md" variant="x-wing" />

              <div className="order-3 lg:order-2 w-full lg:w-auto flex items-center gap-1 overflow-x-auto no-scrollbar bg-white/[0.04] p-1 rounded-full border border-white/10 text-xs">
                <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold shadow whitespace-nowrap">
                  Overview
                </span>
                <span className="px-3.5 py-1.5 text-slate-300 whitespace-nowrap">
                  Projects
                </span>
                <span className="px-3.5 py-1.5 rounded-full bg-violet-600/30 text-white font-medium shadow-[0_0_15px_rgba(139,92,246,0.5)] whitespace-nowrap">
                  Operations
                </span>
                <span className="px-3.5 py-1.5 text-slate-300 whitespace-nowrap">
                  Sprints
                </span>
                <span className="px-3.5 py-1.5 text-slate-300 whitespace-nowrap">
                  Resources
                </span>
              </div>

              <div className="order-2 lg:order-3 flex items-center gap-2 sm:gap-2.5">
                <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs text-slate-400 w-44">
                  <Search className="w-3.5 h-3.5" />
                  <span>Search</span>
                </div>
                <button className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center text-slate-300">
                  <Bell className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 pl-1.5 pr-2.5 sm:pr-3 py-1 rounded-full bg-violet-500/20 border border-violet-400/40">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-violet-500 to-indigo-400 flex items-center justify-center text-[10px] font-bold text-white">
                    JN
                  </div>
                  <span className="text-xs font-medium text-white">
                    Juser Name
                  </span>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="flex p-3.5 sm:p-5 gap-3.5 sm:gap-5">
              {/* Left Vertical Icon Sidebar */}
              <div className="hidden sm:flex flex-col items-center justify-between py-4 px-2.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-[0_0_16px_#8B5CF6]">
                    <LayoutGrid className="w-4 h-4" />
                  </div>
                  <CreditCard className="w-4 h-4 text-slate-400" />
                  <Database className="w-4 h-4 text-slate-400" />
                  <Globe className="w-4 h-4 text-slate-400" />
                  <Settings className="w-4 h-4 text-slate-400" />
                </div>
                <LogOut className="w-4 h-4 text-slate-400" />
              </div>

              {/* Main Content */}
              <div className="flex-1 min-w-0 space-y-4 sm:space-y-5">
                <h3 className="text-lg sm:text-2xl font-bold text-white">
                  Operations &amp; Resource Execution
                </h3>

                {/* Row 1: Overall Operational Efficiency + Production & Sprint Velocity + AI Workflow Automation */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Card 1: Overall Operational Efficiency (3 cols) */}
                  <div className="lg:col-span-3 p-4 sm:p-5 rounded-2xl erp-widget-purple-corner flex flex-col justify-between">
                    <div>
                      <span className="text-sm font-semibold text-white">
                        Overall Operational Efficiency
                      </span>
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-3xl font-bold text-white">
                          94.6%
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-semibold">
                          +6.2%
                        </span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <GlowingBarChart
                        values={[38, 68, 52, 76, 62, 88]}
                        labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun"]}
                        variant="purple"
                        height={120}
                      />
                    </div>
                  </div>

                  {/* Card 2: Production & Sprint Velocity (6 cols) */}
                  <div className="lg:col-span-6 p-4 sm:p-5 rounded-2xl erp-widget-purple-corner">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <span className="text-sm font-semibold text-white">
                        Production &amp; Sprint Velocity
                      </span>
                      <div className="flex items-center gap-3 text-xs text-slate-300">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-violet-500" />
                          Spending
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          Savings
                        </span>
                      </div>
                    </div>
                    <DualSplineChart
                      primaryData={[16, 14, 21, 18, 22, 34, 36, 31, 35, 32]}
                      secondaryData={[2, 4, 3, 8, 9, 12, 11, 13, 10, 11]}
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
                      yAxisLabels={["40k", "30k", "20k", "10k", "0"]}
                      height={170}
                    />
                  </div>

                  {/* Card 3: AI Workflow Automation Status (3 cols) */}
                  <div className="lg:col-span-3 p-4 sm:p-5 rounded-2xl erp-widget-purple-corner flex flex-col justify-between">
                    <span className="text-sm font-semibold text-white">
                      AI Workflow Automation Status
                    </span>

                    <div className="grid grid-cols-2 gap-3 my-4">
                      <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-400/40 flex items-center justify-center text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.4)]">
                          <Bot className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] text-slate-300 mt-2">
                          Active Bots
                        </span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.4)]">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] text-slate-300 mt-2">
                          Active Bots
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10 text-center">
                      <div>
                        <div className="text-2xl font-bold text-white">87%</div>
                        <div className="text-[10px] text-slate-400">
                          SLA Adherence
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">
                          10.0%
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Adherence
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Row 2: Active Enterprise Milestones + Resource Utilization by Team + Live Task & Incident Queue */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Card 4: Active Enterprise Milestones (3 cols) */}
                  <div className="lg:col-span-3 p-4 sm:p-5 rounded-2xl erp-widget-purple-corner">
                    <span className="text-sm font-semibold text-white block mb-4">
                      Active Enterprise Milestones
                    </span>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      {[
                        { pct: 78, sub: "1097%", color: "#A855F7" },
                        { pct: 92, sub: "6728%", color: "#34D399" },
                        { pct: 64, sub: "1360%", color: "#8B5CF6" },
                        { pct: 85, sub: "6106%", color: "#22D3EE" },
                      ].map((m, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <ProgressRing
                            percent={m.pct}
                            size={54}
                            strokeWidth={5.5}
                            color={m.color}
                          />
                          <span className="text-[10px] text-slate-400 font-mono">
                            {m.sub}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card 5: Resource Utilization by Team (4 cols) */}
                  <div className="lg:col-span-4 p-4 sm:p-5 rounded-2xl erp-widget-purple-corner">
                    <span className="text-sm font-semibold text-white block mb-3">
                      Resource Utilization by Team
                    </span>
                    <div className="flex flex-wrap sm:flex-nowrap items-center justify-around gap-4">
                      <MultiSegmentDonut
                        size={132}
                        strokeWidth={18}
                        segments={[
                          { value: 30, color: "#6366F1" },
                          { value: 18, color: "#38BDF8" },
                          { value: 20, color: "#EC4899" },
                          { value: 16, color: "#34D399" },
                          { value: 16, color: "#F59E0B" },
                        ]}
                      />
                      <div className="space-y-1.5 text-[11px] text-slate-300">
                        {[
                          { label: "Development", color: "bg-indigo-500" },
                          { label: "Team", color: "bg-emerald-400" },
                          { label: "Centers", color: "bg-fuchsia-500" },
                          { label: "Team", color: "bg-sky-400" },
                          { label: "Manager", color: "bg-rose-400" },
                          { label: "Figma", color: "bg-cyan-400" },
                          { label: "Others", color: "bg-orange-400" },
                        ].map((item, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span
                              className={`w-2.5 h-2.5 rounded-sm ${item.color}`}
                            />
                            <span>{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card 6: Live Task & Incident Queue (5 cols) */}
                  <div className="lg:col-span-5 p-4 sm:p-5 rounded-2xl erp-widget-purple-corner overflow-x-auto no-scrollbar">
                    <span className="text-sm font-semibold text-white block mb-3">
                      Live Task &amp; Incident Queue
                    </span>
                    <div className="min-w-[290px]">
                      <div className="grid grid-cols-12 text-[11px] text-slate-400 pb-2 border-b border-white/10">
                        <span className="col-span-5">Name</span>
                        <span className="col-span-3">Status</span>
                        <span className="col-span-2">User</span>
                        <span className="col-span-2 text-right">Priority</span>
                      </div>
                      <div className="divide-y divide-white/[0.06] mt-1">
                        {[
                          {
                            name: "Buy new MacBook Pro",
                            statusClass:
                              "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
                            prio: "Referred",
                            prioClass: "bg-rose-500/80 text-white",
                          },
                          {
                            name: "Buy new iPhone Pro",
                            statusClass:
                              "bg-violet-500/20 border-violet-500/40 text-violet-300",
                            prio: "Priority",
                            prioClass: "bg-blue-500/80 text-white",
                          },
                          {
                            name: "Buy new iPad Pro",
                            statusClass:
                              "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
                            prio: "Failed",
                            prioClass: "bg-amber-500/80 text-white",
                          },
                          {
                            name: "Live Task Incident",
                            statusClass:
                              "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
                            prio: "Referred",
                            prioClass: "bg-rose-500/80 text-white",
                          },
                        ].map((row, i) => (
                          <div
                            key={i}
                            className="py-2.5 grid grid-cols-12 items-center text-xs"
                          >
                            <span className="col-span-5 text-white font-medium truncate pr-1">
                              {row.name}
                            </span>
                            <span className="col-span-3">
                              <span
                                className={`px-2 py-0.5 rounded-full border text-[10px] whitespace-nowrap ${row.statusClass}`}
                              >
                                Status
                              </span>
                            </span>
                            <span className="col-span-2 flex -space-x-1.5">
                              <span className="w-5 h-5 rounded-full bg-indigo-500 border border-[#141326] text-[8px] flex items-center justify-center font-bold">
                                A
                              </span>
                              <span className="w-5 h-5 rounded-full bg-amber-500 border border-[#141326] text-[8px] flex items-center justify-center font-bold">
                                B
                              </span>
                            </span>
                            <span className="col-span-2 text-right">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9.5px] font-medium whitespace-nowrap ${row.prioClass}`}
                              >
                                {row.prio}
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            DASHBOARD 08: WORKFORCE & PAYROLL INTELLIGENCE (08-dashboard-hr-payroll.png)
           ==================================================================== */}
        {show("hr") && (
          <div className="relative rounded-2xl bg-[#0F0E1B] border border-slate-800 shadow-[0_25px_70px_rgba(15,23,42,0.22)] overflow-hidden">
            {/* macOS Window Chrome */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-[#18162B] border-b border-white/[0.07]">
              <span className="w-3 h-3 rounded-full bg-[#FF5F56]" />
              <span className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
              <span className="w-3 h-3 rounded-full bg-[#27C93F]" />
            </div>

            {/* Top Navigation Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 sm:px-6 py-3 sm:py-3.5 border-b border-white/[0.07] bg-[#121122]">
              <NexaLogo size="md" variant="x-wing" />

              <div className="order-3 lg:order-2 w-full lg:w-auto flex items-center gap-1 overflow-x-auto no-scrollbar bg-white/[0.04] p-1 rounded-full border border-white/10 text-xs">
                <span className="px-3.5 py-1.5 text-slate-300 whitespace-nowrap">
                  Overview
                </span>
                <span className="px-3.5 py-1.5 text-slate-300 whitespace-nowrap">
                  People
                </span>
                <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold shadow-[0_0_18px_#8B5CF6] whitespace-nowrap">
                  Payroll
                </span>
                <span className="px-3.5 py-1.5 text-slate-300 whitespace-nowrap">
                  Benefits
                </span>
                <span className="px-3.5 py-1.5 text-slate-300 whitespace-nowrap">
                  Compliance
                </span>
              </div>

              <div className="order-2 lg:order-3 flex items-center gap-2 sm:gap-2.5">
                <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs text-slate-400 w-44">
                  <Search className="w-3.5 h-3.5" />
                  <span>Search</span>
                </div>
                <button className="relative w-8 h-8 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center text-slate-300">
                  <Bell className="w-4 h-4" />
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-violet-500 text-[9px] font-bold text-white flex items-center justify-center">
                    1
                  </span>
                </button>
                <div className="flex items-center gap-2 pl-1.5 pr-2.5 sm:pr-3 py-1 rounded-full bg-violet-500/20 border border-violet-400/40">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-pink-400 to-violet-500 flex items-center justify-center text-[10px] font-bold text-white">
                    JC
                  </div>
                  <div className="text-left leading-tight">
                    <div className="text-[10px] font-semibold text-white">
                      Jane Cooper
                    </div>
                    <div className="text-[8.5px] text-slate-300">
                      HR Director
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="flex p-3.5 sm:p-5 gap-3.5 sm:gap-5">
              {/* Left Vertical Icon Sidebar */}
              <div className="hidden sm:flex flex-col items-center justify-between py-4 px-2.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex flex-col items-center gap-4">
                  <LayoutGrid className="w-4 h-4 text-slate-400" />
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-[0_0_16px_#8B5CF6]">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <Database className="w-4 h-4 text-slate-400" />
                  <Globe className="w-4 h-4 text-slate-400" />
                  <Settings className="w-4 h-4 text-slate-400" />
                </div>
                <LogOut className="w-4 h-4 text-slate-400" />
              </div>

              {/* Main Content */}
              <div className="flex-1 min-w-0 space-y-4 sm:space-y-5">
                <h3 className="text-lg sm:text-2xl font-bold text-white">
                  Workforce &amp; Payroll Intelligence
                </h3>

                {/* Row 1: Monthly Global Payroll KPI + Headcount Growth & Retention + Upcoming Payroll Cycle */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Card 1: Monthly Customer Khata KPI (3 cols) */}
                  <div className="lg:col-span-3 p-4 sm:p-5 rounded-2xl erp-widget-purple-corner flex flex-col justify-between">
                    <div>
                      <span className="text-sm font-semibold text-white">
                        Monthly Customer Khata Collections
                      </span>
                      <div className="text-3xl font-bold text-white mt-3 tracking-tight">
                        ₹8,45,200.00
                      </div>
                      <button className="mt-4 w-full py-2.5 rounded-full btn-neon-pill text-sm font-semibold text-white">
                        Send WhatsApp Reminders
                      </button>
                    </div>

                    <div className="mt-5">
                      <div className="text-xs font-medium text-white mb-1.5">
                        Disbursement
                      </div>
                      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                        <div className="w-[60%] h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-400 to-emerald-400" />
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1.5">
                        60% Disbursed
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Headcount Growth & Retention Rate (6 cols) */}
                  <div className="lg:col-span-6 p-4 sm:p-5 rounded-2xl erp-widget-purple-corner">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <span className="text-sm font-semibold text-white">
                        Headcount Growth &amp; Retention Rate
                      </span>
                      <div className="flex items-center gap-3 text-xs text-slate-300">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-violet-500" />
                          Headcount
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          Retention
                        </span>
                      </div>
                    </div>
                    <DualSplineChart
                      primaryData={[8, 19, 17, 25, 29, 36, 32, 35, 33, 37]}
                      secondaryData={[3, 11, 10, 16, 22, 20, 27, 23, 20, 24]}
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
                      yAxisLabels={["40k", "30k", "20k", "10k", "0"]}
                      height={170}
                      highlightIndex={4}
                    />
                  </div>

                  {/* Card 3: Upcoming Payroll Cycle & Tax Withholding (3 cols) */}
                  <div className="lg:col-span-3 p-4 sm:p-5 rounded-2xl erp-widget-purple-corner flex flex-col justify-between">
                    <div>
                      <span className="text-sm font-semibold text-white block leading-snug">
                        Upcoming Payroll Cycle &amp; Tax Withholding
                      </span>
                      <span className="text-[11px] text-slate-300 block mt-2 mb-1">
                        Withholding Breakdown
                      </span>
                      <GlowingBarChart
                        values={[82, 58, 45, 52]}
                        labels={["Federal", "State", "Local", "401k"]}
                        variant="cyan-mint"
                        height={95}
                        showTrack
                      />
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-white/10">
                      <span className="text-[11px] text-slate-300 block mb-2">
                        Compliance Check
                      </span>
                      <div className="flex items-center justify-between">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <span
                            key={i}
                            className="w-5 h-5 rounded-full bg-emerald-400/25 border border-emerald-400 flex items-center justify-center text-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                          >
                            <Check className="w-3 h-3" />
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Row 2: Department Hiring Goals + Workforce Distribution + Recent Employee Onboarding */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Card 4: Department Hiring Goals (3 cols) */}
                  <div className="lg:col-span-3 p-4 sm:p-5 rounded-2xl erp-widget-purple-corner">
                    <span className="text-sm font-semibold text-white block mb-4">
                      Department Hiring Goals
                    </span>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      {[
                        {
                          pct: 75,
                          dept: "Engineering",
                          color: "#A855F7",
                          icon: <Settings className="w-4 h-4 text-violet-300" />,
                        },
                        {
                          pct: 90,
                          dept: "Sales",
                          color: "#34D399",
                          icon: (
                            <TrendingUp className="w-4 h-4 text-emerald-300" />
                          ),
                        },
                        {
                          pct: 60,
                          dept: "Operations",
                          color: "#8B5CF6",
                          icon: <Globe className="w-4 h-4 text-indigo-300" />,
                        },
                        {
                          pct: 45,
                          dept: "Product",
                          color: "#38BDF8",
                          icon: <Briefcase className="w-4 h-4 text-sky-300" />,
                        },
                      ].map((g, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <ProgressRing
                            percent={g.pct}
                            size={54}
                            strokeWidth={5}
                            color={g.color}
                            icon={g.icon}
                          />
                          <div>
                            <div className="text-[10px] text-slate-300">
                              {g.dept}
                            </div>
                            <div className="text-sm font-bold text-white">
                              {g.pct}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card 5: Workforce Distribution (4 cols) */}
                  <div className="lg:col-span-4 p-4 sm:p-5 rounded-2xl erp-widget-purple-corner">
                    <span className="text-sm font-semibold text-white block mb-3">
                      Workforce Distribution
                    </span>
                    <div className="flex flex-wrap sm:flex-nowrap items-center justify-around gap-4">
                      <MultiSegmentDonut
                        size={132}
                        strokeWidth={18}
                        segments={[
                          { value: 30, color: "#6366F1" },
                          { value: 18, color: "#38BDF8" },
                          { value: 20, color: "#EC4899" },
                          { value: 16, color: "#34D399" },
                          { value: 16, color: "#F59E0B" },
                        ]}
                      />
                      <div className="space-y-1.5 text-[11px] text-slate-300">
                        {[
                          { label: "Engineering", color: "bg-indigo-500" },
                          { label: "Sales", color: "bg-emerald-400" },
                          { label: "Marketing", color: "bg-fuchsia-500" },
                          { label: "Team", color: "bg-sky-400" },
                          { label: "Manager", color: "bg-rose-400" },
                          { label: "Figma", color: "bg-cyan-400" },
                          { label: "Others", color: "bg-orange-400" },
                        ].map((item, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span
                              className={`w-2.5 h-2.5 rounded-sm ${item.color}`}
                            />
                            <span>{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card 6: Recent Employee Onboarding & Approvals (5 cols) */}
                  <div className="lg:col-span-5 p-4 sm:p-5 rounded-2xl erp-widget-purple-corner overflow-x-auto no-scrollbar">
                    <span className="text-sm font-semibold text-white block mb-3">
                      Recent Employee Onboarding &amp; Approvals
                    </span>
                    <div className="min-w-[290px]">
                      <div className="grid grid-cols-12 text-[11px] text-slate-400 pb-2 border-b border-white/10">
                        <span className="col-span-5">Name</span>
                        <span className="col-span-3">Department</span>
                        <span className="col-span-4 text-right">Status</span>
                      </div>
                      <div className="divide-y divide-white/[0.06] mt-1">
                        {[
                          {
                            name: "Sarah L.",
                            dept: "PRODUCT",
                            dClass:
                              "bg-violet-500/20 border-violet-400/40 text-violet-200",
                            status: "ONBOARDED",
                            sClass:
                              "bg-emerald-500/20 border-emerald-400/40 text-emerald-300",
                          },
                          {
                            name: "Mike D.",
                            dept: "SALES",
                            dClass:
                              "bg-indigo-500/20 border-indigo-400/40 text-indigo-200",
                            status: "PENDING APPROVAL",
                            sClass:
                              "bg-amber-500/20 border-amber-400/40 text-amber-300",
                          },
                          {
                            name: "Alex P.",
                            dept: "DESIGN",
                            dClass:
                              "bg-amber-500/20 border-amber-400/40 text-amber-200",
                            status: "ONBOARDED",
                            sClass:
                              "bg-emerald-500/20 border-emerald-400/40 text-emerald-300",
                          },
                          {
                            name: "Kenji T.",
                            dept: "DEV",
                            dClass:
                              "bg-sky-500/20 border-sky-400/40 text-sky-200",
                            status: "ONBOARDED",
                            sClass:
                              "bg-emerald-500/20 border-emerald-400/40 text-emerald-300",
                          },
                        ].map((row, i) => (
                          <div
                            key={i}
                            className="py-2.5 grid grid-cols-12 items-center text-xs"
                          >
                            <div className="col-span-5 flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-pink-400 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                                {row.name.slice(0, 2).toUpperCase()}
                              </div>
                              <span className="text-white font-medium truncate">
                                {row.name}
                              </span>
                            </div>
                            <div className="col-span-3">
                              <span
                                className={`px-2 py-0.5 rounded-full border text-[9.5px] font-semibold whitespace-nowrap ${row.dClass}`}
                              >
                                {row.dept}
                              </span>
                            </div>
                            <div className="col-span-4 text-right">
                              <span
                                className={`px-2 py-0.5 rounded-full border text-[9px] sm:text-[9.5px] font-semibold whitespace-nowrap ${row.sClass}`}
                              >
                                {row.status}
                              </span>
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
        )}

        {/* ====================================================================
            DASHBOARD 09: REVENUE & CRM PIPELINE OVERVIEW (09-dashboard-crm-sales.png)
           ==================================================================== */}
        {show("crm") && (
          <div className="relative rounded-2xl bg-[#0F0E1B] border border-slate-800 shadow-[0_25px_70px_rgba(15,23,42,0.22)] overflow-hidden">
            {/* macOS Window Chrome with URL bar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#18162B] border-b border-white/[0.07]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                <span className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                <span className="w-3 h-3 rounded-full bg-[#27C93F]" />
              </div>
              <div className="px-4 sm:px-20 py-1 rounded-md bg-white/[0.05] border border-white/10 text-xs text-slate-300 font-mono">
                🔒 nexaerp.com
              </div>
              <div className="w-6 sm:w-12" />
            </div>

            {/* Top Navigation Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 sm:px-6 py-3 sm:py-3.5 border-b border-white/[0.07] bg-[#121122]">
              <NexaLogo size="md" variant="n-wave" />

              <div className="order-3 lg:order-2 w-full lg:w-auto flex items-center gap-1 overflow-x-auto no-scrollbar bg-white/[0.04] p-1 rounded-full border border-white/10 text-xs">
                <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold shadow whitespace-nowrap">
                  Overview
                </span>
                <span className="px-3.5 py-1.5 text-slate-300 whitespace-nowrap">
                  Pipeline
                </span>
                <span className="px-3.5 py-1.5 text-slate-300 whitespace-nowrap">
                  Accounts
                </span>
                <span className="px-3.5 py-1.5 text-slate-300 whitespace-nowrap">
                  Revenue
                </span>
                <span className="px-3.5 py-1.5 text-slate-300 whitespace-nowrap">
                  Forecast
                </span>
              </div>

              <div className="order-2 lg:order-3 flex items-center gap-2 sm:gap-2.5">
                <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs text-slate-400 w-44">
                  <Search className="w-3.5 h-3.5" />
                  <span>Search</span>
                </div>
                <button className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center text-slate-300">
                  <Bell className="w-4 h-4" />
                </button>
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-400 to-pink-400 flex items-center justify-center text-xs font-bold text-white">
                  CR
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="flex p-3.5 sm:p-5 gap-3.5 sm:gap-5">
              {/* Left Vertical Icon Sidebar */}
              <div className="hidden sm:flex flex-col items-center justify-between py-4 px-2.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-violet-600/30 border border-violet-400/50 flex items-center justify-center text-violet-300">
                    <LayoutGrid className="w-4 h-4" />
                  </div>
                  <CreditCard className="w-4 h-4 text-slate-400" />
                  <Users className="w-4 h-4 text-slate-400" />
                  <Database className="w-4 h-4 text-slate-400" />
                  <TrendingUp className="w-4 h-4 text-slate-400" />
                  <Settings className="w-4 h-4 text-slate-400" />
                </div>
                <LogOut className="w-4 h-4 text-slate-400" />
              </div>

              {/* Main Content */}
              <div className="flex-1 min-w-0 space-y-4 sm:space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg sm:text-2xl font-bold text-white">
                    Revenue &amp; CRM Pipeline Overview
                  </h3>
                  <button className="px-3.5 py-1.5 rounded-lg bg-white/[0.06] border border-white/15 text-xs text-slate-200 font-medium">
                    + Add Widget
                  </button>
                </div>

                {/* Row 1: ARR Bar Chart + Deal Pipeline & Conversion Velocity + AI Deal Win-Probability */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Card 1: ARR (3 cols) */}
                  <div className="lg:col-span-3 p-4 sm:p-5 rounded-2xl erp-widget-surface flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-300">
                          Annual Catalogue GMV
                        </span>
                        <span className="text-slate-400 text-xs">⋮</span>
                      </div>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-xl sm:text-2xl font-bold text-white">
                          ₹1,24,80,000
                        </span>
                        <span className="text-xs font-semibold text-emerald-400">
                          (+28.4%)
                        </span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <GlowingBarChart
                        values={[35, 48, 62, 52, 74, 58, 78, 86, 95]}
                        labels={[
                          "Jan",
                          "Feb",
                          "Mar",
                          "Apr",
                          "Jun",
                          "Aug",
                          "Sep",
                          "Oct",
                          "Nov",
                        ]}
                        variant="purple"
                        height={125}
                      />
                    </div>
                  </div>

                  {/* Card 2: Deal Pipeline & Conversion Velocity (6 cols) */}
                  <div className="lg:col-span-6 p-4 sm:p-5 rounded-2xl erp-widget-surface">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div>
                        <span className="text-sm font-semibold text-white block">
                          Deal Pipeline &amp; Conversion Velocity
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Dual-spline &amp; Conversion Velocity
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-300 font-mono">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-violet-500" />
                          #8B5CF6
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          #10B981
                        </span>
                      </div>
                    </div>

                    <DualSplineChart
                      primaryData={[6, 28, 15, 24, 25, 38, 25, 31]}
                      secondaryData={[2, 18, 11, 7, 15, 26, 16, 38]}
                      labels={[
                        "Jan",
                        "Feb",
                        "Mar",
                        "Apr",
                        "May",
                        "Jun",
                        "Jul",
                        "Aug",
                      ]}
                      yAxisLabels={["40k", "30k", "20k", "10k", "0"]}
                      height={165}
                    />
                  </div>

                  {/* Card 3: AI Deal Win-Probability: 88% (3 cols) */}
                  <div className="lg:col-span-3 p-4 sm:p-5 rounded-2xl erp-widget-surface flex flex-col justify-between">
                    <div>
                      <span className="text-sm font-semibold text-white block">
                        AI Deal Win-Probability: 88%
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Smart recommendation pills
                      </span>

                      <div className="w-full h-2 rounded-full bg-white/10 mt-3 overflow-hidden">
                        <div className="w-[88%] h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-400 to-teal-300" />
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-3.5">
                        <span className="px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/10 text-[10px] text-slate-200">
                          Smart Recommendation
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/10 text-[10px] text-slate-200">
                          Growth Reminders
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/10 text-[10px] text-slate-200">
                          Evaluation
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/10 text-[10px] text-slate-200">
                          Smart Recommendation &amp; Analysts
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/10">
                      <span className="text-[11px] text-slate-400 block mb-1.5">
                        Insight Tags ⓘ
                      </span>
                      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-slate-200">
                        <span>AI Deal High-Probability: 88%</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Row 2: Enterprise Deal Stages + Revenue by Segment + Recent High-Value Invoices */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Card 4: Enterprise Deal Stages (5 cols) */}
                  <div className="lg:col-span-5 p-4 sm:p-5 rounded-2xl erp-widget-surface flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-semibold text-white block">
                          Enterprise Deal Stages
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Manage progress for ring meters
                        </span>
                      </div>
                      <span className="text-slate-400 text-xs">•••</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 sm:gap-2 py-3 justify-items-center">
                      {[
                        {
                          pct: 70,
                          label: "Prospecting",
                          color: "#8B5CF6",
                        },
                        {
                          pct: 75,
                          label: "Qualification",
                          color: "#818CF8",
                        },
                        {
                          pct: 60,
                          label: "Proposal",
                          color: "#A855F7",
                        },
                        {
                          pct: 75,
                          label: "Negotiation",
                          color: "#34D399",
                        },
                        {
                          pct: 30,
                          label: "Other",
                          color: "#6366F1",
                        },
                      ].map((s, i) => (
                        <ProgressRing
                          key={i}
                          percent={s.pct}
                          size={58}
                          strokeWidth={5}
                          color={s.color}
                          label={s.label}
                          sublabel="Progressed"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Card 5: Revenue by Segment (4 cols) */}
                  <div className="lg:col-span-4 p-4 sm:p-5 rounded-2xl erp-widget-surface">
                    <span className="text-sm font-semibold text-white block mb-3">
                      Revenue by Segment
                    </span>
                    <div className="flex flex-wrap sm:flex-nowrap items-center justify-around gap-3">
                      <MultiSegmentDonut
                        size={128}
                        strokeWidth={15}
                        segments={[
                          { value: 34, color: "#8B5CF6" },
                          { value: 22, color: "#34D399" },
                          { value: 20, color: "#EC4899" },
                          { value: 24, color: "#22D3EE" },
                        ]}
                      />
                      <div className="space-y-2 text-[11px] text-slate-300">
                        {[
                          { label: "Business Segment", color: "bg-cyan-400" },
                          { label: "Total Segment", color: "bg-violet-500" },
                          { label: "Proposal", color: "bg-pink-500" },
                          { label: "Proposal", color: "bg-emerald-400" },
                          { label: "Business Segment", color: "bg-sky-400" },
                        ].map((seg, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${seg.color}`}
                            />
                            <span>{seg.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card 6: Recent High-Value Invoices & Contracts (3 cols) */}
                  <div className="lg:col-span-3 p-4 sm:p-5 rounded-2xl erp-widget-surface flex flex-col justify-between">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-sm font-semibold text-white leading-snug">
                        Recent High-Value Invoices &amp; Contracts
                      </span>
                      <span className="text-slate-400 text-xs">•••</span>
                    </div>

                    <div className="space-y-2.5">
                      {[
                        { date: "Society Agreement 20, 2024", val: "₹450K" },
                        { date: "Vendor Contract 28, 2024", val: "₹280K" },
                        { date: "Supply Order 29, 2024", val: "₹190K" },
                      ].map((c, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center text-slate-300 shrink-0">
                              <FileText className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="text-white font-medium">
                                Contract Contract
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {c.date}
                              </div>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-semibold text-[11px]">
                            {c.val}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </section>
  );
}
