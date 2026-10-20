"use client";

import { useRef } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { serviceGroups } from '../data/services';

const TAG_PALETTE = [
  'bg-blue-500/10 border-blue-400/30 text-blue-200 group-hover:border-blue-400/55 group-hover:text-blue-100',
  'bg-indigo-500/10 border-indigo-400/30 text-indigo-200 group-hover:border-indigo-400/55 group-hover:text-indigo-100',
  'bg-sky-500/10 border-sky-400/30 text-sky-200 group-hover:border-sky-400/55 group-hover:text-sky-100',
  'bg-violet-500/10 border-violet-400/30 text-violet-200 group-hover:border-violet-400/55 group-hover:text-violet-100',
  'bg-fuchsia-500/10 border-fuchsia-400/30 text-fuchsia-200 group-hover:border-fuchsia-400/55 group-hover:text-fuchsia-100',
  'bg-emerald-500/10 border-emerald-400/30 text-emerald-200 group-hover:border-emerald-400/55 group-hover:text-emerald-100',
  'bg-teal-500/10 border-teal-400/30 text-teal-200 group-hover:border-teal-400/55 group-hover:text-teal-100',
  'bg-cyan-500/10 border-cyan-400/30 text-cyan-200 group-hover:border-cyan-400/55 group-hover:text-cyan-100',
  'bg-rose-500/10 border-rose-400/30 text-rose-200 group-hover:border-rose-400/55 group-hover:text-rose-100',
  'bg-orange-500/10 border-orange-400/30 text-orange-200 group-hover:border-orange-400/55 group-hover:text-orange-100',
  'bg-amber-500/10 border-amber-400/30 text-amber-200 group-hover:border-amber-400/55 group-hover:text-amber-100',
  'bg-lime-500/10 border-lime-400/30 text-lime-200 group-hover:border-lime-400/55 group-hover:text-lime-100',
  'bg-purple-500/10 border-purple-400/30 text-purple-200 group-hover:border-purple-400/55 group-hover:text-purple-100',
  'bg-pink-500/10 border-pink-400/30 text-pink-200 group-hover:border-pink-400/55 group-hover:text-pink-100',
];

const TAG_PALETTE_LIGHT = [
  'bg-blue-50 border-blue-200 text-blue-700',
  'bg-indigo-50 border-indigo-200 text-indigo-700',
  'bg-sky-50 border-sky-200 text-sky-700',
  'bg-violet-50 border-violet-200 text-violet-700',
  'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700',
  'bg-emerald-50 border-emerald-200 text-emerald-700',
  'bg-teal-50 border-teal-200 text-teal-700',
  'bg-cyan-50 border-cyan-200 text-cyan-700',
  'bg-rose-50 border-rose-200 text-rose-700',
  'bg-orange-50 border-orange-200 text-orange-700',
  'bg-amber-50 border-amber-200 text-amber-700',
  'bg-lime-50 border-lime-200 text-lime-700',
  'bg-purple-50 border-purple-200 text-purple-700',
  'bg-pink-50 border-pink-200 text-pink-700',
];

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

function getTagClasses(tag, isLight = false) {
  // Deterministic hash to consistently pick a color for the same tag
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const palette = isLight ? TAG_PALETTE_LIGHT : TAG_PALETTE;
  const index = Math.abs(hash) % palette.length;
  return palette[index];
}

