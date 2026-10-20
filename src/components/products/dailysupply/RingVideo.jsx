'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import styles from './cinematic.module.css';

export default function RingVideo({ active = true, revealed = true, onReady }) {
  const videoRef = useRef(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    if (reduced.matches) onReady?.();
    else if (!video.getAttribute('src')) video.src = '/videos/dailysupply-rings-aligned-4k.mp4';
    const sync = () => {
      if (!active || paused || reduced.matches || document.hidden || !visible) {
        video.pause();
      } else {
        if (!video.getAttribute('src')) video.src = '/videos/dailysupply-rings-aligned-4k.mp4';
        video.play().catch(() => {});
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    observer.observe(video);
    reduced.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      observer.disconnect();
      reduced.removeEventListener('change', sync);
      document.removeEventListener('visibilitychange', sync);
      video.pause();
    };
  }, [paused, active, onReady]);

  return (
    <>
      <video ref={videoRef} className={styles.ringVideo} data-revealed={revealed} onLoadedData={onReady} poster="/videos/dailysupply-rings-aligned-poster.png" muted loop playsInline preload="auto" aria-hidden="true" />
      {active && <button type="button" className={styles.ringVideoControl} onClick={() => setPaused(!paused)} aria-label={paused ? 'Resume ring video' : 'Pause ring video'} aria-pressed={paused}>
        {paused ? <Play size={13} /> : <Pause size={13} />}
      </button>}
    </>
  );
}
