"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Sparkles } from "lucide-react";
import { useInternQuery } from "../useInternQuery";
import { AiRecommendationBadge, Button, Panel } from "./DashboardUI";
import applicant from "./applicant.module.css";
import styles from "./ai-review.module.css";

const CRITERIA = [
  { id: "skillsFit", label: "Skills fit" },
  { id: "projects", label: "Projects" },
  { id: "experience", label: "Experience" },
  { id: "education", label: "Education" },
  { id: "presentation", label: "Resume clarity" },
];
const METHOD_LABEL = { text: "Read from the file's text", ocr: "Read from a scanned image (OCR)", mixed: "Read from text and scanned pages (OCR)", none: "The resume could not be read" };

const when = (value) => (value ? new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");

function List({ title, items }) {
  if (!items?.length) return null;
  return (
    <div>
      <h3>{title}</h3>
      <ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul>
    </div>
  );
}

/** The AI resume review for one application: score, recommendation, reasons and the details it read. */
export default function AiReviewPanel({ application, commands, notify, canReview }) {
  const query = useInternQuery("application.aiReview", { applicationId: application.id });
  const review = query.data;
  const pending = review?.status === "pending" || application.aiReviewStatus === "pending";
  const [busy, setBusy] = useState(false);
  const { refresh } = query;

  // Live events usually refresh this; polling covers a dropped connection while the review runs.
  useEffect(() => {
    if (!pending) return undefined;
    const timer = setInterval(() => { void refresh(); }, 5000);
    return () => clearInterval(timer);
  }, [pending, refresh]);

  async function rerun() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await commands.rerunAiReview([application.id]);
      if (!result.ok) { notify(typeof result.error === "string" ? result.error : result.error?.message || "Couldn't queue the AI review."); return; }
      notify(result.data?.queued ? "AI review queued. It usually takes under a minute." : "This application has no resume to review.");
      void refresh();
      void commands.getApplication(application.id);
    } finally { setBusy(false); }
  }

  const outcome = review?.outcome;
  const result = outcome?.result;
  return (
    <Panel className={styles.panel} aria-busy={pending}>
      <div className={styles.heading}>
        <h2 className={applicant.panelHeading}><Sparkles size={17} /> AI resume review</h2>
        {canReview && review && application.resumeAttachmentId && (
          <Button variant={review.status === "none" ? "primary" : "ghost"} onClick={() => void rerun()} disabled={busy || pending}>
            {review.status === "none" ? <Sparkles size={14} /> : <RotateCcw size={14} />}
            {pending ? "Reviewing…" : busy ? "Queuing…" : review.status === "none" ? "Get AI score" : "Re-scan resume"}
          </Button>
        )}
      </div>

      {!review && query.loading && <p className={styles.muted}>Loading the AI review…</p>}
      {review?.status === "none" && <p className={styles.muted}>{application.resumeAttachmentId ? "No AI review yet. New applications are reviewed automatically; use Get AI score for this one." : "This application has no resume to review."}</p>}
      {pending && <p className={styles.muted} role="status">Reading and reviewing the resume… this usually takes under a minute.</p>}

      {outcome && !pending && (
        <>
          <div className={styles.summaryRow}>
            <div className={styles.score}>
              {typeof outcome.score === "number" ? <><strong>{outcome.score.toFixed(1)}</strong><span>/ 10</span></> : <strong>—</strong>}
            </div>
            <div className={styles.summaryText}>
              <AiRecommendationBadge application={{ aiRecommendation: outcome.recommendation }} />
              {outcome.reason && <p className={styles.reason}>{outcome.reason}</p>}
              {result?.summary && <p>{result.summary}</p>}
            </div>
          </div>

          {result?.scores && (
            <dl className={styles.criteria}>
              {CRITERIA.map((criterion) => (
                <div key={criterion.id}>
                  <dt>{criterion.label}</dt>
                  <dd>
                    <span className={styles.bar} aria-hidden="true"><span style={{ width: `${(result.scores[criterion.id] || 0) * 10}%` }} /></span>
                    {Number(result.scores[criterion.id] ?? 0).toFixed(0)}/10
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {result && (
            <div className={styles.columns}>
              <List title="Strengths" items={result.strengths} />
              <List title="Concerns" items={result.concerns} />
            </div>
          )}

          {result && (
            <details className={styles.details}>
              <summary>Details read from the resume</summary>
              <div className={styles.columns}>
                <div>
                  <h3>Contact</h3>
                  <p>{[result.candidate?.name, result.candidate?.email, result.candidate?.phone, result.candidate?.location].filter(Boolean).join(" · ") || "Not stated"}</p>
                  {result.skills?.length > 0 && <><h3>Skills</h3><p>{result.skills.join(", ")}</p></>}
                  {result.links?.length > 0 && <><h3>Links</h3><p>{result.links.join(", ")}</p></>}
                </div>
                <div>
                  {result.education?.length > 0 && <><h3>Education</h3><ul>{result.education.map((row, index) => <li key={index}>{[row.degree, row.field].filter(Boolean).join(", ")}{row.institution ? ` — ${row.institution}` : ""}{row.years ? ` (${row.years})` : ""}</li>)}</ul></>}
                  {result.experience?.length > 0 && <><h3>Experience</h3><ul>{result.experience.map((row, index) => <li key={index}>{[row.role, row.organization].filter(Boolean).join(" at ")}{row.duration ? ` (${row.duration})` : ""}</li>)}</ul></>}
                  {result.projects?.length > 0 && <><h3>Projects</h3><ul>{result.projects.map((row, index) => <li key={index}><strong>{row.name || "Project"}</strong>{row.technologies?.length ? ` — ${row.technologies.join(", ")}` : ""}</li>)}</ul></>}
                </div>
              </div>
            </details>
          )}

          <p className={styles.meta}>
            {METHOD_LABEL[outcome.extraction?.method] || ""}
            {result ? ` · Confidence ${Math.round(result.confidence * 100)}%` : ""}
            {outcome.extraction?.warnings?.length ? ` · ${outcome.extraction.warnings.join(" ")}` : ""}
            {review.completedAt ? ` · ${when(review.completedAt)}` : ""}
            {outcome.model ? ` · ${outcome.model}` : ""}
          </p>
          <p className={styles.disclaimer}>AI suggestion — check the resume before making a decision.</p>
        </>
      )}
    </Panel>
  );
}
