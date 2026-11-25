"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Clock3, Sun } from "lucide-react";
import { useInternQuery } from "../useInternQuery";
import { SCHEDULE_VIEWS, parseScheduleView, scheduleLabel } from "@/lib/intern/schedule-split.mjs";
import styles from "./schedule-split.module.css";

/** Which schedule a page is showing, from `?schedule=`; null until one is chosen. */
export function useScheduleView() {
  const params = useSearchParams(), router = useRouter(), pathname = usePathname();
  const view = parseScheduleView(params.get("schedule"));
  const choose = useCallback((next) => {
    const query = new URLSearchParams(params.toString());
    if (next) query.set("schedule", next); else query.delete("schedule");
    const text = query.toString();
    router.push(text ? `${pathname}?${text}` : pathname, { scroll: true });
  }, [params, router, pathname]);
  return [view, choose];
}

const ICONS = { full_time: Sun, part_time: Clock3 };
const BLURB = {
  full_time: "Students who can work full days on the internship.",
  part_time: "Students working alongside their studies, with fewer hours.",
};

/** A small "Full-time" / "Part-time" label for rows, headers and dialogs. */
export function ScheduleBadge({ schedule, className = "" }) {
  const label = scheduleLabel(schedule);
  if (!label) return null;
  return <span className={`${styles.badge} ${className}`} data-schedule={schedule}>{label}</span>;
}

/**
 * The two entry cards shown before a list: pick Full-time or Part-time first.
 * `method`/`params` fetch each card's numbers; `details(data)` turns a reply
 * into a few "label: value" lines.
 */
export function ScheduleEntry({ title, description, noun, method, params = {}, totalOf = (data) => data?.total, details = () => [], onChoose }) {
  const full = useInternQuery(method, { ...params, schedule: "full_time", page: 1, pageSize: 1 });
  const part = useInternQuery(method, { ...params, schedule: "part_time", page: 1, pageSize: 1 });
  const queries = { full_time: full, part_time: part };
  return (
    <div className={styles.entry}>
      <header className={styles.entryHead}>
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      <div className={styles.cards}>
        {SCHEDULE_VIEWS.map((id) => {
          const Icon = ICONS[id], query = queries[id], total = totalOf(query.data);
          return (
            <button type="button" key={id} className={styles.card} data-schedule={id} onClick={() => onChoose(id)}>
              <span className={styles.cardIcon} aria-hidden="true"><Icon size={26} /></span>
              <span className={styles.cardTitle}>{scheduleLabel(id)} {noun}</span>
              <span className={styles.cardBlurb}>{BLURB[id]}</span>
              <strong className={styles.cardCount}>{query.data ? total ?? 0 : "…"}</strong>
              {query.data && (
                <span className={styles.cardDetails}>
                  {details(query.data).filter(([, value]) => value).map(([label, value]) => <span key={label}><b>{value}</b> {label}</span>)}
                </span>
              )}
              <span className={styles.cardGo}>Open {scheduleLabel(id).toLowerCase()} {noun} <ArrowRight size={15} aria-hidden="true" /></span>
            </button>
          );
        })}
      </div>
      <p className={styles.all}>Need everything together? <button type="button" onClick={() => onChoose("all")}>View all {noun}</button></p>
    </div>
  );
}

/** The strip at the top of a list showing which schedule you're working in, with quick switches. */
export function ScheduleBanner({ view, noun, onChoose }) {
  const other = view === "full_time" ? "part_time" : "full_time";
  if (view === "all") {
    return (
      <div className={styles.banner} data-schedule="all" role="status">
        <p><strong>All {noun}</strong> · Full-time and part-time together. Check each row’s schedule before you act.</p>
        <span className={styles.switches}>
          <button type="button" onClick={() => onChoose("full_time")}>Full-time only</button>
          <button type="button" onClick={() => onChoose("part_time")}>Part-time only</button>
          <button type="button" onClick={() => onChoose(null)}>Back to choices</button>
        </span>
      </div>
    );
  }
  const Icon = ICONS[view];
  return (
    <div className={styles.banner} data-schedule={view} role="status">
      <p><Icon size={17} aria-hidden="true" /> <strong>{scheduleLabel(view)} {noun}</strong> · Everything on this page, including selections and offers, is {scheduleLabel(view).toLowerCase()} only.</p>
      <span className={styles.switches}>
        <button type="button" onClick={() => onChoose(other)}>Switch to {scheduleLabel(other).toLowerCase()}</button>
        <button type="button" onClick={() => onChoose("all")}>All</button>
        <button type="button" onClick={() => onChoose(null)}>Back to choices</button>
      </span>
    </div>
  );
}

/** For links elsewhere, e.g. "/intern/dashboard/applications?schedule=part_time". */
export function scheduleHref(path, view) {
  return view ? `${path}?schedule=${view}` : path;
}

