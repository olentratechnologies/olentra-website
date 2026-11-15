"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, GripHorizontal, Lock, Timer } from "lucide-react";
import { deadlineTime, formatDeadline, timeRemaining } from "@/lib/intern/application-deadline.mjs";
import styles from "./application-countdown.module.css";

const MAX_TIMEOUT = 2 ** 31 - 1;
const URGENT_MS = 3 * 24 * 60 * 60 * 1000;
const TOP_GAP = 88; // clear of the fixed navbar
const BOTTOM_GAP = 16;
const MOBILE_BOTTOM_GAP = 72; // clear of the mobile Login / Apply bar
const EDGE_GAP = 16;
const DRAG_THRESHOLD = 4;
const STORAGE_KEY = "olentra.careers.deadlineTab";

/**
 * True once the deadline has passed. Uses a single timer (not a per-second
 * tick) so the large landing component re-renders only at the moment it closes.
 */
export function useDeadlineClosed(deadline) {
  const time = deadlineTime(deadline);
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    if (time === null) { setClosed(false); return undefined; }
    let timer;
    const check = () => {
      const left = time - Date.now();
      if (left <= 0) { setClosed(true); return; }
      setClosed(false);
      timer = setTimeout(check, Math.min(left + 50, MAX_TIMEOUT));
    };
    check();
    return () => clearTimeout(timer);
  }, [time]);
  return closed;
}

function readSaved() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
}
function writeSaved(value) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readSaved(), ...value })); } catch {}
}

/** Pixel top for a 0–1 position along the usable edge height. */
function topFor(ratio, node) {
  const height = node?.offsetHeight || 0;
  const bottomGap = window.innerWidth < 1200 ? MOBILE_BOTTOM_GAP : BOTTOM_GAP;
  const min = TOP_GAP, max = Math.max(min, window.innerHeight - height - bottomGap);
  return min + (max - min) * Math.min(1, Math.max(0, ratio));
}
function ratioFor(top, node) {
  const height = node?.offsetHeight || 0;
  const bottomGap = window.innerWidth < 1200 ? MOBILE_BOTTOM_GAP : BOTTOM_GAP;
  const min = TOP_GAP, max = Math.max(min, window.innerHeight - height - bottomGap);
  return max === min ? 0.5 : Math.min(1, Math.max(0, (top - min) / (max - min)));
}

const pad = (value) => String(value).padStart(2, "0");

function Unit({ value, label }) {
  const text = pad(value);
  return (
    <span className={styles.unit}>
      <span className={styles.digits}>
        {/* Keyed by value so each change replays the roll-in animation. */}
        <span key={text} className={styles.digitValue}>{text}</span>
      </span>
      <span className={styles.unitLabel}>{label}</span>
    </span>
  );
}

/**
 * The live application countdown as a floating dock along the left or
 * right edge of the screen. Drag it up or down, or across to the other edge;
 * it snaps to the nearer side on release.
 */
