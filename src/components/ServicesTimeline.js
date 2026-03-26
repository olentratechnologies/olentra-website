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

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

function getTagClasses(tag) {
  // Deterministic hash to consistently pick a color for the same tag
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % TAG_PALETTE.length;
  return TAG_PALETTE[index];
}

function TimelineCard({ service, isRightColumn }) {
  const Icon = service.Icon;

  return (
    <div
      id={`services-${slugify(service.title)}`}
      className={[
        "relative w-full mb-12 md:mb-0 scroll-mt-32",
        isRightColumn ? "md:pl-14" : "md:pr-14",
      ].join(" ")}
    >
      {/* Connector Line (Desktop) */}
      <div
        className={[
          "hidden md:block absolute top-1/2 -translate-y-1/2 h-px bg-primary/30 z-0 w-10",
          isRightColumn ? "left-0" : "right-0",
        ].join(" ")}
      />

      {/* Card Content */}
      <motion.div
        initial={{ opacity: 0, x: isRightColumn ? 40 : -40 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="w-full group"
      >
        <article className="relative bg-slate-900/40 backdrop-blur-xl border border-white/5 p-6 md:p-7 rounded-xl hover:border-primary/50 transition-all duration-500 hover:shadow-[0_0_26px_rgba(37,99,235,0.14)] hover:-translate-y-1">
          {/* Subtle Glow Header */}
          <div className="flex items-center gap-3.5 mb-5">
            <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-primary shadow-brand-cyan-glow group-hover:scale-110 transition-transform duration-500">
              <Icon size={20} strokeWidth={2} />
            </div>
            <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-tight group-hover:text-primary transition-colors">
              {service.title}
            </h3>
          </div>

          <p className="text-slate-400 font-medium leading-relaxed mb-6 text-[13px] md:text-[14px]">
            {service.description}
          </p>

          <div className="flex flex-wrap gap-1.5">
            {service.tags.map((tag) => (
              <span
                key={tag}
                className={`px-2.5 py-1 rounded-md border text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-all ${getTagClasses(tag)}`}
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
          "absolute -left-8 top-0 -translate-x-1/2 z-20",
          isRightColumn ? "md:left-0" : "md:left-full",
          "md:top-1/2 md:-translate-y-1/2",
        ].join(" ")}
      >
        <div className="w-8 h-8 md:w-10 md:h-10 bg-[#020617] border-2 border-primary/30 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.2)]">
          <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-primary rounded-full animate-pulse shadow-brand-cyan-glow" />
        </div>
      </div>
    </div>
  );
}

export default function ServicesTimeline() {
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

  return (
    <section
      id="services"
      className="bg-[#020617] py-16 md:py-24 relative overflow-hidden transition-colors duration-500"
    >
      {/* Background Decor */}
      <div className="absolute inset-0 bg-cyber-grid opacity-[0.03] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.10),transparent_60%)] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 md:px-12 relative z-10">
        <div className="text-center mb-16 md:mb-24">
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-primary font-black text-[10px] md:text-xs tracking-[0.4em] uppercase mb-3"
          >
            Engineering Excellence
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-[clamp(1.6rem,4vw,3.25rem)] font-black text-white uppercase tracking-wide md:tracking-wider leading-[0.95] sm:leading-[0.9]"
          >
            Systems built
            <span className="hidden sm:inline"> </span>
            <br className="sm:hidden" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-primary">to drive impact</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="mt-6 text-slate-300/90 text-[0.95rem] md:text-[1.05rem] leading-relaxed max-w-3xl mx-auto"
          >
            From design to automation, we ship production-ready systems with performance, and measurable outcomes.
          </motion.p>
        </div>

        <div ref={containerRef} className="relative mt-16">
          <div className="relative pl-14 md:pl-0">
            {/* Vertical Central Line */}
            <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-[1.5px] bg-white/5 md:-translate-x-1/2" />

            {/* Animated Progress Line */}
            <motion.div
              style={{ scaleY, originY: 0 }}
              className="absolute left-6 md:left-1/2 top-0 bottom-0 w-[1.5px] bg-gradient-to-b from-primary via-blue-400 to-transparent md:-translate-x-1/2 z-10 shadow-[0_0_12px_rgba(37,99,235,0.4)]"
            />

            {serviceGroups.map((group, groupIndex) => (
              <div key={group.category} id={`services-${slugify(group.category)}`} className="mb-20 last:mb-0 scroll-mt-28">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="relative flex items-center justify-start md:justify-center gap-4 mb-20 z-20"
                >
                  <div className="flex items-center gap-4 bg-[#020617] px-6 py-2 border border-white/5 rounded-full backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                    <span className="text-xl md:text-2xl">{group.icon}</span>
                    <h3 className="text-xs md:text-sm font-black text-white uppercase tracking-[0.3em]">
                      {group.category}
                    </h3>
                  </div>
                </motion.div>

                <div className="space-y-12 md:space-y-0 md:grid md:grid-cols-2 md:gap-y-16">
                  {group.services.map((service, localIndex) => {
                    return (
                      <TimelineCard
                        key={service.title}
                        service={service}
                        isRightColumn={localIndex % 2 === 1}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 text-center">
          <a
            href="#contact"
            className="group relative inline-flex w-full sm:w-auto justify-center items-center gap-3 px-7 sm:px-8 py-3.5 sm:py-4 text-[12px] sm:text-[13px] font-bold text-white bg-primary uppercase tracking-[0.12em] sm:tracking-[0.2em] transition-all hover:bg-blue-700 shadow-[0_0_25px_rgba(37,99,235,0.35)]"
            style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)' }}
          >
            <span className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <span className="relative flex items-center gap-2">
              Initiate Request
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
