"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, FileText, Search } from "lucide-react";
import { Button } from "./DashboardUI";
import { ScheduleBadge } from "./ScheduleSplit";
import { completionDate, displayDate, durationLabel, civilToday } from "@/lib/intern/schedule.mjs";
import { decisionDeadline, endOfDayIst, formatDeadline, maxOpenDays, normalizeLeadDays } from "@/lib/intern/offer-policy.mjs";
import { runBulk } from "@/lib/intern/bulk.mjs";
import { describeApplicants } from "@/lib/intern/schedule-split.mjs";
import { OFFER_KINDS, confirmPhraseFor, confirmsPhrase, earliestStartFor, offerKind, offerTerms, previewParams, termsProblem } from "@/lib/intern/offer-wizard.mjs";
import { buildOfferLetterPdfBytes } from "@/lib/intern/offer-letter-pdf.js";
import styles from "./applicant.module.css";
import own from "./SelectByScoreDialog.module.css";
import wiz from "./offer-wizard.module.css";

const OPEN_FOR_OPTIONS = [1, 2, 3, 5, 7, 10, 14, 30];
const DEFAULT_MESSAGES = {
  formal: "We’re excited to welcome you to the Olentra internship program. Review your offer and take the next step in your journey.",
  instant: "We’re excited to welcome you to the Olentra internship program. Activate your portal and accept your offer to get started.",
  direct: "Welcome to the Olentra internship program! We’re glad you’re joining us.",
};
const STEPS = [
  { id: "who", label: "Applicants" },
  { id: "kind", label: "Offer type" },
  { id: "terms", label: "Terms" },
  { id: "review", label: "Review & send" },
];
const errorText = (error, fallback) => (typeof error === "string" ? error : error?.message || fallback);

/**
 * Sends offers to several applicants at once, step by step with Back at every
 * step: who → offer type (formal, instant or direct enrolment) → terms → review
 * (with a letter preview) → send. Each applicant goes through the same command
 * as the applicant page, so checks, records, timeline entries and emails match.
 */
