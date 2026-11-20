"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDownToLine, ExternalLink, FileText } from "lucide-react";
import { useInternship } from "@/components/intern/InternshipProvider";
import { fetchAttachment, saveBlob } from "@/lib/intern-attachments.mjs";
import LoadingIndicator from "@olentra/ui/LoadingIndicator";
import { Button, Modal, formatDate } from "./DashboardUI";
import styles from "./applicant.module.css";

export function formatFileSize(bytes) {
  const size = Number(bytes) || 0;
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}

const messageOf = (error, fallback) => (typeof error === "string" ? error : error?.message) || fallback;

/**
 * Staff resume preview. The file is fetched with the session token in a
 * header and shown from a local blob URL, so no resume link (and no token)
 * ever appears in an address bar, query string or server log.
 */
export default function ResumeViewer({ application, open, onOpenChange }) {
  const { commands, notify } = useInternship();
  const [state, setState] = useState({ phase: "idle" });
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open || !application?.id) return undefined;
    const abort = new AbortController();
    let url = "";
    fileRef.current = null;
    setState({ phase: "loading" });
    (async () => {
      const described = await commands.getResume(application.id);
      if (abort.signal.aborted) return;
      if (!described.ok) { setState({ phase: "error", message: messageOf(described.error, "This resume could not be loaded.") }); return; }
      const resume = described.data?.resume;
      if (!resume) { setState({ phase: "missing" }); return; }
      if (resume.status !== "ready") { setState({ phase: resume.status, resume }); return; }
      if (!resume.previewable) { setState({ phase: "download-only", resume }); return; }
      try {
        const file = await fetchAttachment(resume.id, { signal: abort.signal });
        if (abort.signal.aborted) return;
        fileRef.current = file;
        url = URL.createObjectURL(new Blob([file.blob], { type: "application/pdf" }));
        setState({ phase: "preview", resume, url });
      } catch (error) {
        if (!abort.signal.aborted) setState({ phase: "error", resume, message: messageOf(error, "This resume could not be loaded.") });
      }
    })();
    return () => { abort.abort(); if (url) URL.revokeObjectURL(url); fileRef.current = null; };
  }, [open, application?.id, commands]);

  async function download() {
    if (!state.resume || busy) return;
    setBusy(true);
    try {
      const file = fileRef.current || await fetchAttachment(state.resume.id);
      saveBlob(file.blob, file.name || state.resume.name);
      notify(`${application.name}’s resume downloaded.`);
    } catch (error) {
      notify(messageOf(error, "This resume could not be downloaded."));
    } finally {
      setBusy(false);
    }
  }

  const resume = state.resume;
  const details = resume ? [formatFileSize(resume.size), resume.uploadedAt ? `Uploaded ${formatDate(resume.uploadedAt)}` : ""].filter(Boolean).join(" · ") : "";

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={application ? `${application.name}’s resume` : "Resume"}
      description="Only staff allowed to download resumes can open this file."
      className={styles.resumeModal}
    >
      {resume && (
        <div className={styles.resumeBar}>
          <FileText size={18} aria-hidden="true" />
          <div>
            <strong title={resume.name}>{resume.name}</strong>
            {details && <span>{details}</span>}
          </div>
          {state.phase === "preview" && (
            <Button variant="ghost" onClick={() => window.open(state.url, "_blank", "noopener")}>
              <ExternalLink size={15} />
              Open in new tab
            </Button>
          )}
          {["preview", "download-only", "error"].includes(state.phase) && (
            <Button variant="secondary" onClick={download} disabled={busy}>
              <ArrowDownToLine size={15} />
              {busy ? "Downloading…" : "Download"}
            </Button>
          )}
        </div>
      )}
      <div className={styles.resumeStage} aria-live="polite">
        {state.phase === "loading" && <LoadingIndicator label="Loading resume" />}
        {state.phase === "preview" && <iframe className={styles.resumeFrame} src={state.url} title={`${application.name}’s resume`} />}
        {state.phase === "download-only" && <p>Word documents can’t be previewed in the browser. Download the file to open it.</p>}
        {state.phase === "processing" && <p>This resume is still being checked for safety. Try again in a minute.</p>}
        {state.phase === "rejected" && <p>This resume failed the safety check and can’t be opened. Ask the applicant to upload it again.</p>}
        {state.phase === "missing" && <p>No resume is on file for this application.</p>}
        {state.phase === "error" && <p role="alert">{state.message}</p>}
      </div>
    </Modal>
  );
}
