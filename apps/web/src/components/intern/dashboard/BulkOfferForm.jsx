"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "./DashboardUI";
import { completionDate, displayDate, durationLabel, civilToday } from "@/lib/intern/schedule.mjs";
import { decisionDeadline, earliestStartDate, formatDeadline, maxOpenDays, normalizeLeadDays } from "@/lib/intern/offer-policy.mjs";
import { confirmsOffers, offerConfirmPhrase, runBulk } from "@/lib/intern/bulk.mjs";
import styles from "./applicant.module.css";
import own from "./SelectByScoreDialog.module.css";

const OPEN_FOR_OPTIONS = [1, 2, 3, 5, 7, 10, 14, 30];
const DEFAULT_MESSAGE = "We’re excited to welcome you to the Olentra internship program. Review your offer and take the next step in your journey.";
const errorText = (error, fallback) => (typeof error === "string" ? error : error?.message || fallback);

/**
 * Sends the same formal offer (start date, stipend, response window, message)
 * to several Selected applicants. Each offer goes through the normal
 * single-offer command, so validation, records and the offer email are
 * exactly what "Send offer" on an applicant's page does.
 */
export default function BulkOfferForm({ rows, commands, data, notify, onDone, onClose, closeLabel = "Cancel" }) {
  const settings = data?.settings || {};
  const programs = data?.programs || [];
  const maxStipend = programs.find((program) => program.id === rows[0]?.programId)?.stipend ?? 0;
  const leadDays = normalizeLeadDays(settings.onboardingLeadDays);
  const today = civilToday();
  const earliestStart = earliestStartDate(today, leadDays);

  const [pending, setPending] = useState(rows);
  const [startOn, setStartOn] = useState("");
  const [stipend, setStipend] = useState(maxStipend);
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [preview, setPreview] = useState(null);
  const [reviewing, setReviewing] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failures, setFailures] = useState([]);
  const [sentCount, setSentCount] = useState(0);

  const longestWindow = startOn ? maxOpenDays(startOn, today, leadDays) : 30;
  const startTooSoon = Boolean(startOn) && startOn < earliestStart;
  const endOn = useMemo(() => {
    try { return startOn ? completionDate(startOn, settings.durationSpec || settings.duration) : ""; } catch { return ""; }
  }, [startOn, settings.durationSpec, settings.duration]);
  const stipendValue = Number(stipend);
  const stipendInvalid = !Number.isSafeInteger(stipendValue) || stipendValue < 0 || stipendValue > maxStipend;

  // Keep "Open for" inside what the start date allows, and make any change need a fresh review.
  useEffect(() => {
    if (startOn && longestWindow >= 1 && expiresInDays > longestWindow) {
      setExpiresInDays([...OPEN_FOR_OPTIONS].reverse().find((days) => days <= longestWindow) || 1);
    }
  }, [startOn, longestWindow, expiresInDays]);
  useEffect(() => { setPreview(null); setPhrase(""); }, [startOn, stipend, expiresInDays, message]);

  async function review(event) {
    event.preventDefault();
    if (reviewing || running || !pending.length || !startOn || startTooSoon || stipendInvalid || !message.trim()) return;
    setReviewing(true);
    try {
      // The schedule is the same for everyone, so one preview covers the batch.
      // Try a few applicants in case the first one changed meanwhile.
      let lastError = "";
      for (const row of pending.slice(0, 5)) {
        const result = await commands.previewOffer({ applicationId: row.id, startOn, expiresInDays: Number(expiresInDays) });
        if (result?.ok) { setPreview(result.data); return; }
        lastError = errorText(result?.error, "Couldn't check the offer schedule.");
      }
      notify(lastError);
    } finally {
      setReviewing(false);
    }
  }

  async function send(event) {
    event.preventDefault();
    if (running || !preview || !confirmsOffers(phrase, pending.length)) return;
    setRunning(true);
    setProgress(0);
    setFailures([]);
    try {
      const terms = {
        startOn: preview.startOn,
        endOn: preview.endOn,
        configRevision: preview.configRevision,
        stipend: stipendValue,
        expiresInDays: Number(expiresInDays),
        message: message.trim(),
      };
      const { succeeded, failed } = await runBulk(pending, async (row) => {
        try { return await commands.sendOffer(row.id, terms); }
        finally { setProgress((value) => value + 1); }
      }, 3);
      setSentCount((value) => value + succeeded.length);
      setFailures(failed);
      notify(`${succeeded.length} ${succeeded.length === 1 ? "offer" : "offers"} sent.${failed.length ? ` ${failed.length} not sent; see the details.` : ""}`);
      onDone?.(succeeded);
      // Failed rows stay pending; a retry reviews the schedule again first.
      setPending(failed.map(({ item }) => item));
      setPreview(null);
      setPhrase("");
    } finally {
      setRunning(false);
    }
  }

  if (!pending.length && sentCount > 0) {
    return (
      <div className={styles.modalForm}>
        <p className={own.summary}><span><strong>{sentCount}</strong> {sentCount === 1 ? "offer" : "offers"} sent.</span></p>
        <p className={own.note}>Each student got the “Your Olentra internship offer” email and can accept or decline in their portal. Their timelines show “Offer sent” and the email. Track responses from each applicant’s page or with “Remind about offers”.</p>
        <div className={styles.modalActions}><Button type="button" onClick={onClose}>Done</Button></div>
      </div>
    );
  }

  return (
    <form className={`${styles.modalForm} ${own.modal}`} onSubmit={preview ? send : review}>
      <p className={own.summary}>
        <span><strong>{pending.length}</strong> {pending.length === 1 ? "applicant" : "applicants"} will get the formal offer</span>
        {sentCount > 0 && <small>{sentCount} already sent</small>}
      </p>
      {failures.length > 0 && (
        <div className={own.failures} role="alert">
          These offers were not sent:
          <ul>{failures.map(({ item, error }) => <li key={item.id}>{item.name}: {error}</li>)}</ul>
          Review the schedule below to try them again.
        </div>
      )}
      <label>
        Start date (same for everyone)
        <input type="date" required min={earliestStart} value={startOn} disabled={running} aria-invalid={startTooSoon || undefined} onChange={(event) => setStartOn(event.target.value)} />
      </label>
      {startTooSoon && <p className={styles.fieldError} role="alert">Offers must close {leadDays} days before the internship starts, so choose {displayDate(earliestStart)} or later.</p>}
      <label>
        Monthly stipend (₹), up to ₹{maxStipend.toLocaleString("en-IN")}
        <input type="number" required min="0" max={maxStipend} step="1" value={stipend} disabled={running} aria-invalid={stipendInvalid || undefined} onChange={(event) => setStipend(event.target.value)} />
      </label>
      <label>
        Open for
        <select value={expiresInDays} disabled={running} onChange={(event) => setExpiresInDays(Number(event.target.value))}>
          {OPEN_FOR_OPTIONS.map((days) => <option key={days} value={days} disabled={Boolean(startOn) && days > longestWindow}>{days === 1 ? "1 day" : `${days} days`}</option>)}
        </select>
      </label>
      <p className={own.note}>
        {endOn ? `Ends ${displayDate(endOn)} (${durationLabel(settings.durationSpec || settings.duration)}). ` : ""}
        Students must respond by {formatDeadline(decisionDeadline(new Date().toISOString(), Number(expiresInDays)))}.
      </p>
      <label>
        Welcome message
        <textarea rows={3} maxLength={2000} required value={message} disabled={running} onChange={(event) => setMessage(event.target.value)} />
      </label>

      {preview && (
        <>
          <div className={own.failures} style={{ borderColor: "var(--ad-border-strong, #7aafff)" }} role="status">
            <strong>Check before sending</strong>
            <p className={own.note}>
              {pending.length} offers · {preview.durationLabel} · {displayDate(preview.startOn)} to {displayDate(preview.endOn)} · ₹{stipendValue.toLocaleString("en-IN")}/month · respond by {formatDeadline(preview.expiresOn)}.
              Each student gets the “Your Olentra internship offer” email and accepts or declines in their portal.
            </p>
          </div>
          <label>
            Type {offerConfirmPhrase(pending.length)} to confirm
            <input autoComplete="off" spellCheck={false} value={phrase} disabled={running} onChange={(event) => setPhrase(event.target.value)} />
          </label>
        </>
      )}
      {running && <p className={own.progress} role="status">Sending {Math.min(progress, pending.length)} of {pending.length}… Keep this page open until it finishes.</p>}
      <div className={styles.modalActions}>
        <Button variant="secondary" type="button" disabled={running} onClick={onClose}>{closeLabel}</Button>
        {preview ? (
          <Button type="submit" disabled={running || !confirmsOffers(phrase, pending.length)}>{running ? "Sending…" : `Send ${pending.length} ${pending.length === 1 ? "offer" : "offers"}`}</Button>
        ) : (
          <Button type="submit" disabled={reviewing || running || !startOn || startTooSoon || stipendInvalid}>{reviewing ? "Checking…" : "Review offer"}</Button>
        )}
      </div>
    </form>
  );
}
