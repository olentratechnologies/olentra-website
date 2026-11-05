"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useLenis } from "lenis/react";
import { motion, MotionConfig, useReducedMotion } from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  Plus,
  Minus,
  Asterisk,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { servicePages } from "@/data/service_pages";
import styles from "./services.module.css";

const Sculpture = dynamic(() => import("./ServicesSculpture"), { ssr: false });
const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
const disciplines = [
  {
    label: "FOUNDATIONS & SCALE",
    headline: "A stronger foundation. A bigger future.",
    short: "Systems that scale with your ambition.",
    shape: "Architecture",
  },
  {
    label: "INTELLIGENCE & AUTOMATION",
    headline: "Make intelligence your advantage.",
    short: "From complex data to clear possibilities.",
    shape: "Intelligence",
  },
  {
    label: "RESILIENCE & TRUST",
    headline: "Built for confidence. Ready for anything.",
    short: "Secure by design. Resilient by nature.",
    shape: "Resilience",
  },
  {
    label: "EXPERIENCE & TECHNOLOGY",
    headline: "Products people love. Systems that last.",
    short: "Exceptional experiences, inside and out.",
    shape: "Experience",
  },
  {
    label: "VISIBILITY & DISCOVERY",
    headline: "Be found by the people who matter.",
    short: "Build visibility that becomes momentum.",
    shape: "Discovery",
  },
  {
    label: "IDENTITY & EXPRESSION",
    headline: "Make your difference impossible to miss.",
    short: "A distinct voice. An unmistakable presence.",
    shape: "Expression",
  },
  {
    label: "ACQUISITION & MOMENTUM",
    headline: "Turn your next opportunity into growth.",
    short: "Connect every step from interest to action.",
    shape: "Momentum",
  },
];
const stages = [
  [
    "Discover",
    "Find the real opportunity.",
    "We ask the right questions, challenge assumptions, and get clear on what matters most.",
  ],
  [
    "Architect",
    "Make the complex clear.",
    "We connect strategy, experience, and technology in a practical blueprint for your next move.",
  ],
  [
    "Build",
    "Bring the ambition to life.",
    "We work in focused iterations. You see the progress, shape the direction, and stay close to the work.",
  ],
  [
    "Evolve",
    "Make what’s next better.",
    "We launch, learn, and refine—helping your systems and experiences grow with your business.",
  ],
];

function Scene({ active, hero = false }) {
  const host = useRef(null);
  const [ready, setReady] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setReady(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px" },
    );
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={host}
      className={`${styles.scene} ${hero ? styles.heroScene : styles.detailScene}`}
      aria-hidden="true"
    >
      <div className={styles.staticSculpture}>
        <i />
        <i />
        <i />
      </div>
      {ready && !reduced && <Sculpture active={active} hero={hero} />}
      {!hero && (
        <>
          <span className={styles.sceneIndex}>O / 0{active + 1}</span>
          <div className={styles.sceneCaption}>
            <span>{disciplines[active].shape}</span>
            <Asterisk size={26} strokeWidth={1} />
          </div>
          <div className={styles.sceneCoordinate}>
            CONNECTED EXPERTISE / OLENTRA
          </div>
        </>
      )}
    </div>
  );
}