export default function ApplicationCountdown({ deadline }) {
  const time = deadlineTime(deadline);
  const [now, setNow] = useState(null);
  const [side, setSide] = useState("right");
  const [ratio, setRatio] = useState(0.5);
  const [collapsed, setCollapsed] = useState(false);
  const [drag, setDrag] = useState(null); // { x, y } while dragging freely
  const [, forceLayout] = useState(0);
  const tabRef = useRef(null);
  const pointer = useRef(null);

  useEffect(() => {
    if (time === null) return undefined;
    const saved = readSaved();
    if (saved.side === "left" || saved.side === "right") setSide(saved.side);
    if (Number.isFinite(saved.ratio)) setRatio(saved.ratio);
    // Phones start minimized so the tab never covers page text unasked.
    setCollapsed(typeof saved.collapsed === "boolean" ? saved.collapsed : window.innerWidth < 640);
    setNow(Date.now());
    const id = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= time) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [time]);

  const visible = time !== null && now !== null;
  const expired = visible && now >= time;

  // Recompute the pixel position after resizes and size changes.
  const relayout = useCallback(() => forceLayout((n) => n + 1), []);
  useEffect(() => {
    if (!visible) return undefined;
    window.addEventListener("resize", relayout);
    return () => window.removeEventListener("resize", relayout);
  }, [visible, relayout]);
  useLayoutEffect(() => { if (visible) relayout(); }, [visible, collapsed, expired, relayout]);

  // A tap or click anywhere outside the dock minimizes it.
  useEffect(() => {
    if (!visible || collapsed) return undefined;
    const onOutside = (event) => {
      if (pointer.current || tabRef.current?.contains(event.target)) return;
      setCollapsed(true);
    };
    document.addEventListener("pointerdown", onOutside, true);
    return () => document.removeEventListener("pointerdown", onOutside, true);
  }, [visible, collapsed]);

  if (!visible) return null;

  const node = tabRef.current;
  const measured = Boolean(node);

  const onPointerDown = (event) => {
    if (event.button !== 0 || event.target.closest("button:not([data-grip])")) return;
    const rect = tabRef.current.getBoundingClientRect();
    pointer.current = { id: event.pointerId, startX: event.clientX, startY: event.clientY, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top, moved: false };
    tabRef.current.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event) => {
    const state = pointer.current;
    if (!state || state.id !== event.pointerId) return;
    if (!state.moved && Math.hypot(event.clientX - state.startX, event.clientY - state.startY) < DRAG_THRESHOLD) return;
    state.moved = true;
    event.preventDefault();
    const width = tabRef.current.offsetWidth, height = tabRef.current.offsetHeight;
    const bottomGap = window.innerWidth < 1200 ? MOBILE_BOTTOM_GAP : BOTTOM_GAP;
    setDrag({
      x: Math.max(EDGE_GAP, Math.min(event.clientX - state.offsetX, window.innerWidth - width - EDGE_GAP)),
      y: Math.max(TOP_GAP, Math.min(event.clientY - state.offsetY, window.innerHeight - height - bottomGap)),
    });
  };
  const endDrag = (event) => {
    const state = pointer.current;
    if (!state || state.id !== event.pointerId) return;
    pointer.current = null;
    if (!state.moved || !drag) { setDrag(null); return; }
    const width = tabRef.current.offsetWidth;
    const nextSide = drag.x + width / 2 < window.innerWidth / 2 ? "left" : "right";
    const nextRatio = ratioFor(drag.y, tabRef.current);
    setSide(nextSide); setRatio(nextRatio); setDrag(null);
    writeSaved({ side: nextSide, ratio: nextRatio });
  };
  const onGripKey = (event) => {
    const step = event.shiftKey ? 0.15 : 0.05;
    let nextSide = side, nextRatio = ratio;
    if (event.key === "ArrowUp") nextRatio = Math.max(0, ratio - step);
    else if (event.key === "ArrowDown") nextRatio = Math.min(1, ratio + step);
    else if (event.key === "ArrowLeft") nextSide = "left";
    else if (event.key === "ArrowRight") nextSide = "right";
    else return;
    event.preventDefault();
    setSide(nextSide); setRatio(nextRatio);
    writeSaved({ side: nextSide, ratio: nextRatio });
  };
  // Desktop mouse: hovering opens the dock, moving away minimizes it again.
  // Touch and pen keep tap-to-toggle, since they have no hover.
  const canHover = () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const onPointerEnter = (event) => {
    if (event.pointerType === "mouse" && canHover()) setCollapsed(false);
  };
  const onPointerLeave = (event) => {
    if (event.pointerType === "mouse" && canHover() && !pointer.current) setCollapsed(true);
  };
  const toggle = () => {
    setCollapsed((value) => { writeSaved({ collapsed: !value }); return !value; });
  };

  const left = timeRemaining(time, now);
  const closed = left.total <= 0;
  const urgent = !closed && left.total <= URGENT_MS;
  const when = formatDeadline(time);
  const deadlineDate = new Date(time);
  const dateLabel = deadlineDate.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  const clockLabel = deadlineDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  const state = closed ? "closed" : urgent ? "urgent" : "open";
  const spoken = closed
    ? `Applications closed ${when}.`
    : `${left.days} days, ${left.hours} hours and ${left.minutes} minutes left to apply. Applications close ${when}.`;

  const style = drag
    ? { left: drag.x, top: drag.y }
    : measured
      ? { top: topFor(ratio, node), [side]: EDGE_GAP }
      : { top: "50%", [side]: EDGE_GAP, visibility: "hidden" };

  // The chevron points away from the edge to expand, toward it to minimize.
  const towardEdge = side === "right" ? ChevronRight : ChevronLeft;
  const awayFromEdge = side === "right" ? ChevronLeft : ChevronRight;
  const ToggleIcon = collapsed ? awayFromEdge : towardEdge;

  return (
    <aside
      ref={tabRef}
      className={styles.tab}
      data-side={side}
      data-state={state}
      data-collapsed={collapsed || undefined}
      data-dragging={drag ? true : undefined}
      style={style}
      aria-label="Application deadline"
      title={closed ? `Applications closed ${when}` : `Applications close ${when}`}
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div className={styles.header}>
        {!collapsed && <>
          <span className={styles.emblem} aria-hidden="true"><Timer size={18} strokeWidth={1.8} /></span>
          <div className={styles.heading}>
            <span className={styles.title}>Application deadline</span>
            <span className={styles.status}>
              <span className={styles.statusDot} aria-hidden="true" />
              {closed ? "Applications closed" : urgent ? "Closing soon" : "Applications open"}
            </span>
          </div>
        </>}
        <button type="button" data-grip className={styles.grip} title="Drag to move · Arrow keys to reposition" aria-label="Move deadline timer: up and down arrows move it, left and right switch sides" onKeyDown={onGripKey}>
          <GripHorizontal size={16} aria-hidden="true" />
        </button>
      </div>

      <div className={styles.body} role="timer" aria-live="off" aria-label={spoken}>
        {closed ? (
          <span className={styles.closed} aria-hidden="true">
            <Lock size={20} strokeWidth={1.7} />
            <span>{collapsed ? "Closed" : "This application window has ended."}</span>
          </span>
        ) : (
          <>
            {collapsed ? (
              <span className={styles.compact} aria-hidden="true">
                <Timer size={18} strokeWidth={1.8} className={styles.compactIcon} />
                <span className={styles.compactValue}>
                  {left.days > 0 ? <>{left.days}<i>d</i></> : left.hours > 0 ? <>{left.hours}<i>h</i></> : left.minutes > 0 ? <>{left.minutes}<i>m</i></> : <>{left.seconds}<i>s</i></>}
                </span>
                <span className={styles.compactLabel}>left</span>
              </span>
            ) : (
              <>
                <span className={styles.caption} aria-hidden="true">Time left to apply</span>
                <span className={styles.units} aria-hidden="true">
                  <Unit value={left.days} label="Days" />
                  <Unit value={left.hours} label="Hrs" />
                  <Unit value={left.minutes} label="Min" />
                  <Unit value={left.seconds} label="Sec" />
                </span>
              </>
            )}
          </>
        )}
      </div>

      <div className={styles.footer}>
        {!collapsed && <div className={styles.deadline}>
          <CalendarDays size={15} strokeWidth={1.7} aria-hidden="true" />
          <time dateTime={deadlineDate.toISOString()}>
            <span>{dateLabel}</span>
            <span className={styles.deadlineClock}>{clockLabel}</span>
          </time>
        </div>}
        <button type="button" className={styles.toggle} onClick={toggle} title={collapsed ? "Expand timer" : "Minimize timer"} aria-expanded={!collapsed} aria-label={collapsed ? "Expand deadline timer" : "Minimize deadline timer"}>
          <ToggleIcon size={17} aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
