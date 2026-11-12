/**
 * Dependency-free canvas confetti shared by the internship celebrations.
 * `fullscreen` drives the big milestone overlay; `burstFrom` pops a short burst
 * from a button without blocking the page. Both no-op under reduced motion.
 */
const COLORS = ["#2583ff", "#8256ff", "#39bfff", "#ffc93c", "#ff6fa8", "#2fd38c", "#ffffff"];
const SHAPES = ["rect", "rect", "circle", "ribbon"];
const random = (min, max) => min + Math.random() * (max - min);

export function prefersReducedMotion() {
  return typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function spawn(particles, { x, y, count, angle, spread, speed, size = [6, 12], ttl = [170, 260] }) {
  for (let i = 0; i < count; i++) {
    const direction = ((angle + random(-spread, spread)) * Math.PI) / 180;
    const velocity = random(speed * 0.45, speed);
    particles.push({
      x, y,
      vx: Math.cos(direction) * velocity,
      vy: Math.sin(direction) * velocity,
      size: random(size[0], size[1]),
      color: COLORS[(Math.random() * COLORS.length) | 0],
      shape: SHAPES[(Math.random() * SHAPES.length) | 0],
      rotation: random(0, Math.PI * 2),
      spin: random(-0.25, 0.25),
      wobble: random(0, Math.PI * 2),
      wobbleSpeed: random(0.05, 0.12),
      life: 0,
      ttl: random(ttl[0], ttl[1]),
    });
  }
}

function drawParticle(context, p) {
  context.save();
  context.globalAlpha = Math.min(1, (p.ttl - p.life) / 40);
  context.translate(p.x, p.y);
  context.rotate(p.rotation);
  context.fillStyle = p.color;
  if (p.shape === "circle") {
    context.beginPath(); context.arc(0, 0, p.size / 2.6, 0, Math.PI * 2); context.fill();
  } else if (p.shape === "ribbon") {
    context.scale(1, Math.cos(p.wobble));
    context.fillRect(-p.size, -p.size / 6, p.size * 2, p.size / 3);
  } else {
    context.scale(Math.cos(p.wobble * 1.3), 1);
    context.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
  }
  context.restore();
}

/** Runs the particle loop on a canvas; `emit(now, elapsed)` may add particles each frame. */
function animate(canvas, { durationMs, emit, onDone }) {
  const context = canvas.getContext("2d");
  const particles = [];
  let width = 0, height = 0, frame = 0, stopped = false;
  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth; height = window.innerHeight;
    canvas.width = width * ratio; canvas.height = height * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };
  resize();
  window.addEventListener("resize", resize);
  const started = performance.now();
  const step = (now) => {
    if (stopped) return;
    const elapsed = now - started;
    emit?.(particles, { now, elapsed, width, height });
    context.clearRect(0, 0, width, height);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life++;
      p.vx *= 0.985; p.vy = p.vy * 0.985 + 0.32;
      p.wobble += p.wobbleSpeed;
      p.x += p.vx + Math.cos(p.wobble) * 0.8;
      p.y += p.vy;
      p.rotation += p.spin;
      if (p.y > height + 40 || p.life > p.ttl) { particles.splice(i, 1); continue; }
      drawParticle(context, p);
    }
    if (elapsed < durationMs || particles.length) frame = requestAnimationFrame(step);
    else stop();
  };
  frame = requestAnimationFrame(step);
  function stop() {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", resize);
    onDone?.();
  }
  return stop;
}

/** Corner cannons, a center pop, a second volley and a short shower from the top. */
export function fullscreen(canvas, durationMs = 4200) {
  if (!canvas || prefersReducedMotion()) return () => {};
  const fired = new Set();
  let lastShower = 0;
  return animate(canvas, {
    durationMs,
    emit(particles, { now, elapsed, width, height }) {
      const scale = Math.min(1, width / 1200) * 0.5 + 0.5;
      const cannons = () => {
        spawn(particles, { x: 0, y: height * 0.95, count: 90 * scale, angle: -58, spread: 22, speed: 26 * scale + 6 });
        spawn(particles, { x: width, y: height * 0.95, count: 90 * scale, angle: -122, spread: 22, speed: 26 * scale + 6 });
      };
      const once = (key, at, fn) => { if (elapsed >= at && !fired.has(key)) { fired.add(key); fn(); } };
      once("cannons", 0, cannons);
      once("center", 350, () => spawn(particles, { x: width / 2, y: height * 0.42, count: 140 * scale, angle: -90, spread: 180, speed: 17 * scale + 5 }));
      once("cannons-2", 1100, cannons);
      if (elapsed < durationMs - 1200 && now - lastShower > 70) {
        lastShower = now;
        for (let i = 0; i < 4; i++) spawn(particles, { x: random(0, width), y: -20, count: 1, angle: 90, spread: 25, speed: 4 });
      }
    },
  });
}

/**
 * A short celebratory burst from an element (or a point) on a temporary
 * full-viewport canvas that removes itself once the particles settle.
 */
export function burstFrom(target, { count = 70, spread = 70, speed = 15, small = false } = {}) {
  if (typeof document === "undefined" || prefersReducedMotion()) return () => {};
  let x = window.innerWidth / 2, y = window.innerHeight / 2;
  if (target && typeof target.getBoundingClientRect === "function") {
    const rect = target.getBoundingClientRect();
    if (rect.width || rect.height) { x = rect.left + rect.width / 2; y = rect.top + rect.height / 2; }
  } else if (target && Number.isFinite(target.x) && Number.isFinite(target.y)) ({ x, y } = target);
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, { position: "fixed", inset: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "250" });
  document.body.appendChild(canvas);
  let fired = false;
  return animate(canvas, {
    durationMs: 0,
    emit(particles) {
      if (fired) return;
      fired = true;
      spawn(particles, { x, y, count: small ? Math.round(count / 2.5) : count, angle: -90, spread, speed: small ? speed * 0.6 : speed, size: small ? [4, 7] : [5, 10], ttl: small ? [60, 90] : [90, 140] });
    },
    onDone: () => canvas.remove(),
  });
}
