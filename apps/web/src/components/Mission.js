"use client";

import { useRef } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Zap, Shield, Cpu, Globe, Terminal } from 'lucide-react';
import { missionData } from '../data/about';
import { Feature } from "@olentra/site-features/react";

const aboutText = missionData.aboutText;
gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function Mission() {
  const containerRef = useRef(null);
  const reducedMotion = useReducedMotion();
  useGSAP(() => {
    const words = gsap.utils.toArray('.mission-word', containerRef.current);
    if (reducedMotion) return;
    gsap.to(words, { color: '#0f172a', stagger: 0.02, ease: 'none', scrollTrigger: {
      trigger: containerRef.current, start: 'top 90%', end: 'top 15%', scrub: 0.4,
    }});
  }, { scope: containerRef, dependencies: [reducedMotion] });

  const words = aboutText.split(" ");

  return (
    <section
      id="about"
      ref={containerRef}
      data-testid="mission-section"
      data-theme="light"
      className="bg-white py-12 md:py-16 relative overflow-hidden transition-colors duration-500"
    >
      {/* Subtle light grid */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-cyber-grid-light" />

      <div className="max-w-6xl mx-auto px-6 md:px-12 relative z-10">
        {/* About + Description */}
        <div className="flex flex-col items-center text-center gap-6 mb-12 md:mb-14">
          {/* Label */}
          <div className="pt-2 flex justify-center w-full">
            <span className="text-[11px] font-bold text-primary uppercase tracking-[0.3em]">
              OUR MISSION
            </span>
          </div>

          {/* Scrolling Lighting Text */}
          <div className="max-w-4xl">
            <p className="text-[0.95rem] sm:text-[1.1rem] md:text-[1.3rem] font-bold leading-relaxed uppercase flex flex-wrap justify-center">
              {words.map((word, i) => {
                const start = i / words.length;
                const end = (i + 1) / words.length;
                return <span key={i} className="mission-word mr-2" style={{color: reducedMotion ? '#0f172a' : 'rgba(15,23,42,.4)'}}>{word}</span>;
              })}
            </p>
          </div>
        </div>

        {/* Operational Pillars */}
        <Feature name="home.mission.pillars"><div className="relative pt-6 mb-12 md:mb-14">
          {/* Border top */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
            {missionData.pillars.map((pillar, i) => (
              <div
                key={pillar.title}
                className={`flex flex-col gap-3 group ${i > 0 ? 'border-l border-slate-100 md:pl-8' : ''}`}
              >
                <span className="text-[9px] font-black text-primary tracking-[0.3em] uppercase transition-transform group-hover:translate-x-1">
                  {pillar.label}
                </span>
                <h4 className="text-lg font-bold text-slate-900 uppercase tracking-tight">
                  {pillar.title}
                </h4>
                <p className="text-[13px] text-slate-500 font-medium leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </div></Feature>

        {/* INTEGRATED: Visual System Arena (Light Theme) */}
        <Feature name="home.mission.showcase"><div className="flex flex-col items-center pt-6 md:pt-10">
          {/* Visual Header */}
          <div className="mb-14 md:mb-20 text-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-slate-900 text-2xl md:text-3xl font-black uppercase tracking-tight italic leading-none"
            >
              Operational Infrastructure
            </motion.h2>
          </div>

          {/* Orbiting Diagram */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2 }}
            className="flex relative aspect-square max-w-[240px] md:max-w-[340px] lg:max-w-[380px] w-full items-center justify-center"
          >
            {/* Concentric Rotating Rings */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                className="w-[90%] h-[90%] border border-slate-200 rounded-full border-dashed p-5 md:p-8"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                className="absolute w-[70%] h-[70%] border border-slate-100 rounded-full p-3 md:p-5"
              />
            </div>

            {/* Central Core */}
            <div className="relative z-20 w-20 h-20 md:w-28 md:h-28 flex items-center justify-center">
              <Image
                src="/images/branding/Logo/Olentra-Logo-Without-Background.png"
                alt="Olentra"
                width={96}
                height={96}
                className="relative z-10 w-16 h-16 md:w-24 md:h-24 object-contain"
              />
            </div>

            {/* Orbiting System Container */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 z-10 will-change-transform transform-gpu"
            >
              {[
                { label: '⚡ Performance', val: 'Optimized', icon: Zap, textColor: 'text-blue-600', pos: 'top-1/2 left-full' },
                { label: '🔒 Security', val: 'Enterprise', icon: Shield, textColor: 'text-primary', pos: 'top-[93%] left-[75%]' },
                { label: '🤖 AI', val: 'Automation', icon: Cpu, textColor: 'text-indigo-600', pos: 'top-[93%] left-[25%]' },
                { label: '📊 Uptime', val: '99.9% LIVE', icon: null, textColor: 'text-emerald-600', pos: 'top-1/2 left-0' },
                { label: '🌍 Deployments', val: 'Global', icon: Globe, textColor: 'text-blue-700', pos: 'top-[7%] left-[25%]' },
                { label: '⚙️ Logic', val: 'Deterministic', icon: Terminal, textColor: 'text-amber-600', pos: 'top-[7%] left-[75%]' }
              ].map((node, i) => (
                <div key={i} className={`absolute ${node.pos} -translate-x-1/2 -translate-y-1/2`}>
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
                    className="p-2.5 md:p-3 bg-white/95 border border-slate-200 rounded-xl flex items-center gap-3 md:gap-4 shadow-[0_8px_20px_rgba(0,0,0,0.04)] whitespace-nowrap will-change-transform transform-gpu"
                  >
                    <div className={`w-7 h-7 md:w-9 md:h-9 rounded-lg bg-slate-50 flex items-center justify-center ${node.textColor}`}>
                      {node.icon ? <node.icon size={16} /> : <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />}
                    </div>
                    <div className="flex flex-col">
                      <div className="text-[7px] md:text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-0.5">{node.label}</div>
                      <div className="text-[11px] md:text-[13px] font-black text-slate-900 leading-none tracking-tight">{node.val}</div>
                    </div>
                  </motion.div>
                </div>
              ))}
            </motion.div>

            {/* Soft Ambient Glow */}
            <div className="absolute inset-0 bg-primary/[0.02] blur-[80px] md:blur-[120px] rounded-full pointer-events-none z-0" />
          </motion.div>
        </div></Feature>
      </div>
    </section>
  );
}
