"use client";

import { motion } from 'framer-motion';
import { ArrowUpRight, Zap, CheckCircle2 } from 'lucide-react';
import { products } from '../data/products_data';

export default function Products() {
    return (
        <section
            id="products"
            className="bg-[#020617] py-24 md:py-32 relative overflow-hidden"
        >
            {/* Background Decor */}
            <div className="absolute inset-0 bg-cyber-grid opacity-[0.03] pointer-events-none" />
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />

            <div className="max-w-6xl mx-auto px-6 md:px-12 relative z-10">
                <div className="mb-20">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="w-8 h-px bg-primary/40" />
                        <p className="text-[10px] md:text-xs font-black text-primary uppercase tracking-[0.4em]">Proprietary Technology</p>
                    </div>
                    <h2 className="text-[clamp(1.8rem,5vw,3.5rem)] font-black text-white uppercase leading-[0.9] tracking-tighter mb-6">
                        Intelligent <br /> <span className="text-primary italic">Product Ecosystem</span>
                    </h2>
                    <p className="max-w-2xl text-slate-400 text-[14px] md:text-[15px] leading-relaxed">
                        Scalable AI platforms and autonomous systems designed to integrate seamlessly into your enterprise architecture.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {products.map((product, index) => (
                        <ProductCard key={product.id} product={product} index={index} />
                    ))}
                </div>
            </div>
        </section>
    );
}

function ProductCard({ product, index }) {
    const Icon = product.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="group relative bg-[#0b1220]/50 backdrop-blur-3xl border border-white/5 p-8 rounded-3xl hover:border-primary/40 transition-all duration-500 hover:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5)]"
        >
            {/* Glow Effect */}
            <div className="absolute -inset-px bg-gradient-to-br from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />

            <div className="relative z-10">
                <div className="flex items-start justify-between mb-8">
                    <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary group-hover:scale-110 transition-transform duration-500 shadow-[0_0_20px_rgba(37,99,235,0.2)]">
                        <Icon size={24} strokeWidth={2.5} />
                    </div>
                    <div className="px-3 py-1 rounded-full bg-slate-900 border border-white/10 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        {product.status}
                    </div>
                </div>

                <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight mb-4 group-hover:text-primary transition-colors">
                    {product.title}
                </h3>

                <p className="text-slate-400 text-[13px] md:text-[14px] leading-relaxed mb-8 min-h-[80px]">
                    {product.description}
                </p>

                <div className="space-y-3 mb-10">
                    {product.features.map((feature, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <CheckCircle2 size={14} className="text-primary/60" />
                            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">{feature}</span>
                        </div>
                    ))}
                </div>

                <div className="pt-8 border-t border-white/5 flex items-center justify-between mt-auto">
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Pricing</p>
                        <p className="text-[12px] font-bold text-white uppercase tracking-wider">{product.price}</p>
                    </div>
                    <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-primary hover:border-primary transition-all duration-300">
                        <ArrowUpRight size={18} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
