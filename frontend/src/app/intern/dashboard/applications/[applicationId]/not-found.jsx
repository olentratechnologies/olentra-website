import Link from "next/link";
import styles from "@/components/intern/dashboard/pages.module.css";
export default function ApplicantNotFound() {
  return (
    <section className={styles.panel}>
      <div className={styles.emptyState}>
        <h1>Applicant not found</h1>
        <p>This application is not in your internship directory.</p>
        <Link className={styles.button} href="/intern/dashboard/applications">
          Back to Applications
        </Link>
      </div>
    </section>
  );
}
