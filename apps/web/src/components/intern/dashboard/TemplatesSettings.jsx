"use client";

import { useState } from "react";
import { MessageSquareText } from "lucide-react";
import { Button, Panel } from "./DashboardUI";
import { useInternQuery } from "../useInternQuery";
import { TEMPLATE_PLACEHOLDERS } from "@/lib/intern/message-templates.mjs";
import ui from "./pages.module.css";
import styles from "./settings.module.css";

const blank = { id: "", name: "", subject: "", body: "" };

/** Admins manage reusable applicant and intern messages. */
export default function TemplatesSettings({ commands, notify }) {
  const query = useInternQuery("template.list", {});
  const templates = query.data || [];
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  async function save(event) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const result = await commands.saveTemplate(form);
      if (!result.ok) { setError(typeof result.error === "string" ? result.error : result.error?.message || "Could not save the template."); return; }
      notify(form.id ? "Template updated." : "Template added.");
      setForm(blank);
      void query.refresh();
    } finally { setBusy(false); }
  }
  async function remove(template) {
    if (!window.confirm(`Delete the "${template.name}" template?`)) return;
    const result = await commands.deleteTemplate(template.id);
    if (!result.ok) { notify(typeof result.error === "string" ? result.error : "Could not delete the template."); return; }
    if (form.id === template.id) setForm(blank);
    notify("Template deleted.");
    void query.refresh();
  }
  return <Panel className={`${styles.settingsPanel} ${styles.settingsForm}`}>
    <div className={styles.sectionHeading}><span><MessageSquareText size={19}/></span><div><h2>Message templates</h2><p>Reusable messages for applicants and interns. Staff pick one in any message box.</p></div></div>
    {templates.length > 0 && <ul className={styles.templateList}>
      {templates.map((template) => <li key={template.id}>
        <div><strong>{template.name}</strong><small>{template.subject}</small></div>
        <Button variant="ghost" onClick={() => setForm({ id: template.id, name: template.name, subject: template.subject, body: template.body })}>Edit</Button>
        <Button variant="ghost" onClick={() => void remove(template)}>Delete</Button>
      </li>)}
    </ul>}
    <form onSubmit={save} className={ui.formGrid}>
      <label className={ui.field}>Template name<input required maxLength={60} value={form.name} onChange={set("name")} placeholder="Interview invitation"/></label>
      <label className={ui.field}>Subject<input required maxLength={160} value={form.subject} onChange={set("subject")} placeholder="Your interview with Olentra"/></label>
      <label className={`${ui.field} ${styles.templateBody}`}>Message<textarea required maxLength={5000} rows={6} value={form.body} onChange={set("body")} placeholder="Hi {firstName}, …"/></label>
      <p className={styles.helper}>Placeholders: {TEMPLATE_PLACEHOLDERS.map((item) => <code key={item.key}>{`{${item.key}}`}</code>).reduce((all, item, index) => index ? [...all, " ", item] : [item], [])}. Anything that can’t be filled in stays visible so you can edit it before sending.</p>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.saveRow}>
        {form.id ? <Button variant="ghost" onClick={() => setForm(blank)}>Cancel edit</Button> : <span/>}
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : form.id ? "Update template" : "Add template"}</Button>
      </div>
    </form>
  </Panel>;
}
