"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Modal, StatusBadge } from "./DashboardUI";
import { SELECTABLE_FROM, SELECT_PATH, eligibleForSelection, parseMinScore, runBulkRequests } from "@/lib/intern/bulk.mjs";
import { fetchAllPages } from "@/lib/intern/application-export.mjs";
import styles from "./applicant.module.css";
import own from "./SelectByScoreDialog.module.css";

const DEFAULT_MIN_SCORE = "9";
const errorText = (error, fallback) => (typeof error === "string" ? error : error?.message || fallback);

/**
 * Finds every application at or above an AI score (across all pages, not
 * just the visible one) and selects them in one go. Each applicant moves
 * through Under Review and Shortlisted to Selected and gets one email.
 */
export default function SelectByScoreDialog({ open, onOpenChange, commands, programId = "all", trackLabel = "", notify, onDone }) {
  const [minScore, setMinScore] = useState(DEFAULT_MIN_SCORE);
  const [fromStatuses, setFromStatuses] = useState(SELECTABLE_FROM);
  const [matches, setMatches] = useState(null); // null until the first search finishes
  const [unscored, setUnscored] = useState(0);
  const [excluded, setExcluded] = useState(() => new Set());
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [phrase, setPhrase] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failures, setFailures] = useState([]);
  const searchId = useRef(0);

  const score = parseMinScore(minScore);
  const chosen = (matches || []).filter((row) => !excluded.has(row.id));
  const confirmPhrase = `SELECT ${chosen.length}`;

  async function search({ onlyIds } = {}) {
    if (score == null || !fromStatuses.length) return;
    const current = ++searchId.current;
    setLoading(true);
    setLoadError("");
    try {
      const track = programId && programId !== "all" ? { programId } : {};
      const lists = await Promise.all(fromStatuses.map((status) => fetchAllPages((page) => commands.listApplications({
        ...track, status, aiScoreMin: score, page, pageSize: 100, sortField: "aiScore", sortDirection: "desc",
      }))));
      const waiting = await Promise.all(fromStatuses.map((status) => commands.listApplications({ ...track, status, aiReviewStatus: "unreviewed", page: 1, pageSize: 1 })));
      if (current !== searchId.current) return;
      const unique = [...new Map(lists.flatMap((list) => list.items).map((row) => [row.id, row])).values()]
        .filter((row) => eligibleForSelection(row) && row.aiScore >= score && (!onlyIds || onlyIds.has(row.id)))
        .sort((a, b) => b.aiScore - a.aiScore || String(a.name).localeCompare(String(b.name)));
      setMatches(unique);
      setUnscored(waiting.reduce((sum, result) => sum + (result?.ok ? result.data?.total || 0 : 0), 0));
      setExcluded(new Set());
      setPhrase("");
    } catch (error) {
      if (current === searchId.current) setLoadError(errorText(error, "Couldn't load the matching applications."));
    } finally {
      if (current === searchId.current) setLoading(false);
    }
  }

  // Search as soon as the dialog opens; later searches run from the button.
  useEffect(() => {
    if (!open) return;
    setFailures([]);
    setProgress(0);
    void search();
  }, [open]);

  function toggleStatus(status) {
    setFromStatuses((current) => (current.includes(status) ? current.filter((value) => value !== status) : SELECTABLE_FROM.filter((value) => value === status || current.includes(value))));
    setMatches(null);
  }

  function toggleRow(id) {
    setExcluded((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    setPhrase("");
  }

  async function run(event) {
    event.preventDefault();
    if (running || loading || !chosen.length || phrase.trim().toUpperCase() !== confirmPhrase) return;
    setRunning(true);
    setProgress(0);
    setFailures([]);
    try {
      const { succeeded, failed } = await runBulkRequests(chosen, async (chunk) => {
        try {
          return await commands.bulkSetApplicationStatus(chunk.map((row) => ({ id: row.id, expectedVersion: row.version })), "Selected", { path: SELECT_PATH });
        } finally {
          setProgress((value) => value + chunk.length);
        }
      });
      setFailures(failed);
      notify(`${succeeded.length} ${succeeded.length === 1 ? "applicant" : "applicants"} selected and emailed.${failed.length ? ` ${failed.length} could not be selected; see the details.` : ""}`);
      onDone?.();
      if (failed.length) {
        // Keep only the failed rows, so "Try again" picks up their latest versions.
        setMatches(failed.map(({ item }) => item));
        setExcluded(new Set());
        setPhrase("");
      } else {
        onOpenChange(false);
        setMatches(null);
      }
    } finally {
      setRunning(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => { if (!running) onOpenChange(next); }}
      title="Select applicants by AI score"
      description={`Find every application${trackLabel ? ` for ${trackLabel}` : ""} at or above an AI score and select them together. Each applicant moves through Under review and Shortlisted to Selected, and gets one “You’re selected” email with a link to sign in to their portal. Offers are sent separately.`}
    >
      <form className={`${styles.modalForm} ${own.modal}`} onSubmit={run}>
        <label>
          Minimum AI score (0–10)
          <input
            type="number" min="0" max="10" step="0.1" inputMode="decimal"
            value={minScore} disabled={running}
            onChange={(event) => { setMinScore(event.target.value); setMatches(null); }}
            aria-invalid={score == null}
          />
        </label>
        <fieldset className={own.statuses} disabled={running}>
          <legend>Include applications that are currently</legend>
          {SELECTABLE_FROM.map((status) => (
            <label key={status} className={own.check}>
              <input type="checkbox" checked={fromStatuses.includes(status)} onChange={() => toggleStatus(status)} />
              {status}
            </label>
          ))}
        </fieldset>
        {score == null && <p className={styles.fieldError}>Enter a score from 0 to 10.</p>}
        {!fromStatuses.length && <p className={styles.fieldError}>Choose at least one status.</p>}
        {matches == null && !loading && score != null && fromStatuses.length > 0 && (
          <Button type="button" variant="secondary" onClick={() => void search()}>Find matching applicants</Button>
        )}
        {loading && <p className={own.progress} role="status">Finding applicants…</p>}
        {loadError && <p className={styles.fieldError} role="alert">{loadError}</p>}

        {matches && !loading && (
          <>
            <p className={own.summary}>
              <span><strong>{chosen.length}</strong> of {matches.length} matching {matches.length === 1 ? "applicant" : "applicants"} will be selected</span>
              {matches.length > 0 && <small>Untick anyone you want to leave out</small>}
            </p>
            {matches.length > 0 && (
              <ul className={own.list}>
                {matches.map((row) => (
                  <li key={row.id} data-off={excluded.has(row.id)}>
                    <input type="checkbox" aria-label={`Include ${row.name}`} checked={!excluded.has(row.id)} disabled={running} onChange={() => toggleRow(row.id)} />
                    <span className={own.name} title={row.email}>{row.name}<small>{row.email}</small></span>
                    <span><span className={own.score}>{row.aiScore.toFixed(1)}</span> <StatusBadge status={row.status} /></span>
                  </li>
                ))}
              </ul>
            )}
            {unscored > 0 && <p className={own.note}>{unscored} {unscored === 1 ? "application has" : "applications have"} no AI score yet and {unscored === 1 ? "isn’t" : "aren’t"} included. Use “Score all unscored” first if you want them considered.</p>}
            {failures.length > 0 && (
              <div className={own.failures} role="alert">
                These applicants were not selected:
                <ul>{failures.map(({ item, error }) => <li key={item.id}>{item.name}: {error}</li>)}</ul>
                <Button type="button" variant="secondary" disabled={running || loading} onClick={() => void search({ onlyIds: new Set(failures.map(({ item }) => item.id)) })}>Refresh and try again</Button>
              </div>
            )}
            {chosen.length > 0 && (
              <label>
                Type {confirmPhrase} to confirm
                <input autoComplete="off" spellCheck={false} value={phrase} disabled={running} onChange={(event) => setPhrase(event.target.value)} />
              </label>
            )}
          </>
        )}
        {running && <p className={own.progress} role="status">Selecting {Math.min(progress, chosen.length)} of {chosen.length}… Keep this page open until it finishes.</p>}
        <div className={styles.modalActions}>
          <Button variant="secondary" type="button" disabled={running} onClick={() => onOpenChange(false)}>Close</Button>
          <Button type="submit" disabled={running || loading || !chosen.length || phrase.trim().toUpperCase() !== confirmPhrase}>
            {running ? "Selecting…" : `Select ${chosen.length || ""} and email`.replace("  ", " ")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
