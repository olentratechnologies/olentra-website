/** Dry-run by default. --apply preserves dates and archives legacy offers; never sends mail. */
import { MongoClient } from 'mongodb';
import { randomUUID } from 'node:crypto';
import { internshipMongoUri } from '../src/config/env';
import { parseDuration, durationLabel, legacyDuration, scheduleMismatch } from '../src/modules/programs/schedule.mjs';
import { internRoleLabel, internScheduleLabel } from '../src/modules/programs/opportunities.mjs';
const uri=internshipMongoUri();if(!uri)throw new Error('Configure INTERNSHIP_MONGODB_URI before running this migration.');
const apply=process.argv.includes('--apply'),prefix=process.env.INTERNSHIP_COLLECTION_PREFIX||'intern_';
const client=new MongoClient(uri,{serverSelectionTimeoutMS:5000});
try {
  await client.connect();const db=client.db(),c=(name:string)=>db.collection<any>(prefix+name);
  const config=await c('settings').findOne({_id:'program'}),duration=parseDuration(config?.durationSpec||config?.duration);
  const allOffers=await c('offers').find({}).toArray();
  const legacy=allOffers.filter(offer=>!offer.currentVersion);
  const mismatches=allOffers.filter(offer=>scheduleMismatch(offer,config));
  console.info(JSON.stringify({mode:apply?'apply':'dry-run',durationConvertible:!!duration,configuredDuration:duration?durationLabel(duration):"Requires admin review",legacyOffers:legacy.length,reviewRequired:mismatches.length,emailsWillBeSent:0},null,2));
  if(apply) {
    await c('offer_versions').createIndex({applicationId:1,version:1},{unique:true});
    if(duration&&!config?.durationSpec)await c('settings').updateOne({_id:'program'},{$set:{durationSpec:duration,scheduleRevision:randomUUID()}});
    for(const record of legacy) {
      const session=client.startSession();try{await session.withTransaction(async()=>{
        const offer=await c('offers').findOne({_id:record._id,currentVersion:{$exists:false}},{session});if(!offer)return;
        const app=await c('applications').findOne({_id:offer.applicationId},{session});if(!app)return;
        const snapshot={...offer,_id:`${offer.applicationId}:v1`,version:1,legacy:true,durationLabel:legacyDuration(offer.startOn,offer.endOn),name:app.name,email:app.email,college:app.college||'',program:app.program,roleTitle:internRoleLabel(app.roleId),schedule:internScheduleLabel(app.schedule),workMode:app.workMode||'remote',issueDate:offer.sentOn||offer.decidedOn,createdBy:'legacy-migration',...(offer.status==='Accepted'?{decision:'Accepted'}:{})};
        await c('offer_versions').updateOne({_id:snapshot._id},{$setOnInsert:snapshot},{upsert:true,session});
        await c('offers').updateOne({_id:offer._id},{$set:{currentVersion:1,latestVersion:1,revision:1,legacy:true,durationLabel:snapshot.durationLabel,issueDate:snapshot.issueDate,scheduleReviewRequired:scheduleMismatch(offer,config)}},{session});
        await c('outbox').updateMany({status:'pending',type:'applicantStatus','payload.applicationId':offer.applicationId,'payload.status':{$in:['offer','offer-accepted','onboarding']},'payload.offerSnapshot':{$exists:false}},{$set:{'payload.offerVersion':'1','payload.offerSnapshot':JSON.stringify(snapshot)}},{session});
      });}finally{await session.endSession();}
    }
    console.info('Legacy schedules archived without changing dates or sending emails.');
  }
} finally {await client.close();}
