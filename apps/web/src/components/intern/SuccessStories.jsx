"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { useInternQuery } from "./useInternQuery";
import styles from "./success-stories.module.css";

const PROGRAM_COLOR = "#2583ff";
const initials = (name) => String(name || "").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

/** Approved intern stories (shared with consent) as a gently auto-advancing carousel. */
export default function SuccessStories({ heading }) {
  const query = useInternQuery("story.public", {});
  const stories = query.data || [];
  const railRef = useRef(null);
  const [paused, setPaused] = useState(false);

  const step = (direction) => {
    const rail = railRef.current;
    if (!rail) return;
    const card = rail.querySelector("article");
    const amount = (card?.getBoundingClientRect().width || 320) + 18;
    const atEnd = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4;
    if (direction > 0 && atEnd) rail.scrollTo({ left: 0, behavior: "smooth" });
    else rail.scrollBy({ left: direction * amount, behavior: "smooth" });
  };

  useEffect(() => {
    if (paused || stories.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const timer = setInterval(() => step(1), 6000);
    return () => clearInterval(timer);
  }, [paused, stories.length]);

  if (!stories.length) return null;
  return (
    <section className={styles.section} aria-labelledby="stories-title" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className={styles.header}>
        {heading}
        {stories.length > 1 && (
          <div className={styles.controls}>
            <button type="button" onClick={() => step(-1)} aria-label="Previous story"><ChevronLeft size={18} /></button>
            <button type="button" onClick={() => step(1)} aria-label="Next story"><ChevronRight size={18} /></button>
          </div>
        )}
      </div>
      <div ref={railRef} className={styles.rail} role="list">
        {stories.map((story, index) => (
          <article key={story.id} className={styles.card} role="listitem" style={{ animationDelay: `${index * 80}ms` }}>
            <Quote size={26} className={styles.quoteMark} aria-hidden="true" />
            <p className={styles.quote}>{story.quote}</p>
            <footer className={styles.person}>
              <span className={styles.avatar} style={{ background: PROGRAM_COLOR }}>{initials(story.displayName)}</span>
              <span>
                <strong>{story.displayName}</strong>
                <small>{story.program} intern · Certified</small>
              </span>
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}
