"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Users,
  TrendingUp,
  ShieldCheck,
  Globe,
  Server,
  Database,
  Search,
  Bell,
  Filter,
  Download,
  ExternalLink,
  Layers,
  Lock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Clock,
  Sparkles,
  RefreshCw,
  Building2,
  DollarSign,
  Zap,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  PlusCircle,
  FileSpreadsheet,
  Check,
  Terminal,
  Cpu,
  Radio,
  Share2
} from "lucide-react";

// ==========================================
// MOCK DATA & CONSTANTS
// ==========================================

const INITIAL_KPIS = {
  totalVisitors: 482910,
  visitorsChange: "+18.4%",
  pageViews: 1845200,
  activeInquiries: 1420,
  pipelineValue: "$8,650,000",
  pipelineChange: "+24.1%",
  conversionRate: "4.82%",
  activeClients: 84,
  clientRetention: "98.6%",
  systemUptime: "99.98%",
  apiLatency: "38ms",
  securityScore: "99.4%"
};

const TIMEFRAMES = [
  { id: "24h", label: "Last 24h" },
  { id: "7d", label: "7 Days" },
  { id: "30d", label: "30 Days" },
  { id: "quarter", label: "Quarter" }
];

const CHART_DATA_SETS = {
  "24h": [
    { label: "00:00", visitors: 3200, pageViews: 12400 },
    { label: "04:00", visitors: 1800, pageViews: 7100 },
    { label: "08:00", visitors: 8900, pageViews: 34200 },
    { label: "12:00", visitors: 14200, pageViews: 52100 },
    { label: "16:00", visitors: 16800, pageViews: 61800 },
    { label: "20:00", visitors: 11400, pageViews: 41900 },
    { label: "23:59", visitors: 7800, pageViews: 28400 }
  ],
  "7d": [
    { label: "Mon", visitors: 38200, pageViews: 148000 },
    { label: "Tue", visitors: 42100, pageViews: 162000 },
    { label: "Wed", visitors: 46800, pageViews: 182000 },
    { label: "Thu", visitors: 51200, pageViews: 198000 },
    { label: "Fri", visitors: 48900, pageViews: 189000 },
    { label: "Sat", visitors: 28400, pageViews: 108000 },
    { label: "Sun", visitors: 31200, pageViews: 119000 }
  ],
  "30d": [
    { label: "Week 1", visitors: 104200, pageViews: 395000 },
    { label: "Week 2", visitors: 118400, pageViews: 452000 },
    { label: "Week 3", visitors: 126900, pageViews: 481000 },
    { label: "Week 4", visitors: 133410, pageViews: 517200 }
  ],
  "quarter": [
    { label: "Month 1", visitors: 392000, pageViews: 1520000 },
    { label: "Month 2", visitors: 441000, pageViews: 1710000 },
    { label: "Month 3", visitors: 482910, pageViews: 1845200 }
  ]
};

const INITIAL_INQUIRIES = [
  {
    id: "INQ-9801",
    company: "Aether Dynamics Inc.",
    industry: "Aerospace & Defense",
    contact: "Marcus Vance (VP Tech)",
    service: "Applied AI & Computer Vision",
    budget: "$150,000 - $250,000",
    score: 98,
    status: "Under Review",
    statusColor: "text-amber-400 bg-amber-400/10 border-amber-400/30",
    date: "12m ago"
  },
  {
    id: "INQ-9802",
    company: "Vanguard Health Partners",
    industry: "Enterprise Healthcare",
    contact: "Dr. Elena Rostova (CIO)",
    service: "Cloud Modernization & HIPAA Lakehouse",
    budget: "$300,000+",
    score: 96,
    status: "Proposal Sent",
    statusColor: "text-cyan-400 bg-cyan-400/10 border-cyan-400/30",
    date: "45m ago"
  },
  {
    id: "INQ-9803",
    company: "Nexus Capital Group",
    industry: "Fintech & High Frequency Trading",
    contact: "Julian Thorne (Head of Infrastructure)",
    service: "Cyber Resilience & Zero-Trust Architecture",
    budget: "$100,000 - $180,000",
    score: 91,
    status: "Meeting Scheduled",
    statusColor: "text-purple-400 bg-purple-400/10 border-purple-400/30",
    date: "2h ago"
  },
  {
    id: "INQ-9804",
    company: "Quantum Freight Logistics",
    industry: "Global Supply Chain",
    contact: "Siddharth Mehta (Director of Product)",
    service: "Next-Gen Autonomous Routing Engine",
    budget: "$200,000 - $350,000",
    score: 94,
    status: "Contract Signed",
    statusColor: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
    date: "4h ago"
  },
  {
    id: "INQ-9805",
    company: "Solaria Clean Energy",
    industry: "Renewable Energy",
    contact: "Chloe Dupont (VP Strategy)",
    service: "IoT Predictive Maintenance Portal",
    budget: "$80,000 - $120,000",
    score: 87,
    status: "Discovery Call",
    statusColor: "text-blue-400 bg-blue-400/10 border-blue-400/30",
    date: "7h ago"
  }
];

