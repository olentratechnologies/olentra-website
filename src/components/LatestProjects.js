"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, ArrowUpRight, Layers, Clock3 } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import { projects } from '../data/projects';
import styles from './latest-projects.module.css';

const projectDetails = [
  ['Built an e-commerce experience that brings silk collections, product discovery, and online shopping together.', 'Next.js · Node.js', 'Cloud infrastructure on AWS'],
  ['Created a job discovery platform that makes finding government opportunities and career updates simpler.', 'Search-friendly discovery', 'Powered by Appwrite'],
  ['Built a fintech dashboard that turns financial data into clear, accessible insights.', 'Interactive data charts', 'React · Vercel'],
  ['Created an AI-powered trading platform with strategy insights and automated reporting.', 'GPT strategy insights', 'Automated reporting'],
  ['Built a streetwear shopping experience that puts bold collections and effortless discovery first.', 'Fashion commerce', 'Shopify experience'],
  ['Redesigned an e-commerce platform around intuitive browsing and a considered shopping experience.', 'Product discovery', 'E-commerce redesign'],
  ['Designed a SaaS dashboard that brings analytics and everyday workflows into one clear interface.', 'Dashboard design', 'Analytics experience'],
  ['Designed a mobile fitness experience that makes everyday activity easier to explore.', 'Mobile-first design', 'Fitness experience'],
];

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
  const [viewportRef, api] = useEmblaCarousel({ loop: items.length > 2, align: 'center', containScroll: false, duration: 18, skipSnaps: true });
  const [selected, setSelected] = useState(0);
  const [canPrevious, setCanPrevious] = useState(false);
  const [canNext, setCanNext] = useState(items.length > 1);
  const carouselRef = useRef(null);
  const inertiaIdRef = useRef(null);
  const isCoastingRef = useRef(false);

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
      cards.forEach(({ node, center, loopPoint }) => {
        if (!node) return;
        if (reducedMotion.matches) {
          node.style.transform = 'none';
          node.style.visibility = 'visible';
          return;
        }
        const loopOffset = loopPoint ? engine.axis.direction(loopPoint.slideLocation.get()) : 0;
        const offset = center + trackOffset + loopOffset;
        const angle = offset / radius;
        node.style.visibility = Math.abs(angle) > Math.PI / 2 ? 'hidden' : 'visible';
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
  }, [api]);

  useEffect(() => {
    if (!api) return undefined;
    const root = api.rootNode();
    const doc = root.ownerDocument;
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

      if (reduced || samples.length < 2) {
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

    root.addEventListener('mousedown', rememberStart, true);
    root.addEventListener('touchstart', rememberStart, { capture: true, passive: true });
    root.addEventListener('touchcancel', cancelMomentum, true);
    root.addEventListener('contextmenu', cancelMomentum, true);
    api.on('pointerDown', start).on('pointerUp', release).on('reInit', stop);

    return () => {
      stop();
      stopInertia();
      root.removeEventListener('mousedown', rememberStart, true);
      root.removeEventListener('touchstart', rememberStart, true);
      root.removeEventListener('touchcancel', cancelMomentum, true);
      root.removeEventListener('contextmenu', cancelMomentum, true);
      api.off('pointerDown', start).off('pointerUp', release).off('reInit', stop);
    };
  }, [api]);

  useEffect(() => {
    // Remove keyboard focus from a card that is no longer the active slide.
    const focused = document.activeElement;
    if (focused?.closest('[data-project-card]') && carouselRef.current?.contains(focused)) carouselRef.current.focus({ preventScroll: true });
  }, [selected]);

  const navigate = useCallback((direction) => {
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
    if (inertiaIdRef.current) {
      cancelAnimationFrame(inertiaIdRef.current);
      inertiaIdRef.current = null;
    }
    isCoastingRef.current = false;
    api?.scrollTo(index, window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  };

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
      <div ref={viewportRef} className={styles.viewport}>
        <div className={styles.track}>
          {items.map((project, index) => {
            const active = index === selected;
            // Existing placeholder destinations point to the homepage contact section.
            const href = project.href === '/contact' ? '/#contact' : project.href;
            const external = href.startsWith('http');
            return (
              <div key={project.title} className={styles.slide} role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${items.length}: ${project.title}`} aria-hidden={!active}>
                <a data-project-card className={styles.card} data-active={active}
                  href={href} target={external ? '_blank' : undefined}
                  rel={external ? 'noopener noreferrer' : undefined}
                  tabIndex={active ? 0 : -1} draggable={false}
                  onClickCapture={(event) => {
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
                  }}
                  aria-label={`${external ? 'Visit' : 'Enquire about'} ${project.title}`}>

                  <div className={styles.cardCopy}>
                    <div className={styles.brandRow}>
                      <span className={styles.brandMark} aria-hidden="true">{project.title.split(' ').map((word) => word[0]).slice(0, 2).join('')}</span>
                      <h3>{project.title}</h3>
                    </div>
                    <p>{projectDetails[index][0]}</p>
                    <div className={styles.features}>
                      <div><Layers strokeWidth={1.6} /><span>{projectDetails[index][1]}</span></div>
                      <div><Clock3 strokeWidth={1.6} /><span>{projectDetails[index][2]}</span></div>
                    </div>
                  </div>
                  <div className={styles.preview}>
                    <Image src={project.image} alt={`${project.title} project preview`} fill sizes="(max-width: 640px) 84vw, (max-width: 1024px) 46vw, 460px" className={styles.image} draggable={false} />
                    <span className={styles.visit} aria-hidden="true">{external ? 'View site' : 'Enquire'}<ArrowUpRight size={18} /></span>
                  </div>
                </a>
              </div>
            );
          })}
        </div>
      </div>
      <div className={styles.pagination} aria-label="Project pagination">{items.map((project, index) => <button key={project.title} type="button" aria-label={`Show ${project.title}`} aria-pressed={selected === index} onClick={() => select(index)}><span /></button>)}</div>
      <span className="sr-only" aria-live="polite" aria-atomic="true">{items[selected].title}, project {selected + 1} of {items.length}</span>
    </div>
  );
}
