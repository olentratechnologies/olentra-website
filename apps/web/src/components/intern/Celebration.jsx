"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PartyPopper, X } from "lucide-react";
import { fullscreen } from "@/lib/confetti.mjs";
import styles from "./celebration.module.css";

/**
 * Celebration overlay for big milestones (offer accepted, certificate issued…).
 * Confetti fills the page while a card announces the moment. Reduced motion
 * shows the card only. Change `replayKey` to celebrate a new moment while open.
 */
export default function Celebration({
  open,
  replayKey,
  icon: Icon = PartyPopper,
  title,
  message,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  onClose,
}) {
  const canvasRef = useRef(null);
  const actionRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return undefined;
    const stop = fullscreen(canvasRef.current);
    const previousFocus = document.activeElement;
    actionRef.current?.focus({ preventScroll: true });
    const onKey = (event) => { if (event.key === "Escape") closeRef.current?.(); };
    document.addEventListener("keydown", onKey);
    return () => {
      stop();
      document.removeEventListener("keydown", onKey);
      previousFocus?.focus?.({ preventScroll: true });
    };
  }, [open, replayKey]);

  if (!mounted || !open) return null;
  return createPortal(
    <div className={styles.root} key={replayKey}>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.glow} aria-hidden="true" />
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      <section className={styles.card} role="dialog" aria-modal="true" aria-labelledby="celebration-title" aria-describedby="celebration-message">
        <button className={styles.close} onClick={onClose} aria-label="Close celebration"><X size={18} /></button>
        <div className={styles.badge} aria-hidden="true">
          <span className={styles.ring} />
          <span className={styles.ring} />
          <Icon size={34} strokeWidth={1.8} />
        </div>
        <h2 id="celebration-title" className={styles.title}>{title}</h2>
        <p id="celebration-message" className={styles.message}>{message}</p>
        {(actionLabel || secondaryLabel) && (
          <div className={styles.actions}>
            {actionLabel && <button ref={actionRef} className={styles.action} onClick={onAction}>{actionLabel}</button>}
            {secondaryLabel && <button className={styles.secondary} onClick={onSecondary || onClose}>{secondaryLabel}</button>}
          </div>
        )}
      </section>
    </div>,
    document.body,
  );
}
