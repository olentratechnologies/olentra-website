import dynamic from "next/dynamic";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Mission from "@/components/Mission";
import CreativeProcess from "@/components/CreativeProcess";
import JsonLd from "@/components/JsonLd";
import { Feature } from "@/components/site-features";
import { buildMetadata, organizationSchema, websiteSchema } from "@/lib/seo";

const ImpactStats = dynamic(() => import("@/components/ImpactStats"), { ssr: true });
const StripeAnimation = dynamic(() => import("@/components/StripeAnimation"), { ssr: true });
const ServicesTimeline = dynamic(() => import("@/components/ServicesTimeline"), { ssr: true });
const Products = dynamic(() => import("@/components/Products"), { ssr: true });
const LatestProjects = dynamic(() => import("@/components/LatestProjects"), { ssr: true });
const Blogs = dynamic(() => import("@/components/Blogs"), { ssr: true });
const Testimonials = dynamic(() => import("@/components/Testimonials"), { ssr: true });
const GlobeSection = dynamic(() => import("@/components/GlobeSection"));

const ContactForm = dynamic(() => import("@/components/ContactForm"), { ssr: true });
const Footer = dynamic(() => import("@/components/Footer"), { ssr: true });
const ScrollToTopProgress = dynamic(() => import("@/components/ScrollToTopProgress"), { ssr: true });

export const metadata = buildMetadata({
  title: "",
  description:
    "Olentra Technologies delivers enterprise software engineering, cloud systems, data and AI platforms, and high-performance digital product execution.",
  path: "/",
  image: "/images/branding/og/og-home.jpg",
  keywords: [
    "enterprise software engineering",
    "ai product development company",
    "platform engineering partner",
    "cloud and security engineering",
    "digital product delivery",
    "olentra technologies",
  ],
});

export default function HomePage() {
  return (
    <main className="relative font-sans antialiased bg-[#070b12] text-white">
      <JsonLd data={organizationSchema()} />
      <JsonLd data={websiteSchema()} />
      <Navbar />
      <div className="relative overflow-hidden">
        <Hero />
      </div>
      <Mission />
      <CreativeProcess />
      <StripeAnimation />
      <Feature name="services"><ServicesTimeline
        sectionId="services"
        highlightedServices={[
          "AI Solutions",
          "Real-Time Systems",
          "Cloud Architecture",
          "Security & Compliance"
        ]}
        ctaHref="/services"
        ctaLabel="View All Services"
      /></Feature>
      <ImpactStats />
      <Feature name="products"><Products /></Feature>
      <LatestProjects />
      <Feature name="blog"><Blogs /></Feature>
      <Testimonials />
      
      {/* Global Presence Section - White Theme */}
      <section className="bg-white py-12 md:py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/ui/grid.svg')] opacity-[0.03] pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 md:px-12 relative z-10">
          <div className="text-center mb-8">
            <div className="inline-block px-3 py-1 rounded-full bg-slate-100 border border-slate-200 mb-3 font-black text-[9px] tracking-[0.3em] text-primary uppercase">
              GLOBAL PRESENCE
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Global Product Engineering
            </h2>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed">
              With teams across continents, we deliver enterprise solutions worldwide, ensuring seamless collaboration and 24/7 support for your global ambitions.
            </p>
          </div>

          {/* Globe Section - White Theme */}
          <GlobeSection />
        </div>
      </section>
      
      <ContactForm />
      <Footer />
      <ScrollToTopProgress />
    </main>
  );
}
