'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  Barcode,
  Megaphone,
  Package,
  Pause,
  Play,
  ShieldCheck,
  Smartphone,
  Store,
  Users,
  Warehouse,
} from 'lucide-react';
import { dailySupplyData } from '@/data/dailysupply';
import styles from './modules-orbit.module.css';

const icons = {
  shield: ShieldCheck,
  package: Package,
  store: Store,
  warehouse: Warehouse,
  barcode: Barcode,
  smartphone: Smartphone,
  users: Users,
  activity: Activity,
  megaphone: Megaphone,
};

const NODE_COUNT = dailySupplyData.modules.length;
const RADIUS = 46; // % of the stage, matches the connector line endpoints
const DEG = 180 / Math.PI;

const BASE_SPEED = 4; // deg per second: one idle revolution every 90s
const MAX_FLING_SPEED = 720; // deg per second
const DECAY_TAU = 0.9; // seconds for a fling to settle back to idle speed
const STOP_TAU = 0.25; // faster settle when pausing or inspecting a node
const CENTER_DEAD_ZONE = 0.05; // share of stage width where atan2 is unstable

function coordinate(value) {
  return Math.round(value * 1e6) / 1e6;
}

function nodePoint(index) {
  const angle = ((-90 + index * (360 / NODE_COUNT)) * Math.PI) / 180;
  const x = coordinate(50 + RADIUS * Math.cos(angle));
  const y = coordinate(50 + RADIUS * Math.sin(angle));
  return { x, y, left: `${x}%`, top: `${y}%` };
}

const CARDINALS = [
  { label: '000', angle: -90 },
  { label: '090', angle: 0 },
  { label: '180', angle: 90 },
  { label: '270', angle: 180 },
];

const TICKS = Array.from({ length: 72 }, (_, i) => {
  const angle = (i * 5 * Math.PI) / 180;
  const major = i % 6 === 0;
  const inner = major ? 48.2 : 48.8;
  return {
    major,
    x1: coordinate(50 + inner * Math.cos(angle)),
    y1: coordinate(50 + inner * Math.sin(angle)),
    x2: coordinate(50 + 49.6 * Math.cos(angle)),
    y2: coordinate(50 + 49.6 * Math.sin(angle)),
  };
});

