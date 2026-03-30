import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Sparkles, Terminal } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { blogs } from "@/data/blogs";

export const metadata = {
  title: "Olentra Blogs",
  description: "Strategy, engineering, AI, and delivery insights from Olentra Technologies.",
};

export default function BlogsPage() {
  return (
    <main className="relative bg-[#020617] text-white font-sans selection:bg-primary/30 selection:text-white">
      <Navbar />

      <section className="relative min-h-[70vh] mt-16 sm:mt-20 overflow-hidden bg-[#020617] flex items-center">
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/backgrounds/cyber-bg.png"
            alt="Blogs background"
            fill
            priority
            className="object-cover opacity-20 grayscale"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#020617] via-transparent to-[#020617]" />
          <div className="absolute inset-0 bg-[url('/images/ui/grid.svg')] opacity-[0.05] pointer-events-none" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-12 w-full py-20 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.85fr] gap-12 items-center">
            <div className="space-y-7">
              <div className="inline-flex items-center gap-3 py-1.5 px-4 rounded-full border border-primary/30 bg-primary/5 backdrop-blur-sm shadow-[0_0_15px_rgba(37,99,235,0.15)]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">BLOG DISPATCH</span>
              </div>

              <div className="space-y-4">
                <h1 className="text-[clamp(2.2rem,5.8vw,4.25rem)] font-[900] uppercase tracking-tighter leading-[0.92] italic max-w-[12ch]">
                  Field Notes <br /> <span className="text-primary">From The Build Floor</span>
                </h1>
                <p className="max-w-xl text-[0.95rem] md:text-[1rem] text-slate-400 font-medium leading-relaxed">
                  Strategy, engineering, AI operations, and delivery insights drawn from real product work across high-velocity teams.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-x-8 gap-y-5 max-w-lg pt-1">
                {[
                  { label: "Publishing Focus", value: "Product, AI, Frontend" },
                  { label: "Update Rhythm", value: "Fresh Editorial Drops" },
                  { label: "Source Material", value: "Real Delivery Experience" },
                  { label: "Audience", value: "Founders, Ops, Engineering" },
                ].map((item) => (
                  <div key={item.label} className="space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{item.label}</p>
                    <p className="text-[12px] md:text-[13px] font-black uppercase tracking-[0.14em] text-slate-100 leading-snug">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-4">
                <Link
                  href="/#contact"
                  className="group inline-flex items-center gap-3 px-8 py-4 text-[11px] font-black uppercase tracking-[0.3em] bg-primary text-white transition-all hover:bg-blue-700 shadow-[0_0_25px_rgba(37,99,235,0.35)]"
                  style={{ clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)" }}
                >
                  Start a Project
                  <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                </Link>
                <Link
                  href="/#blog-section"
                  className="inline-flex items-center gap-3 px-8 py-4 text-[11px] font-black uppercase tracking-[0.3em] border border-white/20 bg-white/5 text-slate-100 backdrop-blur-md transition-all hover:border-primary/60 hover:bg-white/10"
                  style={{ clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)" }}
                >
                  Latest Articles
                </Link>
              </div>
            </div>

            <div className="relative group md:px-4">
              <div className="absolute -inset-10 bg-primary/20 blur-[120px] rounded-full opacity-40 animate-pulse pointer-events-none" />

              <div
                className="relative bg-[#0a0f1e] border border-white/10 p-1.5 shadow-[0_40px_100px_rgba(2,6,23,0.8)] backdrop-blur-3xl overflow-hidden"
                style={{ clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)" }}
              >
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500/40" />
                    <div className="w-2 h-2 rounded-full bg-amber-500/40" />
                    <div className="w-2 h-2 rounded-full bg-emerald-500/40" />
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 flex items-center gap-2">
                    <Terminal size={10} className="text-primary" />
                    EDITORIAL_OS
                  </div>
                </div>

                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src="/images/products/ai-studio-new.png"
                    alt="Olentra editorial and product insights"
                    width={1200}
                    height={900}
                    className="w-full h-full object-cover grayscale-[0.12] contrast-125 group-hover:grayscale-0 group-hover:scale-[1.02] transition-all duration-1000"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_2px,3px_100%] pointer-events-none opacity-40" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1e] via-transparent to-transparent opacity-60" />
                </div>

                <div className="absolute bottom-10 right-0 left-0 px-6 flex justify-between items-end">
                  <div className="bg-primary/90 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 shadow-2xl">
                    Delivery-Backed Insights
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="h-1 w-12 bg-white/10" />
                    <div className="h-1 w-8 bg-white/10" />
                  </div>
                </div>
              </div>

              <div className="absolute -top-4 -left-4 w-12 h-12 border-t-2 border-l-2 border-primary/40 pointer-events-none" />
              <div className="absolute -bottom-4 -right-4 w-12 h-12 border-b-2 border-r-2 border-primary/40 pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      <section id="blog-section" className="relative py-24 md:py-28 bg-white text-slate-900">
        <div className="absolute inset-0 bg-cyber-grid-light opacity-[0.05] pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 md:px-12 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-8 h-px bg-primary/40" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Editorial Stream</p>
              </div>
              <h2 className="text-4xl md:text-5xl font-[950] uppercase leading-[0.9] tracking-tighter">
                Latest <span className="text-primary italic">Articles</span>
              </h2>
            </div>
            <p className="max-w-md text-sm font-bold uppercase tracking-[0.24em] text-slate-500 leading-relaxed">
              A dedicated space for product strategy, AI infrastructure, frontend performance, and execution patterns.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {blogs.map((blog) => (
              <article
                key={blog.title}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 shadow-lg shadow-slate-200/40 transition-all duration-500 hover:-translate-y-1 hover:border-primary/40 hover:bg-white"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image
                    src={blog.image}
                    alt={blog.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 380px"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                </div>

                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary">{blog.category}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{blog.readTime}</span>
                  </div>

                  <h3 className="text-xl md:text-2xl font-black uppercase leading-tight tracking-tight text-slate-900">
                    {blog.title}
                  </h3>

                  <p className="text-[13px] text-slate-600 leading-relaxed">
                    {blog.excerpt}
                  </p>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{blog.date}</span>
                    <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                      Editorial Preview
                      <Sparkles className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-20 md:py-24 bg-[#020617]">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="relative rounded-3xl overflow-hidden bg-primary p-12 md:p-16 text-center shadow-[0_40px_80px_rgba(37,99,235,0.35)]">
            <div className="absolute inset-0 bg-[url('/images/ui/grid.svg')] opacity-10 pointer-events-none" />
            <div className="relative z-10 max-w-3xl mx-auto space-y-6">
              <p className="text-[10px] font-black uppercase tracking-[0.45em] text-white/80">What We Write About</p>
              <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-[0.9]">
                Ideas Backed <br /> <span className="italic">By Delivery</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-left">
                {[
                  "Product delivery systems and launch velocity",
                  "AI workflows, observability, and operating models",
                  "Frontend performance and execution quality",
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/20 bg-white/10 p-5 text-[11px] font-black uppercase tracking-[0.2em] text-white/90 leading-relaxed">
                    <div className="flex gap-3 items-start">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
