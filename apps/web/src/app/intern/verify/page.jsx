"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { useInternship } from "@/components/intern/InternshipProvider";
import CompanyBrand from "@/components/intern/CompanyBrand";
import LoadingIndicator from "@olentra/ui/LoadingIndicator";
import styles from "@/components/intern/auth/auth.module.css";
import { InternThemeProvider, InternThemeToggle } from "@/components/intern/InternTheme";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { verifyMagicLink, requestMagicLink, ready, sessionReady, connected } =
    useInternship();

  const [status, setStatus] = useState("verifying"); // "verifying" | "success" | "error"
  const [errorMessage, setErrorMessage] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resendBusy, setResendBusy] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("No sign-in token was provided in the link.");
      return;
    }

    if (!ready || !sessionReady || !connected) return;

    let active = true;

    async function runVerification() {
      try {
        const result = await verifyMagicLink(token);
        if (!active) return;
        if (result.ok) {
          setStatus("success");
          window.setTimeout(() => {
            router.replace(result.redirect || "/intern/portal");
          }, 800);
        } else {
          setStatus("error");
          setErrorMessage(
            result.error ||
              "This sign-in link is invalid or has expired. Please request a new one.",
          );
        }
      } catch (err) {
        if (!active) return;
        setStatus("error");
        setErrorMessage(
          err?.message ||
            "Unable to verify your sign-in link. Please request a new one.",
        );
      }
    }

    void runVerification();

    return () => {
      active = false;
    };
  }, [token, ready, sessionReady, connected, verifyMagicLink, router]);

  async function handleResend(e) {
    e.preventDefault();
    if (!resendEmail.trim() || resendBusy) return;
    setResendBusy(true);
    try {
      await requestMagicLink(resendEmail.trim());
      setResendSent(true);
    } catch {
      setResendSent(true);
    } finally {
      setResendBusy(false);
    }
  }

  const verifying = status === "verifying";
  const success = status === "success";
  const StatusIcon = verifying ? LoaderCircle : success ? CheckCircle2 : AlertCircle;

  return (
    <main className={`${styles.authPage} ${styles.verifyPage}`}>
      <section className={styles.verifyCard} aria-labelledby="verification-title">
        <div className={styles.verifyBrand}>
          <CompanyBrand priority />
        </div>

        <div role={status === "error" ? "alert" : "status"} aria-live="polite">
          <div className={styles.verifyIcon} data-status={status}>
            <StatusIcon size={32} className={verifying ? styles.spin : undefined} aria-hidden="true" />
          </div>
          <h1 id="verification-title" className={styles.verifyTitle}>
            {verifying
              ? "Verifying Your Candidate Access"
              : success
                ? "Access Verified!"
                : "Sign-In Link Expired or Invalid"}
          </h1>
          <p className={styles.verifyDescription}>
            {verifying
              ? "Securing your session and connecting to your Olentra candidate portal…"
              : success
                ? "Welcome to your Olentra Internship Portal. Redirecting you now…"
                : errorMessage}
          </p>
        </div>

        {status === "error" && (
          <>
            {resendSent ? (
              <p className={styles.verifyResent} role="status">
                If an application exists for that email, a fresh sign-in link has
                been sent. Please check your inbox.
              </p>
            ) : (
              <form onSubmit={handleResend} className={styles.verifyResend}>
                <label htmlFor="verification-email">
                  Send a fresh sign-in link to your email:
                </label>
                <div className={styles.verifyResendControls}>
                  <input
                    id="verification-email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="Your applicant email"
                    value={resendEmail}
                    onChange={(event) => setResendEmail(event.target.value)}
                  />
                  <button
                    type="submit"
                    className={styles.primaryButton}
                    disabled={resendBusy}
                  >
                    {resendBusy ? "Sending…" : "Send Link"}
                  </button>
                </div>
              </form>
            )}

            <nav className={styles.verifyLinks} aria-label="Candidate access">
              <Link href="/intern/login?role=intern">
                Sign in with password <ArrowRight size={13} aria-hidden="true" />
              </Link>
              <span aria-hidden="true">·</span>
              <Link href="/careers/intern">Apply again</Link>
            </nav>
          </>
        )}

        <footer className={styles.verifyFooter}>
          <ShieldCheck size={13} aria-hidden="true" />
          <span>Olentra Internship Candidate Access</span>
        </footer>
      </section>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <InternThemeProvider>
      <InternThemeToggle floating />
      <Suspense
        fallback={
          <main className={styles.loadingPage}>
            <LoadingIndicator label="Loading verification…" />
          </main>
        }
      >
        <VerifyContent />
      </Suspense>
    </InternThemeProvider>
  );
}
