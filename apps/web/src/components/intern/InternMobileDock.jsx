"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLenis } from "lenis/react";
import { ArrowRight, LogIn } from "lucide-react";
import styles from "./mobile-dock.module.css";
import { useSiteFeatures } from "@olentra/site-features/react";

const SHOW_NEAR_TOP = 80; // always visible at the top of the page
const MIN_DELTA = 8; // ignore tiny jitters before switching direction

/** Hidden while the visitor scrolls down, shown again as soon as they scroll up. */
function useHideOnScrollDown() {
  const [hidden, setHidden] = useState(false);
  const last = useRef(0);
  useEffect(() => {
    last.current = window.scrollY;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = Math.max(0, window.scrollY), delta = y - last.current;
      if (y < SHOW_NEAR_TOP) { setHidden(false); last.current = y; return; }
      if (Math.abs(delta) < MIN_DELTA) return;
      setHidden(delta > 0);
      last.current = y;
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (frame) cancelAnimationFrame(frame); };
  }, []);
  return [hidden, setHidden];
}

export default function InternMobileDock({ onNavigate }) {
  const lenis = useLenis();
  const [hidden, setHidden] = useHideOnScrollDown();
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
    <nav
      className={styles.dock}
      data-hidden={hidden || undefined}
      // Keyboard users tabbing into a hidden dock bring it back into view.
      onFocus={() => setHidden(false)}
      style={{ gridTemplateColumns: showLogin && showApply ? "1fr 1.35fr" : "1fr" }} aria-label="Internship quick actions">
      {showLogin && <Link
        href="/intern/login"
        className={`${styles.action} ${styles.login}`}
        onClick={onNavigate}
      >
        <LogIn size={15} aria-hidden="true" />
        Login
      </Link>}
      {showApply && <a
        href="/careers/intern#internship-application"
        className={`${styles.action} ${styles.apply}`}
        onClick={openApplication}
      >
        Apply Now <ArrowRight size={15} aria-hidden="true" />
      </a>}
    </nav>
  );
}
