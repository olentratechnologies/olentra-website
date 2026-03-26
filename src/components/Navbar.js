"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import { serviceGroups } from '../data/services';
import { navLinks } from '../data/navigation';
import { contactInfo } from '../data/contact';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [isLightSection, setIsLightSection] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeServiceGroupIndex, setActiveServiceGroupIndex] = useState(0);
  const [mobileActiveServiceGroupIndex, setMobileActiveServiceGroupIndex] = useState(0);

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
          const id = entry.target.getAttribute('id');
          const index = navLinks.findIndex(link => link.href === `#${id || ''}`);

          if (index !== -1) setActiveIndex(index);
          else if (!id) setActiveIndex(0);

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
            <a href="/" className="flex items-center gap-3 group">
              <div className="relative w-8 h-8 group-hover:scale-110 transition-transform duration-300">
                <Image
                  src="/images/Logo/Olentra-Logo-Without-Background.png"
                  alt="Olentra Logo"
                  fill
                  sizes="32px"
                  className="object-contain"
                />
              </div>
              <span className={`text-base md:text-lg font-black uppercase tracking-tighter transition-colors duration-300 ${isLightSection ? 'text-slate-950' : 'text-white'
                }`}>
                Olentra
              </span>
            </a>

            {/* Desktop Links */}
            <div className="hidden md:flex items-center gap-1 justify-self-center">
              {primaryLinks.map((link, idx) => {
                const isActive = hoveredIndex === null ? activeIndex === idx : hoveredIndex === idx;
                const isServices = link.label === 'Services';

                return (
                  <div
                    key={link.id}
                    className="relative h-full flex items-center"
                    onMouseEnter={() => {
                      setHoveredIndex(idx);
                      if (isServices) setIsServicesOpen(true);
                    }}
                    onMouseLeave={() => {
                      setHoveredIndex(null);
                      if (isServices) setIsServicesOpen(false);
                    }}
                  >
                    <a
                      href={link.href}
                      className={`relative px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-all duration-300 flex items-center gap-1 ${isLightSection ? 'text-slate-600 hover:text-primary' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                      <span className="relative z-10">{link.label}</span>
                      {isServices && <ChevronDown size={12} className={`transition-transform duration-300 ${isServicesOpen ? 'rotate-180' : ''}`} />}
                      <span className={`absolute bottom-0 left-4 right-4 h-[1.5px] rounded-full transition-transform duration-300 origin-left ${isActive ? 'scale-x-100' : 'scale-x-0'
                        }`} style={{ background: accentGradient }} />
                    </a>

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
                            className={`absolute top-full left-1/2 w-[640px] p-4 rounded-2xl border shadow-2xl backdrop-blur-3xl z-[110] mt-1 ${isLightSection
                              ? 'bg-white/95 border-slate-200 text-slate-900'
                              : 'bg-slate-950/95 border-white/10 text-white'
                              }`}
                          >
                            <div className="grid grid-cols-[220px_1fr] gap-3">
                              {/* Left: Sections */}
                              <div className={`rounded-xl border p-2 ${isLightSection ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/5'}`}>
                                <div className={`px-2.5 py-2 text-[9px] font-black uppercase tracking-[0.22em] ${isLightSection ? 'text-slate-500' : 'text-slate-400'}`}>
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
                                        className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 flex items-center justify-between gap-3 ${isActiveGroup
                                          ? (isLightSection ? 'bg-slate-50 text-slate-950' : 'bg-white/10 text-white')
                                          : (isLightSection ? 'text-slate-600 hover:bg-slate-50' : 'text-slate-300 hover:bg-white/5')
                                          }`}
                                      >
                                        <span className="flex items-center gap-2">
                                          <span className="text-sm leading-none">{group.icon}</span>
                                          <span className="text-[10px] font-bold uppercase tracking-wider">
                                            {group.category}
                                          </span>
                                        </span>
                                        <span
                                          className={`h-1.5 w-1.5 rounded-full transition-opacity ${isActiveGroup ? 'opacity-100' : 'opacity-0'}`}
                                          style={{ background: accentGradient }}
                                        />
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Right: Items */}
                              <div className={`rounded-xl border p-2 ${isLightSection ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/5'}`}>
                                <div className={`px-2.5 py-2 text-[9px] font-black uppercase tracking-[0.22em] ${isLightSection ? 'text-slate-500' : 'text-slate-400'}`}>
                                  {serviceGroups[activeServiceGroupIndex]?.category ?? 'Services'}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  {(serviceGroups[activeServiceGroupIndex]?.services ?? []).map((service) => (
                                    <a
                                      key={service.title}
                                      href={service.href}
                                      onClick={() => setIsServicesOpen(false)}
                                      className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 group/item ${isLightSection
                                        ? 'hover:bg-slate-50'
                                        : 'hover:bg-white/5'
                                        }`}
                                    >
                                      <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover/item:scale-110 transition-transform duration-300">
                                        <service.Icon size={16} />
                                      </div>
                                      <span className="text-[10px] font-bold uppercase tracking-wider">{service.title}</span>
                                    </a>
                                  ))}
                                </div>
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
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                Book a Discovery Call
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
                className={`md:hidden border-t overflow-hidden rounded-b-xl ${isLightSection
                  ? 'border-slate-100 bg-white/95'
                  : 'border-white/5 bg-slate-950/95'
                  }`}
              >
                <div className="px-6 pt-4 pb-6 flex flex-col gap-0.5 max-h-[80vh] overflow-y-auto">
                  {navLinks.map((link, idx) => {
                    const isServices = link.label === 'Services';
                    const activeDot = (
                      <div className={`w-1 h-1 rounded-full bg-primary transition-transform ${activeIndex === idx ? 'scale-150' : 'scale-100 opacity-30'
                        }`} />
                    );

                    return (
                      <div key={link.id} className="flex flex-col">
                        {isServices ? (
                          <div
                            className="flex items-center justify-between py-2"
                            onClick={() => {
                              setMobileServicesOpen((prev) => {
                                const next = !prev;
                                if (next) setMobileActiveServiceGroupIndex(0);
                                return next;
                              });
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
                              className={`transition-transform duration-300 ${mobileServicesOpen ? 'rotate-180' : ''} ${isLightSection ? 'text-slate-400' : 'text-slate-600'}`}
                            />
                          </div>
                        ) : (
                          <a
                            href={link.href}
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center justify-between py-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${isLightSection ? 'text-slate-600' : 'text-slate-400'
                              } hover:text-primary`}
                          >
                            <span className="flex items-center gap-2">
                              {activeDot}
                              {link.label}
                            </span>
                          </a>
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
                                          <a
                                            key={service.title}
                                            href={service.href}
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
                                          </a>
                                        ))}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              ))}
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
                      Book a Discovery Call
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
