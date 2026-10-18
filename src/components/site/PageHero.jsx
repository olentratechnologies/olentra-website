"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import Breadcrumbs from "./Breadcrumbs";

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

export default function PageHero({
  eyebrow,
  title,
  description,
  primaryCta,
  secondaryCta,
  breadcrumbs = [],
  image = "/images/backgrounds/cyber-bg.png",
  panelLabel = "ENTERPRISE_ROUTE",
  panelTag = "Operational View",
}) {
  return (
    <section className="relative min-h-[72vh] mt-10 sm:mt-12 overflow-hidden bg-[#020617] flex items-center">
      <div className="absolute inset-0 z-0">
        <Image src={image} alt={title} fill priority className="object-cover opacity-20 grayscale" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020617] via-transparent to-[#020617]" />
        <div className="absolute inset-0 bg-[url('/images/ui/grid.svg')] opacity-[0.05] pointer-events-none" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 w-full py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.88fr] gap-12 lg:gap-20 items-center">
          <div className="space-y-8">
            {breadcrumbs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.05 }}
              >
                <Breadcrumbs items={breadcrumbs} />
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="inline-flex items-center py-1.5 px-4 rounded-full border border-primary/30 bg-primary/5 backdrop-blur-sm shadow-[0_0_15px_rgba(37,99,235,0.15)] w-fit"
            >
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">{eyebrow}</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="space-y-5"
            >
              <h1 className="text-[clamp(2.3rem,6.5vw,5rem)] font-[900] uppercase tracking-tighter leading-[0.9] text-white italic">
                {title}
              </h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.4 }}
                className="max-w-2xl text-[1rem] md:text-[1.08rem] text-slate-300 leading-relaxed font-medium"
              >
                {description}
              </motion.p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              {primaryCta && (
                <Link
                  href={primaryCta.href}
                  className="inline-flex items-center justify-center px-8 py-4 text-[12px] font-black uppercase tracking-[0.24em] bg-primary text-white shadow-[0_0_30px_rgba(37,99,235,0.3)] hover:bg-blue-700 transition-all"
                  style={{
                    clipPath:
                      "polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%)",
                  }}
                >
                  {primaryCta.label}
                </Link>
              )}
              {secondaryCta && (
                <Link
                  href={secondaryCta.href}
                  className="inline-flex items-center justify-center px-8 py-4 text-[12px] font-black uppercase tracking-[0.24em] border border-white/20 bg-white/5 text-slate-100 backdrop-blur-md hover:border-primary/60 hover:bg-white/10 transition-all"
                  style={{
                    clipPath:
                      "polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%)",
                  }}
                >
                  {secondaryCta.label}
                </Link>
              )}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="relative group lg:px-4"
          >
            <div className="absolute -inset-10 bg-primary/20 blur-[120px] rounded-full opacity-40 animate-pulse pointer-events-none" />
            <div
              className="relative bg-[#0a0f1e] border border-white/10 p-1.5 shadow-[0_40px_100px_rgba(2,6,23,0.8)] backdrop-blur-3xl overflow-hidden"
              style={{
                clipPath:
                  "polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)",
              }}
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500/40" />
                  <div className="w-2 h-2 rounded-full bg-amber-500/40" />
                  <div className="w-2 h-2 rounded-full bg-emerald-500/40" />
                </div>
                <div className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">
                  {panelLabel}
                </div>
              </div>
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={image}
                  alt={title}
                  fill
                  sizes="(max-width: 768px) 100vw, 48vw"
                  className="object-cover grayscale-[0.18] contrast-125 group-hover:grayscale-0 group-hover:scale-[1.02] transition-all duration-1000"
                />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_2px,3px_100%] pointer-events-none opacity-40" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1e] via-transparent to-transparent opacity-60" />
              </div>
              <div className="absolute bottom-10 left-0 right-0 px-6 flex justify-between items-end">
                <div className="bg-primary/90 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 shadow-2xl">
                  {panelTag}
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
  );
}
