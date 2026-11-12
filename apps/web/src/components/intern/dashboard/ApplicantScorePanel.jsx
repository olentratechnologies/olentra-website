"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { Button, Panel } from "./DashboardUI";
import { useInternQuery } from "../useInternQuery";
import common from "./pages.module.css";
import styles from "./applicant.module.css";

const SCALE = [0, 1, 2, 3, 4, 5];

/**
 * Structured review: each reviewer scores the admin's criteria 0–5 and can
 * leave a note. Shows the average and everyone's sheets.
 */
export default function ApplicantScorePanel({ applicationId, assignedTo, canReview, commands, notify, onAssigned }) {
  const query = useInternQuery("review.list", { applicationId });
  const reviewersQuery = useInternQuery("staff.reviewers", {}, { enabled: canReview });
  const data = query.data;
  const [scores, setScores] = useState({});
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setScores(data?.mine?.scores || {});
    setComment(data?.mine?.comment || "");
  }, [data?.mine?.updatedOn, data?.mine?.scores, data?.mine?.comment]);
  if (!data) return null;
  const others = data.reviews.filter((review) => review.reviewerId !== data.mine?.reviewerId);
  async function assign(value) {
    const result = await commands.assignApplications([applicationId], value || null);
    if (!result.ok) { notify(typeof result.error === "string" ? result.error : result.error?.message || "Could not change the reviewer."); return; }
    notify(result.data?.assigneeName ? `Assigned to ${result.data.assigneeName}.` : "Reviewer removed.");
    onAssigned?.();
  }
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await commands.saveReview(applicationId, scores, comment);
      if (!result.ok) { notify(typeof result.error === "string" ? result.error : result.error?.message || "Could not save the score."); return; }
      notify("Score saved.");
      void query.refresh();
    } finally { setBusy(false); }
  }
  return <Panel>
    <div className={styles.scoreHeader}>
      <h2 className={styles.panelHeading}>Score</h2>
      <span className={styles.scoreAverage} aria-label="Average score">
        <Star size={15} aria-hidden="true" />
        {data.average == null ? "Not scored yet" : `${data.average.toFixed(1)} / 5 · ${data.reviews.length} ${data.reviews.length === 1 ? "reviewer" : "reviewers"}`}
      </span>
      {canReview && reviewersQuery.data && <label className={styles.reviewerPicker}>
        Reviewer
        <select value={assignedTo || ""} onChange={(event) => void assign(event.target.value)}>
          <option value="">Unassigned</option>
          {reviewersQuery.data.map((reviewer) => <option key={reviewer.id} value={reviewer.id}>{reviewer.name}</option>)}
        </select>
      </label>}
    </div>
    {canReview && <form className={styles.scoreForm} onSubmit={save}>
      {data.rubric.map((criterion) => (
        <fieldset key={criterion.id} className={styles.scoreRow}>
          <legend>{criterion.label}{criterion.weight > 1 ? <small> ×{criterion.weight}</small> : null}</legend>
          <div className={styles.scoreScale} role="radiogroup" aria-label={criterion.label}>
            {SCALE.map((value) => (
              <button key={value} type="button" role="radio" aria-checked={scores[criterion.id] === value}
                className={scores[criterion.id] === value ? styles.scoreSelected : ""}
                onClick={() => setScores((current) => ({ ...current, [criterion.id]: value }))}>{value}</button>
            ))}
          </div>
        </fieldset>
      ))}
      <label className={common.field}>Notes for the team (optional)<textarea rows={2} maxLength={2000} value={comment} onChange={(event) => setComment(event.target.value)} /></label>
      <Button type="submit" disabled={busy || !Object.keys(scores).length}>{busy ? "Saving…" : data.mine ? "Update my score" : "Save my score"}</Button>
    </form>}
    {others.length > 0 && <ul className={styles.scoreOthers}>
      {others.map((review) => <li key={review.reviewerId}><strong>{review.reviewerName}</strong> · {review.total == null ? "—" : review.total.toFixed(1)}{review.comment ? <p>{review.comment}</p> : null}</li>)}
    </ul>}
  </Panel>;
}
