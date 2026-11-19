"use client";

import { useRef, useState } from "react";
import { Mail } from "lucide-react";
import { Button, Panel } from "./DashboardUI";
import { useInternQuery } from "../useInternQuery";
import ui from "./pages.module.css";
import styles from "./settings.module.css";

const message = error => typeof error === "string" ? error : error?.message || "Could not update this email.";

export default function AutomatedEmailSettings({ commands, notify }) {
  const query = useInternQuery("automatedEmail.list", {});
  const templates = query.data || [];
  const [selectedId, setSelectedId] = useState("application-received");
  const selected = templates.find(item => item.id === selectedId);
  const [draft, setDraft] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const revision = useRef(0);
  const form = draft || selected;
  function edit(field, value) {
    revision.current++;
    setDraft(current => ({ ...(current || selected), [field]: value }));
    setPreview(null); setError("");
  }
  function choose(id) {
    if (draft && !window.confirm("Discard your unsaved email changes?")) return;
    revision.current++;
    setSelectedId(id); setDraft(null); setPreview(null); setError("");
  }
  async function run(action) {
    if (!form) return;
    if (action === "reset" && !window.confirm("Restore the default subject and message for this email?")) return;
    const requestRevision = revision.current;
    setBusy(action); setError("");
    try {
      const result = action === "preview" ? await commands.previewAutomatedEmail(form) : action === "reset" ? await commands.resetAutomatedEmail(form.id) : await commands.saveAutomatedEmail(form);
      if (requestRevision !== revision.current) return;
      if (!result.ok) { setError(message(result.error)); return; }
      if (action === "preview") setPreview(result.data);
      else {
        setDraft(result.data); setPreview(null);
        notify(action === "reset" ? "Default email restored." : "Email template saved. Future emails will use this content.");
        await query.refresh();
        setDraft(null);
      }
    } catch (failure) { setError(message(failure)); }
    finally { setBusy(""); }
  }
  return <Panel className={`${styles.settingsPanel} ${styles.settingsForm}`}>
    <div className={styles.sectionHeading}><span><Mail size={19}/></span><div><h2>Automated emails</h2><p>The application-to-certificate emails sent by Olentra. Saved changes apply across the internship workspace.</p></div></div>
    {query.loading && <p role="status">Loading email templates…</p>}
    {query.error && <p className={styles.error} role="alert">{message(query.error)} <Button variant="ghost" onClick={() => void query.refresh()}>Retry</Button></p>}
    {form && <>
      <label className={ui.field}>Email type<select value={selectedId} disabled={!!busy} onChange={event => choose(event.target.value)}>{templates.map(item => <option key={item.id} value={item.id}>{item.name}{item.customized ? " · Customized" : ""}</option>)}</select></label>
      <p className={styles.helper}><strong>Sent when:</strong> {selected.trigger}.</p>
      <div className={styles.emailWorkspace}>
        <form className={ui.formGrid} onSubmit={event => { event.preventDefault(); void run("save"); }}>
          <label className={`${ui.field} ${styles.templateBody}`}>Subject<input required maxLength={160} disabled={!!busy} value={form.subject} onChange={event => edit("subject", event.target.value)}/></label>
          <label className={`${ui.field} ${styles.templateBody}`}>Message<textarea required rows={12} maxLength={5000} disabled={!!busy} value={form.body} onChange={event => edit("body", event.target.value)}/></label>
          <p className={styles.helper}>Placeholders: {selected.placeholders.map(key => <code key={key}>{`{${key}} `}</code>)}. Messages use plain text. Required details, secure links and calendar attachments are added automatically.</p>
          {["application-received", "shortlisted"].includes(selectedId) && <p className={styles.helper}>No portal or activation links are sent at this stage.</p>}
          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.emailActions}>
            <Button variant="ghost" disabled={!!busy} onClick={() => void run("reset")}>Restore default</Button>
            <Button variant="secondary" disabled={!!busy} onClick={() => void run("preview")}>{busy === "preview" ? "Loading preview…" : "Preview email"}</Button>
            <Button type="submit" disabled={!!busy}>{busy === "save" ? "Saving…" : "Save email"}</Button>
          </div>
        </form>
        <div className={styles.emailPreview} aria-live="polite">
          {preview ? <><h3>{preview.subject}</h3><p className={styles.helper}>Sample recipient: Alex Kumar · Software Engineer Intern</p><iframe title={`${selected.name} email preview`} sandbox="" referrerPolicy="no-referrer" srcDoc={preview.html}/>{preview.attachments?.length > 0 && <p className={styles.helper}>Attachment: interview.ics · {selectedId === "interview-cancelled" ? "Calendar cancellation" : "Calendar invitation / update"}</p>}</> : <p className={styles.helper}>Preview this email with sample data to see its message, buttons and required details.</p>}
        </div>
      </div>
    </>}
  </Panel>;
}
