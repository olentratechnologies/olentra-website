"use client";

import React, { useEffect, useRef } from "react";

const SHOTS = [
  { v: "pos", url: "/images/products/dailysupply/dailysupply_pos_and_billing_dashboard.png", t: "POS & Billing" },
  { v: "catalogue", url: "/images/products/dailysupply/dailysupply_product_catalogue_dashboard.png", t: "Product Catalogue" },
  { v: "store", url: "/images/products/dailysupply/dailysupply_store_management_dashboard.png", t: "Store Management" },
  { v: "erp", url: "/images/products/dailysupply/dailysupply_erp_dashboard_overview.png", t: "ERP Overview" },
  { v: "warehouse", url: "/images/products/dailysupply/dailysupply_warehouse_dashboard.png", t: "Warehouse Ops" },
  { v: "analytics", url: "/images/products/dailysupply/dailysupply_analytics_dashboard.png", t: "Real-time Analytics" },
  { v: "vendor", url: "/images/products/dailysupply/dailysupply_vendor_management_dashboard.png", t: "Vendor Network" },
  { v: "receiving", url: "/images/products/dailysupply/dailysupply_smart_receiving_dashboard.png", t: "Smart Receiving" },
  { v: "orders", url: "/images/products/dailysupply/dailysupply_residential_orders_dashboard.png", t: "Residential Orders" },
  { v: "admin", url: "/images/products/dailysupply/dailysupply_admin_dashboard_interface.png", t: "Admin Interface" },
];

function creative(d) {
  return `<img alt="${d.t}" src="${d.url}" />`;
}

