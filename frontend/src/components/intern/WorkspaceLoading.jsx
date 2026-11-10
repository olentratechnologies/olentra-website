"use client";

import { usePathname } from "next/navigation";
import LoadingIndicator from "@/components/LoadingIndicator";
import { workspacePageTitle } from "@/lib/intern/workspace-navigation.mjs";
import styles from "./workspace-loading.module.css";

export default function WorkspaceLoading({ pathname, title, state = "loading", onRetry, compact = false }) {
  const currentPathname = usePathname();
  const heading = title || workspacePageTitle(pathname || currentPathname);
  const failed = state === "error";
  return <section className={styles.loading} aria-busy={!failed}>
    {!compact && <header className={styles.header}>
      <h1>{heading}</h1>
      {failed && <p>Your workspace is open. Its latest data could not be loaded.</p>}
    </header>}
    {failed ? <>
      <p className={styles.status} role="alert">Unable to load {heading.toLowerCase()}. Please try again.</p>
      {onRetry && <button type="button" className={styles.retry} onClick={onRetry}>Try again</button>}
    </> : <LoadingIndicator label={`Loading ${heading.toLowerCase()}…`} compact={compact} className={compact ? "" : styles.indicator} />}
  </section>;
}
