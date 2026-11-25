"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, TimerReset, X } from "lucide-react";
import { useSiteFeatures } from "@olentra/site-features/react";
import { deadlineTime, formatDeadline } from "@/lib/intern/application-deadline.mjs";
import { leftLabel } from "./ExtendedWindowBanner";
import styles from "./extended-window.module.css";

const DISMISSED_KEY = "olentra.applicationsExtendedBar.dismissed";
// The careers page has its own large banner; dashboards and the portal are for staff and interns.
const HIDDEN_ON = ["/careers/intern", "/intern", "/dashboard"];

function backend() {
  const configured = process.env.NEXT_PUBLIC_INTERNSHIP_BACKEND_URL || process.env.NEXT_PUBLIC_INTERN_BACKEND_URL;
  const host = typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname) ? window.location.hostname : "localhost";
  return (configured || `http://${host}:3003`).replace(/\/$/, "");
}

/**
 * A slim notice on every page of the website while an extended application
 * window is open: "Internship applications extended until …  Apply now".
 */
export default function ApplicationsExtendedBar() {
  const pathname = usePathname() || "/";
  const { features } = useSiteFeatures();
  const hidden = HIDDEN_ON.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const [window_, setWindow] = useState(null);
  const [dismissed, setDismissed] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (hidden) return undefined;
    let live = true;
    fetch(`${backend()}/intern/public/window`, { credentials: "omit" })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => { if (live && body?.ok) setWindow(body.data); })
      .catch(() => {});
    try { setDismissed(localStorage.getItem(DISMISSED_KEY)); } catch { /* storage unavailable */ }
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => { live = false; clearInterval(timer); };
  }, [hidden]);

  const extension = window_?.deadlineExtension;
  const time = deadlineTime(window_?.applicationDeadline);
  const active = Boolean(
    !hidden && window_?.programEnabled && features?.internships !== false && features?.applications !== false &&
    extension && time !== null && extension.deadline === window_.applicationDeadline && time > now && dismissed !== extension.extendedOn,
  );
  if (!active) return null;

  function dismiss() {
    setDismissed(extension.extendedOn);
    try { localStorage.setItem(DISMISSED_KEY, extension.extendedOn); } catch { /* storage unavailable */ }
  }

  return (
    <div className={styles.bar} role="region" aria-label="Internship applications extended">
      <TimerReset size={16} aria-hidden="true" className={styles.barIcon} />
      <p>
        <strong>Internship applications {extension.reopened ? "reopened" : "extended"}</strong>
        <span> until {formatDeadline(time)} · {leftLabel(time, now)}</span>
      </p>
      <Link href="/careers/intern#internship-application" className={styles.barLink}>Apply now <ArrowRight size={14} aria-hidden="true" /></Link>
      <button type="button" className={styles.barClose} onClick={dismiss} aria-label="Dismiss"><X size={15} /></button>
    </div>
  );
}
