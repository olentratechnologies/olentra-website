import Image from "next/image";
import styles from "./company-brand.module.css";

export default function CompanyBrand({
  variant = "default",
  className = "",
  priority = false,
}) {
  return (
    <span
      className={`${styles.identity} ${styles[variant] || styles.default} ${className}`}
      data-company-brand
      role="img"
      aria-label="Olentra Technologies"
    >
      <Image
        className={styles.mark}
        src="/images/branding/Logo/Olentra-Logo-Without-Background.png"
        width={64}
        height={64}
        sizes="64px"
        alt=""
        priority={priority}
      />
      <span className={styles.words} aria-hidden="true">
        <span className={styles.name}>OLENTRA</span>
        <span className={styles.technologies}>TECHNOLOGIES</span>
      </span>
    </span>
  );
}
