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
        primaryCta={{ href: "/contact", label: "Request Product Demo" }}
        secondaryCta={{ href: "/services", label: "Explore Services" }}
        image="/images/products/ai-studio-new.png"
        panelLabel="PRODUCT_SUITE"
        panelTag="Launch-Ready Platforms"
      />

      <Products />

      <section className="relative py-24 md:py-28 bg-white text-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-cyber-grid-light opacity-[0.05] pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 md:px-12 relative z-10">
          <motion.div {...fadeInUp}>
            <SectionIntro
              eyebrow="Launch Portfolio"
              title="Current and upcoming"
              accent="product tracks"
              description="Active product lines available for demo, deployment support, and tailored rollout planning."
            />
          </motion.div>

          <motion.div
            {...staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {liveProducts.map((product) => (
              <motion.article
                key={product.id}
                variants={fadeInUp}
                className="rounded-2xl border border-slate-200 bg-slate-50/80 p-8 shadow-lg shadow-slate-200/40"
              >
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-primary mb-3">
                  Active Product
                </p>
                <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">
                  {product.title}
                </h3>
                <p className="mt-3 text-slate-600 leading-relaxed">{product.description}</p>
                <Link
                  href={product.href}
                  className="mt-6 inline-flex items-center px-6 py-3 text-[11px] font-black uppercase tracking-[0.24em] border border-slate-300 text-slate-900 hover:border-primary hover:text-primary transition-all"
                  style={{
                    clipPath:
                      "polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)",
                  }}
                >
                  Open product page
                </Link>
              </motion.article>
            ))}

            {upcomingProducts.map((product) => (
              <motion.article
                key={product.id}
                variants={fadeInUp}
                className="rounded-2xl border border-slate-200 bg-slate-50/80 p-8 shadow-lg shadow-slate-200/40"
              >
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-primary mb-3">
                  Upcoming Product
                </p>
                <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">
                  {product.title}
                </h3>
                <p className="mt-3 text-slate-600 leading-relaxed">{product.description}</p>
                <p className="mt-6 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Status: {product.status} | Commercial model: {product.price}
                </p>
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
          eyebrow="Product Discovery"
          title="Choose the product lane that matches your goals."
          description="Whether you need AI product acceleration or conversion-focused outbound operations, we can map the right deployment path."
          primaryCta={{ href: "/contact", label: "Book Product Call" }}
          secondaryCta={{ href: "/blogs", label: "Read Insights" }}
        />
      </motion.div>
      <Footer />
    </main>
  );
}
