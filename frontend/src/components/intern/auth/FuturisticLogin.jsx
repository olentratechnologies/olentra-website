"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import {
  AlertCircle,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import styles from "./futuristic-login.module.css";
import { useSiteFeatures } from "@/components/site-features";

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.76-5.6-4.12H3.07v2.59A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.4 13.92a6 6 0 0 1 0-3.84V7.49H3.07a10 10 0 0 0 0 9.02l3.33-2.59Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.96c1.47 0 2.79.51 3.82 1.51l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.33 2.59C7.2 7.72 9.4 5.96 12 5.96Z"
      />
    </svg>
  );
}

function GithubLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.835 2.807 1.304 3.492.997.108-.775.418-1.305.762-1.605-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.116-3.176 0 0 1.008-.322 3.301 1.23a11.52 11.52 0 0 1 3.003-.404c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.565 21.796 24 17.298 24 12c0-6.63-5.37-12-12-12Z"
      />
    </svg>
  );
}

function BenefitArtwork({ kind }) {
  const gradient = `login-benefit-${useId().replaceAll(":", "")}`;
  return (
    <svg
      viewBox="0 0 48 48"
      width="40"
      height="40"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={gradient}
          x1="9"
          y1="4"
          x2="36"
          y2="45"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#50b9ff" />
          <stop offset=".43" stopColor="#126bff" />
          <stop offset="1" stopColor="#183be4" />
        </linearGradient>
      </defs>
      {kind === "rocket" && (
        <>
          <path d="m14 19-7 2-4 12 12-3m14 4-2 12 11-8 1-11" fill="#2768f5" />
          <path
            d="M12 29C17 13 27 6 43 4c0 16-7 27-23 33Z"
            fill={`url(#${gradient})`}
          />
          <path d="M14 34 7 42l2-9m7 6-3 7 8-6" fill="#46c2ff" />
          <circle cx="30" cy="17" r="4.1" fill="#c0ebff" />
          <path
            d="M18 25C23 14 30 9 39 7"
            stroke="#8fddff"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </>
      )}
      {kind === "cap" && (
        <>
          <path d="M11 23v12c7 8 19 8 26 0V23Z" fill={`url(#${gradient})`} />
          <path
            d="m2 17 22-12 22 12-22 12Z"
            fill={`url(#${gradient})`}
            stroke="#6cc5ff"
            strokeWidth="1"
          />
          <path
            d="m43 19 1 15"
            stroke="#1467fa"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <path d="m44 31-2 7h4Z" fill="#1e58f7" />
        </>
      )}
      {kind === "star" && (
        <path
          d="m24 3 6.2 12.8 14.1 2.1-10.2 10 2.4 14.2L24 35.4l-12.5 6.7 2.4-14.2-10.2-10 14.1-2.1Z"
          fill={`url(#${gradient})`}
          stroke="#5eaaff"
          strokeWidth=".8"
          strokeLinejoin="round"
        />
      )}
      {kind === "bolt" && (
        <path
          d="M27 2 10 27h13l-3 19 19-28H26l8-16Z"
          fill={`url(#${gradient})`}
        />
      )}
    </svg>
  );
}

const benefits = [
  { kind: "rocket", first: "Real-World", second: "Projects" },
  { kind: "cap", first: "Expert", second: "Mentorship" },
  { kind: "star", first: "Certificate &", second: "Recognition" },
  { kind: "bolt", first: "Career", second: "Growth" },
];

