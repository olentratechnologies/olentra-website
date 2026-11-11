import { ArrowUpRight, Check, FileText, LockKeyhole, ShieldCheck } from "lucide-react";
import { renderEmailTemplate } from "@/lib/admin/email-template-catalog.mjs";
import styles from "./enterprise-email.module.css";

const LOGO = "/images/branding/Logo/Olentra-Logo-Without-Background.png";

function Brand() {
  return <div className={styles.brand}>
    <span className={styles.logoFrame}><img src={LOGO} width="56" height="56" alt="" /></span>
    <span className={styles.wordmark}>olentra<span>TECHNOLOGIES</span></span>
  </div>;
}

function Action({ cta }) {
  return <div className={styles.actionGroup}><span className={styles.action} aria-disabled="true">{cta.label}<ArrowUpRight size={16} aria-hidden="true" /></span></div>;
}

/** Controlled email presentation: all dynamic content is rendered as escaped text. */
export function EnterpriseEmail({ type, variant, compact = false }) {
  const message = renderEmailTemplate(type, variant);
  const presentation = message.presentation;
  const tone = presentation.statusTone;
  const StatusIcon = type.id.startsWith("account.") ? ShieldCheck : tone === "success" ? Check : FileText;
  const isLetter = variant.presetId === "warm";
  const isMemo = variant.presetId === "minimal";
  const paragraphs = compact ? message.body.slice(0, 2) : message.body;
  const details = compact ? presentation.details.slice(0, 2) : presentation.details;

  return <article className={`${styles.email} ${styles[variant.presetId]} ${compact ? styles.compact : ""}`} aria-label={compact ? undefined : `${variant.label} email preview`}>
    <div className={styles.accent} />
    <header className={styles.masthead}>
      <Brand />
      <div className={styles.department}><span>OLENTRA</span>{presentation.department}</div>
    </header>
    <div className={styles.hero}>
      <div className={styles.documentLine}><span>{presentation.eyebrow}</span><span className={`${styles.status} ${styles[tone]}`}><i aria-hidden="true" />{presentation.status}</span></div>
      {isLetter && <div className={styles.heroMonogram} aria-hidden="true">O</div>}
      {!isMemo && <span className={styles.statusIcon}><StatusIcon size={23} strokeWidth={1.6} aria-hidden="true" /></span>}
      <h3 className={styles.headline}>{message.heading}</h3>
      <p className={styles.summary}>{presentation.summary}</p>
      <div className={styles.reference}><span>{presentation.reference.label}</span><strong>{presentation.reference.value}</strong></div>
    </div>
    <div className={styles.content}>
      <div className={styles.paragraphs}>{paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
      {type.audience === "users" && <Action cta={message.cta} />}
      <section className={styles.detailPanel} aria-label="Message details">
        <div className={styles.sectionLabel}>{isMemo ? "AT A GLANCE" : isLetter ? "THE DETAILS" : "RECORD SUMMARY"}<span>{presentation.department}</span></div>
        <dl className={styles.details}>{details.map(detail => <div key={detail.label}><dt>{detail.label}</dt><dd>{detail.value}</dd></div>)}</dl>
      </section>
      {type.audience === "team" && <Action cta={message.cta} />}
      {!compact && presentation.nextSteps.length > 0 && <section className={styles.nextSteps}>
        <h4>{type.audience === "team" ? "Recommended action" : "Your next steps"}</h4>
        <ol>{presentation.nextSteps.map((step, index) => <li key={step}><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><p>{step}</p></li>)}</ol>
      </section>}
      {!compact && presentation.notice && <aside className={styles.notice}>
        <LockKeyhole size={16} strokeWidth={1.6} aria-hidden="true" /><div><strong>{presentation.notice.title}</strong><p>{presentation.notice.body}</p></div>
      </aside>}
      {!compact && <div className={styles.signature}>
        {isLetter && <span className={styles.signatureRule} />}
        <p>{isLetter ? "With regards," : "Regards,"}</p><strong>{presentation.signature.team}</strong><span>{presentation.signature.role} · Olentra Technologies</span>
      </div>}
    </div>
    <footer className={styles.footer}>
      <div className={styles.footerTop}><strong>Olentra Technologies</strong><span>Hyderabad, India</span></div>
      <p>{type.audience === "team" ? "An operational update for your Olentra workspace." : "You received this message in connection with your activity with Olentra."}</p>
      <div className={styles.footerLinks}><span>olentratechnologies.com</span><span>Contact our team</span><span>Privacy</span></div>
      {!compact && <div className={styles.support}>Need assistance? <span>contact@olentratechnologies.com</span></div>}
    </footer>
  </article>;
}
