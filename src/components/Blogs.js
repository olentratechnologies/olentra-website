"use client";

import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { blogs } from "../data/blogs";

export default function Blogs() {
  return (
    <section
      id="blog-section"
      data-testid="blogs-section"
      className="relative bg-[#020617] text-white py-16 md:py-24 overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.12),_transparent_55%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.08] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 md:px-12 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-12 md:mb-16">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-px bg-primary/60" />
              <p className="text-[10px] md:text-xs font-black text-primary uppercase tracking-[0.5em]">Blog Dispatch</p>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black uppercase leading-[0.9] tracking-tighter">
              Latest <br /> <span className="text-primary italic">Insights</span>
            </h2>
          </div>
          <div className="max-w-[320px] space-y-4 border-l-2 border-primary/30 pl-8 py-1.5">
            <p className="text-[10px] md:text-[13px] font-semibold text-slate-300 tracking-widest uppercase leading-relaxed">
              Field notes on strategy, delivery, and high-velocity software engineering.
            </p>
            <div className="flex items-center gap-2 text-primary font-black text-[9px] tracking-[0.2em] uppercase">
              Updated Monthly
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {blogs.map((blog) => (
            <a
              key={blog.title}
              href={blog.href}
              className="group relative overflow-hidden rounded-sm border border-white/10 bg-white/5 backdrop-blur-xl transition-all duration-500 hover:border-primary/60 hover:shadow-[0_20px_60px_rgba(37,99,235,0.2)]"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/10 via-transparent to-indigo-500/10" />

              <div className="relative">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image
                    src={blog.image}
                    alt={blog.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 380px"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent opacity-80" />
                </div>
              </div>

              <div className="relative z-10 space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary">
                    {blog.category}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    {blog.readTime}
                  </span>
                </div>

                <h3 className="text-xl md:text-2xl font-black uppercase leading-tight tracking-tight">
                  {blog.title}
                </h3>

                <p className="text-[12px] md:text-[13px] text-slate-300 leading-relaxed">
                  {blog.excerpt}
                </p>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    {blog.date}
                  </span>
                  <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                    Read
                    <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
