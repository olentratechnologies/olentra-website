"use client";

import { Feature } from "@/components/site-features";
import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useScroll, useSpring } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { serviceGroups } from '../data/services';
import CentralGlobe3D from './CentralGlobe3D';

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
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const palette = isLight ? TAG_PALETTE_LIGHT : TAG_PALETTE;
  const index = Math.abs(hash) % palette.length;
  return palette[index];
}

const CAPABILITY_PILLARS = [
  {
    number: '01',
    id: 'services-ai-solutions',
    titleAccent: 'AI',
    titleRest: 'SOLUTIONS',
    description:
      'Building AI-powered platforms using LLMs, embeddings, and modern AI frameworks.',
    href: '/services/data-ai#ai-solutions',
    image: '/images/capabilities/ai-solutions.png',
    imagePosition: 'left',
    position: 'top-left',
    accentColor: '#f59e0b',
    accentTextClass: 'text-amber-400',
    lineClass: 'from-amber-400/80 to-transparent',
    cardAngleClass: 'lg:rotate-[5.2deg] lg:-skew-x-[4deg]',
    illustrationCounterClass: 'lg:-rotate-[5.2deg] lg:skew-x-[4deg]',
    borderStyle: {
      background:
        'linear-gradient(125deg, rgba(251,191,36,0.9) 0%, rgba(217,119,6,0.45) 38%, rgba(255,255,255,0.08) 75%, rgba(251,191,36,0.3) 100%)',
    },
    innerGlowStyle: {
      background:
        'radial-gradient(circle at 18% 50%, rgba(245,158,11,0.22) 0%, rgba(180,83,9,0.06) 42%, transparent 70%), linear-gradient(135deg, #0c101d 0%, #050811 100%)',
    },
    outerGlowClass: 'bg-amber-500/20',
    arrowBtnClass:
      'border-amber-400/60 bg-amber-500/10 text-amber-200 group-hover:bg-amber-400 group-hover:text-slate-950 shadow-[0_0_16px_rgba(245,158,11,0.35)]',
    arrowPosition: 'inner-right',
    tags: [
      {
        label: 'AI',
        className:
          'border-amber-500/50 bg-amber-950/60 text-amber-200 shadow-[inset_0_0_10px_rgba(245,158,11,0.2)]',
      },
      {
        label: 'LLM',
        className:
          'border-fuchsia-500/50 bg-fuchsia-950/50 text-fuchsia-200 shadow-[inset_0_0_10px_rgba(217,70,239,0.2)]',
      },
      {
        label: 'AUTOMATION',
        className:
          'border-indigo-500/50 bg-indigo-950/55 text-indigo-200 shadow-[inset_0_0_10px_rgba(99,102,241,0.2)]',
      },
    ],
  },
  {
    number: '02',
    id: 'services-real-time-systems',
    titleAccent: 'REAL-TIME',
    titleRest: 'SYSTEMS',
    description:
      'Building systems capable of handling real-time data and high-throughput backend operations.',
    href: '/services/platform-engineering#real-time-systems',
    image: '/images/capabilities/realtime-systems.png',
    imagePosition: 'right',
    position: 'top-right',
    accentColor: '#38bdf8',
    accentTextClass: 'text-sky-400',
    lineClass: 'from-sky-400/80 to-transparent',
    cardAngleClass: 'lg:-rotate-[5.2deg] lg:skew-x-[4deg]',
    illustrationCounterClass: 'lg:rotate-[5.2deg] lg:-skew-x-[4deg]',
    borderStyle: {
      background:
        'linear-gradient(235deg, rgba(56,189,248,0.9) 0%, rgba(59,130,246,0.45) 42%, rgba(255,255,255,0.08) 78%, rgba(56,189,248,0.3) 100%)',
    },
    innerGlowStyle: {
      background:
        'radial-gradient(circle at 82% 50%, rgba(56,189,248,0.22) 0%, rgba(37,99,235,0.07) 42%, transparent 70%), linear-gradient(225deg, #0a1224 0%, #050811 100%)',
    },
    outerGlowClass: 'bg-sky-500/20',
    arrowBtnClass:
      'border-sky-400/60 bg-sky-500/10 text-sky-200 group-hover:bg-sky-400 group-hover:text-slate-950 shadow-[0_0_16px_rgba(56,189,248,0.35)]',
    arrowPosition: 'none',
    tags: [
      {
        label: 'REALTIME',
        className:
          'border-sky-500/50 bg-sky-950/60 text-sky-200 shadow-[inset_0_0_10px_rgba(14,165,233,0.22)]',
      },
      {
        label: 'STREAMING',
        className:
          'border-purple-500/50 bg-purple-950/50 text-purple-200 shadow-[inset_0_0_10px_rgba(168,85,247,0.2)]',
      },
      {
        label: 'SCALE',
        className:
          'border-violet-500/50 bg-violet-950/55 text-violet-200 shadow-[inset_0_0_10px_rgba(139,92,246,0.2)]',
      },
    ],
  },
  {
    number: '03',
    id: 'services-cloud-architecture',
    titleAccent: 'CLOUD',
    titleRest: 'ARCHITECTURE',
    description:
      'Designing high-availability cloud infrastructure with CI/CD automation and multi-cloud cost optimization.',
    href: '/services/cloud-security#cloud-architecture',
    image: '/images/capabilities/cloud-architecture.png',
    imagePosition: 'left',
    position: 'bottom-left',
    accentColor: '#10b981',
    accentTextClass: 'text-emerald-400',
    lineClass: 'from-emerald-400/80 to-transparent',
    cardAngleClass: 'lg:rotate-[2.4deg] lg:-skew-x-[2.2deg]',
    illustrationCounterClass: 'lg:-rotate-[2.4deg] lg:skew-x-[2.2deg]',
    borderStyle: {
      background:
        'linear-gradient(130deg, rgba(52,211,153,0.9) 0%, rgba(16,185,129,0.42) 40%, rgba(255,255,255,0.08) 78%, rgba(16,185,129,0.3) 100%)',
    },
    innerGlowStyle: {
      background:
        'radial-gradient(circle at 18% 52%, rgba(16,185,129,0.22) 0%, rgba(6,95,70,0.07) 42%, transparent 70%), linear-gradient(135deg, #071717 0%, #050811 100%)',
    },
    outerGlowClass: 'bg-emerald-500/20',
    arrowBtnClass:
      'border-emerald-400/60 bg-emerald-500/10 text-emerald-200 group-hover:bg-emerald-400 group-hover:text-slate-950 shadow-[0_0_16px_rgba(16,185,129,0.35)]',
    arrowPosition: 'inner-right',
    tags: [
      {
        label: 'AWS',
        className:
          'border-amber-500/50 bg-amber-950/55 text-amber-200 shadow-[inset_0_0_8px_rgba(245,158,11,0.18)]',
      },
      {
        label: 'GCP',
        className:
          'border-cyan-500/50 bg-cyan-950/55 text-cyan-200 shadow-[inset_0_0_8px_rgba(6,182,212,0.18)]',
      },
      {
        label: 'AZURE',
        className:
          'border-sky-500/50 bg-sky-950/55 text-sky-200 shadow-[inset_0_0_8px_rgba(14,165,233,0.18)]',
      },
      {
        label: 'DOCKER',
        className:
          'border-indigo-500/50 bg-indigo-950/55 text-indigo-200 shadow-[inset_0_0_8px_rgba(99,102,241,0.18)]',
      },
      {
        label: 'CI/CD',
        className:
          'border-fuchsia-500/50 bg-fuchsia-950/55 text-fuchsia-200 shadow-[inset_0_0_8px_rgba(217,70,239,0.18)]',
      },
    ],
  },
  {
    number: '04',
    id: 'services-security-and-compliance',
    titleAccent: 'SECURITY',
    titleRest: '& COMPLIANCE',
    description:
      'Enterprise-grade security systems with robust identity management (Auth) and compliance frameworks.',
    href: '/services/cloud-security#security-and-compliance',
    image: '/images/capabilities/security-compliance.png',
    imagePosition: 'left',
    position: 'bottom-right',
    accentColor: '#a855f7',
    accentTextClass: 'text-purple-400',
    lineClass: 'from-purple-400/80 to-transparent',
    cardAngleClass: 'lg:-rotate-[2.4deg] lg:skew-x-[2.2deg]',
    illustrationCounterClass: 'lg:rotate-[2.4deg] lg:-skew-x-[2.2deg]',
    borderStyle: {
      background:
        'linear-gradient(230deg, rgba(192,132,252,0.9) 0%, rgba(147,51,234,0.42) 42%, rgba(255,255,255,0.08) 78%, rgba(168,85,247,0.3) 100%)',
    },
    innerGlowStyle: {
      background:
        'radial-gradient(circle at 24% 52%, rgba(168,85,247,0.22) 0%, rgba(107,33,168,0.08) 44%, transparent 72%), linear-gradient(225deg, #130b24 0%, #050811 100%)',
    },
    outerGlowClass: 'bg-purple-500/20',
    arrowBtnClass:
      'border-purple-400/60 bg-purple-500/10 text-purple-200 group-hover:bg-purple-400 group-hover:text-slate-950 shadow-[0_0_16px_rgba(168,85,247,0.35)]',
    arrowPosition: 'top-right',
    tags: [
      {
        label: 'SECURITY',
        className:
          'border-indigo-500/50 bg-indigo-950/60 text-indigo-200 shadow-[inset_0_0_10px_rgba(99,102,241,0.2)]',
      },
      {
        label: 'AUTH',
        className:
          'border-purple-500/50 bg-purple-950/55 text-purple-200 shadow-[inset_0_0_10px_rgba(168,85,247,0.2)]',
      },
      {
        label: 'COMPLIANCE',
        className:
          'border-pink-500/50 bg-pink-950/55 text-pink-200 shadow-[inset_0_0_10px_rgba(236,72,153,0.2)]',
      },
    ],
  },
];

