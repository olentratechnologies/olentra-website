"use client";

import Link from "next/link";
import { Award, BadgeCheck, CalendarDays, SearchX, ShieldCheck } from "lucide-react";
import LoadingIndicator from "@olentra/ui/LoadingIndicator";
import { useInternQuery } from "./useInternQuery";
import styles from "./certificate-verify.module.css";

const formatDate = (value) => {
  const date = new Date(`${String(value || "").slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
};

/** Public check that a shared Olentra internship certificate is genuine. */
export default function CertificateVerify({ number }) {
  const query = useInternQuery("certificate.verify", { number });
  const result = query.data;
  return (
    <main className={styles.page}>
      <section className={styles.card} aria-live="polite">
        {!result && !query.error ? (
          <LoadingIndicator label="Checking certificate…" />
        ) : result?.valid ? (
          <>
            <div className={styles.seal} aria-hidden="true"><BadgeCheck size={38} /></div>
            <p className={styles.eyebrow}><ShieldCheck size={14} /> Verified by Olentra Technologies</p>
            <h1 className={styles.name}>{result.recipient}</h1>
            <p className={styles.lead}>successfully completed the</p>
            <p className={styles.program}><Award size={18} /> {result.program} internship</p>
            <dl className={styles.details}>
              <div><dt><CalendarDays size={14} /> Issued</dt><dd>{formatDate(result.issuedOn)}</dd></div>
              <div><dt>Certificate ID</dt><dd className={styles.mono}>{result.certificateNumber}</dd></div>
              <div><dt>Status</dt><dd><span className={styles.valid}>{result.status}</span></dd></div>
            </dl>
          </>
        ) : (
          <>
            <div className={`${styles.seal} ${styles.sealMissing}`} aria-hidden="true"><SearchX size={34} /></div>
            <h1 className={styles.missingTitle}>We couldn’t find this certificate</h1>
            <p className={styles.lead}>
              {query.error ? "The verification service is unavailable right now. Please try again shortly." : "Check that the link or certificate ID was copied completely. If it still doesn’t match, contact Olentra Technologies."}
            </p>
          </>
        )}
        <Link href="/careers/intern" className={styles.cta}>Explore the Olentra internship program</Link>
      </section>
    </main>
  );
}
