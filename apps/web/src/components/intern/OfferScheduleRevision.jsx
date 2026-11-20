"use client";
import { useEffect, useState } from 'react';
import { useInternship } from './InternshipProvider';
import { civilToday, displayDate, durationLabel, parseDuration, legacyDuration, scheduleMismatch } from '@/lib/intern/schedule.mjs';
import { decisionDeadline, earliestStartDate, formatDeadline, maxOpenDays, normalizeLeadDays } from '@/lib/intern/offer-policy.mjs';
import styles from './offer-schedule.module.css';

export default function OfferScheduleRevision({ application, offer, admin = false }) {
  const { commands, data, notify }=useInternship();
  const [open,setOpen]=useState(false),[startOn,setStart]=useState(''),[reason,setReason]=useState(''),[days,setDays]=useState(7),[override,setOverride]=useState(false),[quantity,setQuantity]=useState(1),[unit,setUnit]=useState('months');
  const [preview,setPreview]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[versions,setVersions]=useState([]);
  // A revision that moves the start date must also close the onboarding lead time before it.
  const leadDays=normalizeLeadDays(data.settings?.onboardingLeadDays),today=civilToday(),movesStart=Boolean(startOn)&&startOn!==offer.startOn;
  const earliestStart=earliestStartDate(today,leadDays),longestWindow=movesStart?maxOpenDays(startOn,today,leadDays):30,startTooSoon=movesStart&&startOn<earliestStart;
  useEffect(()=>{let live=true;commands.listOfferVersions(application.id).then(result=>{if(live&&result.ok)setVersions(result.data);});return()=>{live=false;};},[commands,application.id,offer.revision,offer.currentVersion,offer.latestVersion]);
  const pending=offer.pendingRevision, expired=pending?.expiresOn&&Date.parse(pending.expiresOn)<=Date.now();
  async function run(task){setBusy(true);setError('');try{const result=await task();if(!result.ok){setError(result.error||'Unable to update this offer.');return false;}notify('Offer schedule updated.');return result.data;}catch(e){setError(e.message||'Unable to update this offer.');return false;}finally{setBusy(false);}}
  async function propose(event){event.preventDefault();if(busy)return;
    const input={applicationId:application.id,revising:true,startOn,reason,expiresInDays:Number(days),...(override?{durationOverride:{quantity:Number(quantity),unit}}:{})};
    if(!preview){const result=await run(()=>commands.previewOffer(input));if(result)setPreview(result);return;}
    const result=await run(()=>commands.reviseOffer({...input,configRevision:preview.configRevision,endOn:preview.endOn}));if(result){setOpen(false);setPreview(null);}
  }
  function reset(setter,value){setter(value);setPreview(null);}
  const effectiveDuration=offer.durationLabel||legacyDuration(offer.startOn,offer.endOn);
  return <section id="schedule-revision" style={{scrollMarginTop:90}} className={styles.panel} aria-label="Confirmed internship schedule">
    <h3>{offer.status==='Accepted'?'Confirmed internship schedule':'Offered internship schedule'}</h3>
    <dl className={styles.grid}><div><dt>Duration</dt><dd>{effectiveDuration}</dd></div><div><dt>Start date</dt><dd>{displayDate(offer.startOn)}</dd></div><div><dt>Completion date</dt><dd>{displayDate(offer.endOn)}</dd></div></dl>
    <p>Offer version {offer.currentVersion||1}. Dates include the start and completion day. Onboarding approval does not change your scheduled start date.</p>
    {admin&&scheduleMismatch(offer,data.settings)&&<p className={styles.warning}>Schedule review required: this offer differs from the current program duration ({durationLabel(data.settings.durationSpec||data.settings.duration)}). Existing terms have not been changed.</p>}
    {pending&&<div className={styles.revision}>
      <h4>{expired?'Schedule revision deadline passed':'Schedule revision awaiting your decision'}</h4>
      <p>The current accepted schedule remains effective until this revision is accepted.</p>
      <dl className={styles.grid}><div><dt>Proposed duration</dt><dd>{pending.durationLabel}</dd></div><div><dt>Proposed start</dt><dd>{displayDate(pending.startOn)}</dd></div><div><dt>Proposed completion</dt><dd>{displayDate(pending.endOn)}</dd></div></dl>
      <p><strong>Reason:</strong> {pending.reason}</p><p><strong>Respond by:</strong> {formatDeadline(pending.expiresOn)}</p>
      <div className={styles.actions}>{admin?<button disabled={busy} onClick={()=>run(()=>commands.decideOfferRevision(application.id,pending.version,'withdraw'))}>Withdraw revision</button>:!expired&&<><button disabled={busy} onClick={()=>run(()=>commands.decideOfferRevision(application.id,pending.version,'accept'))}>Accept revised dates</button><button disabled={busy} onClick={()=>run(()=>commands.decideOfferRevision(application.id,pending.version,'decline'))}>Keep current accepted dates</button></>}</div>
    </div>}
    {admin&&['Sent','Accepted'].includes(offer.status)&&(!pending||expired)&&<button disabled={busy} onClick={()=>{setOpen(!open);setStart(offer.startOn||'');setPreview(null);}}>Revise schedule</button>}
    {open&&admin&&<form onSubmit={propose} className={styles.form}>
      <label>Revised start date<input type="date" required min={offer.startOn&&offer.startOn<earliestStart?undefined:earliestStart} aria-invalid={startTooSoon||undefined} value={startOn} onChange={e=>reset(setStart,e.target.value)} /></label>
      <label>Reason for correction<textarea required minLength={3} maxLength={2000} value={reason} onChange={e=>reset(setReason,e.target.value)} /></label>
      <label>Decision window (days)<input type="number" min="1" max={Math.max(1,longestWindow)} value={days} onChange={e=>reset(setDays,e.target.value)} /></label>
      <p role={startTooSoon||Number(days)>longestWindow?'alert':undefined}>{startTooSoon?`This start date is too soon. A revised start must leave ${leadDays} days after the decision deadline, so choose ${displayDate(earliestStart)} or later.`:Number(days)>longestWindow?`For this start date the decision window can be at most ${longestWindow} ${longestWindow===1?'day':'days'}.`:`The student must respond by ${formatDeadline(decisionDeadline(new Date().toISOString(),Number(days)||1))}.`}</p>
      <label><input type="checkbox" checked={override} onChange={e=>reset(setOverride,e.target.checked)} />Use a duration exception for this student</label>
      {override&&<div className={styles.actions}><input aria-label="Exception duration quantity" type="number" min="1" step="1" value={quantity} onChange={e=>reset(setQuantity,e.target.value)} /><select aria-label="Exception duration unit" value={unit} onChange={e=>reset(setUnit,e.target.value)}><option value="months">Calendar months</option><option value="weeks">Weeks</option><option value="days">Days</option></select></div>}
      {!override&&<p>Uses current program duration: {durationLabel(parseDuration(data.settings.durationSpec||data.settings.duration))}.</p>}
      {preview&&<p role="status"><strong>Review proposed schedule:</strong> {preview.durationLabel}, {displayDate(preview.startOn)} to {displayDate(preview.endOn)}. The student must accept a revision to an accepted offer.</p>}
      <button disabled={busy} type="submit">{busy?'Preparing…':preview?'Confirm and send revision':'Review revised schedule'}</button>
    </form>}
    {error&&<p role="alert" className={styles.warning}>{error}</p>}
    {versions.length>0&&<details><summary>Schedule and decision history ({versions.length} versions)</summary><ul>{versions.map(v=><li key={v.version}><strong>Version {v.version}{Number(offer.currentVersion||1)===v.version?' · Current':''}</strong> — {v.durationLabel||legacyDuration(v.startOn,v.endOn)} · {displayDate(v.startOn)} to {displayDate(v.endOn)} · {v.decision|| (v.version===pending?.version?expired?'Expired':'Awaiting decision':v.version<Number(offer.latestVersion||1)?'Superseded':v.status)}{v.reason&&<p>Reason: {v.reason}</p>}</li>)}</ul></details>}
  </section>;
}