export function MotionShowcaseSection() {
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const ringRef = useRef(null);
  const stARef = useRef(null);
  const stBRef = useRef(null);

  useEffect(() => {
    const stageEl = stageRef.current;
    const canvas = canvasRef.current;
    const ringEl = ringRef.current;
    if (!stageEl || !canvas || !ringEl) return;

    // 1. STARFIELD INITIALIZATION
    if (stARef.current) {
      const starsA = [];
      for (let i = 0; i < 150; i++) {
        const x = (Math.random() * 100).toFixed(2);
        const y = (Math.random() * 100).toFixed(2);
        const a = (0.05 + Math.random() * 0.25).toFixed(3);
        starsA.push(`${x}vw ${y}vh 0px 0 rgba(255,255,255,${a})`);
      }
      stARef.current.style.boxShadow = starsA.join(", ");
    }
    if (stBRef.current) {
      const starsB = [];
      for (let i = 0; i < 18; i++) {
        const x = (Math.random() * 100).toFixed(2);
        const y = (Math.random() * 100).toFixed(2);
        const a = (0.35 + Math.random() * 0.35).toFixed(3);
        starsB.push(`${x}vw ${y}vh 1.2px 0 rgba(255,255,255,${a})`);
      }
      stBRef.current.style.boxShadow = starsB.join(", ");
    }

    // 2. BUILD NON-OVERLAPPING DESKTOP CARDS
    const TOTAL_CARDS = 20;
    if (ringEl.children.length === 0) {
      for (let i = 0; i < TOTAL_CARDS; i++) {
        const d = SHOTS[i % SHOTS.length];
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = creative(d);
        const img = card.querySelector("img");
        if (img) {
          img.addEventListener("error", () => {
            card.classList.add("broken");
          });
        }
        ringEl.appendChild(card);
      }
    }

    // 3. RESPONSIVE SCALE PARAMETERS
    const CANVAS_H = 420;
    function updateScale() {
      if (!canvas || !stageEl) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      if (vw <= 700) {
        canvas.style.removeProperty("--k");
        stageEl.style.removeProperty("height");
        return;
      }

      const TAB_MAX = 1080;
      const TAB_MIN = 701;
      const DW_MIN = 920;
      const CW = 1172;

      let W = CW;
      if (vw <= TAB_MAX) {
        W = DW_MIN + ((vw - TAB_MIN) * (CW - DW_MIN)) / (TAB_MAX - TAB_MIN);
        if (vh > vw * 1.15) {
          W = Math.min(W, 900);
        }
      }

      const k = Math.min(vw / W, 1.18);
      canvas.style.setProperty("--k", k.toString());
      stageEl.style.height = `${Math.round(CANVAS_H * k)}px`;
    }

    // 4. 3D CAROUSEL RING MATH
    let phase = -2;
    const R = 1450;
    const step = 360 / TOTAL_CARDS;
    const deg2rad = Math.PI / 180;

    function placeCards(p) {
      if (!ringEl) return;
      const cards = ringEl.children;
      for (let i = 0; i < cards.length; i++) {
        const el = cards[i];
        const a = ((((i * step + p) % 360) + 540) % 360) - 180;
        if (Math.abs(a) > 50) {
          el.style.visibility = "hidden";
          continue;
        }
        el.style.visibility = "visible";
        const r = a * deg2rad;
        const c = Math.cos(r);
        const tx = R * Math.sin(r);
        const tz = R * (1 - c);
        el.style.transform = `translate3d(${tx}px, 0, ${tz}px) rotateY(${-a}deg)`;
        el.style.filter = `brightness(${0.85 + 0.45 * (c - 0.5)})`;
      }
    }

    // 5. ENTRANCE ANIMATION FOR THE 3D RING
    let hasPlayedEntrance = false;
    function runEntrance() {
      if (hasPlayedEntrance || !ringEl) return;
      hasPlayedEntrance = true;

      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (reduced || typeof Element.prototype.animate !== "function") {
        return;
      }

      const D = window.innerWidth <= 700 ? 0.66 : 1;
      ringEl.animate(
        [
          { opacity: 0, translate: `0 ${18 * D}px`, scale: "0.99" },
          { opacity: 1, translate: "0 0", scale: "1" },
        ],
        {
          duration: 950,
          delay: 120,
          easing: "cubic-bezier(.16,1,.3,1)",
          fill: "both",
        }
      );
    }

    let inView = false;
    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          inView = entry.isIntersecting;
          if (inView) runEntrance();
          syncAnimation();
        });
      },
      { threshold: 0.15 }
    );
    observer.observe(stageEl);

    // 6. RAF TICK & VISIBILITY HANDLING
    let rafId = null;
    let lastTime = 0;

    function tick(t) {
      if (!lastTime) lastTime = t;
      const dt = Math.min((t - lastTime) / 1000, 0.1);
      lastTime = t;
      phase -= 1.8 * dt;
      placeCards(phase);
      rafId = requestAnimationFrame(tick);
    }

    function syncAnimation() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
      lastTime = 0;
      if (inView && !document.hidden && !reduceQuery.matches) {
        rafId = requestAnimationFrame(tick);
      }
    }
    document.addEventListener("visibilitychange", syncAnimation);
    reduceQuery.addEventListener('change', syncAnimation);

    function handleResize() {
      updateScale();
      placeCards(phase);
    }

    window.addEventListener("resize", handleResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
    }

    updateScale();
    placeCards(phase);
    syncAnimation();

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleResize);
      }
      document.removeEventListener("visibilitychange", syncAnimation);
      reduceQuery.removeEventListener('change', syncAnimation);
    };
  }, []);

  return (
    <section
      id="motion-showcase"
      ref={stageRef}
      data-theme="light"
      className="motion-stage border-t border-slate-200"
    >
      {/* Background and Cyber Grid */}
      <div className="bg" />
      <div className="pointer-events-none absolute inset-0 bg-cyber-grid-light opacity-60" />
      <div className="stars" ref={stARef} />
      <div className="stars" ref={stBRef} />

      {/* 3D Floating Images Carousel */}
      <div className="canvas" ref={canvasRef}>
        <div className="showcase">
          <div className="showcase-ring" ref={ringRef} />
        </div>
      </div>
    </section>
  );
}
