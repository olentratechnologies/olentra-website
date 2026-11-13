"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button, StatusBadge } from "./DashboardUI";
import { downloadAttachment } from "@/lib/intern-attachments.mjs";
import styles from "./staff.module.css";

/** Admins review each onboarding document: download, approve or ask for changes. */
export default function OnboardingDocumentsReview({ applicationId, checklist, documents, locked, commands, notify }) {
  const [busyId, setBusyId] = useState("");
  if (!checklist?.length) return null;
  async function review(item, decision) {
    let note = "";
    if (decision === "Changes requested") {
      note = window.prompt(`What should change in "${item.label}"?`)?.trim() || "";
      if (!note) return;
    }
    setBusyId(item.id);
    try {
      const result = await commands.reviewOnboardingDocument(applicationId, item.id, decision, note);
      if (!result.ok) notify(typeof result.error === "string" ? result.error : result.error?.message || "Couldn't save that review.");
      else notify(decision === "Approved" ? `${item.label} approved.` : "Changes requested. The intern has been notified.");
    } finally { setBusyId(""); }
  }
  return (
    <div className={styles.documentReview}>
      <h3>Documents</h3>
      <ul>
        {checklist.map((item) => {
          const entry = documents?.[item.id];
          return (
            <li key={item.id}>
              <div><strong>{item.label}</strong>{!item.required && <small> optional</small>}{entry?.note && <small>{entry.note}</small>}</div>
              {entry ? <StatusBadge status={entry.status} /> : <small>Not uploaded</small>}
              {entry && <Button variant="ghost" onClick={() => void downloadAttachment(entry.attachmentId).catch(() => notify("This document is unavailable."))} aria-label={`Download ${item.label}`}><Download size={14} /></Button>}
              {entry && !locked && entry.status !== "Approved" && <>
                <Button variant="secondary" disabled={busyId === item.id} onClick={() => void review(item, "Approved")}>Approve</Button>
                <Button variant="ghost" disabled={busyId === item.id} onClick={() => void review(item, "Changes requested")}>Request changes</Button>
              </>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
