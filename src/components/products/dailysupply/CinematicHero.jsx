'use client';

import { useCallback, useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import RingVideo from './RingVideo';
import LuminousScene from './LuminousScene';
import styles from './cinematic.module.css';

export default function CinematicHero() {
  const [ringPhase, setRingPhase] = useState('intro');
  const [videoReady, setVideoReady] = useState(false);
  const markVideoReady = useCallback(() => setVideoReady(true), []);
  const finishIntro = useCallback(() => setRingPhase((phase) => phase === 'intro' ? 'settled' : phase), []);

  useEffect(() => {
    if (ringPhase === 'settled' && videoReady) setRingPhase('handoff');
  }, [ringPhase, videoReady]);

  useEffect(() => {
    if (ringPhase !== 'handoff') return;
    const timer = setTimeout(() => setRingPhase('video'), 600);
    return () => clearTimeout(timer);
  }, [ringPhase]);

  return (
    <section className={styles.hero} data-theme="dark" aria-labelledby="daily-supply-title">
      <div className={styles.vignette} aria-hidden="true" />

      <div className={styles.content}>
        <div className={styles.topContent}>
          <div className={styles.presentingContainer}>
            <div className={`${styles.presentingWing} ${styles.wingLeft}`} aria-hidden="true">
              <span className={styles.wingLine} />
              <span className={styles.wingGlow} />
              <span className={styles.wingDot} />
            </div>

            <h1 id="daily-supply-title" className={styles.presentingText}>
              PRESENTING
            </h1>

            <div className={`${styles.presentingWing} ${styles.wingRight}`} aria-hidden="true">
              <span className={styles.wingDot} />
              <span className={styles.wingGlow} />
              <span className={styles.wingLine} />
            </div>
          </div>
        </div>
        <div className={styles.brandStage} data-ring-stage="true">
          {ringPhase !== 'video' && <LuminousScene onConverged={finishIntro} fading={ringPhase === 'handoff'} />}
          <RingVideo active={ringPhase === 'video'} revealed={ringPhase === 'handoff' || ringPhase === 'video'} onReady={markVideoReady} />
          <div className={styles.productLockup} data-ring-target="true">
            <img src="/images/products/dailysupply/dailysupply-logo-white-text.png" alt="DailySupply" width="376" height="98" className={styles.productLogo} />
          </div>
        </div>

        <div className={styles.lowerContent}>
          <div className={styles.actions}>
            <div className={`snake-border ${styles.ctaShell}`}>
              <a
                href="https://nexaerp-ivory.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="cc-cta px-5 sm:px-7 md:px-9 py-3 sm:py-3.5 md:py-4 gap-2 sm:gap-2.5 md:gap-3 text-xs sm:text-sm md:text-base font-bold text-white tracking-wide"
              >
                <span>View Product</span>
                <svg className="w-3.5 h-2.5 sm:w-4 sm:h-3 cc-arrow ml-1" viewBox="0 0 16 11" aria-hidden="true">
                  <path d="M0 5.5 H14.6 M10.3 1.2 L14.9 5.5 L10.3 9.8" />
                </svg>
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.collaboration} role="region" aria-label="Our first collaboration product">
        <span className={styles.collaborationRule} aria-hidden="true" />
        <span className={styles.collaborationLabel}>Our first collaboration product</span>
        <span className={styles.collaborationRule} aria-hidden="true" />
      </div>

      <div className={styles.founders} aria-label="Our first collaboration product with VitaTech Solutions and BYP Capital">
        <figure className={`${styles.founder} ${styles.founderLeft}`}>

          <div className={styles.portraitStage}>
            <img src="/images/products/dailysupply/vijay-cutout.png" alt="Vijay of VitaTech Solutions" width="1024" height="1024" className={styles.portrait} />
          </div>
          <figcaption className={styles.founderCaption}>
            <div className={styles.founderBadge}>
              <span className={styles.founderRole}>
                <Star size={10} fill="currentColor" aria-hidden="true" className={styles.founderStar} />
                Founder
                <Star size={10} fill="currentColor" aria-hidden="true" className={styles.founderStar} />
              </span>
              <span className={styles.founderDivider} aria-hidden="true" />
              <span className={styles.founderName}>Vijay</span>
            </div>
            <div className={styles.companyLockup}>
              <span className={styles.companyLogo}><img src="/Company names and product logo/Vitatechsolutions.png" alt="VitaTech Solutions" width="1024" height="1024" /></span>
              <span className={`${styles.founderCompany} ${styles.vitaTech}`}>VitaTechSolutions</span>
            </div>
          </figcaption>
        </figure>
        <figure className={`${styles.founder} ${styles.founderRight}`}>

          <div className={styles.portraitStage}>
            <img src="/images/products/dailysupply/madhu-cutout.png" alt="Madhu of BYP Capital" width="1024" height="1024" className={styles.portrait} />
          </div>
          <figcaption className={styles.founderCaption}>
            <div className={styles.founderBadge}>
              <span className={styles.founderRole}>
                <Star size={10} fill="currentColor" aria-hidden="true" className={styles.founderStar} />
                Founder
                <Star size={10} fill="currentColor" aria-hidden="true" className={styles.founderStar} />
              </span>
              <span className={styles.founderDivider} aria-hidden="true" />
              <span className={styles.founderName}>Madhu</span>
            </div>
            <div className={styles.companyLockup}>
              <span className={`${styles.companyLogo} ${styles.bypLogo}`}><img src="/Company names and product logo/BYPCapital-horizontal.png" alt="BYP Capital" width="1229" height="371" /></span>
              <span className={`${styles.founderCompany} ${styles.capital}`}>BYP <span>Capital</span></span>
            </div>
          </figcaption>
        </figure>
      </div>

    </section>
  );
}
