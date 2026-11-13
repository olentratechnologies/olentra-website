"use client";

import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Database,
  MessageSquareShare,
  PhoneCall,
  Radar,
  ShieldCheck,
  Terminal,
  Workflow,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import ProductHero from "@/components/products/ProductHero";
import { olenbot } from "@/data/olenbot";
import { breadcrumbSchema, productSchema } from "@/lib/seo";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const staggerContainer = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: true },
  transition: { staggerChildren: 0.1 },
};

const featureIcons = [
  Radar,
  Workflow,
  PhoneCall,
  MessageSquareShare,
  BrainCircuit,
  Database,
];

export default function OlenbotPage() {
  const { hero, overview, features, pipeline, systems, security, techStack, dashboard, pricing, roadmap } = olenbot;

  return (
    <main className="relative bg-[#020617] text-white font-sans selection:bg-primary/30 selection:text-white">
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Products", path: "/products" },
          { name: "Olenbot", path: "/products/olenbot" },
        ])}
      />
      <JsonLd
        data={productSchema({
          name: "Olenbot",
          description: hero.subheading,
          path: "/products/olenbot",
          image: hero.heroImage,
        })}
      />
      <Navbar />

      <ProductHero product="olenbot" hero={hero} />

      <section className="relative py-24 md:py-32 bg-white text-slate-900" id="overview">
        <div className="absolute inset-0 bg-cyber-grid-light opacity-[0.05] pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 md:px-12 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-16 items-center">
            <motion.div {...fadeInUp} className="space-y-6">
              <div className="flex items-center gap-3">
                <span className="w-8 h-px bg-primary/40" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Outbound Core</p>
              </div>
              <h2 className="text-4xl md:text-5xl font-[900] uppercase leading-[0.9] tracking-tighter text-slate-900">
                Built for <span className="text-primary italic">High-Volume Outreach</span>
              </h2>
              <p className="text-slate-600 text-lg leading-relaxed font-medium">{overview.summary}</p>
              <div className="grid grid-cols-2 gap-x-12 gap-y-8 pt-6">
                {overview.stats.map((stat) => (
                  <div key={stat.label} className="space-y-2 group">
                    <div className="w-5 h-5 text-primary/40 transition-transform group-hover:scale-110">
                      {stat.label.includes("Fit") ? <Workflow className="w-5 h-5" /> : stat.label.includes("Value") ? <Database className="w-5 h-5" /> : stat.label.includes("Benefit") ? <BrainCircuit className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                    </div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:text-primary transition-colors">{stat.label}</p>
                    <p className="text-xl font-black text-slate-900">{stat.value}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div {...staggerContainer} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {overview.attributes.map((item) => (
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
                Conversion <br /> <span className="text-primary italic">Automation Stack</span>
              </h2>
            </div>
            <p className="max-w-sm text-slate-400 text-sm font-medium border-l border-primary/30 pl-6 uppercase tracking-wider leading-relaxed">
              Scraping, calling, follow-up, and analytics run as one coordinated system instead of isolated operator tools.
            </p>
          </div>

          <motion.div {...staggerContainer} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((item, idx) => {
              const Icon = featureIcons[idx] || Bot;

              return (
                <motion.div
                  key={item.title}
                  variants={fadeInUp}
                  className="group relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/20 p-8 hover:border-primary/40 transition-all duration-500"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-primary/15 transition-colors" />
                  <div className="relative z-10 space-y-6">
                    <div className="p-3 w-fit rounded-xl bg-primary/10 text-primary border border-primary/20">
                      <Icon size={20} />
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-tight text-white group-hover:text-primary transition-colors">{item.title}</h3>
                    <p className="text-[14px] text-slate-400 leading-relaxed font-medium uppercase tracking-tight">{item.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      <section className="relative py-24 md:py-32 bg-white text-slate-900" id="architecture">
        <div className="absolute inset-0 bg-cyber-grid-light opacity-[0.05] pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 md:px-12 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-16 items-start">
            <motion.div {...fadeInUp} className="space-y-8">
              <div className="flex items-center gap-3">
                <span className="w-8 h-px bg-primary/40" />
                <p className="text-[10px] uppercase tracking-[0.4em] text-primary font-black">User Journey</p>
              </div>
              <h2 className="text-4xl md:text-5xl font-[950] uppercase leading-[0.9] tracking-tighter text-slate-900">
                How Teams <br /> <span className="text-primary italic">Use Olenbot</span>
              </h2>

              <div className="space-y-4 pt-4">
                {pipeline.map((stage, idx) => (
                  <div key={stage.stage} className="relative group">
                    <div className="flex items-start gap-6 p-6 rounded-2xl border border-slate-100 bg-slate-50/30 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-black text-sm">
                        0{idx + 1}
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-lg font-[900] text-slate-900 uppercase italic tracking-tight">{stage.stage}</h4>
                        <div className="text-[13px] text-slate-500 font-bold uppercase tracking-tight leading-none">{stage.output}</div>
                      </div>
                    </div>
                    {idx < pipeline.length - 1 && <div className="absolute left-[33px] top-full w-[2px] h-4 bg-primary/20" />}
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div {...fadeInUp} className="lg:sticky lg:top-32 space-y-10 pt-12 lg:pt-0">
              <div className="rounded-[2.5rem] bg-slate-950 p-10 shadow-2xl text-white">
                <h3 className="text-xs font-black uppercase tracking-[0.4em] text-primary mb-10 flex items-center gap-3">
                  <Terminal className="w-4 h-4" />
                  Team Outcomes
                </h3>
                <div className="grid grid-cols-1 gap-6">
                  {systems.map((service) => (
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
                <h3 className="text-[13px] font-black uppercase tracking-widest text-slate-900 mb-4">Operational Confidence</h3>
                <p className="text-sm text-slate-500 leading-relaxed font-bold uppercase tracking-tight mb-6">
                  Outreach teams get compliance, control, and auditability without adding more tools to manage.
                </p>
                <div className="space-y-3">
                  {security.slice(0, 4).map((item) => (
                    <div key={item.control} className="flex items-center justify-between py-2.5 border-b border-slate-200">
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{item.control}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="relative py-24 md:py-32 bg-[#020617]" id="tech-stack">
        <div className="absolute inset-0 bg-[url('/images/ui/grid.svg')] opacity-[0.05] pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 md:px-12 relative">
          <div className="flex flex-col items-center text-center mb-20">
            <p className="text-primary font-black text-[10px] uppercase tracking-[0.4em] mb-4">Experience Layers</p>
            <h2 className="text-[2.6rem] md:text-[4.2rem] font-[950] text-white uppercase tracking-tighter leading-[0.9]">
              What The Product <span className="text-primary italic">Handles</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <StackColumn title="Lead Flow" icon={<Radar className="w-5 h-5" />} items={techStack.collection} />
            <StackColumn title="Conversation" icon={<BrainCircuit className="w-5 h-5" />} items={techStack.intelligence} />
            <StackColumn title="Operations" icon={<ShieldCheck className="w-5 h-5" />} items={techStack.delivery} />
          </div>
        </div>
      </section>

      <section className="relative py-24 md:py-32 bg-white text-slate-900" id="dashboard">
        <div className="absolute inset-0 bg-cyber-grid-light opacity-[0.05] pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 md:px-12 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-8 h-px bg-primary/40" />
                <p className="text-[10px] uppercase tracking-[0.4em] text-primary font-black">Operator Views</p>
              </div>
              <h2 className="text-4xl md:text-5xl font-[950] uppercase leading-[0.9] tracking-tighter text-slate-900">
                Command <span className="text-primary italic">Dashboard</span>
              </h2>
            </div>
            <p className="max-w-md text-slate-500 text-sm font-bold uppercase tracking-[0.24em] leading-relaxed">
              Every view is designed to help teams keep outreach organized, understand what is converting, and follow up without delay.
            </p>
          </div>

          <motion.div {...staggerContainer} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {dashboard.map((item) => (
              <motion.div
                key={item}
                variants={fadeInUp}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-8 hover:border-primary/40 hover:shadow-xl hover:shadow-slate-200/50 transition-all"
              >
                <div className="flex gap-4 items-start text-[13px] font-black text-slate-700 leading-relaxed uppercase tracking-[0.18em]">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="relative py-24 md:py-32 bg-white text-slate-900" id="roadmap">
        <div className="absolute inset-0 bg-cyber-grid-light opacity-[0.05] pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 md:px-12 relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <span className="w-8 h-px bg-primary/60" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Rollout Path</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {roadmap.map((phase, idx) => (
              <div key={phase.phase} className="group relative rounded-3xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/40">
                <div className="absolute top-6 right-6 text-6xl font-black text-slate-100 group-hover:text-primary/10 transition-colors pointer-events-none">
                  0{idx + 1}
                </div>
                <div className="relative pt-6 space-y-6">
                  <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 border-b-2 border-primary/20 pb-4 italic">
                    {phase.phase}
                  </h3>
                  <ul className="space-y-4">
                    {phase.highlights.map((item) => (
                      <li key={item} className="flex gap-4 items-start text-[12px] font-black text-slate-500 leading-relaxed uppercase tracking-widest">
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

      <section className="relative py-24 md:py-32 bg-[#020617]" id="pricing">
        <div className="absolute inset-0 bg-[url('/images/ui/grid.svg')] opacity-[0.04] pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 md:px-12 relative z-10">
          <div className="text-center mb-16">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-3">Adoption Model</p>
            <h2 className="text-4xl font-[900] uppercase text-white tracking-tight italic">Pilot to Scale</h2>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-2xl shadow-black/30">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] md:min-w-[800px] text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.04]">
                    <th className="px-3 py-4 md:p-8 border-b border-white/10 text-[9px] md:text-[10px] font-black uppercase tracking-[0.24em] md:tracking-widest text-slate-400">Team Need</th>
                    {pricing.tiers.map((tier) => (
                      <th key={tier} className="px-3 py-4 md:p-8 border-b border-white/10 text-[11px] md:text-[15px] font-[950] uppercase tracking-tight md:tracking-tighter text-primary italic">
                        {tier}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pricing.rows.map((row) => (
                    <tr key={row.label} className="group hover:bg-white/[0.04] transition-colors">
                      <td className="px-3 py-4 md:p-8 border-b border-white/10 text-[10px] md:text-sm font-black uppercase tracking-[0.18em] md:tracking-widest text-white group-hover:text-primary align-top">
                        {row.label}
                      </td>
                      {row.values.map((val) => (
                        <td key={`${row.label}-${val}`} className="px-3 py-4 md:p-8 border-b border-white/10 text-[11px] md:text-[13px] font-bold text-slate-400 group-hover:text-slate-200 leading-relaxed align-top">
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

      <section className="relative pt-16 md:pt-20 pb-0 bg-[#020617]" id="contact">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="relative rounded-3xl overflow-hidden bg-primary p-12 md:p-20 text-center shadow-[0_40px_80px_rgba(37,99,235,0.4)]">
            <div className="absolute inset-0 bg-[url('/images/ui/grid.svg')] opacity-10 pointer-events-none" />
            <div className="absolute -top-1/2 -left-1/4 w-[150%] h-[150%] bg-gradient-to-br from-white/10 via-transparent to-transparent rotate-12" />

            <div className="relative z-10 space-y-8 max-w-2xl mx-auto">
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/80">Operator Connection</p>
              <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-[0.8] text-white">
                Launch Your <br /> <span className="italic">Outbound Stack</span>
              </h2>
              <p className="text-lg text-white/80 font-bold leading-relaxed uppercase tracking-tight">
                Book a product walkthrough to see how Olenbot helps your team qualify leads, automate follow-up, and track conversion performance.
              </p>
              <div className="pt-6">
                <a
                  href="/#contact"
                  className="inline-flex items-center gap-3 px-10 py-4 text-[13px] font-black uppercase tracking-[0.3em] bg-white text-primary transition-all hover:scale-105 active:scale-95"
                  style={{ clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%)" }}
                >
                  Initialize Demo
                  <ArrowUpRight size={18} />
                </a>
              </div>
            </div>
          </div>

        </div>
      </section>

      <Footer />
    </main>
  );
}

function StackColumn({ title, icon, items }) {
  return (
    <div className="p-10 rounded-[2.5rem] border transition-all hover:-translate-y-2 hover:shadow-2xl flex flex-col bg-white/[0.02] border-white/5 hover:border-primary/40 text-white">
      <div className="flex items-center gap-4 mb-10">
        <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20">{icon}</div>
        <h3 className="text-2xl font-[900] uppercase tracking-tighter leading-none italic">{title}</h3>
      </div>
      <ul className="space-y-6 flex-1">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-4">
            <span className="text-[14px] font-[900] uppercase tracking-tight leading-none italic">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
