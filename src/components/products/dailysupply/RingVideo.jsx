'use client';

import { useEffect, useRef } from 'react';
import styles from './cinematic.module.css';

export default function RingVideo({ active = true, revealed = true, onReady }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    if (reduced.matches) onReady?.();
    else if (!video.getAttribute('src')) video.src = '/videos/dailysupply-rings-aligned-4k.mp4';
    const sync = () => {
      if (!active || reduced.matches || document.hidden || !visible) {
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
  }, [active, onReady]);

  return (
    <video
      ref={videoRef}
      className={styles.ringVideo}
      data-revealed={revealed}
      onLoadedData={onReady}
      poster="/videos/dailysupply-rings-aligned-poster.png"
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden="true"
    />
  );
}
