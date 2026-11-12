"use client";

import { useState } from "react";
import { MessageSquareQuote, Send, Trash2 } from "lucide-react";
import { useInternship } from "@/components/intern/InternshipProvider";
import { useInternQuery } from "@/components/intern/useInternQuery";
import { burstFrom } from "@/lib/confetti.mjs";
import { Button, ErrorMessage, Panel, useAction } from "./PortalUI";
import styles from "./portal-story.module.css";

const MAX = 280, MIN = 20;
const STATUS = {
  Pending: { label: "Waiting for review", tone: "pending" },
  Approved: { label: "Live on the careers page", tone: "live" },
  Rejected: { label: "Not approved — you can edit and resubmit", tone: "rejected" },
};

/** Certified interns can opt in to share a short story; an admin approves it before it goes public. */
export default function PortalStory() {
  const { commands, notify } = useInternship();
  const mine = useInternQuery("story.mine", {});
  const story = mine.data;
  const [quote, setQuote] = useState(null);
  const [consent, setConsent] = useState(false);
  const action = useAction();
  const value = quote ?? story?.quote ?? "";
  const status = story ? STATUS[story.status] : null;

  async function submit(event) {
    event.preventDefault();
    const trigger = event.nativeEvent?.submitter || event.currentTarget;
    await action.run(() => commands.submitStory({ quote: value.trim(), consent }), async () => {
      burstFrom(trigger, { count: 60 });
      notify("Thanks for sharing! Your story is waiting for the team’s review.");
      setQuote(null);
      setConsent(false);
      await mine.refresh();
    });
  }
  async function withdraw() {
    await action.run(() => commands.withdrawStory(), async () => {
      notify("Your story has been removed.");
      setQuote(null);
      await mine.refresh();
    });
  }

  return (
    <Panel className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.icon}><MessageSquareQuote size={22} /></span>
        <div>
          <h2>Share your story</h2>
          <p>Inspire future interns. With your permission, approved stories appear on the Olentra careers page.</p>
        </div>
      </div>
      {status && (
        <p className={styles.status} data-tone={status.tone}>
          <span aria-hidden="true" /> {status.label}
        </p>
      )}
      <form onSubmit={submit} className={styles.form}>
        <label className={styles.quoteLabel}>
          Your story
          <textarea
            value={value}
            maxLength={MAX}
            rows={3}
            placeholder="What did you learn or build during your internship?"
            onChange={(event) => setQuote(event.target.value)}
          />
          <span className={styles.counter} data-low={value.trim().length > 0 && value.trim().length < MIN}>{value.trim().length}/{MAX}</span>
        </label>
        <label className={styles.consent}>
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
          I agree that Olentra may show my first name, last initial, internship track and this story on its website. I can remove it at any time.
        </label>
        <ErrorMessage>{action.error}</ErrorMessage>
        <div className={styles.actions}>
          {story && (
            <Button variant="secondary" disabled={action.busy} onClick={withdraw}>
              <Trash2 size={14} /> Remove my story
            </Button>
          )}
          <Button type="submit" busy={action.busy} disabled={action.busy || !consent || value.trim().length < MIN}>
            <Send size={14} /> {story ? "Update story" : "Share story"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
