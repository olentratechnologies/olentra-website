import styles from "./HeroVisual.module.css";

/** Browser-style frame used by the product hero mockups. Decorative only. */
export default function HeroWindow({ title, meta, children }) {
  return (
    <div className={styles.window} aria-hidden="true">
      <div className={styles.chrome}>
        <div className={styles.dots}>
          <span />
          <span />
          <span />
        </div>
        <div className={styles.tab}>{title}</div>
        <div className={styles.chromeMeta}>{meta}</div>
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
