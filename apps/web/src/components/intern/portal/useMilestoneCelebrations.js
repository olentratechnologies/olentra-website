"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { burstFrom } from "@/lib/confetti.mjs";
import { WELCOME_FLAG, currentMilestones, pendingCelebrations, readSeen, writeSeen } from "@/lib/intern/milestones.mjs";

const safeStorage = (name) => { try { return window[name]; } catch { return null; } };

/**
 * Celebrates staff-triggered milestones the first time this intern sees them —
 * on the next visit, or instantly when a live update arrives. Big milestones
 * queue for the full-page overlay one at a time; approved work and newly
 * unlocked badges get a burst and one combined toast.
 */
export default function useMilestoneCelebrations({ account, my, ready, notify }) {
  const accountId = account?.role === "intern" ? account.id : null;
  const [queue, setQueue] = useState([]);
  const seenRef = useRef({ accountId: null, keys: null, loaded: false });

  useEffect(() => {
    if (!accountId || !ready) return;
    const state = seenRef.current;
    if (state.accountId !== accountId) {
      // Fall back to an in-memory record when storage is blocked: at most once per session.
      seenRef.current = { accountId, keys: readSeen(safeStorage("localStorage"), accountId), loaded: true };
      setQueue([]);
    }
    const record = seenRef.current;
    const milestones = currentMilestones(my);
    const pending = pendingCelebrations(milestones, record.keys);
    const keys = new Set(record.keys || []);
    for (const item of milestones) keys.add(item.key);
    record.keys = keys;
    writeSeen(safeStorage("localStorage"), accountId, keys);

    const big = pending.filter((item) => item.tier === "big");
    const approved = pending.filter((item) => item.kind === "submission-approved");
    let welcome = false;
    try {
      const session = safeStorage("sessionStorage");
      if (session?.getItem(WELCOME_FLAG)) { session.removeItem(WELCOME_FLAG); welcome = true; }
    } catch { /* storage blocked: skip the welcome moment */ }
    if (welcome || big.length)
      setQueue((current) => {
        const known = new Set(current.map((item) => item.key));
        const next = [...current];
        if (welcome && !known.has("welcome")) next.unshift({ key: "welcome", kind: "welcome" });
        for (const item of big) if (!known.has(item.key)) next.push(item);
        return next;
      });
    const badges = pending.filter((item) => item.kind === "badge");
    if (approved.length || badges.length) {
      // Burst from the badge on the dashboard row when it is on screen.
      const target = badges.length && document.querySelector(`[data-badge-id="${badges[0].badgeId}"][data-earned="true"]`);
      burstFrom(target || { x: window.innerWidth / 2, y: window.innerHeight * 0.35 }, { count: 90, spread: 160 });
      const messages = [];
      if (approved.length) messages.push(approved.length === 1
        ? `Your work${approved[0].taskTitle ? ` on “${approved[0].taskTitle}”` : ""} was approved! Great job.`
        : `${approved.length} of your submissions were approved! Great job.`);
      if (badges.length) messages.push(badges.length === 1
        ? `Badge unlocked: ${badges[0].title} ${badges[0].icon}`
        : `${badges.length} badges unlocked: ${badges.map((badge) => `${badge.title} ${badge.icon}`).join(", ")}`);
      notify?.(messages.join(" "));
    }
  }, [accountId, ready, my, notify]);

  const dismiss = useCallback(() => setQueue((current) => current.slice(1)), []);
  return { current: queue[0] || null, dismiss };
}
