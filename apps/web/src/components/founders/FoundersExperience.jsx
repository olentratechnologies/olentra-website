"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { founders, foundersContent as content } from "@/data/founders";
import styles from "./founders.module.css";
import { Feature } from "@olentra/site-features/react";

function Label({ children, number }) {
  return (
    <div className={styles.label}>
      {number && <span>{number} /</span>}
      {children}
    </div>
  );
}
function Heading({ lines, className = "" }) {
  return (
    <h2 className={`${styles.heading} ${className}`}>
      {lines.map((line, i) => (
        <span key={line} className={i ? styles.muted : undefined}>
          {line}
        </span>
      ))}
    </h2>
  );
}
function Portrait({ founder, hero = false, index }) {
  return (
    <figure className={`${styles.portrait} ${hero ? styles.heroPortrait : ""}`}>
      {founder.image ? (
        <>
          <Image
            src={founder.image}
            alt={founder.imageAlt}
            fill
            sizes={
              hero
                ? "(max-width: 767px) 45vw, 26vw"
                : "(max-width: 767px) 90vw, 46vw"
            }
            priority={hero}
            loading={hero ? "eager" : "lazy"}
            style={{ objectPosition: founder.focalPoint }}
            className={founder.mobileImage ? styles.desktopImage : undefined}
          />
          {founder.mobileImage && (
            <Image
              src={founder.mobileImage}
              alt=""
              fill
              sizes="90vw"
              className={styles.mobileImage}
              style={{ objectPosition: founder.focalPoint }}
            />
          )}
          {founder.alternateImage && (
            <Image
              src={founder.alternateImage}
              alt=""
              fill
              sizes="46vw"
              className={styles.alternateImage}
              style={{ objectPosition: founder.focalPoint }}
            />
          )}
        </>
      ) : (
        <div className={styles.photoPlaceholder}>
          <span>
            {founder.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </span>
          <p>Portrait to be provided</p>
        </div>
      )}
      <span className={styles.portraitIndex} aria-hidden="true">
        0{index + 1}
      </span>
      <figcaption className={styles.portraitCaption}>
        <span>{founder.name}</span>
        <span>
          {founder.title}
          {founder.credit && ` · Photo: ${founder.credit}`}
        </span>
      </figcaption>
    </figure>
  );
}
function FutureDirection() {
  const [active, setActive] = useState(0);
  return (
    <section
      className={`${styles.section} ${styles.future}`}
      data-theme="dark"
      aria-labelledby="future-heading"
    >
      <div id="future-heading">
        <Heading lines={content.future.title} />
      </div>
      <p className={styles.sectionDescription}>{content.future.description}</p>
      <div className={styles.futureLayout}>
        <div className={styles.network} aria-hidden="true" data-active={active}>
          <svg viewBox="0 0 600 500">
            <circle cx="300" cy="250" r="175" />
            <circle cx="300" cy="250" r="100" />
            {[
              [300, 75],
              [466, 196],
              [403, 392],
              [197, 392],
              [134, 196],
            ].map(([x, y], i) => (
              <g
                key={i}
                className={active === i ? styles.activeConnection : ""}
              >
                <path d={`M300 250 L${x} ${y}`} />
                <circle cx={x} cy={y} r="7" />
                <text x={x} y={y - 20} textAnchor="middle">
                  0{i + 1}
                </text>
              </g>
            ))}
          </svg>
          <div className={styles.networkCenter}>
            O<span>OLENTRA</span>
          </div>
        </div>
        <div className={styles.focusAreas}>
          {content.future.areas.map((area, index) => (
            <div
              key={area.title}
              className={active === index ? styles.activeArea : ""}
            >
              <h3>
                <button
                  id={`focus-button-${index}`}
                  aria-expanded={active === index}
                  aria-controls={`focus-panel-${index}`}
                  onClick={() => setActive(index)}
                  onFocus={() => setActive(index)}
                  onMouseEnter={() => setActive(index)}
                >
                  <span>0{index + 1}</span>
                  {area.title}
                  <ArrowUpRight size={18} aria-hidden="true" />
                </button>
              </h3>
              <div
                id={`focus-panel-${index}`}
                role="region"
                aria-labelledby={`focus-button-${index}`}
                hidden={active !== index}
              >
                <p>{area.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default function FoundersExperience() {
  const root = useRef(null);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          entry.target.classList.toggle(styles.inView, entry.isIntersecting);
          if (
            entry.isIntersecting &&
            !reduced.matches &&
            entry.target.hasAttribute("data-reveal") &&
            !entry.target.dataset.revealed
          ) {
            entry.target.dataset.revealed = "true";
            entry.target.animate(
              [
                { opacity: 0.5, transform: "translateY(24px)" },
                { opacity: 1, transform: "translateY(0)" },
              ],
              { duration: 800, easing: "cubic-bezier(.2,.7,.2,1)" },
            );
          }
        }),
      { threshold: 0.12 },
    );
    root.current
      .querySelectorAll("[data-reveal], section")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return (
    <section
      ref={root}
      className={styles.page}
      id="founders"
      aria-labelledby="founders-title"
    >
      <a className={styles.skip} href="#shared-vision">
        Skip to shared vision
      </a>
      {/* 1. HERO - BLACK THEME */}
      <section
        className={styles.hero}
        data-theme="dark"
        aria-labelledby="founders-title"
      >
        <div className={styles.heroTop}>
          <Label>{content.hero.eyebrow || "Our Founders"}</Label>
          <span className={styles.edition}>The people. The purpose.</span>
        </div>
        <div className={styles.heroComposition}>
          <div className={styles.heroType}>
            <h1 id="founders-title">
              {content.hero.title.map((line, i) => (
                <span key={line} style={{ "--line": i }}>
                  {line}
                </span>
              ))}
            </h1>
            <p>{content.hero.line || content.hero.description}</p>
          </div>
          <div className={styles.heroPortraits}>
            {founders.map((founder, index) => (
              <div key={founder.id} id={founder.id}>
                <Portrait founder={founder} hero index={index} />
              </div>
            ))}
          </div>
        </div>
      </section>
      <div className={styles.chapterStrip}>
        <span>Two minds.</span>
        <i />
        <span>One vision.</span>
        <i />
        <span>Infinite possibilities.</span>
      </div>

      {/* 2. VISION - WHITE THEME */}
      <section
        id="shared-vision"
        data-theme="light"
        className={`${styles.section} ${styles.vision} ${styles.lightSection}`}
        aria-labelledby="vision-title"
      >
        <div data-reveal>
          <div id="vision-title">
            <Heading lines={content.vision.title} />
          </div>
          <p className={styles.sectionDescription}>
            {content.vision.description}
          </p>
        </div>
        <div className={styles.visionPrinciples}>
          {content.vision.principles.map((principle, index) => (
            <article key={principle.title} data-reveal>
              <span>0{index + 1}</span>
              <h3>{principle.title}</h3>
              <p>{principle.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* 3. THINKING - BLACK THEME */}
      <section
        className={`${styles.section} ${styles.thinking}`}
        data-theme="dark"
        aria-labelledby="thinking-title"
      >
        <div className={styles.thinkingHeading}>
          <div id="thinking-title">
            <Heading lines={content.thinking.title} />
          </div>
          <p className={styles.sectionDescription}>
            The principles behind the work.
          </p>
        </div>
        <div className={styles.principles}>
          {content.thinking.principles.map((principle, index) => (
            <article key={principle.title} data-reveal>
              <span className={styles.bigIndex}>0{index + 1}</span>
              <div
                className={`${styles.geometry} ${styles[principle.shape]}`}
                aria-hidden="true"
              >
                <i />
                <i />
                <i />
                <i />
              </div>
              <div>
                <h3>{principle.title}</h3>
                <p>{principle.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 4. BELIEF MESSAGE - WHITE THEME */}
      <section
        className={`${styles.section} ${styles.message} ${styles.lightSection}`}
        data-theme="light"
        aria-labelledby="message-title"
        data-reveal
      >
        <h2 id="message-title">What we believe.</h2>
        <span className={styles.quoteMark} aria-hidden="true">
          “
        </span>
        {content.message ? (
          <blockquote>{content.message}</blockquote>
        ) : (
          <div className={styles.messagePlaceholder}>
            <span className={styles.pending}>Awaiting the founders’ words</span>
            <p>{content.messagePlaceholder}</p>
          </div>
        )}
        <div className={styles.signOff}>
          {founders.map((founder) => (
            <span key={founder.id}>
              {founder.name}
              <small>{founder.title}</small>
            </span>
          ))}
        </div>
      </section>

      {/* 5. FUTURE DIRECTION - BLACK THEME */}
      <FutureDirection />

      {/* 6. CLOSING CTA - WHITE THEME */}
      <section
        className={`${styles.section} ${styles.closing} ${styles.lightSection}`}
        data-theme="light"
        aria-labelledby="closing-title"
        data-reveal
      >
        <h2 id="closing-title">
          {content.closing.title.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </h2>
        <p>{content.closing.description}</p>
        <div className={styles.actions}>
          <Link href={content.closing.primary.href}>
            {content.closing.primary.label}
            <ArrowUpRight size={20} aria-hidden="true" />
          </Link>
          <Link href={content.closing.secondary.href}>
            {content.closing.secondary.label}
            <ArrowUpRight size={20} aria-hidden="true" />
          </Link>
        </div>
        <nav className={styles.related} aria-label="Explore Olentra">
          <Link href="/">Home</Link>
          <Feature name="services"><Link href="/services">Our services</Link></Feature>
          <Feature name="products"><Link href="/products">Our products</Link></Feature>
        </nav>
      </section>
    </section>
  );
}
