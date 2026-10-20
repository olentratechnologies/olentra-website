'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Check, Pause, CalendarDays, ArrowRight } from 'lucide-react';
import styles from './cinematic-stories.module.css';

function Reveal({ children, className, delay = 0 }) {
  const reduced = useReducedMotion();
  return <motion.div className={className} initial={{ opacity: 1, y: 0 }} whileInView={reduced ? undefined : { y: [22, 0], opacity: [.65, 1] }} viewport={{ once: true, amount: .15 }} transition={{ duration: .8, delay, ease: [.22, 1, .36, 1] }}>{children}</motion.div>;
}

function NeighborhoodArt() {
  return <svg viewBox="0 0 1120 470" fill="none" aria-hidden="true" className={styles.neighborhoodArt}>
    <defs>
      <linearGradient id="ds-building" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#7398d4"/><stop offset="1" stopColor="#213a64"/></linearGradient>
      <linearGradient id="ds-roof" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#d7e6ff"/><stop offset="1" stopColor="#688bbb"/></linearGradient>
      <linearGradient id="ds-road"><stop stopColor="#284d83" stopOpacity="0"/><stop offset=".5" stopColor="#80bbff"/><stop offset="1" stopColor="#284d83" stopOpacity="0"/></linearGradient>
      <radialGradient id="ds-pool"><stop stopColor="#437ed1" stopOpacity=".3"/><stop offset="1" stopColor="#437ed1" stopOpacity="0"/></radialGradient>
    </defs>
    <ellipse cx="560" cy="300" rx="540" ry="170" fill="url(#ds-pool)"/>
    <path d="M30 315 510 100 1090 330 600 465Z" fill="#10213c" stroke="#243a59"/>
    {[0,1,2,3,4,5].map(i=><g key={i} stroke="#1e3554" strokeWidth="1"><path d={`M${110+i*90} ${279-i*40} l580 230`}/><path d={`M${130+i*150} ${355+i*27} l480 -215`}/></g>)}
    <path d="m125 320 255 100 480-208M350 190l510 206" stroke="url(#ds-road)" strokeWidth="3"/>
    <path d="m125 320 255 100 480-208" stroke="#a9d1ff" strokeOpacity=".6" strokeDasharray="3 12"/>
    {/* Neighborhood shop: roof, side, glazed front, striped awning. */}
    <g transform="translate(155 143)">
      <path d="m0 86 125-55 140 55-125 55Z" fill="#0a172b" transform="translate(0 100)"/>
      <path d="m0 40 125-55v135L0 175Z" fill="#29456d"/><path d="m125-15 140 55v135l-140-55Z" fill="url(#ds-building)"/>
      <path d="m-10 35 135-60 150 60-135 60Z" fill="url(#ds-roof)"/>
      <path d="m14 91 100-44v81L14 172Z" fill="#132c4d" stroke="#82a6d6"/>
      <path d="m22 100 36-16v66l-36 16Zm47-21 36-16v66l-36 16Z" fill="#e5d8af" fillOpacity=".8"/>
      <path d="m-8 75 133-58 12 30L4 105Z" fill="#c2d9fb"/>
      {[0,1,2,3,4].map(i=><path key={i} d={`m${i*26} ${71-i*11.5} 13-6 12 30-13 6Z`} fill="#3677d5"/>)}
      <path d="m145 62 95 37v55l-95-37Z" fill="#20395d" stroke="#819bc3"/><path d="m157 79 70 27m-70-13 70 27" stroke="#6584ae"/>
    </g>
    {/* Apartment towers with recessed windows. */}
    {[{x:690,y:40,h:190},{x:835,y:125,h:145}].map(({x,y,h},index)=><g key={x} transform={`translate(${x} ${y})`}>
      <path d={`M0 45 65 15l85 35v${h}l-85 30-65-30Z`} fill="#152a48"/>
      <path d={`M0 45 65 75v${h}L0 ${h+45}Z`} fill="#3d5b85"/>
      <path d={`m65 75 85-35v${h}l-85 35Z`} fill="url(#ds-building)"/>
      <path d="M-7 43 78 6l80 32-93 39Z" fill="url(#ds-roof)"/>
      {[0,1,2,3].map(row=>[0,1,2].map(col=><path key={`${row}-${col}`} d={`m${77+col*23} ${91+row*30-col*9} 12-5v18l-12 5Z`} fill={(row+col+index)%3===0?'#f5dca6':'#172f50'}/>))}
      <path d={`m15 72 17 8v${h-30}l-17-8Z`} fill="#8cabd3" fillOpacity=".35"/>
    </g>)}
    {/* Essentials delivery vehicle. */}
    <g transform="translate(510 287)"><ellipse cx="53" cy="82" rx="82" ry="19" fill="#050d1c" fillOpacity=".5"/><path d="m-10 22 56-24 72 29-56 26Z" fill="#e3ecfa"/><path d="M-10 22v51l72 30V53Z" fill="#83a8d7"/><path d="m62 53 56-26v51l-56 25Z" fill="#c2d6f1"/><path d="m-10 37-23 9v28l23 9Z" fill="#3675cf"/><path d="m-29 48 15-6v20l-15 6Z" fill="#132b48"/><ellipse cx="5" cy="84" rx="10" ry="14" fill="#09182b"/><ellipse cx="5" cy="84" rx="5" ry="8" fill="#7691b6"/><ellipse cx="85" cy="96" rx="9" ry="13" fill="#09182b"/><path d="m15 49 23 10m-23 0 23 10" stroke="#f5f8ff" strokeWidth="4"/></g>
    {[{x:450,y:235},{x:650,y:160},{x:965,y:330}].map(({x,y})=><g key={x}><path d={`M${x} ${y}v-38`} stroke="#809fc7" strokeWidth="2"/><circle cx={x} cy={y-40} r="5" fill="#c7e2ff"/><circle cx={x} cy={y-40} r="15" fill="#8ebfff" fillOpacity=".08"/></g>)}
  </svg>;
}

