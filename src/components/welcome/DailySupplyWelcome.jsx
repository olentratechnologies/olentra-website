"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowUpRight, X } from "lucide-react";
import styles from "./welcome.module.css";
import heroStyles from "../products/dailysupply/cinematic.module.css";

const STORAGE_KEY = "olentra_dailysupply_welcome_v1";
let dismissedThisSession = false;

function GoldHandshake() {
  return (
    <div className={styles.art} aria-hidden="true">
      <div className={styles.halo} />
      <div className={styles.orbit} />
      <svg viewBox="0 0 400 240" className={styles.hands}>
        <defs>
          <linearGradient id="welcome-gold" x1="0" y1="0" x2="0.6" y2="1">
            <stop stopColor="#fff1ba" /><stop offset=".3" stopColor="#edc76b" />
            <stop offset=".65" stopColor="#c48a2b" /><stop offset=".85" stopColor="#f2cf7c" /><stop offset="1" stopColor="#9c641b" />
          </linearGradient>
          <linearGradient id="welcome-gold-light" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#fff5cf" /><stop offset=".4" stopColor="#f4ce76" /><stop offset="1" stopColor="#b97c26" />
          </linearGradient>
          <filter id="welcome-shadow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="8" stdDeviation="7" floodColor="#301b00" floodOpacity=".45" />
          </filter>
        </defs>
        <g className={styles.joined} filter="url(#welcome-shadow)">
          <g className={styles.leftHand}>
            <path d="M55 118 102 74Q110 67 119 75L140 92 170 88Q182 87 193 97L253 147Q264 157 256 166 251 173 243 169 251 180 241 187 234 192 226 185 231 196 221 200 214 203 205 196L161 166Q148 166 135 153L120 143 96 166Q88 173 81 165L54 136Q47 126 55 118Z" fill="url(#welcome-gold)" stroke="#e5b85c" strokeWidth="1.5" />
            <path d="m114 92 20 18m61 40 48 38m-36-54 38 32" fill="none" stroke="#8b551b" strokeOpacity=".35" strokeWidth="3" strokeLinecap="round" />
            <path d="m61 121 40-37q8-6 14 1" fill="none" stroke="#fff5cc" strokeWidth="5" strokeLinecap="round" opacity=".65" />
          </g>
          <g className={styles.rightHand}>
            <path d="m345 116-44-42q-8-8-17 0l-27 23-35-10q-16-4-29 7l-28 26q-10 11 0 20 8 7 19-1l22-17 35 28q13 10 25-1l14-12 24 27q8 8 16 0l26-29q8-10-1-19Z" fill="url(#welcome-gold-light)" stroke="#e6bc67" strokeWidth="1.5" />
            <path d="m151 146q-7-7-14 0l-6 7q-7 8 1 15 7 6 14-1l6-7q6-7-1-14Zm15 13q-7-7-14 1l-6 7q-7 8 1 15 7 6 14-1l6-8q6-7-1-14Zm16 12q-7-6-13 1l-6 7q-6 8 1 14 7 6 13-1l6-7q6-8-1-14Zm16 11q-7-6-13 1l-4 5q-6 7 1 13 7 6 13-1l4-5q6-7-1-13Z" fill="url(#welcome-gold-light)" stroke="#b77e2d" strokeWidth="1.5" />
            <path d="m202 98 18-3 38 12m33-24 42 40" fill="none" stroke="#fff6d6" strokeWidth="5" strokeLinecap="round" opacity=".65" />
          </g>
        </g>
        <g className={styles.sparkles} fill="#ffe4a0">
          <path d="m200 36 3 10 10 3-10 3-3 10-3-10-10-3 10-3Z" />
          <path d="m90 61 2 6 6 2-6 2-2 6-2-6-6-2 6-2Zm225 118 2 7 7 2-7 2-2 7-2-7-7-2 7-2Z" />
          <circle cx="118" cy="194" r="2" /><circle cx="290" cy="49" r="2" />
        </g>
      </svg>
      <span className={styles.artCaption}>BETTER, TOGETHER.</span>
    </div>
  );
}

export default function DailySupplyWelcome() {
  const [open, setOpen] = useState(false);
  const previousFocus = useRef(null);
  useEffect(() => {
    let timer;
    const schedule = () => {
      let seen = dismissedThisSession;
      try { seen ||= Boolean(localStorage.getItem(STORAGE_KEY)); } catch { /* Storage may be disabled. */ }
      if (!seen) timer = window.setTimeout(() => {
        previousFocus.current = document.activeElement;
        setOpen(true);
      }, 1400);
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });
    return () => { clearTimeout(timer); window.removeEventListener("load", schedule); };
  }, []);

  function dismiss() {
    dismissedThisSession = true;
    try { localStorage.setItem(STORAGE_KEY, "dismissed"); } catch { /* Keep dismissal for this session. */ }
    setOpen(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={(value) => { if (!value) dismiss(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content data-lenis-prevent className={styles.modal} onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (previousFocus.current?.isConnected) previousFocus.current.focus();
        }}>
          <Dialog.Close className={styles.close} aria-label="Close DailySupply welcome"><X size={19} /></Dialog.Close>
          <GoldHandshake />
          <div className={styles.reveal}>
            <p className={styles.eyebrow}>A new connection. A smarter everyday.</p>
            <Dialog.Title className={styles.title}>
              <span className={`${heroStyles.presentingContainer} ${styles.introducingRow}`}>
                <span className={`${heroStyles.presentingWing} ${heroStyles.wingLeft}`} aria-hidden="true">
                  <span className={heroStyles.wingLine} />
                  <span className={heroStyles.wingGlow} />
                  <span className={heroStyles.wingDot} />
                </span>
                <span className={`${heroStyles.presentingText} ${styles.introducingText}`}>Introducing</span>
                <span className={`${heroStyles.presentingWing} ${heroStyles.wingRight}`} aria-hidden="true">
                  <span className={heroStyles.wingDot} />
                  <span className={heroStyles.wingGlow} />
                  <span className={heroStyles.wingLine} />
                </span>
              </span>
              <Image
                src="/images/products/dailysupply/dailysupply-logo-white-text.png"
                alt="DailySupply"
                width={380}
                height={100}
                sizes="(max-width: 480px) 75vw, 300px"
                className={styles.productLogo}
              />
            </Dialog.Title>
            <Dialog.Description className={styles.description}>Where businesses connect, supply flows smarter, and everyday operations work together.</Dialog.Description>
            <div className={styles.modules} aria-label="Connected operations"><span>Suppliers</span><span>Warehouses</span><span>Stores & POS</span></div>
            <p className={styles.support}>Your inventory, billing, and retail operations. One intelligently connected platform.</p>
            <div className={styles.actions}>
              <Link href="/products/dailysupply" className={styles.primary} onClick={dismiss}>Explore DailySupply <ArrowUpRight size={18} /></Link>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
