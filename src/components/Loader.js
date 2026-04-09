"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import Image from "next/image";

/**
 * Loader - A premium, "Synthetic Editorial" pre-loader.
 * Features the Olentra logo and organic "venom-like" orbital trails.
 */
export default function Loader() {
    const [isLoading, setIsLoading] = useState(true);
    const containerRef = useRef(null);
    const orbitalRefs = useRef([]);
    const logoRef = useRef(null);

    // Google brand colors for the organic trails
    const googleColors = ["#4285F4", "#EA4335", "#FBBC05", "#34A853"];

    useEffect(() => {
        // 1. Initial orbital animations using GSAP
        const orbitals = orbitalRefs.current;
        if (!orbitals.length) return;

        // Create organic, slightly chaotic orbital movement for 12 segments
        orbitals.forEach((orbital, i) => {
            const radius = 60 + Math.random() * 40; // Spread radius
            const duration = 1.5 + Math.random() * 1.5;
            const delay = Math.random() * -duration;
            const angleOffset = (i / orbitals.length) * Math.PI * 2;

            // Pulse and orbit
            gsap.to(orbital, {
                duration,
                repeat: -1,
                ease: "sine.inOut",
                delay,
                onUpdate: function () {
                    const time = Date.now() * 0.001 - delay;
                    const x = Math.cos(time + angleOffset) * radius;
                    const y = Math.sin(time + angleOffset) * radius;
                    const noiseX = Math.sin(time * 2 + i) * 10; // Extra organic "jitter"
                    const noiseY = Math.cos(time * 2 + i) * 10;

                    gsap.set(orbital, {
                        x: x + noiseX,
                        y: y + noiseY,
                        scale: 1 + Math.sin(time * 3 + i) * 0.3,
                        opacity: 0.6 + Math.sin(time * 2 + i) * 0.4,
                        backgroundColor: googleColors[i % googleColors.length]
                    });
                }
            });
        });

        // 2. Logo breathing/glow effect
        if (logoRef.current) {
            gsap.to(logoRef.current, {
                scale: 1.05,
                duration: 1,
                repeat: -1,
                yoyo: true,
                ease: "power1.inOut"
            });
        }

        // 3. Handling window load
        const finishLoading = () => {
            setIsLoading(false);
        };

        if (document.readyState === "complete") {
            // Short delay to allow hydration before hiding
            const timer = setTimeout(finishLoading, 100);
            return () => clearTimeout(timer);
        } else {
            window.addEventListener("load", finishLoading);
            return () => window.removeEventListener("load", finishLoading);
        }

        return () => {
            window.removeEventListener("load", finishLoading);
            gsap.killTweensOf(orbitals);
            if (logoRef.current) gsap.killTweensOf(logoRef.current);
        };
    }, []);

    return (
        <AnimatePresence>
            {isLoading && (
                <motion.div
                    key="loader"
                    ref={containerRef}
                    initial={{ opacity: 1 }}
                    exit={{
                        opacity: 0,
                        scale: 1.2,
                        transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
                    }}
                    className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#020617] overflow-hidden"
                >
                    {/* Subtle noise background */}
                    <div className="absolute inset-0 bg-[url('/images/ui/grid.svg')] opacity-[0.1] pointer-events-none" />

                    {/* Logo Glow backing */}
                    <div className="absolute w-96 h-96 bg-primary/20 blur-[120px] rounded-full animate-pulse pointer-events-none" />

                    {/* Central Orbiting Energy Trails */}
                    <div className="relative w-48 h-48 flex items-center justify-center">
                        {Array.from({ length: 12 }, (_, i) => (
                            <div
                                key={i}
                                ref={(el) => (orbitalRefs.current[i] = el)}
                                className="absolute w-3 h-3 rounded-full blur-[1px] pointer-events-none"
                                style={{ backgroundColor: googleColors[i % googleColors.length] }}
                            />
                        ))}

                        {/* Logo */}
                        <div ref={logoRef} className="relative z-10 w-24 h-24">
                            <Image
                                src="/images/branding/Logo/Olentra-Logo-Without-Background.png"
                                alt="Olentra Logo"
                                fill
                                sizes="96px"
                                className="object-contain drop-shadow-[0_0_25px_rgba(37,99,235,0.4)]"
                                priority
                                loading="eager"
                            />
                        </div>
                    </div>

                    {/* Text reveal bottom-centered - Optional elegant branding */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 1 }}
                        className="absolute bottom-12 flex flex-col items-center gap-2"
                    >
                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">
                            Initializing Enterprise Systems
                        </span>
                        <div className="w-12 h-[2px] bg-primary/30 rounded-full" />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
