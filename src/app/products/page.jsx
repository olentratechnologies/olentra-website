"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import Products from "@/components/Products";
import JsonLd from "@/components/JsonLd";
import PrimaryCtaBand from "@/components/site/PrimaryCtaBand";
import PageHero from "@/components/site/PageHero";
import SectionIntro from "@/components/site/SectionIntro";
import { products } from "@/data/products_data";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo";

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

export default function ProductsPage() {
  const liveProducts = products.filter((product) => product.id !== "sentinel");
  const upcomingProducts = products.filter((product) => product.id === "sentinel");

  return (
    <main className="relative bg-[#020617] text-white font-sans selection:bg-primary/30 selection:text-white">
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Products", path: "/products" },
        ])}
      />
      <Navbar />
      <PageHero
        eyebrow="Product Ecosystem"
        title="Operational products built to scale enterprise outcomes."
        description="Olentra products are designed for teams that need reliable architecture, measurable workflows, and launch-ready execution quality."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Products" },
        ]}
        primaryCta={{ href: "/#contact", label: "Request Product Demo" }}
        secondaryCta={{ href: "/services", label: "Explore Services" }}
        image="/images/products/ai-studio-new.png"
        panelLabel="PRODUCT_SUITE"
        panelTag="Launch-Ready Platforms"
      />

      <Products light />

      <Footer />
    </main>
  );
}
