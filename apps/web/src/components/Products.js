"use client";

import { Feature, useSiteFeatures } from "@olentra/site-features/react";
import Image from 'next/image';
import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { products } from '../data/products-data';
import ProductLogo from './products/ProductLogo';
gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function Products(props) { return <Feature name="products"><ProductsContent {...props} /></Feature>; }

function ProductsContent({ light = false }) {
    const section = useRef(null);
    const { isVisibleHref } = useSiteFeatures();
    const visibleProducts = products.filter((product) => isVisibleHref(product.href));
    useGSAP(() => {
        const cards = gsap.utils.toArray('[data-product-card]', section.current);
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        gsap.fromTo(cards, { y: 36, autoAlpha: 0 }, {
            y: 0, autoAlpha: 1, duration: 0.65, stagger: 0.11, ease: 'power3.out', immediateRender: false,
            scrollTrigger: { trigger: section.current, start: 'top 78%', once: true },
        });
    }, { scope: section });
    if (!visibleProducts.length) return null;
    return (
        <section
            ref={section}
            id="products"
            className="relative py-24 md:py-32 overflow-hidden isolate"
            style={{
                background: light ? "#ffffff" : "radial-gradient(ellipse at 65% 48%, #152943 0, transparent 50%), linear-gradient(110deg, #070b12, #0b111b)",
            }}
        >
            {/* Founders Hero Grid Texture */}
            <div
                className="absolute inset-0 z-[-1] pointer-events-none"
                style={{
                    backgroundImage:
                        "linear-gradient(#a5c9ff06 1px, transparent 1px), linear-gradient(90deg, #a5c9ff06 1px, transparent 1px)",
                    backgroundSize: "100px 100px",
                    maskImage: "linear-gradient(transparent, #000, transparent)",
                    WebkitMaskImage: "linear-gradient(transparent, #000, transparent)",
                }}
            />

            <div className="max-w-6xl mx-auto px-6 md:px-12 relative z-10">
                <div className="mb-20">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="w-8 h-px bg-primary/40" />
                        <p className="text-[10px] md:text-xs font-black text-primary uppercase tracking-[0.4em]">Proprietary Technology</p>
                    </div>
                    <h2 className={`text-[clamp(1.8rem,5vw,3.5rem)] font-black ${light ? "text-slate-900" : "text-white"} uppercase leading-[0.9] tracking-tighter mb-6`}>
                        Intelligent <br /> <span className="text-primary italic">Product Ecosystem</span>
                    </h2>
                </div>

                <div className={`grid gap-6 md:gap-8 ${GRID_LAYOUTS[Math.min(visibleProducts.length, 3)]}`}>
                    {visibleProducts.map((product, index) => (
                        <ProductCard key={product.id} product={product} index={index} light={light} count={visibleProducts.length} />
                    ))}
                </div>
            </div>
        </section>
    );
}

// Columns follow how many products are visible, so the row is always filled.
const GRID_LAYOUTS = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
};

function ProductCard({ product, index, light, count = 3 }) {
    const Icon = product.icon;
    // A lone product becomes a wide card (artwork beside the details); two products get a shorter, wider artwork panel.
    const single = count === 1, pair = count === 2;

    return (
        <Link href={product.href} className="flex">
            <div data-product-card
                className={`group cursor-pointer relative overflow-hidden rounded-2xl border ${light ? "border-slate-200" : "border-white/10"} ${light ? "bg-white" : "bg-white/5"} backdrop-blur-3xl transition-all duration-500 hover:border-primary/60 hover:shadow-[0_20px_60px_rgba(37,99,235,0.2)] h-full w-full flex flex-col ${single ? "lg:flex-row" : ""}`}
            >
                {/* Glow Effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/10 via-transparent to-indigo-500/10" />

                <div className={`relative ${single ? "lg:w-1/2 lg:shrink-0" : ""}`}>
                    <div className={`relative overflow-hidden bg-white/[0.03] flex items-center justify-center ${single ? "aspect-[16/10] lg:aspect-auto lg:h-full lg:min-h-[380px]" : pair ? "aspect-[16/10] md:aspect-[16/9] lg:aspect-[2/1]" : "aspect-[16/10]"}`}>
                        {product.logo ? (
                            <div className={`absolute inset-0 flex items-center justify-center overflow-hidden p-3 ${light ? "bg-slate-50" : "bg-transparent"}`}>
                                <ProductLogo product={product.id} variant="card" decorative className="transition-transform duration-700 group-hover:scale-105" />
                            </div>
                        ) : (
                        <Image
                            src={product.image}
                            alt={product.title}
                            fill
                            sizes={single || pair ? "(max-width: 768px) 100vw, 560px" : "(max-width: 768px) 100vw, 380px"}
                            className={
                                product.image.includes('DailySupply.jpeg')
                                    ? "object-contain p-6 bg-white transition-transform duration-700 group-hover:scale-95"
                                    : "object-cover transition-transform duration-700 group-hover:scale-105"
                            }
                        />
                        )}
                        {!product.logo && !product.image.includes('DailySupply.jpeg') && (
                            <div className={`absolute inset-0 bg-gradient-to-t ${light ? "from-white" : "from-[#070b12]"} via-transparent to-transparent opacity-80`} />
                        )}
                    </div>
                </div>

                <div className={`relative z-10 p-6 flex flex-col flex-1 ${single ? "lg:p-10 lg:justify-center" : pair ? "md:p-8" : ""}`}>
                    <div className="flex items-start justify-between mb-5">
                        {!product.logo && <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary shadow-[0_0_20px_rgba(37,99,235,0.2)]">
                            <Icon size={18} strokeWidth={2.5} />
                        </div>}
                        <div className={`${product.logo ? "ml-auto " : ""}px-3 py-1 rounded-full ${light ? "bg-slate-100" : "bg-slate-900/80"} border ${light ? "border-slate-200" : "border-white/10"} text-[9px] font-black ${light ? "text-slate-600" : "text-slate-300"} uppercase tracking-widest`}>
                            {product.status}
                        </div>
                    </div>

                    <h3 className={`text-xl md:text-2xl font-black ${light ? "text-slate-900" : "text-white"} uppercase tracking-tight mb-3 group-hover:text-primary transition-colors`}>
                        {product.title}
                    </h3>

                    <p className={`${light ? "text-slate-600" : "text-slate-300"} text-[12px] md:text-[13px] leading-relaxed mb-6 min-h-[72px]`}>
                        {product.description}
                    </p>

                    <div className="space-y-2.5 mb-6">
                        {product.features.map((feature, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <CheckCircle2 size={14} className="text-primary/60" />
                                <span className={`text-[10px] font-bold ${light ? "text-slate-600" : "text-slate-300"} uppercase tracking-wider`}>{feature}</span>
                            </div>
                        ))}
                    </div>

                    <div className={`pt-5 border-t ${light ? "border-slate-200" : "border-white/10"} flex items-center justify-between mt-auto`}>
                        <div>
                            <p className={`text-[9px] font-black ${light ? "text-slate-500" : "text-slate-400"} uppercase tracking-widest mb-1`}>Pricing</p>
                            <p className={`text-[11px] font-bold ${light ? "text-slate-900" : "text-white"} uppercase tracking-wider`}>{product.price}</p>
                        </div>
                        <div className={`w-9 h-9 rounded-full ${light ? "bg-white" : "bg-white/5"} border ${light ? "border-slate-200" : "border-white/10"} flex items-center justify-center ${light ? "text-slate-900" : "text-white"} group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all duration-300`}>
                            <ArrowUpRight size={16} />
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
