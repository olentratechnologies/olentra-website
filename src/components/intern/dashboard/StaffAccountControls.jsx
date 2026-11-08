"use client";

import { useState } from "react";
import { Button, Panel } from "./DashboardUI";
import common from "./pages.module.css";
import styles from "./applicant.module.css";

/** Allows staff to help an applicant who could not claim their account. */
export default function StaffAccountControls({ application, commands, notify }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!application || application.accountId) return null;
  async function createAccount(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await commands.createAccountForApplication(application.id, password);
      if (!result.ok) { setError(result.error); return; }
      setPassword("");
      await commands.getApplication(application.id);
      notify("Account created. Share the password securely with the applicant.");
    } catch {
      setError("Could not create the account. Please try again.");
    } finally { setBusy(false); }
  }
  return <Panel>
    <h2 className={styles.panelHeading}>Help an applicant access their account</h2>
    <p>Verify the applicant’s identity before creating their account. This replaces any unclaimed registration link.</p>
    <form onSubmit={createAccount}>
      <label className={common.field}>Password<input type="password" minLength={12} maxLength={256} required value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password"/></label>
      {error && <p role="alert">{error}</p>}
      <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create account"}</Button>
    </form>
  </Panel>;
}
