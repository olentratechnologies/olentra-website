"use client";
import { useEffect, useState } from "react";
import { Send, UserCheck } from "lucide-react";
import { civilToday, completionDate, displayDate, durationLabel } from "@/lib/intern/schedule.mjs";
import { burstFrom } from "@/lib/confetti.mjs";
import { endOfDayIst, formatDeadline } from "@/lib/intern/offer-policy.mjs";
import { Button } from "./DashboardUI";
import styles from "./company-workflow.module.css";

const DEFAULT_MESSAGE = "Welcome to the Olentra internship program! We’re glad you’re joining us.";

/**
 * Two quick routes that share one form:
 * - "instant": staff pick the start date; the student activates their portal and accepts
 *   or declines by the end of that day. Accepting makes them an intern at once.
 * - "direct": the student already agreed (in person or on a call). The offer is recorded
 *   as accepted on their behalf and they become an intern at once.
 */
export default function DirectEnrolForm({ application, settings, maxStipend, commands, notify, mode = "direct" }) {
  const instant = mode === "instant";
  const today = civilToday();
  const [startOn, setStartOn] = useState(today);
  const [stipend, setStipend] = useState(maxStipend ?? 0);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [agreementNote, setAgreementNote] = useState("");
  const [exception, setException] = useState(false);
  const [quantity, setQuantity] = useState(1), [unit, setUnit] = useState("months"), [reason, setReason] = useState("");
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setPreview(null); }, [startOn, exception, quantity, unit, reason]);
  useEffect(() => { setStipend(maxStipend ?? 0); }, [maxStipend]);
  const override = exception ? { durationOverride: { quantity: Number(quantity), unit }, reason } : {};
  let endOn = "";
  try { endOn = completionDate(startOn, exception ? { quantity: Number(quantity), unit } : settings.durationSpec || settings.duration); } catch { /* shown once a valid date is chosen */ }

  async function submit(event) {
    event.preventDefault();
    const trigger = event.nativeEvent?.submitter || event.currentTarget;
    if (busy) return;
    if (startOn < today) { notify("Choose today or a later start date."); return; }
    if (!instant && agreementNote.trim().length < 5) { notify("Record how and when the student agreed to the internship."); return; }
    setBusy(true);
    try {
      if (!preview) {
        const result = await commands.previewOffer({ applicationId: application.id, startOn, ...(instant ? { route: "instant" } : { direct: true }), ...override });
        if (!result.ok) { notify(result.error); return; }
        setPreview(result.data);
        return;
      }
      if (!window.confirm(instant
        ? `Send ${application.name} an instant offer starting ${displayDate(preview.startOn)}? They’ll get a portal activation email and can accept until ${formatDeadline(preview.expiresOn)}.`
        : `${application.name} becomes an active intern starting ${displayDate(preview.startOn)}. They’ll get their portal access and offer letter by email. This can’t be undone from here.`)) return;
      const terms = { ...preview, ...override, stipend: Number(stipend), message: message.trim() };
      const result = instant
        ? await commands.sendOffer(application.id, { ...terms, route: "instant" })
        : await commands.enrollDirect(application.id, { ...terms, agreementNote: agreementNote.trim() });
      if (!result?.ok) { notify(result?.error || (instant ? "The offer couldn’t be sent. Please try again." : "The applicant couldn’t be enrolled. Please try again.")); return; }
      notify(instant
        ? `Instant offer sent. ${application.name} can activate their portal and respond until ${formatDeadline(preview.expiresOn)}.`
        : `${application.name} is now an active intern. Their welcome email and offer letter are on the way.`);
      burstFrom(trigger, { count: 60 });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.formGrid}>
        <label>
          Start date
          <input type="date" required min={today} value={startOn} onChange={event => setStartOn(event.target.value)} />
        </label>
        <label>
          End date
          <input type="date" readOnly value={endOn} aria-describedby="direct-duration" />
        </label>
        <label className={styles.fullWidth}>
          Monthly stipend (₹)
          <input type="number" required min="0" max={maxStipend ?? 0} value={stipend} onChange={event => setStipend(event.target.value)} />
        </label>
        {!instant && <label className={styles.fullWidth}>
          How did the student agree?
          <textarea required rows={2} maxLength={500} placeholder="e.g. Agreed in person at the campus drive on 21 Nov" value={agreementNote} onChange={event => setAgreementNote(event.target.value)} />
        </label>}
        <label className={styles.fullWidth}>
          Welcome message
          <textarea rows={3} maxLength={2000} value={message} onChange={event => setMessage(event.target.value)} />
        </label>
      </div>
      <label><input type="checkbox" checked={exception} onChange={event => setException(event.target.checked)} />Use a duration exception for this student</label>
      {exception && <div className={styles.formGrid}><label>Duration quantity<input type="number" min="1" step="1" required value={quantity} onChange={event => setQuantity(event.target.value)} /></label><label>Unit<select value={unit} onChange={event => setUnit(event.target.value)}><option value="months">Calendar months</option><option value="weeks">Weeks</option><option value="days">Days</option></select></label><label>Reason for exception<textarea required value={reason} onChange={event => setReason(event.target.value)} /></label></div>}
      <p id="direct-duration" className={styles.hint}>Duration: {durationLabel(exception ? { quantity: Number(quantity), unit } : settings.durationSpec || settings.duration)}. {instant
        ? `The student activates their portal from the email and must accept or decline by ${startOn ? formatDeadline(endOfDayIst(startOn)) : "the end of the start date"}. Accepting makes them an intern straight away; onboarding documents follow.`
        : "No decision deadline: the offer is recorded as accepted today, and the student uploads onboarding documents after joining."}</p>
      {preview && <div role="status"><strong>{instant ? "Confirm before sending" : "Confirm before enrolling"}</strong><p>{preview.durationLabel} · {displayDate(preview.startOn)} to {displayDate(preview.endOn)}</p>{instant && preview.expiresOn && <p>Respond by {formatDeadline(preview.expiresOn)}.</p>}</div>}
      <div className={styles.formActions}>
        <Button type="submit" disabled={busy}>
          {instant ? <Send size={15} /> : <UserCheck size={15} />}
          {busy ? "Working…" : instant ? (preview ? "Send instant offer" : "Review offer") : (preview ? "Confirm and enrol now" : "Review enrolment")}
        </Button>
      </div>
    </form>
  );
}
