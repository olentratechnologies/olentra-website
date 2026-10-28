"use client";

import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import Image from 'next/image';
import { Star } from 'lucide-react';

import { testimonials } from '../data/testimonials';
gsap.registerPlugin(useGSAP);

// Double the items for seamless infinite loop
const combinedTestimonials = [...testimonials, ...testimonials];

export default function Testimonials() {
  const root = useRef(null);
  useGSAP(() => {
    const track = root.current.querySelector('[data-marquee-track]');
    const firstSet = track.querySelector('[data-marquee-set]');
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      let tween;
      let inView = false;
      const sync = () => {
        if (!tween) return;
        if (inView && !document.hidden) tween.play();
        else tween.pause();
      };
      const measure = () => {
        const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
        // Include the gap between the duplicate sets for a seamless wrap.
        const distance = firstSet.getBoundingClientRect().width + gap;
        if (!distance) return;
        const x = Number.parseFloat(gsap.getProperty(track, 'x')) || 0;
        tween?.kill();
        tween = gsap.fromTo(track, { x: 0 }, {
          x: -distance, duration: distance / 37.5, ease: 'none',
          repeat: -1, paused: true,
        });
        tween.progress((( -x % distance) + distance) % distance / distance);
        sync();
      };
      measure();
      const resize = new ResizeObserver(measure);
      resize.observe(firstSet);
      const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); });
      observer.observe(root.current);
      const visibility = sync;
      document.addEventListener('visibilitychange', visibility);
      return () => { resize.disconnect(); observer.disconnect(); document.removeEventListener('visibilitychange', visibility); tween?.kill(); };
    });
    return () => media.revert();
  }, { scope: root });
  return (
    <section
      data-testid="testimonials-section"
      data-theme="light"
      ref={root}
      className="py-16 md:py-24 bg-white relative font-sans transition-colors duration-500"
    >
      <div className="absolute inset-0 bg-cyber-grid-light pointer-events-none" />

      <div className="relative z-10">
        <div className="text-center mb-12 px-4">
          <p className="text-[10px] md:text-xs uppercase tracking-[0.25em] text-blue-800 font-bold mb-3">
            USER LOGS
          </p>
          <h2 className="text-[1.5rem] md:text-[2.6rem] font-black text-slate-900 uppercase tracking-widest leading-[0.95]">
            System Feedback
          </h2>
        </div>

        {/* Marquee Container */}
        <div className="relative flex overflow-hidden py-6 focus-within:[&_[data-marquee-track]]:pause">
          <div data-marquee-track className="flex gap-4 whitespace-nowrap hover:[animation-play-state:paused]">
            {[0, 1].map((set) => <div key={set} data-marquee-set aria-hidden={set === 1} className="flex shrink-0 gap-4">
            {testimonials.map((item, idx) => (
              <article
                key={`${item.name}-${idx}`}
                tabIndex={set === 0 ? 0 : -1}
                className="w-[280px] md:w-[320px] min-h-[220px] rounded-xl border border-slate-100 bg-slate-50/50 backdrop-blur-sm p-6 flex flex-col justify-between hover:border-primary/30 hover:bg-white hover:shadow-lg hover:shadow-slate-200/40 transition-all duration-300 group inline-block whitespace-normal"
              >
                <div>
                  <div className="flex items-center gap-1 text-blue-800 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={11} className="fill-current" />
                    ))}
                  </div>
                  <blockquote className="text-[0.85rem] md:text-[0.95rem] leading-relaxed italic text-slate-700 font-medium">
                    "{item.quote}"
                  </blockquote>
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-primary">
                    <Image
                      src={item.avatar}
                      alt={item.name}
                      width={36}
                      height={36}
                      className="object-cover"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-[13px] text-slate-900 tracking-tight">{item.name}</span>
                    <span className="text-[9px] uppercase tracking-widest font-black text-blue-800">
                      {item.role}
                    </span>
                  </div>
                </div>
              </article>
            ))}</div>)}
          </div>
        </div>
      </div>
    </section>
  );
}
