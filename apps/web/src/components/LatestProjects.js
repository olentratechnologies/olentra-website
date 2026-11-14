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

const NATIVE_QUERY = '(max-width: 768px)';
// Mobile infinite loop: render the projects this many times and keep the
// reader in the middle set (see recenter in the native effect).
const LOOP_COPIES = 7;
const LOOP_MIDDLE = Math.floor(LOOP_COPIES / 2);

function ProjectCarousel({ items }) {
  const [viewportRef, api] = useEmblaCarousel({
    loop: items.length > 2,
    align: 'center',
    containScroll: false,
    duration: 18,
    skipSnaps: true,
    // Mobile uses the browser's native scroller instead (see the native effect below).
    breakpoints: { [NATIVE_QUERY]: { active: false } },
  });
  const [selected, setSelected] = useState(0);
  const [canPrevious, setCanPrevious] = useState(false);
  const [canNext, setCanNext] = useState(items.length > 1);
  const carouselRef = useRef(null);
  const inertiaIdRef = useRef(null);
  const isCoastingRef = useRef(false);
  // Phones/small tablets scroll natively (like apple.com's galleries): the
  // browser runs the swipe and momentum on its compositor thread, so it never
  // drops frames. Desktop keeps the Embla wheel.
  const [native, setNative] = useState(false);
  const nativeRef = useRef(null);
  const selectedRef = useRef(0);

  useEffect(() => {
    const query = window.matchMedia(NATIVE_QUERY);
    const update = () => setNative(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!api || native) return undefined;
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
      cards.forEach((card) => {
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
    };

    const sync = () => {
      setSelected(api.selectedScrollSnap());
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
  }, [api, native]);

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

  useEffect(() => {
    if (!native) return undefined;
    const scroller = carouselRef.current?.querySelector('[data-carousel-viewport]');
    if (!scroller) return undefined;
    const count = items.length;
    const slides = [...scroller.firstElementChild.children];
    const cards = slides.map((slide) => slide.firstElementChild);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    // Browsers with CSS scroll-driven animations draw the arc off the main thread.
    // Others get the same arc from a lightweight scroll listener.
    const cssArc = window.CSS?.supports?.('animation-timeline: view()');
    const supportsScrollEnd = 'onscrollend' in window;
    const clearCards = () => cards.forEach((card) => {
      card.style.transform = '';
      card.style.visibility = '';
    });
    clearCards(); // drop any transforms left by the desktop wheel

    let frame = 0;
    let settleTimer = 0;
    let touching = false;
    let rawIndex = -1;
    let geometry = { first: 0, step: 1, setWidth: 1, radius: 1, centers: [] };

    const measure = () => {
      const centers = slides.map((slide) => slide.offsetLeft + slide.offsetWidth / 2);
      const step = centers.length > 1 ? centers[1] - centers[0] : scroller.clientWidth;
      geometry = {
        first: centers[0] || 0,
        step: step || 1,
        // Exact distance between a card and its copy in the next set.
        setWidth: centers.length > count ? centers[count] - centers[0] : (step || 1) * count,
        radius: (step || 1) / (window.innerWidth < 640 ? 0.20 : 0.25),
        centers,
      };
    };

    const leftFor = (index) => geometry.first + index * geometry.step - scroller.clientWidth / 2;

    const paintArc = () => {
      if (cssArc) return;
      if (reducedMotion.matches) {
        clearCards();
        return;
      }
      const viewCenter = scroller.scrollLeft + scroller.clientWidth / 2;
      const { radius, centers } = geometry;
      cards.forEach((card, index) => {
        const offset = centers[index] - viewCenter;
        if (Math.abs(offset) > scroller.clientWidth * 1.5) return; // far off-screen
        const angle = offset / radius;
        const x = radius * Math.sin(angle) - offset;
        const y = radius * (1 - Math.cos(angle));
        card.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${angle}rad)`;
      });
    };

    const update = () => {
      frame = 0;
      const { first, step } = geometry;
      const viewCenter = scroller.scrollLeft + scroller.clientWidth / 2;
      const index = Math.min(Math.max(Math.round((viewCenter - first) / step), 0), slides.length - 1);
      if (index !== rawIndex) {
        const previousReal = rawIndex < 0 ? -1 : rawIndex % count;
        rawIndex = index;
        if (index % count !== previousReal) {
          // Low priority so React never competes with a scroll frame.
          startTransition(() => setSelected(index % count));
        }
      }
      paintArc();
    };

    // Infinite loop: the cards are rendered LOOP_COPIES times. Once scrolling
    // has fully stopped, silently jump to the identical card in the middle set
    // so there is always plenty of runway in both directions. Jumping only at
    // rest never interrupts the phone's own momentum.
    const recenter = () => {
      // scrollend can arrive before the queued frame; read the final position now.
      if (frame) cancelAnimationFrame(frame);
      update();
      if (touching || rawIndex < 0) return;
      const copy = Math.floor(rawIndex / count);
      if (copy === LOOP_MIDDLE) return;
      const shift = (copy - LOOP_MIDDLE) * geometry.setWidth;
      scroller.scrollTo({ left: scroller.scrollLeft - shift, behavior: 'instant' });
      update();
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
      // Safety net for browsers without (or with unreliable) scrollend.
      clearTimeout(settleTimer);
      settleTimer = window.setTimeout(recenter, supportsScrollEnd ? 400 : 160);
    };
    const onTouchStart = () => {
      touching = true;
    };
    const onTouchEnd = () => {
      touching = false;
      clearTimeout(settleTimer);
      settleTimer = window.setTimeout(recenter, supportsScrollEnd ? 400 : 160);
    };

    nativeRef.current = {
      step: (direction) => {
        scroller.scrollTo({ left: leftFor(rawIndex + direction), behavior: reducedMotion.matches ? 'auto' : 'smooth' });
      },
      goToProject: (projectIndex) => {
        // Travel to the nearest copy of that project, whichever way is shorter.
        const base = rawIndex - (rawIndex % count);
        const options = [base + projectIndex - count, base + projectIndex, base + projectIndex + count]
          .filter((option) => option >= 0 && option < slides.length);
        const target = options.reduce((best, option) => (
          Math.abs(option - rawIndex) < Math.abs(best - rawIndex) ? option : best), options[0]);
        scroller.scrollTo({ left: leftFor(target), behavior: reducedMotion.matches ? 'auto' : 'smooth' });
      },
    };

    const resize = new ResizeObserver(() => {
      const current = rawIndex < 0 ? LOOP_MIDDLE * count + selectedRef.current : rawIndex;
      measure();
      scroller.scrollTo({ left: leftFor(current), behavior: 'instant' });
      update();
    });
    resize.observe(scroller);
    scroller.addEventListener('scroll', onScroll, { passive: true });
    if (supportsScrollEnd) scroller.addEventListener('scrollend', recenter);
    scroller.addEventListener('touchstart', onTouchStart, { passive: true });
    scroller.addEventListener('touchend', onTouchEnd, { passive: true });
    scroller.addEventListener('touchcancel', onTouchEnd, { passive: true });
    reducedMotion.addEventListener('change', update);
    measure();
    // Start on the current project in the middle set.
    scroller.scrollTo({ left: leftFor(LOOP_MIDDLE * count + selectedRef.current), behavior: 'instant' });
    update();

    return () => {
      nativeRef.current = null;
      if (frame) cancelAnimationFrame(frame);
      clearTimeout(settleTimer);
      resize.disconnect();
      scroller.removeEventListener('scroll', onScroll);
      scroller.removeEventListener('scrollend', recenter);
      scroller.removeEventListener('touchstart', onTouchStart);
      scroller.removeEventListener('touchend', onTouchEnd);
      scroller.removeEventListener('touchcancel', onTouchEnd);
      reducedMotion.removeEventListener('change', update);
      clearCards();
    };
  }, [native, items.length]);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    // Remove keyboard focus from a card that is no longer the active slide.
    const focused = document.activeElement;
    if (focused?.closest('[data-project-card]') && carouselRef.current?.contains(focused)) carouselRef.current.focus({ preventScroll: true });
  }, [selected]);

  const navigate = useCallback((direction) => {
    if (nativeRef.current) {
      nativeRef.current.step(direction);
      return;
    }
    if (inertiaIdRef.current) {
      cancelAnimationFrame(inertiaIdRef.current);
      inertiaIdRef.current = null;
    }
    isCoastingRef.current = false;
    const instant = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (direction < 0) api?.scrollPrev(instant);
    else api?.scrollNext(instant);
  }, [api]);

  const select = (index) => {
    if (nativeRef.current) {
      nativeRef.current.goToProject(index);
      return;
    }
    if (inertiaIdRef.current) {
      cancelAnimationFrame(inertiaIdRef.current);
      inertiaIdRef.current = null;
    }
    isCoastingRef.current = false;
    api?.scrollTo(index, window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  };

  // Stable so memoized slides skip re-rendering while the carousel moves.
  const handleCardClick = useCallback((event) => {
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
        <button type="button" className={styles.arrow} aria-label="Previous project" disabled={!native && !canPrevious} onClick={() => navigate(-1)}><ArrowLeft size={19} /></button>
        <div className={styles.selectors} aria-label="Choose a project">
          <button type="button" onClick={() => select(Math.max(0, selected - 1))}>{items[Math.max(0, selected - 1)]?.title || ''}</button>
          <button type="button" aria-pressed="true" onClick={() => select(selected)}>{items[selected]?.title || ''}</button>
          <button type="button" onClick={() => select(Math.min(items.length - 1, selected + 1))}>{items[Math.min(items.length - 1, selected + 1)]?.title || ''}</button>
        </div>
        <button type="button" className={styles.arrow} aria-label="Next project" disabled={!native && !canNext} onClick={() => navigate(1)}><ArrowRight size={19} /></button>
      </div>
      <div ref={viewportRef} className={styles.viewport} data-carousel-viewport>
        <div className={styles.track}>
          {native
            ? Array.from({ length: items.length * LOOP_COPIES }, (_, slot) => {
              const index = slot % items.length;
              const clone = Math.floor(slot / items.length) !== LOOP_MIDDLE;
              return (
                <ProjectSlide key={slot} project={items[index]} index={index} total={items.length}
                  active={!clone && index === selected} clone={clone} onClickCapture={handleCardClick} />
              );
            })
            : items.map((project, index) => (
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

const ProjectSlide = memo(function ProjectSlide({ project, index, total, active, clone = false, onClickCapture }) {
  const href = project.href;
  const external = href.startsWith('http');
  return (
    <div className={styles.slide} role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${total}: ${project.title}`} aria-hidden={!active} data-clone={clone || undefined}>
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
