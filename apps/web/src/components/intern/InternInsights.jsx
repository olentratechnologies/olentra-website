"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Activity, Award, FolderKanban, Radio, Sparkles, TrendingDown, TrendingUp, Users } from "lucide-react";
import useInternInsights from "./useInternInsights";
import styles from "./intern-insights.module.css";

const TRACK_COLORS = { explorer: "#2583ff", innovator: "#8256ff" };
const FUNNEL = [
  { id: "applied", label: "Applied", hint: "Total applications" },
  { id: "reviewed", label: "Reviewed", hint: "Moved past first review" },
  { id: "shortlisted", label: "Shortlisted", hint: "Invited forward" },
  { id: "selected", label: "Selected", hint: "Offered a seat" },
  { id: "onboarded", label: "Onboarded", hint: "Joined the program" },
  { id: "certified", label: "Certified", hint: "Certificates issued" },
];
const format = new Intl.NumberFormat("en-IN");

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

/** Counts from the previous value to the new one and briefly highlights the change. */
function LiveNumber({ value, className = "" }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(value);
  const [flash, setFlash] = useState(false);
  const previous = useRef(value);
  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    if (from === value) return undefined;
    if (reduced) { setShown(value); return undefined; }
    setFlash(true);
    const started = performance.now(), duration = 700;
    let frame = requestAnimationFrame(function step(now) {
      const progress = Math.min(1, (now - started) / duration), eased = 1 - (1 - progress) ** 3;
      setShown(Math.round(from + (value - from) * eased));
      if (progress < 1) frame = requestAnimationFrame(step);
    });
    const timer = setTimeout(() => setFlash(false), 1400);
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); };
  }, [value, reduced]);
  return <strong className={`${className} ${flash ? styles.flash : ""}`}>{format.format(shown)}</strong>;
}

