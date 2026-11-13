"use client";

import { Panel, EmptyState } from "./DashboardUI";
import { useInternQuery } from "../useInternQuery";
import styles from "./analytics.module.css";

/** Exit feedback averages for staff; admins also see the comments. */
export default function FeedbackSummary() {
  const query = useInternQuery("feedback.summary", {});
  const data = query.data;
  if (!data) return null;
  if (!data.count) return <Panel><EmptyState title="No feedback yet" description="Interns are asked for feedback when their internship is completed." /></Panel>;
  const stat = (label, value) => <article className={styles.trackSummary}><strong>{value}<small>{label}</small></strong></article>;
  return (
    <Panel className={styles.comparisonPanel}>
      <h2 className={styles.sectionTitle}>Intern feedback</h2>
      <p className={styles.description}>From {data.count} completed {data.count === 1 ? "intern" : "interns"}.</p>
      <div className={styles.comparisonCards}>
        {stat("program rating out of 5", data.program?.toFixed(1) ?? "—")}
        {stat("mentoring rating out of 5", data.mentor?.toFixed(1) ?? "—")}
        {stat("would recommend", data.recommendPercent == null ? "—" : `${data.recommendPercent}%`)}
      </div>
      {data.comments.length > 0 && <ul className={styles.feedbackComments}>
        {data.comments.map((entry) => <li key={entry.id}><p>“{entry.comment}”</p><small>{entry.name}{entry.program ? ` · ${entry.program}` : ""} · {entry.programRating}/5</small></li>)}
      </ul>}
    </Panel>
  );
}
