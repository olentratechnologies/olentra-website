import dynamic from "next/dynamic";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Mission from "@/components/Mission";
import CreativeProcess from "@/components/CreativeProcess";
import JsonLd from "@/components/JsonLd";
import { buildMetadata, organizationSchema, websiteSchema } from "@/lib/seo";

const ImpactStats = dynamic(() => import("@/components/ImpactStats"), { ssr: true });
const StripeAnimation = dynamic(() => import("@/components/StripeAnimation"), { ssr: true });
const Testimonials = dynamic(() => import("@/components/Testimonials"), { ssr: true });
const ServicesTimeline = dynamic(() => import("@/components/ServicesTimeline"), { ssr: true });
const Products = dynamic(() => import("@/components/Products"), { ssr: true });
const LatestProjects = dynamic(() => import("@/components/LatestProjects"), { ssr: true });
const Blogs = dynamic(() => import("@/components/Blogs"), { ssr: true });

const ContactForm = dynamic(() => import("@/components/ContactForm"), { ssr: true });
const Footer = dynamic(() => import("@/components/Footer"), { ssr: true });
const ScrollToTopProgress = dynamic(() => import("@/components/ScrollToTopProgress"), { ssr: true });

export const metadata = buildMetadata({
  title: "Enterprise Engineering and AI Product Delivery",
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
  ],
});

export default function HomePage() {
  return (
    <main className="relative font-sans antialiased bg-[#020617] text-white">
      <JsonLd data={organizationSchema()} />
      <JsonLd data={websiteSchema()} />
      <Navbar />
      <div className="relative overflow-hidden">
        <Hero />
      </div>
      <Mission />
      <CreativeProcess />
      <StripeAnimation />
      <ServicesTimeline
        sectionId="services"
        maxGroups={3}
        maxServicesPerGroup={2}
        ctaHref="/services"
        ctaLabel="View All Services"
      />
      <ImpactStats />
      <Products />
      <LatestProjects />
      <Blogs />
      <section className="relative py-20 md:py-24 bg-[#020617]">
        <div className="absolute inset-0 bg-[url('/images/ui/grid.svg')] opacity-[0.05] pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 md:px-12 relative z-10">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 md:p-12 backdrop-blur-xl">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-4">
              Explore Olentra
            </p>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-[0.9]">
              Index-ready routes for enterprise discovery
            </h2>
            <p className="mt-4 text-slate-300 max-w-3xl leading-relaxed">
              Explore our services, products, company profile, and trusted policies through dedicated
              pages designed for search visibility and enterprise credibility.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {[
                { href: "/about", label: "About" },
                { href: "/services", label: "Services" },
                { href: "/products", label: "Products" },
                { href: "/blogs", label: "Blogs" },
                { href: "/contact", label: "Contact" },
                { href: "/privacy-policy", label: "Privacy" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex items-center px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.24em] border border-white/15 text-white hover:border-primary hover:text-primary transition-all"
                  style={{
                    clipPath:
                      "polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)",
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Testimonials />
      <ContactForm />
      <Footer />
      <ScrollToTopProgress />
    </main>
  );
}
