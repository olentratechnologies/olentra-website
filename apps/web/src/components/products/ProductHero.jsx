import { ArrowDown, ArrowRight } from "lucide-react";
import ProductLogo from "./ProductLogo";
import styles from "./ProductHero.module.css";

export default function ProductHero({ product, hero }) {
  const titleId = `${product}-hero-title`;

  return (
    <section className={styles.hero} aria-labelledby={titleId}>
      <div className={styles.content}>
        <div className={styles.mark}>
          <ProductLogo product={product} priority decorative />
        </div>

        <h1 id={titleId} className={styles.title}>
          {hero.title}
        </h1>
        <p className={styles.tagline}>{hero.tagline}</p>
        <p className={styles.description}>{hero.subheading}</p>

        <div className={styles.actions}>
          <a href={hero.primaryCta.href} className={`${styles.button} ${styles.primary}`}>
            {hero.primaryCta.label}
            <ArrowRight size={18} aria-hidden="true" />
          </a>
          <a href={hero.secondaryCta.href} className={`${styles.button} ${styles.secondary}`}>
            {hero.secondaryCta.label}
            <ArrowDown size={16} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
