"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  ArrowUpRight,
  ShieldCheck,
  Layers,
  Cpu,
  Sparkles,
  Terminal,
  Database,
  Cloud,
  Activity,
  Lock
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ContactForm from "@/components/ContactForm";
import { olentraAiStudio } from "@/data/olentra_ai_studio";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 }
};

const staggerContainer = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: true },
  transition: { staggerChildren: 0.1 }
};

export default function OlentraAIStudioPage() {
  const { hero, overview, features, techStack, platforms, aiPipeline, microservices, security, pricing, roadmap } = olentraAiStudio;

  return (
    <main className="relative bg-[#020617] text-white font-sans selection:bg-primary/30 selection:text-white">
      <Navbar />

      {/* --- 1. HERO (DARK / SPLIT) --- */}
      <section className="relative min-h-[90vh] mt-16 sm:mt-20 overflow-hidden bg-[#020617] flex items-center">
        {/* Immersive Background */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/backgrounds/cyber-bg.png"
            alt="Product Background"
            fill
            priority
            className="object-cover opacity-20 filter grayscale"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#020617] via-transparent to-[#020617]" />
          <div className="absolute inset-0 bg-[url('/images/ui/grid.svg')] opacity-[0.05] pointer-events-none" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 w-full pt-12 sm:pt-16 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.9fr] gap-12 lg:gap-20 items-center">

            {/* TEXT SECTION (LEFT ON DESKTOP) */}
            <div className="order-1 lg:order-1 space-y-10 lg:pr-4 text-left">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="inline-flex items-center gap-3 py-1.5 px-4 rounded-full border border-primary/30 bg-primary/5 backdrop-blur-sm shadow-[0_0_15px_rgba(37,99,235,0.15)] w-fit"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">AI STUDIO</span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="space-y-6"
              >
                <h1 className="text-[clamp(2.5rem,7vw,5rem)] font-[900] uppercase tracking-tighter leading-[0.9] text-white italic drop-shadow-2xl">
                  {hero.title.split(' ').map((word, i) => (
                    <span key={i} className={i === 1 ? 'text-primary' : ''}>{word} </span>
                  ))}
                </h1>

                <div className="relative inline-block mt-4">
                  <p className="text-[1.1rem] md:text-[1.4rem] font-bold text-slate-100 uppercase tracking-tight leading-tight max-w-xl">
                    {hero.tagline}
                  </p>
                  <div className="absolute -bottom-4 left-0 w-24 h-[1px] bg-primary/40" />
                </div>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.4 }}
                className="text-[0.98rem] md:text-[1.1rem] text-slate-400 font-medium leading-relaxed max-w-xl"
              >
                {hero.subheading}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto"
              >
                <a
                  href={hero.primaryCta.href}
                  className="group relative inline-flex items-center justify-center gap-3 px-10 py-4 text-[12px] font-black uppercase tracking-[0.25em] bg-primary text-white transition-all hover:bg-blue-700 shadow-[0_0_30px_rgba(37,99,235,0.3)]"
                  style={{ clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%)" }}
                >
                  <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                  {hero.primaryCta.label}
                </a>
                <a
                  href={hero.secondaryCta.href}
                  className="group relative inline-flex items-center justify-center gap-3 px-10 py-4 text-[12px] font-black uppercase tracking-[0.25em] border border-white/20 bg-white/5 text-slate-100 backdrop-blur-md transition-all hover:border-primary/60 hover:bg-white/10"
                  style={{ clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%)" }}
                >
                  {hero.secondaryCta.label}
                  <ArrowUpRight className="w-4 h-4 text-primary transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                </a>
              </motion.div>
            </div>

            {/* IMAGE SECTION (RIGHT ON DESKTOP) */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="order-2 lg:order-2 relative group md:px-4"
            >
              <div className="absolute -inset-10 bg-primary/20 blur-[120px] rounded-full opacity-40 animate-pulse pointer-events-none" />

              <div
                className="relative bg-[#0a0f1e] border border-white/10 p-1.5 shadow-[0_40px_100px_rgba(2,6,23,0.8)] backdrop-blur-3xl overflow-hidden"
                style={{ clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)" }}
              >
                {/* Custom Window Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500/40" />
                    <div className="w-2 h-2 rounded-full bg-amber-500/40" />
                    <div className="w-2 h-2 rounded-full bg-emerald-500/40" />
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 flex items-center gap-2">
                    <Terminal size={10} className="text-primary" />
                    STUDIO_CORE_OS
                  </div>
                </div>

                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={hero.heroImage}
                    alt="Product UI Preview"
                    width={1200}
                    height={900}
                    className="w-full h-full object-cover grayscale-[0.2] contrast-125 group-hover:grayscale-0 group-hover:scale-[1.02] transition-all duration-1000"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_2px,3px_100%] pointer-events-none opacity-40" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1e] via-transparent to-transparent opacity-60" />
                </div>

                <div className="absolute bottom-10 right-0 left-0 px-6 flex justify-between items-end">
                  <div className="bg-primary/90 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 shadow-2xl">
                    Live Orchestration
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="h-1 w-12 bg-white/10" />
                    <div className="h-1 w-8 bg-white/10" />
                  </div>
                </div>
              </div>
              <div className="absolute -top-4 -left-4 w-12 h-12 border-t-2 border-l-2 border-primary/40 pointer-events-none" />
              <div className="absolute -bottom-4 -right-4 w-12 h-12 border-b-2 border-r-2 border-primary/40 pointer-events-none" />
            </motion.div>

          </div>
        </div>
      </section>

      {/* --- 2. OVERVIEW (WHITE) --- */}
      <section className="relative py-24 md:py-32 bg-white text-slate-900" id="overview">
        <div className="absolute inset-0 bg-cyber-grid-light opacity-[0.05] pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 md:px-12 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-16 items-center">
            <motion.div {...fadeInUp} className="space-y-6">
              <div className="flex items-center gap-3">
                <span className="w-8 h-px bg-primary/40" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Operational Core</p>
              </div>
              <h2 className="text-4xl md:text-5xl font-[900] uppercase leading-[0.9] tracking-tighter text-slate-900">
                Built for <span className="text-primary italic">Serious Production</span>
              </h2>
              <p className="text-slate-600 text-lg leading-relaxed font-medium">
                {overview.summary}
              </p>
              <div className="grid grid-cols-2 gap-x-12 gap-y-8 pt-6">
                {[
                  { label: 'Uptime Guarantee', value: '99.99%', icon: Activity },
                  { label: 'Latency', value: '< 150ms', icon: Cpu },
                  { label: 'Security Level', value: 'Level 4', icon: Lock },
                  { label: 'Deployment', value: 'Multi-Cloud', icon: Cloud },
                ].map((stat, i) => (
                  <div key={i} className="space-y-2 group">
                    <stat.icon className="w-5 h-5 text-primary/40 transition-transform group-hover:scale-110" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:text-primary transition-colors">{stat.label}</p>
                    <p className="text-xl font-black text-slate-900">{stat.value}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              {...staggerContainer}
              className="grid grid-cols-1 sm:grid-cols-2 gap-5"
            >
              {overview.attributes.map((item, idx) => (
                <motion.div
                  key={item.label}
                  variants={fadeInUp}
                  className="group relative h-full rounded-2xl border border-slate-100 bg-slate-50/50 p-8 transition-all hover:bg-white hover:border-primary/40 hover:shadow-xl hover:shadow-slate-200/50"
                  style={{ clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)" }}
                >
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 group-hover:text-primary transition-colors">{item.label}</div>
                  <div className="text-[15px] font-[800] text-slate-800 mt-3 leading-relaxed uppercase tracking-tight italic">{item.value}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* --- 3. FEATURES (DARK) --- */}
      <section className="relative py-24 md:py-32 bg-[#020617]" id="features">
        <div className="absolute inset-0 bg-[url('/images/ui/grid.svg')] opacity-[0.06] pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 md:px-12 relative">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-8 h-px bg-primary/60" />
                <p className="text-[10px] uppercase tracking-[0.4em] text-primary font-black">Capabilities</p>
              </div>
              <h2 className="text-4xl md:text-5xl font-black uppercase leading-[0.9] tracking-tighter">
                Autonomous <br /> <span className="text-primary italic">Intelligence</span>
              </h2>
            </div>
            <p className="max-w-sm text-slate-400 text-sm font-medium border-l border-primary/30 pl-6 uppercase tracking-wider leading-relaxed">
              Next-generation multi-agent systems designed to scale horizontal complexity without adding vertical friction.
            </p>
          </div>

          <motion.div
            {...staggerContainer}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {features.map((item, idx) => (
              <motion.div
                key={item.title}
                variants={fadeInUp}
                className="group relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/20 p-8 hover:border-primary/40 transition-all duration-500"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-primary/15 transition-colors" />
                <div className="relative z-10 space-y-6">
                  <div className="p-3 w-fit rounded-xl bg-primary/10 text-primary border border-primary/20">
                    {idx === 0 ? <Sparkles size={20} /> : idx === 1 ? <Terminal size={20} /> : <Database size={20} />}
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-white group-hover:text-primary transition-colors">{item.title}</h3>
                  <p className="text-[14px] text-slate-400 leading-relaxed font-medium uppercase tracking-tight">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* --- 4. ARCHITECTURE (WHITE) --- */}
      <section className="relative py-24 md:py-32 bg-white text-slate-900" id="architecture">
        <div className="absolute inset-0 bg-cyber-grid-light opacity-[0.05] pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 md:px-12 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-16 items-start">
            <motion.div {...fadeInUp} className="space-y-8">
              <div className="flex items-center gap-3">
                <span className="w-8 h-px bg-primary/40" />
                <p className="text-[10px] uppercase tracking-[0.4em] text-primary font-black">Workflow Matrix</p>
              </div>
              <h2 className="text-4xl md:text-5xl font-[950] uppercase leading-[0.9] tracking-tighter text-slate-900">
                System <br /> <span className="text-primary italic">Architecture</span>
              </h2>

              <div className="space-y-4 pt-4">
                {aiPipeline.map((stage, idx) => (
                  <div key={stage.stage} className="relative group">
                    <div className="flex items-start gap-6 p-6 rounded-2xl border border-slate-100 bg-slate-50/30 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-black text-sm">
                        0{idx + 1}
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] font-black uppercase tracking-widest text-primary/60">{stage.model}</div>
                        <h4 className="text-lg font-[900] text-slate-900 uppercase italic tracking-tight">{stage.stage}</h4>
                        <div className="text-[13px] text-slate-500 font-bold uppercase tracking-tight leading-none">{stage.output}</div>
                      </div>
                    </div>
                    {idx < aiPipeline.length - 1 && (
                      <div className="absolute left-[33px] top-full w-[2px] h-4 bg-primary/20" />
                    )}
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div {...fadeInUp} className="lg:sticky lg:top-32 space-y-10 pt-12 lg:pt-0">
              <div className="rounded-[2.5rem] bg-slate-950 p-10 shadow-2xl text-white">
                <h3 className="text-xs font-black uppercase tracking-[0.4em] text-primary mb-10 flex items-center gap-3">
                  <Terminal className="w-4 h-4" />
                  Core Infrastructure
                </h3>
                <div className="grid grid-cols-1 gap-6">
                  {microservices.map((service) => (
                    <div key={service} className="flex items-center gap-5 group">
                      <div className="w-2.5 h-[2px] bg-primary group-hover:w-4 transition-all" />
                      <span className="text-sm font-black uppercase tracking-[0.2em] text-slate-300 group-hover:text-white transition-colors">
                        {service}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border-2 border-primary/10 p-8 bg-slate-50">
                <h3 className="text-[13px] font-black uppercase tracking-widest text-slate-900 mb-4">Transmission Security</h3>
                <p className="text-sm text-slate-500 leading-relaxed font-bold uppercase tracking-tight mb-6">
                  SOC-2 Compliance managed via deterministic policy orchestration.
                </p>
                <div className="space-y-3">
                  {security.slice(0, 3).map((item) => (
                    <div key={item.control} className="flex items-center justify-between py-2.5 border-b border-slate-200">
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{item.control}</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* --- 5. TECH STACK (DARK) --- */}
      <section className="relative py-24 md:py-32 bg-[#020617]" id="tech-stack">
        <div className="absolute inset-0 bg-[url('/images/ui/grid.svg')] opacity-[0.05] pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 md:px-12 relative">
          <div className="flex flex-col items-center text-center mb-20">
            <p className="text-primary font-black text-[10px] uppercase tracking-[0.4em] mb-4">Engineering Matrix</p>
            <h2 className="text-[2.6rem] md:text-[4.2rem] font-[950] text-white uppercase tracking-tighter leading-[0.9]">
              The Stack <span className="text-primary italic">Deep Dive</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <StackColumn title="Frontend" icon={<Layers className="w-5 h-5" />} items={techStack.frontend} theme="dark" />
            <StackColumn title="Backend" icon={<Cpu className="w-5 h-5" />} items={techStack.backend} theme="dark" />
            <StackColumn title="Infra" icon={<ShieldCheck className="w-5 h-5" />} items={techStack.infra} theme="dark" />
          </div>
        </div>
      </section>

      {/* --- 6. PRICING (WHITE) --- */}
      <section className="relative py-24 md:py-32 bg-white text-slate-900" id="pricing">
        <div className="absolute inset-0 bg-cyber-grid-light opacity-[0.05] pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 md:px-12 relative z-10">
          <div className="text-center mb-16">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-3">Investment Model</p>
            <h2 className="text-4xl font-[900] uppercase text-slate-900 tracking-tight italic">Tier Logic</h2>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/50 backdrop-blur-xl shadow-2xl shadow-slate-200/40">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="p-8 border-b border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500">Service Identifier</th>
                    {pricing.tiers.map((tier) => (
                      <th key={tier} className="p-8 border-b border-slate-200 text-[15px] font-[950] uppercase tracking-tighter text-primary italic">
                        {tier}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pricing.rows.map((row) => (
                    <tr key={row.label} className="group hover:bg-primary/5 transition-colors">
                      <td className="p-8 border-b border-slate-200 text-sm font-black uppercase tracking-widest text-slate-800 group-hover:text-primary">
                        {row.label}
                      </td>
                      {row.values.map((val, i) => (
                        <td key={i} className="p-8 border-b border-slate-200 text-[13px] font-bold text-slate-500 group-hover:text-slate-900">
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* --- 7. ROADMAP (DARK) --- */}
      <section className="relative py-24 md:py-32 bg-[#020617]" id="roadmap">
        <div className="absolute inset-0 bg-[url('/images/ui/grid.svg')] opacity-[0.04] pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 md:px-12 relative">
          <div className="flex items-center gap-3 mb-16">
            <span className="w-8 h-px bg-primary/60" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Future Pipeline</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {roadmap.map((phase, idx) => (
              <div key={phase.phase} className="group relative">
                <div className="absolute -top-12 left-0 text-7xl font-black text-white/[0.03] group-hover:text-primary/10 transition-colors pointer-events-none">
                  0{idx + 1}
                </div>
                <div className="relative pt-6 space-y-6">
                  <h3 className="text-xl font-black uppercase tracking-tighter text-white border-b-2 border-primary/20 pb-4 italic">
                    {phase.phase}
                  </h3>
                  <ul className="space-y-4">
                    {phase.highlights.map(item => (
                      <li key={item} className="flex gap-4 items-start text-[12px] font-black text-slate-400 leading-relaxed uppercase tracking-widest">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- 8. CTA (PRIMARY/DARK) --- */}
      <section className="relative pt-16 md:pt-20 pb-0 bg-[#020617]" id="contact">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="relative rounded-3xl overflow-hidden bg-primary p-12 md:p-20 text-center shadow-[0_40px_80px_rgba(37,99,235,0.4)]">
            <div className="absolute inset-0 bg-[url('/images/ui/grid.svg')] opacity-10 pointer-events-none" />
            <div className="absolute -top-1/2 -left-1/4 w-[150%] h-[150%] bg-gradient-to-br from-white/10 via-transparent to-transparent rotate-12" />

            <div className="relative z-10 space-y-8 max-w-2xl mx-auto">
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/80">Terminal Connection</p>
              <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-[0.8] text-white">
                Launch Your <br /> <span className="italic">AI Studio</span>
              </h2>
              <p className="text-lg text-white/80 font-bold leading-relaxed uppercase tracking-tight">
                Book a technical demonstration to see the build pipeline, orchestration model, and global security mesh in action.
              </p>
              <div className="pt-6">
                <a
                  href="#form-top"
                  className="inline-flex items-center gap-3 px-10 py-4 text-[13px] font-black uppercase tracking-[0.3em] bg-white text-primary transition-all hover:scale-105 active:scale-95"
                  style={{ clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%)" }}
                >
                  Initialize Demo
                  <ArrowUpRight size={18} />
                </a>
              </div>
            </div>
          </div>

          <div id="form-top" className="mt-10 md:mt-12">
            <ContactForm />
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function StackColumn({ title, icon, items, theme = "dark" }) {
  const isDark = theme === "dark";

  return (
    <div className={`p-10 rounded-[2.5rem] border transition-all hover:-translate-y-2 hover:shadow-2xl flex flex-col ${isDark
      ? "bg-white/[0.02] border-white/5 hover:border-primary/40 text-white"
      : "bg-slate-50 border-slate-100 hover:border-primary/20 text-slate-900 shadow-sm"
      }`}>
      <div className="flex items-center gap-4 mb-10">
        <div className={`p-3 rounded-2xl ${isDark ? "bg-primary/10 text-primary border border-primary/20" : "bg-white border border-slate-200 text-primary shadow-sm"}`}>
          {icon}
        </div>
        <h3 className="text-2xl font-[900] uppercase tracking-tighter leading-none italic">{title}</h3>
      </div>
      <ul className="space-y-6 flex-1">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-4">
            <div className={`w-1.5 h-1.5 rounded-full ${isDark ? "bg-primary" : "bg-slate-900"}`} />
            <span className="text-[14px] font-[900] uppercase tracking-tight leading-none italic">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