function relativeTime(iso, now) {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days < 30 ? `${days}d ago` : new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function TrendChart({ months }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const width = 320, height = 120, pad = { top: 10, bottom: 22, side: 4 };
  const totals = months.map((m) => m.explorer + m.innovator);
  const max = Math.max(1, ...totals);
  const x = (index) => pad.side + (index / Math.max(1, months.length - 1)) * (width - pad.side * 2);
  const y = (value) => height - pad.bottom - (value / max) * (height - pad.top - pad.bottom);
  const area = (top, bottom) =>
    `M${months.map((_, i) => `${x(i)},${y(top(i))}`).join("L")}L${months.map((_, i) => `${x(months.length - 1 - i)},${y(bottom(months.length - 1 - i))}`).join("L")}Z`;
  const explorerArea = area((i) => months[i].explorer, () => 0);
  const innovatorArea = area((i) => totals[i], (i) => months[i].explorer);
  const line = `M${months.map((_, i) => `${x(i)},${y(totals[i])}`).join("L")}`;
  const summary = months.map((m, i) => `${m.label}: ${totals[i]}`).join(", ");
  return (
    <svg className={styles.trendChart} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Applications per month. ${summary}`}>
      <defs>
        <linearGradient id={`${id}-explorer`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={TRACK_COLORS.explorer} stopOpacity=".45" />
          <stop offset="1" stopColor={TRACK_COLORS.explorer} stopOpacity=".06" />
        </linearGradient>
        <linearGradient id={`${id}-innovator`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={TRACK_COLORS.innovator} stopOpacity=".4" />
          <stop offset="1" stopColor={TRACK_COLORS.innovator} stopOpacity=".08" />
        </linearGradient>
      </defs>
      {[0.5, 1].map((t) => (
        <line key={t} x1={pad.side} x2={width - pad.side} y1={y(max * t)} y2={y(max * t)} className={styles.gridLine} />
      ))}
      <path d={explorerArea} fill={`url(#${id}-explorer)`} />
      <path d={innovatorArea} fill={`url(#${id}-innovator)`} />
      <path d={line} className={styles.trendLine} />
      <circle cx={x(months.length - 1)} cy={y(totals[totals.length - 1])} r="4" className={styles.trendDot} />
      {months.map((m, i) => (i % 4 === 0 || i === months.length - 1 ? (
        <text key={m.month} x={x(i)} y={height - 6} textAnchor={i === 0 ? "start" : i === months.length - 1 ? "end" : "middle"} className={styles.axisLabel}>{m.label}</text>
      ) : null))}
    </svg>
  );
}

function TrackDonut({ tracks, byTrack, trackNames }) {
  const entries = tracks.map(({ id }) => ({ track: id, count: byTrack?.[id] || 0 }));
  const total = entries.reduce((sum, entry) => sum + entry.count, 0);
  const radius = 42, circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className={styles.donutWrap}>
      <svg viewBox="0 0 110 110" className={styles.donut} role="img" aria-label={entries.map((e) => `${trackNames[e.track] || e.track}: ${e.count}`).join(", ")}>
        <circle cx="55" cy="55" r={radius} className={styles.donutTrack} />
        {total > 0 && entries.map((entry) => {
          const length = (entry.count / total) * circumference;
          const segment = (
            <circle key={entry.track} cx="55" cy="55" r={radius} fill="none" stroke={TRACK_COLORS[entry.track] || "#2583ff"} strokeWidth="12"
              strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-offset} transform="rotate(-90 55 55)" className={styles.donutSegment} />
          );
          offset += length;
          return segment;
        })}
        <text x="55" y="53" textAnchor="middle" className={styles.donutValue}>{format.format(total)}</text>
        <text x="55" y="69" textAnchor="middle" className={styles.donutLabel}>applicants</text>
      </svg>
      <ul className={styles.legend}>
        {entries.map((entry) => (
          <li key={entry.track}>
            <span className={styles.swatch} style={{ background: TRACK_COLORS[entry.track] || "#2583ff" }} />
            <span>{trackNames[entry.track] || entry.track}</span>
            <b>{total ? Math.round((entry.count / total) * 100) : 0}%</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ActivityFeed({ recent, trackNames }) {
  const [now, setNow] = useState(() => Date.now());
  const seen = useRef(null);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  const keys = recent.map((item, index) => `${item.at}-${item.track}-${recent.slice(0, index).filter((o) => o.at === item.at && o.track === item.track).length}`);
  const fresh = seen.current ? new Set(keys.filter((key) => !seen.current.has(key))) : new Set();
  useEffect(() => { seen.current = new Set(keys); });
  if (!recent.length) return <p className={styles.emptyNote}>New applications will appear here the moment they arrive.</p>;
  return (
    <ul className={styles.feed}>
      {recent.slice(0, 6).map((item, index) => (
        <li key={keys[index]} className={fresh.has(keys[index]) ? styles.feedNew : ""}>
          <span className={styles.feedDot} style={{ background: TRACK_COLORS[item.track] || "#2583ff" }} aria-hidden="true" />
          <span className={styles.feedText}>New applicant joined <b>{trackNames[item.track] || "the program"}</b></span>
          <time dateTime={item.at}>{relativeTime(item.at, now)}</time>
        </li>
      ))}
    </ul>
  );
}

function Skeleton() {
  return (
    <div className={styles.skeleton} aria-hidden="true">
      <div className={styles.skeletonFunnel} />
      <div className={styles.grid}><div /><div /><div /></div>
    </div>
  );
}

export default function InternInsights({ heading, trackNames = {} }) {
  const { insights, live, error } = useInternInsights();
  const totals = insights?.totals;
  const tracks = insights?.tracks || [];
  const names = Object.fromEntries(tracks.map((track) => [track.id, trackNames[track.id] || track.name]));
  const growth = insights && insights.lastMonth > 0 ? Math.round(((insights.thisMonth - insights.lastMonth) / insights.lastMonth) * 100) : null;

  return (
    <>
      <div className={styles.header}>
        {heading}
        <div className={styles.status} aria-live="polite">
          <span className={`${styles.livePill} ${live ? styles.isLive : ""}`}>
            <Radio size={13} aria-hidden="true" />
            {live ? "Live" : error ? "Unavailable" : "Connecting…"}
          </span>
          {live && insights.viewers > 0 && (
            <span className={styles.viewers}>
              <Users size={13} aria-hidden="true" />
              <b>{format.format(insights.viewers)}</b> viewing now
            </span>
          )}
        </div>
      </div>

      {!insights ? (
        error ? <p className={styles.emptyNote}>Live insights are temporarily unavailable. Please check back shortly.</p> : <Skeleton />
      ) : !tracks.length ? (
        <p className={styles.firstNote}><Sparkles size={15} aria-hidden="true" /> Insights will appear here once an internship track opens.</p>
      ) : (
        <div className={styles.body}>
          <p className={styles.srOnly} aria-live="polite">{`${totals.applied} applications, ${totals.shortlisted} shortlisted, ${totals.onboarded} onboarded.`}</p>
          <ol className={styles.funnel} aria-label="Internship selection funnel">
            {FUNNEL.map((step, index) => {
              const value = totals[step.id] || 0;
              const share = totals.applied ? Math.min(100, Math.round((value / totals.applied) * 100)) : 0;
              return (
                <li key={step.id} className={styles.funnelStep}>
                  <span className={styles.stepLabel}>{step.label}</span>
                  <LiveNumber value={value} className={styles.stepValue} />
                  <span className={styles.meter} aria-hidden="true"><span style={{ width: `${index === 0 ? 100 : share}%` }} /></span>
                  <span className={styles.stepHint}>{index === 0 ? step.hint : `${share}% of applicants`}</span>
                </li>
              );
            })}
          </ol>

          {totals.applied === 0 && <p className={styles.firstNote}><Sparkles size={15} aria-hidden="true" /> Applications are open — be among the first to apply.</p>}

          <div className={styles.grid}>
            <article className={styles.card}>
              <header className={styles.cardHead}>
                <h3><TrendingUp size={16} aria-hidden="true" /> Applications trend</h3>
                {growth !== null && (
                  <span className={`${styles.chip} ${growth < 0 ? styles.chipDown : ""}`}>
                    {growth < 0 ? <TrendingDown size={12} aria-hidden="true" /> : <TrendingUp size={12} aria-hidden="true" />}
                    {growth > 0 ? "+" : ""}{growth}% vs last month
                  </span>
                )}
              </header>
              <div className={styles.trendStats}>
                <div><LiveNumber value={insights.thisMonth} /><span>this month</span></div>
                <div><LiveNumber value={insights.lastMonth} /><span>last month</span></div>
              </div>
              <TrendChart months={insights.months} />
            </article>

            <article className={styles.card}>
              <header className={styles.cardHead}><h3><Users size={16} aria-hidden="true" /> {tracks.length > 1 ? "Track split" : "Applicants"}</h3></header>
              <TrackDonut tracks={tracks} byTrack={insights.byTrack} trackNames={names} />
              <div className={styles.miniStats}>
                <div><FolderKanban size={16} aria-hidden="true" /><LiveNumber value={totals.projects} /><span>Projects</span></div>
                <div><Award size={16} aria-hidden="true" /><LiveNumber value={totals.certified} /><span>Certificates</span></div>
              </div>
            </article>

            <article className={styles.card}>
              <header className={styles.cardHead}><h3><Activity size={16} aria-hidden="true" /> Live activity</h3></header>
              <ActivityFeed recent={insights.recent} trackNames={names} />
              {insights.topSkills.length > 0 && (
                <div className={styles.skills}>
                  <h4>Top applicant skills</h4>
                  <ul>
                    {insights.topSkills.map((skill) => (
                      <li key={skill.name}>{skill.name}<b>{skill.count}</b></li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          </div>
        </div>
      )}
    </>
  );
}
