"use client";

import { useEffect, useRef, useState } from "react";
import CompanyBrand from "@/components/intern/CompanyBrand";
import LoadingIndicator from "@olentra/ui/LoadingIndicator";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Award,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useInternship } from "@/components/intern/InternshipProvider";
import { PlanetArtwork } from "@/components/intern/dashboard/DashboardVisuals";
import styles from "./auth.module.css";
import FuturisticLogin from "./FuturisticLogin";
import { InternThemeProvider, InternThemeToggle } from "../InternTheme";
import { useSiteFeatures } from "@olentra/site-features/react";

const destinationFor = (account) =>
  account?.role === "company" ? "/intern/dashboard" : "/intern/portal";
const safeDestination = (value, fallback) =>
  typeof value === "string" &&
  (value === fallback ||
    value.startsWith(`${fallback}/`) ||
    value.startsWith(`${fallback}?`)) &&
  !value.includes("\\")
    ? value
    : fallback;
const errorText = (value) =>
  typeof value === "string"
    ? value
    : value?.message || "Something went wrong. Please try again.";

function Brand() {
  const { features, ready } = useSiteFeatures();
  return (
    <Link
      href={ready && features.internships ? "/careers/intern" : "/"}
      className={styles.brand}
      aria-label="Olentra Technologies"
    >
      <CompanyBrand priority />
      <small>INTERNSHIP PROGRAM</small>
    </Link>
  );
}

function AuthShell({ children, eyebrow = "YOUR NEXT CHAPTER STARTS HERE", className = "" }) {
  const { features, ready } = useSiteFeatures();
  return (
    <InternThemeProvider>
    <InternThemeToggle floating />
    <main className={[styles.authPage, className].filter(Boolean).join(" ")}>
      <div className={styles.authLayout}>
        <aside className={styles.authStory}>
          <Brand />
          <div className={styles.storyContent}>
            <span className={styles.storyEyebrow}>
              <Sparkles size={13} /> {eyebrow}
            </span>
            <h1>
              Learn.
              <br />
              Build.
              <br />
              <span>Grow together.</span>
            </h1>
            <p>
              One place for your internship journey, from your first application
              to your next big achievement.
            </p>
            <div className={styles.storyArtwork}>
              <PlanetArtwork />
            </div>
            <div className={styles.storyFeatures}>
              <span>
                <BriefcaseBusiness size={16} /> Real projects
              </span>
              <span>
                <Users size={16} /> Expert guidance
              </span>
              <span>
                <Award size={16} /> Lasting recognition
              </span>
            </div>
          </div>
          <Link href={ready && features.internships ? "/careers/intern" : "/"} className={styles.backLink}>
            <ArrowLeft size={14} /> {ready && features.internships ? "Back to Internship Program" : "Back to Olentra"}
          </Link>
        </aside>
        <section className={styles.authPanel}>
          <div className={styles.mobileBrand}>
            <Brand />
          </div>
          {children}
          <footer className={styles.authFooter}>
            <ShieldCheck size={13} />
            <span>Olentra Internship Program</span>
          </footer>
        </section>
      </div>
    </main>
    </InternThemeProvider>
  );
}

function PasswordField({
  id,
  label = "Password",
  value,
  onChange,
  autoComplete = "current-password",
  hint,
  ...props
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className={styles.field} htmlFor={id}>
      <span>{label}</span>
      <div className={styles.passwordControl}>
        <LockKeyhole size={16} />
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          {...props}
        />
        <button
          type="button"
          aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {hint && <small>{hint}</small>}
    </label>
  );
}

