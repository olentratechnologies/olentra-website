"use client";

import Image from 'next/image';
import { Star } from 'lucide-react';
import { testimonials } from '../data/testimonials';
import styles from './testimonials.module.css';

export default function Testimonials() {
  return (
    <section
      data-testid="testimonials-section"
      data-theme="light"
      className="py-16 md:py-24 bg-white relative font-sans transition-colors duration-500 overflow-hidden"
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

        {/* Apple-grade hardware-accelerated compositor marquee */}
        <div className={styles.marqueeContainer}>
          <div data-marquee-track className={styles.marqueeTrack}>
            {[0, 1].map((set) => (
              <div
                key={set}
                data-marquee-set
                aria-hidden={set === 1}
                className={styles.marqueeSet}
              >
                {testimonials.map((item, idx) => (
                  <article
                    key={`${item.name}-${idx}`}
                    tabIndex={set === 0 ? 0 : -1}
                    className="w-[280px] md:w-[320px] min-h-[220px] rounded-xl border border-slate-100 bg-slate-50/50 backdrop-blur-sm p-6 flex flex-col justify-between hover:border-primary/30 hover:bg-white hover:shadow-lg hover:shadow-slate-200/40 transition-all duration-300 group inline-block whitespace-normal transform-gpu"
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
                        <span className="font-bold text-[13px] text-slate-900 tracking-tight">
                          {item.name}
                        </span>
                        <span className="text-[9px] uppercase tracking-widest font-black text-blue-800">
                          {item.role}
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
