import Image from "next/image";
import styles from "./LoadingIndicator.module.css";

// Shared by the website intro and request-driven workspace loading states.
export function LoadingAnimation({ compact = false, priority = false }) {
  return <div className={`${styles.animation} ${compact ? styles.smallAnimation : ""}`} aria-hidden="true">
    <Image
      src="/images/branding/Logo/Olentra-Logo-Without-Background.png"
      alt=""
      width={64}
      height={64}
      className={styles.logo}
      priority={priority}
    />
    <div className={styles.track}><span className={styles.laser} /></div>
  </div>;
}

export default function LoadingIndicator({ label = "Loading…", compact = false, className = "" }) {
  return <div className={`${styles.indicator} ${compact ? styles.compact : ""} ${className}`} role="status" aria-live="polite" aria-busy="true" data-loading-indicator>
    <LoadingAnimation compact={compact} />
    <span className={styles.label}>{label}</span>
  </div>;
}
