"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import Breadcrumbs from "./Breadcrumbs";
import { useSiteFeatures } from "@/components/site-features";

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
  const { isVisibleHref } = useSiteFeatures();
  const visiblePrimary = primaryCta && isVisibleHref(primaryCta.href);
  const visibleSecondary = secondaryCta && isVisibleHref(secondaryCta.href);
  return (
    <section className="relative w-full min-h-[92vh] md:min-h-screen overflow-hidden bg-[#070b12] flex items-center justify-center pt-24 pb-20 md:pt-28 md:pb-24">
      <div className="absolute inset-0 z-0">
        <Image src={image} alt={title} fill priority className="object-cover opacity-15 grayscale" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070b12] via-transparent to-[#070b12]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,#152943_0,transparent_60%)] pointer-events-none opacity-60" />
        <div className="absolute inset-0 bg-[url('/images/ui/grid.svg')] opacity-[0.05] pointer-events-none" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-12 w-full py-8 md:py-12">
        <div className="flex flex-col items-center text-center space-y-6 md:space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-5 max-w-4xl"
          >
            <h1 className="text-[clamp(2.4rem,6vw,4.5rem)] font-[900] uppercase tracking-tight leading-[1.05] text-white italic">
              {title}
            </h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.4 }}
              className="max-w-2xl mx-auto text-[1.05rem] md:text-[1.15rem] text-slate-300 leading-relaxed font-normal"
            >
              {description}
            </motion.p>
          </motion.div>

          {(visiblePrimary || visibleSecondary) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 pt-2"
            >
              {visiblePrimary && (
                <Link
                  href={primaryCta.href}
                  className="inline-flex items-center justify-center px-8 py-3.5 text-[12px] font-black uppercase tracking-[0.24em] bg-primary text-white shadow-[0_0_30px_rgba(37,99,235,0.3)] hover:bg-blue-700 transition-all"
                  style={{
                    clipPath:
                      "polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%)",
                  }}
                >
                  {primaryCta.label}
                </Link>
              )}
              {visibleSecondary && (
                <Link
                  href={secondaryCta.href}
                  className="inline-flex items-center justify-center px-8 py-3.5 text-[12px] font-black uppercase tracking-[0.24em] border border-white/20 bg-white/5 text-slate-100 backdrop-blur-md hover:border-primary/60 hover:bg-white/10 transition-all"
                  style={{
                    clipPath:
                      "polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%)",
                  }}
                >
                  {secondaryCta.label}
                </Link>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
