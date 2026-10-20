'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Pause, Play } from 'lucide-react';
import styles from './cinematic.module.css';

export default function LuminousScene({ onConverged, fading = false }) {
  const hostRef = useRef(null);
  const controller = useRef(null);
  const onConvergedRef = useRef(onConverged);
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    onConvergedRef.current = onConverged;
  }, [onConverged]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const hero = host.closest('section');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let cancelled = false;
    let dispose = () => {};

    // Safety fallback so content is never stuck if WebGL is delayed or inactive
    const safetyTimer = setTimeout(() => {
      if (!cancelled) {
        if (hero) hero.dataset.converged = 'true';
        onConvergedRef.current?.();
      }
    }, 4500);

    async function start() {
      if (reduced.matches) {
        setStatus('static');
        if (hero) {
          hero.dataset.sceneReady = 'true';
          hero.dataset.converged = 'true';
        }
        onConvergedRef.current?.();
        clearTimeout(safetyTimer);
        const enableMotion = () => {
          if (!reduced.matches) {
            reduced.removeEventListener('change', enableMotion);
            start();
          }
        };
        reduced.addEventListener('change', enableMotion);
        dispose = () => reduced.removeEventListener('change', enableMotion);
        return;
      }

      try {
        const { createLuminousScene } = await import('./luminous-scene');
        if (cancelled) return;

        const scene = createLuminousScene(host, {
          onFailure: () => {
            if (!cancelled) {
              setStatus('fallback');
              if (hero) hero.dataset.converged = 'true';
              onConvergedRef.current?.();
              clearTimeout(safetyTimer);
            }
          },
          onConverged: () => {
            if (!cancelled) {
              if (hero) hero.dataset.converged = 'true';
              onConvergedRef.current?.();
              clearTimeout(safetyTimer);
            }
          },
        });

        dispose = scene.dispose;
        // Once initialized, completion follows animation time, including pauses.
        clearTimeout(safetyTimer);
        controller.current = scene;
        setStatus('ready');
        if (hero) hero.dataset.sceneReady = 'true';

        const observer = new IntersectionObserver(
          ([entry]) => scene.setVisible(entry.isIntersecting),
          { threshold: 0.01 }
        );
        if (hero) observer.observe(hero);

        const visibility = () => scene.setDocumentVisible(!document.hidden);
        document.addEventListener('visibilitychange', visibility);
        visibility();

        const motionChange = () => {
          scene.setReduced(reduced.matches);
          setStatus(reduced.matches ? 'static' : 'ready');
          if (reduced.matches) {
            if (hero) hero.dataset.converged = 'true';
            onConvergedRef.current?.();
          }
        };
        reduced.addEventListener('change', motionChange);

        const cleanup = dispose;
        dispose = () => {
          observer.disconnect();
          document.removeEventListener('visibilitychange', visibility);
          reduced.removeEventListener('change', motionChange);
          cleanup();
        };
      } catch {
        dispose();
        if (!cancelled) {
          setStatus('fallback');
          if (hero) hero.dataset.converged = 'true';
          onConvergedRef.current?.();
          clearTimeout(safetyTimer);
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
      dispose();
      controller.current = null;
      if (hero) {
        delete hero.dataset.sceneReady;
        delete hero.dataset.converged;
      }
    };
  }, []);

  const toggle = useCallback(() => {
    setPaused((prev) => {
      const next = !prev;
      controller.current?.setPaused(next);
      const section = hostRef.current?.closest('section');
      if (section) section.dataset.paused = String(next);
      return next;
    });
  }, []);

  return (
    <>
      <div ref={hostRef} className={`${styles.scene} ${styles.ringScene}`} data-status={status} style={fading ? { opacity: 0, transition: 'opacity 600ms ease' } : undefined} aria-hidden="true" />
      {status === 'ready' && !fading && (
        <button
          type="button"
          className={styles.motionControl}
          onClick={toggle}
          aria-label={paused ? 'Resume animation' : 'Pause animation'}
          aria-pressed={paused}
        >
          {paused ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />}
          <span>{paused ? 'Resume motion' : 'Pause motion'}</span>
        </button>
      )}
    </>
  );
}