function RoleTabs({ role, onChange, disabled = false }) {
  const values = [
    { id: "intern", label: "Intern", icon: Users },
    { id: "company", label: "Company", icon: BriefcaseBusiness },
  ];
  return (
    <div className={styles.roleTabs} role="tablist" aria-label="Account type">
      {values.map(({ id, label, icon: Icon }, index) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={role === id}
          tabIndex={role === id ? 0 : -1}
          disabled={disabled}
          onClick={() => onChange(id)}
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
              return;
            event.preventDefault();
            const nextIndex =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? values.length - 1
                  : (index +
                      (event.key === "ArrowRight" ? 1 : -1) +
                      values.length) %
                    values.length;
            onChange(values[nextIndex].id);
            event.currentTarget.parentElement.children[nextIndex]?.focus();
          }}
        >
          <Icon size={16} />
          {label}
        </button>
      ))}
    </div>
  );
}

function ErrorMessage({ children }) {
  return children ? (
    <p className={styles.errorMessage} role="alert">
      <AlertCircle size={16} />
      <span>{children}</span>
    </p>
  ) : null;
}

export function AuthLoading() {
  return (
    <main className={styles.loadingPage}>
      <LoadingIndicator label="Preparing your internship workspace…" />
    </main>
  );
}

export function LoginPage() {
  const {
    authReady: ready,
    sessionReady,
    authUnavailable,
    account,
    sessionNotice,
    demoAccounts = [],
    signIn,
    signOut,
    requestMagicLink,
  } = useInternship();
  const params = useSearchParams();
  const router = useRouter();
  const initialRole = params.get("role") === "company" ? "company" : "intern";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [localNotice, setLocalNotice] = useState("");
  const submitting = useRef(false);
  const switchAccount = params.get("switch") === "1";
  const returnTo = params.get("returnTo");
  const redirectNotices = {
    session: "Your session ended. Sign in again to continue.",
    reset: "Sign in to continue.",
    "signed-out":
      "You’re signed out. Sign in whenever you’re ready to continue.",
    "password-reset":
      "Your password was updated. Sign in with your new password.",
  };
  const feedback =
    params.get("notice") === "password-reset"
      ? redirectNotices["password-reset"]
      : sessionNotice ||
        localNotice ||
        redirectNotices[params.get("notice")] ||
        (switchAccount
          ? "Sign in to your account."
          : "");
  useEffect(() => {
    if (sessionReady && account && !switchAccount)
      router.replace(safeDestination(returnTo, destinationFor(account)));
  }, [sessionReady, account, switchAccount, returnTo, router]);
  const chooseDemo = (demo) => {
    if (!ready || !sessionReady || account || busy) return;
    setEmail(demo.email);
    setPassword(demo.password);
    setError("");
  };
  const submit = async (event) => {
    event.preventDefault();
    if (!ready || !sessionReady || submitting.current || account) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await signIn({
        email: email.trim(),
        password,
        returnTo: returnTo || undefined,
      });
      if (!result.ok) return setError(errorText(result.error));
      router.replace(
        safeDestination(
          result.redirect,
          result.role === "company" ? "/intern/dashboard" : "/intern/portal",
        ),
      );
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  return (
    <FuturisticLogin
      ready={ready}
      sessionReady={sessionReady}
      account={account}
      feedback={feedback}
      demoAccounts={demoAccounts}
      resetRole={initialRole}
      email={email}
      password={password}
      error={error || (authUnavailable ? "The internship service is temporarily unavailable. Reconnecting automatically…" : "")}
      busy={busy}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onSubmit={submit}
      onChooseDemo={chooseDemo}
      onRequestMagicLink={requestMagicLink}
      onSignOut={async () => {
        await signOut();
        setError("");
        setLocalNotice(
          "You’re signed out. Choose an account and sign in to continue.",
        );
      }}
    />
  );
}

export function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const { requestPasswordReset, resetPassword } = useInternship();

  // ── Mode 1: no token → email request form ─────────────────────────────
  const [email, setEmail] = useState("");
  const [requestState, setRequestState] = useState("idle"); // idle | busy | sent
  const [requestError, setRequestError] = useState("");

  async function handleRequestReset(event) {
    event.preventDefault();
    setRequestError("");
    setRequestState("busy");
    const result = await requestPasswordReset(email);
    if (result.ok) {
      setRequestState("sent");
    } else {
      setRequestError(result.error || "Unable to send reset link. Please try again.");
      setRequestState("idle");
    }
  }

  // ── Mode 2: token present → new password form ─────────────────────────
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [resetState, setResetState] = useState("idle"); // idle | busy | done
  const [resetError, setResetError] = useState("");

  async function handleReset(event) {
    event.preventDefault();
    setResetError("");
    if (password.length < 8) {
      setResetError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setResetError("Passwords do not match.");
      return;
    }
    setResetState("busy");
    const result = await resetPassword({ token, password });
    if (result.ok) {
      setResetState("done");
      router.replace("/intern/login?role=intern&notice=password-reset");
    } else {
      setResetError(result.error || "Unable to reset password. The link may have expired.");
      setResetState("idle");
    }
  }

  return (
    <AuthShell eyebrow="INTERNSHIP ACCOUNT ACCESS" className={styles.resetPage}>
      {!token ? (
        // ── Email request mode ───────────────────────────────────────────
        <>
          <div className={styles.panelHeading}>
            <span className={styles.headingIcon}><LockKeyhole size={23} /></span>
            <h2>Forgot your password?</h2>
            <p>Enter the email address linked to your internship account and we&apos;ll send you a reset link.</p>
          </div>
          {requestState === "sent" ? (
            <div className={styles.applicationLinked}>
              <CheckCircle2 size={19} />
              <div>
                <strong>Check your inbox</strong>
                <span>A reset link was sent to <strong>{email}</strong>. It expires in 1 hour.</span>
              </div>
            </div>
          ) : (
            <form className={styles.authForm} onSubmit={handleRequestReset}>
              <fieldset disabled={requestState === "busy"}>
                <label className={styles.field} htmlFor="reset-email">
                  <span>Email address</span>
                  <div className={styles.inputControl}>
                    <Mail size={16} />
                    <input
                      id="reset-email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </label>
                <ErrorMessage>{requestError}</ErrorMessage>
                <button type="submit" className={styles.primaryButton} disabled={requestState === "busy"}>
                  {requestState === "busy" ? (
                    <><LoaderCircle size={15} className={styles.spin} /> Sending…</>
                  ) : (
                    <>Send reset link <ArrowRight size={15} /></>
                  )}
                </button>
              </fieldset>
            </form>
          )}
          <Link href="/intern/login" className={styles.textLink}>
            <ArrowLeft size={13} /> Back to sign in
          </Link>
        </>
      ) : (
        // ── New password mode ────────────────────────────────────────────
        <>
          <div className={styles.panelHeading}>
            <span className={styles.headingIcon}><LockKeyhole size={23} /></span>
            <h2>Set a new password.</h2>
            <p>Choose a strong password for your internship account. Must be at least 8 characters.</p>
          </div>
          {resetState === "done" ? (
            <div className={styles.applicationLinked}>
              <CheckCircle2 size={19} />
              <div>
                <strong>Password updated!</strong>
                <span>Redirecting you to sign in…</span>
              </div>
            </div>
          ) : (
            <form className={styles.authForm} onSubmit={handleReset}>
              <fieldset disabled={resetState === "busy"}>
                <PasswordField
                  id="new-password"
                  label="New password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  hint="Minimum 8 characters"
                  required
                />
                <PasswordField
                  id="confirm-password"
                  label="Confirm new password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
                <ErrorMessage>{resetError}</ErrorMessage>
                <button type="submit" className={styles.primaryButton} disabled={resetState === "busy"}>
                  {resetState === "busy" ? (
                    <><LoaderCircle size={15} className={styles.spin} /> Saving…</>
                  ) : (
                    <>Set new password <ArrowRight size={15} /></>
                  )}
                </button>
              </fieldset>
            </form>
          )}
          <Link href="/intern/login" className={styles.textLink}>
            <ArrowLeft size={13} /> Back to sign in
          </Link>
        </>
      )}
    </AuthShell>
  );
}