export default function ModulesOrbitSection() {
  const [activeId, setActiveId] = useState(null);
  const [paused, setPaused] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const [dragging, setDragging] = useState(false);

  const stageRef = useRef(null);
  const angleRef = useRef(0);
  const velocityRef = useRef(BASE_SPEED);
  const dragRef = useRef({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    lastAngle: 0,
    lastTime: 0,
    dead: false,
    moved: false,
    prevVelocity: BASE_SPEED,
  });
  const pausedRef = useRef(paused);
  const frozenRef = useRef(frozen);
  const motionOkRef = useRef(true);
  const hoverRef = useRef(null);
  const focusRef = useRef(null);
  const suppressClickRef = useRef(false);

  const active = dailySupplyData.modules.find((module) => module.id === activeId) || null;

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    frozenRef.current = frozen;
  }, [frozen]);

  const endDrag = useCallback((event) => {
    const drag = dragRef.current;
    if (!drag.active) return;
    if (event && event.pointerId !== undefined && event.pointerId !== drag.pointerId) return;
    drag.active = false;
    /* A press that never moved is a click: keep the speed it had. */
    if (!drag.moved) velocityRef.current = drag.prevVelocity ?? BASE_SPEED;
    /* Releasing after a pause should not fling: drop stale velocity. */
    else if (performance.now() - (drag.lastTime || 0) > 120) velocityRef.current = 0;
    setDragging(false);
    window.removeEventListener('pointerup', endDrag);
    window.removeEventListener('pointercancel', endDrag);
    const stage = stageRef.current;
    if (stage && drag.pointerId !== null && stage.hasPointerCapture && stage.hasPointerCapture(drag.pointerId)) {
      stage.releasePointerCapture(drag.pointerId);
    }
  }, []);

  /* Idle rotation and fling inertia share one rAF loop. The angle lives on the
     stage as --orbit (and its inverse --orbit-back) so a single write per frame
     moves the wheel while every module label stays upright. */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    motionOkRef.current = !reduceQuery.matches;
    if (reduceQuery.matches) return undefined;

    let frame = null;
    let last = 0;

    const apply = () => {
      stage.style.setProperty('--orbit', `${angleRef.current}deg`);
      stage.style.setProperty('--orbit-back', `${-angleRef.current}deg`);
    };

    const tick = (now) => {
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      if (!dragRef.current.active) {
        const target = frozenRef.current || pausedRef.current ? 0 : BASE_SPEED;
        /* Stop promptly on pause or hover so a pill cannot drift away from the
           cursor; let flings coast on the longer tau. */
        const tau = target === 0 ? STOP_TAU : DECAY_TAU;
        const k = 1 - Math.exp(-dt / tau);
        let next = velocityRef.current + (target - velocityRef.current) * k;
        if (Math.abs(next - target) < 0.01) next = target;
        velocityRef.current = next;
        const before = angleRef.current;
        angleRef.current += next * dt;
        if (angleRef.current !== before) apply();
      }
      frame = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((entry) => entry.isIntersecting);
        if (visible && frame === null) {
          last = 0;
          frame = requestAnimationFrame(tick);
        } else if (!visible && frame !== null) {
          cancelAnimationFrame(frame);
          frame = null;
        }
      },
      { threshold: 0.05 }
    );
    io.observe(stage);

    return () => {
      io.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
    };
  }, [endDrag]);

  const handlePointerDown = useCallback(
    (event) => {
      if (!motionOkRef.current) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (dragRef.current.active) return; // ignore extra fingers mid-drag
      const target = event.target;
      if (target instanceof Element && target.closest('a, [data-no-drag]')) return;
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      if (!rect.width) return;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const prevVelocity = velocityRef.current;
      velocityRef.current = 0;
      suppressClickRef.current = false;
      dragRef.current = {
        active: true,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        lastAngle: Math.atan2(event.clientY - cy, event.clientX - cx) * DEG,
        lastTime: event.timeStamp || performance.now(),
        dead: false,
        moved: false,
        prevVelocity,
      };
      /* Window listeners keep the drag alive if pointer capture is unavailable. */
      window.addEventListener('pointerup', endDrag);
      window.addEventListener('pointercancel', endDrag);
    },
    [endDrag]
  );

  const handlePointerMove = useCallback((event) => {
    const drag = dragRef.current;
    if (!drag.active || event.pointerId !== drag.pointerId) return;
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = event.clientX - cx;
    const dy = event.clientY - cy;
    const now = event.timeStamp || performance.now();

    /* Near the center a tiny move swings atan2 wildly; re-anchor instead. */
    if (Math.hypot(dx, dy) < rect.width * CENTER_DEAD_ZONE) {
      drag.dead = true;
      drag.lastAngle = Math.atan2(dy, dx) * DEG;
      drag.lastTime = now;
      return;
    }
    const angle = Math.atan2(dy, dx) * DEG;
    if (drag.dead) {
      drag.dead = false;
      drag.lastAngle = angle;
      drag.lastTime = now;
      return;
    }
    if (!drag.moved) {
      /* Small presses stay clicks on the module pills; only real movement spins. */
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 5) {
        drag.lastAngle = angle;
        drag.lastTime = now;
        return;
      }
      drag.moved = true;
      suppressClickRef.current = true;
      setDragging(true);
      /* Capture only once spinning starts, so a plain click keeps its target. */
      try {
        stage.setPointerCapture(event.pointerId);
      } catch {
        /* best-effort */
      }
    }
    if (event.cancelable) event.preventDefault();

    let delta = angle - drag.lastAngle;
    if (delta > 180) delta -= 360;
    else if (delta < -180) delta += 360;
    drag.lastAngle = angle;
    const dt = Math.max((now - drag.lastTime) / 1000, 0.008);
    drag.lastTime = now;
    const instant = Math.max(-MAX_FLING_SPEED, Math.min(MAX_FLING_SPEED, delta / dt));
    velocityRef.current += (instant - velocityRef.current) * 0.35;
    angleRef.current += delta;
    stage.style.setProperty('--orbit', `${angleRef.current}deg`);
    stage.style.setProperty('--orbit-back', `${-angleRef.current}deg`);
  }, []);

  const syncFreeze = useCallback(() => {
    setFrozen(Boolean(hoverRef.current || focusRef.current));
  }, []);

  const handleNodeEnter = useCallback(
    (id, event) => {
      if (event.pointerType === 'mouse') {
        hoverRef.current = id;
        syncFreeze();
      }
      setActiveId(id);
    },
    [syncFreeze]
  );

  const handleNodeLeave = useCallback(
    (event) => {
      if (event.pointerType === 'mouse') {
        hoverRef.current = null;
        syncFreeze();
      }
      setActiveId(null);
    },
    [syncFreeze]
  );

  const handleNodeFocus = useCallback(
    (id) => {
      focusRef.current = id;
      syncFreeze();
      setActiveId(id);
    },
    [syncFreeze]
  );

  const handleNodeBlur = useCallback(() => {
    focusRef.current = null;
    syncFreeze();
    setActiveId(null);
  }, [syncFreeze]);

  return (
    <section id="modules" className={styles.section} data-theme="light" aria-labelledby="dailysupply-modules-title">
      <div className={styles.container}>
        <h2 id="dailysupply-modules-title" className="sr-only">
          Connected module system
        </h2>

        <div
          ref={stageRef}
          className={`${styles.stage} ${paused ? styles.stagePaused : ''} ${dragging ? styles.stageDragging : ''}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
          onDragStart={(event) => event.preventDefault()}
        >
          <div className={styles.stageGlow} aria-hidden="true" />

          {/* Static dial face: ticks, tracks, cardinal marks */}
          <svg className={styles.dial} viewBox="0 0 100 100" aria-hidden="true">
            {TICKS.map((tick, index) => (
              <line
                key={index}
                className={tick.major ? styles.tickMajor : styles.tick}
                x1={tick.x1}
                y1={tick.y1}
                x2={tick.x2}
                y2={tick.y2}
              />
            ))}
            <circle className={styles.trackOrbit} cx="50" cy="50" r={RADIUS} />
            <circle className={styles.trackInner} cx="50" cy="50" r="36.5" />
            <circle className={styles.trackFaint} cx="50" cy="50" r="33" />
            {CARDINALS.map((cardinal) => {
              const angle = (cardinal.angle * Math.PI) / 180;
              const x = coordinate(50 + 41.5 * Math.cos(angle));
              const y = coordinate(50 + 41.5 * Math.sin(angle));
              return (
                <text
                  key={cardinal.label}
                  className={styles.cardinal}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {cardinal.label}
                </text>
              );
            })}
          </svg>

          {/* Rotating wheel: connectors with outward data flow + module nodes */}
          <div className={styles.wheel}>
            <svg className={styles.connectors} viewBox="0 0 100 100" aria-hidden="true">
              <defs>
                {dailySupplyData.modules.map((module, index) => {
                  const point = nodePoint(index);
                  return (
                    <linearGradient
                      key={module.id}
                      id={`ds-connector-${module.id}`}
                      gradientUnits="userSpaceOnUse"
                      x1="50"
                      y1="50"
                      x2={point.x}
                      y2={point.y}
                    >
                      <stop offset="0" stopColor="#2563eb" stopOpacity="0" />
                      <stop offset="0.6" stopColor="#2563eb" stopOpacity="0.35" />
                      <stop offset="1" stopColor="#1d4ed8" stopOpacity="0.85" />
                    </linearGradient>
                  );
                })}
              </defs>
              {dailySupplyData.modules.map((module, index) => {
                const point = nodePoint(index);
                return (
                  <line
                    key={module.id}
                    x1="50"
                    y1="50"
                    x2={point.x}
                    y2={point.y}
                    stroke={`url(#ds-connector-${module.id})`}
                    style={{ animationDelay: `${index * -0.31}s` }}
                  />
                );
              })}
            </svg>

            {dailySupplyData.modules.map((module, index) => {
              const point = nodePoint(index);
              const Icon = icons[module.icon];
              const isActive = activeId === module.id;
              return (
                <div key={module.id} className={styles.nodePos} style={{ left: point.left, top: point.top }}>
                  <div className={styles.nodeCounter}>
                    <button
                      type="button"
                      className={`${styles.node} ${isActive ? styles.nodeActive : ''}`}
                      onPointerEnter={(event) => handleNodeEnter(module.id, event)}
                      onPointerLeave={handleNodeLeave}
                      onFocus={() => handleNodeFocus(module.id)}
                      onBlur={handleNodeBlur}
                      onClick={() => {
                        if (suppressClickRef.current) {
                          suppressClickRef.current = false;
                          return;
                        }
                        setActiveId(module.id);
                      }}
                      aria-label={`${module.title}. ${module.text}`}
                    >
                      <span className={styles.nodeIcon}>
                        <Icon size={13} aria-hidden="true" />
                      </span>
                      <span className={styles.nodeLabel}>{module.short}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Center: the product name */}
          <div className={styles.center}>
            <span className={styles.centerArc} aria-hidden="true" />
            <img
              src="/images/products/dailysupply/dailysupply-logo-black-text.png"
              alt="DailySupply"
              width="380"
              height="100"
              draggable={false}
              className={styles.centerLogo}
            />
            <span className={styles.centerLabel}>Module system</span>
          </div>

          <button
            type="button"
            data-no-drag
            className={styles.pauseButton}
            onClick={() => setPaused((current) => !current)}
            aria-pressed={paused}
            aria-label={paused ? 'Resume orbit animation' : 'Pause orbit animation'}
          >
            {paused ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />}
          </button>
        </div>

        <p className={styles.readout}>
          {active ? (
            <span key={active.id} className={styles.readoutItem}>
              <strong className={styles.readoutTitle}>
                <span className={styles.readoutNumber}>{active.number}</span>
                {active.title}
              </strong>
              <span className={styles.readoutText}>{active.text}</span>
            </span>
          ) : (
            <span className={styles.readoutHint}>
              Drag the orbit to spin it. Tap or hover a module to see its role.
            </span>
          )}
        </p>
      </div>
    </section>
  );
}
