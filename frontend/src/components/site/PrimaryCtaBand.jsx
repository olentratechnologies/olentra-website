"use client";

import Link from "next/link";
import { useSiteFeatures } from "@/components/site-features";

export default function PrimaryCtaBand({ eyebrow, title, description, primaryCta, secondaryCta }) {
  const { isVisibleHref } = useSiteFeatures();
  return (
    <section className="relative pt-16 md:pt-20 pb-0 bg-[#070b12]">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <div className="relative rounded-[32px] overflow-hidden bg-primary p-12 md:p-16 shadow-[0_40px_80px_rgba(37,99,235,0.35)]">
          <div className="absolute inset-0 bg-[url('/images/ui/grid.svg')] opacity-10 pointer-events-none" />
          <div className="relative z-10 max-w-3xl space-y-6">
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/80">{eyebrow}</p>
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-[0.88] text-white">
              {title}
            </h2>
            <p className="text-white/90 leading-relaxed max-w-2xl">{description}</p>
            <div className="flex flex-col sm:flex-row gap-4">
              {primaryCta && isVisibleHref(primaryCta.href) && <Link
                href={primaryCta.href}
                className="inline-flex items-center justify-center gap-3 px-10 py-4 text-[13px] font-black uppercase tracking-[0.3em] bg-white text-primary hover:scale-105 active:scale-95 transition-all"
                style={{
                  clipPath:
                    "polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%)",
                }}
              >
                {primaryCta.label}
              </Link>}
              {secondaryCta && isVisibleHref(secondaryCta.href) ? (
                <Link
                  href={secondaryCta.href}
                  className="inline-flex items-center justify-center gap-3 px-10 py-4 text-[13px] font-black uppercase tracking-[0.3em] border border-white/30 bg-white/10 text-white hover:bg-white/15 transition-all"
                  style={{
                    clipPath:
                      "polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%)",
                  }}
                >
                  {secondaryCta.label}
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
