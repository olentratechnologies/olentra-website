"use client";

import { motion } from "framer-motion";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import JsonLd from "@/components/JsonLd";
import PrimaryCtaBand from "@/components/site/PrimaryCtaBand";
import PageHero from "@/components/site/PageHero";
import SectionIntro from "@/components/site/SectionIntro";
import Link from "next/link";
import { ShieldCheck, Zap, GitCommit, Layers, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { companyInfo } from "@/data/company";
import { buildMetadata, breadcrumbSchema, organizationSchema } from "@/lib/seo";

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

export default function AboutPage() {
  return (
    <main className="relative bg-[#020617] text-white font-sans selection:bg-primary/30 selection:text-white">
      <JsonLd data={organizationSchema()} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "About", path: "/about" },
        ])}
      />

      <Navbar />
      <PageHero
        eyebrow="Company Profile"
        title="Enterprise engineering with measurable delivery discipline."
        description={companyInfo.description}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "About" },
        ]}
        primaryCta={{ href: "/#contact", label: "Start a Conversation" }}
        secondaryCta={{ href: "/services", label: "Explore Services" }}
        image="/images/backgrounds/cyber-bg.png"
        panelLabel="ABOUT_OLENTRA"
        panelTag="Corporate Profile"
      />

      <section className="relative py-24 md:py-28 bg-white text-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-cyber-grid-light opacity-[0.05] pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 md:px-12 relative z-10">
          <motion.div {...fadeInUp}>
            <SectionIntro
              eyebrow="Company Core"
              title="How we operate"
              accent="with clients"
              description="A delivery model built for leadership teams that care about reliability, accountability, and shipping outcomes."
            />
          </motion.div>

          <motion.div
            {...staggerContainer}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {companyInfo.differentiators.map((item) => (
              <motion.article
                key={item.title}
                variants={fadeInUp}
                className="rounded-2xl border border-slate-200 bg-slate-50/80 p-7 shadow-lg shadow-slate-200/40"
              >
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 mb-4">
                  {item.title}
                </h3>
                <p className="text-slate-600 leading-relaxed">{item.description}</p>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="relative py-20 md:py-24 bg-[#070b12] text-white overflow-hidden border-y border-white/10 isolate">
        {/* Ambient grid texture */}
        <div
          className="absolute inset-0 z-[-1] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(#a5c9ff08 1px, transparent 1px), linear-gradient(90deg, #a5c9ff08 1px, transparent 1px)",
            backgroundSize: "80px 80px",
            maskImage: "radial-gradient(circle at center, #000 50%, transparent 90%)",
            WebkitMaskImage: "radial-gradient(circle at center, #000 50%, transparent 90%)",
          }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 md:px-12 relative z-10">
          <motion.div {...fadeInUp}>
            <SectionIntro
              dark
              eyebrow="Operating Geography"
              title="Built for"
              accent="global teams"
              description="Olentra works across geographies and time zones to support distributed product and platform initiatives."
            />
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
            className="mt-8"
          >
            {companyInfo.locations.map((location) => (
              <motion.article
                key={location}
                variants={fadeInUp}
                className="relative rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8 md:p-10 overflow-hidden shadow-2xl"
              >
                <div className="absolute top-0 left-0 w-24 h-1 bg-gradient-to-r from-primary to-transparent" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">
                        Delivery Base
                      </span>
                    </div>
                    <h3 className="text-3xl md:text-4xl font-[950] uppercase tracking-tight text-white">
                      {location}
                    </h3>
                  </div>
                  <div className="md:max-w-md border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-8">
                    <p className="text-slate-300 text-sm md:text-base leading-relaxed font-medium">
                      Enterprise delivery with clear communication, milestone cadence, and operational visibility across time zones.
                    </p>
                  </div>
                </div>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="relative py-24 md:py-28 bg-white text-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-cyber-grid-light opacity-[0.05] pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 md:px-12 relative z-10">
          <motion.div {...fadeInUp}>
            <SectionIntro
              eyebrow="Delivery Standards"
              title="Execution"
              accent="commitments"
              description="How we guarantee speed, transparency, and architectural integrity across every client partnership."
            />
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {[
              {
                icon: ShieldCheck,
                number: "01",
                title: "Security & Governance",
                description:
                  "Zero shortcuts on compliance. Encryption at rest and in transit, strict secret rotation, and role-based operational policies baked into every repository.",
              },
              {
                icon: GitCommit,
                number: "02",
                title: "Milestone Cadence",
                description:
                  "Bi-weekly demo releases with continuous CI/CD preview builds. Transparent burn-up reporting and direct Slack/Teams communication with lead engineers.",
              },
              {
                icon: Zap,
                number: "03",
                title: "Production Velocity",
                description:
                  "From sprint zero through launch, our teams build with modular design systems, automated test suites, and zero handover drag.",
              },
              {
                icon: Layers,
                number: "04",
                title: "Archival & Ownership",
                description:
                  "100% intellectual property ownership from day one. Clean documentation, structured IaC scripts, and full architectural enablement for your internal team.",
              },
            ].map((pillar) => (
              <motion.article
                key={pillar.title}
                variants={fadeInUp}
                className="group relative rounded-2xl border border-slate-200 bg-slate-50/70 p-7 shadow-sm transition-all duration-300 hover:bg-white hover:border-primary/40 hover:shadow-xl hover:shadow-blue-500/5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                      <pillar.icon size={20} />
                    </div>
                    <span className="font-mono text-xs font-black text-slate-300 group-hover:text-primary transition-colors">
                      {pillar.number}
                    </span>
                  </div>
                  <h3 className="text-base font-black uppercase tracking-tight text-slate-900 mb-2.5">
                    {pillar.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {pillar.description}
                  </p>
                </div>
              </motion.article>
            ))}
          </motion.div>

          {/* Quick link banner to services */}
          <div className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-6 md:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-1">
                Explore Capabilities
              </p>
              <h4 className="text-xl font-black text-slate-900 tracking-tight">
                Looking for detailed technical capabilities and lanes?
              </h4>
            </div>
            <Link
              href="/services"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-slate-900 hover:bg-primary text-white text-xs font-black uppercase tracking-[0.18em] transition-all shrink-0 shadow-md"
            >
              <span>View All Services</span>
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
