"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Check, Code2 } from "lucide-react";
import shared from "./intern-sections.module.css";
import styles from "./intern-roles.module.css";

import { INTERN_ROLES } from "@/lib/intern/opportunities.mjs";

const ICONS = { build: Code2, automate: Bot };

/**
 * "Intern roles" section: three compact role tabs and one detail panel, so the
 * section stays short however many responsibilities a role lists.
 */
export default function InternRoles({ roles = INTERN_ROLES }) {
  const [activeId, setActiveId] = useState(roles[0].id);
  const tabRefs = useRef([]);
  const activeIndex = roles.findIndex((role) => role.id === activeId);
  const active = roles[activeIndex];
  const ActiveIcon = ICONS[active.id] || Code2;

  useEffect(() => {
    const openLinkedRole = () => {
      const roleIndex = roles.findIndex((role) => window.location.hash === `#role-${role.id}`);
      if (roleIndex < 0) return;
      setActiveId(roles[roleIndex].id);
      requestAnimationFrame(() => {
        tabRefs.current[roleIndex]?.focus({ preventScroll: true });
        document.getElementById("internship-roles")?.scrollIntoView({ block: "start" });
      });
    };
    openLinkedRole();
    window.addEventListener("hashchange", openLinkedRole);
    return () => window.removeEventListener("hashchange", openLinkedRole);
  }, [roles]);

  // Arrow keys move between tabs, as in the standard tabs pattern.
  const onKeyDown = (event) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    let next = null;
    if (step) next = (activeIndex + step + roles.length) % roles.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = roles.length - 1;
    if (next === null) return;
    event.preventDefault();
    setActiveId(roles[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <section className={shared.section} id="internship-roles" aria-labelledby="internship-roles-title">
      <div className={styles.top}>
        <div className={shared.header}>
          <span className={shared.eyebrow}>Intern roles</span>
          <h2 id="internship-roles-title">Choose the role that fits your goals</h2>
          <p>Explore roles in engineering and AI automation.</p>
        </div>
      </div>

      <div className={styles.tabs} role="tablist" aria-label="Intern roles" onKeyDown={onKeyDown}>
        {roles.map((role, index) => {
          const Icon = ICONS[role.id] || Code2;
          const selected = role.id === activeId;
          return (
            <button
              key={role.id}
              ref={(node) => { tabRefs.current[index] = node; }}
              type="button"
              role="tab"
              id={`role-tab-${role.id}`}
              aria-selected={selected}
              aria-controls="role-panel"
              tabIndex={selected ? 0 : -1}
              className={styles.tab}
              data-role={role.id}
              onClick={() => setActiveId(role.id)}
            >
              <span className={styles.tabIcon} aria-hidden="true"><Icon size={20} strokeWidth={1.9} /></span>
              <span className={styles.tabText}>
                <span className={styles.tabTag}><span className={styles.tabNumber}>{String(index + 1).padStart(2, "0")} · </span>{role.tag}</span>
                <span className={styles.tabTitle}>{role.short}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div
        key={active.id}
        id="role-panel"
        role="tabpanel"
        aria-labelledby={`role-tab-${active.id}`}
        className={styles.panel}
        data-role={active.id}
      >
        <div className={styles.panelIntro}>
          <span className={styles.panelIcon} aria-hidden="true"><ActiveIcon size={24} strokeWidth={1.8} /></span>
          <h3>{active.title}</h3>
          {active.subtitle && <p className={styles.panelSubtitle}>{active.subtitle}</p>}
          <p className={styles.panelSummary}>{active.summary}</p>
        </div>
        <div className={styles.panelBody}>
          <p className={styles.panelLabel}>{active.focusLabel}</p>
          {active.focus ? (
            <ul className={styles.focus} role="list">
              {active.focus.map((item) => (
                <li key={item}><span aria-hidden="true"><Check size={11} strokeWidth={3} /></span>{item}</li>
              ))}
            </ul>
          ) : (
            <dl className={styles.areas}>
              {active.areas.map(([area, detail]) => (
                <div key={area}><dt>{area}</dt><dd>{detail}</dd></div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </section>
  );
}
