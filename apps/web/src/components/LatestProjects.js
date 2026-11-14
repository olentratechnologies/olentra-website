"use client";

import { memo, startTransition, useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, ArrowUpRight, Layers, Clock3 } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import { projects } from '../data/projects';
import styles from './latest-projects.module.css';

export default function LatestProjects() {
  return (
    <section id="projects" data-theme="light" data-testid="latest-projects-section" className={styles.section} aria-labelledby="portfolio-title">
      <div className={styles.heading}>
        <h2 id="portfolio-title">Innovation, Engineered by Olentra</h2>
        <span className="sr-only">Project Portfolio</span>
      </div>
      <ProjectCarousel items={projects} />
    </section>
  );
}

function ProjectCarousel({ items }) {
  const [viewportRef, api] = useEmblaCarousel({
    loop: items.length > 2,
    align: 'center',
    containScroll: false,
    duration: 18,
    skipSnaps: true,
    breakpoints: {
      // Mobile: let Embla own the whole swipe (drag, release, snap) with a
      // slightly softer spring so cards glide into place instead of jumping.
      '(max-width: 768px)': { duration: 30 },
      '(max-width: 768px) and (prefers-reduced-motion: reduce)': {
        duration: 0, skipSnaps: false,
      },
    },
  });
  const [selected, setSelected] = useState(0);
  const [canPrevious, setCanPrevious] = useState(false);
  const [canNext, setCanNext] = useState(items.length > 1);
  const carouselRef = useRef(null);
  const inertiaIdRef = useRef(null);
  const isCoastingRef = useRef(false);
  const caughtSpinRef = useRef(false);
  // While a mobile flick is spinning, the pill follows the card passing the center.
  const followCenterRef = useRef(false);
  const centerIndexRef = useRef(0);

  useEffect(() => {
    if (!api) return undefined;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    let geometry;

    // Embla already measures the untransformed layout on initialization/resize.
    // Reuse it so animation frames only calculate positions and write transforms.
    const measure = () => {
      const engine = api.internalEngine();
      const slides = api.slideNodes();
      const width = engine.containerRect.width;
      const first = engine.slideRects[0];
      if (!width || !first?.width) {
        geometry = null;
        return;
      }
      const gap = Number.parseFloat(window.getComputedStyle(slides[0]).marginRight) || 0;
      const divisor = window.innerWidth < 640 ? 0.20 : window.innerWidth < 1024 ? 0.25 : 0.30;
      geometry = {
        engine,
        radius: (first.width + gap) / divisor,
        cards: slides.map((slide, index) => ({
          node: slide.firstElementChild,
          visibility: '',
          center: engine.slideRects[index].left - engine.containerRect.left
            + engine.slideRects[index].width / 2 - width / 2,
          loopPoint: engine.slideLooper.loopPoints.find((point) => point.index === index),
        })),
      };
    };

    const paint = () => {
      if (!geometry) return;
      const { engine, radius, cards } = geometry;
      // Use the rendered (interpolated) position, including each slide's loop shift,
      // so the arc and track stay aligned on every display refresh.
      const trackOffset = engine.axis.direction(engine.offsetLocation.get());
      let nearestIndex = -1;
      let nearestDistance = Infinity;
      cards.forEach((card, index) => {
        const { node, center, loopPoint } = card;
        if (!node) return;
        if (reducedMotion.matches) {
          node.style.transform = 'none';
          node.style.visibility = 'visible';
          card.visibility = 'visible';
          return;
        }
        const loopOffset = loopPoint ? engine.axis.direction(loopPoint.slideLocation.get()) : 0;
        const offset = center + trackOffset + loopOffset;
        if (Math.abs(offset) < nearestDistance) {
          nearestDistance = Math.abs(offset);
          nearestIndex = index;
        }
        const angle = offset / radius;
        // Only touch visibility when it flips; rewriting it every frame forces
        // extra style recalculation, which shows up as dropped frames on phones.
        const visibility = Math.abs(angle) > Math.PI / 2 ? 'hidden' : 'visible';
        if (card.visibility !== visibility) {
          card.visibility = visibility;
          node.style.visibility = visibility;
        }
        const x = radius * Math.sin(angle) - offset;
        const y = radius * (1 - Math.cos(angle));
        node.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${angle}rad)`;
      });
      if (followCenterRef.current && nearestIndex >= 0 && nearestIndex !== centerIndexRef.current) {
        centerIndexRef.current = nearestIndex;
        // Low priority: React renders between frames instead of blocking one.
        startTransition(() => setSelected(nearestIndex));
      }
    };

    const sync = () => {
      if (!followCenterRef.current) {
        centerIndexRef.current = api.selectedScrollSnap();
        setSelected(centerIndexRef.current);
      }
      setCanPrevious(api.canScrollPrev());
      setCanNext(api.canScrollNext());
    };
    const refresh = () => {
      measure();
      sync();
      paint();
    };

    api.on('scroll', paint).on('settle', paint).on('select', sync).on('reInit', refresh);
    reducedMotion.addEventListener('change', paint);
    // Embla's resize observer handles viewport and slide size changes.
    refresh();

    return () => {
      api.off('scroll', paint).off('settle', paint).off('select', sync).off('reInit', refresh);
      reducedMotion.removeEventListener('change', paint);
    };
  }, [api]);

  useEffect(() => {
    if (!api) return undefined;
    const root = api.rootNode();
    const doc = root.ownerDocument;
    const mobile = window.matchMedia('(max-width: 768px)');
    let isTouch = false;
    let previousX = 0;
    let samples = [];

    const stopInertia = () => {
      if (inertiaIdRef.current) {
        cancelAnimationFrame(inertiaIdRef.current);
        inertiaIdRef.current = null;
      }
      isCoastingRef.current = false;
    };

    const alignToRenderedPosition = () => {
      const engine = api.internalEngine();
      const position = engine.offsetLocation.get();
      engine.animation.stop();
      engine.location.set(position);
      engine.previousLocation.set(position);
      engine.target.set(position);
      // Reset residual physics without moving the visible track. Embla's next
      // drag/settle update restores its normal duration and friction.
      engine.scrollBody.useDuration(0).seek();
    };

    const rememberStart = (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      stopInertia();
      alignToRenderedPosition();
      isTouch = Boolean(event.touches);
      previousX = event.touches ? event.touches[0].clientX : event.clientX;
      const now = performance.now();
      samples = [{ x: previousX, time: now }];
    };

    const accelerate = (event) => {
      const engine = api.internalEngine();
      if (!engine.dragHandler.pointerDown()) return;
      if (event.touches && event.touches.length !== 1) return;
      const x = event.touches ? event.touches[0].clientX : event.clientX;
      const delta = x - previousX;
      previousX = x;

      if (!event.defaultPrevented) return;
      const now = performance.now();
      samples.push({ x, time: now });
      samples = samples.filter((sample) => now - sample.time <= 120);

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      // 1:1 on touchscreens for natural direct-manipulation; responsive 2.4 on mouse pointer
      const speed = reduced || isTouch ? 1 : 2.4;
      if (speed > 1) {
        engine.target.add(engine.axis.direction(delta * (speed - 1)));
        // Keep Embla's interpolated drag physics (0.75 duration / 0.3 friction).
        // Duration zero collapses previous/current positions, producing 60 Hz
        // steps even when the display renders at 120 or 144 Hz.
      }
    };

    const stop = () => {
      doc.removeEventListener('mousemove', accelerate);
      doc.removeEventListener('touchmove', accelerate);
    };

    const release = () => {
      stop();
      stopInertia();
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const engine = api.internalEngine();

      // With fewer projects, Embla can disable looping on wider viewports.
      // Let its bounds handling settle those drags instead of looping manually.
      if (!engine.options.loop || reduced || samples.length < 2) {
        engine.scrollBody.useDuration(25).useFriction(0.72);
        engine.scrollTo.distance(0, true);
        engine.animation.start();
        return;
      }

      const now = performance.now();
      const first = samples[0];
      const last = samples[samples.length - 1];
      const elapsed = last.time - first.time;
      const idle = now - last.time;

      // If user paused before letting go, gently settle on nearest card
      if (elapsed < 10 || idle > 120) {
        engine.scrollBody.useDuration(25).useFriction(0.72);
        engine.scrollTo.distance(0, true);
        engine.animation.start();
        return;
      }

      // Exact pointer velocity in px/ms at release time
      const rawVelocity = ((last.x - first.x) / elapsed) * Math.max(0, 1 - idle / 120);
      if (Math.abs(rawVelocity) < 0.06) {
        engine.scrollBody.useDuration(25).useFriction(0.72);
        engine.scrollTo.distance(0, true);
        engine.animation.start();
        return;
      }

      // Convert to track coordinate velocity per 16.67ms frame
      const dir = engine.axis.direction(1);
      const dragMultiplier = isTouch ? 1.0 : 2.4;
      let velocity = rawVelocity * dir * 16.67 * dragMultiplier;

      // Generous max velocity cap for fast flick spins
      const maxVelocity = isTouch ? 45 : 75;
      velocity = Math.max(-maxVelocity, Math.min(maxVelocity, velocity));

      // Stop Embla's internal animation while custom coasting runs
      alignToRenderedPosition();
      isCoastingRef.current = true;

      // Friction per frame: 0.958 produces a smooth, gradual deceleration over ~1.5 to 2.5 seconds
      const friction = isTouch ? 0.945 : 0.958;
      let lastTime = performance.now();

      const coast = (currentTime) => {
        const deltaMs = Math.min(currentTime - lastTime, 34);
        lastTime = currentTime;
        const timeScale = deltaMs / 16.67;

        // Step location forward
        const step = velocity * timeScale;
        engine.location.add(step);
        engine.offsetLocation.set(engine.location.get());
        engine.target.set(engine.location.get());
        engine.previousLocation.set(engine.location.get());

        // Handle loop wrap
        engine.scrollLooper.loop(Math.sign(velocity));
        engine.slideLooper.loop();

        // Translate track DOM
        engine.translate.to(engine.offsetLocation.get());

        // Update wheel 3D card rotation & layout
        engine.eventHandler.emit('scroll');

        // Gradually slow down
        velocity *= Math.pow(friction, timeScale);

        // Continue until velocity slows down to a gentle roll
        if (Math.abs(velocity) > 0.6) {
          inertiaIdRef.current = requestAnimationFrame(coast);
        } else {
          inertiaIdRef.current = null;
          isCoastingRef.current = false;
          // Smoothly settle and center the nearest card
          engine.scrollBody.useDuration(26).useFriction(0.74);
          engine.scrollTo.distance(0, true);
          engine.animation.start();
        }
      };

      inertiaIdRef.current = requestAnimationFrame(coast);
      samples = [];
    };

    const cancelMomentum = () => {
      stopInertia();
      samples = [];
    };

    const start = () => {
      stop();
      doc.addEventListener('mousemove', accelerate, { passive: true });
      doc.addEventListener('touchmove', accelerate, { passive: true });
    };

    const detachMomentum = () => {
      stop();
      stopInertia();
      samples = [];
      root.removeEventListener('mousedown', rememberStart, true);
      root.removeEventListener('touchstart', rememberStart, true);
      root.removeEventListener('touchcancel', cancelMomentum, true);
      root.removeEventListener('contextmenu', cancelMomentum, true);
      api.off('pointerDown', start).off('pointerUp', release).off('reInit', stop);
    };

    const configureMomentum = () => {
      detachMomentum();
      // On mobile, let Embla own dragging, velocity and snapping end to end.
      // Taking over on release interrupts its motion and makes flicks jump.
      if (mobile.matches) return;
      root.addEventListener('mousedown', rememberStart, true);
      root.addEventListener('touchstart', rememberStart, { capture: true, passive: true });
      root.addEventListener('touchcancel', cancelMomentum, true);
      root.addEventListener('contextmenu', cancelMomentum, true);
      api.on('pointerDown', start).on('pointerUp', release).on('reInit', stop);
    };

    configureMomentum();
    mobile.addEventListener('change', configureMomentum);
    return () => {
      mobile.removeEventListener('change', configureMomentum);
      detachMomentum();
    };
  }, [api]);

  // Mobile flick physics. The glide starts at exactly the finger's release
  // velocity (no jump or kick), throws far so a strong flick spins through many
  // cards, then eases out and lands precisely on a card.
  useEffect(() => {
    if (!api) return undefined;
    const root = api.rootNode();
    const doc = root.ownerDocument;
    const mobile = window.matchMedia('(max-width: 768px)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    // How far a flick travels: ms of release velocity. Higher = longer, faster spins.
    const THROW = 720;
    const EASE_POWER = 3; // ease-out cubic: starting speed = EASE_POWER * distance / duration
    let samples = [];
    // Timestamp of the last frame drawn under the finger; the glide continues from it.
    let lastDrawTime = 0;

    const active = () => mobile.matches && !reducedMotion.matches && api.internalEngine().options.loop;

    const stopGlide = () => {
      if (inertiaIdRef.current) {
        cancelAnimationFrame(inertiaIdRef.current);
        inertiaIdRef.current = null;
      }
      isCoastingRef.current = false;
      followCenterRef.current = false;
    };

    const freezeAtRenderedPosition = () => {
      const engine = api.internalEngine();
      const position = engine.offsetLocation.get();
      engine.animation.stop();
      engine.location.set(position);
      engine.previousLocation.set(position);
      engine.target.set(position);
    };

    const onTouchStart = (event) => {
      if (!active()) return;
      if (inertiaIdRef.current) {
        // Catch the spinning wheel exactly where it is.
        stopGlide();
        freezeAtRenderedPosition();
        const engine = api.internalEngine();
        engine.index.set(centerIndexRef.current);
        engine.eventHandler.emit('select');
      }
      const touch = event.touches[0];
      lastDrawTime = 0;
      samples = [{ x: touch.clientX, time: event.timeStamp || performance.now() }];
    };

    const drawAt = (engine, position, direction) => {
      engine.location.set(position);
      engine.previousLocation.set(position);
      engine.offsetLocation.set(position);
      engine.scrollLooper.loop(direction);
      engine.slideLooper.loop();
      engine.translate.to(engine.offsetLocation.get());
      engine.eventHandler.emit('scroll');
    };

    const onTouchMove = (event) => {
      if (!active() || !samples.length || event.touches.length !== 1) return;
      const now = event.timeStamp || performance.now();
      samples.push({ x: event.touches[0].clientX, time: now });
      while (samples.length > 2 && now - samples[0].time > 80) samples.shift();

      // Embla handled this move first (its listener is on the carousel root).
      // By default it eases the cards toward the finger on a fixed 60 Hz step,
      // which trails the finger and stutters on 90/120 Hz screens. Draw the
      // cards exactly under the finger on every touch frame instead.
      const engine = api.internalEngine();
      if (!event.defaultPrevented || !engine.dragHandler.pointerDown()) return;
      const previous = engine.offsetLocation.get();
      engine.scrollBody.useDuration(0).useFriction(0).seek();
      const position = engine.target.get();
      drawAt(engine, position, Math.sign(position - previous));
      lastDrawTime = now;
    };

    const releaseVelocity = () => {
      if (samples.length < 2) return 0;
      const last = samples[samples.length - 1];
      const idle = performance.now() - last.time;
      if (idle > 90) return 0; // finger paused before lifting
      const first = samples[0];
      const elapsed = last.time - first.time;
      if (elapsed < 8) return 0;
      return (last.x - first.x) / elapsed; // px per ms
    };

    const onPointerUp = () => {
      if (!active()) return;
      const engine = api.internalEngine();
      const velocity = engine.axis.direction(releaseVelocity());
      samples = [];
      // Replace Embla's spring settle with our glide from the rendered position.
      freezeAtRenderedPosition();

      const speed = Math.min(Math.abs(velocity), 6);
      const loopLength = engine.limit.length;
      let throwDistance = Math.sign(velocity) * Math.min(speed * THROW, loopLength * 3);
      if (speed < 0.08) throwDistance = 0;
      const destination = engine.scrollTarget.byDistance(throwDistance, true);
      const distance = destination.distance;
      if (Math.abs(distance) < 0.5) {
        engine.scrollTo.distance(0, true);
        return;
      }

      // Match the curve's starting speed to the finger; clamp for tiny or huge throws.
      const duration = speed >= 0.08
        ? Math.min(Math.max((EASE_POWER * Math.abs(distance)) / speed, 320), 2600)
        : 380;

      engine.target.add(distance);
      if (destination.index !== engine.index.get()) {
        engine.indexPrevious.set(engine.index.get());
        engine.index.set(destination.index);
      }
      isCoastingRef.current = true;
      followCenterRef.current = true;

      // Start the curve at the last finger frame so the first glide frame
      // advances by exactly one frame of the release speed: no pause, no kick.
      const start = lastDrawTime && performance.now() - lastDrawTime < 100 ? lastDrawTime : performance.now();
      let applied = 0;
      const glide = (now) => {
        const t = Math.min(Math.max((now - start) / duration, 0), 1);
        const eased = 1 - Math.pow(1 - t, EASE_POWER);
        const step = distance * eased - applied;
        applied += step;
        drawAt(engine, engine.location.get() + step, Math.sign(step) || Math.sign(distance));
        if (t < 1) {
          inertiaIdRef.current = requestAnimationFrame(glide);
          return;
        }
        inertiaIdRef.current = null;
        isCoastingRef.current = false;
        followCenterRef.current = false;
        engine.location.set(engine.target.get());
        engine.offsetLocation.set(engine.target.get());
        engine.previousLocation.set(engine.target.get());
        engine.translate.to(engine.offsetLocation.get());
        engine.eventHandler.emit('scroll');
        engine.eventHandler.emit('select');
        engine.eventHandler.emit('settle');
      };
      inertiaIdRef.current = requestAnimationFrame(glide);
    };

    root.addEventListener('touchstart', onTouchStart, { capture: true, passive: true });
    doc.addEventListener('touchmove', onTouchMove, { passive: true });
    api.on('pointerUp', onPointerUp);
    return () => {
      stopGlide();
      root.removeEventListener('touchstart', onTouchStart, { capture: true });
      doc.removeEventListener('touchmove', onTouchMove);
      api.off('pointerUp', onPointerUp);
    };
  }, [api]);

  useEffect(() => {
    // Remove keyboard focus from a card that is no longer the active slide.
    const focused = document.activeElement;
    if (focused?.closest('[data-project-card]') && carouselRef.current?.contains(focused)) carouselRef.current.focus({ preventScroll: true });
  }, [selected]);

  // Stop a mobile flick mid-spin so buttons continue from the card in view.
  const haltGlide = useCallback(() => {
    const wasGliding = followCenterRef.current;
    if (inertiaIdRef.current) {
      cancelAnimationFrame(inertiaIdRef.current);
      inertiaIdRef.current = null;
    }
    isCoastingRef.current = false;
    followCenterRef.current = false;
    const engine = api?.internalEngine();
    if (!wasGliding || !engine) return;
    const position = engine.offsetLocation.get();
    engine.location.set(position);
    engine.previousLocation.set(position);
    engine.target.set(position);
    engine.index.set(centerIndexRef.current);
  }, [api]);

  const navigate = useCallback((direction) => {
    haltGlide();
    const instant = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (direction < 0) api?.scrollPrev(instant);
    else api?.scrollNext(instant);
  }, [api, haltGlide]);

  const select = (index) => {
    haltGlide();
    api?.scrollTo(index, window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  };

  // Stable so memoized slides skip re-rendering while the carousel moves.
  const handleCardClick = useCallback((event) => {
    if (caughtSpinRef.current && event.detail > 0) {
      caughtSpinRef.current = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (isCoastingRef.current) {
      event.preventDefault();
      event.stopPropagation();
      if (inertiaIdRef.current) {
        cancelAnimationFrame(inertiaIdRef.current);
        inertiaIdRef.current = null;
      }
      isCoastingRef.current = false;
      const engine = api?.internalEngine();
      if (engine) {
        engine.scrollBody.useDuration(26).useFriction(0.74);
        engine.scrollTo.distance(0, true);
        engine.animation.start();
      }
    }
  }, [api]);

  return (
    <div ref={carouselRef} className={styles.carousel} role="region" aria-roledescription="carousel" aria-label="Project portfolio" tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          navigate(event.key === 'ArrowLeft' ? -1 : 1);
        }
      }}>
      <div className={styles.navigation}>
        <button type="button" className={styles.arrow} aria-label="Previous project" disabled={!canPrevious} onClick={() => navigate(-1)}><ArrowLeft size={19} /></button>
        <div className={styles.selectors} aria-label="Choose a project">
          <button type="button" onClick={() => select(Math.max(0, selected - 1))}>{items[Math.max(0, selected - 1)]?.title || ''}</button>
          <button type="button" aria-pressed="true" onClick={() => select(selected)}>{items[selected]?.title || ''}</button>
          <button type="button" onClick={() => select(Math.min(items.length - 1, selected + 1))}>{items[Math.min(items.length - 1, selected + 1)]?.title || ''}</button>
        </div>
        <button type="button" className={styles.arrow} aria-label="Next project" disabled={!canNext} onClick={() => navigate(1)}><ArrowRight size={19} /></button>
      </div>
      <div ref={viewportRef} className={styles.viewport}
        onPointerDownCapture={(event) => {
          if (!event.isPrimary) return;
          const engine = api?.internalEngine();
          // On touch screens a tap that stops a gliding carousel should only stop it,
          // not open the card that happens to be under the finger.
          caughtSpinRef.current = Boolean(engine && window.matchMedia('(max-width: 768px)').matches
            && Math.abs(engine.target.get() - engine.offsetLocation.get()) > 2);
        }}>
        <div className={styles.track}>
          {items.map((project, index) => (
            <ProjectSlide key={project.title} project={project} index={index} total={items.length}
              active={index === selected} onClickCapture={handleCardClick} />
          ))}
        </div>
      </div>
      <div className={styles.pagination} aria-label="Project pagination">{items.map((project, index) => <button key={project.title} type="button" aria-label={`Show ${project.title}`} aria-pressed={selected === index} onClick={() => select(index)}><span /></button>)}</div>
      <span className="sr-only" aria-live="polite" aria-atomic="true">{items[selected].title}, project {selected + 1} of {items.length}</span>
    </div>
  );
}

const ProjectSlide = memo(function ProjectSlide({ project, index, total, active, onClickCapture }) {
  const href = project.href;
  const external = href.startsWith('http');
  return (
    <div className={styles.slide} role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${total}: ${project.title}`} aria-hidden={!active}>
      <a data-project-card className={styles.card} data-active={active}
        href={href} target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        tabIndex={active ? 0 : -1} draggable={false}
        onClickCapture={onClickCapture}
        aria-label={`${external ? 'Visit' : 'Enquire about'} ${project.title}${project.status ? `, ${project.status}` : ''}`}>

        <div className={styles.cardCopy}>
          <div className={styles.brandRow}>
            <span className={styles.brandMark} aria-hidden="true">{project.title.split(' ').map((word) => word[0]).slice(0, 2).join('')}</span>
            <div className={styles.brandInfo}>
              <h3>{project.title}</h3>
              {project.status && <span className={styles.status}>{project.status}</span>}
            </div>
          </div>
          <p>{project.description}</p>
          <div className={styles.features}>
            <div><Layers strokeWidth={1.6} /><span>{project.features[0]}</span></div>
            <div><Clock3 strokeWidth={1.6} /><span>{project.features[1]}</span></div>
          </div>
        </div>
        <div className={styles.preview}>
          <Image src={project.image} alt={`${project.title} project preview`} fill sizes="(max-width: 640px) 84vw, (max-width: 1024px) 46vw, 460px" className={styles.image} draggable={false} loading="eager" />
          <span className={styles.visit} aria-hidden="true">{external ? 'View site' : 'Enquire'}<ArrowUpRight size={18} /></span>
        </div>
      </a>
    </div>
  );
});
