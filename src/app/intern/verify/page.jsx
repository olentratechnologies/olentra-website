"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useInternship } from "@/components/intern/InternshipProvider";
import CompanyBrand from "@/components/intern/CompanyBrand";
import styles from "@/components/intern/auth/auth.module.css";

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

  return (
    <main className={styles.authPage}>
      <div className={styles.backgroundOrbit} />
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            maxWidth: "460px",
            width: "100%",
            background: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(56, 189, 248, 0.2)",
            borderRadius: "20px",
            padding: "40px 32px",
            boxShadow:
              "0 20px 50px rgba(0, 0, 0, 0.6), 0 0 40px rgba(37, 99, 235, 0.15)",
            textAlign: "center",
            color: "#f8fafc",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "28px",
            }}
          >
            <CompanyBrand priority />
          </div>

          {status === "verifying" && (
            <div>
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  margin: "0 auto 20px",
                  borderRadius: "50%",
                  background:
                    "linear-gradient(135deg, rgba(37,99,235,0.2), rgba(59,130,246,0.1))",
                  border: "1px solid rgba(59,130,246,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <LoaderCircle
                  size={32}
                  style={{
                    color: "#60a5fa",
                    animation: "spin 1.2s linear infinite",
                  }}
                />
              </div>
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: 600,
                  margin: "0 0 8px",
                  color: "#ffffff",
                }}
              >
                Verifying Your Candidate Access
              </h2>
              <p
                style={{
                  fontSize: "14px",
                  color: "#94a3b8",
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                Securing your session and connecting to your Olentra candidate
                portal…
              </p>
            </div>
          )}

          {status === "success" && (
            <div>
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  margin: "0 auto 20px",
                  borderRadius: "50%",
                  background:
                    "linear-gradient(135deg, rgba(34,197,94,0.2), rgba(16,185,129,0.1))",
                  border: "1px solid rgba(34,197,94,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CheckCircle2 size={32} style={{ color: "#4ade80" }} />
              </div>
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: 600,
                  margin: "0 0 8px",
                  color: "#ffffff",
                }}
              >
                Access Verified!
              </h2>
              <p
                style={{
                  fontSize: "14px",
                  color: "#94a3b8",
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                Welcome to your Olentra Internship Portal. Redirecting you
                now…
              </p>
            </div>
          )}

          {status === "error" && (
            <div>
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  margin: "0 auto 20px",
                  borderRadius: "50%",
                  background:
                    "linear-gradient(135deg, rgba(239,68,68,0.2), rgba(220,38,38,0.1))",
                  border: "1px solid rgba(239,68,68,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AlertCircle size={32} style={{ color: "#f87171" }} />
              </div>
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: 600,
                  margin: "0 0 8px",
                  color: "#ffffff",
                }}
              >
                Sign-In Link Expired or Invalid
              </h2>
              <p
                style={{
                  fontSize: "14px",
                  color: "#cbd5e1",
                  margin: "0 0 24px",
                  lineHeight: 1.5,
                }}
              >
                {errorMessage}
              </p>

              {resendSent ? (
                <div
                  style={{
                    background: "rgba(34,197,94,0.1)",
                    border: "1px solid rgba(34,197,94,0.25)",
                    borderRadius: "12px",
                    padding: "16px",
                    marginBottom: "20px",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: "13px",
                      color: "#86efac",
                      lineHeight: 1.5,
                    }}
                  >
                    If an application exists for that email, a fresh sign-in link
                    has been sent. Please check your inbox.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={handleResend}
                  style={{
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(51, 65, 85, 0.6)",
                    borderRadius: "14px",
                    padding: "16px",
                    marginBottom: "20px",
                    textAlign: "left",
                  }}
                >
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "#94a3b8",
                      marginBottom: "8px",
                    }}
                  >
                    Send a fresh sign-in link to your email:
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="email"
                      required
                      placeholder="Your applicant email"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      style={{
                        flex: 1,
                        background: "#0b1220",
                        border: "1px solid #334155",
                        borderRadius: "8px",
                        padding: "10px 14px",
                        fontSize: "13px",
                        color: "#ffffff",
                        outline: "none",
                      }}
                    />
                    <button
                      type="submit"
                      disabled={resendBusy}
                      style={{
                        background: "#2563eb",
                        border: "none",
                        borderRadius: "8px",
                        padding: "0 16px",
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "#ffffff",
                        cursor: resendBusy ? "not-allowed" : "pointer",
                        opacity: resendBusy ? 0.7 : 1,
                      }}
                    >
                      {resendBusy ? "Sending…" : "Send Link"}
                    </button>
                  </div>
                </form>
              )}

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "center",
                  alignItems: "center",
                  marginTop: "16px",
                }}
              >
                <Link
                  href="/intern/login?role=intern"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "13px",
                    color: "#60a5fa",
                    textDecoration: "none",
                  }}
                >
                  Sign in with password <ArrowRight size={13} />
                </Link>
                <span style={{ color: "#475569" }}>·</span>
                <Link
                  href="/careers/intern"
                  style={{
                    fontSize: "13px",
                    color: "#94a3b8",
                    textDecoration: "none",
                  }}
                >
                  Apply again
                </Link>
              </div>
            </div>
          )}

          <div
            style={{
              marginTop: "28px",
              paddingTop: "20px",
              borderTop: "1px solid rgba(30, 41, 59, 0.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              fontSize: "11px",
              color: "#64748b",
            }}
          >
            <ShieldCheck size={13} />
            <span>Olentra Internship Candidate Access</span>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0c0f17",
            color: "#94a3b8",
            fontSize: "14px",
          }}
        >
          Loading verification…
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
