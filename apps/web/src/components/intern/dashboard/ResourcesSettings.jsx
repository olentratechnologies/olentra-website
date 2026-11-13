"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";
import { Button, Panel } from "./DashboardUI";
import { useInternQuery } from "../useInternQuery";
import ui from "./pages.module.css";
import styles from "./settings.module.css";

const blank = { id: "", title: "", url: "", type: "article", minutes: "", programIds: [] };
const TYPES = [["article", "Article"], ["video", "Video"], ["course", "Course"], ["doc", "Doc"]];

/** Admins curate learning links per track; interns see them in their portal. */
export default function ResourcesSettings({ programs, commands, notify }) {
  const query = useInternQuery("resource.list", {});
  const resources = query.data || [];
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const trackName = (id) => programs.find((program) => program.id === id)?.name || id;
  async function save(event) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const result = await commands.saveResource({ ...form, minutes: Number(form.minutes || 0) });
      if (!result.ok) { setError(typeof result.error === "string" ? result.error : result.error?.message || "Could not save the resource."); return; }
      notify(form.id ? "Resource updated." : "Resource added.");
      setForm(blank);
      void query.refresh();
    } finally { setBusy(false); }
  }
  async function remove(resource) {
    if (!window.confirm(`Delete "${resource.title}"? Interns' progress on it is removed too.`)) return;
    const result = await commands.deleteResource(resource.id);
    if (!result.ok) { notify("Could not delete the resource."); return; }
    if (form.id === resource.id) setForm(blank);
    void query.refresh();
  }
  return <Panel className={`${styles.settingsPanel} ${styles.settingsForm}`}>
    <div className={styles.sectionHeading}><span><BookOpen size={19}/></span><div><h2>Learning resources</h2><p>Links interns see in their portal and tick off as they go.</p></div></div>
    {resources.length > 0 && <ul className={styles.templateList}>
      {resources.map((resource) => <li key={resource.id}>
        <div><strong>{resource.title}</strong><small>{resource.programIds.length ? resource.programIds.map(trackName).join(", ") : "All tracks"}{resource.minutes ? ` · ${resource.minutes} min` : ""}</small></div>
        <Button variant="ghost" onClick={() => setForm({ ...resource, minutes: resource.minutes ? String(resource.minutes) : "" })}>Edit</Button>
        <Button variant="ghost" onClick={() => void remove(resource)}>Delete</Button>
      </li>)}
    </ul>}
    <form onSubmit={save} className={ui.formGrid}>
      <label className={ui.field}>Title<input required maxLength={120} value={form.title} onChange={set("title")} placeholder="Intro to React"/></label>
      <label className={ui.field}>Link<input required type="url" maxLength={2000} value={form.url} onChange={set("url")} placeholder="https://…"/></label>
      <label className={ui.field}>Type<select value={form.type} onChange={set("type")}>{TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className={ui.field}>Estimated minutes (optional)<input type="number" min="0" max="6000" value={form.minutes} onChange={set("minutes")}/></label>
      <fieldset className={styles.trackChoices}>
        <legend>Show to</legend>
        {programs.map((program) => <label key={program.id}><input type="checkbox" checked={form.programIds.includes(program.id)} onChange={(event) => setForm((current) => ({ ...current, programIds: event.target.checked ? [...current.programIds, program.id] : current.programIds.filter((id) => id !== program.id) }))}/> {program.name}</label>)}
        <small>Leave both unticked to show it to every track.</small>
      </fieldset>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.saveRow}>
        {form.id ? <Button variant="ghost" onClick={() => setForm(blank)}>Cancel edit</Button> : <span/>}
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : form.id ? "Update resource" : "Add resource"}</Button>
      </div>
    </form>
  </Panel>;
}
