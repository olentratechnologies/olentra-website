"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, Flame } from "lucide-react";
import { useInternship } from "@/components/intern/InternshipProvider";
import { useInternQuery } from "../useInternQuery";
import { Button, Panel } from "./PortalUI";
import styles from "./portal.module.css";

const MOODS = [[1, "Rough"], [2, "Meh"], [3, "Okay"], [4, "Good"], [5, "Great"]];

/** This week's check-in for an active intern, with any reply and their streak. */
export default function WeeklyCheckin({ applicationId }) {
  const { commands, notify } = useInternship();
  const query = useInternQuery("checkin.list", { applicationId });
  const data = query.data;
  const [form, setForm] = useState({ done: "", blockers: "", mood: 0 });
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (data?.current) setForm({ done: data.current.done, blockers: data.current.blockers, mood: data.current.mood });
  }, [data?.current?.submittedOn]);
  if (!data) return null;
  const current = data.current;
  const showForm = !current || editing;
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await commands.submitCheckin(form);
      if (!result.ok) { notify(typeof result.error === "string" ? result.error : result.error?.message || "Couldn't send your check-in."); return; }
      notify("Check-in sent. Thanks!");
      setEditing(false);
      void query.refresh();
    } finally { setBusy(false); }
  }
  return (
    <Panel className={styles.sectionGap}>
      <div className={styles.panelHeader}>
        <h2><CalendarCheck size={18} aria-hidden="true" /> Weekly check-in</h2>
        {data.streak > 0 && <span className={styles.streak}><Flame size={14} aria-hidden="true" /> {data.streak}-week streak</span>}
      </div>
      {showForm ? (
        <form className={styles.form} onSubmit={submit}>
          <label className={styles.field}>What did you work on this week?<textarea required rows={3} maxLength={2000} value={form.done} onChange={(event) => setForm({ ...form, done: event.target.value })} /></label>
          <label className={styles.field}>Anything blocking you? (optional)<textarea rows={2} maxLength={2000} value={form.blockers} onChange={(event) => setForm({ ...form, blockers: event.target.value })} /></label>
          <fieldset className={styles.moodRow}>
            <legend>How did the week feel?</legend>
            {MOODS.map(([value, label]) => <button key={value} type="button" aria-pressed={form.mood === value} onClick={() => setForm({ ...form, mood: value })}>{label}</button>)}
          </fieldset>
          <div className={styles.formActions}>
            {current && <Button variant="ghost" onClick={() => setEditing(false)} disabled={busy}>Cancel</Button>}
            <Button type="submit" busy={busy} disabled={busy || !form.done.trim() || !form.mood}>{current ? "Update check-in" : "Send check-in"}</Button>
          </div>
        </form>
      ) : (
        <div className={styles.checkinSummary}>
          <p><strong>This week:</strong> {current.done}</p>
          {current.blockers && <p><strong>Blockers:</strong> {current.blockers}</p>}
          {current.reply ? <blockquote><strong>{current.repliedBy || "Your mentor"}:</strong> {current.reply}</blockquote> : <small>Sent. You'll be notified when someone replies.</small>}
          <Button variant="ghost" onClick={() => setEditing(true)}>Edit this week's check-in</Button>
        </div>
      )}
    </Panel>
  );
}
