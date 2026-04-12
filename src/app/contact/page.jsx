"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import JsonLd from "@/components/JsonLd";
import PageHero from "@/components/site/PageHero";
import { companyInfo } from "@/data/company";
import { buildMetadata, breadcrumbSchema, organizationSchema } from "@/lib/seo";

// Dynamically import Globe to avoid SSR issues
const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 }
};

// Globe data for company locations
const globeData = [
  { lat: 40.2737, lng: -76.8844, size: 0.15, color: '#00d4ff', label: 'Harrisburg, PA, USA' },
  { lat: 17.3850, lng: 78.4867, size: 0.15, color: '#00d4ff', label: 'Hyderabad, India' },
];

// Arcs data for connectivity
const arcsData = [
  {
    startLat: 40.2737,
    startLng: -76.8844,
    endLat: 17.3850,
    endLng: 78.4867,
    color: '#00d4ff',
    stroke: 1,
  },
];

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

      {/* Global Presence Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            {...fadeInUp}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              Global Product Engineering
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              With teams across continents, we deliver enterprise solutions worldwide, ensuring seamless collaboration and 24/7 support for your global ambitions.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
          >
            {/* Contact Form - Left Side */}
            <div>
              <ContactForm />
            </div>

            {/* Globe - Right Side */}
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-lg h-96">
                <Globe
                  globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
                  backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
                  width={600}
                  height={500}
                  autoRotate={true}
                  autoRotateSpeed={0.5}
                  pointsData={globeData}
                  pointColor="color"
                  pointAltitude={0.1}
                  pointRadius={0.05}
                  pointLabel="label"
                  arcsData={arcsData}
                  arcColor="color"
                  arcStroke={0.5}
                  arcDashLength={0.4}
                  arcDashGap={0.2}
                  arcDashAnimateTime={2000}
                  atmosphereColor="#00d4ff"
                  atmosphereAltitude={0.15}
                  onPointClick={(point) => {
                    // Optional: Handle click for location details
                    console.log('Clicked:', point.label);
                  }}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
