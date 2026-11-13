import { ArrowDown, ArrowRight } from "lucide-react";
import ProductLogo from "./ProductLogo";
import styles from "./ProductHero.module.css";

function splitOnce(text, part) {
  const at = part ? text.lastIndexOf(part) : -1;
  if (at < 0) return [text, "", ""];
  return [text.slice(0, at), part, text.slice(at + part.length)];
}

export default function ProductHero({ product, hero, stats = [], visual = null }) {
  const titleId = `${product}-hero-title`;
  const [nameLead, nameAccent, nameTail] = splitOnce(hero.title, hero.titleAccent);
  const [tagLead, tagMark, tagTail] = splitOnce(hero.tagline, hero.taglineHighlight);

  return (
    <section className={styles.hero} data-product={product} aria-labelledby={titleId}>
      <div className={styles.aurora} aria-hidden="true" />

      <div className={styles.content}>
        <h1 id={titleId} className={styles.lockup}>
          <span className={styles.lockupIcon}>
            <ProductLogo product={product} variant="nav" decorative priority className={styles.lockupLogo} />
          </span>
          <span className={styles.lockupName}>
            {nameLead}
            {nameAccent && <span className={styles.lockupAccent}>{nameAccent}</span>}
            {nameTail}
          </span>
        </h1>
        <p className={styles.tagline}>
          {tagLead}
          {tagMark && <span className={styles.highlight}>{tagMark}</span>}
          {tagTail}
        </p>
        <p className={styles.description}>
          {hero.subheading}
        </p>

        <div className={styles.actions}>
          <a href={hero.primaryCta.href} className={`${styles.button} ${styles.primary}`}>
            {hero.primaryCta.label}
            <ArrowRight size={17} aria-hidden="true" />
          </a>
          <a href={hero.secondaryCta.href} className={`${styles.button} ${styles.secondary}`}>
            {hero.secondaryCta.label}
            <ArrowDown size={16} aria-hidden="true" />
          </a>
        </div>

        {stats.length > 0 && (
          <dl className={styles.facts}>
            {stats.slice(0, 4).map((stat) => (
              <div key={stat.label} className={styles.fact}>
                <dt>{stat.label}</dt>
                <dd>{stat.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {visual && (
        <div className={`${styles.stage} ${styles.reveal}`}>
          <div className={styles.stageGlow} aria-hidden="true" />
          {visual}
        </div>
      )}
    </section>
  );
}