export default function FuturisticLogin({
  ready,
  sessionReady,
  account,
  feedback,
  demoAccounts,
  resetRole,
  email,
  password,
  error,
  busy,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onChooseDemo,
  onSignOut,
  onRequestMagicLink,
}) {
  const { features, ready: featuresReady } = useSiteFeatures();
  const canApply = Boolean(featuresReady && features.internships && features.applications);
  const [visible, setVisible] = useState(false);
  const [remember, setRemember] = useState(false);
  const [demoProvider, setDemoProvider] = useState(null);
  const [magicMode, setMagicMode] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [magicBusy, setMagicBusy] = useState(false);
  const [magicError, setMagicError] = useState("");
  const restored = useRef(false);
  const emailInput = useRef(null);
  const disabled = !ready || !sessionReady || busy || Boolean(account);

  useEffect(() => {
    if (!ready || !sessionReady || restored.current) return;
    restored.current = true;
    try {
      const saved = JSON.parse(
        sessionStorage.getItem("olentra_intern_login_hint_v1") || "null",
      );
      if (!email && typeof saved?.email === "string") {
        onEmailChange(saved.email);
        setRemember(true);
      }
    } catch {}
  }, [ready, sessionReady, email, onEmailChange]);

  function submit(event) {
    try {
      if (remember)
        sessionStorage.setItem(
          "olentra_intern_login_hint_v1",
          JSON.stringify({ email: email.trim() }),
        );
      else sessionStorage.removeItem("olentra_intern_login_hint_v1");
    } catch {}
    onSubmit(event);
  }

  return (
    <>
      <Navbar />
      <main className={styles.page}>
        <div className={styles.scene} aria-hidden="true" />
        <section
          className={styles.intro}
          data-theme="light"
          aria-labelledby="login-intro-title"
        >
          <h1 id="login-intro-title">
            Build. Learn. Grow.
            <br />
            <span>Together.</span>
          </h1>
          <p>
            At Olentra Technologies, we believe in nurturing
            <br className={styles.desktopBreak} /> talent and turning ideas into
            innovation.
          </p>
          <div className={styles.benefits}>
            {benefits.map(({ kind, first, second }) => (
              <div key={first}>
                <span className={styles.benefitIcon}>
                  <BenefitArtwork kind={kind} />
                </span>
                <span>
                  {first}
                  <br />
                  {second}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section
          className={styles.loginCard}
          data-theme="light"
          aria-labelledby="login-heading"
        >
          <header className={styles.heading}>
            <h2 id="login-heading">Welcome Back!</h2>
            <p>Sign in to continue</p>
          </header>
          {!account && sessionReady && feedback && (
            <div className={styles.notice} role="status">
              <ShieldCheck size={19} />
              <p>{feedback}</p>
            </div>
          )}
          {account && (
            <div className={styles.notice} role="status">
              <CheckCircle2 size={19} />
              <div>
                <strong>Signed in as {account.name || account.email}</strong>
                <p>Sign out to choose another account.</p>
              </div>
              <button type="button" onClick={onSignOut}>
                <LogOut size={15} />
                Sign out
              </button>
            </div>
          )}
          <form className={styles.form} onSubmit={submit}>
            <fieldset disabled={disabled}>
              <div style={{ display: "flex", gap: "8px", marginBottom: "18px" }}>
                <button
                  type="button"
                  onClick={() => { setMagicMode(false); setMagicSent(false); setMagicError(""); }}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "10px",
                    border: magicMode ? "1px solid #d0dbe9" : "1.5px solid #2563eb",
                    background: magicMode ? "#f8fafc" : "#eff6ff",
                    color: magicMode ? "#64748b" : "#1d4ed8",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Password Sign-In
                </button>
                <button
                  type="button"
                  onClick={() => { setMagicMode(true); setMagicSent(false); setMagicError(""); }}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "10px",
                    border: !magicMode ? "1px solid #d0dbe9" : "1.5px solid #2563eb",
                    background: !magicMode ? "#f8fafc" : "#eff6ff",
                    color: !magicMode ? "#64748b" : "#1d4ed8",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  ✨ Magic Link (1-Click)
                </button>
              </div>

              <label className={styles.inputControl} htmlFor="login-email">
                <span className={styles.srOnly}>Email address</span>
                <Mail className={styles.fieldIcon} size={26} />
                <input
                  ref={emailInput}
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  placeholder="Email Address"
                  value={email}
                  onChange={(event) => onEmailChange(event.target.value)}
                  required
                  maxLength={254}
                />
              </label>

              {!magicMode ? (
                <>
                  <label className={styles.inputControl} htmlFor="login-password">
                    <span className={styles.srOnly}>Password</span>
                    <LockKeyhole className={styles.fieldIcon} size={25} />
                    <input
                      id="login-password"
                      type={visible ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Password"
                      value={password}
                      onChange={(event) => onPasswordChange(event.target.value)}
                      required
                    />
                    <button
                      className={styles.passwordToggle}
                      type="button"
                      aria-label={visible ? "Hide password" : "Show password"}
                      onClick={() => setVisible((current) => !current)}
                    >
                      {visible ? <Eye size={23} /> : <EyeOff size={23} />}
                    </button>
                  </label>
                  <div className={styles.formMeta}>
                    <label title="Remember my email in this tab.">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(event) => {
                          setRemember(event.target.checked);
                          if (!event.target.checked) {
                            try {
                              sessionStorage.removeItem(
                                "olentra_intern_login_hint_v1",
                              );
                            } catch {}
                          }
                        }}
                      />
                      <span>Remember me</span>
                    </label>
                    <Link href={`/intern/reset-password?role=${resetRole}`}>
                      Forgot password?
                    </Link>
                  </div>
                </>
              ) : (
                <div style={{ margin: "16px 0 20px" }}>
                  {magicSent ? (
                    <div style={{ background: "#e8f7ee", border: "1px solid #7dd39d", borderRadius: "14px", padding: "16px", color: "#166534" }}>
                      <CheckCircle2 size={20} style={{ color: "#15803d", marginBottom: "6px" }} />
                      <strong style={{ display: "block", fontSize: "14px", marginBottom: "2px" }}>Sign-in link sent!</strong>
                      <p style={{ margin: 0, fontSize: "13px" }}>
                        Check your inbox at <strong>{email}</strong> for your 1-click access link.
                      </p>
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: "14px", color: "#475569", lineHeight: 1.5 }}>
                      We&apos;ll send a secure 1-click link to your email to open your portal instantly without entering a password.
                    </p>
                  )}
                </div>
              )}

              {(error || magicError) && (
                <div className={styles.error} role="alert">
                  <AlertCircle size={18} />
                  <p>{magicMode ? magicError : error}</p>
                </div>
              )}

              {!magicMode ? (
                <button type="submit" className={styles.signIn}>
                  {busy ? (
                    <>
                      <LoaderCircle size={21} className={styles.spin} />
                      Signing in…
                    </>
                  ) : (
                    <>
                      Sign In <ArrowRight size={24} />
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.signIn}
                  disabled={disabled || magicBusy || !email.trim()}
                  onClick={async () => {
                    if (!email.trim() || magicBusy) return;
                    setMagicBusy(true);
                    setMagicError("");
                    try {
                      if (onRequestMagicLink) {
                        const res = await onRequestMagicLink(email.trim());
                        if (res?.ok) setMagicSent(true);
                        else setMagicError(res?.error || "Unable to send sign-in link.");
                      } else {
                        setMagicSent(true);
                      }
                    } catch (err) {
                      setMagicError(err?.message || "Unable to send sign-in link.");
                    } finally {
                      setMagicBusy(false);
                    }
                  }}
                >
                  {magicBusy ? (
                    <>
                      <LoaderCircle size={21} className={styles.spin} />
                      Sending link…
                    </>
                  ) : magicSent ? (
                    <>
                      Resend Link <ArrowRight size={24} />
                    </>
                  ) : (
                    <>
                      Send Sign-In Link <ArrowRight size={24} />
                    </>
                  )}
                </button>
              )}
            </fieldset>
          </form>
          {canApply && <div className={styles.applyBanner}>
            <span className={styles.applyIcon}>
              <BenefitArtwork kind="rocket" />
            </span>
            <div>
              <strong>New to Olentra Internship Program?</strong>
              <p>Explore opportunities and apply now.</p>
            </div>
            <Link href="/careers/intern#internship-application">
              Apply Now <ArrowRight size={16} />
            </Link>
          </div>}
        </section>

        <footer className={styles.companyFooter}>
          <span className={styles.footerLine} />
          <div>
            <p>Olentra Technologies Pvt. Ltd.</p>
            <span>Where ambition meets opportunity.</span>
          </div>
        </footer>


      </main>
    </>
  );
}
