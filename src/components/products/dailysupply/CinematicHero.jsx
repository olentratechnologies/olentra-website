'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUpRight, Star } from 'lucide-react';
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
          <p className={styles.description}><span>Your neighborhood. Working together.</span><span>Connect stores, daily supplies, and communities in one seamless experience.</span></p>
          <div className={styles.actions}>
            <Link href="/contact" className={styles.primaryButton}>Let’s connect <ArrowUpRight size={18} aria-hidden="true" /></Link>
            <a href="#discover" className={styles.secondaryButton}>Explore DailySupply <ArrowDown size={16} aria-hidden="true" /></a>
          </div>
          <div className={styles.collaboration} role="region" aria-label="Collaborators">
            <span className={styles.collaborationRule} aria-hidden="true" />
            <span className={styles.collaborationLabel}>In collaboration with</span>
            <span className={styles.collaborationRule} aria-hidden="true" />
          </div>

        </div>
      </div>

      <div className={styles.founders} aria-label="In collaboration with VitaTech Solutions and BYP Capital">
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

      <div className={styles.bottom}>
        <span><i /> Built around your everyday</span>
        <a href="#discover" aria-label="Discover DailySupply"><span>Discover the connection</span><ArrowDown size={14} aria-hidden="true" /></a>
        <span className={styles.edition}>An Olentra product / 01</span>
      </div>
    </section>
  );
}
