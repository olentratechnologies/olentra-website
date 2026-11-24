"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GITHUB_RETURN_KEY, portalRepositoryAccess, safeReturnPath } from "@/lib/intern/repository-access.mjs";
import { Check, Github } from "lucide-react";
import { useInternship } from "@/components/intern/InternshipProvider";
import { ConnectGithubButton } from "@/components/intern/ProjectLinks";
import { ErrorMessage, Heading, Loading, Panel } from "./PortalUI";
import styles from "./portal.module.css";

/** Profile → Connected accounts: which GitHub account receives repository invites. */
export function GithubConnectionPanel() {
  const { data, my, commands, notify } = useInternship();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [highlight, setHighlight] = useState(false);
  const panel = useRef(null);
  // Links such as "Profile settings" from a project point here with #github.
  useEffect(() => {
    if (window.location.hash !== "#github") return;
    panel.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlight(true);
    const timer = setTimeout(() => setHighlight(false), 2400);
    return () => clearTimeout(timer);
  }, []);
  if (!data?.githubIntegration?.enabled) return null;
  const account = my.application?.githubAccount;
  const repository = portalRepositoryAccess(my.projects, account, true);
  async function disconnect() {
    setBusy(true); setError("");
    const result = await commands.githubDisconnect();
    setBusy(false);
    if (!result.ok) { setError(result.error || "GitHub could not be disconnected."); return; }
    notify("GitHub disconnected. Repository access from your projects will be removed.");
  }
  return (
    <section id="github" ref={panel} className={`${styles.sectionGap} ${styles.connectedAccounts}`} data-highlight={highlight ? "true" : undefined} aria-labelledby="connected-accounts">
      <Panel>
        <div className={styles.panelHeader}>
          <h2 id="connected-accounts">Connected accounts</h2>
        </div>
        <div className={styles.accountRow}>
          <span className={styles.accountIcon} aria-hidden="true"><Github size={20} /></span>
          <div className={styles.accountText}>
            <strong>GitHub</strong>
            <p>{account
              ? <>Connected as <strong>@{account.login}</strong>. Invites to your project repositories go to this account.</>
              : repository.stage === "connect"
                ? <>{repository.project.name} uses a GitHub repository. Connect your account to get invited automatically.</>
                : "Used to give you access to your project repositories. Connect it once for your whole internship."}</p>
          </div>
          <div className={styles.accountAction}>
            {account
              ? <button type="button" className={`${styles.button} ${styles.ghost}`} disabled={busy} onClick={disconnect}>{busy ? "Disconnecting…" : "Disconnect"}</button>
              : <ConnectGithubButton className={styles.button} />}
          </div>
        </div>
        {account && <p className={styles.accountHint}><Check size={13} aria-hidden="true" /> {repository.stage === "accept" ? "Your invite is ready. Accept it from your project page." : repository.stage === "waiting" ? "Your repository invite is on its way." : "You’re all set."}</p>}
        <ErrorMessage>{error}</ErrorMessage>
      </Panel>
    </section>
  );
}

/** GitHub sends the intern here after they approve "Connect GitHub". */
export function GithubCallback() {
  const { ready, commands } = useInternship();
  const router = useRouter();
  const [state, setState] = useState({ status: "working", message: "" });
  const [returnTo, setReturnTo] = useState("");
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
    let back = "";
    try { back = safeReturnPath(window.sessionStorage.getItem(GITHUB_RETURN_KEY)); window.sessionStorage.removeItem(GITHUB_RETURN_KEY); } catch { /* storage blocked */ }
    setReturnTo(back);
    commands.githubConnect(code, oauthState).then(result => {
      setState(result.ok
        ? { status: "done", message: `Connected as @${result.data.login}. Your repository invite will arrive within a few minutes.` }
        : { status: "error", message: result.error || "GitHub connection failed. Try again." });
      // Take the intern back to the page they started from.
      if (result.ok && back) setTimeout(() => router.replace(back), 1800);
    });
  }, [ready, commands, router]);
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
            <Link className={styles.button} href={returnTo || "/intern/portal/projects"}>{returnTo ? "Back to where you were" : "Go to my projects"}</Link>
            {state.status === "error" && <ConnectGithubButton className={`${styles.button} ${styles.secondary}`}>Try again</ConnectGithubButton>}
          </div>
        )}
      </Panel>
    </>
  );
}