export default function ServicesExperience() {
  const [active, setActive] = useState(0);
  const [pendingHash, setPendingHash] = useState(null);
  const reduced = useReducedMotion();
  const lenis = useLenis();
  useEffect(() => {
    const resolveHash = () => {
      const hash = window.location.hash.slice(1);
      const index = servicePages.findIndex(
        (p) =>
          hash === `services-${slugify(p.name)}` ||
          hash === `services-${p.slug}` ||
          p.services.some((s) => hash === `services-${slugify(s.title)}`),
      );
      if (index >= 0) {
        setActive(index);
        setPendingHash(hash);
      }
    };
    resolveHash();
    window.addEventListener("hashchange", resolveHash);
    return () => window.removeEventListener("hashchange", resolveHash);
  }, []);
  useEffect(() => {
    if (!pendingHash) return;
    const frame = requestAnimationFrame(() => {
      const target =
        document.getElementById(pendingHash) ||
        document.getElementById("services");
      if (lenis) {
        lenis.resize();
        lenis.scrollTo(target, { immediate: true, force: true, offset: -110 });
      } else target.scrollIntoView({ behavior: "instant", block: "start" });
      setPendingHash(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [active, pendingHash, lenis]);
  function select(index) {
    if (active === index) {
      setActive(null);
      window.history.replaceState(null, "", "#services");
      return;
    }
    setActive(index);
    const hash = `services-${slugify(servicePages[index].name)}`;
    window.history.replaceState(null, "", `#${hash}`);
    setPendingHash(hash);
  }
  function navigateCategories(event, index) {
    let next;
    if (event.key === "ArrowDown") next = (index + 1) % servicePages.length;
    if (event.key === "ArrowUp")
      next = (index + servicePages.length - 1) % servicePages.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = servicePages.length - 1;
    if (next !== undefined) {
      event.preventDefault();
      document.getElementById(`service-button-${next}`).focus();
    }
  }
  return (
    <MotionConfig reducedMotion="user">
      <main className={styles.page}>
        <Navbar />
        <section className={styles.hero}>
          <div className={styles.heroEyebrow}>
            <span className={styles.statusDot} /> INDEPENDENT THINKING.
            CONNECTED EXPERTISE.
            <span className={styles.heroEdition}>
              EXPERTISE / SEVEN DISCIPLINES
            </span>
          </div>
          <Scene active={active ?? 0} hero />
          <div className={styles.heroCopy}>
            <h1>
              Ambition.
              <br />
              <span>Engineered.</span>
            </h1>
            <div className={styles.heroDescription}>
              <span className={styles.smallCross}>+</span>
              <p>
                Big ideas deserve exceptional execution.
                <br />
                We connect engineering, intelligence, and design
                <br className={styles.desktopBreak} /> to build what comes next.
              </p>
            </div>
            <div className={styles.actions}>
              <a className={styles.primaryButton} href="#services">
                Discover our expertise{" "}
                <span>
                  <ArrowDown size={18} />
                </span>
              </a>
              <a className={styles.textButton} href="/#contact">
                Let’s talk <ArrowUpRight size={18} />
              </a>
            </div>
          </div>
          <div className={styles.heroAnnotation}>
            <span className={styles.annotationLine} />
            <span>
              Distinct disciplines.
              <br />
              <strong>Extraordinary together.</strong>
            </span>
          </div>
          <div className={styles.heroBottom}>
            <div>
              <span>STRATEGY TO REALITY</span>
              <p>
                One connected team.
                <br />
                From the first idea to what’s next.
              </p>
            </div>
            <a
              href="#services"
              className={styles.scrollButton}
              aria-label="Scroll to our expertise"
            >
              <ArrowDown size={20} />
            </a>
            <div className={styles.heroCategories}>
              <span>ENGINEERING</span>
              <span>INTELLIGENCE</span>
              <span>DESIGN & GROWTH</span>
            </div>
          </div>
        </section>

        <section className={styles.manifesto} data-theme="light">
          <div className={styles.eyebrow}>
            <span className={styles.tinySquare} /> THE OLENTRA APPROACH
          </div>
          <p>
            Great work happens
            <br />
            at the <span>intersection.</span>
          </p>
          <div className={styles.manifestoAside}>
            <Asterisk size={46} strokeWidth={1} />
            <p>
              Technology without perspective is just code. We bring disciplines
              together to solve the whole challenge.
            </p>
          </div>
        </section>

        <section id="services" data-theme="light" className={styles.expertise}>
          <div className={styles.sectionIntro}>
            <div className={styles.eyebrow}>01 — WHAT WE DO</div>
            <div className={styles.introGrid}>
              <h2>
                Specialist minds.
                <br />
                <span>Limitless possibilities.</span>
              </h2>
              <p>
                Seven disciplines, built to work as one.
                <br />
                Find the expertise for your next chapter.
              </p>
            </div>
          </div>
          <div className={styles.serviceList}>
            {servicePages.map((page, index) => (
              <article
                key={page.slug}
                id={`services-${slugify(page.name)}`}
                className={`${styles.serviceItem} ${active === index ? styles.activeService : ""}`}
              >
                <h3 className={styles.serviceHeading}>
                  <button
                    id={`service-button-${index}`}
                    aria-expanded={active === index}
                    aria-controls={`service-content-${index}`}
                    onClick={() => select(index)}
                    onKeyDown={(event) => navigateCategories(event, index)}
                  >
                    <span className={styles.serviceNumber}>0{index + 1}</span>
                    <span className={styles.serviceName}>{page.name}</span>
                    <span className={styles.serviceMeta}>
                      {disciplines[index].label}
                    </span>
                    <span className={styles.expandIcon}>
                      {active === index ? (
                        <Minus size={21} />
                      ) : (
                        <Plus size={21} />
                      )}
                    </span>
                  </button>
                </h3>
                <div
                  id={`service-content-${index}`}
                  role="region"
                  aria-labelledby={`service-button-${index}`}
                  hidden={active !== index}
                >
                  {active === index && (
                    <div className={styles.serviceBody}>
                      <div className={styles.visualColumn}>
                        <Scene active={index} />
                        <div className={styles.visualFooter}>
                          <span>{disciplines[index].short}</span>
                          <span>↗</span>
                        </div>
                      </div>
                      <motion.div
                        className={styles.serviceCopy}
                        initial={false}
                        animate={{ opacity: 1 }}
                        transition={{ duration: reduced ? 0 : 0.3 }}
                      >
                        <span className={styles.smallLabel}>
                          BUILT AROUND YOUR NEXT MOVE
                        </span>
                        <h4>{disciplines[index].headline}</h4>
                        <p className={styles.serviceDescription}>
                          {page.heroDescription}
                        </p>
                        <div className={styles.capabilities}>
                          {page.services.map((service) => (
                            <Link
                              id={`services-${slugify(service.title)}`}
                              key={service.title}
                              href={`/services/${page.slug}#${slugify(service.title)}`}
                            >
                              <service.Icon size={17} strokeWidth={1.5} />
                              <span>{service.title}</span>
                              <ArrowUpRight size={15} />
                            </Link>
                          ))}
                        </div>
                        <Link
                          className={styles.detailLink}
                          href={`/services/${page.slug}`}
                        >
                          Explore {page.name.toLowerCase()}{" "}
                          <span>
                            <ArrowUpRight size={19} />
                          </span>
                        </Link>
                      </motion.div>
                      <div className={styles.outcomes}>
                        <span className={styles.smallLabel}>
                          THE DIFFERENCE IT MAKES
                        </span>
                        <div>
                          {page.outcomes.map((outcome) => (
                            <p key={outcome}>
                              <Check size={16} />
                              {outcome}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
          <div className={styles.expertiseFoot}>
            <span>Not sure where to start? That’s a good place to begin.</span>
            <a href="/#contact">
              Let’s figure it out together <ArrowUpRight size={18} />
            </a>
          </div>
        </section>

        <section className={styles.partnership}>
          <div className={styles.partnershipTop}>
            <div className={styles.eyebrow}>02 — HOW WE WORK</div>
            <span>THINK DEEPLY. BUILD PURPOSEFULLY.</span>
          </div>
          <div className={styles.partnershipIntro}>
            <h2>
              From “what if”
              <br />
              to <span>what’s next.</span>
            </h2>
            <p>
              No handoffs into the unknown.
              <br />A close partnership, clear decisions, and
              <br className={styles.desktopBreak} /> momentum you can see.
            </p>
          </div>
          <div className={styles.stages}>
            {stages.map(([name, title, copy], index) => (
              <motion.article
                key={name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{
                  duration: reduced ? 0 : 0.5,
                  delay: reduced ? 0 : index * 0.08,
                }}
              >
                <div
                  className={`${styles.processArt} ${styles[`processArt${index}`]}`}
                  aria-hidden="true"
                >
                  {Array.from({ length: 5 }, (_, i) => (
                    <i key={i} style={{ "--i": i }} />
                  ))}
                </div>
                <div className={styles.stageTitle}>
                  <span>0{index + 1}</span>
                  <h3>{name}</h3>
                  <ArrowUpRight size={17} />
                </div>
                <h4>{title}</h4>
                <p>{copy}</p>
              </motion.article>
            ))}
          </div>
          <div className={styles.partnershipBottom}>
            <span className={styles.statusDot} />
            <span>Clarity at every step. Ownership all the way through.</span>
          </div>
        </section>

        <section className={styles.closing} data-theme="light">
          <div className={styles.eyebrow}>
            YOUR NEXT CHAPTER STARTS WITH A CONVERSATION
          </div>
          <a href="/#contact" className={styles.closingLink}>
            <h2>
              Let’s make
              <br />
              <span>what’s next.</span>
            </h2>
            <span className={styles.closingArrow}>
              <ArrowUpRight strokeWidth={1} />
            </span>
          </a>
          <div className={styles.closingBottom}>
            <p>
              Bring the ambition.
              <br />
              We’ll bring the minds to make it happen.
            </p>
            <span>ENGINEERING × INTELLIGENCE × DESIGN</span>
          </div>
        </section>
        <Footer />
      </main>
    </MotionConfig>
  );
}
