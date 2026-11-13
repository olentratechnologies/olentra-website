"use client";

import { useState } from "react";
import { HeartHandshake } from "lucide-react";
import { useInternship } from "@/components/intern/InternshipProvider";
import { useInternQuery } from "../useInternQuery";
import { Button, Panel } from "./PortalUI";
import styles from "./portal.module.css";

function Stars({ label, value, onChange }) {
  return (
    <fieldset className={styles.moodRow}>
      <legend>{label}</legend>
      {[1, 2, 3, 4, 5].map((number) => <button key={number} type="button" aria-pressed={value === number} aria-label={`${number} out of 5`} onClick={() => onChange(number)}>{number}</button>)}
    </fieldset>
  );
}

/** One-time exit feedback once the internship is completed. */
export default function ExitFeedback() {
  const { commands, notify } = useInternship();
  const query = useInternQuery("feedback.mine", {});
  const [form, setForm] = useState({ programRating: 0, mentorRating: 0, recommend: null, comment: "" });
  const [busy, setBusy] = useState(false);
  const state = query.data;
  if (!state?.eligible) return null;
  if (state.submitted) return <Panel className={styles.sectionGap}><h2><HeartHandshake size={18} aria-hidden="true" /> Thank you for your feedback</h2><p>It helps us make the program better for the next interns.</p></Panel>;
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await commands.submitFeedback({ ...form, recommend: form.recommend === true });
      if (!result.ok) { notify(typeof result.error === "string" ? result.error : result.error?.message || "Couldn't send your feedback."); return; }
      notify("Thanks for sharing your feedback!");
      void query.refresh();
    } finally { setBusy(false); }
  }
  return (
    <Panel className={styles.sectionGap}>
      <h2><HeartHandshake size={18} aria-hidden="true" /> How was your internship?</h2>
      <p>A minute of honest feedback helps us improve. Your comments are seen only by Olentra’s internship admins.</p>
      <form className={styles.form} onSubmit={submit}>
        <Stars label="The program overall" value={form.programRating} onChange={(value) => setForm({ ...form, programRating: value })} />
        <Stars label="Mentoring and support" value={form.mentorRating} onChange={(value) => setForm({ ...form, mentorRating: value })} />
        <fieldset className={styles.moodRow}>
          <legend>Would you recommend Olentra’s internship to a friend?</legend>
          <button type="button" aria-pressed={form.recommend === true} onClick={() => setForm({ ...form, recommend: true })}>Yes</button>
          <button type="button" aria-pressed={form.recommend === false} onClick={() => setForm({ ...form, recommend: false })}>Not really</button>
        </fieldset>
        <label className={styles.field}>Anything else? (optional)<textarea rows={3} maxLength={2000} value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} /></label>
        <div className={styles.formActions}><Button type="submit" busy={busy} disabled={busy || !form.programRating || !form.mentorRating || form.recommend === null}>Send feedback</Button></div>
      </form>
    </Panel>
  );
}