export function ConnectedNeighborhoodSection() {
  return <section id="connected-neighborhood" className={`${styles.section} ${styles.neighborhood}`} data-theme="dark" aria-labelledby="neighborhood-title">
    <div className={styles.container}>
      <Reveal className={styles.neighborhoodHeading}><div><p className={styles.eyebrow}>04 / Closer by design</p><h2 id="neighborhood-title" className={styles.title}>A neighborhood.<br/><span>Working together.</span></h2></div><p className={styles.description}>The shop around the corner. The vendor on your doorstep. The people you call neighbors. One connection for the everyday things that bring them together.</p></Reveal>
      <Reveal className={styles.cityStage} delay={.1}><div className={styles.sceneCoordinates}>LOCAL COMMERCE / A SHARED CONNECTION</div><NeighborhoodArt/><div className={`${styles.sceneLabel} ${styles.shopLabel}`}><i/>Your neighborhood store</div><div className={`${styles.sceneLabel} ${styles.homeLabel}`}><i/>Your community</div><div className={`${styles.sceneLabel} ${styles.vendorLabel}`}><i/>Your daily essentials</div></Reveal>
      <div className={styles.sceneFooter}><span>Different people. Shared possibilities.</span><span>STORES <b>—</b> VENDORS <b>—</b> COMMUNITIES</span></div>
    </div>
  </section>;
}

function MorningArt() {
  return <div className={styles.morningStage}>
    <div className={styles.morningHalo} aria-hidden="true"/>
    <svg viewBox="0 0 560 520" className={styles.essentialsArt} fill="none" aria-hidden="true">
      <defs><linearGradient id="ds-bag"><stop stopColor="#2862bf"/><stop offset=".55" stopColor="#4782df"/><stop offset="1" stopColor="#1c4c9d"/></linearGradient><linearGradient id="ds-milk"><stop stopColor="#c5d2e0"/><stop offset=".3" stopColor="#fff"/><stop offset=".7" stopColor="#f6f8fa"/><stop offset="1" stopColor="#bacbdc"/></linearGradient><linearGradient id="ds-cap"><stop stopColor="#183e83"/><stop offset=".5" stopColor="#5b91e4"/><stop offset="1" stopColor="#2158ad"/></linearGradient></defs>
      <ellipse cx="285" cy="445" rx="211" ry="31" fill="#264a7b" fillOpacity=".08"/>
      <path d="m240 190 190-28 30 261-200 29Z" fill="url(#ds-bag)"/><path d="m430 162 50 50 15 195-35 16Z" fill="#194384"/><path d="m240 190 44 36 196-14-50-50Z" fill="#78a3e4"/>
      <path d="M292 195v-38c0-67 87-69 87-13v39" stroke="#1b4489" strokeWidth="13"/><path d="M296 191v-37c0-59 79-62 79-10v34" stroke="#99b9ea" strokeWidth="4"/>
      <path d="m309 296 47-7 16 15-47 7Z" fill="#fff"/><path d="m309 308 47-7 16 15-47 7Zm0 12 47-7 16 15-47 7Z" fill="#fff" fillOpacity=".7"/>
      <g transform="rotate(-9 175 320)"><path d="M143 174v40c0 22-34 31-34 60v146q0 24 67 24t67-24V274c0-29-34-38-34-60v-40Z" fill="url(#ds-milk)" stroke="#c4d0de"/><rect x="140" y="159" width="72" height="26" rx="6" fill="url(#ds-cap)"/><ellipse cx="176" cy="160" rx="35" ry="7" fill="#84abe7"/><path d="M111 297q65 13 130 0v81q-65 16-130 0Z" fill="#2461bc"/><path d="M139 325h74m-64 14h54m-44 14h34" stroke="#e7f0ff" strokeWidth="5"/><path d="M129 261v26m0 106v20" stroke="#fff" strokeWidth="7" strokeLinecap="round"/></g>
    </svg>
    <div className={styles.calendar}><div className={styles.calendarTop}><CalendarDays size={16} aria-hidden="true"/><span>Your everyday rhythm</span><span className={styles.calendarDot}/></div><p>Good mornings,<br/><strong>on repeat.</strong></p><div className={styles.calendarDays}>{['M','T','W','T','F','S','S'].map((day,i)=><span key={i} className={i===5?styles.pausedDay:''}><small>{day}</small>{i===5?<Pause size={12} aria-label="Planned pause"/>:<Check size={13} aria-label="Scheduled"/>}</span>)}</div><div className={styles.calendarNote}>A little flexibility. Every day.</div><span className={styles.example}>Illustrative schedule</span></div>
  </div>;
}

