"use client";

import { useEffect, useRef, useState } from "react";
import CompanyBrand from "@/components/intern/CompanyBrand";
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
  return (
    <Link
      href="/intern"
      className={styles.brand}
      aria-label="Olentra Technologies"
    >
      <CompanyBrand priority />
      <small>INTERNSHIP PROGRAM</small>
    </Link>
  );
}

function AuthShell({ children, eyebrow = "YOUR NEXT CHAPTER STARTS HERE" }) {
  return (
    <main className={styles.authPage}>
      <div className={styles.backgroundOrbit} />
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
          <Link href="/intern" className={styles.backLink}>
            <ArrowLeft size={14} /> Back to Internship Program
          </Link>
        </aside>
        <section className={styles.authPanel}>
          <div className={styles.mobileBrand}>
            <Brand />
          </div>
          {children}
          <footer className={styles.authFooter}>
            <ShieldCheck size={13} />
            <span>Olentra Internship Program · Interactive demo</span>
          </footer>
        </section>
      </div>
    </main>
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
      <LoaderCircle size={28} className={styles.spin} />
      <p>Preparing your internship workspace...</p>
    </main>
  );
}

export function LoginPage() {
  const {
    ready,
    sessionReady,
    account,
    sessionNotice,
    demoAccounts = [],
    signIn,
    signOut,
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
    session: "Your demo session ended. Sign in again to continue.",
    reset: "The demo was reset. Sign in again to start fresh.",
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
          ? "Choose a demo account below, then sign in to its workspace."
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
      error={error}
      busy={busy}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onSubmit={submit}
      onChooseDemo={chooseDemo}
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

export function RegisterPage() {
  const { ready, sessionReady, pendingApplication, account, register } =
    useInternship();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const submit = async (event) => {
    event.preventDefault();
    if (submitting.current || !pendingApplication) return;
    if (password.length < 8)
      return setError("Choose a password with at least 8 characters.");
    if (password !== confirmPassword)
      return setError("Your passwords do not match.");
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await register({
        applicationId: pendingApplication.id,
        password,
        name: pendingApplication.name,
      });
      if (!result.ok) return setError(errorText(result.error));
      router.replace(safeDestination(result.redirect, "/intern/portal"));
    } catch {
      setError("Unable to create your account. Please try again.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  return (
    <AuthShell eyebrow="YOUR APPLICATION IS JUST THE BEGINNING">
      <div className={styles.panelHeading}>
        <span className={styles.headingIcon}>
          <Users size={23} />
        </span>
        <h2>Create your account.</h2>
        <p>
          Keep your internship journey close, from application to achievement.
        </p>
      </div>
      {!ready || !sessionReady ? (
        <div className={styles.inlineLoading}>
          <LoaderCircle size={22} className={styles.spin} /> Loading your
          application...
        </div>
      ) : !pendingApplication ? (
        <div className={styles.emptyApplication}>
          <span>
            <FileIcon />
          </span>
          <h3>Start with your application</h3>
          <p>
            Apply to the internship program first. Your account will connect
            directly to your application so you can follow its progress.
          </p>
          <Link
            href="/intern#internship-application"
            className={styles.primaryButton}
          >
            Apply Now <ArrowRight size={15} />
          </Link>
          <Link
            href={
              account ? destinationFor(account) : "/intern/login?role=intern"
            }
            className={styles.textLink}
          >
            {account
              ? "Go to my workspace"
              : "Already have an account? Sign in"}
          </Link>
        </div>
      ) : (
        <>
          <div className={styles.applicationLinked}>
            <CheckCircle2 size={19} />
            <div>
              <strong>Your application is saved</strong>
              <span>Application ID: {pendingApplication.id}</span>
            </div>
          </div>
          <form className={styles.authForm} onSubmit={submit}>
            <fieldset disabled={busy}>
              <label className={styles.field} htmlFor="register-name">
                <span>Full name</span>
                <div className={styles.inputControl}>
                  <Users size={16} />
                  <input
                    id="register-name"
                    value={pendingApplication.name || ""}
                    readOnly
                    autoComplete="name"
                  />
                </div>
              </label>
              <label className={styles.field} htmlFor="register-email">
                <span>Email address</span>
                <div className={styles.inputControl}>
                  <Mail size={16} />
                  <input
                    id="register-email"
                    value={pendingApplication.email || ""}
                    readOnly
                    type="email"
                    autoComplete="username"
                  />
                </div>
                <small>Linked to your internship application.</small>
              </label>
              <PasswordField
                id="register-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Create a password"
                autoComplete="new-password"
                minLength={8}
                required
                hint="Use at least 8 characters."
              />
              <PasswordField
                id="register-confirm"
                label="Confirm password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Enter your password again"
                autoComplete="new-password"
                minLength={8}
                required
              />
              <ErrorMessage>{error}</ErrorMessage>
              <button className={styles.primaryButton} type="submit">
                {busy ? (
                  <>
                    <LoaderCircle size={16} className={styles.spin} /> Creating
                    account...
                  </>
                ) : (
                  <>
                    Create Account <ArrowRight size={16} />
                  </>
                )}
              </button>
            </fieldset>
          </form>
          <p className={styles.inlinePrompt}>
            Already registered?{" "}
            <Link href="/intern/login?role=intern">Sign in</Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}

function FileIcon() {
  return <BriefcaseBusiness size={29} />;
}

export function ResetPasswordPage() {
  const { ready, sessionReady, requestPasswordReset, resetPassword } =
    useInternship();
  const params = useSearchParams();
  const [role, setRole] = useState(
    params.get("role") === "company" ? "company" : "intern",
  );
  const [email, setEmail] = useState("");
  const [reset, setReset] = useState(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const submitting = useRef(false);
  const request = async (event) => {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await requestPasswordReset({ email: email.trim(), role });
      if (!result.ok) return setError(errorText(result.error));
      setReset(result.data);
    } catch {
      setError("Unable to start password reset. Please try again.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  const updatePassword = async (event) => {
    event.preventDefault();
    if (submitting.current || !reset) return;
    if (password.length < 8)
      return setError("Choose a password with at least 8 characters.");
    if (password !== confirmPassword)
      return setError("Your passwords do not match.");
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await resetPassword({
        resetId: reset.resetId,
        code: code.trim(),
        password,
      });
      if (!result.ok) return setError(errorText(result.error));
      setComplete(true);
    } catch {
      setError("Unable to reset your password. Please try again.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  return (
    <AuthShell>
      <div className={styles.panelHeading}>
        <span className={styles.headingIcon}>
          {complete ? <CheckCircle2 size={24} /> : <LockKeyhole size={23} />}
        </span>
        <h2>{complete ? "You’re all set." : "Reset your password."}</h2>
        <p>
          {complete
            ? "Your new password is ready. Sign in to continue your journey."
            : "A fresh start for your Olentra account."}
        </p>
      </div>
      {complete ? (
        <div className={styles.resetComplete}>
          <span>
            <Check size={30} />
          </span>
          <h3>Password updated</h3>
          <p>Use your new password the next time you sign in.</p>
          <Link
            href={`/intern/login?role=${role}&switch=1&notice=password-reset`}
            className={styles.primaryButton}
          >
            Back to Sign In <ArrowRight size={15} />
          </Link>
        </div>
      ) : !reset ? (
        <>
          <RoleTabs
            role={role}
            onChange={(value) => {
              setRole(value);
              setError("");
            }}
            disabled={busy}
          />
          <form className={styles.authForm} onSubmit={request}>
            <fieldset disabled={!ready || !sessionReady || busy}>
              <label className={styles.field} htmlFor="reset-email">
                <span>Account email address</span>
                <div className={styles.inputControl}>
                  <Mail size={16} />
                  <input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Enter your account email"
                    autoComplete="username"
                    required
                  />
                </div>
              </label>
              <p className={styles.resetExplanation}>
                This interactive demo displays a verification code here. No
                email is sent.
              </p>
              <ErrorMessage>{error}</ErrorMessage>
              <button className={styles.primaryButton} type="submit">
                {busy ? (
                  <>
                    <LoaderCircle size={16} className={styles.spin} /> Preparing
                    code...
                  </>
                ) : (
                  <>
                    Get Verification Code <ArrowRight size={15} />
                  </>
                )}
              </button>
            </fieldset>
          </form>
        </>
      ) : (
        <>
          <div className={styles.verificationNotice}>
            <ShieldCheck size={20} />
            <div>
              <strong>Demo verification code</strong>
              <span>For {reset.email || email}</span>
              <code>{reset.code}</code>
              <button type="button" onClick={() => setCode(String(reset.code))}>
                Use this code <ArrowRight size={12} />
              </button>
              <p>This code is shown locally for the demo. No email was sent.</p>
            </div>
          </div>
          <form className={styles.authForm} onSubmit={updatePassword}>
            <fieldset disabled={busy}>
              <label className={styles.field} htmlFor="verification-code">
                <span>Verification code</span>
                <div className={styles.inputControl}>
                  <ShieldCheck size={16} />
                  <input
                    id="verification-code"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    placeholder="Enter the code above"
                    required
                    maxLength={12}
                  />
                </div>
              </label>
              <PasswordField
                id="reset-new-password"
                label="New password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                placeholder="Create a new password"
                minLength={8}
                required
                hint="Use at least 8 characters."
              />
              <PasswordField
                id="reset-confirm-password"
                label="Confirm new password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                placeholder="Enter your new password again"
                minLength={8}
                required
              />
              <ErrorMessage>{error}</ErrorMessage>
              <button className={styles.primaryButton} type="submit">
                {busy ? (
                  <>
                    <LoaderCircle size={16} className={styles.spin} /> Updating
                    password...
                  </>
                ) : (
                  <>
                    Reset Password <ArrowRight size={15} />
                  </>
                )}
              </button>
            </fieldset>
          </form>
        </>
      )}
      {!complete && (
        <Link
          href={`/intern/login?role=${role}&switch=1`}
          className={`${styles.textLink} ${styles.returnToLogin}`}
        >
          <ArrowLeft size={13} /> Back to sign in
        </Link>
      )}
    </AuthShell>
  );
}
