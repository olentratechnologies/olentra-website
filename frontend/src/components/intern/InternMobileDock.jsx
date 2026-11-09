"use client";

import Link from "next/link";
import { useLenis } from "lenis/react";
import { ArrowRight, LogIn } from "lucide-react";
import styles from "./mobile-dock.module.css";
import { useSiteFeatures } from "@/components/site-features";

export default function InternMobileDock({ onNavigate }) {
  const lenis = useLenis();
  const { features, ready } = useSiteFeatures();
  const showLogin = ready && features.portal;
  const showApply = ready && features.internships && features.applications;

  function openApplication(event) {
    onNavigate?.();
    const section = document.getElementById("internship-application");
    if (!section) return;
    event.preventDefault();
    event.stopPropagation();
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const top = Math.max(
      0,
      section.getBoundingClientRect().top + window.scrollY - 112,
    );
    if (lenis) {
      lenis.scrollTo(top, { immediate: reducedMotion, duration: 0.7 });
    } else {
      window.scrollTo({ top, behavior: reducedMotion ? "instant" : "smooth" });
    }
    window.history.replaceState(
      window.history.state,
      "",
      "#internship-application",
    );
  }

  if (!showLogin && !showApply) return null;

  return (
    <nav className={styles.dock} style={{ gridTemplateColumns: showLogin && showApply ? "1fr 1.35fr" : "1fr" }} aria-label="Internship quick actions">
      {showLogin && <Link
        href="/intern/login"
        className={`${styles.action} ${styles.login}`}
        onClick={onNavigate}
      >
        <LogIn size={18} aria-hidden="true" />
        Login
      </Link>}
      {showApply && <a
        href="/careers/intern#internship-application"
        className={`${styles.action} ${styles.apply}`}
        onClick={openApplication}
      >
        Apply Now <ArrowRight size={18} aria-hidden="true" />
      </a>}
    </nav>
  );
}
