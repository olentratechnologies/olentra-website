"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Github } from "lucide-react";
import { useInternship } from "@/components/intern/InternshipProvider";
import { ConnectGithubButton } from "@/components/intern/ProjectLinks";
import { ErrorMessage, Heading, Loading, Panel } from "./PortalUI";
import styles from "./portal.module.css";

/** Profile card: which GitHub account receives repository invites. */
export function GithubConnectionPanel() {
  const { data, my, commands, notify } = useInternship();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!data?.githubIntegration?.enabled) return null;
  const account = my.application?.githubAccount;
  async function disconnect() {
    setBusy(true); setError("");
    const result = await commands.githubDisconnect();
    setBusy(false);
    if (!result.ok) { setError(result.error || "GitHub could not be disconnected."); return; }
    notify("GitHub disconnected. Repository access from your projects will be removed.");
  }
  return (
    <Panel className={styles.sectionGap}>
      <div className={styles.panelHeader}>
        <h2>GitHub</h2>
      </div>
      {account ? (
        <>
          <p>
            Connected as <strong>@{account.login}</strong>. Repository invites for your projects go to this account.
          </p>
          <div className={styles.actions}>
            <button type="button" className={`${styles.button} ${styles.ghost}`} disabled={busy} onClick={disconnect}>
              {busy ? "Disconnecting…" : "Disconnect GitHub"}
            </button>
          </div>
        </>
      ) : (
        <>
          <p>Connect your GitHub account to get invited to your project repositories automatically.</p>
          <div className={styles.actions}><ConnectGithubButton className={styles.button} /></div>
        </>
      )}
      <ErrorMessage>{error}</ErrorMessage>
    </Panel>
  );
}

/** GitHub sends the intern here after they approve "Connect GitHub". */
export function GithubCallback() {
  const { ready, commands } = useInternship();
  const [state, setState] = useState({ status: "working", message: "" });
  const started = useRef(false);
  useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code"), oauthState = params.get("state"), denied = params.get("error");
    // The sign-in code is single-use; keep it out of history and referrers.
    window.history.replaceState(null, "", window.location.pathname);
    if (denied || !code || !oauthState) {
      setState({ status: "error", message: denied === "access_denied" ? "GitHub connection was cancelled." : "GitHub didn't send a sign-in code. Try connecting again." });
      return;
    }
    commands.githubConnect(code, oauthState).then(result => {
      setState(result.ok
        ? { status: "done", message: `Connected as @${result.data.login}. Your repository invites will arrive within a few minutes.` }
        : { status: "error", message: result.error || "GitHub connection failed. Try again." });
    });
  }, [ready, commands]);
  if (!ready) return <Loading />;
  return (
    <>
      <Heading title="Connect GitHub" description="Link your GitHub account to get repository access." />
      <Panel>
        {state.status === "working" && <p role="status"><Github size={16} aria-hidden="true" /> Confirming your GitHub account…</p>}
        {state.status === "done" && <p role="status"><Check size={16} aria-hidden="true" /> {state.message}</p>}
        {state.status === "error" && <ErrorMessage>{state.message}</ErrorMessage>}
        {state.status !== "working" && (
          <div className={styles.actions}>
            <Link className={styles.button} href="/intern/portal/projects">Go to my projects</Link>
            {state.status === "error" && <ConnectGithubButton className={`${styles.button} ${styles.secondary}`}>Try again</ConnectGithubButton>}
          </div>
        )}
      </Panel>
    </>
  );
}
