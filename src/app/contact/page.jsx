"use client";

import { motion } from "framer-motion";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import JsonLd from "@/components/JsonLd";
import PageHero from "@/components/site/PageHero";
import { companyInfo } from "@/data/company";
import { buildMetadata, breadcrumbSchema, organizationSchema } from "@/lib/seo";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 }
};

export default function ContactPage() {
  return (
    <main className="relative bg-[#020617] text-white font-sans selection:bg-primary/30 selection:text-white">
      <JsonLd data={organizationSchema()} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Contact", path: "/contact" },
        ])}
      />

      <Navbar />
      <PageHero
        eyebrow="Contact Channel"
        title="Start your next enterprise build with Olentra."
        description="Tell us what you are building, what constraints matter, and where execution is blocked. We will align on scope and delivery strategy."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Contact" },
        ]}
        primaryCta={{ href: companyInfo.calendlyUrl, label: "Book Discovery Call" }}
        secondaryCta={{ href: "/services", label: "Explore Services" }}
        image="/images/products/ai-studio-new.png"
        panelLabel="CONTACT_GATEWAY"
        panelTag="Engagement Intake"
      />

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
      >
        <ContactForm />
      </motion.div>

      <Footer />
    </main>
  );
}
