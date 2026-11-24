"use client";

import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { useInternship } from "./InternshipProvider";
import { Button, Modal } from "./dashboard/DashboardUI";
import styles from "./project-plan.module.css";

function PlanDialog({ project, canEdit, close, onSaved }) {
  const { commands } = useInternship();
  const [document, setDocument] = useState(null);
  const [draft, setDraft] = useState("");
  const [visible, setVisible] = useState(true);
  const [editing, setEditing] = useState(false);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    commands.getProjectPlan(project.id).then(result => {
      if (!active) return;
      if (!result.ok) { setError(result.error); return; }
      setDocument(result.data);
      setDraft(result.data.markdown);
      setVisible(result.data.visibleToInterns !== false);
      setEditing(canEdit && !result.data.markdown);
    });
    return () => { active = false; };
  }, [commands, project.id, canEdit]);

  async function save() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await commands.saveProjectPlan(project.id, draft, document.revision, visible);
      if (!result.ok) { setError(result.error); return; }
      setDocument({ markdown: draft, revision: result.data.revision, visibleToInterns: visible });
      onSaved(Boolean(draft.trim()));
      setEditing(false);
      setPreview(false);
      if (!draft.trim()) close();
    } finally { setBusy(false); }
  }

  return <Modal open title={project.name} description="Full project plan" className={styles.dialog} onOpenChange={open => { if (!open && !busy) close(); }}>
    {error && <p role="alert">{error}</p>}
    {!document && !error && <p role="status">Loading plan…</p>}
    {document && <>
      {canEdit && !editing && document.visibleToInterns === false && <p className={styles.notice}>Hidden from interns. Only staff with project access can read this plan.</p>}
      {editing && !preview ? <label className={styles.field}>Project plan (Markdown)
        <textarea value={draft} maxLength={100000} onChange={event => setDraft(event.target.value)} disabled={busy} />
      </label> : <article className={styles.reader}>
        <Markdown skipHtml>{editing ? draft : document.markdown}</Markdown>
      </article>}
      {editing && <label className={styles.toggle}>
        <input type="checkbox" checked={visible} disabled={busy} onChange={event => setVisible(event.target.checked)} />
        <span><strong>Visible to interns</strong> Interns on this project can read the plan. Turn off to keep it staff-only.</span>
      </label>}
      {canEdit && <div className={styles.actions}>
        {editing ? <>
          <Button variant="ghost" disabled={busy} onClick={() => {
            if (!document.markdown) { close(); return; }
            setDraft(document.markdown); setVisible(document.visibleToInterns !== false); setEditing(false); setPreview(false); setError("");
          }}>Cancel</Button>
          <Button variant="secondary" disabled={busy} onClick={() => setPreview(!preview)}>{preview ? "Back to editor" : "Preview"}</Button>
          <Button disabled={busy} onClick={save}>{busy ? "Saving…" : "Save plan"}</Button>
        </> : <Button variant="secondary" onClick={() => setEditing(true)}>Edit plan</Button>}
      </div>}
    </>}
  </Modal>;
}

export default function ProjectPlan({ project, canEdit = false }) {
  const [open, setOpen] = useState(false);
  // Reflects a save made here until the refreshed project list arrives.
  const [saved, setSaved] = useState(null);
  const trigger = useRef(null);
  useEffect(() => { setSaved(null); }, [project.hasPlan]);
  const hasPlan = saved ?? Boolean(project.hasPlan);
  if (!hasPlan && !canEdit) return null;
  return <>
    <button className={styles.trigger} type="button" ref={trigger} onClick={() => setOpen(true)}>{hasPlan ? "View full plan" : "Add plan"}</button>
    {open && <PlanDialog project={project} canEdit={canEdit} onSaved={setSaved} close={() => {
      setOpen(false);
      requestAnimationFrame(() => trigger.current?.focus());
    }} />}
  </>;
}