const INITIAL_LOGS = [
  {
    id: "log-1",
    time: "21:24:18",
    category: "DATABASE",
    message: "MongoDB: `visitor_logs.insertOne()` - session hash recorded",
    latency: "8ms",
    status: "SUCCESS"
  },
  {
    id: "log-2",
    time: "21:23:45",
    category: "SECURITY",
    message: "WAF Rate Limiter: blocked 240 requests from botnet subnet 185.12.x.x",
    latency: "1ms",
    status: "BLOCKED"
  },
  {
    id: "log-3",
    time: "21:21:02",
    category: "CRM",
    message: "Incoming RFP stored: `inquiries.insertOne({ id: 'INQ-9801' })`",
    latency: "14ms",
    status: "SUCCESS"
  },
  {
    id: "log-4",
    time: "21:18:30",
    category: "API",
    message: "Elysia /health probe checked: memory 42MB, event-loop lag 0.4ms",
    latency: "2ms",
    status: "HEALTHY"
  },
  {
    id: "log-5",
    time: "21:14:11",
    category: "COMPLIANCE",
    message: "GDPR Consent Token verified & stored for client region EU-DE",
    latency: "5ms",
    status: "SUCCESS"
  }
];

const GEO_REGIONS = [
  { region: "North America", percentage: 46, visitors: "222.1k", color: "bg-cyan-400" },
  { region: "Europe & UK", percentage: 31, visitors: "149.7k", color: "bg-purple-500" },
  { region: "Asia Pacific (APAC)", percentage: 17, visitors: "82.0k", color: "bg-blue-400" },
  { region: "Latin America & Others", percentage: 6, visitors: "29.1k", color: "bg-pink-500" }
];

