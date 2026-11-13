"use client";

import { useState } from "react";
import { BookOpen, Check, ExternalLink } from "lucide-react";
import { useInternship } from "@/components/intern/InternshipProvider";
import { Panel, Progress } from "./PortalUI";
import styles from "./portal.module.css";

const TYPE_LABELS = { article: "Article", video: "Video", course: "Course", doc: "Doc" };

/** Resources for the intern's track, with a tick for each one they've finished. */
export default function LearningResources({ resources }) {
  const { commands, notify } = useInternship();
  const [busyId, setBusyId] = useState("");
  const [overrides, setOverrides] = useState({});
  if (!resources?.length) return null;
  const items = resources.map((item) => ({ ...item, done: overrides[item.id] ?? item.done }));
  const finished = items.filter((item) => item.done).length;
  async function toggle(item) {
    setBusyId(item.id);
    const next = !item.done;
    setOverrides((current) => ({ ...current, [item.id]: next }));
    const result = await commands.completeResource(item.id, next);
    if (!result.ok) {
      setOverrides((current) => ({ ...current, [item.id]: item.done }));
      notify("Couldn't save that. Please try again.");
    }
    setBusyId("");
  }
  return (
    <Panel className={styles.sectionGap}>
      <div className={styles.panelHeader}>
        <h2><BookOpen size={18} aria-hidden="true" /> Learning resources</h2>
        <small>{finished} of {items.length} done</small>
      </div>
      <Progress value={(finished / items.length) * 100} label="Learning resources completed" />
      <ul className={styles.resourceList}>
        {items.map((item) => (
          <li key={item.id} className={item.done ? styles.resourceDone : ""}>
            <button type="button" className={styles.resourceCheck} aria-pressed={item.done} aria-label={`${item.done ? "Mark not done" : "Mark done"}: ${item.title}`} disabled={busyId === item.id} onClick={() => void toggle(item)}>
              {item.done && <Check size={14} aria-hidden="true" />}
            </button>
            <a href={item.url} target="_blank" rel="noreferrer noopener">{item.title} <ExternalLink size={12} aria-hidden="true" /></a>
            <small>{TYPE_LABELS[item.type] || "Link"}{item.minutes ? ` · ${item.minutes} min` : ""}</small>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
