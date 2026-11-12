"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Panel } from "./DashboardUI";
import common from "./pages.module.css";
import styles from "./applicant.module.css";

/**
 * Admin-only: permanently erases an applicant. The admin types the
 * applicant's email to confirm, because this can't be undone.
 */
export default function EraseApplicantPanel({ application, commands, notify }) {
  const router = useRouter();
  const [confirmEmail, setConfirmEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!application) return null;
  const matches = confirmEmail.trim().toLowerCase() === String(application.email || "").toLowerCase();
  async function erase(event) {
    event.preventDefault();
    if (!matches || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await commands.eraseApplicant(application.id, confirmEmail.trim());
      if (!result.ok) { setError(typeof result.error === "string" ? result.error : result.error?.message || "Could not erase this applicant."); return; }
      notify("The applicant's data was permanently erased.");
      router.replace("/intern/dashboard/applications");
    } catch {
      setError("Could not erase this applicant. Please try again.");
    } finally { setBusy(false); }
  }
  return <Panel>
    <h2 className={styles.panelHeading}>Erase applicant data</h2>
    <p>Permanently deletes this application, the applicant’s account, files, messages and internship records. Use this when the applicant asks for their data to be removed. It can’t be undone, and active interns must be completed or dropped first.</p>
    <form className={styles.recoveryForm} onSubmit={erase}>
      <label className={common.field}>Type {application.email} to confirm<input type="email" required value={confirmEmail} onChange={event => setConfirmEmail(event.target.value)} autoComplete="off" spellCheck={false}/></label>
      {error && <p role="alert">{error}</p>}
      <Button type="submit" variant="danger" disabled={!matches || busy}>{busy ? "Erasing…" : "Erase permanently"}</Button>
    </form>
  </Panel>;
}
