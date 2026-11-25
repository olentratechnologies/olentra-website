"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Github, Search, SlidersHorizontal, Star, Video } from "lucide-react";
import { AI_RECOMMENDATIONS, AiRecommendationBadge, Button, Modal, StatusBadge, formatDate } from "./DashboardUI";
import { CANDIDATE_SORTS, EMPTY_CANDIDATE_VIEW, activeFilterCount, countBy, viewCandidates } from "@/lib/intern/candidate-view.mjs";
import { SELECTABLE_FROM, SELECT_PATH, eligibleForSelection, parseMinScore, runBulkRequests } from "@/lib/intern/bulk.mjs";
import { fetchAllPages } from "@/lib/intern/application-export.mjs";
import styles from "./applicant.module.css";
import own from "./SelectByScoreDialog.module.css";
import BulkOfferForm from "./BulkOfferForm";

const DEFAULT_MIN_SCORE = "9";
const errorText = (error, fallback) => (typeof error === "string" ? error : error?.message || fallback);

/**
 * Finds every application at or above an AI score (across all pages, not
 * just the visible one) and selects them in one go. Each applicant moves
 * through Under Review and Shortlisted to Selected and gets one email.
 */
export default function SelectByScoreDialog({ open, onOpenChange, commands, data, programId = "all", trackLabel = "", notify, onDone }) {
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
  // After selecting, the same dialog can send these applicants the formal offer.
  const [stage, setStage] = useState("pick"); // pick → offerPrompt → offer
  const [selectedRows, setSelectedRows] = useState([]);

  // What the list shows (search, filters, sort). Ticks are kept in `excluded`, independent of the view.
  const [view, setView] = useState(EMPTY_CANDIDATE_VIEW);
  const [topN, setTopN] = useState("10");
  const score = parseMinScore(minScore);
  const chosen = (matches || []).filter((row) => !excluded.has(row.id));
  const confirmPhrase = `SELECT ${chosen.length}`;
  const shown = useMemo(() => viewCandidates(matches || [], view, (row) => !excluded.has(row.id)), [matches, view, excluded]);
  const shownChosen = shown.filter((row) => !excluded.has(row.id)).length;
  const filterCount = activeFilterCount(view);
  const statusCounts = useMemo(() => countBy(matches || [], "status"), [matches]);
  const recommendationCounts = useMemo(() => countBy(matches || [], "aiRecommendation"), [matches]);
  const setViewField = (field, value) => setView((current) => ({ ...current, [field]: value }));
  const toggleIn = (field, value) => setView((current) => ({ ...current, [field]: current[field].includes(value) ? current[field].filter((item) => item !== value) : [...current[field], value] }));
  // Bulk selection. "Shown" actions only touch the rows the current search and filters show.
  function updateExcluded(change) { setExcluded((current) => { const next = new Set(current); change(next); return next; }); setPhrase(""); }
  const selectShown = () => updateExcluded((next) => shown.forEach((row) => next.delete(row.id)));
  const deselectShown = () => updateExcluded((next) => shown.forEach((row) => next.add(row.id)));
  const invertShown = () => updateExcluded((next) => shown.forEach((row) => (next.has(row.id) ? next.delete(row.id) : next.add(row.id))));
  const selectEveryone = () => { setExcluded(new Set()); setPhrase(""); };
  const deselectEveryone = () => { setExcluded(new Set((matches || []).map((row) => row.id))); setPhrase(""); };
  function selectTop() {
    const count = Math.max(0, Math.floor(Number(topN) || 0));
    updateExcluded((next) => shown.forEach((row, index) => (index < count ? next.delete(row.id) : next.add(row.id))));
  }

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
    setStage("pick");
    setSelectedRows([]);
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
      setSelectedRows((current) => [...current, ...succeeded.map((row) => ({ ...row, status: "Selected" }))]);
      notify(`${succeeded.length} ${succeeded.length === 1 ? "applicant" : "applicants"} selected and emailed.${failed.length ? ` ${failed.length} could not be selected; see the details.` : ""}`);
      onDone?.();
      if (failed.length) {
        // Keep only the failed rows, so "Try again" picks up their latest versions.
        setMatches(failed.map(({ item }) => item));
        setExcluded(new Set());
        setPhrase("");
      } else if (succeeded.length) {
        setStage("offerPrompt");
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
      className={own.wide}
      onOpenChange={(next) => { if (!running) onOpenChange(next); }}
      title={stage === "offer" ? "Send the formal offer" : "Select applicants by AI score"}
      description={stage === "offer"
        ? "Everyone gets the same offer terms. Each student receives the “Your Olentra internship offer” email and accepts or declines in their portal before the deadline."
        : `Find every application${trackLabel ? ` for ${trackLabel}` : ""} at or above an AI score and select them together. Each applicant moves through Under review and Shortlisted to Selected, and gets one “You’re selected” email with a link to sign in to their portal. You can send them the formal offer right after.`}
    >
      {stage === "offer" ? (
        <BulkOfferForm rows={selectedRows} commands={commands} data={data} notify={notify} onDone={onDone} onClose={() => onOpenChange(false)} closeLabel="Not now" />
      ) : stage === "offerPrompt" ? (
        <div className={styles.modalForm}>
          <p className={own.summary}><span><strong>{selectedRows.length}</strong> {selectedRows.length === 1 ? "applicant" : "applicants"} selected and emailed.</span></p>
          <p className={own.note}>Send them the formal offer now? You choose one start date, stipend and response window for everyone; each student then accepts or declines in their portal.</p>
          <div className={styles.modalActions}>
            <Button variant="secondary" type="button" onClick={() => onOpenChange(false)}>Not now</Button>
            <Button type="button" onClick={() => setStage("offer")}>Send offers</Button>
          </div>
        </div>
      ) : (
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
              {matches.length > 0 && <small>Showing {shown.length}{shown.length !== matches.length ? ` of ${matches.length}` : ""}</small>}
            </p>
            {matches.length > 0 && (
              <>
                <div className={own.toolbar}>
                  <label className={own.searchBox}>
                    <Search size={15} aria-hidden="true" />
                    <input type="search" placeholder="Search name, email, college or skill" aria-label="Search matching applicants" value={view.query} disabled={running} onChange={(event) => setViewField("query", event.target.value)} />
                  </label>
                  <select aria-label="Sort applicants" value={view.sort} disabled={running} onChange={(event) => setViewField("sort", event.target.value)}>
                    {CANDIDATE_SORTS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                  </select>
                </div>
                <details className={own.filters}>
                  <summary><SlidersHorizontal size={14} aria-hidden="true" /> Filters{filterCount ? ` (${filterCount})` : ""}</summary>
                  <div className={own.filterBody}>
                    <div className={own.filterGroup}>
                      <span>Status</span>
                      <div className={own.chips}>
                        {SELECTABLE_FROM.filter((status) => statusCounts[status]).map((status) => (
                          <button type="button" key={status} aria-pressed={view.statuses.includes(status)} onClick={() => toggleIn("statuses", status)}>{status} <small>{statusCounts[status]}</small></button>
                        ))}
                      </div>
                    </div>
                    <div className={own.filterGroup}>
                      <span>AI recommendation</span>
                      <div className={own.chips}>
                        {AI_RECOMMENDATIONS.filter((value) => recommendationCounts[value]).map((value) => (
                          <button type="button" key={value} aria-pressed={view.recommendations.includes(value)} onClick={() => toggleIn("recommendations", value)}>{value} <small>{recommendationCounts[value]}</small></button>
                        ))}
                      </div>
                    </div>
                    <div className={own.filterGrid}>
                      <label>Maximum AI score<input type="number" min="0" max="10" step="0.1" placeholder="Any" value={view.maxScore} onChange={(event) => setViewField("maxScore", event.target.value)} /></label>
                      <label>Schedule<select value={view.schedule} onChange={(event) => setViewField("schedule", event.target.value)}><option value="all">Any</option><option value="full_time">Full-time</option><option value="part_time">Part-time</option></select></label>
                      <label>Intro video<select value={view.video} onChange={(event) => setViewField("video", event.target.value)}><option value="all">Any</option><option value="with">With video</option><option value="without">Without video</option></select></label>
                      <label>GitHub<select value={view.github} onChange={(event) => setViewField("github", event.target.value)}><option value="all">Any</option><option value="with">With GitHub</option><option value="without">Without GitHub</option></select></label>
                      <label>Show<select value={view.show} onChange={(event) => setViewField("show", event.target.value)}><option value="all">Everyone</option><option value="selected">Only ticked</option><option value="unselected">Only unticked</option></select></label>
                      <label className={own.check}><input type="checkbox" checked={view.bookmarked} onChange={(event) => setViewField("bookmarked", event.target.checked)} />Bookmarked only</label>
                    </div>
                    {filterCount > 0 && <button type="button" className={own.linkButton} onClick={() => setView((current) => ({ ...EMPTY_CANDIDATE_VIEW, query: current.query, sort: current.sort }))}>Clear filters</button>}
                  </div>
                </details>
                <div className={own.bulk} role="group" aria-label="Select applicants">
                  <label className={own.check}>
                    <input
                      type="checkbox"
                      aria-label="Select all shown applicants"
                      checked={shown.length > 0 && shownChosen === shown.length}
                      ref={(element) => { if (element) element.indeterminate = shownChosen > 0 && shownChosen < shown.length; }}
                      disabled={running || !shown.length}
                      onChange={(event) => (event.target.checked ? selectShown() : deselectShown())}
                    />
                    {shownChosen} of {shown.length} shown ticked
                  </label>
                  <div className={own.bulkActions}>
                    <button type="button" disabled={running || !shown.length} onClick={selectShown}>Select shown</button>
                    <button type="button" disabled={running || !shown.length} onClick={deselectShown}>Deselect shown</button>
                    <button type="button" disabled={running || !shown.length} onClick={invertShown}>Invert shown</button>
                    <button type="button" disabled={running} onClick={selectEveryone}>Select all {matches.length}</button>
                    <button type="button" disabled={running} onClick={deselectEveryone}>Deselect all</button>
                    <span className={own.topN}>
                      <button type="button" disabled={running || !shown.length} onClick={selectTop}>Keep top</button>
                      <input type="number" min="1" max={shown.length || 1} aria-label="How many of the shown applicants to keep" value={topN} onChange={(event) => setTopN(event.target.value)} />
                    </span>
                  </div>
                </div>
                {shown.length ? (
                  <ul className={own.list}>
                    {shown.map((row) => (
                      <li key={row.id} data-off={excluded.has(row.id)}>
                        <input type="checkbox" aria-label={`Include ${row.name}`} checked={!excluded.has(row.id)} disabled={running} onChange={() => toggleRow(row.id)} />
                        <span className={own.name} title={row.email}>
                          {row.name}<small>{row.email}</small>
                          <span className={own.meta}>
                            {[row.college, row.schedule === "full_time" ? "Full-time" : row.schedule === "part_time" ? "Part-time" : "", row.appliedOn ? `Applied ${formatDate(row.appliedOn)}` : ""].filter(Boolean).join(" · ")}
                            {(row.hasVideo || row.videoUrl) && <Video size={12} aria-label="Intro video" />}
                            {row.github && <Github size={12} aria-label="GitHub" />}
                            {row.bookmarked && <Star size={12} aria-label="Bookmarked" fill="currentColor" />}
                          </span>
                        </span>
                        <span className={own.rowEnd}>
                          <span className={own.score}>{row.aiScore.toFixed(1)}</span>
                          <AiRecommendationBadge application={row} />
                          <StatusBadge status={row.status} />
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={own.note}>No applicants match this search and these filters. {filterCount ? "Try clearing the filters." : ""}</p>
                )}
                {chosen.length > shownChosen && <p className={own.note}>{chosen.length - shownChosen} ticked {chosen.length - shownChosen === 1 ? "applicant is" : "applicants are"} hidden by the current search or filters and will still be selected.</p>}
              </>
            )}
            {unscored > 0 && <p className={own.note}>{unscored} {unscored === 1 ? "application has" : "applications have"} no AI score yet and {unscored === 1 ? "isn’t" : "aren’t"} included. Use “Score all unscored” first if you want them considered.</p>}
            {failures.length > 0 && (
              <div className={own.failures} role="alert">
                These applicants were not selected:
                <ul>{failures.map(({ item, error }) => <li key={item.id}>{item.name}: {error}</li>)}</ul>
                <Button type="button" variant="secondary" disabled={running || loading} onClick={() => void search({ onlyIds: new Set(failures.map(({ item }) => item.id)) })}>Refresh and try again</Button>
                {selectedRows.length > 0 && <Button type="button" variant="secondary" disabled={running || loading} onClick={() => setStage("offer")}>Skip these and send offers to the {selectedRows.length} selected</Button>}
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
      )}
    </Modal>
  );
}
