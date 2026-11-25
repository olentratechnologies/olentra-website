"use client";

import { useEffect, useState } from "react";
import { TimerReset } from "lucide-react";
import { useSiteFeatures } from "@olentra/site-features/react";
import { Button, Modal } from "./DashboardUI";
import { deadlineTime, extensionLabel, formatDeadline, isDeadlinePassed, previewExtension } from "@/lib/intern/application-deadline.mjs";
import ui from "./pages.module.css";
import styles from "./settings.module.css";

const QUICK = [
  { amount: 12, unit: "hours", label: "+12 hours" },
  { amount: 1, unit: "days", label: "+1 day" },
  { amount: 2, unit: "days", label: "+2 days" },
  { amount: 7, unit: "days", label: "+7 days" },
];

/**
 * Extends (or reopens) the application window by some hours or days. Visitors
 * then see an "Applications extended" banner, plus a note that applications
 * received so far are under review.
 */
export default function ExtendApplications({ settings, commands, notify }) {
  const { features } = useSiteFeatures();
  const [amount, setAmount] = useState(2);
  const [unit, setUnit] = useState("days");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(timer); }, []);

  const current = settings.applicationDeadline;
  const closed = isDeadlinePassed(current, now);
  const preview = previewExtension(current, amount, unit, now);
  const extension = settings.deadlineExtension;
  const switchedOff = !settings.programEnabled || features?.applications === false || features?.internships === false;

  async function extend() {
    if (busy || preview.error) return;
    setBusy(true);
    try {
      const result = await commands.extendApplications(Number(amount), unit);
      if (!result.ok) { notify(typeof result.error === "string" ? result.error : result.error?.message || "Couldn’t extend applications."); return; }
      notify(`${preview.reopened ? "Applications reopened" : "Applications extended"} until ${formatDeadline(deadlineTime(result.data.applicationDeadline))}.`);
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.deadlineBlock} aria-labelledby="extend-heading">
      <div className={styles.deadlineHead}>
        <span><TimerReset size={18} /></span>
        <div>
          <h3 id="extend-heading" className={styles.subheading}>Extend applications</h3>
          <p className={styles.helper}>
            Give applicants more time without changing the deadline by hand. {closed ? "Applications are closed, so this reopens them from now." : "The extra time is added to the current deadline."} Visitors see an “Applications extended” banner on every page and a note that applications received so far are under review.
          </p>
        </div>
      </div>
      {deadlineTime(current) === null ? (
        <p className={styles.deadlineStatus} data-tone="idle">There’s no deadline, so applications stay open while the program is enabled. Set a deadline above to use extensions.</p>
      ) : (
        <>
          <p className={styles.deadlineStatus} data-tone={closed ? "error" : "ok"} role="status">
            {closed ? `Closed since ${formatDeadline(deadlineTime(current))}.` : `Open until ${formatDeadline(deadlineTime(current))}.`}
            {extension ? ` Currently extended by ${extensionLabel(extension)}.` : ""}
          </p>
          <div className={styles.deadlineControls}>
            <label className={ui.field}>Extend by<input type="number" min="1" max={unit === "hours" ? 720 : 60} step="1" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
            <label className={ui.field}>Unit<select value={unit} onChange={(event) => setUnit(event.target.value)}><option value="hours">Hours</option><option value="days">Days</option></select></label>
            <div className={styles.deadlinePresets} role="group" aria-label="Quick extensions">
              {QUICK.map((option) => (
                <button type="button" key={option.label} className={styles.presetChip} onClick={() => { setAmount(option.amount); setUnit(option.unit); }}>{option.label}</button>
              ))}
            </div>
          </div>
          <p className={styles.deadlineStatus} data-tone={preview.error ? "error" : "ok"} role="status">
            {preview.error || `New deadline: ${formatDeadline(preview.deadline)}${preview.reopened ? " · reopens applications now" : ""}.`}
          </p>
          {switchedOff && !preview.error && (
            <p className={styles.deadlineStatus} data-tone="error">
              Applications are also switched off{!settings.programEnabled ? " (Enable Internship Program, above)" : " in the company workspace’s site switches"}. Turn that on too, or the window stays closed.
            </p>
          )}
          <div>
            <Button type="button" disabled={Boolean(preview.error) || busy} onClick={() => setConfirming(true)}>
              <TimerReset size={15} /> {closed ? "Reopen applications" : "Extend applications"}
            </Button>
          </div>
        </>
      )}
      <Modal
        open={confirming}
        onOpenChange={(open) => { if (!busy) setConfirming(open); }}
        title={closed ? `Reopen applications for ${extensionLabel({ amount, unit })}?` : `Extend applications by ${extensionLabel({ amount, unit })}?`}
        description={preview.error ? "" : `Applications will be open until ${formatDeadline(preview.deadline)}. Every page of the website shows an “Applications extended” bar, and the careers page shows a banner with the new deadline and a note that applications received so far are under review. Staff get a notification.`}
      >
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
          <Button variant="secondary" type="button" disabled={busy} onClick={() => setConfirming(false)}>Cancel</Button>
          <Button type="button" disabled={busy || Boolean(preview.error)} onClick={() => void extend()}>{busy ? "Saving…" : closed ? "Reopen applications" : "Extend applications"}</Button>
        </div>
      </Modal>
    </section>
  );
}
