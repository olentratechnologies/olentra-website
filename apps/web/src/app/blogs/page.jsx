"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, CheckCircle2, Sparkles } from "lucide-react";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import JsonLd from "@/components/JsonLd";
import PrimaryCtaBand from "@/components/site/PrimaryCtaBand";
import PageHero from "@/components/site/PageHero";
import SectionIntro from "@/components/site/SectionIntro";
import { blogs } from "@/data/blogs";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import { Feature } from "@olentra/site-features/react";

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

export default function BlogsPage() {
  return (
    <main className="relative bg-[#020617] text-white font-sans selection:bg-primary/30 selection:text-white">
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Blogs", path: "/blogs" },
        ])}
      />
      <Navbar />
      <Feature name="blogPage.hero"><PageHero
        eyebrow="Editorial Stream"
        title="Field notes from enterprise product delivery."
        description="Explore practical insights on engineering execution, AI operations, frontend performance, and growth systems."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Blogs" },
        ]}
        primaryCta={{ href: "/#contact", label: "Discuss Your Project" }}
        secondaryCta={{ href: "/services", label: "Explore Services" }}
        image="/images/products/ai-studio-new.png"
        panelLabel="EDITORIAL_OS"
        panelTag="Delivery-Backed Insights"
      /></Feature>

      <Feature name="blogPage.list"><section id="blog-section" className="relative py-24 md:py-28 bg-white text-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-cyber-grid-light opacity-[0.05] pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 md:px-12 relative z-10">
          <motion.div {...fadeInUp}>
            <SectionIntro
              eyebrow="Latest Articles"
              title="Enterprise delivery"
              accent="knowledge base"
              description="A curated set of implementation insights for founders, product leaders, and engineering teams."
            />
          </motion.div>

          <motion.div
            {...staggerContainer}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {blogs.map((blog) => (
              <motion.article
                key={blog.slug}
                variants={fadeInUp}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 shadow-lg shadow-slate-200/40 transition-all duration-500 hover:-translate-y-1 hover:border-primary/40 hover:bg-white"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image
                    src={blog.image}
                    alt={blog.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 380px"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                </div>

                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary">
                      {blog.category}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                      {blog.readTime}
                    </span>
                  </div>

                  <h2 className="text-xl md:text-2xl font-black uppercase leading-tight tracking-tight text-slate-900">
                    {blog.title}
                  </h2>

                  <p className="text-[13px] text-slate-600 leading-relaxed">{blog.excerpt}</p>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                      {blog.date}
                    </span>
                    <Link
                      href={blog.href}
                      className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary"
                    >
                      Read Article
                      <Sparkles className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section></Feature>

      <Footer />
    </main>
  );
}
