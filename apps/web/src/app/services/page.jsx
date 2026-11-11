"use client";

import { motion } from "framer-motion";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import ServicesTimeline from "@/components/ServicesTimeline";
import JsonLd from "@/components/JsonLd";
import PrimaryCtaBand from "@/components/site/PrimaryCtaBand";
import PageHero from "@/components/site/PageHero";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 }
};

export default function ServicesPage() {
  return (
    <main className="relative bg-[#020617] text-white font-sans selection:bg-primary/30 selection:text-white">
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Services", path: "/services" },
        ])}
      />
      <Navbar />
      <PageHero
        eyebrow="Service Cluster"
        title="Enterprise services designed for high-consequence delivery."
        description="Choose the capability cluster that matches your current stage, constraints, and growth priorities."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Services" },
        ]}
        primaryCta={{ href: "/#contact", label: "Schedule a Meeting" }}
        secondaryCta={{ href: "/products", label: "View Products" }}
        image="/images/backgrounds/cyber-bg.png"
        panelLabel="SERVICE_CLUSTER"
        panelTag="Capability Index"
      />

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <ServicesTimeline
          sectionId="services"
          ctaHref="/#contact"
          ctaLabel="Start Service Discussion"
          theme="light"
        />
      </motion.div>
      <Footer />
    </main>
  );
}
