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
import { useSiteFeatures } from "@/components/site-features";

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

function AuthShell({ children, eyebrow = "YOUR NEXT CHAPTER STARTS HERE" }) {
  const { features, ready } = useSiteFeatures();
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

export function RegisterPage() {
  const { ready, sessionReady, pendingApplication, account, register } =
    useInternship();
  const { features, ready: featuresReady } = useSiteFeatures();
  const registrationOpen = Boolean(featuresReady && features.internships && features.applications);
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const submit = async (event) => {
    event.preventDefault();
    if (!registrationOpen) { setError("Internship account registration is currently closed."); return; }
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
  if (!featuresReady) return <AuthShell><div className={styles.inlineLoading}><LoaderCircle size={22} className={styles.spin} /> Checking registration availability...</div></AuthShell>;
  if (!registrationOpen) return <AuthShell eyebrow="INTERNSHIP ACCOUNT ACCESS"><div className={styles.panelHeading}><span className={styles.headingIcon}><LockKeyhole size={23} /></span><h2>Registration is currently closed.</h2><p>New internship applications and account registration are unavailable at the moment.</p></div>{(features.portal || account?.role === "company") && <Link href={account ? destinationFor(account) : "/intern/login?role=intern"} className={styles.primaryButton}>{account ? "Go to my workspace" : "Existing account? Sign in"}<ArrowRight size={16} /></Link>}<Link href="/" className={styles.textLink}>Return to Olentra</Link></AuthShell>;
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
            href="/careers/intern#internship-application"
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
  return <AuthShell eyebrow="INTERNSHIP ACCOUNT ACCESS"><div className={styles.panelHeading}><span className={styles.headingIcon}><LockKeyhole size={23}/></span><h2>Reset your password.</h2><p>Contact the internship team for help resetting your password. They will verify your identity and provide a new password.</p></div><Link href="/intern/login" className={styles.textLink}><ArrowLeft size={13}/> Back to sign in</Link></AuthShell>;
}
