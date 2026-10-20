"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronDown, Calendar } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { serviceGroups } from '../data/services';
import { navLinks } from '../data/navigation';
import { products } from '../data/products_data';
import { contactInfo } from '../data/contact';
import { servicePages } from '../data/service_pages';

function CalendarColorfulIcon({ size = 15, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="6" width="18" height="15" rx="3" fill="#3B82F6" />
      <path d="M3 10H21" stroke="#1D4ED8" strokeWidth="1.5" />
      <path d="M8 2V5" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M16 2V5" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="8" cy="14" r="1.25" fill="#FFFFFF" />
      <circle cx="12" cy="14" r="1.25" fill="#34D399" />
      <circle cx="16" cy="14" r="1.25" fill="#F43F5E" />
      <circle cx="8" cy="17.5" r="1.25" fill="#F472B6" />
      <circle cx="12" cy="17.5" r="1.25" fill="#FBBF24" />
      <circle cx="16" cy="17.5" r="1.25" fill="#60A5FA" />
    </svg>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [mobileProductsOpen, setMobileProductsOpen] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const [isProductsOpen, setIsProductsOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [isLightSection, setIsLightSection] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeServiceGroupIndex, setActiveServiceGroupIndex] = useState(0);
  const [mobileActiveServiceGroupIndex, setMobileActiveServiceGroupIndex] = useState(0);

  const getGroupRoute = useCallback((groupCategory, serviceTitle) => {
    const group = servicePages.find((page) => page.name === groupCategory);
    if (!group) return "/services";
    const slug = serviceTitle
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    return `/services/${group.slug}#${slug}`;
  }, []);

  useEffect(() => {
    const index = navLinks.findIndex((link) => {
      if (link.href === "/") return pathname === "/";
      return pathname?.startsWith(link.href);
    });
    setActiveIndex(index === -1 ? 0 : index);
  }, [pathname]);

  // Memoized scroll logic
  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 20);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    const observerOptions = {
      root: null,
      rootMargin: '-10% 0px -85% 0px',
      threshold: 0
    };

    const observerCallback = (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const isLight =
            entry.target.classList.contains('bg-white') ||
            entry.target.classList.contains('bg-slate-50') ||
            entry.target.getAttribute('data-theme') === 'light';

          setIsLightSection(isLight);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    const targets = document.querySelectorAll('section, footer');
    targets.forEach(t => observer.observe(t));

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, [handleScroll]);

  const primaryLinks = navLinks;
  const accentGradient = 'linear-gradient(135deg, #2563eb, #4f46e5)';
  const resolveHref = useCallback((href) => {
    return href || "/";
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] px-3 md:px-5 pt-3 pointer-events-none">
      <div className="max-w-6xl mx-auto w-full relative pointer-events-auto">
        <nav
          data-testid="navbar"
          className={`w-full transition-all duration-500 border ${isLightSection
            ? 'bg-white/80 backdrop-blur-2xl border-slate-200'
            : 'bg-slate-950/40 backdrop-blur-2xl border-white/10'
            } ${scrolled ? 'shadow-lg shadow-black/5' : 'shadow-none'
            } ${mobileOpen ? 'rounded-xl' : 'rounded-[20px] md:rounded-[28px]'
            } overflow-visible`}
          style={{
            animation: 'nav-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            opacity: 0,
            transform: 'translateY(-10px)'
          }}
        >
          <div className="px-5 md:px-7 h-10 md:h-12 grid grid-cols-[auto,1fr,auto] items-center">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-8 h-8 group-hover:scale-110 transition-transform duration-300">
                <Image
                  src="/images/branding/Logo/Olentra-Logo-Without-Background.png"
                  alt="Olentra Logo"
                  fill
                  sizes="32px"
                  className="object-contain"
                />
              </div>
              <div className="flex items-center gap-1 font-black uppercase tracking-tighter">
                <span className={`text-base md:text-lg transition-colors duration-300 ${isLightSection ? 'text-slate-700' : 'text-slate-300'
                  }`}>Olentra</span>
                <span className="text-base md:text-lg bg-gradient-to-r from-blue-400 via-primary to-blue-600 bg-clip-text text-transparent transition-colors duration-300">Technologies</span>
              </div>
            </Link>

            {/* Desktop Links */}
            <div className="hidden md:flex items-center gap-1 justify-self-center">
              {primaryLinks.map((link, idx) => {
                const isActive = hoveredIndex === null ? activeIndex === idx : hoveredIndex === idx;
                const isServices = link.label === 'Services';
                const isProducts = link.label === 'Products';

                return (
                  <div
                    key={link.id}
                    className="relative h-full flex items-center"
                    onMouseEnter={() => {
                      setHoveredIndex(idx);
                      if (isServices) setIsServicesOpen(true);
                      if (isProducts) setIsProductsOpen(true);
                    }}
                    onMouseLeave={() => {
                      setHoveredIndex(null);
                      if (isServices) setIsServicesOpen(false);
                      if (isProducts) setIsProductsOpen(false);
                    }}
                  >
                    <Link
                      href={resolveHref(link.href)}
                      className={`relative px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-all duration-300 flex items-center gap-1 ${isLightSection ? 'text-slate-600 hover:text-primary' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                      <span className="relative z-10">{link.label}</span>
                      {(isServices || isProducts) && (
                        <ChevronDown
                          size={12}
                          className={`transition-transform duration-300 ${(isServices && isServicesOpen) || (isProducts && isProductsOpen) ? 'rotate-180' : ''}`}
                        />
                      )}
                      <span className={`absolute bottom-0 left-4 right-4 h-[1.5px] rounded-full transition-transform duration-300 origin-left ${isActive ? 'scale-x-100' : 'scale-x-0'
                        }`} style={{ background: accentGradient }} />
                    </Link>

                    {/* Desktop Mega Menu Dropdown - Centered Precisely to Link */}
                    {isServices && (
                      <AnimatePresence>
                        {isServicesOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95, x: "-50%" }}
                            animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
                            exit={{ opacity: 0, y: 10, scale: 0.95, x: "-50%" }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            onMouseEnter={() => setIsServicesOpen(true)}
                            onMouseLeave={() => setIsServicesOpen(false)}
                            className={`absolute top-full left-1/2 w-[640px] p-4 rounded-2xl border shadow-[0_25px_60px_rgba(0,0,0,0.25)] backdrop-blur-3xl z-[110] mt-3.5 before:absolute before:-top-5 before:left-0 before:right-0 before:h-5 before:content-[''] transition-colors duration-300 ${
                              isLightSection
                                ? 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-300/50'
                                : 'bg-[#070b12]/95 border-white/10 text-white shadow-[0_25px_60px_rgba(0,0,0,0.7)]'
                            }`}
                          >
                            <div className="grid grid-cols-[220px_1fr] gap-3">
                              {/* Left: Sections */}
                              <div className={`rounded-xl border p-2 transition-colors duration-300 ${
                                isLightSection ? 'border-slate-200 bg-slate-50/90' : 'border-white/10 bg-[#0f1723]/90'
                              }`}>
                                <div className={`px-2.5 py-2 text-[9px] font-black uppercase tracking-[0.22em] ${
                                  isLightSection ? 'text-slate-500' : 'text-slate-400'
                                }`}>
                                  Sections
                                </div>
                                <div className="flex flex-col gap-1">
                                  {serviceGroups.map((group, groupIdx) => {
                                    const isActiveGroup = groupIdx === activeServiceGroupIndex;
                                    return (
                                      <button
                                        key={group.category}
                                        type="button"
                                        onMouseEnter={() => setActiveServiceGroupIndex(groupIdx)}
                                        onFocus={() => setActiveServiceGroupIndex(groupIdx)}
                                        className={`relative w-full text-left px-3 py-2 rounded-lg transition-all duration-300 flex items-center justify-between gap-3 group/item overflow-hidden ${
                                          isActiveGroup
                                            ? isLightSection
                                              ? 'bg-primary/10 text-primary font-bold shadow-sm'
                                              : 'bg-white/10 text-white shadow-sm'
                                            : isLightSection
                                              ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                                              : 'text-slate-300 hover:bg-white/5'
                                        }`}
                                      >
                                        {/* Left indicator bar on active/hover */}
                                        <span
                                          className={`absolute left-0 top-1.5 bottom-1.5 w-[2.5px] rounded-r-full transition-all duration-300 ${
                                            isActiveGroup
                                              ? 'opacity-100 scale-y-100'
                                              : 'opacity-0 scale-y-50 group-hover/item:opacity-100 group-hover/item:scale-y-100'
                                          }`}
                                          style={{ background: accentGradient }}
                                        />
                                        <span className="flex items-center gap-2">
                                          <span className="text-sm leading-none">{group.icon}</span>
                                          <span className="text-[10px] font-bold uppercase tracking-wider">
                                            {group.category}
                                          </span>
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Right: Items */}
                              <div className={`rounded-xl border p-2 transition-colors duration-300 ${
                                isLightSection ? 'border-slate-200 bg-slate-50/90' : 'border-white/10 bg-[#0f1723]/90'
                              }`}>
                                <div className={`px-2.5 py-2 text-[9px] font-black uppercase tracking-[0.22em] ${
                                  isLightSection ? 'text-slate-500' : 'text-slate-400'
                                }`}>
                                  {serviceGroups[activeServiceGroupIndex]?.category ?? 'Services'}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  {(serviceGroups[activeServiceGroupIndex]?.services ?? []).map((service) => (
                                    <Link
                                      key={service.title}
                                      href={getGroupRoute(
                                        serviceGroups[activeServiceGroupIndex]?.category,
                                        service.title
                                      )}
                                      onClick={() => setIsServicesOpen(false)}
                                      className={`relative flex items-center gap-3 p-3 rounded-xl transition-all duration-300 group/item overflow-hidden ${
                                        isLightSection
                                          ? 'hover:bg-slate-100 hover:border-slate-200'
                                          : 'hover:bg-white/5 hover:border hover:border-white/5'
                                      }`}
                                    >
                                      {/* Left Indicator bar on hover */}
                                      <span
                                        className="absolute left-0 top-2.5 bottom-2.5 w-[2.5px] rounded-r-full opacity-0 group-hover/item:opacity-100 transition-all duration-300 scale-y-50 group-hover/item:scale-y-100"
                                        style={{ background: accentGradient }}
                                      />
                                      <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover/item:scale-110 transition-transform duration-300 shrink-0">
                                        <service.Icon size={16} />
                                      </div>
                                      <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${
                                        isLightSection ? 'text-slate-700 group-hover/item:text-slate-950' : 'text-slate-200 group-hover/item:text-white'
                                      }`}>{service.title}</span>
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    )}

                    {/* Desktop Products Dropdown */}
                    {isProducts && (
                      <AnimatePresence>
                        {isProductsOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95, x: "-50%" }}
                            animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
                            exit={{ opacity: 0, y: 10, scale: 0.95, x: "-50%" }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            onMouseEnter={() => setIsProductsOpen(true)}
                            onMouseLeave={() => setIsProductsOpen(false)}
                            className={`absolute top-full left-1/2 w-[320px] p-4 rounded-2xl border shadow-[0_25px_60px_rgba(0,0,0,0.25)] backdrop-blur-3xl z-[110] mt-3.5 before:absolute before:-top-5 before:left-0 before:right-0 before:h-5 before:content-[''] transition-colors duration-300 ${
                              isLightSection
                                ? 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-300/50'
                                : 'bg-[#070b12]/95 border-white/10 text-white shadow-[0_25px_60px_rgba(0,0,0,0.7)]'
                            }`}
                          >
                            <div className={`rounded-xl border p-3 transition-colors duration-300 ${
                              isLightSection ? 'border-slate-200 bg-slate-50/90' : 'border-white/10 bg-[#0f1723]/90'
                            }`}>
                              <div className="flex items-center justify-between px-2.5 py-1.5 mb-2">
                                <div className={`text-[9px] font-black uppercase tracking-[0.22em] ${
                                  isLightSection ? 'text-slate-500' : 'text-slate-400'
                                }`}>
                                  Products
                                </div>
                                <Link
                                  href="/products"
                                  onClick={() => setIsProductsOpen(false)}
                                  className="text-[9px] font-black uppercase tracking-[0.2em] text-primary hover:opacity-80 transition-opacity"
                                >
                                  View All
                                </Link>
                              </div>
                              <div className="flex flex-col gap-1.5">
                                {products.map((product, pIdx) => {
                                  return (
                                    <Link
                                      key={product.id}
                                      href={product.href}
                                      onClick={() => setIsProductsOpen(false)}
                                      className={`relative flex items-center justify-between p-3 rounded-xl transition-all duration-300 group/item overflow-hidden ${
                                        isLightSection
                                          ? 'hover:bg-slate-100 hover:border-slate-200'
                                          : 'hover:bg-white/5 hover:border hover:border-white/5'
                                      }`}
                                    >
                                      {/* Left Indicator bar on hover */}
                                      <span
                                        className="absolute left-0 top-2.5 bottom-2.5 w-[2.5px] rounded-r-full opacity-0 group-hover/item:opacity-100 transition-all duration-300 scale-y-50 group-hover/item:scale-y-100"
                                        style={{ background: accentGradient }}
                                      />

                                      <div className="flex items-center gap-3">
                                        {/* Enterprise Monogram Badge - Highlighted */}
                                        <div className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all duration-300 shrink-0 shadow-sm ${
                                          isLightSection
                                            ? 'bg-blue-600/10 border-blue-500/40 text-blue-600 group-hover/item:bg-blue-600 group-hover/item:border-blue-600 group-hover/item:text-white group-hover/item:shadow-[0_0_10px_rgba(37,99,235,0.4)]'
                                            : 'bg-blue-500/20 border-blue-400/40 text-blue-400 group-hover/item:bg-blue-600 group-hover/item:border-blue-500 group-hover/item:text-white group-hover/item:shadow-[0_0_12px_rgba(37,99,235,0.6)]'
                                        }`}>
                                          <span className="text-[10px] font-mono font-black tracking-tight">
                                            0{pIdx + 1}
                                          </span>
                                        </div>

                                        <div className="flex flex-col">
                                          <span className={`text-[10px] font-black uppercase tracking-wider transition-colors ${
                                            isLightSection
                                              ? 'text-slate-800 group-hover/item:text-primary'
                                              : 'text-slate-200 group-hover/item:text-white'
                                          }`}>
                                            {product.title}
                                          </span>
                                          <span className={`text-[8px] font-mono uppercase tracking-[0.2em] transition-colors ${
                                            isLightSection ? 'text-slate-500' : 'text-slate-500 group-hover/item:text-slate-400'
                                          }`}>
                                            {product.status || 'Platform'}
                                          </span>
                                        </div>
                                      </div>
                                    </Link>
                                  );
                                })}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    )}
                  </div>
                );
              })}
            </div>

            {/* CTA & Mobile Toggle */}
            <div className="flex items-center gap-3 justify-self-end">
              <a
                href={contactInfo.calendlyUrl}
                target="_blank"
                rel="noreferrer"
                className={`hidden md:flex items-center gap-2 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border transition-all duration-300 ${isLightSection
                  ? 'border-slate-200 text-slate-950 hover:border-primary hover:bg-slate-50'
                  : 'border-white/10 text-white hover:border-primary hover:shadow-[0_0_12px_rgba(37,99,235,0.3)]'
                  }`}
                style={{ background: isLightSection ? undefined : 'linear-gradient(135deg, rgba(37,99,235,0.25), rgba(79,70,229,0.25))' }}
              >
                <CalendarColorfulIcon size={14} />
                <span>Schedule a Meeting</span>
              </a>

              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileOpen}
                className={`md:hidden p-1.5 rounded-full border transition-colors ${isLightSection ? 'border-slate-200 text-slate-950' : 'border-white/10 text-white'
                  }`}
              >
                {mobileOpen ? <X size={16} /> : <Menu size={16} />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {mobileOpen && (
              <motion.div
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="md:hidden border-t border-white/10 bg-[#070b12]/98 backdrop-blur-3xl overflow-hidden rounded-b-xl text-white"
              >
                <div className="px-6 pt-4 pb-6 flex flex-col gap-0.5 max-h-[80vh] overflow-y-auto">
                  {navLinks.map((link, idx) => {
                    const isServices = link.label === 'Services';
                    const isProducts = link.label === 'Products';
                    const activeDot = (
                      <div className={`w-1 h-1 rounded-full bg-primary transition-transform ${activeIndex === idx ? 'scale-150' : 'scale-100 opacity-30'
                        }`} />
                    );

                    return (
                      <div key={link.id} className="flex flex-col">
                        {isServices || isProducts ? (
                          <div
                            className="flex items-center justify-between py-2"
                            onClick={() => {
                              if (isServices) {
                                setMobileServicesOpen((prev) => {
                                  const next = !prev;
                                  if (next) setMobileActiveServiceGroupIndex(0);
                                  return next;
                                });
                              } else {
                                setMobileProductsOpen((prev) => !prev);
                              }
                            }}
                          >
                            <button
                              type="button"
                              className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${isLightSection ? 'text-slate-600' : 'text-slate-400'
                                } hover:text-primary`}
                            >
                              {activeDot}
                              {link.label}
                            </button>
                            <ChevronDown
                              size={14}
                              className={`transition-transform duration-300 ${(isServices && mobileServicesOpen) || (isProducts && mobileProductsOpen) ? 'rotate-180' : ''} ${isLightSection ? 'text-slate-400' : 'text-slate-600'}`}
                            />
                          </div>
                        ) : (
                          <Link
                            href={resolveHref(link.href)}
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center justify-between py-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${isLightSection ? 'text-slate-600' : 'text-slate-400'
                              } hover:text-primary`}
                          >
                            <span className="flex items-center gap-2">
                              {activeDot}
                              {link.label}
                            </span>
                          </Link>
                        )}

                        {/* Mobile Services Sub-menu */}
                        <AnimatePresence>
                          {isServices && mobileServicesOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden flex flex-col gap-1 pl-4"
                            >
                              {serviceGroups.map((group) => (
                                <div key={group.category} className="pt-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const idx = serviceGroups.findIndex((g) => g.category === group.category);
                                      setMobileActiveServiceGroupIndex((prev) => (prev === idx ? -1 : idx));
                                    }}
                                    className={`w-full flex items-center justify-between gap-3 py-2 ${isLightSection ? 'text-slate-600' : 'text-slate-300'}`}
                                  >
                                    <span className="flex items-center gap-2">
                                      <span className="text-sm leading-none">{group.icon}</span>
                                      <span className="text-[10px] font-black uppercase tracking-[0.22em]">
                                        {group.category}
                                      </span>
                                    </span>
                                    <ChevronDown
                                      size={14}
                                      className={`transition-transform duration-300 ${mobileActiveServiceGroupIndex === serviceGroups.findIndex((g) => g.category === group.category) ? 'rotate-180' : ''} ${isLightSection ? 'text-slate-400' : 'text-slate-500'}`}
                                    />
                                  </button>

                                  <AnimatePresence initial={false}>
                                    {mobileActiveServiceGroupIndex === serviceGroups.findIndex((g) => g.category === group.category) && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden flex flex-col gap-1 pl-3"
                                      >
                                        {group.services.map((service) => (
                                          <Link
                                            key={service.title}
                                            href={getGroupRoute(group.category, service.title)}
                                            onClick={() => {
                                              setMobileOpen(false);
                                              setMobileServicesOpen(false);
                                            }}
                                            className={`flex items-center gap-3 py-2 px-2 rounded-lg transition-all ${isLightSection
                                              ? 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                                              : 'text-slate-300 hover:text-white hover:bg-white/5'
                                              }`}
                                          >
                                            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                                              <service.Icon size={14} />
                                            </div>
                                            <span className="text-[9px] font-bold uppercase tracking-widest">{service.title}</span>
                                          </Link>
                                        ))}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Mobile Products Sub-menu */}
                        <AnimatePresence>
                          {isProducts && mobileProductsOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden flex flex-col gap-1 pl-4 pt-1"
                            >
                              {products.map((product) => {
                                return (
                                  <Link
                                    key={product.id}
                                    href={product.href}
                                    onClick={() => {
                                      setMobileOpen(false);
                                      setMobileProductsOpen(false);
                                    }}
                                    className={`relative pl-4 pr-5 py-3 rounded-lg transition-all border-l-2 border-transparent hover:border-primary/50 ${isLightSection
                                      ? 'text-slate-900 hover:text-slate-950 hover:bg-slate-50'
                                      : 'text-white hover:bg-white/5'
                                      }`}
                                  >
                                    <span className="text-[10px] font-bold tracking-wide">{product.title}</span>
                                  </Link>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                  <div className="pt-4">
                    <a
                      href={contactInfo.calendlyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-primary bg-primary text-white"
                    >
                      <CalendarColorfulIcon size={15} />
                      <span>Schedule a Meeting</span>
                    </a>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>
      </div>

      <style jsx global>{`
        @keyframes nav-in {
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
