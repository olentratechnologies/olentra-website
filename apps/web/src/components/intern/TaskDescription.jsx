"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { inlineParts, parseTaskDescription } from "@/lib/intern/task-description.mjs";
import styles from "./task-description.module.css";

function Inline({ text }) {
  return inlineParts(text).map((part, index) => {
    if (part.type === "bold") return <strong key={index}>{part.value}</strong>;
    if (part.type === "code") return <code key={index}>{part.value}</code>;
    if (part.type === "link") return <a key={index} href={part.value} target="_blank" rel="noopener noreferrer">{part.value}</a>;
    return <Fragment key={index}>{part.value}</Fragment>;
  });
}

/**
 * A task's instructions, laid out the way they were typed: numbered steps as
 * headings, "-" lines as bullet lists, blank lines between paragraphs. Long
 * instructions start collapsed with a "Show full instructions" toggle.
 */
export default function TaskDescription({ text, collapsible = true, className = "" }) {
  const blocks = useMemo(() => parseTaskDescription(text), [text]);
  const long = collapsible && (String(text || "").length > 420 || blocks.length > 5);
  const [open, setOpen] = useState(false);
  if (!blocks.length) return null;
  const collapsed = long && !open;
  return (
    <div className={`${styles.wrap} ${className}`}>
      <div className={`${styles.body} ${collapsed ? styles.collapsed : ""}`}>
        {blocks.map((block, index) => {
          if (block.type === "heading") return <h4 key={index} className={styles.heading}><Inline text={block.text} /></h4>;
          if (block.type === "step") return (
            <h4 key={index} className={styles.step}>
              <span className={styles.stepNumber} aria-hidden="true">{block.number}</span>
              <span><span className={styles.srOnly}>Step {block.number}: </span><Inline text={block.text} /></span>
            </h4>
          );
          if (block.type === "bullets") return <ul key={index} className={styles.list}>{block.items.map((item, i) => <li key={i}><Inline text={item} /></li>)}</ul>;
          if (block.type === "numbers") return <ol key={index} start={block.start} className={styles.list}>{block.items.map((item, i) => <li key={i}><Inline text={item} /></li>)}</ol>;
          return <p key={index} className={styles.paragraph}>{block.lines.map((line, i) => <Fragment key={i}>{i > 0 && <br />}<Inline text={line} /></Fragment>)}</p>;
        })}
      </div>
      {long && (
        <button type="button" className={styles.toggle} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {open ? <>Show less <ChevronUp size={14} aria-hidden="true" /></> : <>Show full instructions <ChevronDown size={14} aria-hidden="true" /></>}
        </button>
      )}
    </div>
  );
}
