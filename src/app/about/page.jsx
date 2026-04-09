"use client";

import { motion } from "framer-motion";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import JsonLd from "@/components/JsonLd";
import PrimaryCtaBand from "@/components/site/PrimaryCtaBand";
import PageHero from "@/components/site/PageHero";
import SectionIntro from "@/components/site/SectionIntro";
import { companyInfo } from "@/data/company";
import { servicePages } from "@/data/service_pages";
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
        primaryCta={{ href: "/contact", label: "Start a Conversation" }}
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

      <section className="relative py-24 md:py-28 bg-[#020617] overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/ui/grid.svg')] opacity-[0.06] pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 md:px-12 relative">
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
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {companyInfo.locations.map((location) => (
              <motion.article
                key={location}
                variants={fadeInUp}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl"
              >
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-3">
                  Delivery Base
                </p>
                <h3 className="text-2xl font-black uppercase tracking-tight text-white">{location}</h3>
                <p className="mt-4 text-slate-400">
                  Enterprise delivery with clear communication, milestone cadence, and operational visibility.
                </p>
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
              eyebrow="Service Coverage"
              title="Engagement domains"
              accent="at launch"
              description="Core enterprise service categories available for immediate partnership and delivery."
            />
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {servicePages.map((service) => (
              <motion.article
                key={service.slug}
                variants={fadeInUp}
                className="rounded-2xl border border-slate-200 bg-slate-50/80 p-7 shadow-lg shadow-slate-200/40"
              >
                <h3 className="text-lg md:text-xl font-black uppercase tracking-tight text-slate-900">
                  {service.name}
                </h3>
                <p className="mt-3 text-slate-600 leading-relaxed">{service.intro}</p>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
      >
        <PrimaryCtaBand
          eyebrow="Next Step"
          title="Bring Olentra into your next build cycle."
          description="Share your current goals, constraints, and timelines. We will help scope the fastest path to secure, launch-ready execution."
          primaryCta={{ href: "/contact", label: "Book Discovery Call" }}
          secondaryCta={{ href: "/services", label: "Review Capabilities" }}
        />
      </motion.div>

      <Footer />
    </main>
  );
}
