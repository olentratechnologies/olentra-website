"use client";

import { useEffect, useState } from "react";
import { ArrowRight, ClipboardCheck, TimerReset } from "lucide-react";
import { deadlineTime, extensionLabel, formatDeadline, timeRemaining } from "@/lib/intern/application-deadline.mjs";
import styles from "./extended-window.module.css";

/** "2 days 4 hr left", "3 hr 12 min left", "45 min left". */
export function leftLabel(time, now = Date.now()) {
  const left = timeRemaining(time, now);
  if (left.days) return `${left.days} day${left.days === 1 ? "" : "s"} ${left.hours} hr left`;
  if (left.hours) return `${left.hours} hr ${left.minutes} min left`;
  return `${Math.max(1, left.minutes)} min left`;
}

/**
 * The careers page's big notice while an extended application window is open:
 * how long it was extended, until when, and that applications received
 * before the original deadline are already under review.
 */
export default function ExtendedWindowBanner({ extension, deadline }) {
  const time = deadlineTime(deadline);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(timer); }, []);
  if (!extension || time === null || time <= now) return null;
  const previous = deadlineTime(extension.previousDeadline);
  return (
    <div className={styles.wrap}>
    <section className={styles.banner} aria-labelledby="extended-window-title" data-theme="light">
      <div className={styles.main}>
        <span className={styles.icon} aria-hidden="true"><TimerReset size={22} /></span>
        <div className={styles.copy}>
          <span className={styles.badge}>Extended window</span>
          <h2 id="extended-window-title">
            {extension.reopened ? `Applications reopened for ${extensionLabel(extension)}` : `Applications extended by ${extensionLabel(extension)}`}
          </h2>
          <p className={styles.until}>
            Now open until <strong>{formatDeadline(time)}</strong> · <span className={styles.left}>{leftLabel(time, now)}</span>
          </p>
        </div>
        <a href="#internship-application" className={styles.apply}>Apply now <ArrowRight size={15} aria-hidden="true" /></a>
      </div>
      <div className={styles.review}>
        <ClipboardCheck size={17} aria-hidden="true" />
        <p>
          <strong>Applications received so far are under review.</strong>{" "}
          {previous !== null ? `Everything submitted by ${formatDeadline(previous)} is being reviewed now. ` : ""}
          Already applied? You don’t need to apply again; we’ll email you with an update.
        </p>
      </div>
    </section>
    </div>
  );
}