function CapabilityPillarCard({ pillar }) {
  const isImageRight = pillar.imagePosition === 'right';

  return (
    <div
      id={pillar.id}
      className="relative scroll-mt-28 group"
    >
      {/* Ambient Outer Glow */}
      <div
        className={`pointer-events-none absolute -inset-3 rounded-[28px] blur-2xl opacity-55 group-hover:opacity-85 transition-opacity duration-500 ${pillar.outerGlowClass}`}
      />

      <Link
        href={pillar.href}
        aria-label={`${pillar.titleAccent} ${pillar.titleRest}`}
        className={`block relative rounded-[22px] p-[1.25px] transition-transform duration-500 group-hover:scale-[1.015] will-change-transform ${pillar.cardAngleClass}`}
        style={pillar.borderStyle}
      >
        {/* Glass Card Surface */}
        <div
          className="relative rounded-[21px] px-4 py-4 sm:px-5 sm:py-5 backdrop-blur-2xl overflow-visible min-h-[188px] sm:min-h-[196px] flex items-center"
          style={pillar.innerGlowStyle}
        >
          {/* Subtle top specular reflection line */}
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

          {/* Top-right or Inner-right circular arrow button */}
          {pillar.arrowPosition === 'inner-right' && (
            <div
              className={`absolute right-3.5 top-5 z-20 w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 ${pillar.arrowBtnClass}`}
            >
              <ArrowUpRight size={15} strokeWidth={2.2} />
            </div>
          )}
          {pillar.arrowPosition === 'top-right' && (
            <div
              className={`absolute right-4 -top-3.5 z-20 w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 backdrop-blur-md ${pillar.arrowBtnClass}`}
            >
              <ArrowUpRight size={15} strokeWidth={2.2} />
            </div>
          )}

          <div
            className={`w-full flex flex-col sm:flex-row items-center gap-3 sm:gap-4 ${
              isImageRight ? 'sm:flex-row-reverse' : 'sm:flex-row'
            }`}
          >
            {/* 3D Pedestal Illustration */}
            <div
              className={`relative shrink-0 w-[148px] h-[148px] sm:w-[168px] sm:h-[168px] xl:w-[192px] xl:h-[192px] flex items-center justify-center pointer-events-none select-none ${
                isImageRight ? 'sm:-mr-4 sm:-my-4' : 'sm:-ml-4 sm:-my-4'
              } ${pillar.illustrationCounterClass}`}
            >
              <Image
                src={pillar.image}
                alt={`${pillar.titleAccent} ${pillar.titleRest}`}
                width={384}
                height={384}
                unoptimized
                className="w-full h-full object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.75)] group-hover:scale-105 transition-transform duration-500"
              />
            </div>

            {/* Text & Tags Content */}
            <div className="flex-1 min-w-0 z-10">
              {/* Number + Divider Line */}
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="text-[11px] font-bold tracking-widest text-slate-200/90 font-mono">
                  {pillar.number}
                </span>
                <span
                  className={`h-[1.5px] w-7 bg-gradient-to-r ${pillar.lineClass}`}
                />
              </div>

              {/* Heading */}
              <h3
                className={`text-[15px] sm:text-[17px] xl:text-[18.5px] font-black uppercase tracking-tight leading-snug mb-2 ${
                  pillar.arrowPosition === 'inner-right' ? 'pr-8' : ''
                }`}
              >
                <span className={pillar.accentTextClass}>
                  {pillar.titleAccent}
                </span>{' '}
                <span className="text-white">{pillar.titleRest}</span>
              </h3>

              {/* Description */}
              <p
                className={`text-[11.5px] sm:text-[12px] xl:text-[12.5px] text-slate-300/85 leading-relaxed mb-3.5 font-normal ${
                  pillar.arrowPosition === 'inner-right' ? 'pr-6' : ''
                }`}
              >
                {pillar.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap xl:flex-nowrap items-center gap-1.5">
                {pillar.tags.map((tag) => (
                  <span
                    key={tag.label}
                    className={`px-2 py-1 rounded-md border text-[8px] sm:text-[8.5px] font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-300 ${tag.className}`}
                  >
                    {tag.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

function HighlightedCapabilitiesHub({ sectionId, ctaHref, ctaLabel }) {
  return (
    <section
      id={sectionId}
      className="relative py-16 md:py-24 overflow-hidden bg-[#04070f] text-white isolate"
    >
      {/* Deep Space Radial Atmosphere & Corner Dot Matrix */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 55% at 50% 52%, rgba(23, 37, 84, 0.32) 0%, rgba(15, 23, 42, 0.14) 52%, transparent 80%), radial-gradient(circle at 18% 28%, rgba(245, 158, 11, 0.08) 0%, transparent 40%), radial-gradient(circle at 82% 28%, rgba(56, 189, 248, 0.09) 0%, transparent 40%), radial-gradient(circle at 18% 78%, rgba(16, 185, 129, 0.08) 0%, transparent 40%), radial-gradient(circle at 82% 78%, rgba(168, 85, 247, 0.09) 0%, transparent 40%)',
        }}
      />

      {/* Corner Dot Grid Texture */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-25"
        style={{
          backgroundImage:
            'radial-gradient(rgba(148, 163, 184, 0.35) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
          maskImage:
            'radial-gradient(ellipse 75% 65% at 50% 50%, transparent 35%, #000 100%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 75% 65% at 50% 50%, transparent 35%, #000 100%)',
        }}
      />
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Top Center Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 lg:mb-6">
          <h2 className="text-3xl sm:text-4xl md:text-[2.75rem] font-extrabold tracking-tight leading-[1.1]">
            <span className="text-white">Systems built </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#fde68a] via-[#f59e0b] to-[#fbbf24] drop-shadow-[0_0_25px_rgba(245,158,11,0.25)]">
              to drive impact
            </span>
          </h2>

          <p className="mt-3 text-xs sm:text-sm md:text-[14.5px] text-slate-300/85 leading-relaxed max-w-xl mx-auto">
            From design to automation, we ship production-ready systems with performance, and measurable outcomes.
          </p>
        </div>

        {/* 4-Pillar Hub + Central Globe Arena */}
        <div className="relative mt-6 lg:mt-2">
          {/* Decorative 3D Ambient Spheres matching reference */}
          <div
            aria-hidden="true"
            className="hidden lg:block pointer-events-none absolute -top-2 right-[7.5%] w-9 h-9 rounded-full z-0"
            style={{
              background:
                'radial-gradient(circle at 32% 28%, #60a5fa 0%, #1e3a8a 48%, #04070f 90%)',
              boxShadow: '0 8px 24px rgba(30, 58, 138, 0.45)',
            }}
          />
          <div
            aria-hidden="true"
            className="hidden lg:block pointer-events-none absolute top-[4%] left-[12.5%] w-4 h-4 rounded-full z-20"
            style={{
              background:
                'radial-gradient(circle at 35% 30%, #fbbf24 0%, #78350f 55%, #090d16 95%)',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)',
            }}
          />
          <div
            aria-hidden="true"
            className="hidden lg:block pointer-events-none absolute bottom-[22%] -right-3 w-8 h-8 rounded-full z-20"
            style={{
              background:
                'radial-gradient(circle at 35% 30%, #a855f7 0%, #3b0764 55%, #050811 95%)',
              boxShadow: '0 6px 20px rgba(168, 85, 247, 0.35)',
            }}
          />

          {/* Desktop SVG Curved Energy Connectors (Layered at z-20 so sockets sit cleanly on card inner edges) */}
          <svg
            className="hidden lg:block pointer-events-none absolute inset-0 w-full h-full z-20 overflow-visible"
            viewBox="0 0 1200 500"
            fill="none"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <filter id="glow-amber" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="glow-blue" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="glow-emerald" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="glow-purple" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* 01 Top-Left Amber Connector */}
            <path
              d="M 476 146 C 510 146, 530 180, 550 214"
              stroke="#fbbf24"
              strokeWidth="2.2"
              strokeOpacity="0.65"
              filter="url(#glow-amber)"
            />
            <path
              d="M 550 214 C 530 180, 510 146, 476 146"
              stroke="#fef08a"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeDasharray="18 110"
              filter="url(#glow-amber)"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="128"
                to="0"
                dur="2.4s"
                repeatCount="indefinite"
              />
            </path>
            <circle cx="476" cy="146" r="7.5" fill="#090d16" stroke="#fbbf24" strokeWidth="1.75" />
            <circle cx="476" cy="146" r="3.2" fill="#fef3c7" filter="url(#glow-amber)" />
            <circle cx="550" cy="214" r="3.5" fill="#fef3c7" filter="url(#glow-amber)" />

            {/* 02 Top-Right Blue Connector */}
            <path
              d="M 724 146 C 690 146, 670 180, 650 214"
              stroke="#38bdf8"
              strokeWidth="2.2"
              strokeOpacity="0.65"
              filter="url(#glow-blue)"
            />
            <path
              d="M 650 214 C 670 180, 690 146, 724 146"
              stroke="#bae6fd"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeDasharray="18 110"
              filter="url(#glow-blue)"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="128"
                to="0"
                dur="2.6s"
                repeatCount="indefinite"
              />
            </path>
            <circle cx="724" cy="146" r="7.5" fill="#090d16" stroke="#38bdf8" strokeWidth="1.75" />
            <circle cx="724" cy="146" r="3.2" fill="#e0f2fe" filter="url(#glow-blue)" />
            <circle cx="650" cy="214" r="3.5" fill="#e0f2fe" filter="url(#glow-blue)" />

            {/* 03 Bottom-Left Emerald Connector */}
            <path
              d="M 474 374 C 506 374, 526 346, 546 316"
              stroke="#34d399"
              strokeWidth="2.2"
              strokeOpacity="0.65"
              filter="url(#glow-emerald)"
            />
            <path
              d="M 546 316 C 526 346, 506 374, 474 374"
              stroke="#a7f3d0"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeDasharray="18 110"
              filter="url(#glow-emerald)"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="128"
                to="0"
                dur="2.8s"
                repeatCount="indefinite"
              />
            </path>
            <circle cx="474" cy="374" r="7.5" fill="#090d16" stroke="#34d399" strokeWidth="1.75" />
            <circle cx="474" cy="374" r="3.2" fill="#d1fae5" filter="url(#glow-emerald)" />
            <polygon points="548,312 537,317 544,324" fill="#6ee7b7" filter="url(#glow-emerald)" />

            {/* 04 Bottom-Right Purple Connector */}
            <path
              d="M 726 374 C 694 374, 674 346, 654 316"
              stroke="#c084fc"
              strokeWidth="2.2"
              strokeOpacity="0.65"
              filter="url(#glow-purple)"
            />
            <path
              d="M 654 316 C 674 346, 694 374, 726 374"
              stroke="#e9d5ff"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeDasharray="18 110"
              filter="url(#glow-purple)"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="128"
                to="0"
                dur="2.5s"
                repeatCount="indefinite"
              />
            </path>
            <circle cx="726" cy="374" r="7.5" fill="#090d16" stroke="#c084fc" strokeWidth="1.75" />
            <circle cx="726" cy="374" r="3.2" fill="#f3e8ff" filter="url(#glow-purple)" />
            <polygon points="652,312 663,317 656,324" fill="#d8b4fe" filter="url(#glow-purple)" />
          </svg>

          {/* Central 3D Animated Globe Hub (Desktop Center, Mobile Top/Middle) */}
          <div className="relative lg:absolute lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 z-30 flex items-center justify-center my-6 lg:my-0 pointer-events-none select-none">
            <CentralGlobe3D />
          </div>

          {/* 4 Capability Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-y-12 lg:gap-x-[210px] xl:gap-x-[250px] items-center relative z-10 py-2 lg:py-6">
            {CAPABILITY_PILLARS.map((pillar, index) => (
              <CapabilityPillarCard
                key={pillar.number}
                pillar={pillar}
                index={index}
              />
            ))}
          </div>
        </div>

        {/* Optional Bottom CTA */}
        {ctaLabel && ctaHref && (
          <div className="mt-12 lg:mt-14 text-center relative z-20">
            <Link
              href={ctaHref}
              className="group relative inline-flex w-full sm:w-auto justify-center items-center gap-3 px-7 sm:px-8 py-3.5 text-[12px] sm:text-[13px] font-bold text-white bg-white/[0.04] hover:bg-white/[0.09] border border-amber-400/35 hover:border-amber-400/70 rounded-full uppercase tracking-[0.16em] transition-all duration-300 shadow-[0_0_25px_rgba(245,158,11,0.15)] hover:shadow-[0_0_32px_rgba(245,158,11,0.3)]"
            >
              <span>{ctaLabel}</span>
              <ArrowUpRight
                size={15}
                className="text-amber-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
              />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
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

export default function ServicesTimeline(props) { return <Feature name="services"><ServicesTimelineContent {...props} /></Feature>; }

function ServicesTimelineContent({
  sectionId = "services",
  maxGroups,
  maxServicesPerGroup,
  highlightedServices,
  ctaHref = "#contact",
  ctaLabel = "Initiate Request",
  theme = "dark",
}) {
  if (highlightedServices?.length) {
    return (
      <HighlightedCapabilitiesHub
        sectionId={sectionId}
        ctaHref={ctaHref}
        ctaLabel={ctaLabel}
      />
    );
  }

  return (
    <FullServicesTimeline
      sectionId={sectionId}
      maxGroups={maxGroups}
      maxServicesPerGroup={maxServicesPerGroup}
      ctaHref={ctaHref}
      ctaLabel={ctaLabel}
      theme={theme}
    />
  );
}

function FullServicesTimeline({
  sectionId = "services",
  maxGroups,
  maxServicesPerGroup,
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

  const visibleGroups = serviceGroups
    .slice(0, maxGroups ?? serviceGroups.length)
    .map((group) => ({
      ...group,
      services: group.services.slice(0, maxServicesPerGroup ?? group.services.length),
    }));

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

            {visibleGroups?.map((group) => (
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
            ))}
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