export function EverydayRitualSection() {
  return <section id="everyday-ritual" className={`${styles.section} ${styles.morning}`} data-theme="light" aria-labelledby="morning-title"><div className={`${styles.container} ${styles.morningGrid}`}>
    <Reveal className={styles.morningCopy}><p className={styles.eyebrow}>03 / The everyday, reimagined</p><h2 id="morning-title" className={styles.title}>Every morning,<br/><span>already{' '}<br/>considered.</span></h2><p className={styles.description}>Life has a rhythm. And sometimes, a change of plan. Keep the essentials coming, with subscriptions that fit around your household.</p><div className={styles.ritualDetails}>{[{n:'01',title:'Set your rhythm',text:'Recurring schedules for the essentials you rely on.'},{n:'02',title:'Make room for change',text:'Adjust quantities as your household needs change.'},{n:'03',title:'Take a little pause',text:'Plan a break in your regular supply.'}].map(item=><div key={item.n}><span>{item.n}</span><div><h3>{item.title}</h3><p>{item.text}</p></div></div>)}</div></Reveal>
    <Reveal className={styles.morningVisual} delay={.15}><MorningArt/><div className={styles.artCaption}><span>THE SMALL THINGS, TAKEN CARE OF</span><ArrowRight size={16} aria-hidden="true"/></div></Reveal>
  </div></section>;
}

export function ClearerStoreSection() {
  return <section id="clearer-store" className={`${styles.section} ${styles.store}`} data-theme="light" aria-labelledby="store-title"><div className={styles.container}>
    <Reveal className={styles.storeHeading}><p className={styles.eyebrow}>05 / More clarity. More possibility.</p><h2 id="store-title" className={styles.title}>Behind every familiar shop,<br/><span>a clearer day.</span></h2></Reveal>
    <div className={styles.storeGrid}><Reveal className={styles.storeStage}>
      <div className={styles.stageRing} aria-hidden="true"/>
      <div className={styles.inventory} aria-hidden="true"><div/><div/><div/><span>EVERYTHING IN ITS PLACE</span></div>
      <div className={styles.khata}><div className={styles.bookSpine}/><span>DAILY SUPPLY</span><strong>A familiar face.<br/>A clear record.</strong><div className={styles.bookLine}/><p>Digital khata</p><small>Illustrative record</small></div>
      <div className={styles.receipt}><div className={styles.receiptBrand}>Daily Supply <span>↗</span></div><p className={styles.receiptSubtitle}>A LITTLE ORDER, EVERY DAY</p><div className={styles.receiptRule}/><div className={styles.receiptRow}><span>Daily essentials</span><span>01</span></div><div className={styles.receiptRow}><span>Household staples</span><span>02</span></div><div className={styles.receiptRule}/><div className={styles.receiptStatus}><Check size={14} aria-hidden="true"/> Part of one workflow</div><div className={styles.barcode} aria-hidden="true"/><span className={styles.example}>Illustrative receipt</span></div>
    </Reveal><Reveal className={styles.storeCopy} delay={.15}><span className={styles.smallLine}/><h3>Less scattered.<br/>More connected.</h3><p className={styles.description}>Behind the counter, every detail matters. Bring billing, inventory, and customer credit into a connected workflow — and bring a little more clarity to the day.</p><ul className={styles.capabilities}><li><span>01</span>Billing that belongs to the bigger picture</li><li><span>02</span>Inventory alongside everyday operations</li><li><span>03</span>Customer credit, thoughtfully recorded</li></ul><Link className={styles.cta} href="/#contact">Explore Daily Supply for your store <ArrowUpRight size={18} aria-hidden="true"/></Link></Reveal></div>
  </div></section>;
}
