"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import JsonLd from "@/components/JsonLd";
import PageHero from "@/components/site/PageHero";
import GlobeSection from "@/components/GlobeSection";
import { companyInfo } from "@/data/company";
import { buildMetadata, breadcrumbSchema, organizationSchema } from "@/lib/seo";

// Custom styles for circular globe with completely transparent background
const customStyles = `
  .clip-circle {
    clip-path: circle(50% at 50% 50%);
    background: transparent !important;
  }
  
  .clip-circle canvas {
    border-radius: 50% !important;
    background: transparent !important;
  }
  
  .clip-circle .globe-container {
    background: transparent !important;
  }
  
  .clip-circle * {
    background: transparent !important;
  }
  
  .globe-canvas {
    background: transparent !important;
  }
  
  canvas {
    background: transparent !important;
  }
`;

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 }
};

export default function ContactPage() {

  return (
    <>
      <style jsx global>{customStyles}</style>
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

      {/* Worldwide Locations Section - White Theme */}
      <section className="bg-white py-20 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/ui/grid.svg')] opacity-[0.03] pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 md:px-12 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-center mb-16"
          >
            <div className="inline-block px-3 py-1 rounded-full bg-slate-100 border border-slate-200 mb-5 font-black text-[9px] tracking-[0.3em] text-primary uppercase">
              WORLDWIDE LOCATIONS
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
              Teams Across Time Zones
            </h2>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Our distributed teams ensure 24/7 support and seamless collaboration across continents.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {[
              { city: "Harrisburg", country: "USA", flag: "USA", time: "EST", timezone: "Eastern Time" },
              { city: "Hyderabad", country: "India", flag: "IND", time: "IST", timezone: "India Standard Time" },
              { city: "London", country: "UK", flag: "UK", time: "GMT", timezone: "Greenwich Mean Time" },
              { city: "Singapore", country: "Singapore", flag: "SGP", time: "SGT", timezone: "Singapore Time" }
            ].map((location, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group cursor-pointer relative overflow-hidden rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-3xl transition-all duration-500 hover:border-primary/60 hover:shadow-[0_20px_60px_rgba(37,99,235,0.15)] h-full w-full"
              >
                {/* Glow Effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/5 via-transparent to-indigo-500/5" />
                
                <div className="relative z-10 p-6 flex flex-col h-full">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-5">
                    <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary shadow-[0_0_20px_rgba(37,99,235,0.15)]">
                      <div className="w-6 h-6 flex items-center justify-center text-[10px] font-black">
                        {location.flag}
                      </div>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-slate-900/80 border border-slate-200 text-[9px] font-black text-slate-300 uppercase tracking-widest">
                      {location.time}
                    </div>
                  </div>

                  {/* Location Info */}
                  <div className="flex-1">
                    <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight mb-2 group-hover:text-primary transition-colors">
                      {location.city}
                    </h3>
                    
                    <p className="text-slate-600 text-[12px] md:text-[13px] leading-relaxed mb-4">
                      {location.country}
                    </p>

                    <div className="space-y-2">
                      <div className="flex items-center">
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{location.timezone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-4 border-t border-slate-200 mt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Region</p>
                        <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">{location.flag}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                        <div className="w-2 h-2 rounded-full bg-current" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>


      {/* Global Presence Section - White Theme */}
      <section className="bg-white py-12 md:py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/ui/grid.svg')] opacity-[0.03] pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 md:px-12 relative z-10">
          <motion.div
            {...fadeInUp}
            className="text-center mb-8"
          >
            <div className="inline-block px-3 py-1 rounded-full bg-slate-100 border border-slate-200 mb-3 font-black text-[9px] tracking-[0.3em] text-primary uppercase">
              GLOBAL PRESENCE
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Global Product Engineering
            </h2>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed">
              With teams across continents, we deliver enterprise solutions worldwide, ensuring seamless collaboration and 24/7 support for your global ambitions.
            </p>
          </motion.div>

          {/* Globe Section - White Theme */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
          >
            <GlobeSection />
          </motion.div>
        </div>
      </section>

      <ContactForm />
      <Footer />
      </main>
    </>
  );
}
