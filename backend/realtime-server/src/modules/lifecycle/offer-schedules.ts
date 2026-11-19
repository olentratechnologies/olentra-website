import { randomUUID } from 'node:crypto';
import type { ClientSession } from 'mongodb';
import type { Principal } from '../../shared/principal';
import { DomainError } from '../../shared/errors';
import { requireAdmin } from '../access/policy';
import { parseDuration, durationLabel, completionDate, civilToday, legacyDuration } from '../programs/schedule.mjs';
import { internScheduleLabel } from '../programs/opportunities.mjs';
const fail=(message:string):never=>{throw new DomainError('CONFLICT',message);};
const key=(id:string,version:number)=>`${id}:v${version}`;
export function createOfferSchedules(collection:any) {
  const offers=collection('offers'), versions=collection('offer_versions'), apps=collection('applications'), settings=collection('settings');
  const methods=new Set(['offer.preview','offer.versions','offer.send','offer.accept','offer.decline','offer.revise','offer.revision.accept','offer.revision.decline','offer.revision.withdraw']);
  async function execute(method:string,p:any,actor:Principal|null,session?:ClientSession) {
    const opts=session?{session}:{}, applicationId=String(p.applicationId||'');
    if(['offer.preview','offer.send','offer.revise','offer.revision.withdraw'].includes(method)) requireAdmin(actor);
    else if(!(actor?.role==='company'&&actor.staffRole==='admin')&&!(actor?.role==='intern'&&actor.applicationId===applicationId)) throw new DomainError('FORBIDDEN','This offer belongs to another account.');
    const app=await apps.findOne({_id:applicationId},opts);if(!app)throw new DomainError('NOT_FOUND','Application not found.');
    const old=await offers.findOne({applicationId},opts),config=await settings.findOne({_id:'program'},opts);
    if(method==='offer.versions')return (await versions.find({applicationId},opts).sort({version:-1}).toArray()).map(({_id,...v}:any)=>({id:_id,...v}));
    const now=new Date().toISOString();
    const history=async(title:string,detail:string)=>apps.updateOne({_id:applicationId},{$inc:{version:1},$push:{history:{id:`HST-${randomUUID()}`,title,detail,date:now}}},opts);
    const archive=async()=>{if(old&&!old.currentVersion)await versions.updateOne({_id:key(applicationId,1)},{$setOnInsert:{...old,_id:key(applicationId,1),applicationId,version:1,durationLabel:legacyDuration(old.startOn,old.endOn),legacy:true,issueDate:old.issueDate||old.sentOn||old.decidedOn,name:app.name,email:app.email,program:app.program,workMode:app.workMode,schedule:internScheduleLabel(app.schedule)}},{...opts,upsert:true});};
    if(['offer.preview','offer.send','offer.revise'].includes(method)) {
      const duration=parseDuration(p.durationOverride||config?.durationSpec||config?.duration);
      if(!duration)throw new DomainError('INVALID_REQUEST','Set a precise program duration in Settings before preparing an offer.');
      const reason=String(p.reason||'').trim().slice(0,2000);
      if(p.durationOverride&&!reason)throw new DomainError('INVALID_REQUEST','A duration exception requires a reason.');
      let endOn:string;try{endOn=completionDate(p.startOn,duration);}catch(e:any){throw new DomainError('INVALID_REQUEST',e.message);}
      if(method!=='offer.revise'&&!(method==='offer.preview'&&p.revising&&old)&&p.startOn<civilToday())throw new DomainError('INVALID_REQUEST','Choose a start date today or later.');
      const configRevision=String(config?.scheduleRevision||config?.duration||'');
      const preview={applicationId,startOn:p.startOn,endOn,duration,durationLabel:durationLabel(duration),configRevision,workMode:app.workMode||'remote',schedule:internScheduleLabel(app.schedule)};
      if(method==='offer.preview')return preview;
      if(String(p.configRevision)!==configRevision)fail('Program duration changed or the preview is missing. Review the schedule again.');
      if(p.endOn&&p.endOn!==endOn)fail('The submitted completion date differs from the calculated schedule. Refresh the preview.');
      if(method==='offer.send'&&app.status!=='Selected')fail('Select this applicant before sending an offer.');
      if(method==='offer.send'&&old&&['Sent','Accepted'].includes(old.status))fail('An offer already exists. Use Revise schedule to preserve its history.');
      if(method==='offer.revise') {
        if(!old||!['Selected','Joined'].includes(app.status)||!['Sent','Accepted'].includes(old.status))fail('Only open or accepted offers can be revised.');
        if(!reason)throw new DomainError('INVALID_REQUEST','Explain why the schedule is changing.');
        if(old.pendingRevision&&old.pendingRevision.expiresOn>now)fail('Resolve or withdraw the existing revision first.');
        if(await collection('interns').findOne({applicationId,status:{$in:['Completed','Dropped']}},opts)||await collection('certificates').findOne({applicationId},opts))fail('Completed internships and issued certificates cannot be revised.');
      }
      const days=Number(p.expiresInDays??7);if(!Number.isInteger(days)||days<1||days>30)throw new DomainError('INVALID_REQUEST','Choose a decision deadline of 1 to 30 days.');
      const program=await collection('programs').findOne({_id:app.programId},opts),stipend=Number(p.stipend??old?.stipend??0);
      if(!program||!Number.isSafeInteger(stipend)||stipend<0||stipend>Number(program.stipend))throw new DomainError('INVALID_REQUEST','Choose a stipend within the program limit.');
      await archive();
      const version=Number(old?.latestVersion||old?.currentVersion|| (old?1:0))+1;
      const snapshot={...preview,_id:key(applicationId,version),version,name:app.name,email:app.email,college:app.college||'',program:app.program,stipend,stipendPeriod:'month',message:String(p.message??old?.message??'').slice(0,2000),reason,sentOn:now,issueDate:civilToday(new Date(now)),expiresOn:new Date(Date.parse(now)+days*86400000).toISOString(),createdBy:actor!.id,status:'Sent'};
      await versions.insertOne(snapshot,opts);
      let result:any;
      if(old?.status==='Accepted') {
        await offers.updateOne({_id:old._id},{$set:{latestVersion:version,currentVersion:old.currentVersion||1,pendingRevision:snapshot},$inc:{revision:1}},opts);
        result={...old,currentVersion:old.currentVersion||1,latestVersion:version,pendingRevision:snapshot};
      } else {
        result={...snapshot,_id:old?._id||`OFFER-${randomUUID()}`,currentVersion:version,latestVersion:version,revision:Number(old?.revision||0)+1};
        await offers.replaceOne({applicationId},result,{...opts,upsert:true});
      }
      await history(method==='offer.revise'?'Offer schedule revision proposed':'Offer sent',`${snapshot.durationLabel}: ${snapshot.startOn} to ${snapshot.endOn}${reason?`. Reason: ${reason}`:''}`);
      return {...result,id:result._id,emailSnapshot:snapshot,emailStatus:method==='offer.revise'?'offer-revised':'offer'};
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
    let result:any;
    if(revisionAction) {
      if(accepted){result={...target,_id:old._id,currentVersion:version,latestVersion:old.latestVersion,status:'Accepted',decidedOn:now,revision:Number(old.revision||0)+1};await offers.replaceOne({_id:old._id},result,opts);await collection('interns').updateOne({applicationId},{$set:{startOn:target.startOn,endOn:target.endOn,offerVersion:version,duration:target.duration,durationLabel:target.durationLabel}},opts);}
      else {await offers.updateOne({_id:old._id},{$unset:{pendingRevision:''},$inc:{revision:1}},opts);result={...old,pendingRevision:null};}
    } else {result={...old,revision:Number(old.revision||0)+1,currentVersion:version,status:decision,decidedOn:now,decisionReason:String(p.reason||'').slice(0,2000)};await offers.updateOne({_id:old._id,status:'Sent'},{$set:{currentVersion:version,status:decision,decidedOn:now,decisionReason:String(p.reason||'').slice(0,2000)},$inc:{revision:1}},opts);if(!accepted)await apps.updateOne({_id:applicationId},{$set:{status:'Declined',statusChangedOn:now}},opts);}
    await versions.updateOne({_id:key(applicationId,version)},{$set:{decision,decidedOn:now,decisionReason:String(p.reason||'').slice(0,2000)}},opts);
    await history(revisionAction?`Offer revision ${decision.toLowerCase()}`:`Offer ${decision.toLowerCase()}`,`${target.startOn} to ${target.endOn}. ${accepted?'Schedule confirmed.':'Previous accepted terms remain effective when applicable.'}`);
    return {...result,id:old._id,applicationId,emailSnapshot:revisionAction&&!accepted?{...old,version:old.currentVersion||1,reason:target.reason}:{...target,version,decidedOn:now},emailStatus:revisionAction?(accepted?'offer-revision-accepted':'offer-revision-declined'):(accepted?'offer-accepted':undefined)};
  }
  return {supports:(method:string)=>methods.has(method),execute,initialize:()=>versions.createIndex({applicationId:1,version:1},{unique:true})};
}
