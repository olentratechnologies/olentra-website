"use client";

import { useEffect, useRef, useState } from "react";
import { Award, CheckCheck, FileSearch, Radio, UserCheck, UserPlus, Sparkles, Users } from "lucide-react";
import { INTERN_ROLES } from "@/lib/intern/opportunities.mjs";
import useInternInsights from "./useInternInsights";
import styles from "./intern-insights.module.css";

const FUNNEL = [
  { icon: Users, id: "applied", label: "Applied", hint: "Total applications" },
  { icon: FileSearch, id: "reviewed", label: "Reviewed", hint: "Progressed beyond initial review" },
  { icon: CheckCheck, id: "shortlisted", label: "Shortlisted", hint: "Shortlisted for the next stage" },
  { icon: UserCheck, id: "selected", label: "Selected", hint: "Offered a place" },
  { icon: UserPlus, id: "onboarded", label: "Onboarded", hint: "Joined the program" },
  { icon: Award, id: "certified", label: "Certified", hint: "Certificates issued" },
];
const format = new Intl.NumberFormat("en-IN");

function useNow(interval = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(timer);
  }, [interval]);
  return now;
}

function relativeTime(iso, now) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return minutes === 1 ? "1 min ago" : `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

function trackName(tracks, id) {
  return tracks.find((track) => track.id === id)?.name || "Olentra internship";
}

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

function Skeleton() {
  return (
    <div className={styles.skeleton} aria-hidden="true">
      <div className={styles.skeletonFunnel} />
      <div className={styles.grid}><div /><div /><div /></div>
    </div>
  );
}

export default function InternInsights() {
  const { insights, live, error } = useInternInsights();
  const now = useNow();
  const totals = insights?.totals;
  const tracks = insights?.tracks || [];
  const recent = insights?.recent || [];
  const byRole = insights?.byRole || {};
  const roleCounts = INTERN_ROLES.map((role) => byRole[role.id] || 0);
  const topCount = Math.max(0, ...roleCounts);
  const secondCount = [...roleCounts].sort((a, b) => b - a)[1] || 0;
  const leadingRoleId = topCount > 0 && topCount > secondCount
    ? INTERN_ROLES[roleCounts.indexOf(topCount)]?.id
    : null;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.intro}>
          <span className={styles.eyebrow}>The program in numbers</span>
          <h2 id="insights-title">Internship insights<span>.</span></h2>
          <p>A closer look at the people, progress, and possibilities at Olentra.</p>
        </div>
        <div className={styles.status} aria-live="polite">
          <span className={`${styles.livePill} ${live ? styles.isLive : ""}`}>
            <Radio size={11} aria-hidden="true" />
            {live ? "Live" : error ? "Unavailable" : "Connecting…"}
          </span>
          {live && insights.viewers > 0 && (
            <span className={styles.viewers}>
              <Users size={11} aria-hidden="true" />
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
          <div className={styles.overview}>
            <article className={styles.spotlight}>
              <div>
                <span className={styles.spotlightLabel}><Users size={13} aria-hidden="true" /> Total applications</span>
                <LiveNumber value={totals.applied} className={styles.heroNumber} />
                <p>Every application is the start<br />of a new possibility.</p>
              </div>
              <div className={styles.spotlightFooter}><span>Olentra Launchpad</span><span aria-hidden="true">↗</span></div>
            </article>
            <div className={styles.journey}>
              <div className={styles.overviewHeading}><h3>From application to achievement</h3><span>Program overview</span></div>
              <ol className={styles.funnel} aria-label="Internship selection funnel">
                {FUNNEL.slice(1).map((step, index) => {
                  const Icon = step.icon;
                  const value = totals[step.id] || 0;
                  const share = totals.applied ? Math.min(100, Math.round((value / totals.applied) * 100)) : 0;
                  return (
                    <li key={step.id} className={styles.funnelStep}>
                      <div className={styles.stepTop}><span className={styles.stepIcon}><Icon size={13} aria-hidden="true" /></span><span className={styles.stepIndex}>{String(index + 2).padStart(2, "0")}</span></div>
                      <span className={styles.stepLabel}>{step.label}</span>
                      <LiveNumber value={value} className={styles.stepValue} />
                      <span className={styles.meter} aria-hidden="true"><span style={{ width: `${share}%` }} /></span>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>

          <section className={styles.pulse} aria-label="Live internship pulse">
            <article className={styles.pulseFeed}>
              <span className={styles.eyebrow}>Happening now</span>
              <h3>Applications happening now</h3>
              <p className={styles.pulseIntro}>Live, anonymous activity from people applying this intake.</p>
              {recent.length ? (
                <ol className={styles.feed} aria-live="polite">
                  {recent.map((item, index) => (
                    <li key={`${item.at}:${item.track}:${index}`} className={styles.feedItem}>
                      <span className={styles.feedTrack}>Applied to {trackName(tracks, item.track)}</span>
                      <time className={styles.feedTime} dateTime={item.at}>{relativeTime(item.at, now)}</time>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className={styles.firstNote}><Sparkles size={15} aria-hidden="true" /> Be among the first to apply this intake.</p>
              )}
            </article>
            <article className={styles.pulseRoles}>
              <span className={styles.eyebrow}>Where people apply</span>
              <h3>Where people are applying</h3>
              <p className={styles.pulseIntro}>Live demand by intern role — choose the path that fits you.</p>
              {totals.applied > 0 ? (
                <ul className={styles.roleList}>
                  {INTERN_ROLES.map((role) => {
                    const count = byRole[role.id] || 0;
                    const share = totals.applied ? Math.min(100, Math.round((count / totals.applied) * 100)) : 0;
                    return (
                      <li key={role.id}>
                        <a className={styles.roleRow} href={`#role-${role.id}`} aria-label={`${role.short}, ${count} ${count === 1 ? "application" : "applications"}${leadingRoleId === role.id ? ", most requested" : ""}`}>
                          <span className={styles.roleRowTop}>
                            <span className={styles.roleName}>
                              {role.short}
                              {leadingRoleId === role.id && <span className={styles.mostRequested}>Most requested</span>}
                            </span>
                            <LiveNumber value={count} className={styles.roleCount} />
                          </span>
                          <span className={styles.roleShare} aria-hidden="true"><span style={{ width: `${share}%` }} /></span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className={styles.firstNote}><Sparkles size={15} aria-hidden="true" /> Applications are open — be among the first to apply.</p>
              )}
            </article>
          </section>

          <section className={styles.applicationTimeline} aria-labelledby="application-timeline-title">
            <div className={styles.timelineIntro}>
              <span className={styles.eyebrow}>Your next steps</span>
              <h3 id="application-timeline-title">From application to onboarding</h3>
              <p>Follow your progress in your candidate portal.</p>
            </div>
            <ol className={styles.timelineSteps}>
              {[
                { title: "Application review", detail: "Our team checks your application for completeness and eligibility." },
                { title: "Rigorous screening", detail: "We assess your skills, experience, and alignment with your chosen role." },
                { title: "Offer", detail: "Selected candidates receive an offer." },
                { title: "Onboarding", detail: "Get ready to join your program." },
              ].map((step, index) => (
                <li key={step.title}>
                  <span className={styles.timelineNumber} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  <h4>{step.title}</h4><p>{step.detail}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </div>
  );
}
