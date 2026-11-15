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
    const hue = 198 + Math.random() * 22;
    const light = 58 + Math.random() * 18;
    strands.push({
      s,
      amp: 5 + Math.random() * 14,
      freq: 2.2 + Math.random() * 2.6,
      speed: 0.18 + Math.random() * 0.32,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.07 + Math.random() * 0.16,
      width: 0.6 + Math.random() * 1.1,
      // Opaque colors built once; per-frame fading goes through globalAlpha
      // so no color strings are created or parsed while animating.
      halo: `hsl(${hue}, 100%, ${light}%)`,
      core: `hsl(${hue}, 100%, ${light + 14}%)`,
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
    ].map((pulse) => ({ ...pulse, shape: { s: pulse.s, amp: 6, freq: 2.6, speed: 0.3, phase: pulse.offset * 9 } }));
    // One unit-radius glow reused for every pulse (positioned via transform).
    const pulseGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    pulseGlow.addColorStop(0, "rgba(210, 238, 255, 0.55)");
    pulseGlow.addColorStop(1, "rgba(60, 140, 255, 0)");
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
      // Soft glowing lines look identical above 1.5x but cost far more pixels.
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
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

    // Traces samples [from, to) and optionally ends exactly at (endX, endY) so
    // moving heads glide continuously instead of hopping grid point to point.
    const tracePath = (arr, from = 0, to = xs.length, endX, endY) => {
      ctx.beginPath();
      for (let i = from; i < to; i++) {
        const px = ox + xs[i] * scale;
        const py = oy + arr[i] * scale;
        if (i === from) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      if (endX !== undefined) ctx.lineTo(endX, endY);
    };

    const PULSE_TAIL = 34;

    const draw = (time) => {
      const t = time / 1000;
      const lineScale = Math.max(scale, 0.6);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Flowing silk strands: a soft halo pass then a crisp core pass.
      for (const strand of strands) {
        const arr = strandY(strand, t);
        const breathe = 0.75 + 0.25 * Math.sin(t * 0.6 + strand.phase);
        tracePath(arr);
        ctx.globalAlpha = strand.alpha * 0.35 * breathe;
        ctx.strokeStyle = strand.halo;
        ctx.lineWidth = strand.width * 7 * lineScale;
        ctx.stroke();
        ctx.globalAlpha = strand.alpha * breathe;
        ctx.strokeStyle = strand.core;
        ctx.lineWidth = strand.width * lineScale;
        ctx.stroke();
      }

      // Light pulses gliding along the ribbon at sub-sample precision.
      for (const pulse of pulses) {
        const progress = (t * pulse.speed + pulse.offset) % 1;
        const fade = Math.sin(progress * Math.PI);
        if (fade <= 0.001) continue;
        const pos = progress * (xs.length - 1);
        const i0 = Math.min(Math.floor(pos), xs.length - 2);
        const frac = pos - i0;
        const arr = strandY(pulse.shape, t);
        const hx = ox + (xs[i0] + (xs[i0 + 1] - xs[i0]) * frac) * scale;
        const hy = oy + (arr[i0] + (arr[i0 + 1] - arr[i0]) * frac) * scale;
        const tailPos = Math.max(pos - PULSE_TAIL, 0);
        const tail = Math.ceil(tailPos);
        ctx.globalAlpha = fade;
        if (pos - tailPos > 2) {
          const x0 = ox + (xs[0] + (xs[xs.length - 1] - xs[0]) * (tailPos / (xs.length - 1))) * scale;
          const grad = ctx.createLinearGradient(x0, 0, hx, 0);
          grad.addColorStop(0, "rgba(120, 190, 255, 0)");
          grad.addColorStop(1, "rgba(190, 230, 255, 0.75)");
          tracePath(arr, tail, i0 + 1, hx, hy);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 2.2 * lineScale;
          ctx.stroke();
        }
        const r = 26 * lineScale;
        ctx.setTransform(dpr, 0, 0, dpr, dpr * hx, dpr * hy);
        ctx.fillStyle = pulseGlow;
        ctx.scale(r, r);
        ctx.fillRect(-1, -1, 2, 2);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      // Drifting motes.
      ctx.fillStyle = "rgb(150, 205, 255)";
      for (const p of particles) {
        let y = (p.y - t * p.vy) % 1.1;
        if (y < -0.05) y += 1.1;
        const x = p.x + Math.sin(t * 0.4 + p.phase) * p.sway;
        const a = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(t * p.twinkle + p.phase));
        const edge = Math.min(1, Math.max(0, (y - 0.15) / 0.25));
        if (edge <= 0) continue;
        ctx.globalAlpha = a * edge;
        ctx.beginPath();
        ctx.arc(x * w, y * h, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
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
      {/* Crushes the template's navy sky and corner haze to pure black while
          bright ribbon pixels keep their colour. */}
      <svg width="0" height="0" style={{ position: "absolute" }} focusable="false">
        <filter id="hero-sky-black" colorInterpolationFilters="sRGB">
          <feComponentTransfer>
            <feFuncR type="table" tableValues="0 0.1 0.2 0.3 0.4 0.5 0.6 0.7 0.8 0.9 1" />
            <feFuncG type="table" tableValues="0 0 0.12 0.3 0.4 0.5 0.6 0.7 0.8 0.9 1" />
            <feFuncB type="table" tableValues="0 0 0 0 0.18 0.42 0.6 0.7 0.8 0.9 1" />
          </feComponentTransfer>
        </filter>
      </svg>
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
    </div>
  );
}
