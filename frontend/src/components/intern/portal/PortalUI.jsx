"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Check,
  LoaderCircle,
  LockKeyhole,
} from "lucide-react";
import { useInternship } from "@/components/intern/InternshipProvider";
import LoadingIndicator from "@/components/LoadingIndicator";
import { Modal, formatDate } from "../dashboard/DashboardUI";
import styles from "./portal.module.css";

export { Modal, formatDate };
export function Button({
  children,
  variant = "primary",
  className = "",
  busy,
  ...props
}) {
  return (
    <button
      type="button"
      className={`${styles.button} ${styles[variant] || ""} ${className}`}
      {...props}
    >
      {busy && <LoaderCircle size={15} className={styles.spinner} />}
      {children}
    </button>
  );
}
export function Panel({ children, className = "", ...props }) {
  return (
    <section className={`${styles.panel} ${className}`} {...props}>
      {children}
    </section>
  );
}
export function Heading({ title, description, children }) {
  return (
    <div className={styles.heading}>
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children && <div className={styles.actions}>{children}</div>}
    </div>
  );
}
export function Status({ value }) {
  return (
    <span
      className={styles.status}
      data-status={String(value || "pending")
        .toLowerCase()
        .replaceAll(" ", "-")}
    >
      {value || "Pending"}
    </span>
  );
}
export function ErrorMessage({ children }) {
  return children ? (
    <p className={styles.error} role="alert">
      <AlertCircle size={16} />
      {children}
    </p>
  ) : null;
}
export function Notice({ children, tone = "blue" }) {
  return (
    <div className={styles.notice} data-tone={tone}>
      {children}
    </div>
  );
}
export function EmptyState({
  icon: Icon = Check,
  title,
  description,
  children,
}) {
  return (
    <div className={styles.emptyState}>
      <span>
        <Icon size={26} />
      </span>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {children}
    </div>
  );
}
export function Loading() {
  return (
    <div className={styles.loading}>
      <LoadingIndicator label="Loading your workspace…" />
    </div>
  );
}
export function WorkGate({ children }) {
  const { ready, my } = useInternship();
  if (!ready) return <Loading />;
  if (
    my.application?.status === "Joined" &&
    ["Active", "Completed"].includes(my.intern?.status)
  )
    return (
      <>
        {my.intern.status === "Completed" && (
          <Notice tone="green">
            Your internship is complete. Your projects and submissions remain
            available to view.
          </Notice>
        )}
        {children}
      </>
    );
  return (
    <Panel>
      <EmptyState
        icon={LockKeyhole}
        title={
          my.intern?.status === "Dropped"
            ? "Your project workspace is paused"
            : "Your workspace is almost ready"
        }
        description={
          my.intern?.status === "Dropped"
            ? "Contact the Olentra team through Messages if you need help with your internship status."
            : "Accept your offer and complete onboarding. Once the Olentra team approves your onboarding, your assigned projects and tasks will appear here."
        }
      >
        <Link className={styles.button} href="/intern/portal/application">
          View my application <ArrowRight size={15} />
        </Link>
      </EmptyState>
    </Panel>
  );
}
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run(action, onSuccess) {
    if (busy) return false;
    setBusy(true);
    setError("");
    try {
      const result = await action();
      if (!result?.ok) {
        setError(
          typeof result?.error === "string"
            ? result.error
            : result?.error?.message ||
                "We couldn’t save that change. Please try again.",
        );
        return false;
      }
      await onSuccess?.(result.data);
      return true;
    } catch (failure) {
      setError(failure?.message || "Something went wrong. Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, setError, run };
}
export function Skills({ values = [] }) {
  return (
    <div className={styles.skills}>
      {values.map((skill) => (
        <span key={skill}>{skill}</span>
      ))}
    </div>
  );
}
export function Progress({ value, label = "Progress" }) {
  return (
    <div
      className={styles.progress}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value || 0)}
    >
      <span style={{ width: `${Math.max(0, Math.min(100, value || 0))}%` }} />
    </div>
  );
}
export function safeUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
