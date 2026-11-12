"use client";

import { useState } from "react";
import { Check, MessageSquareQuote, X } from "lucide-react";
import { useInternship } from "@/components/intern/InternshipProvider";
import { useInternQuery } from "../useInternQuery";
import { burstFrom } from "@/lib/confetti.mjs";
import QueryStatus from "./QueryStatus";
import { EmptyState, Panel, TrackBadge, formatDate } from "./DashboardUI";
import styles from "./stories-review.module.css";

const LABEL = { Pending: "Waiting for review", Approved: "Live", Rejected: "Not approved" };

/** Review queue for intern success stories; only admins can publish or reject. */
export default function StoriesReview({ isAdmin }) {
  const { commands, notify } = useInternship();
  const list = useInternQuery("story.list", {});
  const [busyId, setBusyId] = useState(null);
  const stories = list.data || [];
  const pending = stories.filter((story) => story.status === "Pending").length;

  async function review(story, decision, trigger) {
    setBusyId(story.id);
    try {
      const result = await commands.reviewStory(story.id, decision);
      if (!result.ok) { notify(result.error || "This story could not be updated."); return; }
      if (decision === "Approved") burstFrom(trigger, { count: 60 });
      notify(decision === "Approved" ? `${story.displayName}’s story is now live on the careers page.` : `${story.displayName}’s story was not approved.`);
      await list.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Panel className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.icon}><MessageSquareQuote size={20} /></span>
        <div>
          <h2>Success stories {pending > 0 && <b className={styles.count}>{pending} waiting</b>}</h2>
          <p>Certified interns share these with consent. Approved stories appear on the public careers page.</p>
        </div>
      </div>
      <QueryStatus query={list} label="success stories" compact />
      {list.data && !stories.length ? (
        <EmptyState title="No stories yet" description="Certified interns can share a story from their certificates page." />
      ) : (
        <ul className={styles.list}>
          {stories.map((story) => (
            <li key={story.id} className={styles.item} data-status={story.status}>
              <blockquote>“{story.quote}”</blockquote>
              <div className={styles.meta}>
                <strong>{story.displayName}</strong>
                <TrackBadge programId={story.programId} />
                <span>{formatDate(story.submittedOn)}</span>
                <span className={styles.status}>{LABEL[story.status] || story.status}</span>
              </div>
              {isAdmin && story.status !== "Approved" && (
                <div className={styles.actions}>
                  <button type="button" className={styles.approve} disabled={busyId === story.id} onClick={(event) => review(story, "Approved", event.currentTarget)}>
                    <Check size={14} /> Approve
                  </button>
                  {story.status === "Pending" && (
                    <button type="button" className={styles.reject} disabled={busyId === story.id} onClick={(event) => review(story, "Rejected", event.currentTarget)}>
                      <X size={14} /> Reject
                    </button>
                  )}
                </div>
              )}
              {isAdmin && story.status === "Approved" && (
                <div className={styles.actions}>
                  <button type="button" className={styles.reject} disabled={busyId === story.id} onClick={(event) => review(story, "Rejected", event.currentTarget)}>
                    <X size={14} /> Unpublish
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
