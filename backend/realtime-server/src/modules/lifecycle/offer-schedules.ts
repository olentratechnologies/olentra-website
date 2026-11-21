import { randomUUID } from 'node:crypto';
import type { ClientSession } from 'mongodb';
import type { Principal } from '../../shared/principal';
import { DomainError } from '../../shared/errors';
import { requireAdmin } from '../access/policy';
import { parseDuration, durationLabel, completionDate, civilToday, legacyDuration } from '../programs/schedule.mjs';
import { internScheduleLabel } from '../programs/opportunities.mjs';
import { decisionDeadline, endOfDayIst, maxOpenDays, normalizeLeadDays, offerWindowProblem, MAX_OPEN_DAYS } from '../programs/offer-policy.mjs';
import { auditDecision } from '../audit/decision-audit';
const fail=(message:string):never=>{throw new DomainError('CONFLICT',message);};
const key=(id:string,version:number)=>`${id}:v${version}`;
const validStart=(value:unknown)=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value);
export function createOfferSchedules(collection:any) {
  const offers=collection('offers'), versions=collection('offer_versions'), apps=collection('applications'), settings=collection('settings');
  const methods=new Set(['offer.enrollDirect','offer.preview','offer.versions','offer.send','offer.accept','offer.decline','offer.revise','offer.revision.accept','offer.revision.decline','offer.revision.withdraw']);
  async function execute(method:string,p:any,actor:Principal|null,session?:ClientSession) {
    const opts=session?{session}:{}, applicationId=String(p.applicationId||'');
    if(['offer.preview','offer.send','offer.revise','offer.revision.withdraw','offer.enrollDirect'].includes(method)) requireAdmin(actor);
    else if(!(actor?.role==='company'&&actor.staffRole==='admin')&&!(actor?.role==='intern'&&actor.applicationId===applicationId)) throw new DomainError('FORBIDDEN','This offer belongs to another account.');
    const app=await apps.findOne({_id:applicationId},opts);if(!app)throw new DomainError('NOT_FOUND','Application not found.');
    const old=await offers.findOne({applicationId},opts),config=await settings.findOne({_id:'program'},opts);
    if(method==='offer.versions')return (await versions.find({applicationId},opts).sort({version:-1}).toArray()).map(({_id,...v}:any)=>({id:_id,...v}));
    const now=new Date().toISOString();
    const history=async(title:string,detail:string)=>apps.updateOne({_id:applicationId},{$inc:{version:1},$push:{history:{id:`HST-${randomUUID()}`,title,detail,date:now}}},opts);
    const archive=async()=>{if(old&&!old.currentVersion)await versions.updateOne({_id:key(applicationId,1)},{$setOnInsert:{...old,_id:key(applicationId,1),applicationId,version:1,durationLabel:legacyDuration(old.startOn,old.endOn),legacy:true,issueDate:old.issueDate||old.sentOn||old.decidedOn,name:app.name,email:app.email,program:app.program,workMode:app.workMode,schedule:internScheduleLabel(app.schedule)}},{...opts,upsert:true});};
    const IN_PROCESS=['Applied','Under Review','Shortlisted','Selected'];
    const staffEmail=async()=>Boolean(await collection('accounts').findOne({email:String(app.email||'').toLowerCase(),role:'company'},opts));
    // Make an applicant an active intern at once; onboarding documents are collected afterwards.
    async function joinAsIntern(schedule:any,version:number,route:string,entries:{title:string,detail:string}[]) {
      await apps.updateOne({_id:applicationId},{$set:{status:'Joined',statusChangedOn:now},$inc:{version:1},$push:{history:{$each:entries.map(entry=>({id:`HST-${randomUUID()}`,...entry,date:now}))}}} as any,opts);
      const intern={_id:`INT-${randomUUID()}`,applicationId,batch:app.batch||config?.defaultBatch||'',joinedOn:civilToday(),startOn:schedule.startOn,endOn:schedule.endOn,offerVersion:version,duration:schedule.duration,durationLabel:schedule.durationLabel,status:'Active',projectIds:[],revision:1,route};
      await collection('interns').insertOne(intern,opts);
      await collection('onboarding').updateOne({applicationId},{$setOnInsert:{_id:`ONB-${randomUUID()}`,applicationId,status:'Draft',acknowledged:false,documents:{}}},{...opts,upsert:true});
      return {...intern,id:intern._id};
    }
    // Enrol an applicant who agreed in person: the offer is accepted on their behalf and they join today or on the chosen date.
    async function enrollDirect(preview:any,reason:string,now:string) {
      if(!IN_PROCESS.includes(app.status))fail('Only applicants who are still in the hiring process can be enrolled directly.');
      if(old?.status==='Accepted')fail('This applicant has already accepted an offer.');
      if(await collection('interns').findOne({applicationId},opts))fail('This applicant is already an intern.');
      if(await staffEmail())fail('This applicant email belongs to a staff account. Use a separate applicant email before enrolling.');
      const agreementNote=String(p.agreementNote||'').trim().slice(0,500);
      if(agreementNote.length<5)throw new DomainError('INVALID_REQUEST','Record how and when the student agreed to the internship.');
      const program=await collection('programs').findOne({_id:app.programId},opts),stipend=Number(p.stipend??0);
      if(!program||!Number.isSafeInteger(stipend)||stipend<0||stipend>Number(program.stipend))throw new DomainError('INVALID_REQUEST','Choose a stipend within the program limit.');
      await archive();
      const version=Number(old?.latestVersion||old?.currentVersion||(old?1:0))+1;
      if(old?.status==='Sent')await versions.updateOne({_id:key(applicationId,Number(old.currentVersion||1))},{$set:{decision:'Superseded',decidedOn:now}},opts);
      const {direct:_direct,maxOpenDays:_max,leadDays:_lead,route:_route,...schedule}=preview;
      const snapshot={...schedule,_id:key(applicationId,version),version,name:app.name,email:app.email,college:app.college||'',program:app.program,stipend,stipendPeriod:'month',message:String(p.message??'').slice(0,2000),reason,sentOn:now,issueDate:civilToday(new Date(now)),expiresOn:null,createdBy:actor!.id,status:'Accepted',decision:'Accepted',decidedOn:now,route:'direct',acceptedBy:actor!.id,acceptedByName:actor!.name||'',agreementNote};
      await versions.insertOne(snapshot,opts);
      const offer={...snapshot,_id:old?._id||`OFFER-${randomUUID()}`,currentVersion:version,latestVersion:version,revision:Number(old?.revision||0)+1};
      await offers.replaceOne({applicationId},offer,{...opts,upsert:true});
      const intern=await joinAsIntern(snapshot,version,'direct',[
        {title:'Internship offer accepted in person',detail:agreementNote},
        {title:'Joined directly',detail:`${snapshot.durationLabel}: ${snapshot.startOn} to ${snapshot.endOn}. Upload your onboarding documents in the portal.`},
      ]);
      return {...offer,id:offer._id,applicationId,intern,emailSnapshot:snapshot,emailStatus:'direct-enrolled'};
    }
    if(['offer.preview','offer.send','offer.revise','offer.enrollDirect'].includes(method)) {
      // Direct enrolment: the student already agreed, so there is no decision window to wait for.
      const direct=method==='offer.enrollDirect'||(method==='offer.preview'&&p.direct===true);
      // Instant offer: staff pick the start date and the offer stays open until that day ends (no lead time).
      const instant=(['offer.preview','offer.send'].includes(method)&&!p.revising&&p.route==='instant')||((method==='offer.revise'||(method==='offer.preview'&&p.revising))&&old?.status==='Sent'&&old?.route==='instant');
      const duration=parseDuration(p.durationOverride||config?.durationSpec||config?.duration);
      if(!duration)throw new DomainError('INVALID_REQUEST','Set a precise program duration in Settings before preparing an offer.');
      const reason=String(p.reason||'').trim().slice(0,2000);
      if(p.durationOverride&&!reason)throw new DomainError('INVALID_REQUEST','A duration exception requires a reason.');
      let endOn:string;try{endOn=completionDate(p.startOn,duration);}catch(e:any){throw new DomainError('INVALID_REQUEST',e.message);}
      if(method!=='offer.revise'&&!(method==='offer.preview'&&p.revising&&old)&&p.startOn<civilToday())throw new DomainError('INVALID_REQUEST','Choose a start date today or later.');
      const days=direct||instant?0:Number(p.expiresInDays??7);if(!direct&&!instant&&(!Number.isInteger(days)||days<1||days>MAX_OPEN_DAYS))throw new DomainError('INVALID_REQUEST',`Choose a decision deadline of 1 to ${MAX_OPEN_DAYS} days.`);
      // The offer must close a lead time before day one. A revision that keeps an
      // already-running internship's start date only changes its length, so it is exempt.
      const leadDays=normalizeLeadDays(config?.onboardingLeadDays),expiresOn=direct?null:instant?(validStart(p.startOn)?endOfDayIst(p.startOn):null):decisionDeadline(now,days);
      const revising=method==='offer.revise'||(method==='offer.preview'&&p.revising&&old);
      if(!direct&&!instant&&(!revising||p.startOn!==old?.startOn)){const problem=offerWindowProblem({startOn:p.startOn,deadlineIso:expiresOn!,leadDays});if(problem)throw new DomainError('INVALID_REQUEST',problem);}
      const configRevision=String(config?.scheduleRevision||config?.duration||'');
      const preview={applicationId,startOn:p.startOn,endOn,duration,durationLabel:durationLabel(duration),configRevision,workMode:app.workMode||'remote',schedule:internScheduleLabel(app.schedule),expiresOn,leadDays,maxOpenDays:direct||instant?0:maxOpenDays(p.startOn,civilToday(),leadDays),direct,...(instant?{route:'instant'}:{})};
      if(method==='offer.preview')return preview;
      if(String(p.configRevision)!==configRevision)fail('Program duration changed or the preview is missing. Review the schedule again.');
      if(p.endOn&&p.endOn!==endOn)fail('The submitted completion date differs from the calculated schedule. Refresh the preview.');
      if(method==='offer.enrollDirect')return enrollDirect(preview,reason,now);
      if(method==='offer.send'&&instant) {
        if(!IN_PROCESS.includes(app.status))fail('Only applicants who are still in the hiring process can get an instant offer.');
        if(app.status!=='Selected') {
          if(await staffEmail())fail('This applicant email belongs to a staff account. Use a separate applicant email before sending an offer.');
          // An instant offer selects the applicant so they can activate their portal straight away.
          await apps.updateOne({_id:applicationId},{$set:{status:'Selected',statusChangedOn:now},$inc:{version:1},$push:{history:{id:`HST-${randomUUID()}`,title:'Selected for an instant offer',detail:'Application moved to Selected.',date:now}}} as any,opts);
          if(session)await auditDecision(collection('staff_audit'),session,actor,'application.status',applicationId,{from:app.status,to:'Selected'});
        }
      }
      else if(method==='offer.send'&&app.status!=='Selected')fail('Select this applicant before sending an offer.');
      if(method==='offer.send'&&old&&['Sent','Accepted'].includes(old.status))fail('An offer already exists. Use Revise schedule to preserve its history.');
      if(method==='offer.revise') {
        if(!old||!['Selected','Joined'].includes(app.status)||!['Sent','Accepted'].includes(old.status))fail('Only open or accepted offers can be revised.');
        if(!reason)throw new DomainError('INVALID_REQUEST','Explain why the schedule is changing.');
        if(old.pendingRevision&&old.pendingRevision.expiresOn>now)fail('Resolve or withdraw the existing revision first.');
        if(await collection('interns').findOne({applicationId,status:{$in:['Completed','Dropped']}},opts)||await collection('certificates').findOne({applicationId},opts))fail('Completed internships and issued certificates cannot be revised.');
      }
      const program=await collection('programs').findOne({_id:app.programId},opts),stipend=Number(p.stipend??old?.stipend??0);
      if(!program||!Number.isSafeInteger(stipend)||stipend<0||stipend>Number(program.stipend))throw new DomainError('INVALID_REQUEST','Choose a stipend within the program limit.');
      await archive();
      const version=Number(old?.latestVersion||old?.currentVersion|| (old?1:0))+1;
      const snapshot={...preview,_id:key(applicationId,version),version,name:app.name,email:app.email,college:app.college||'',program:app.program,stipend,stipendPeriod:'month',message:String(p.message??old?.message??'').slice(0,2000),reason,sentOn:now,issueDate:civilToday(new Date(now)),expiresOn,createdBy:actor!.id,status:'Sent'};
      await versions.insertOne(snapshot,opts);
      let result:any;
      if(old?.status==='Accepted') {
        await offers.updateOne({_id:old._id},{$set:{latestVersion:version,currentVersion:old.currentVersion||1,pendingRevision:snapshot},$inc:{revision:1}},opts);
        result={...old,currentVersion:old.currentVersion||1,latestVersion:version,pendingRevision:snapshot};
      } else {
        result={...snapshot,_id:old?._id||`OFFER-${randomUUID()}`,currentVersion:version,latestVersion:version,revision:Number(old?.revision||0)+1};
        await offers.replaceOne({applicationId},result,{...opts,upsert:true});
      }
      await history(method==='offer.revise'?'Offer schedule revision proposed':instant?'Instant offer sent':'Offer sent',`${snapshot.durationLabel}: ${snapshot.startOn} to ${snapshot.endOn}${reason?`. Reason: ${reason}`:''}`);
      return {...result,id:result._id,emailSnapshot:snapshot,emailStatus:method==='offer.revise'?'offer-revised':instant?'instant-offer':'offer'};
    }
    if(!old)fail('No offer is available.');
    await archive();
    const revisionAction=method.startsWith('offer.revision.'), target=revisionAction?old.pendingRevision:old;
    if(!target)fail('No schedule revision is awaiting a decision.');
    const version=Number(revisionAction?target.version:old.currentVersion||1);
    if(Number(p.version)!==version)fail('The offer changed. Refresh and review the current version before deciding.');
    if(revisionAction&&method==='offer.revision.withdraw') {
      await offers.updateOne({_id:old._id},{$unset:{pendingRevision:''},$inc:{revision:1}},opts);
      await versions.updateOne({_id:key(applicationId,version)},{$set:{decision:'Withdrawn',decidedOn:now}},opts);
      await history('Offer revision withdrawn',String(p.reason||target.reason));
      return {...old,pendingRevision:null,applicationId,emailSnapshot:{...old,version:old.currentVersion||1,reason:target.reason},emailStatus:'offer-revision-withdrawn'};
    }
    if(!(actor?.role==='intern'&&actor.applicationId===applicationId))throw new DomainError('FORBIDDEN','Only the applicant can decide on this offer.');
    if(!revisionAction&&(old.status!=='Sent'||app.status!=='Selected'))fail('This offer is no longer awaiting a decision.');
    if(target.expiresOn&&target.expiresOn<=now)throw new DomainError('OFFER_EXPIRED','The decision deadline has passed. Contact the Olentra team.');
    const accepted=method.endsWith('.accept'),decision=accepted?'Accepted':'Declined';
    // No backdated starts: an acceptance can't land after the day the internship was due to begin.
    if(accepted&&(!revisionAction||target.startOn!==old.startOn)&&target.startOn<civilToday())throw new DomainError('START_PASSED','Your start date has passed. The Olentra team will send you a revised schedule.');
    let result:any;
    if(revisionAction) {
      if(accepted){result={...target,_id:old._id,currentVersion:version,latestVersion:old.latestVersion,status:'Accepted',decidedOn:now,revision:Number(old.revision||0)+1};await offers.replaceOne({_id:old._id},result,opts);await collection('interns').updateOne({applicationId},{$set:{startOn:target.startOn,endOn:target.endOn,offerVersion:version,duration:target.duration,durationLabel:target.durationLabel}},opts);}
      else {await offers.updateOne({_id:old._id},{$unset:{pendingRevision:''},$inc:{revision:1}},opts);result={...old,pendingRevision:null};}
    } else {result={...old,revision:Number(old.revision||0)+1,currentVersion:version,status:decision,decidedOn:now,decisionReason:String(p.reason||'').slice(0,2000)};
await offers.updateOne({_id:old._id,status:'Sent'},{$set:{currentVersion:version,status:decision,decidedOn:now,decisionReason:String(p.reason||'').slice(0,2000)},$inc:{revision:1}},opts);if(!accepted)await apps.updateOne({_id:applicationId},{$set:{status:'Declined',statusChangedOn:now}},opts);}
    await versions.updateOne({_id:key(applicationId,version)},{$set:{decision,decidedOn:now,decisionReason:String(p.reason||'').slice(0,2000)}},opts);
    await history(revisionAction?`Offer revision ${decision.toLowerCase()}`:`Offer ${decision.toLowerCase()}`,`${target.startOn} to ${target.endOn}. ${accepted?'Schedule confirmed.':'Previous accepted terms remain effective when applicable.'}`);
    // Accepting an instant offer makes the student an intern straight away.
    if(!revisionAction&&accepted&&old.route==='instant')result.intern=await joinAsIntern(old,version,'instant',[{title:'Joined',detail:`Instant offer accepted. ${old.durationLabel}: ${old.startOn} to ${old.endOn}. Upload your onboarding documents in the portal.`}]);
    return {...result,id:old._id,applicationId,emailSnapshot:revisionAction&&!accepted?{...old,version:old.currentVersion||1,reason:target.reason}:{...target,version,decidedOn:now},emailStatus:revisionAction?(accepted?'offer-revision-accepted':'offer-revision-declined'):(accepted?'offer-accepted':undefined)};
  }
  return {supports:(method:string)=>methods.has(method),execute,initialize:()=>versions.createIndex({applicationId:1,version:1},{unique:true})};
}