function TimelineCard({ service, isRightColumn, isLight = false }) {
  const Icon = service.Icon;

  return (
    <div
      id={`services-${slugify(service.title)}`}
      className={[
        "relative w-full mb-8 md:mb-0 scroll-mt-28",
        isRightColumn ? "md:pl-10" : "md:pr-10",
      ].join(" ")}
    >
      {/* Connector Line (Desktop) */}
      <div
        className={[
          "hidden md:block absolute top-1/2 -translate-y-1/2 h-px z-0 w-8",
          isLight ? "bg-primary/20" : "bg-primary/30",
          isRightColumn ? "left-0" : "right-0",
        ].join(" ")}
      />

      {/* Card Content */}
      <motion.div
        initial={{ opacity: 0, x: isRightColumn ? 30 : -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5, delay: 0.08 }}
        className="w-full group"
      >
        <article className={`relative backdrop-blur-xl p-4 md:p-5 rounded-xl transition-all duration-500 hover:-translate-y-0.5 ${
          isLight
            ? "bg-slate-50/90 border border-slate-200/90 hover:border-primary/50 shadow-md shadow-slate-200/40 hover:shadow-lg hover:shadow-primary/10"
            : "bg-slate-900/40 border border-white/5 hover:border-primary/50 hover:shadow-[0_0_20px_rgba(37,99,235,0.14)]"
        }`}>
          {/* Header */}
          <div className="flex items-center gap-2.5 mb-3">
            <div className={`p-2 rounded-lg border group-hover:scale-105 transition-transform duration-500 ${
              isLight
                ? "bg-primary/10 border-primary/20 text-primary shadow-sm"
                : "bg-primary/10 border-primary/20 text-primary shadow-brand-cyan-glow"
            }`}>
              <Icon size={16} strokeWidth={2} />
            </div>
            <h3 className={`text-sm md:text-base font-black uppercase tracking-tight group-hover:text-primary transition-colors ${
              isLight ? "text-slate-900" : "text-white"
            }`}>
              {service.title}
            </h3>
          </div>

          <p className={`font-medium leading-relaxed mb-4 text-[12px] md:text-[12.5px] ${
            isLight ? "text-slate-600" : "text-slate-400"
          }`}>
            {service.description}
          </p>

          <div className="flex flex-wrap gap-1">
            {service.tags.map((tag) => (
              <span
                key={tag}
                className={`px-2 py-0.5 rounded border text-[8px] md:text-[8.5px] font-bold uppercase tracking-wider transition-all ${getTagClasses(tag, isLight)}`}
              >
                {tag}
              </span>
            ))}
          </div>
        </article>
      </motion.div>

      {/* Timeline Node */}
      <div
        className={[
          "absolute -left-7 top-0 -translate-x-1/2 z-20",
          isRightColumn ? "md:left-0" : "md:left-full",
          "md:top-1/2 md:-translate-y-1/2",
        ].join(" ")}
      >
        <div className={`w-6 h-6 md:w-7 md:h-7 border-2 rounded-full flex items-center justify-center ${
          isLight
            ? "bg-white border-primary/40 shadow-sm shadow-primary/10"
            : "bg-[#070b12] border-primary/30 shadow-[0_0_12px_rgba(37,99,235,0.2)]"
        }`}>
          <div className={`w-2 h-2 bg-primary rounded-full animate-pulse ${
            isLight ? "shadow-sm shadow-primary/50" : "shadow-brand-cyan-glow"
          }`} />
        </div>
      </div>
    </div>
  );
}

