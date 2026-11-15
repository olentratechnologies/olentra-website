"use client";

import { useState, useEffect, useCallback, useId, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronDown, Calendar } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { serviceGroups } from '../data/services';
import { navLinks } from '../data/navigation';
import { products } from '../data/products-data';
import { contactInfo } from '../data/contact';
import { servicePages } from '../data/service-pages';
import InternMobileDock from './intern/InternMobileDock';
import ProductLogo from './products/ProductLogo';
import { useSiteFeatures } from '@olentra/site-features/react';

// Premium smoked-glass surface for the bar over dark sections: translucent
// deep navy, heavy blur, a faint top sheen and a soft drop shadow.
const DARK_GLASS =
  'bg-[linear-gradient(180deg,rgba(24,30,48,0.62)_0%,rgba(8,11,22,0.58)_100%)] backdrop-blur-xl backdrop-saturate-150 border-white/[0.09] shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_12px_32px_-8px_rgba(0,0,0,0.55)]';
// Dropdowns sit inside the blurred bar, where a nested backdrop blur cannot see
// the page, so they use a near-opaque version of the same glass tone.
const DARK_GLASS_MENU =
  'bg-[linear-gradient(180deg,rgba(20,26,42,0.97)_0%,rgba(9,12,23,0.97)_100%)] border-white/[0.09] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_25px_60px_rgba(0,0,0,0.6)]';

function RingingPhoneIcon({ size = 15, active = true, className = "" }) {
  const uniqueId = useId();
  const gradId = `phone-grad-${uniqueId.replace(/:/g, '')}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`overflow-visible ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#DBEAFE" />
        </linearGradient>
      </defs>

      {/* Radiating sound waves from the earpiece */}
      <motion.path
        d="M14 6.5A5.5 5.5 0 0 1 18.5 11"
        stroke={active ? "#93C5FD" : "currentColor"}
        strokeWidth="2.2"
        strokeLinecap="round"
        animate={active ? {
          opacity: [0, 1, 0],
          scale: [0.75, 1.1, 1.3],
        } : { opacity: 0.6 }}
        transition={{
          duration: 2.2,
          repeat: Infinity,
          ease: "easeOut",
          repeatDelay: 0.8,
        }}
        style={{ transformOrigin: "14px 11px" }}
      />
      <motion.path
        d="M14 2.5A9.5 9.5 0 0 1 22.5 11"
        stroke={active ? "#FFFFFF" : "currentColor"}
        strokeWidth="2.2"
        strokeLinecap="round"
        animate={active ? {
          opacity: [0, 1, 0],
          scale: [0.65, 1.05, 1.35],
        } : { opacity: 0.5 }}
        transition={{
          duration: 2.2,
          repeat: Infinity,
          ease: "easeOut",
          delay: 0.15,
          repeatDelay: 0.8,
        }}
        style={{ transformOrigin: "14px 11px" }}
      />

      {/* Ringing Handset */}
      <motion.g
        animate={active ? {
          rotate: [0, -14, 14, -10, 10, -5, 5, 0],
          scale: [1, 1.06, 1, 1.04, 1],
        } : { rotate: 0, scale: 1 }}
        transition={{
          duration: 2.2,
          repeat: Infinity,
          ease: "easeInOut",
          repeatDelay: 0.8,
        }}
        style={{ transformOrigin: "12px 14px" }}
      >
        <path
          d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
          fill={active ? `url(#${gradId})` : "none"}
          stroke={active ? "#1877F2" : "currentColor"}
          strokeWidth={active ? "0.5" : "1.6"}
          strokeLinejoin="round"
        />
      </motion.g>
    </svg>
  );
}

