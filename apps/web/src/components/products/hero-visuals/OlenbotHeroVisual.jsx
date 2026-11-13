import { Phone, MessageCircle } from "lucide-react";
import HeroWindow from "./HeroWindow";
import styles from "./HeroVisual.module.css";

const leads = [
  { initials: "HL", company: "Harbor Logistics", role: "Ops Lead", state: "Calling", tone: "live" },
  { initials: "LR", company: "Lumen Retail", role: "Founder", state: "Qualified", tone: "done" },
  { initials: "VC", company: "Vertex Clinics", role: "Admin Head", state: "Follow-up", tone: "warn" },
  { initials: "CF", company: "Cobalt Foods", role: "Sales Manager", state: "Queued", tone: "queued" },
];

const metrics = [
  { label: "Connected", value: "64%", points: "0,22 12,18 24,20 36,12 48,14 60,6 72,8" },
  { label: "Qualified", value: "23", points: "0,24 12,20 24,22 36,16 48,12 60,13 72,5" },
  { label: "Follow-ups sent", value: "41", points: "0,20 12,21 24,15 36,16 48,10 60,8 72,4" },
];

const bars = Array.from({ length: 36 }, (_, i) => 30 + Math.round(50 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6))));

export default function OlenbotHeroVisual() {
  return (
    <HeroWindow
      title="Live outreach · Today"
      meta={
        <>
          <span className={styles.metaPill}>3 agents active</span>
        </>
      }
    >
      <div className={styles.botGrid}>
        <aside className={styles.botQueue}>
          <div className={styles.panelHead}>
            <span>Lead queue</span>
            <span className={styles.muted}>128</span>
          </div>
          <ul className={styles.leadList}>
            {leads.map((lead) => (
              <li key={lead.company} className={`${styles.leadRow} ${lead.tone === "live" ? styles.leadActive : ""}`}>
                <span className={styles.avatar}>{lead.initials}</span>
                <span className={styles.leadText}>
                  <span className={styles.leadName}>{lead.company}</span>
                  <span className={styles.muted}>{lead.role}</span>
                </span>
                <span className={`${styles.chip} ${styles[`chip_${lead.tone}`]}`}>{lead.state}</span>
              </li>
            ))}
          </ul>
        </aside>

        <div className={styles.botCall}>
          <div className={styles.callHead}>
            <span className={styles.callWho}>
              <span className={styles.callIcon}>
                <Phone size={13} />
              </span>
              <span>
                <span className={styles.leadName}>Harbor Logistics</span>
                <span className={styles.muted}> · AI agent on call</span>
              </span>
            </span>
            <span className={styles.liveBadge}>
              <span className={styles.liveDot} />
              Live 02:14
            </span>
          </div>

          <div className={styles.wave}>
            {bars.map((h, i) => (
              <span key={i} style={{ "--h": `${h}%`, "--d": `${(i % 9) * 90}ms` }} />
            ))}
          </div>

          <div className={styles.transcript}>
            <p className={`${styles.bubble} ${styles.bubbleAgent}`}>
              Would a short walkthrough on Thursday work for your team?
            </p>
            <p className={`${styles.bubble} ${styles.bubbleLead}`}>
              Thursday afternoon works. Send the details on WhatsApp.
            </p>
          </div>

          <div className={styles.insights}>
            <span className={`${styles.chip} ${styles.chip_done}`}>Intent · High</span>
            <span className={`${styles.chip} ${styles.chip_live}`}>Sentiment · Positive</span>
            <span className={`${styles.chip} ${styles.chip_queued}`}>
              <MessageCircle size={11} /> WhatsApp follow-up queued
            </span>
          </div>
        </div>

        <aside className={styles.botMetrics}>
          {metrics.map((m) => (
            <div key={m.label} className={styles.metric}>
              <span className={styles.metricLabel}>{m.label}</span>
              <span className={styles.metricValue}>{m.value}</span>
              <svg className={styles.spark} viewBox="0 0 72 28" preserveAspectRatio="none">
                <polyline points={m.points} />
              </svg>
            </div>
          ))}
        </aside>
      </div>
    </HeroWindow>
  );
}