export default function ServicesTimeline({
  sectionId = "services",
  maxGroups,
  maxServicesPerGroup,
  highlightedServices,
  ctaHref = "#contact",
  ctaLabel = "Initiate Request",
  theme = "dark",
}) {
  const isLight = theme === "light";
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"]
  });

  const scaleY = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // Flat list of all services across groups for highlighted selection
  const allServices = serviceGroups.flatMap((group) => group.services);

  const visibleGroups = highlightedServices?.length
    ? null
    : serviceGroups
        .slice(0, maxGroups ?? serviceGroups.length)
        .map((group) => ({
          ...group,
          services: group.services.slice(0, maxServicesPerGroup ?? group.services.length),
        }));

  const activeHighlightedList = highlightedServices?.length
    ? highlightedServices
        .map((name) => allServices.find((s) => s.title.toLowerCase() === name.toLowerCase()))
        .filter(Boolean)
    : null;

  return (
    <section
      id={sectionId}
      className={`relative py-14 md:py-20 overflow-hidden transition-colors duration-500 isolate ${
        isLight ? "bg-white text-slate-900" : ""
      }`}
      style={
        isLight
          ? undefined
          : {
              background: "radial-gradient(ellipse at 65% 48%, #152943 0, transparent 50%), linear-gradient(110deg, #070b12, #0b111b)",
            }
      }
    >
      {/* Grid Texture */}
      {isLight ? (
        <div className="absolute inset-0 bg-cyber-grid-light opacity-[0.05] pointer-events-none" />
      ) : (
        <div
          className="absolute inset-0 z-[-1] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(#a5c9ff06 1px, transparent 1px), linear-gradient(90deg, #a5c9ff06 1px, transparent 1px)",
            backgroundSize: "100px 100px",
            maskImage: "linear-gradient(transparent, #000, transparent)",
            WebkitMaskImage: "linear-gradient(transparent, #000, transparent)",
          }}
        />
      )}

      <div className="max-w-5xl mx-auto px-6 md:px-10 relative z-10">
        <div className="text-center mb-10 md:mb-14">
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-primary font-black text-[9px] md:text-[10px] tracking-[0.35em] uppercase mb-2"
          >
            Engineering Excellence
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className={`text-[clamp(1.4rem,3vw,2.4rem)] font-black uppercase tracking-wide leading-[1.05] ${
              isLight ? "text-slate-950" : "text-white"
            }`}
          >
            Systems built
            <span className="hidden sm:inline"> </span>
            <br className="sm:hidden" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-500 to-primary">to drive impact</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className={`mt-3 text-[0.88rem] md:text-[0.95rem] leading-relaxed max-w-2xl mx-auto ${
              isLight ? "text-slate-600" : "text-slate-300/90"
            }`}
          >
            From design to automation, we ship production-ready systems with performance, and measurable outcomes.
          </motion.p>
        </div>

        <div ref={containerRef} className="relative mt-10">
          <div className="relative pl-10 md:pl-0">
            {/* Vertical Central Line */}
            <div className={`absolute left-5 md:left-1/2 top-0 bottom-0 w-[1.5px] md:-translate-x-1/2 ${
              isLight ? "bg-slate-200" : "bg-white/5"
            }`} />

            {/* Animated Progress Line */}
            <motion.div
              style={{ scaleY, originY: 0 }}
              className={`absolute left-5 md:left-1/2 top-0 bottom-0 w-[1.5px] bg-gradient-to-b from-primary via-blue-400 to-transparent md:-translate-x-1/2 z-10 ${
                isLight ? "shadow-[0_0_10px_rgba(37,99,235,0.3)]" : "shadow-[0_0_12px_rgba(37,99,235,0.4)]"
              }`}
            />

            {activeHighlightedList ? (
              <div className="space-y-8 md:space-y-0 md:grid md:grid-cols-2 md:gap-y-10">
                {activeHighlightedList.map((service, index) => (
                  <TimelineCard
                    key={service.title}
                    service={service}
                    isRightColumn={index % 2 === 1}
                    isLight={isLight}
                  />
                ))}
              </div>
            ) : (
              visibleGroups?.map((group) => (
                <div key={group.category} id={`services-${slugify(group.category)}`} className="mb-14 last:mb-0 scroll-mt-28">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="relative flex items-center justify-start md:justify-center gap-3 mb-10 z-20"
                  >
                    <div className={`flex items-center gap-3 px-4 py-1.5 border rounded-full backdrop-blur-md ${
                      isLight
                        ? "bg-white/90 border-slate-200 text-slate-900 shadow-sm"
                        : "bg-[#070b12] border-white/10 text-white shadow-[0_0_16px_rgba(0,0,0,0.5)]"
                    }`}>
                      <span className="text-base md:text-lg">{group.icon}</span>
                      <h3 className={`text-[10px] md:text-xs font-black uppercase tracking-[0.25em] ${
                        isLight ? "text-slate-900" : "text-white"
                      }`}>
                        {group.category}
                      </h3>
                    </div>
                  </motion.div>

                  <div className="space-y-8 md:space-y-0 md:grid md:grid-cols-2 md:gap-y-10">
                    {group.services.map((service, localIndex) => (
                      <TimelineCard
                        key={service.title}
                        service={service}
                        isRightColumn={localIndex % 2 === 1}
                        isLight={isLight}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-16 text-center">
          <a
            href={ctaHref}
            className="group relative inline-flex w-full sm:w-auto justify-center items-center gap-3 px-7 sm:px-8 py-3.5 sm:py-4 text-[12px] sm:text-[13px] font-bold text-white bg-primary uppercase tracking-[0.12em] sm:tracking-[0.2em] transition-all hover:bg-blue-700 shadow-[0_0_25px_rgba(37,99,235,0.35)]"
            style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)' }}
          >
            <span className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <span className="relative flex items-center gap-2">
              {ctaLabel}
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