function AnimatedCalendarIcon({ size = 15, active = true, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`overflow-visible ${className}`}
      aria-hidden="true"
    >
      {/* Calendar body & binder pins with lively pendulum sway movement */}
      <motion.g
        animate={active ? {
          rotate: [0, -10, 10, -7, 7, -3, 3, 0],
          y: [0, -2, 0, -1.5, 0],
        } : { rotate: 0, y: 0 }}
        transition={{
          duration: 2.4,
          repeat: Infinity,
          ease: "easeInOut",
          repeatDelay: 0.8,
        }}
        style={{ transformOrigin: "12px 3px" }}
      >
        {/* Calendar Body */}
        <rect
          x="3"
          y="6"
          width="18"
          height="15"
          rx="3"
          fill={active ? "#FFFFFF" : "none"}
          stroke={active ? "none" : "currentColor"}
          strokeWidth="1.5"
        />
        <path d="M3 10H21" stroke={active ? "#1877F2" : "currentColor"} strokeWidth="1.75" />

        {/* Binder Pins */}
        <path d="M8 2V5" stroke={active ? "#1877F2" : "currentColor"} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M16 2V5" stroke={active ? "#1877F2" : "currentColor"} strokeWidth="2.5" strokeLinecap="round" />

        {/* Date dots with pulsing twinkle */}
        <circle cx="8" cy="13.5" r="1.3" fill={active ? "#1877F2" : "currentColor"} />
        <motion.circle
          cx="12"
          cy="13.5"
          r="1.3"
          fill={active ? "#60A5FA" : "currentColor"}
          animate={active ? { scale: [1, 1.6, 1], opacity: [0.8, 1, 0.8] } : {}}
          transition={{ duration: 1.4, repeat: Infinity, delay: 0.2 }}
        />
        <circle cx="16" cy="13.5" r="1.3" fill={active ? "#1877F2" : "currentColor"} />
        <motion.circle
          cx="8"
          cy="17"
          r="1.3"
          fill={active ? "#60A5FA" : "currentColor"}
          animate={active ? { scale: [1, 1.6, 1], opacity: [0.8, 1, 0.8] } : {}}
          transition={{ duration: 1.4, repeat: Infinity, delay: 0.4 }}
        />
        <circle cx="12" cy="17" r="1.3" fill={active ? "#1877F2" : "currentColor"} />
        <motion.circle
          cx="16"
          cy="17"
          r="1.3"
          fill={active ? "#60A5FA" : "currentColor"}
          animate={active ? { scale: [1, 1.6, 1], opacity: [0.8, 1, 0.8] } : {}}
          transition={{ duration: 1.4, repeat: Infinity, delay: 0.6 }}
        />
      </motion.g>

      {/* Dynamic event ping badge on the calendar */}
      {active && (
        <motion.circle
          cx="19.5"
          cy="4.5"
          r="2.2"
          fill="#38BDF8"
          stroke="#FFFFFF"
          strokeWidth="0.8"
          animate={{ scale: [1, 1.4, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      )}
    </svg>
  );
}

function DynamicNavCta({
  mode = 'contact',
  onToggle,
  onActionClick,
  isLightSection = false,
  isMobile = false,
  className = "",
  layoutScope = "desktop",
}) {
  const isContact = mode === 'contact';

  const handleActionClick = (e) => {
    onActionClick?.();
    if (isContact) {
      if (typeof window !== 'undefined' && window.location.pathname === '/') {
        const contactSection = document.getElementById('contact');
        if (contactSection) {
          e.preventDefault();
          setTimeout(() => {
            const navbarOffset = isMobile ? 85 : 95;
            const elementPosition = contactSection.getBoundingClientRect().top + window.pageYOffset;
            const offsetPosition = Math.max(0, elementPosition - navbarOffset);

            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth',
            });
            window.history.pushState(null, '', '#contact');
          }, 100);
        }
      }
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Toggling Part: Completely transparent and borderless */}
      <div
        role="group"
        aria-label="Toggle between Contact Us and Schedule a Meeting"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggle?.();
        }}
        className="relative inline-flex items-center gap-1 select-none cursor-pointer"
      >
        {/* Left Slot: Phone (Contact) */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggle?.();
          }}
          title="Switch to Contact Us"
          aria-label="Contact Us"
          className={`relative rounded-full flex items-center justify-center cursor-pointer focus:outline-hidden transition-transform active:scale-95 ${
            isMobile ? 'w-9 h-9' : 'w-8 h-8'
          }`}
        >
          {isContact && (
            <motion.div
              layoutId={`nav-cta-active-knob-${layoutScope}`}
              className="absolute inset-0 rounded-full bg-[#1877F2] shadow-[0_0_12px_rgba(24,119,242,0.5)] pointer-events-none"
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 32,
                mass: 0.8,
              }}
            />
          )}
          <span className={`relative z-10 flex items-center justify-center transition-opacity duration-200 ${
            isContact
              ? 'opacity-100'
              : isLightSection
                ? 'opacity-60 hover:opacity-100 text-slate-600'
                : 'opacity-60 hover:opacity-100 text-slate-400'
          }`}>
            <RingingPhoneIcon size={isMobile ? 15 : 14} active={isContact} />
          </span>
        </button>

        {/* Right Slot: Calendar (Schedule) */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggle?.();
          }}
          title="Switch to Schedule a Meeting"
          aria-label="Schedule a Meeting"
          className={`relative rounded-full flex items-center justify-center cursor-pointer focus:outline-hidden transition-transform active:scale-95 ${
            isMobile ? 'w-9 h-9' : 'w-8 h-8'
          }`}
        >
          {!isContact && (
            <motion.div
              layoutId={`nav-cta-active-knob-${layoutScope}`}
              className="absolute inset-0 rounded-full bg-[#1877F2] shadow-[0_0_12px_rgba(24,119,242,0.5)] pointer-events-none"
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 32,
                mass: 0.8,
              }}
            />
          )}
          <span className={`relative z-10 flex items-center justify-center transition-opacity duration-200 ${
            !isContact
              ? 'opacity-100'
              : isLightSection
                ? 'opacity-60 hover:opacity-100 text-slate-600'
                : 'opacity-60 hover:opacity-100 text-slate-400'
          }`}>
            <AnimatedCalendarIcon size={isMobile ? 15 : 14} active={!isContact} />
          </span>
        </button>
      </div>

      {/* Main CTA Button: Vibrant solid blue pill matching user reference image */}
      <a
        href={isContact ? "/#contact" : contactInfo.calendlyUrl}
        target={isContact ? undefined : "_blank"}
        rel={isContact ? undefined : "noreferrer"}
        onClick={handleActionClick}
        className={`inline-flex items-center justify-center rounded-full font-bold text-white bg-[#1877F2] hover:bg-[#1565d8] transition-all duration-300 shadow-[0_0_20px_rgba(24,119,242,0.35)] hover:shadow-[0_0_25px_rgba(24,119,242,0.5)] select-none focus:outline-hidden shrink-0 active:scale-[0.98] ${
          isMobile
            ? 'flex-1 h-10 px-4 text-xs'
            : 'h-[36px] w-[160px] lg:w-[174px] text-[12px]'
        }`}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isContact ? (
            <motion.div
              key="contact-cta"
              initial={{ opacity: 0, y: 2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -2 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-center whitespace-nowrap"
            >
              <span>Contact Us</span>
            </motion.div>
          ) : (
            <motion.div
              key="schedule-cta"
              initial={{ opacity: 0, y: 2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -2 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-center whitespace-nowrap"
            >
              <span>Schedule a Meeting</span>
            </motion.div>
          )}
        </AnimatePresence>
      </a>
    </div>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const { features, ready, isVisibleHref } = useSiteFeatures();
  const primaryLinks = useMemo(() => navLinks.filter((link) => link.id === "nav-careers" ? ready && features.internships : isVisibleHref(link.href)), [ready, features.services, features.products, features.internships, features.blog, features.portal, features.applications, features.maintenance, isVisibleHref]);
  const visibleProducts = useMemo(() => products.filter((product) => isVisibleHref(product.href)), [isVisibleHref]);
  const showInternLogin = ready && features.portal;
  const showInternApply = ready && features.internships && features.applications;
  const isInternPage = pathname === "/careers/intern" || pathname === "/intern/login";
  const hasInternDock = pathname === "/careers/intern";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [mobileProductsOpen, setMobileProductsOpen] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const [isProductsOpen, setIsProductsOpen] = useState(false);
  const [isCareersOpen, setIsCareersOpen] = useState(false);
  const [mobileCareersOpen, setMobileCareersOpen] = useState(false);
  const careersContainerRef = useRef(null);
  const careersTriggerRef = useRef(null);
  const restoringCareersFocusRef = useRef(false);
  const mobileCareersRef = useRef(null);
  const mobileCareersTriggerRef = useRef(null);
  const careersMenuId = useId();
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [isLightSection, setIsLightSection] = useState(isInternPage);
  const headerRowRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeServiceGroupIndex, setActiveServiceGroupIndex] = useState(0);
  const [mobileActiveServiceGroupIndex, setMobileActiveServiceGroupIndex] = useState(0);
  const [ctaMode, setCtaMode] = useState('contact');

  const toggleCtaMode = () => {
    setCtaMode((prev) => (prev === 'contact' ? 'schedule' : 'contact'));
  };

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
    const index = primaryLinks.findIndex((link) => {
      if (link.children) return link.children.some((child) => pathname === child.href || pathname?.startsWith(child.href + "/"));
      if (link.href === "/") return pathname === "/";
      return pathname?.startsWith(link.href);
    });
    setActiveIndex(index === -1 ? 0 : index);
  }, [pathname, primaryLinks]);

  useEffect(() => {
    setIsCareersOpen(false);
    setMobileCareersOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!ready || !features.internships) {
      setIsCareersOpen(false);
      setMobileCareersOpen(false);
    }
  }, [ready, features.internships]);

  useEffect(() => {
    if (!isCareersOpen && !mobileCareersOpen) return undefined;
    const outside = (event) => {
      if (!careersContainerRef.current?.contains(event.target) && !mobileCareersRef.current?.contains(event.target)) {
        setIsCareersOpen(false);
        setMobileCareersOpen(false);
      }
    };
    const escape = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (isCareersOpen) {
        setIsCareersOpen(false);
        restoringCareersFocusRef.current = true;
        careersTriggerRef.current?.focus();
        restoringCareersFocusRef.current = false;
      }
      if (mobileCareersOpen) { setMobileCareersOpen(false); mobileCareersTriggerRef.current?.focus(); }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [isCareersOpen, mobileCareersOpen]);

  // Memoized scroll logic
  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 20);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    const targets = Array.from(document.querySelectorAll('section, footer'));
    let observer;
    let sampleY = 0;

    const updateTheme = () => {
      let currentSection;
      for (const target of targets) {
        const bounds = target.getBoundingClientRect();
        // Gaps keep the preceding section's theme, including when scrolling upward.
        if (bounds.height > 0 && bounds.top <= sampleY) currentSection = target;
      }
      if (!currentSection) return;
      setIsLightSection(
        currentSection.classList.contains('bg-white') ||
        currentSection.classList.contains('bg-slate-50') ||
        currentSection.getAttribute('data-theme') === 'light'
      );
    };

    const observeSections = () => {
      observer?.disconnect();
      const bar = headerRowRef.current?.getBoundingClientRect();
      sampleY = Math.max(0, Math.min(window.innerHeight - 1, (bar?.top || 12) + (bar?.height || 40) / 2));
      // Use a one-pixel band behind the bar; percentage margins depend on screen width.
      observer = new IntersectionObserver(updateTheme, {
        root: null,
        rootMargin: `-${Math.max(0, sampleY - 1)}px 0px -${Math.max(0, window.innerHeight - sampleY)}px 0px`,
        threshold: 0,
      });
      targets.forEach(target => observer.observe(target));
      updateTheme();
    };

    observeSections();
    window.addEventListener('resize', observeSections);
    const barResizeObserver = new ResizeObserver(observeSections);
    if (headerRowRef.current) barResizeObserver.observe(headerRowRef.current);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', observeSections);
      barResizeObserver.disconnect();
      observer?.disconnect();
    };
  }, [handleScroll, pathname, ready, features.services, features.products, features.blog, features.internships]);

  const accentGradient = 'linear-gradient(135deg, #2563eb, #4f46e5)';
  const resolveHref = useCallback((href) => {
    return href || "/";
  }, []);

  // Opaque surfaces prevent scrolling content from blending through the theme switch.
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] px-3 md:px-5 pt-3 pointer-events-none">
      <div className="max-w-6xl mx-auto w-full relative pointer-events-auto">
        <nav
          data-testid="navbar"
          className={`w-full transition-none border ${isLightSection
            ? `bg-white border-slate-200 ${scrolled ? 'shadow-lg shadow-black/5' : 'shadow-none'}`
            : DARK_GLASS
            } ${mobileOpen ? 'rounded-xl' : 'rounded-[20px] md:rounded-[28px]'
            } overflow-visible`}
        >
          <div ref={headerRowRef} className="px-4 md:px-6 h-10 md:h-12 grid grid-cols-[auto,1fr,auto] items-center">
            {/* Logo */}
            <Link href="/" className={`flex items-center group ${isInternPage ? 'gap-1.5 min-[420px]:gap-3' : 'gap-3'}`}>
              <div className={`relative group-hover:scale-110 transition-transform duration-300 ${isInternPage ? 'w-7 h-7 min-[420px]:w-8 min-[420px]:h-8' : 'w-8 h-8'}`}>
                <Image
                  src="/images/branding/Logo/Olentra-Logo-Without-Background.png"
                  alt="Olentra Logo"
                  fill
                  sizes="32px"
                  className="object-contain"
                />
              </div>
              <div className="flex items-center gap-1 font-black uppercase tracking-tighter">
                <span className={`${isInternPage ? 'text-[12px] min-[420px]:text-base md:text-lg' : 'text-base md:text-lg'} transition-none ${isLightSection ? 'text-slate-700' : 'text-slate-300'
                  }`}>Olentra</span>
                <span className={`${isInternPage ? 'text-[12px] min-[420px]:text-base md:text-lg' : 'text-base md:text-lg'} bg-gradient-to-r from-blue-400 via-primary to-blue-600 bg-clip-text text-transparent transition-none`}>Technologies</span>
              </div>
            </Link>

            {/* Desktop Links */}
            <div className={`${isInternPage ? 'hidden min-[1200px]:flex' : 'hidden min-[1100px]:flex'} items-center gap-0.5 lg:gap-1 justify-self-center`}>
              {primaryLinks.map((link, idx) => {
                const isActive = hoveredIndex === null ? activeIndex === idx : hoveredIndex === idx;
                const isServices = link.label === 'Services';
                const isProducts = link.label === 'Products';
                const isCareers = link.id === 'nav-careers';

                return (
                  <div
                    key={link.id}
                    ref={isCareers ? careersContainerRef : undefined}
                    className="relative h-full flex items-center"
                    onFocus={(event) => { if (isCareers && !restoringCareersFocusRef.current && !event.currentTarget.contains(event.relatedTarget)) setIsCareersOpen(true); }}
                    onBlur={(event) => { if (isCareers && !event.currentTarget.contains(event.relatedTarget)) setIsCareersOpen(false); }}
                    onMouseEnter={() => {
                      setHoveredIndex(idx);
                      if (isServices) setIsServicesOpen(true);
                      if (isProducts) setIsProductsOpen(true);
                      if (isCareers) setIsCareersOpen(true);
                    }}
                    onMouseLeave={(event) => {
                      setHoveredIndex(null);
                      if (isServices) setIsServicesOpen(false);
                      if (isProducts) setIsProductsOpen(false);
                      if (isCareers && !event.currentTarget.contains(document.activeElement)) setIsCareersOpen(false);
                    }}
                  >
                    {isCareers ? <button
                      type="button"
                      ref={careersTriggerRef}
                      id={`${careersMenuId}-trigger`}
                      aria-haspopup="menu"
                      aria-expanded={isCareersOpen}
                      aria-controls={isCareersOpen ? `${careersMenuId}-desktop` : undefined}
                      onClick={() => setIsCareersOpen(true)}
                      onKeyDown={(event) => {
                        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                          event.preventDefault(); setIsCareersOpen(true);
                          requestAnimationFrame(() => careersContainerRef.current?.querySelector('[role="menuitem"]')?.focus());
                        }
                      }}
                      className={`relative px-2.5 lg:px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-[transform,opacity,box-shadow] duration-300 flex items-center gap-1 ${isLightSection ? 'text-slate-600 hover:text-primary' : 'text-slate-400 hover:text-white'}`}
                    >
                      <span className="relative z-10">{link.label}</span>
                      <ChevronDown size={12} className={`transition-transform duration-300 ${isCareersOpen ? 'rotate-180' : ''}`} />
                      <span className={`absolute bottom-0 left-2.5 lg:left-3.5 right-2.5 lg:right-3.5 h-[1.5px] rounded-full transition-transform duration-300 origin-left ${isActive ? 'scale-x-100' : 'scale-x-0'}`} style={{ background: accentGradient }} />
                    </button> : (
                    <Link
                      href={resolveHref(link.href)}
                      className={`relative px-2.5 lg:px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-[transform,opacity,box-shadow] duration-300 flex items-center gap-1 ${isLightSection ? 'text-slate-600 hover:text-primary' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                      <span className="relative z-10">{link.label}</span>
                      {(isServices || isProducts) && (
                        <ChevronDown
                          size={12}
                          className={`transition-transform duration-300 ${(isServices && isServicesOpen) || (isProducts && isProductsOpen) ? 'rotate-180' : ''}`}
                        />
                      )}
                      <span className={`absolute bottom-0 left-2.5 lg:left-3.5 right-2.5 lg:right-3.5 h-[1.5px] rounded-full transition-transform duration-300 origin-left ${isActive ? 'scale-x-100' : 'scale-x-0'
                        }`} style={{ background: accentGradient }} />
                    </Link>
                    )}

                    {isCareers && <AnimatePresence>{isCareersOpen && <motion.div
                      id={`${careersMenuId}-desktop`}
                      role="menu"
                      aria-labelledby={`${careersMenuId}-trigger`}
                      initial={{ opacity: 0, y: 8, scale: 0.97, x: "-50%" }}
                      animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
                      exit={{ opacity: 0, y: 8, scale: 0.97, x: "-50%" }}
                      transition={{ duration: 0.16, ease: "easeOut" }}
                      onKeyDown={(event) => {
                        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
                        event.preventDefault();
                        const items = Array.from(event.currentTarget.querySelectorAll('[role="menuitem"]'));
                        const current = items.indexOf(document.activeElement);
                        const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (current + (event.key === "ArrowUp" ? -1 : 1) + items.length) % items.length;
                        items[next]?.focus();
                      }}
                      className={`absolute top-full left-1/2 w-[210px] p-2 rounded-2xl border z-[110] mt-3.5 before:absolute before:-top-5 before:left-0 before:right-0 before:h-5 before:content-[''] ${isLightSection ? 'bg-white border-slate-200 text-slate-900 shadow-xl shadow-slate-300/40' : DARK_GLASS_MENU}`}
                    >{link.children.map((child) => <Link key={child.id} role="menuitem" href={child.href} onClick={() => setIsCareersOpen(false)} className={`block rounded-xl px-4 py-3 text-[11px] font-bold uppercase tracking-wider ${isLightSection ? 'hover:bg-slate-100 focus-visible:bg-slate-100 text-slate-800' : 'hover:bg-white/5 focus-visible:bg-white/5 text-slate-200'} focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary`}>{child.label}</Link>)}</motion.div>}</AnimatePresence>}


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
                            className={`absolute top-full left-1/2 w-[640px] p-4 rounded-2xl border shadow-[0_25px_60px_rgba(0,0,0,0.25)] z-[110] mt-3.5 before:absolute before:-top-5 before:left-0 before:right-0 before:h-5 before:content-[''] transition-none ${
                              isLightSection
                                ? 'bg-white border-slate-200 text-slate-900 shadow-slate-300/50'
                                : DARK_GLASS_MENU
                            }`}
                          >
                            <div className="grid grid-cols-[220px_1fr] gap-3">
                              {/* Left: Sections */}
                              <div className={`rounded-xl border p-2 transition-none ${
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
                                        className={`relative w-full text-left px-3 py-2 rounded-lg transition-[transform,opacity,box-shadow] duration-300 flex items-center justify-between gap-3 group/item overflow-hidden ${
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
                                          className={`absolute left-0 top-1.5 bottom-1.5 w-[2.5px] rounded-r-full transition-[transform,opacity,box-shadow] duration-300 ${
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
                              <div className={`rounded-xl border p-2 transition-none ${
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
                                      className={`relative flex items-center gap-3 p-3 rounded-xl transition-[transform,opacity,box-shadow] duration-300 group/item overflow-hidden ${
                                        isLightSection
                                          ? 'hover:bg-slate-100 hover:border-slate-200'
                                          : 'hover:bg-white/5 hover:border hover:border-white/5'
                                      }`}
                                    >
                                      {/* Left Indicator bar on hover */}
                                      <span
                                        className="absolute left-0 top-2.5 bottom-2.5 w-[2.5px] rounded-r-full opacity-0 group-hover/item:opacity-100 transition-[transform,opacity,box-shadow] duration-300 scale-y-50 group-hover/item:scale-y-100"
                                        style={{ background: accentGradient }}
                                      />
                                      <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover/item:scale-110 transition-transform duration-300 shrink-0">
                                        <service.Icon size={16} />
                                      </div>
                                      <span className={`text-[10px] font-bold uppercase tracking-wider transition-none ${
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
                            className={`absolute top-full left-1/2 w-[320px] p-4 rounded-2xl border shadow-[0_25px_60px_rgba(0,0,0,0.25)] z-[110] mt-3.5 before:absolute before:-top-5 before:left-0 before:right-0 before:h-5 before:content-[''] transition-none ${
                              isLightSection
                                ? 'bg-white border-slate-200 text-slate-900 shadow-slate-300/50'
                                : DARK_GLASS_MENU
                            }`}
                          >
                            <div className={`rounded-xl border p-3 transition-none ${
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
                                {visibleProducts.map((product, pIdx) => {
                                  return (
                                    <Link
                                      key={product.id}
                                      href={product.href}
                                      onClick={() => setIsProductsOpen(false)}
                                      className={`relative flex items-center justify-between p-3 rounded-xl transition-[transform,opacity,box-shadow] duration-300 group/item overflow-hidden ${
                                        isLightSection
                                          ? 'hover:bg-slate-100 hover:border-slate-200'
                                          : 'hover:bg-white/5 hover:border hover:border-white/5'
                                      }`}
                                    >
                                      {/* Left Indicator bar on hover */}
                                      <span
                                        className="absolute left-0 top-2.5 bottom-2.5 w-[2.5px] rounded-r-full opacity-0 group-hover/item:opacity-100 transition-[transform,opacity,box-shadow] duration-300 scale-y-50 group-hover/item:scale-y-100"
                                        style={{ background: accentGradient }}
                                      />

                                      <div className="flex items-center gap-3">
                                        {product.navLogo || product.logo ? (
                                          <ProductLogo product={product.id} decorative variant="nav" />
                                        ) : (
                                          <div className={`w-6 h-6 rounded-md border flex items-center justify-center transition-[transform,opacity,box-shadow] duration-300 shrink-0 shadow-sm ${
                                            isLightSection
                                              ? 'bg-blue-600/10 border-blue-500/40 text-blue-600 group-hover/item:bg-blue-600 group-hover/item:border-blue-600 group-hover/item:text-white group-hover/item:shadow-[0_0_10px_rgba(37,99,235,0.4)]'
                                              : 'bg-blue-500/20 border-blue-400/40 text-blue-400 group-hover/item:bg-blue-600 group-hover/item:border-blue-500 group-hover/item:text-white group-hover/item:shadow-[0_0_12px_rgba(37,99,235,0.6)]'
                                          }`}>
                                            <span className="text-[10px] font-mono font-black tracking-tight">
                                              0{pIdx + 1}
                                            </span>
                                          </div>
                                        )}

                                        <div className="flex flex-col">
                                          <span className={`text-[10px] font-black uppercase tracking-wider transition-none ${
                                            isLightSection
                                              ? 'text-slate-800 group-hover/item:text-primary'
                                              : 'text-slate-200 group-hover/item:text-white'
                                          }`}>
                                            {product.title}
                                          </span>
                                          <span className={`text-[8px] font-mono uppercase tracking-[0.2em] transition-none ${
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
              {isInternPage ? <div className="hidden min-[1200px]:flex items-center gap-3">{showInternLogin && <Link href="/intern/login" className="inline-flex items-center justify-center h-9 px-4 rounded-full border border-blue-200 text-blue-700 hover:bg-blue-50 text-[11px] font-semibold whitespace-nowrap">Login</Link>}{showInternApply && <a href="/careers/intern#internship-application" className="inline-flex items-center justify-center h-9 px-4 rounded-full bg-[#1877F2] hover:bg-[#1565d8] text-white text-[11px] font-semibold whitespace-nowrap">Apply Now</a>}</div> : <DynamicNavCta
                mode={ctaMode}
                onToggle={toggleCtaMode}
                isLightSection={isLightSection}
                className={isInternPage ? "hidden min-[1200px]:flex" : "hidden min-[1100px]:flex"}
              />}
              {isInternPage && !hasInternDock && showInternApply && <a href="/careers/intern#internship-application" className="hidden min-[360px]:inline-flex min-[1200px]:hidden items-center justify-center h-8 px-3 rounded-full bg-[#1877F2] text-white text-[10px] font-semibold whitespace-nowrap">Apply Now</a>}

              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileOpen}
                className={`${isInternPage ? 'min-[1200px]:hidden' : 'min-[1100px]:hidden'} p-1.5 rounded-full border transition-none ${isLightSection ? 'border-slate-200 text-slate-950' : 'border-white/10 text-white'
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
                className={`${isInternPage ? 'min-[1200px]:hidden' : 'min-[1100px]:hidden'} border-t overflow-hidden rounded-b-xl transition-none ${
                  isLightSection
                    ? 'bg-white border-slate-200 text-slate-900'
                    : 'bg-transparent border-white/[0.08] text-white'
                }`}
              >
                <div className="px-6 pt-4 pb-6 flex flex-col gap-0.5 max-h-[80vh] overflow-y-auto">
                  {primaryLinks.map((link, idx) => {
                    const isServices = link.label === 'Services';
                    const isProducts = link.label === 'Products';
                    const isCareers = link.id === 'nav-careers';
                    const activeDot = (
                      <div className={`w-1 h-1 rounded-full bg-primary transition-transform ${activeIndex === idx ? 'scale-150' : 'scale-100 opacity-30'
                        }`} />
                    );

                    return (
                      <div key={link.id} ref={isCareers ? mobileCareersRef : undefined} className="flex flex-col">
                        {isCareers ? <button type="button" ref={mobileCareersTriggerRef} aria-expanded={mobileCareersOpen} aria-controls={mobileCareersOpen ? `${careersMenuId}-mobile` : undefined} onClick={() => setMobileCareersOpen((open) => !open)} className={`flex items-center justify-between py-2 text-[11px] font-bold uppercase tracking-wider ${isLightSection ? 'text-slate-600' : 'text-slate-400'} hover:text-primary`}><span className="flex items-center gap-2">{activeDot}{link.label}</span><ChevronDown size={14} className={`transition-transform duration-300 ${mobileCareersOpen ? 'rotate-180' : ''}`} /></button> : isServices || isProducts ? (
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
                              className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider transition-none ${isLightSection ? 'text-slate-600' : 'text-slate-400'
                                } hover:text-primary`}
                            >
                              {activeDot}
                              {link.label}
                            </button>
                            <ChevronDown
                              size={14}
                              className={`transition-transform duration-300 ${(isServices && mobileServicesOpen) || (isProducts && mobileProductsOpen) ? 'rotate-180' : ''} ${isLightSection ? 'text-slate-400' : 'text-slate-500'}`}
                            />
                          </div>
                        ) : (
                          <Link
                            href={resolveHref(link.href)}
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center justify-between py-2 text-[11px] font-bold uppercase tracking-wider transition-none ${isLightSection ? 'text-slate-600' : 'text-slate-400'
                              } hover:text-primary`}
                          >
                            <span className="flex items-center gap-2">
                              {activeDot}
                              {link.label}
                            </span>
                          </Link>
                        )}

                        {isCareers && <AnimatePresence>{mobileCareersOpen && <motion.div id={`${careersMenuId}-mobile`} role="region" aria-label="Careers" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden flex flex-col gap-1 pl-4 pt-1">{link.children.map((child) => <Link key={child.id} href={child.href} onClick={() => { setMobileCareersOpen(false); setMobileOpen(false); }} className={`relative pl-4 pr-5 py-3 rounded-lg border-l-2 border-transparent hover:border-primary/50 text-[10px] font-bold uppercase tracking-wider ${isLightSection ? 'text-slate-900 hover:bg-slate-50' : 'text-white hover:bg-white/5'}`}>{child.label}</Link>)}</motion.div>}</AnimatePresence>}

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
                                            className={`flex items-center gap-3 py-2 px-2 rounded-lg transition-[transform,opacity,box-shadow] ${isLightSection
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
                              {visibleProducts.map((product) => {
                                return (
                                  <Link
                                    key={product.id}
                                    href={product.href}
                                    onClick={() => {
                                      setMobileOpen(false);
                                      setMobileProductsOpen(false);
                                    }}
                                    className={`relative pl-4 pr-5 py-3 rounded-lg transition-[transform,opacity,box-shadow] border-l-2 border-transparent hover:border-primary/50 ${isLightSection
                                      ? 'text-slate-900 hover:text-slate-950 hover:bg-slate-50'
                                      : 'text-white hover:bg-white/5'
                                      }`}
                                  >
                                    {product.navLogo || product.logo ? (
                                      <span className="flex items-center gap-3">
                                        <ProductLogo product={product.id} decorative variant="nav" />
                                        <span className="text-[10px] font-bold tracking-wide">{product.title}</span>
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-bold tracking-wide">{product.title}</span>
                                    )}
                                  </Link>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                  <div className="pt-4 flex justify-center">
                    {isInternPage ? <div className="flex flex-wrap gap-2 w-full">{showInternLogin && <Link href="/intern/login" onClick={() => setMobileOpen(false)} className="inline-flex flex-1 items-center justify-center min-h-10 px-3 rounded-full border border-blue-100 bg-blue-50 text-blue-700 text-xs font-semibold">Login</Link>}{showInternApply && <a href="/careers/intern#internship-application" onClick={() => setMobileOpen(false)} className="inline-flex flex-1 items-center justify-center min-h-10 px-4 rounded-full bg-[#1877F2] text-white text-xs font-semibold">Apply Now</a>}</div> : <DynamicNavCta
                      mode={ctaMode}
                      onToggle={toggleCtaMode}
                      onActionClick={() => setMobileOpen(false)}
                      isLightSection={isLightSection}
                      isMobile={true}
                      layoutScope="mobile"
                      className="w-full justify-center"
                    />}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>
      </div>
      {hasInternDock && <InternMobileDock onNavigate={() => setMobileOpen(false)} />}
    </div>
  );
}
