'use client';

import { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Check, Store, Milk, Building2, ReceiptText, CalendarDays, NotebookPen, MessageCircle, PackageCheck } from 'lucide-react';
import styles from './everyday-clarity.module.css';

const stories = [
  { name: 'The neighborhood store', icon: Store, headline: 'One counter. A clearer picture.', text: 'Bring billing, stock, and customer credit together — so the details of a busy shop stay part of the same story.', left: 'A sale at the counter', right: 'A note in the khata', center: 'Store operations', rows: ['Billing & receipts', 'Inventory records', 'Customer credit'], icons: [ReceiptText, PackageCheck, NotebookPen] },
  { name: 'The daily essentials', icon: Milk, headline: 'A daily rhythm. Room for change.', text: 'Organize recurring essentials around real life, with schedules, changing quantities, and planned pauses in one connected workflow.', left: 'Tomorrow’s delivery', right: 'A change of plan', center: 'Everyday subscriptions', rows: ['Recurring schedules', 'Quantity changes', 'Planned pauses'], icons: [CalendarDays, Milk, NotebookPen] },
  { name: 'The whole community', icon: Building2, headline: 'Many households. A shared connection.', text: 'Bring resident orders, fulfilment, and payment records together, connecting the people who need essentials with the people who provide them.', left: 'A resident’s request', right: 'Another message', center: 'Community commerce', rows: ['Resident orders', 'Coordinated fulfilment', 'Payment records'], icons: [Building2, PackageCheck, ReceiptText] },
];

export default function EverydayClaritySection() {
  const [selected, setSelected] = useState(0);
  const story = stories[selected];
  return <section id="discover" className={styles.section} data-theme="dark" aria-labelledby="clarity-title">
    <div className={styles.container}>
      <div className={styles.topline}><span>02 / A little less scattered</span><span className={styles.topnote}>MADE FOR THE WAY YOUR DAY REALLY WORKS</span></div>
      <div className={styles.heading}><h2 id="clarity-title">All the little things.<br/><span>Finally, together.</span></h2><div className={styles.intro}><ArrowDownRight size={32} strokeWidth={1} aria-hidden="true"/><p>Local commerce runs on familiar faces.<br/>Let the everyday details feel just as connected.</p></div></div>
      <div className={styles.experience}>
        <div className={styles.storyRail}>
          <p className={styles.railLabel}>THREE WORLDS. ONE DAILY SUPPLY.</p>
          <div className={styles.choices} role="group" aria-label="Explore Daily Supply use cases">{stories.map((item,index)=>{const Icon=item.icon;return <button key={item.name} type="button" className={`${styles.choice} ${selected===index?styles.active:''}`} aria-pressed={selected===index} aria-controls="clarity-story" onClick={()=>setSelected(index)}><span className={styles.choiceNumber}>0{index+1}</span><Icon size={19} strokeWidth={1.5} aria-hidden="true"/><span>{item.name}</span><ArrowUpRight size={16} aria-hidden="true"/></button>;})}</div>
          <div className={styles.storyCopy} id="clarity-story" aria-live="polite" aria-atomic="true"><h3>{story.headline}</h3><p>{story.text}</p></div>
          <a href="#everyday-ritual" className={styles.link}>Explore everyday rituals <ArrowUpRight size={16} aria-hidden="true"/></a>
        </div>
        <div className={styles.artboard} aria-label={`Illustrative view: ${story.center}`}>
          <div className={styles.grid} aria-hidden="true"/>
          <div className={styles.artboardLabel}><span className={styles.statusDot}/> THE EVERYDAY, IN ORDER <span>DS — 02</span></div>
          <div className={`${styles.fragment} ${styles.paper}`} aria-hidden="true"><ReceiptText size={18}/><span>{story.left}</span><i/><i/><i/><small>A detail worth keeping.</small></div>
          <div className={`${styles.fragment} ${styles.message}`} aria-hidden="true"><MessageCircle size={17}/><span>{story.right}</span><div><i/><i/><i/></div></div>
          <svg className={styles.connectors} viewBox="0 0 600 480" fill="none" aria-hidden="true"><path d="M140 140v65q0 40 50 40h90M470 125v90q0 30-40 30h-90" stroke="#4b72aa" strokeDasharray="4 6"/><path d="M300 360v65" stroke="#3b82f6"/><circle cx="300" cy="425" r="5" fill="#2563eb"/><circle cx="300" cy="425" r="14" stroke="#4b72aa" strokeOpacity="0.4"/></svg>
          <div className={styles.workspace}><div className={styles.workspaceTop}><span className={styles.brandMark}>d<span>•</span></span><div><strong>Daily Supply</strong><span>A place for every detail</span></div><span className={styles.workspaceDot}/></div><div className={styles.workspaceBody}><div className={styles.workspaceHeading}><span>{story.center}</span><span>CONNECTED</span></div>{story.rows.map((row,index)=>{const Icon=story.icons[index];return <div className={styles.record} key={row}><span className={styles.recordIcon}><Icon size={17} strokeWidth={1.5} aria-hidden="true"/></span><span>{row}</span><Check size={14} aria-hidden="true"/></div>;})}</div></div>
          <div className={styles.artboardFooter}><span>Separate details. A shared workflow.</span><span>Illustrative concept</span></div>
        </div>
      </div>
      <div className={styles.bottomline}><span>Built around people.<br/><strong>Connected by Daily Supply.</strong></span><p>From the first order to the last entry of the day.</p><span className={styles.endmark} aria-hidden="true">↘</span></div>
    </div>
  </section>;
}
