"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useLenis } from "lenis/react";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import styles from "./ApplicationLaunch.module.css";

function LaunchRocket() {
  const id = useId().replace(/:/g, "");
  return (
    <svg className={styles.rocket} viewBox="0 0 180 250" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-body`} x1="0" x2="1">
          <stop stopColor="#a9c9f5" />
          <stop offset=".4" stopColor="#fff" />
          <stop offset=".68" stopColor="#f5faff" />
          <stop offset="1" stopColor="#9fbee9" />
        </linearGradient>
        <linearGradient id={`${id}-blue`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#83dcff" />
          <stop offset=".35" stopColor="#227aff" />
          <stop offset=".75" stopColor="#224add" />
          <stop offset="1" stopColor="#182c9a" />
        </linearGradient>
        <linearGradient id={`${id}-window`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#b1f6ff" />
          <stop offset=".35" stopColor="#2594ee" />
          <stop offset="1" stopColor="#1948b9" />
        </linearGradient>
        <linearGradient id={`${id}-fire`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#f5fdff" />
          <stop offset=".2" stopColor="#fff4ac" />
          <stop offset=".55" stopColor="#ffb13b" />
          <stop offset=".86" stopColor="#ff6c28" />
          <stop offset="1" stopColor="#ff6430" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop stopColor="#ffb94d" stopOpacity=".48" />
          <stop offset="1" stopColor="#ffc261" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g className={styles.flame}>
        <ellipse cx="90" cy="200" rx="31" ry="49" fill={`url(#${id}-glow)`} />
        <path
          d="M75 171Q67 192 79 211L77 223 90 247Q99 232 99 220L111 206Q112 187 105 171Z"
          fill={`url(#${id}-fire)`}
        />
        <path d="M82 172Q79 195 90 220Q103 195 98 172Z" fill="#fff9df" />
      </g>
      <path
        d="M57 114Q24 137 31 173Q34 181 42 172L64 155M123 114Q156 137 149 173Q146 181 138 172L116 155"
        fill={`url(#${id}-blue)`}
      />
      <path
        d="M65 165Q45 116 60 72Q70 39 90 22Q111 41 121 73Q136 117 115 165Q90 176 65 165Z"
        fill={`url(#${id}-body)`}
      />
      <path
        d="M61 72Q71 40 90 22Q108 38 120 72Q92 84 61 72Z"
        fill={`url(#${id}-blue)`}
      />
      <path
        d="M63 73Q90 85 118 73"
        fill="none"
        stroke="#d8ecff"
        strokeWidth="2"
      />
      <circle cx="90" cy="111" r="24" fill={`url(#${id}-blue)`} />
      <circle
        cx="90"
        cy="111"
        r="18"
        fill={`url(#${id}-window)`}
        stroke="#d5edff"
        strokeWidth="3"
      />
      <path
        d="M81 105Q86 99 94 101"
        fill="none"
        stroke="#fff"
        strokeOpacity=".9"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path d="M68 164Q90 172 112 164L108 177Q90 183 72 177Z" fill="#355fcc" />
      <path
        d="M87 144Q90 138 93 144L96 178Q90 187 84 178Z"
        fill={`url(#${id}-blue)`}
      />
      <path
        d="M68 88Q58 119 69 145"
        fill="none"
        stroke="#fff"
        strokeWidth="4"
        strokeOpacity=".7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function ApplicationLaunch({
  phase,
  onDismiss,
  applicationId,
  accountHref = "/",
}) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const backRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const lenis = useLenis();
  const complete = phase === "complete";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousOverflow = document.body.style.overflow;
    const wasStopped = lenis?.isStopped;
    lenis?.stop();
    document.body.style.overflow = "hidden";
    if (!dialog.open) dialog.showModal();
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (!wasStopped) lenis?.start();
    };
  }, [lenis]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      data-testid="application-launch-dialog"
      data-phase={phase}
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        onDismiss();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const first = closeRef.current;
        const last = backRef.current || first;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
    >
      <button
        ref={closeRef}
        type="button"
        className={styles.close}
        onClick={onDismiss}
        aria-label="Close application confirmation"
      >
        <X size={17} aria-hidden="true" />
      </button>
      <span className={styles.eyebrow}>
        <span />
        Olentra Launchpad
      </span>
      <div className={styles.stage} aria-hidden="true">
        <div className={styles.halo} />
        <div className={`${styles.orbit} ${styles.orbitOne}`} />
        <div className={`${styles.orbit} ${styles.orbitTwo}`} />
        <span className={`${styles.star} ${styles.starOne}`} />
        <span className={`${styles.star} ${styles.starTwo}`} />
        <span className={`${styles.star} ${styles.starThree}`} />
        <span className={`${styles.particle} ${styles.particleOne}`} />
        <span className={`${styles.particle} ${styles.particleTwo}`} />
        {complete ? (
          <div className={styles.seal}>
            <span className={styles.sealInner}>
              <Check size={43} strokeWidth={2.4} />
            </span>
          </div>
        ) : (
          <LaunchRocket />
        )}
        <div className={styles.platform} />
      </div>
      <div
        className={styles.copy}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <h2 id={titleId}>
          {complete ? "Application received" : "Submitting your application…"}
        </h2>
        <p id={descriptionId}>
          {complete
            ? "Thank you for applying to Olentra. We’ve sent a confirmation email to your inbox. Our recruitment team reviews applications carefully and will reach out with an update within 3–5 business days."
            : "Sending your application to the Olentra team…"}
        </p>
        {complete && applicationId && (
          <span className={styles.applicationId}>
            Reference ID: {applicationId}
          </span>
        )}
      </div>
      {complete ? (
        <div className={styles.savedActions}>
          <Link className={styles.backButton} href={accountHref}>
            Explore Olentra <ArrowRight size={15} aria-hidden="true" />
          </Link>
          <button
            ref={backRef}
            type="button"
            className={styles.dismissButton}
            onClick={onDismiss}
          >
            <ArrowLeft size={13} aria-hidden="true" /> Close
          </button>
        </div>
      ) : (
        <div className={styles.progress} aria-hidden="true">
          <span />
        </div>
      )}
    </dialog>,
    document.body,
  );
}
