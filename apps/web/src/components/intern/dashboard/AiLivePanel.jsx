"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity } from "lucide-react";
import { useInternQuery } from "../useInternQuery";
import { AiRecommendationBadge, Modal } from "./DashboardUI";
import styles from "./ai-live.module.css";

const WORKER = {
  working: { tone: "live", label: "Reviewing now" },
  running: { tone: "live", label: "Running — picking the next resume" },
  "rate-limited": { tone: "wait", label: "Pausing for Groq's rate limit — resumes automatically" },
  idle: { tone: "idle", label: "Idle — nothing waiting" },
  off: { tone: "off", label: "Off — no server is running AI reviews (check GROQ_API_KEY)" },
};

const ago = (iso, now) => {
  if (!iso) return "";
  const seconds = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? `${minutes} min ago` : `${Math.round(minutes / 60)} h ago`;
};
const elapsed = (iso, now) => (iso ? `${Math.max(0, Math.round((now - Date.parse(iso)) / 1000))}s` : "");
const until = (iso, now) => {
  if (!iso) return "";
  const seconds = Math.round((Date.parse(iso) - now) / 1000);
  return seconds > 0 ? `in ${seconds}s` : "";
};

/** Toolbar button + live view of the AI resume review queue. Polls only while open. */
export default function AiLivePanel({ pendingCount }) {
  const [open, setOpen] = useState(false);
  const query = useInternQuery("application.aiQueue", {}, { enabled: open });
  const { refresh } = query;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!open) return undefined;
    void refresh();
    const poll = setInterval(() => { void refresh(); }, 2000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, [open, refresh]);

  const data = query.data;
  const worker = WORKER[data?.worker] || null;
  const active = pendingCount > 0;
  return (
    <>
      <button type="button" className={`${styles.trigger} ${active ? styles.triggerActive : ""}`} onClick={() => setOpen(true)} title="See what the AI is reviewing right now">
        <span className={styles.dot} data-live={active ? "true" : undefined} aria-hidden="true" />
        AI live{active ? ` · ${pendingCount} waiting` : ""}
      </button>
      <Modal open={open} onOpenChange={setOpen} title="AI resume review — live" description="Updates every 2 seconds while this is open." className={styles.modal}>
        {!data && <p className={styles.muted}>{query.error ? "Couldn't load the AI queue." : "Loading…"}</p>}
        {data && (
          <div className={styles.body}>
            <div className={styles.status} data-tone={worker?.tone}>
              <span className={styles.dot} data-live={data.worker === "working" || data.worker === "running" ? "true" : undefined} aria-hidden="true" />
              <strong>{worker?.label || data.worker}</strong>
            </div>

            <dl className={styles.stats}>
              <div><dt>Waiting</dt><dd>{data.queued}</dd></div>
              <div><dt>Scored</dt><dd>{data.done}</dd></div>
              <div><dt>Manual review</dt><dd>{data.manual}</dd></div>
              <div><dt>Speed</dt><dd>{data.perMinute ? `${data.perMinute}/min` : "—"}</dd></div>
              <div><dt>Time left</dt><dd>{data.etaMinutes ? `~${data.etaMinutes} min` : data.queued ? "—" : "Done"}</dd></div>
            </dl>

            <section>
              <h3><Activity size={14} aria-hidden="true" /> Now</h3>
              {data.processing.length ? data.processing.map((row) => (
                <div key={row.applicationId} className={styles.now} role="status">
                  <Link href={`/intern/dashboard/applications/${row.applicationId}`} onClick={() => setOpen(false)}>{row.name}</Link>
                  <span>{row.step}</span>
                  <small>{elapsed(row.startedAt, now)}</small>
                </div>
              )) : data.next[0] ? (
                // Reviews take a second or two; most of the time is spent waiting for Groq's limit.
                <div className={styles.now} data-waiting="true">
                  <span>Starting next:</span>
                  <Link href={`/intern/dashboard/applications/${data.next[0].applicationId}`} onClick={() => setOpen(false)}>{data.next[0].name}</Link>
                  <small>{until(data.next[0].dueAt, now) || "any moment"}</small>
                </div>
              ) : <p className={styles.muted}>Nothing is being reviewed.</p>}
            </section>

            {data.next.length > 0 && (
              <section>
                <h3>Up next</h3>
                <ol className={styles.list}>
                  {data.next.map((row) => (
                    <li key={row.applicationId}>
                      <Link href={`/intern/dashboard/applications/${row.applicationId}`} onClick={() => setOpen(false)}>{row.name}</Link>
                      {row.waiting && <small>{row.waiting === "rate limit" ? `waiting for rate limit ${until(row.dueAt, now)}` : `retrying ${until(row.dueAt, now)}`}</small>}
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {data.recent.length > 0 && (
              <section>
                <h3>Just finished</h3>
                <ul className={styles.list}>
                  {data.recent.map((row) => (
                    <li key={`${row.applicationId}-${row.completedAt}`}>
                      <Link href={`/intern/dashboard/applications/${row.applicationId}`} onClick={() => setOpen(false)}>{row.name}</Link>
                      <span className={styles.result}>
                        {typeof row.score === "number" && <strong>{row.score.toFixed(1)}</strong>}
                        <AiRecommendationBadge application={{ aiRecommendation: row.recommendation }} />
                      </span>
                      <small title={row.reason || undefined}>
                        {[row.method === "ocr" ? "scanned (OCR)" : row.method === "mixed" ? "partly scanned" : "", row.seconds != null ? `took ${row.seconds}s` : "", ago(row.completedAt, now)].filter(Boolean).join(" · ")}
                      </small>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
