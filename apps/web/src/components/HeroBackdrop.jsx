"use client";

import React, { useEffect, useRef } from "react";
import styles from "./HeroBackdrop.module.css";

const IMAGE_URL = "/images/backgrounds/hero-waves.webp";
const IMG_W = 1672;
const IMG_H = 941;

// Ribbon paths traced from the template image, in its own pixel space.
// The animated strands live between these three spines so they hug the
// painted ribbon wherever object-fit: cover crops it.
const SPINES = {
  upper: [[-80, 505], [0, 536], [200, 581], [400, 661], [600, 731], [800, 776], [1000, 790], [1200, 760], [1400, 708], [1560, 646], [1640, 572], [1700, 470], [1760, 380]],
  main: [[-80, 655], [0, 661], [300, 696], [500, 751], [600, 791], [750, 801], [900, 801], [1100, 786], [1300, 741], [1500, 686], [1600, 631], [1650, 581], [1690, 500], [1760, 400]],
  lower: [[-80, 880], [0, 851], [200, 791], [400, 761], [600, 786], [800, 821], [1000, 816], [1200, 771], [1400, 721], [1600, 661], [1680, 590], [1760, 500]],
};

const X_MIN = -80;
const X_MAX = 1760;
const STEP = 8;

function catmullRom(points, segments = 16) {
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];
    for (let s = 0; s < segments; s++) {
      const t = s / segments;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

// Resample a smoothed spine onto a fixed x grid so spines can be blended.
function sampleSpine(points, xs) {
  const curve = catmullRom(points);
  let j = 0;
  return xs.map((x) => {
    while (j < curve.length - 2 && curve[j + 1][0] < x) j++;
    const [x0, y0] = curve[j];
    const [x1, y1] = curve[j + 1];
    const t = x1 === x0 ? 0 : Math.min(Math.max((x - x0) / (x1 - x0), 0), 1);
    return y0 + (y1 - y0) * t;
  });
}

function makeStrands(count) {
  const strands = [];
  for (let i = 0; i < count; i++) {
    const s = i / (count - 1); // 0 = upper edge, 1 = lower edge
    strands.push({
      s,
      amp: 5 + Math.random() * 14,
      freq: 2.2 + Math.random() * 2.6,
      speed: 0.18 + Math.random() * 0.32,
      phase: Math.random() * Math.PI * 2,
      hue: 198 + Math.random() * 22,
      light: 58 + Math.random() * 18,
      alpha: 0.07 + Math.random() * 0.16,
      width: 0.6 + Math.random() * 1.1,
    });
  }
  return strands;
}

function makeParticles(count) {
  return Array.from({ length: count }, () => ({
    x: Math.random(),
    y: 0.35 + Math.random() * 0.7,
    r: 0.5 + Math.random() * 1.4,
    vy: 0.004 + Math.random() * 0.01,
    sway: 0.004 + Math.random() * 0.01,
    phase: Math.random() * Math.PI * 2,
    twinkle: 0.6 + Math.random() * 1.6,
  }));
}

export default function HeroBackdrop() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const xs = [];
    for (let x = X_MIN; x <= X_MAX; x += STEP) xs.push(x);
    const upper = sampleSpine(SPINES.upper, xs);
    const main = sampleSpine(SPINES.main, xs);
    const lower = sampleSpine(SPINES.lower, xs);
    const strands = makeStrands(16);
    const particles = makeParticles(46);
    const pulses = [
      { speed: 0.055, offset: 0.0, s: 0.48 },
      { speed: 0.04, offset: 0.45, s: 0.3 },
      { speed: 0.07, offset: 0.75, s: 0.66 },
    ];
    const ys = new Float32Array(xs.length);

    let w = 0;
    let h = 0;
    let scale = 1;
    let ox = 0;
    let oy = 0;
    let dpr = 1;

    const resize = () => {
      // Layout size, not getBoundingClientRect: the stage's float transform
      // would otherwise feed its animated scale into the canvas mapping.
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      // Mirror object-fit: cover + center so strands sit on the painted ribbon.
      scale = Math.max(w / IMG_W, h / IMG_H);
      ox = (w - IMG_W * scale) / 2;
      oy = (h - IMG_H * scale) / 2;
    };

    const strandY = (strand, t) => {
      const { s } = strand;
      for (let i = 0; i < xs.length; i++) {
        const base = s < 0.5
          ? upper[i] + (main[i] - upper[i]) * (s * 2)
          : main[i] + (lower[i] - main[i]) * ((s - 0.5) * 2);
        const u = (xs[i] - X_MIN) / (X_MAX - X_MIN);
        const wave =
          Math.sin(u * strand.freq * Math.PI * 2 + t * strand.speed * 2 + strand.phase) * strand.amp +
          Math.sin(u * 1.3 * Math.PI * 2 - t * 0.21 + strand.phase * 0.5) * strand.amp * 0.6;
        ys[i] = base + wave;
      }
      return ys;
    };

    const tracePath = (arr, from = 0, to = xs.length) => {
      ctx.beginPath();
      for (let i = from; i < to; i++) {
        const px = ox + xs[i] * scale;
        const py = oy + arr[i] * scale;
        if (i === from) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
    };

    const draw = (time) => {
      const t = time / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Flowing silk strands: a soft halo pass then a crisp core pass.
      for (const strand of strands) {
        const arr = strandY(strand, t);
        const breathe = 0.75 + 0.25 * Math.sin(t * 0.6 + strand.phase);
        tracePath(arr);
        ctx.strokeStyle = `hsla(${strand.hue}, 100%, ${strand.light}%, ${strand.alpha * 0.35 * breathe})`;
        ctx.lineWidth = strand.width * 7 * Math.max(scale, 0.6);
        ctx.stroke();
        ctx.strokeStyle = `hsla(${strand.hue}, 100%, ${strand.light + 14}%, ${strand.alpha * breathe})`;
        ctx.lineWidth = strand.width * Math.max(scale, 0.6);
        ctx.stroke();
      }

      // Light pulses gliding along the ribbon.
      for (const pulse of pulses) {
        const progress = (t * pulse.speed + pulse.offset) % 1;
        const head = Math.floor(progress * (xs.length - 1));
        const tail = Math.max(head - 34, 0);
        const arr = strandY({ s: pulse.s, amp: 6, freq: 2.6, speed: 0.3, phase: pulse.offset * 9 }, t);
        const fade = Math.sin(progress * Math.PI);
        if (head - tail > 2) {
          const x0 = ox + xs[tail] * scale;
          const x1 = ox + xs[head] * scale;
          const grad = ctx.createLinearGradient(x0, 0, x1, 0);
          grad.addColorStop(0, "rgba(120, 190, 255, 0)");
          grad.addColorStop(1, `rgba(190, 230, 255, ${0.75 * fade})`);
          tracePath(arr, tail, head + 1);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 2.2 * Math.max(scale, 0.6);
          ctx.stroke();
        }
        const hx = ox + xs[head] * scale;
        const hy = oy + arr[head] * scale;
        const r = 26 * Math.max(scale, 0.6);
        const glow = ctx.createRadialGradient(hx, hy, 0, hx, hy, r);
        glow.addColorStop(0, `rgba(210, 238, 255, ${0.55 * fade})`);
        glow.addColorStop(1, "rgba(60, 140, 255, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(hx - r, hy - r, r * 2, r * 2);
      }

      // Drifting motes.
      for (const p of particles) {
        let y = (p.y - t * p.vy) % 1.1;
        if (y < -0.05) y += 1.1;
        const x = p.x + Math.sin(t * 0.4 + p.phase) * p.sway;
        const a = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(t * p.twinkle + p.phase));
        const edge = Math.min(1, Math.max(0, (y - 0.15) / 0.25));
        ctx.fillStyle = `rgba(150, 205, 255, ${a * edge})`;
        ctx.beginPath();
        ctx.arc(x * w, y * h, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";
    };

    let raf = 0;
    let visible = true;
    const loop = (time) => {
      draw(time);
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      cancelAnimationFrame(raf);
      if (motion.matches || !visible || document.hidden) {
        draw(4000);
        return;
      }
      raf = requestAnimationFrame(loop);
    };

    resize();
    start();

    const ro = new ResizeObserver(() => {
      resize();
      if (motion.matches || !visible) draw(4000);
    });
    ro.observe(canvas);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      start();
    });
    io.observe(canvas);

    document.addEventListener("visibilitychange", start);
    if (motion.addEventListener) motion.addEventListener("change", start);
    else motion.addListener(start);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", start);
      if (motion.removeEventListener) motion.removeEventListener("change", start);
      else motion.removeListener(start);
    };
  }, []);

  return (
    <div className={styles.backdrop} aria-hidden="true">
      <div className={styles.stage}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={styles.image}
          src={IMAGE_URL}
          alt=""
          width={IMG_W}
          height={IMG_H}
          fetchPriority="high"
          decoding="async"
          draggable={false}
        />
        <canvas ref={canvasRef} className={styles.ribbons} />
      </div>
      <div className={`${styles.beam} ${styles.beamLeft}`} />
      <div className={`${styles.beam} ${styles.beamRight}`} />
      <div className={styles.floor} />
    </div>
  );
}
