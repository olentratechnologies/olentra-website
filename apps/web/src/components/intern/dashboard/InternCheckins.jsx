"use client";

import { useState } from "react";
import { Button } from "./DashboardUI";
import { useInternQuery } from "../useInternQuery";
import ui from "./pages.module.css";
import styles from "./staff.module.css";

const MOOD = { 1: "Rough", 2: "Meh", 3: "Okay", 4: "Good", 5: "Great" };

/** An intern's recent weekly check-ins; mentors and admins can reply. */
export default function InternCheckins({ applicationId, commands, notify }) {
  const query = useInternQuery("checkin.list", { applicationId });
  const [drafts, setDrafts] = useState({});
  const [busyId, setBusyId] = useState("");
  const data = query.data;
  if (!data) return <p className={ui.description}>Loading check-ins…</p>;
  if (!data.recent.length) return <p className={ui.description}>No check-ins yet.</p>;
  async function reply(checkin) {
    setBusyId(checkin.id);
    try {
      const result = await commands.replyCheckin(checkin.id, drafts[checkin.id] || "");
      if (!result.ok) { notify(typeof result.error === "string" ? result.error : "Couldn't send the reply."); return; }
      notify("Reply sent.");
      setDrafts((current) => ({ ...current, [checkin.id]: "" }));
      void query.refresh();
    } finally { setBusyId(""); }
  }
  return (
    <div className={styles.checkins}>
      <p className={ui.description}>{data.streak ? `${data.streak}-week streak.` : "No current streak."}</p>
      {data.recent.map((checkin) => (
        <article key={checkin.id}>
          <header><strong>{checkin.week}</strong><span>{MOOD[checkin.mood] || ""}</span></header>
          <p>{checkin.done}</p>
          {checkin.blockers && <p><em>Blockers:</em> {checkin.blockers}</p>}
          {checkin.reply
            ? <blockquote><strong>{checkin.repliedBy}:</strong> {checkin.reply}</blockquote>
            : data.canReply && <form onSubmit={(event) => { event.preventDefault(); void reply(checkin); }}>
                <label className={ui.field}>Reply<textarea rows={2} maxLength={2000} required value={drafts[checkin.id] || ""} onChange={(event) => setDrafts((current) => ({ ...current, [checkin.id]: event.target.value }))} /></label>
                <Button type="submit" disabled={busyId === checkin.id}>{busyId === checkin.id ? "Sending…" : "Send reply"}</Button>
              </form>}
        </article>
      ))}
    </div>
  );
}
