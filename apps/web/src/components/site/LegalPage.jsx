"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { companyInfo } from "@/data/company";
import {
  Printer,
  Copy,
  Check,
  ShieldCheck,
  FileText,
  ChevronDown,
  ArrowUpRight,
  Scale,
  Building2,
  Mail,
  ExternalLink
} from "lucide-react";

const LEGAL_TABS = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms of Service", href: "/terms-of-service" },
  { label: "Cookie Policy", href: "/cookie-policy" },
  { label: "Security", href: "/security" },
  { label: "Accessibility", href: "/accessibility" },
];

export default function LegalPage({
  title,
  eyebrow = "Legal & Compliance Center",
  description,
  sections = [],
  path = "/terms-of-service",
  effectiveDate = "January 1, 2026",
  lastUpdated = "November 17, 2026",
  version = "2.4",
  summaryNotice,
}) {
  const [activeSection, setActiveSection] = useState(sections[0]?.id || "");
  const [copied, setCopied] = useState(false);
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const observerRef = useRef(null);

  // Set up scroll-spy for active section
  useEffect(() => {
    if (!sections || sections.length === 0) return;

    const handleIntersect = (entries) => {
      // Find the first intersecting entry
      const visible = entries.find((entry) => entry.isIntersecting);
      if (visible) {
        setActiveSection(visible.target.id);
      }
    };

    observerRef.current = new IntersectionObserver(handleIntersect, {
      root: null,
      rootMargin: "-120px 0px -60% 0px",
      threshold: 0,
    });

    sections.forEach((section) => {
      const el = document.getElementById(section.id);
      if (el) observerRef.current.observe(el);
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [sections]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const isPrivacy = path.includes("privacy");
  const isTerms = path.includes("terms");

  return (
    <main
      className="relative min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-600/10 selection:text-blue-900 print:bg-white print:text-black"
      data-theme="light"
    >
      {/* Global Navbar */}
      <div className="print:hidden">
        <Navbar />
      </div>

      {/* Clean Document Header (Zero Marketing Hero / No Background Images) */}
      <header className="pt-28 md:pt-36 pb-10 md:pb-14 bg-white border-b border-slate-200/90 print:pt-0 print:pb-6 print:border-b-2 print:border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            {/* Document Eyebrow Badge */}
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 print:border-none print:p-0">
                {isPrivacy ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600 print:hidden" />
                ) : (
                  <Scale className="w-3.5 h-3.5 text-slate-700 print:hidden" />
                )}
                {eyebrow}
              </span>
              <span className="text-xs text-slate-400 print:hidden">•</span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider print:hidden">
                Official Legal Document
              </span>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-950 mb-4 print:text-3xl print:mb-2">
              {title}
            </h1>

            {/* Description */}
            {description && (
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-3xl mb-6 font-normal print:text-sm print:text-slate-800">
                {description}
              </p>
            )}

            {/* Metadata Badges & Action Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100 print:border-slate-300 print:text-xs">
              <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs text-slate-600">
                <div>
                  <span className="text-slate-400 font-medium">Effective Date: </span>
                  <strong className="text-slate-800 font-semibold">{effectiveDate}</strong>
                </div>
                <span className="text-slate-300 hidden sm:inline">•</span>
                <div>
                  <span className="text-slate-400 font-medium">Last Updated: </span>
                  <strong className="text-slate-800 font-semibold">{lastUpdated}</strong>
                </div>
                <span className="text-slate-300 hidden sm:inline">•</span>
                <div>
                  <span className="text-slate-400 font-medium">Version: </span>
                  <span className="font-mono font-semibold text-slate-700">{version}</span>
                </div>
                <span className="text-slate-300 hidden sm:inline">•</span>
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-800">{companyInfo.legalName}</span>
                </div>
              </div>

              {/* Action Buttons: Print & Copy Link */}
              <div className="flex items-center gap-2 print:hidden">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-xs font-semibold text-slate-700 transition-all shadow-xs cursor-pointer"
                  title="Copy permanent link to clipboard"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-xs font-semibold text-slate-700 transition-all shadow-xs cursor-pointer"
                  title="Print or export as PDF"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>Print / PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Legal Document Navigation Switcher Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 print:hidden">
          <nav
            aria-label="Legal Center Sections"
            className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200 text-xs font-semibold"
          >
            {LEGAL_TABS.map((tab) => {
              const isActive = path === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`px-4 py-2.5 rounded-t-lg transition-colors whitespace-nowrap border-b-2 -mb-px flex items-center gap-2 ${
                    isActive
                      ? "border-blue-600 text-blue-700 bg-blue-50/50 font-bold"
                      : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                  }`}
                >
                  <FileText className={`w-3.5 h-3.5 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Layout with Sticky Table of Contents */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        {/* Mobile TOC Quick Selector */}
        <div className="lg:hidden mb-8 print:hidden">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <button
              type="button"
              onClick={() => setMobileTocOpen(!mobileTocOpen)}
              className="w-full flex items-center justify-between text-left text-sm font-bold text-slate-900"
            >
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Table of Contents ({sections.length} Sections)</span>
              </span>
              <ChevronDown
                className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                  mobileTocOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {mobileTocOpen && (
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 max-h-72 overflow-y-auto">
                {sections.map((sec, idx) => (
                  <a
                    key={sec.id || idx}
                    href={`#${sec.id || `section-${idx + 1}`}`}
                    onClick={() => setMobileTocOpen(false)}
                    className={`block py-1.5 px-2.5 rounded-md text-xs transition-colors ${
                      activeSection === sec.id
                        ? "bg-blue-50 text-blue-700 font-bold"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-slate-400 mr-1.5">{sec.number || idx + 1}.</span>
                    {sec.heading}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-12 items-start">
          {/* Desktop Sticky Table of Contents Sidebar */}
          <aside className="hidden lg:block lg:col-span-4 xl:col-span-3 sticky top-28 space-y-6 print:hidden">
            <nav
              aria-label="Table of Contents"
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs"
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  Table of Contents
                </h2>
                <span className="text-[11px] font-medium text-slate-400">
                  {sections.length} Sections
                </span>
              </div>
              <ul className="space-y-1 text-xs max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {sections.map((sec, idx) => {
                  const targetId = sec.id || `section-${idx + 1}`;
                  const isActive = activeSection === targetId;
                  return (
                    <li key={targetId}>
                      <a
                        href={`#${targetId}`}
                        className={`group flex items-start gap-2 py-1.5 px-2.5 rounded-lg transition-all ${
                          isActive
                            ? "bg-blue-50 text-blue-700 font-bold shadow-xs"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        }`}
                      >
                        <span
                          className={`font-mono text-[11px] transition-colors ${
                            isActive ? "text-blue-600 font-semibold" : "text-slate-400 group-hover:text-slate-600"
                          }`}
                        >
                          {sec.number || idx + 1}.
                        </span>
                        <span className="line-clamp-1 leading-snug">{sec.heading}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Quick Support / Legal Desk Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs text-xs space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <Mail className="w-4 h-4 text-blue-600" />
                <span>Legal & Compliance Desk</span>
              </div>
              <p className="text-slate-500 leading-relaxed text-[11px]">
                Questions regarding our legal terms, GDPR/DPDP data subject rights, or security disclosures?
              </p>
              <a
                href={companyInfo.emailHref}
                className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-semibold text-[11px] hover:underline"
              >
                <span>{companyInfo.email}</span>
                <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
          </aside>

          {/* Document Body Area */}
          <section className="lg:col-span-8 xl:col-span-9 max-w-3xl">
            {/* Executive Summary Callout Notice */}
            {summaryNotice && (
              <div className="mb-10 rounded-2xl border border-blue-200/70 bg-blue-50/60 p-6 sm:p-7 shadow-xs">
                <div className="flex items-center gap-2 mb-2 text-blue-900 font-bold text-sm tracking-tight">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Executive Notice & Transparency Guarantee</span>
                </div>
                <p className="text-xs sm:text-sm text-blue-950/80 leading-relaxed">
                  {summaryNotice}
                </p>
              </div>
            )}

            {/* Structured Legal Sections */}
            <div className="space-y-12 sm:space-y-16">
              {sections.map((section, idx) => {
                const targetId = section.id || `section-${idx + 1}`;
                return (
                  <article
                    key={targetId}
                    id={targetId}
                    className="scroll-mt-28 sm:scroll-mt-32 pb-10 border-b border-slate-200/70 last:border-none print:pb-6 print:border-slate-300"
                  >
                    {/* Section Header */}
                    <div className="mb-5">
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider mb-1.5 print:text-black">
                        <span>Section {section.number || idx + 1}</span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center justify-between group print:text-xl">
                        <span>{section.heading}</span>
                        <a
                          href={`#${targetId}`}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-blue-600 text-base print:hidden ml-2"
                          aria-label={`Direct link to ${section.heading}`}
                        >
                          #
                        </a>
                      </h2>
                      {section.summary && (
                        <p className="mt-2 text-xs text-slate-500 font-medium italic print:hidden">
                          {section.summary}
                        </p>
                      )}
                    </div>

                    {/* Section Body Paragraphs */}
                    {section.body && section.body.length > 0 && (
                      <div className="space-y-3.5 text-slate-700 leading-relaxed text-sm sm:text-base font-normal">
                        {section.body.map((paragraph, pIdx) => (
                          <p key={pIdx} className="leading-relaxed">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Subsections if available */}
                    {section.subsections && section.subsections.length > 0 && (
                      <div className="mt-6 space-y-6">
                        {section.subsections.map((sub, sIdx) => (
                          <div
                            key={sIdx}
                            className="rounded-xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-2xs print:border-slate-300 print:p-3"
                          >
                            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3 print:text-base">
                              {sub.title}
                            </h3>
                            <div className="space-y-2.5 text-sm sm:text-base text-slate-700 leading-relaxed">
                              {sub.body?.map((subP, subPIdx) => (
                                <p key={subPIdx}>{subP}</p>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* List Items if available */}
                    {section.list && section.list.length > 0 && (
                      <ul className="mt-4 space-y-2 text-sm sm:text-base text-slate-700 list-disc list-inside">
                        {section.list.map((item, lIdx) => (
                          <li key={lIdx} className="leading-relaxed">
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Legal / Warning Callout Box */}
                    {section.callout && (
                      <div
                        className={`mt-6 rounded-xl p-5 border text-xs sm:text-sm leading-relaxed ${
                          section.callout.type === "warning"
                            ? "bg-amber-50/70 border-amber-300 text-amber-950 font-medium"
                            : section.callout.type === "legal"
                            ? "bg-slate-100 border-slate-300 text-slate-900 font-semibold tracking-wide uppercase"
                            : "bg-blue-50/70 border-blue-200 text-blue-950 font-medium"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1.5 font-bold">
                          {section.callout.type === "warning" ? (
                            <span className="text-amber-800">⚠️ {section.callout.title}</span>
                          ) : (
                            <span className="text-slate-900">⚖️ {section.callout.title}</span>
                          )}
                        </div>
                        <p>{section.callout.text}</p>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            {/* Document Signature & Official Registry Card */}
            <div className="mt-16 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3">
                Official Entity Governance & Attestation
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-5">
                This document is maintained by the legal, compliance, and information security departments of {companyInfo.legalName}. Any inquiries regarding enforcement, privacy rights under GDPR or the DPDP Act 2023, or commercial licensing should be directed to our designated compliance desk.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Corporate Entity:</span>
                  <span className="font-semibold text-slate-900">{companyInfo.legalName}</span>
                  <span className="text-slate-500 block">trading as {companyInfo.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Statutory Jurisdiction:</span>
                  <span className="font-semibold text-slate-900">Hyderabad, Telangana, India</span>
                  <span className="text-slate-500 block">Global Enterprise Delivery</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Direct Inquiries:</span>
                  <a href={companyInfo.emailHref} className="text-blue-600 font-semibold hover:underline">
                    {companyInfo.email}
                  </a>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Commercial Inquiries:</span>
                  <Link href="/#contact" className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-1">
                    <span>Contact Enterprise Team</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Global Footer */}
      <div className="print:hidden">
        <Footer />
      </div>
    </main>
  );
}
