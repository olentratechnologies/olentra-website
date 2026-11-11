"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Layers, Users, ChartNoAxesCombined, ShieldCheck, ArrowLeft } from "lucide-react";
import { Button, Field, Input, Modal } from "./ui";
import { useAdmin } from "./store";
import { CompanyLogo } from "./company-logo";
import { requestWorkspacePasswordReset, resetWorkspacePassword } from "@/lib/workspace-auth.mjs";

const STAFF_PASSWORD_MINIMUM = 12;

function AuthFrame({ children }) { return <main className="workspace-auth"><section className="workspace-auth-left"><Link className="workspace-auth-brand" href="/dashboard"><CompanyLogo /></Link><h1>Your company.<br />One workspace.</h1><p>Manage your website, content, people, and operations in a unified workspace.</p><div className="workspace-auth-benefits">{[[Layers,"Control & publish","Keep your website, content, and applications up to date."],[Users,"Collaborate securely","Manage access, approvals, and team workflows."],[ChartNoAxesCombined,"Monitor & improve","Track performance, enquiries, and website health."]].map(([Icon,title,detail])=><div key={title}><Icon size={24}/><div><strong>{title}</strong><p>{detail}</p></div></div>)}</div></section><section className="workspace-auth-card">{children}</section></main>; }

function PasswordInput({ value, onChange, autoComplete, label = "Password", placeholder = "Enter your password", minLength }) {
  const [show, setShow] = useState(false);
  return <div className="workspace-password"><Input type={show ? "text" : "password"} aria-label={label} autoComplete={autoComplete} required minLength={minLength} value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} /><button type="button" className="workspace-icon-button" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow(current => !current)}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>;
}

export function SignInPage() {
  const { signIn } = useAdmin();
  const [email, setEmail] = useState(""), [password, setPassword] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false), [resetEmail, setResetEmail] = useState(""), [resetState, setResetState] = useState({ busy: false, message: "", error: "" });
  const [notice, setNotice] = useState(null);
  useEffect(() => { setNotice(new URLSearchParams(window.location.search).get("notice")); }, []);
  const submit = async event => {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const role = await signIn(email.trim(), password);
      setPassword("");
      if (!role) setError("This staff account has no company workspace access. Ask an internship admin to grant a workspace access level.");
      // The shell redirects to the workspace once the session is established.
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  };
  const requestReset = async event => {
    event.preventDefault(); setResetState({ busy: true, message: "", error: "" });
    try { const result = await requestWorkspacePasswordReset(resetEmail.trim()); setResetState({ busy: false, message: result.message, error: "" }); }
    catch (reason) { setResetState({ busy: false, message: "", error: reason.message }); }
  };
  return <AuthFrame>
    <h2>Sign in to your workspace</h2><p>Use your Olentra staff account.</p>
    {notice === "password-reset" && <div role="status" className="workspace-note">Your password was updated. Sign in with your new password.</div>}
    {notice === "password-changed" && <div role="status" className="workspace-note">Your password was changed and all sessions were signed out. Sign in again.</div>}
    {error && <div role="alert" className="workspace-auth-error">{error}</div>}
    <form onSubmit={submit}>
      <Field label="Work email"><Input type="email" autoComplete="username" placeholder="you@company.com" required value={email} onChange={event => setEmail(event.target.value)} /></Field>
      <Field label="Password"><PasswordInput value={password} onChange={setPassword} autoComplete="current-password" /></Field>
      <div className="workspace-auth-options"><span /><button className="workspace-link" style={{ background: "none", border: 0, padding: 0, cursor: "pointer" }} type="button" onClick={() => { setResetEmail(email); setResetState({ busy: false, message: "", error: "" }); setForgot(true); }}>Forgot password?</button></div>
      <Button type="submit" disabled={busy} variant="primary">{busy ? "Signing in…" : "Sign in"}</Button>
    </form>
    <div className="workspace-auth-footer"><div className="workspace-row" style={{ justifyContent: "center" }}><ShieldCheck size={16} />Staff accounts are shared with the internship dashboard.</div></div>
    <Modal title="Reset your password" open={forgot} onClose={() => setForgot(false)}>
      {resetState.message ? <div className="workspace-stack"><p role="status">{resetState.message}</p><p className="workspace-muted">The link works once and expires in 1 hour.</p><Button onClick={() => setForgot(false)}>Back to sign in</Button></div>
        : <form className="workspace-stack" onSubmit={requestReset}>
          <p>Enter your staff email and we'll send you a link to set a new password.</p>
          {resetState.error && <p role="alert" className="workspace-auth-error">{resetState.error}</p>}
          <Field label="Work email"><Input required type="email" autoComplete="username" value={resetEmail} onChange={event => setResetEmail(event.target.value)} /></Field>
          <Button type="submit" variant="primary" disabled={resetState.busy}>{resetState.busy ? "Sending…" : "Send reset link"}</Button>
        </form>}
    </Modal>
  </AuthFrame>;
}

export function ResetPasswordPage() {
  const router = useRouter();
  const { signOut } = useAdmin();
  const [password, setPassword] = useState(""), [confirm, setConfirm] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [token, setToken] = useState(null);
  useEffect(() => { setToken(new URLSearchParams(window.location.search).get("token") || ""); }, []);
  const submit = async event => {
    event.preventDefault(); setError("");
    if (password.length < STAFF_PASSWORD_MINIMUM) { setError(`Use at least ${STAFF_PASSWORD_MINIMUM} characters.`); return; }
    if (password !== confirm) { setError("The passwords do not match."); return; }
    setBusy(true);
    try { await resetWorkspacePassword(token, password); await signOut(); router.replace("/dashboard/login?notice=password-reset"); }
    catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  };
  return <AuthFrame>
    <div style={{ marginTop: 30, color: "var(--ad-blue)" }}><ShieldCheck size={39} /></div>
    <h2>Set a new password</h2>
    {token === null ? <p role="status">Opening your reset link…</p> : !token ? <><div role="alert" className="workspace-auth-error">This reset link is incomplete. Request a new one from the sign-in page.</div><Link href="/dashboard/login" className="workspace-row" style={{ justifyContent: "center", marginTop: 12 }}><ArrowLeft size={14} />Back to sign in</Link></>
      : <form onSubmit={submit}>
        <p>Choose a password with at least {STAFF_PASSWORD_MINIMUM} characters. Signing in again is required on every device.</p>
        {error && <div role="alert" className="workspace-auth-error">{error}</div>}
        <Field label="New password"><PasswordInput label="New password" value={password} onChange={setPassword} autoComplete="new-password" placeholder="New password" minLength={STAFF_PASSWORD_MINIMUM} /></Field>
        <Field label="Confirm new password"><PasswordInput label="Confirm new password" value={confirm} onChange={setConfirm} autoComplete="new-password" placeholder="Repeat the new password" minLength={STAFF_PASSWORD_MINIMUM} /></Field>
        <Button variant="primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save new password"}</Button>
        <Link href="/dashboard/login" className="workspace-row" style={{ justifyContent: "center", marginTop: 12 }}><ArrowLeft size={14} />Back to sign in</Link>
      </form>}
  </AuthFrame>;
}
