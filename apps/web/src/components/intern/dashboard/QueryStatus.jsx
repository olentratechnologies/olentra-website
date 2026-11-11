"use client";

import { Button } from "./DashboardUI";
import LoadingIndicator from "@olentra/ui/LoadingIndicator";
import styles from "./QueryStatus.module.css";

export default function QueryStatus({ query, label = "records", compact = false }) {
  if (query.error) return <div className={styles.error} role="alert"><span>{query.error}</span><Button variant="ghost" onClick={() => void query.refresh()}>Try again</Button></div>;
  if (query.loading) return <LoadingIndicator label={`Loading ${label}…`} compact={compact} />;
  if (query.refreshing) return <LoadingIndicator label={`Updating ${label}…`} compact />;
  return null;
}