export default function EnterpriseDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [timeframe, setTimeframe] = useState("30d");
  const [kpis, setKpis] = useState(INITIAL_KPIS);
  const [inquiries, setInquiries] = useState(INITIAL_INQUIRIES);
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [logFilter, setLogFilter] = useState("ALL");
  const [isSimulating, setIsSimulating] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [lastSynced, setLastSynced] = useState("Just now");

  // Filtered Inquiries
  const filteredInquiries = useMemo(() => {
    return inquiries.filter((inq) => {
      const matchesSearch =
        inq.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inq.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inq.contact.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        selectedStatus === "ALL" || inq.status.toLowerCase() === selectedStatus.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [inquiries, searchQuery, selectedStatus]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    if (logFilter === "ALL") return logs;
    return logs.filter((log) => log.category === logFilter);
  }, [logs, logFilter]);

  // Simulate real-time live event function
  const handleSimulateEvent = () => {
    setIsSimulating(true);

    setTimeout(() => {
      // 1. Increment visitor count
      setKpis((prev) => ({
        ...prev,
        totalVisitors: prev.totalVisitors + 1,
        pageViews: prev.pageViews + 3
      }));

      // 2. Add an audit log
      const now = new Date();
      const timeStr = now.toTimeString().split(" ")[0];
      const sampleEvents = [
        {
          category: "DATABASE",
          message: `visitor_logs.insertOne({ timestamp: "${now.toISOString()}", ip: "108.45.***" })`,
          status: "SUCCESS"
        },
        {
          category: "CRM",
          message: "New enterprise brochure download: `Applied-AI-Enterprise-Framework.pdf`",
          status: "SUCCESS"
        },
        {
          category: "SECURITY",
          message: "Zero-Trust TLS 1.3 handshake verified for enterprise SSO endpoint",
          status: "HEALTHY"
        }
      ];
      const randomEvent = sampleEvents[Math.floor(Math.random() * sampleEvents.length)];

      const newLog = {
        id: "log-" + Date.now(),
        time: timeStr,
        category: randomEvent.category,
        message: randomEvent.message,
        latency: `${Math.floor(Math.random() * 8) + 4}ms`,
        status: randomEvent.status
      };

      setLogs((prev) => [newLog, ...prev.slice(0, 14)]);
      setLastSynced("Just now");
      setIsSimulating(false);
    }, 400);
  };

  // SVG Chart Generator Helpers
  const activeChartData = CHART_DATA_SETS[timeframe];
  const maxVisitors = Math.max(...activeChartData.map((d) => d.visitors)) * 1.25;

  const chartPoints = useMemo(() => {
    const width = 800;
    const height = 240;
    const stepX = width / (activeChartData.length - 1);

    return activeChartData.map((item, index) => {
      const x = index * stepX;
      const y = height - (item.visitors / maxVisitors) * height;
      return { x, y, ...item };
    });
  }, [activeChartData, maxVisitors]);

  // SVG Bézier Path
  const svgPath = useMemo(() => {
    if (!chartPoints.length) return "";
    let d = `M ${chartPoints[0].x} ${chartPoints[0].y}`;
    for (let i = 0; i < chartPoints.length - 1; i++) {
      const current = chartPoints[i];
      const next = chartPoints[i + 1];
      const controlX = (current.x + next.x) / 2;
      d += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
    }
    return d;
  }, [chartPoints]);

  const svgAreaPath = useMemo(() => {
    if (!chartPoints.length) return "";
    const width = 800;
    const height = 240;
    return `${svgPath} L ${width} ${height} L 0 ${height} Z`;
  }, [svgPath, chartPoints]);

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* ========================================================= */}
      {/* TOP ENTERPRISE HEADER                                    */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-50 bg-[#070b14]/90 backdrop-blur-xl border-b border-slate-800/80 px-4 md:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Left: Brand & Telemetry Badge */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-600/30 border border-cyan-500/40 p-1 flex items-center justify-center shadow-glow-cyan transition-transform group-hover:scale-105">
              <Image
                src="/images/branding/Logo/Olentra-Logo-Without-Background.png"
                alt="Olentra Logo"
                width={24}
                height={24}
                className="object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black tracking-wider text-sm uppercase text-white font-sans">
                  OLENTRA <span className="text-cyan-400">CORE</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/50">
                  ENTERPRISE
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide">
                Global Operations & Telemetry Dashboard
              </p>
            </div>
          </Link>

          {/* Quick link back to public site */}
          <Link
            href="/"
            className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors px-2.5 py-1 rounded-md border border-slate-800 hover:border-cyan-500/30 bg-slate-900/60"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Public Site</span>
          </Link>
        </div>

        {/* Center: Live Sync & Environment Status */}
        <div className="hidden xl:flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0b121e] border border-slate-800">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-slate-300 font-medium">Cluster: US-East-1 (Primary)</span>
            <span className="text-slate-600">|</span>
            <span className="text-cyan-400 font-mono text-[11px]">{kpis.apiLatency} ping</span>
          </div>

          <div className="flex items-center gap-2 text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Synced: <strong className="text-slate-200">{lastSynced}</strong></span>
          </div>
        </div>

        {/* Right: Controls & Actions */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          {/* Real-time simulation trigger button */}
          <button
            onClick={handleSimulateEvent}
            disabled={isSimulating}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-gradient-to-r from-cyan-500/20 to-purple-600/20 hover:from-cyan-500/30 hover:to-purple-600/30 border border-cyan-500/40 text-cyan-300 transition-all shadow-glow-cyan active:scale-95 disabled:opacity-50"
            title="Simulate live traffic hit and MongoDB write"
          >
            <Zap className={`w-3.5 h-3.5 ${isSimulating ? "animate-spin text-cyan-400" : ""}`} />
            <span className="hidden sm:inline">Simulate Live Hit</span>
          </button>

          {/* Timeframe pill switcher */}
          <div className="flex items-center bg-[#090d18] p-0.5 rounded-lg border border-slate-800">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.id}
                onClick={() => setTimeframe(tf.id)}
                className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-md transition-all ${
                  timeframe === tf.id
                    ? "bg-cyan-500 text-slate-950 shadow-md font-bold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Export Report */}
          <button
            onClick={() => alert("Report exported: Olentra-Executive-Telemetry-Q4.csv")}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Export CSV Telemetry"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Notification Indicator */}
          <div className="relative">
            <button
              onClick={() => setNotificationOpen(!notificationOpen)}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors relative"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-pink-500 shadow-glow-pink" />
            </button>

            {notificationOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl bg-[#0b111e] border border-slate-800 shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                  <span className="text-xs font-bold uppercase text-slate-300 tracking-wider">Alerts</span>
                  <span className="text-[10px] text-cyan-400 font-mono">2 NEW</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-2 rounded-lg bg-cyan-950/30 border border-cyan-800/40">
                    <p className="font-semibold text-cyan-300">High-Ticket RFP Inbound</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Vanguard Health submitted proposal request for $300k+ cloud modernization.</p>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-800/40">
                    <p className="font-semibold text-emerald-300">Security Audit Clean</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Automated penetration scan completed with 0 high-severity findings.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Admin Avatar */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-cyan-400 p-[1px]">
              <div className="w-full h-full rounded-full bg-[#0a0f1d] flex items-center justify-center text-xs font-bold text-cyan-300">
                SC
              </div>
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-bold text-slate-200 leading-tight">Sarah Chen</p>
              <p className="text-[10px] text-cyan-400 font-medium">VP Technology</p>
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* NAVIGATION TABS                                           */}
      {/* ========================================================= */}
      <div className="border-b border-slate-800/80 bg-[#070b14]/50 px-4 md:px-8">
        <div className="flex items-center gap-1 md:gap-6 overflow-x-auto py-2 scrollbar-none">
          {[
            { id: "overview", label: "Executive Overview", icon: Activity },
            { id: "traffic", label: "Visitor & Traffic Intelligence", icon: Users },
            { id: "crm", label: "Inquiries & RFP Pipeline", icon: Building2 },
            { id: "security", label: "Security & MongoDB Audit Stream", icon: ShieldCheck }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all whitespace-nowrap relative ${
                  isActive
                    ? "text-cyan-400 bg-cyan-950/30 border border-cyan-800/40 shadow-glow-cyan"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-slate-500"}`} />
                <span>{tab.label}</span>
                {tab.id === "crm" && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                    {inquiries.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* MAIN DASHBOARD CONTENT AREA                               */}
      {/* ========================================================= */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">

        {/* --------------------------------------------------------- */}
        {/* ROW 1: 4 EXECUTIVE KPI CARDS                              */}
        {/* --------------------------------------------------------- */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* KPI 1: Unique Visitors */}
          <div className="relative group rounded-xl bg-[#090e1a]/80 backdrop-blur-md border border-slate-800/80 p-5 hover:border-cyan-500/40 transition-all duration-300 shadow-xl overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-cyan-500/10 transition-colors" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Total Web Visitors
              </span>
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl md:text-3xl font-black font-mono tracking-tight text-white">
                {kpis.totalVisitors.toLocaleString()}
              </h3>
              <span className="inline-flex items-center text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-1.5 py-0.5 rounded">
                <ArrowUpRight className="w-3 h-3 mr-0.5" />
                {kpis.visitorsChange}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/60 pt-2.5">
              <span>Pageviews: <strong className="text-slate-200">{(kpis.pageViews / 1000000).toFixed(2)}M</strong></span>
              <span className="text-cyan-400 font-mono">3.82 pages/session</span>
            </div>
          </div>

          {/* KPI 2: Active RFPs & Pipeline */}
          <div className="relative group rounded-xl bg-[#090e1a]/80 backdrop-blur-md border border-slate-800/80 p-5 hover:border-purple-500/40 transition-all duration-300 shadow-xl overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-purple-500/10 transition-colors" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Active B2B Pipeline
              </span>
              <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl md:text-3xl font-black font-mono tracking-tight text-white">
                {kpis.pipelineValue}
              </h3>
              <span className="inline-flex items-center text-xs font-semibold text-purple-400 bg-purple-950/60 border border-purple-800/50 px-1.5 py-0.5 rounded">
                <ArrowUpRight className="w-3 h-3 mr-0.5" />
                {kpis.pipelineChange}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/60 pt-2.5">
              <span>Inquiries: <strong className="text-slate-200">{kpis.activeInquiries} active</strong></span>
              <span className="text-purple-400 font-mono">Conv: {kpis.conversionRate}</span>
            </div>
          </div>

          {/* KPI 3: Enterprise Accounts & Retention */}
          <div className="relative group rounded-xl bg-[#090e1a]/80 backdrop-blur-md border border-slate-800/80 p-5 hover:border-blue-500/40 transition-all duration-300 shadow-xl overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/10 transition-colors" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Client SLA & Retention
              </span>
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl md:text-3xl font-black font-mono tracking-tight text-white">
                {kpis.clientRetention}
              </h3>
              <span className="inline-flex items-center text-xs font-semibold text-blue-400 bg-blue-950/60 border border-blue-800/50 px-1.5 py-0.5 rounded">
                NDR 128%
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/60 pt-2.5">
              <span>Enterprise Accounts: <strong className="text-slate-200">{kpis.activeClients} Active</strong></span>
              <span className="text-blue-400 font-mono">SOC 2 / ISO Valid</span>
            </div>
          </div>

          {/* KPI 4: Infrastructure & SLA Availability */}
          <div className="relative group rounded-xl bg-[#090e1a]/80 backdrop-blur-md border border-slate-800/80 p-5 hover:border-emerald-500/40 transition-all duration-300 shadow-xl overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                System Availability
              </span>
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Server className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl md:text-3xl font-black font-mono tracking-tight text-white">
                {kpis.systemUptime}
              </h3>
              <span className="inline-flex items-center text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-1.5 py-0.5 rounded">
                HEALTHY
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/60 pt-2.5">
              <span>Avg Latency: <strong className="text-slate-200">{kpis.apiLatency}</strong></span>
              <span className="text-emerald-400 font-mono">0 P1 Incidents</span>
            </div>
          </div>

        </section>

        {/* --------------------------------------------------------- */}
        {/* ROW 2: MAIN TELEMETRY CHART & GEO TRAFFIC INTELLIGENCE    */}
        {/* --------------------------------------------------------- */}
        {(activeTab === "overview" || activeTab === "traffic") && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2 Cols: Interactive Telemetry SVG Chart */}
            <div className="lg:col-span-2 rounded-xl bg-[#090e1a]/80 backdrop-blur-md border border-slate-800/80 p-6 shadow-2xl flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white tracking-wide">
                        Enterprise Traffic & Telemetry Curves
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-mono">
                        MongoDB Live Stream
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Tracking unique corporate visitor sessions vs total interactive pageviews
                    </p>
                  </div>

                  {/* Chart Legend */}
                  <div className="flex items-center gap-4 text-xs font-medium">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-glow-cyan" />
                      <span className="text-slate-300">Unique Visitors</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-purple-500 shadow-glow-purple" />
                      <span className="text-slate-300">Page Interactions</span>
                    </div>
                  </div>
                </div>

                {/* SVG Visual Area Chart */}
                <div className="relative w-full h-64 overflow-hidden rounded-lg bg-[#070b14]/70 border border-slate-800/60 p-2 flex items-center justify-center">
                  <svg
                    viewBox="0 0 800 240"
                    className="w-full h-full overflow-visible"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      {/* Cyan Area Gradient */}
                      <linearGradient id="cyanGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.0" />
                      </linearGradient>

                      {/* Purple Line Gradient */}
                      <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8a2be2" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#8a2be2" stopOpacity="0.0" />
                      </linearGradient>

                      {/* Filter for glowing curves */}
                      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#00f0ff" floodOpacity="0.8" />
                      </filter>
                    </defs>

                    {/* Horizontal Gridlines */}
                    {[0.2, 0.4, 0.6, 0.8].map((ratio, i) => (
                      <line
                        key={i}
                        x1="0"
                        y1={240 * ratio}
                        x2="800"
                        y2={240 * ratio}
                        stroke="#1e293b"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />
                    ))}

                    {/* Gradient Area Fill */}
                    <path d={svgAreaPath} fill="url(#cyanGradient)" />

                    {/* Spline Bézier Curve */}
                    <path
                      d={svgPath}
                      fill="none"
                      stroke="#00f0ff"
                      strokeWidth="3"
                      filter="url(#glow)"
                      className="transition-all duration-700 ease-out"
                    />

                    {/* Interactive Points */}
                    {chartPoints.map((pt, idx) => (
                      <g key={idx}>
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="5"
                          fill="#050811"
                          stroke="#00f0ff"
                          strokeWidth="2.5"
                          className="cursor-pointer hover:r-7 transition-all duration-200"
                          onMouseEnter={() => setHoveredPoint(pt)}
                          onMouseLeave={() => setHoveredPoint(null)}
                        />
                      </g>
                    ))}
                  </svg>

                  {/* Interactive Tooltip on Point Hover */}
                  {hoveredPoint && (
                    <div
                      className="absolute z-20 pointer-events-none rounded-lg bg-[#0b1220] border border-cyan-500/40 px-3 py-2 text-xs shadow-2xl"
                      style={{
                        top: Math.max(10, hoveredPoint.y - 65),
                        left: Math.min(650, Math.max(20, hoveredPoint.x - 40))
                      }}
                    >
                      <p className="font-bold text-white text-[11px] mb-1">{hoveredPoint.label}</p>
                      <p className="text-cyan-400 font-mono">
                        Visitors: <strong>{hoveredPoint.visitors.toLocaleString()}</strong>
                      </p>
                      <p className="text-purple-400 font-mono">
                        Pageviews: <strong>{hoveredPoint.pageViews.toLocaleString()}</strong>
                      </p>
                    </div>
                  )}
                </div>

                {/* X-Axis labels */}
                <div className="flex justify-between items-center px-2 mt-3 text-[11px] text-slate-500 font-mono">
                  {activeChartData.map((d, i) => (
                    <span key={i}>{d.label}</span>
                  ))}
                </div>
              </div>

              {/* Bottom stats row */}
              <div className="grid grid-cols-3 gap-3 border-t border-slate-800/80 pt-4 mt-6 text-xs">
                <div>
                  <span className="text-slate-400">Peak Traffic Window:</span>
                  <p className="font-bold text-slate-200 font-mono mt-0.5">14:00 - 18:00 EST</p>
                </div>
                <div>
                  <span className="text-slate-400">Top Acquisition Channel:</span>
                  <p className="font-bold text-cyan-400 mt-0.5">LinkedIn Enterprise (44%)</p>
                </div>
                <div>
                  <span className="text-slate-400">Avg Enterprise Dwell:</span>
                  <p className="font-bold text-purple-400 font-mono mt-0.5">4m 18s</p>
                </div>
              </div>
            </div>

            {/* Right 1 Col: Global Geo Distribution & Enterprise Nodes */}
            <div className="rounded-xl bg-[#090e1a]/80 backdrop-blur-md border border-slate-800/80 p-6 shadow-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-white tracking-wide">
                      Global Client Origin
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Geo-resolved enterprise visitor density
                    </p>
                  </div>
                  <Globe className="w-5 h-5 text-cyan-400" />
                </div>

                {/* Stylized World Radar Mockup */}
                <div className="relative w-full h-36 rounded-lg bg-[#070b14] border border-slate-800/60 overflow-hidden flex items-center justify-center p-3 mb-5">
                  <div className="absolute inset-0 bg-cyber-grid opacity-30" />
                  
                  {/* Glowing Pulse Nodes for Top Cities */}
                  {[
                    { top: "35%", left: "25%", city: "San Francisco", color: "bg-cyan-400" },
                    { top: "40%", left: "33%", city: "New York", color: "bg-cyan-400" },
                    { top: "30%", left: "50%", city: "London", color: "bg-purple-400" },
                    { top: "32%", left: "55%", city: "Frankfurt", color: "bg-purple-400" },
                    { top: "48%", left: "75%", city: "Singapore", color: "bg-ice" },
                    { top: "38%", left: "82%", city: "Tokyo", color: "bg-pink-400" }
                  ].map((node, i) => (
                    <div
                      key={i}
                      className="absolute group/node cursor-pointer"
                      style={{ top: node.top, left: node.left }}
                    >
                      <span className={`animate-ping absolute inline-flex h-3 w-3 rounded-full ${node.color} opacity-75`} />
                      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${node.color}`} />
                      <span className="hidden group-hover/node:block absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded text-[10px] text-white whitespace-nowrap z-30">
                        {node.city}
                      </span>
                    </div>
                  ))}

                  <div className="relative z-10 text-center">
                    <p className="text-[11px] text-slate-400 font-mono uppercase tracking-widest">
                      ACTIVE EDGE NODES
                    </p>
                    <p className="text-lg font-black text-white font-mono mt-0.5">
                      6 GLOBAL REGIONS
                    </p>
                  </div>
                </div>

                {/* Regional Progress Breakdown */}
                <div className="space-y-3">
                  {GEO_REGIONS.map((geo, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-300 font-medium">{geo.region}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-mono">{geo.visitors}</span>
                          <span className="text-white font-bold font-mono">{geo.percentage}%</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${geo.color}`}
                          style={{ width: `${geo.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Data privacy: <strong className="text-emerald-400">GDPR Compliant</strong></span>
                <span className="text-cyan-400 font-mono">GeoIP DB v2026.10</span>
              </div>
            </div>

          </section>
        )}

        {/* --------------------------------------------------------- */}
        {/* ROW 3: ENTERPRISE RFP & INQUIRY PIPELINE TABLE            */}
        {/* --------------------------------------------------------- */}
        {(activeTab === "overview" || activeTab === "crm") && (
          <section className="rounded-xl bg-[#090e1a]/80 backdrop-blur-md border border-slate-800/80 p-6 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white tracking-wide">
                    Enterprise Inquiries & RFP Pipeline
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800/60 font-mono">
                    Collection: `inquiries`
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  High-ticket enterprise service requests captured from public contact forms and marketing gates
                </p>
              </div>

              {/* Search and Filters */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search company or capability..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-[#070b14] border border-slate-800 focus:border-cyan-500 focus:outline-none text-white w-48 sm:w-64 placeholder:text-slate-600 transition-colors"
                  />
                </div>

                <div className="flex items-center bg-[#070b14] border border-slate-800 rounded-lg p-0.5">
                  {["ALL", "Under Review", "Proposal Sent", "Contract Signed"].map((status) => (
                    <button
                      key={status}
                      onClick={() => setSelectedStatus(status)}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-all ${
                        selectedStatus === status
                          ? "bg-purple-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-800/80">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#070b14]/90 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                    <th className="py-3 px-4">Company & Stakeholder</th>
                    <th className="py-3 px-4">Service Capability</th>
                    <th className="py-3 px-4">Est. Budget</th>
                    <th className="py-3 px-4">Lead Score</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs font-medium">
                  {filteredInquiries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No inquiries match the current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredInquiries.map((inq) => (
                      <tr key={inq.id} className="hover:bg-slate-900/40 transition-colors group">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-xs font-bold text-cyan-300">
                              {inq.company.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-white group-hover:text-cyan-400 transition-colors">
                                {inq.company}
                              </p>
                              <p className="text-[11px] text-slate-400">{inq.contact}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="text-slate-300 font-medium">{inq.service}</span>
                          <span className="block text-[10px] text-slate-500">{inq.industry}</span>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-semibold text-emerald-400">
                          {inq.budget}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full"
                                style={{ width: `${inq.score}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px] font-bold text-slate-300">
                              {inq.score}/100
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${inq.statusColor}`}>
                            {inq.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => alert(`Reviewing proposal for ${inq.company}`)}
                            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold px-2.5 py-1 rounded-md border border-cyan-800/40 hover:border-cyan-500/60 bg-cyan-950/30 transition-all"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
              <span>Showing {filteredInquiries.length} of {inquiries.length} enterprise opportunities</span>
              <span className="font-mono text-cyan-400">Total Pipeline Value: $8,650,000 USD</span>
            </div>
          </section>
        )}

        {/* --------------------------------------------------------- */}
        {/* ROW 4: MONGODB AUDIT STREAM & BACKEND TELEMETRY TERMINAL   */}
        {/* --------------------------------------------------------- */}
        {(activeTab === "overview" || activeTab === "security") && (
          <section className="rounded-xl bg-[#090e1a]/80 backdrop-blur-md border border-slate-800/80 p-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-base font-bold text-white tracking-wide">
                    Live MongoDB & Backend Audit Stream
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-mono">
                    REALTIME
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Immutable event audit log capturing database writes, rate-limit enforcement, and security policies
                </p>
              </div>

              {/* Log filter pills */}
              <div className="flex items-center gap-1.5 bg-[#070b14] border border-slate-800 p-0.5 rounded-lg">
                {["ALL", "DATABASE", "SECURITY", "CRM", "API"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setLogFilter(cat)}
                    className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${
                      logFilter === cat
                        ? "bg-slate-800 text-cyan-400"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Terminal Window */}
            <div className="w-full rounded-lg bg-[#04060c] border border-slate-800 p-4 font-mono text-xs text-slate-300 space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
              {filteredLogs.map((log) => (
                <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-900/60 hover:bg-slate-900/30 px-1 rounded transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="text-slate-600">[{log.time}]</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        log.category === "DATABASE"
                          ? "bg-cyan-950 text-cyan-300 border border-cyan-800/40"
                          : log.category === "SECURITY"
                          ? "bg-amber-950 text-amber-300 border border-amber-800/40"
                          : log.category === "CRM"
                          ? "bg-purple-950 text-purple-300 border border-purple-800/40"
                          : "bg-emerald-950 text-emerald-300 border border-emerald-800/40"
                      }`}
                    >
                      {log.category}
                    </span>
                    <span className="text-slate-200">{log.message}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="text-cyan-400">{log.latency}</span>
                    <span className={`text-[10px] font-bold ${log.status === "BLOCKED" ? "text-amber-400" : "text-emerald-400"}`}>
                      {log.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Audit retention policy: 365 Days (WORM Storage)</span>
              <span className="text-emerald-400">Stream connected via WebSocket • Bun/Elysia</span>
            </div>
          </section>
        )}

      </main>

      {/* ========================================================= */}
      {/* ENTERPRISE FOOTER                                         */}
      {/* ========================================================= */}
      <footer className="border-t border-slate-800/80 bg-[#070b14] py-4 px-4 md:px-8 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400" />
          <span>Olentra Enterprise Operations Console</span>
          <span>•</span>
          <span className="font-mono text-slate-400">v2.4.0-prod</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <Link href="/" className="hover:text-cyan-400 transition-colors">Home</Link>
          <Link href="/services" className="hover:text-cyan-400 transition-colors">Services</Link>
          <Link href="/about" className="hover:text-cyan-400 transition-colors">About</Link>
          <Link href="/security" className="hover:text-cyan-400 transition-colors">Security Whitepaper</Link>
        </div>
      </footer>

    </div>
  );
}
