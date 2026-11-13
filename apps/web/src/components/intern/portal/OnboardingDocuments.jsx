"use client";

import { useState } from "react";
import { FileUp } from "lucide-react";
import { useInternship } from "@/components/intern/InternshipProvider";
import { Panel, Status } from "./PortalUI";
import styles from "./portal.module.css";

const ACCEPT = ".pdf,.doc,.docx,.png,.jpg,.jpeg";

/** The admin's onboarding document checklist: upload each, see its review. */
export default function OnboardingDocuments({ applicationId, checklist, documents, locked }) {
  const { commands, notify } = useInternship();
  const [busyId, setBusyId] = useState("");
  if (!checklist?.length) return null;
  async function upload(item, file) {
    if (!file) return;
    setBusyId(item.id);
    try {
      const { saveAttachment } = await import("@/lib/intern-attachments.mjs");
      const attachment = await saveAttachment(file, "work");
      const result = await commands.uploadOnboardingDocument(applicationId, item.id, attachment.id);
      if (!result.ok) { notify(typeof result.error === "string" ? result.error : result.error?.message || "Couldn't attach that document."); return; }
      notify(`${item.label} uploaded.`);
    } catch (error) {
      notify(error?.message || "That file couldn't be uploaded. Try a PDF or image.");
    } finally { setBusyId(""); }
  }
  return (
    <Panel>
      <h2>Documents</h2>
      <p>Upload each document below. The team reviews them before your onboarding is approved.</p>
      <ul className={styles.documentList}>
        {checklist.map((item) => {
          const entry = documents?.[item.id];
          const canUpload = !locked && entry?.status !== "Approved";
          return (
            <li key={item.id}>
              <div>
                <strong>{item.label}{item.required ? "" : <small> (optional)</small>}</strong>
                {entry ? <small>{entry.name}</small> : <small>Not uploaded yet</small>}
                {entry?.status === "Changes requested" && entry.note && <small className={styles.documentNote}>{entry.note}</small>}
              </div>
              {entry && <Status value={entry.status} />}
              {canUpload && (
                <label className={styles.fileButton}>
                  <FileUp size={14} aria-hidden="true" />
                  {busyId === item.id ? "Uploading…" : entry ? "Replace" : "Upload"}
                  <input type="file" accept={ACCEPT} disabled={busyId === item.id} onChange={(event) => { void upload(item, event.target.files?.[0]); event.target.value = ""; }} />
                </label>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