export default function BulkOfferForm({ rows, commands, data, notify, onDone, onClose, onBack, closeLabel = "Cancel", schedule }) {
  const settings = data?.settings || {};
  const programs = data?.programs || [];
  const maxStipend = programs.find((program) => program.id === rows[0]?.programId)?.stipend ?? 0;
  const leadDays = normalizeLeadDays(settings.onboardingLeadDays);
  const today = civilToday();

  const [step, setStep] = useState("who");
  const [people, setPeople] = useState(rows);
  const [chosenIds, setChosenIds] = useState(() => new Set(rows.map((row) => row.id)));
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("formal");
  const [startOn, setStartOn] = useState("");
  const [stipend, setStipend] = useState(maxStipend);
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [messages, setMessages] = useState(DEFAULT_MESSAGES);
  const [agreementNote, setAgreementNote] = useState("");
  const [preview, setPreview] = useState(null);
  const [checking, setChecking] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [letterFor, setLetterFor] = useState("");
  const [letterUrl, setLetterUrl] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null); // { succeeded, failed } after sending

  const message = messages[kind];
  const chosen = useMemo(() => people.filter((row) => chosenIds.has(row.id)), [people, chosenIds]);
  const shown = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return terms.length ? people.filter((row) => terms.every((term) => `${row.name} ${row.email} ${row.college || ""}`.toLowerCase().includes(term))) : people;
  }, [people, query]);
  const earliest = earliestStartFor(kind, today, leadDays);
  const longestWindow = startOn ? maxOpenDays(startOn, today, leadDays) : 30;
  const endOn = useMemo(() => { try { return startOn ? completionDate(startOn, settings.durationSpec || settings.duration) : ""; } catch { return ""; } }, [startOn, settings.durationSpec, settings.duration]);
  const problem = termsProblem({ kind, startOn, stipend, maxStipend, message, agreementNote, today, leadDays });
  const mixed = new Set(chosen.map((row) => row.schedule).filter(Boolean)).size > 1;

  // Changing anything that affects the offer needs a fresh server check.
  useEffect(() => { setPreview(null); setPhrase(""); }, [kind, startOn, stipend, expiresInDays, message, agreementNote, chosenIds]);
  useEffect(() => {
    if (kind === "formal" && startOn && longestWindow >= 1 && expiresInDays > longestWindow) setExpiresInDays([...OPEN_FOR_OPTIONS].reverse().find((days) => days <= longestWindow) || 1);
  }, [kind, startOn, longestWindow, expiresInDays]);
  useEffect(() => () => { if (letterUrl) URL.revokeObjectURL(letterUrl); }, [letterUrl]);

  function toggle(id) { setChosenIds((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }
  const setShown = (on) => setChosenIds((current) => { const next = new Set(current); shown.forEach((row) => (on ? next.add(row.id) : next.delete(row.id))); return next; });

  async function checkAndReview() {
    if (checking || problem || !chosen.length) return;
    setChecking(true);
    try {
      // The schedule is the same for everyone, so one server check covers the batch.
      let lastError = "";
      for (const row of chosen.slice(0, 5)) {
        const reply = await commands.previewOffer(previewParams(kind, row.id, startOn, expiresInDays));
        if (reply?.ok) { setPreview(reply.data); setLetterFor(chosen[0].id); setLetterUrl(""); setStep("review"); return; }
        lastError = errorText(reply?.error, "Couldn’t check the offer schedule.");
      }
      notify(lastError);
    } finally {
      setChecking(false);
    }
  }

  function showLetter() {
    const row = chosen.find((item) => item.id === letterFor) || chosen[0];
    if (!row || !preview) return;
    const bytes = buildOfferLetterPdfBytes({
      name: row.name, email: row.email, college: row.college, program: row.program,
      startOn: preview.startOn, endOn: preview.endOn, stipend: Number(stipend), stipendPeriod: "month",
      applicationId: row.id, durationLabel: preview.durationLabel, offerVersion: 1, issueDate: new Date().toISOString(),
    });
    if (letterUrl) URL.revokeObjectURL(letterUrl);
    setLetterUrl(URL.createObjectURL(new Blob([bytes], { type: "application/pdf" })));
  }

  async function send(event) {
    event.preventDefault();
    if (running || !preview || !confirmsPhrase(kind, phrase, chosen.length)) return;
    setRunning(true);
    setProgress(0);
    try {
      const terms = offerTerms(kind, preview, { stipend, message, expiresInDays, agreementNote });
      const outcome = await runBulk(chosen, async (row) => {
        try { return kind === "direct" ? await commands.enrollDirect(row.id, terms) : await commands.sendOffer(row.id, terms); }
        finally { setProgress((value) => value + 1); }
      }, 3);
      setResult(outcome);
      notify(`${outcome.succeeded.length} ${kind === "direct" ? "enrolled" : `${offerKind(kind).title.toLowerCase()}${outcome.succeeded.length === 1 ? "" : "s"} sent`}.${outcome.failed.length ? ` ${outcome.failed.length} not done; see the details.` : ""}`);
      onDone?.(outcome.succeeded);
    } finally {
      setRunning(false);
    }
  }

  function retryFailed() {
    const failedRows = result.failed.map(({ item }) => item);
    setPeople(failedRows);
    setChosenIds(new Set(failedRows.map((row) => row.id)));
    setResult(null);
    setStep("terms");
  }

  if (result) {
    const offersHref = `/intern/dashboard/offers${schedule && schedule !== "all" ? `?schedule=${schedule}` : ""}`;
    return (
      <div className={styles.modalForm}>
        <p className={own.summary}>
          <span><Check size={16} aria-hidden="true" /> <strong>{describeApplicants(result.succeeded)}</strong> {kind === "direct" ? "enrolled" : `sent a ${offerKind(kind).title.toLowerCase()}`}.</span>
        </p>
        <p className={own.note}>{offerKind(kind).email} Each timeline shows the offer and the email.</p>
        {result.failed.length > 0 && (
          <div className={own.failures} role="alert">
            {result.failed.length} not done:
            <ul>{result.failed.map(({ item, error }) => <li key={item.id}>{item.name}: {error}</li>)}</ul>
            <Button type="button" variant="secondary" onClick={retryFailed}>Retry these {result.failed.length}</Button>
          </div>
        )}
        <div className={styles.modalActions}>
          <Link href={offersHref} className={wiz.textLink}>View in Offers</Link>
          <Button type="button" onClick={onClose}>Done</Button>
        </div>
      </div>
    );
  }

  const stepIndex = STEPS.findIndex((item) => item.id === step);
  const back = () => (stepIndex === 0 ? (onBack ? onBack() : onClose()) : setStep(STEPS[stepIndex - 1].id));

  return (
    <form className={`${styles.modalForm} ${own.modal}`} onSubmit={step === "review" ? send : (event) => { event.preventDefault(); }}>
      <ol className={wiz.steps} aria-label="Steps">
        {STEPS.map((item, index) => (
          <li key={item.id} data-state={index < stepIndex ? "done" : index === stepIndex ? "current" : "next"}>
            <span>{index < stepIndex ? <Check size={12} /> : index + 1}</span>{item.label}
          </li>
        ))}
      </ol>

      {step === "who" && (
        <>
          <p className={own.summary}><span><strong>{chosen.length}</strong> of {people.length} {people.length === 1 ? "applicant" : "applicants"} will get an offer</span><small>{describeApplicants(chosen)}</small></p>
          <div className={own.toolbar}>
            <label className={own.searchBox}><Search size={15} aria-hidden="true" /><input type="search" placeholder="Search name, email or college" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search applicants" /></label>
          </div>
          <div className={own.bulkActions}>
            <button type="button" onClick={() => setShown(true)}>Select {query ? "shown" : "all"} ({shown.length})</button>
            <button type="button" onClick={() => setShown(false)}>Deselect {query ? "shown" : "all"}</button>
          </div>
          <ul className={own.list}>
            {shown.map((row) => (
              <li key={row.id} data-off={!chosenIds.has(row.id)}>
                <input type="checkbox" aria-label={`Include ${row.name}`} checked={chosenIds.has(row.id)} onChange={() => toggle(row.id)} />
                <span className={own.name} title={row.email}>{row.name}<small>{row.email}</small></span>
                <span className={own.rowEnd}><ScheduleBadge schedule={row.schedule} />{typeof row.aiScore === "number" && <span className={own.score}>{row.aiScore.toFixed(1)}</span>}</span>
              </li>
            ))}
          </ul>
          {mixed && <p className={styles.fieldError} role="alert">This batch mixes full-time and part-time applicants. They’ll all get the same terms; to keep them apart, send from the Full-time and Part-time views separately.</p>}
        </>
      )}

      {step === "kind" && (
        <fieldset className={wiz.kinds}>
          <legend>How is this internship being given to {describeApplicants(chosen)}?</legend>
          {OFFER_KINDS.map((option) => (
            <label key={option.id} className={wiz.kind} data-selected={kind === option.id}>
              <input type="radio" name="offer-kind" value={option.id} checked={kind === option.id} onChange={() => setKind(option.id)} />
              <span><strong>{option.title}</strong><small>{option.summary}</small><small className={wiz.email}>Email: {option.email}</small></span>
            </label>
          ))}
        </fieldset>
      )}

      {step === "terms" && (
        <>
          <p className={own.summary}><span><strong>{offerKind(kind).title}</strong> for {describeApplicants(chosen)}</span></p>
          <label>
            Start date (same for everyone)
            <input type="date" required min={earliest} value={startOn} onChange={(event) => setStartOn(event.target.value)} />
          </label>
          <p className={own.note}>
            {endOn ? `Ends ${displayDate(endOn)} (${durationLabel(settings.durationSpec || settings.duration)}). ` : ""}
            {kind === "formal" && `Students must respond by ${formatDeadline(decisionDeadline(new Date().toISOString(), Number(expiresInDays)))}, at least ${leadDays} days before the start.`}
            {kind === "instant" && `Students must accept by ${startOn ? formatDeadline(endOfDayIst(startOn)) : "the end of the start day"}.`}
            {kind === "direct" && "No decision step: they become active interns now."}
          </p>
          <label>
            Monthly stipend (₹), up to ₹{Number(maxStipend).toLocaleString("en-IN")}
            <input type="number" required min="0" max={maxStipend} step="1" value={stipend} onChange={(event) => setStipend(event.target.value)} />
          </label>
          {kind === "formal" && (
            <label>
              Open for
              <select value={expiresInDays} onChange={(event) => setExpiresInDays(Number(event.target.value))}>
                {OPEN_FOR_OPTIONS.map((days) => <option key={days} value={days} disabled={Boolean(startOn) && days > longestWindow}>{days === 1 ? "1 day" : `${days} days`}</option>)}
              </select>
            </label>
          )}
          {kind === "direct" && (
            <label>
              How did these students agree?
              <textarea rows={2} maxLength={500} placeholder="e.g. Agreed in person at the campus drive on 21 Nov" value={agreementNote} onChange={(event) => setAgreementNote(event.target.value)} />
            </label>
          )}
          <label>
            Welcome message
            <textarea rows={3} maxLength={2000} value={message} onChange={(event) => setMessages((current) => ({ ...current, [kind]: event.target.value }))} />
          </label>
          {problem && startOn && <p className={styles.fieldError} role="alert">{problem}</p>}
        </>
      )}

      {step === "review" && preview && (
        <>
          <div className={wiz.reviewCard} role="status">
            <strong>{offerKind(kind).title} · {describeApplicants(chosen)}</strong>
            <dl>
              <div><dt>Internship</dt><dd>{preview.durationLabel} · {displayDate(preview.startOn)} → {displayDate(preview.endOn)}</dd></div>
              <div><dt>Stipend</dt><dd>{Number(stipend) ? `₹${Number(stipend).toLocaleString("en-IN")}/month` : "Unpaid"}</dd></div>
              <div><dt>{kind === "direct" ? "Decision" : "Respond by"}</dt><dd>{kind === "direct" ? "None: enrolled now" : formatDeadline(preview.expiresOn)}</dd></div>
              <div><dt>Email</dt><dd>{offerKind(kind).email}</dd></div>
              {kind === "direct" && <div><dt>Agreement</dt><dd>{agreementNote.trim()}</dd></div>}
            </dl>
          </div>
          <div className={wiz.letterRow}>
            <label>
              Preview the offer letter for
              <select value={letterFor} onChange={(event) => { setLetterFor(event.target.value); setLetterUrl(""); }}>
                {chosen.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </select>
            </label>
            <Button type="button" variant="secondary" onClick={showLetter}><FileText size={14} /> Preview letter</Button>
          </div>
          {letterUrl && <iframe className={wiz.letter} src={letterUrl} title="Offer letter preview" />}
          <details className={own.filters}>
            <summary>Everyone in this batch ({chosen.length})</summary>
            <ul className={wiz.names}>{chosen.map((row) => <li key={row.id}>{row.name} <ScheduleBadge schedule={row.schedule} /></li>)}</ul>
          </details>
          <label>
            Type {confirmPhraseFor(kind, chosen.length)} to {kind === "direct" ? "enrol" : "send offers to"} {describeApplicants(chosen)}
            <input autoComplete="off" spellCheck={false} value={phrase} disabled={running} onChange={(event) => setPhrase(event.target.value)} />
          </label>
        </>
      )}

      {running && <p className={own.progress} role="status">{kind === "direct" ? "Enrolling" : "Sending"} {Math.min(progress, chosen.length)} of {chosen.length}… Keep this page open until it finishes.</p>}

      <div className={styles.modalActions}>
        <Button variant="secondary" type="button" disabled={running} onClick={stepIndex === 0 && !onBack ? onClose : back}>
          {stepIndex === 0 && !onBack ? closeLabel : <><ArrowLeft size={14} /> Back</>}
        </Button>
        {step === "who" && <Button type="button" disabled={!chosen.length} onClick={() => setStep("kind")}>Next <ArrowRight size={14} /></Button>}
        {step === "kind" && <Button type="button" onClick={() => { if (!startOn || startOn < earliestStartFor(kind, today, leadDays)) setStartOn(earliestStartFor(kind, today, leadDays)); setStep("terms"); }}>Next <ArrowRight size={14} /></Button>}
        {step === "terms" && <Button type="button" disabled={checking || Boolean(problem)} onClick={() => void checkAndReview()}>{checking ? "Checking…" : <>Review <ArrowRight size={14} /></>}</Button>}
        {step === "review" && (
          <Button type="submit" disabled={running || !confirmsPhrase(kind, phrase, chosen.length)}>
            {running ? (kind === "direct" ? "Enrolling…" : "Sending…") : kind === "direct" ? `Enrol ${chosen.length}` : `Send ${chosen.length} ${chosen.length === 1 ? "offer" : "offers"}`}
          </Button>
        )}
      </div>
    </form>
  );
}
