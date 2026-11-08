import fixtures from "../../data/admin/content.json" with { type: "json" };
import { selectInternProgress } from "./selectors.mjs";

const K={content:"olentra-admin-content-v1",applications:"olentra-admin-applications-v1",interns:"olentra-admin-interns",programs:"olentra-admin-opportunities",projects:"olentra-admin-projects",certificates:"olentra-admin-certificates",enquiries:"olentra-admin-enquiries-v1",media:"olentra-admin-media-v1"};
const clone=value=>JSON.parse(JSON.stringify(value));
const clean=value=>String(value??"").trim();
const record=(ctx,key,id)=>{const item=ctx.get(key,[]).find(row=>row.id===id);ctx.assert(item,"The requested record could not be found.");return item;};
const replace=(ctx,key,id,value)=>ctx.update(key,rows=>rows.map(row=>row.id===id?value:row));
const log=(ctx,action,module,details,href)=>{ctx.audit(action,module,details);ctx.notify({title:action,body:details.resource||details.description||"Workspace data updated.",category:module,severity:"info",href});};
const display=iso=>new Date(iso).toLocaleString("en-GB",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"UTC"})+" UTC";
const addActivity=(row,action,ctx,details={})=>[...(row.activity||[]),{id:ctx.id("activity"),date:display(ctx.now),at:ctx.now,action,role:ctx.actor,...details}];
const modelKey=id=>"olentra-admin-page-"+id;
const historyKey=id=>"olentra-admin-page-history-"+id;
function validateModel(ctx,model){ctx.assert(model&&typeof model==="object"&&!Array.isArray(model),"Provide page content.");ctx.assert(clean(model.title),"A section title is required.");ctx.assert(typeof model.description==="string","Enter a valid description.");ctx.assert(!model.destination||/^(\/(?!\/)|#|https?:\/\/)/.test(model.destination),"Button destinations must be a website path or HTTP(S) link.");}
function saveVersion(ctx,id,model,status){const version={id:ctx.id("version"),date:display(ctx.now),at:ctx.now,status,model:clone(model),actor:ctx.actor};ctx.update(historyKey(id),items=>[version,...items]);return version;}
export function handleContentCommand(type,payload={},ctx){
  if(type==="task.create"){
    const project=record(ctx,K.projects,payload.projectId),title=clean(payload.title);ctx.assert(title&&title.length<=180,"Enter a task title of180characters or fewer.");
    const candidates=ctx.get(K.interns,[]).filter(intern=>project.internIds.includes(intern.id)&&intern.status==="Active");const intern=payload.internId?candidates.find(item=>item.id===payload.internId):candidates[0];ctx.assert(intern,"Choose an active intern assigned to this project.");
    const task={...clone(fixtures.reference.newTask),id:ctx.id("task"),title,projectId:project.id,internId:intern.id,intern:intern.id,status:"To do",required:true,version:0,submitted:null,notes:"",file:null,workLink:"",history:[],due:new Date(Date.parse(ctx.now)+7*86400000).toISOString().slice(0,10)};
    ctx.update("olentra-admin-project-tasks-"+project.id,items=>[...items,task]);log(ctx,"Project task created","Careers & Internships",{resource:title,internId:intern.id},"/dashboard/careers/projects/"+project.id+"/tasks/"+task.id);return{value:task};
  }
  if(type==="task.submit"){
    const project=record(ctx,K.projects,payload.projectId),key="olentra-admin-project-tasks-"+project.id,task=record(ctx,key,payload.taskId);ctx.assert(["To do","In progress","Changes requested"].includes(task.status),"Only open tasks can receive a new submission.");
    const intern=record(ctx,K.interns,task.internId||task.intern);ctx.assert(intern.status==="Active","Only active interns can submit work.");ctx.assert(clean(payload.notes).length>=3,"Add submission notes before submitting work.");ctx.assert(!payload.workLink||/^https?:\/\/[^\s]+$/.test(payload.workLink),"Enter a valid HTTP(S) work link.");
    const next={...task,status:"In review",version:Number(task.version||0)+1,submitted:display(ctx.now),submittedAt:ctx.now,notes:clean(payload.notes),workLink:clean(payload.workLink),file:payload.file||task.file,history:[...(task.history||[]),{version:Number(task.version||0)+1,status:"Submitted",date:display(ctx.now),feedback:"",at:ctx.now}]};replace(ctx,key,task.id,next);log(ctx,"Work submitted for review","Careers & Internships",{resource:task.title,internId:intern.id,version:next.version},"/dashboard/careers/projects/"+project.id+"/tasks/"+task.id);return{value:next};
  }
  if(type==="content.save"){
    const row=record(ctx,K.content,payload.id),model=clone(payload.model);validateModel(ctx,model);
    const status=payload.status||"Draft";ctx.assert(["Draft","In review"].includes(status),"Save a draft or request a review.");
    const before=ctx.get(modelKey(row.id),{});ctx.set(modelKey(row.id),model);replace(ctx,K.content,row.id,{...row,status,updated:"Just now",updatedAt:ctx.now});const version=saveVersion(ctx,row.id,model,status);
    if(status==="In review")ctx.command("approval.request",{kind:"content",type:"Content",title:"Publish "+row.title,reason:"Content is ready for review.",scope:row.locale||"EN",target:{id:row.id,model:clone(model),versionId:version.id}});
    log(ctx,status==="In review"?"Content submitted for review":"Content draft saved","Content",{resource:row.title,before,after:model,restore:{key:modelKey(row.id),before,after:model}},"/dashboard/content/pages/"+row.id+"/edit");return{value:version};
  }
  if(type==="content.publish"){
    const row=record(ctx,K.content,payload.id),current=ctx.get(modelKey(row.id),{}),model=clone(payload.model||current);validateModel(ctx,model);
    const key="olentra-admin-published-page-"+row.id,before=ctx.get(key,null);ctx.set(key,model);
    const stillCurrent=JSON.stringify(current)===JSON.stringify(model);replace(ctx,K.content,row.id,{...row,status:stillCurrent?"Published":"Draft",publishedAt:ctx.now,updated:"Just now",updatedAt:ctx.now});saveVersion(ctx,row.id,model,"Published");
    const seo=ctx.get("admin-seo-pages",[]);const seoId=row.id==="homepage"?"home":row.id;const existing=seo.find(item=>item.id===seoId);if(existing)ctx.set("admin-seo-pages",seo.map(item=>item.id===seoId?{...item,title:model.seo||item.title,description:model.description.slice(0,160),updatedAt:ctx.now}:item));
    log(ctx,"Content published","Content",{resource:row.title,approval:payload.approvalId,before,after:model,restore:{key,before,after:model}},"/dashboard/content/pages/"+row.id+"/edit");return{value:{id:row.id,published:model,newerDraftPreserved:!stillCurrent}};
  }
  if(type==="content.restore"){
    record(ctx,K.content,payload.id);const version=ctx.get(historyKey(payload.id),[]).find(item=>item.id===payload.versionId);ctx.assert(version,"The selected version is not available.");
    return ctx.command("content.save",{id:payload.id,model:version.model,status:"Draft"});
  }
  if(type==="application.transition"){
    const row=record(ctx,K.applications,payload.id),status=payload.status;ctx.assert(fixtures.reference.stages.includes(status),"Choose a valid application stage.");ctx.assert(status!==row.stage,"This application is already in that stage.");
    const transitions={New:["Screening","Declined"],Screening:["New","Interview","Declined"],Interview:["Screening","Offer","Declined"],Offer:["Interview","Joined","Declined"],Joined:[],Declined:["Screening"]};
    ctx.assert(transitions[row.stage]?.includes(status),"Move through screening, interview and offer before joining. Joined applications are managed through the intern lifecycle.");
    if(status==="Declined")ctx.assert(clean(payload.reason),"Add a reason before declining an application.");
    const next={...row,stage:status,updatedAt:ctx.now,activity:addActivity(row,"Moved to "+status,ctx,{reason:clean(payload.reason)})};
    if(status==="Joined"){
      const interns=ctx.get(K.interns,[]);ctx.assert(!interns.some(item=>item.applicationId===row.id||item.id===row.id),"This application already has an intern record.");
      const program=ctx.get("olentra-admin-program-"+row.programId,{});const count=interns.filter(item=>item.programId===row.programId&&["Active","Onboarding"].includes(item.status)).length;ctx.assert(!program.capacity||count<program.capacity,"This program has reached its capacity.");
      const intern={id:row.id,applicationId:row.id,programId:row.programId,track:row.track,status:"Onboarding",progress:0,projectIds:[],project:"Unassigned",start:ctx.now.slice(0,10),end:program.closes||"",mentor:"Unassigned",timezone:program.timezone||"Asia/Kolkata",activity:[{id:ctx.id("activity"),date:display(ctx.now),at:ctx.now,action:"Joined program",role:ctx.actor}]};ctx.set(K.interns,[...interns,intern]);ctx.set("olentra-admin-intern-checks-"+intern.id,[true,true,false,false,false]);ctx.set("olentra-admin-intern-completion-"+intern.id,[false,false,false]);
    }
    replace(ctx,K.applications,row.id,next);log(ctx,"Application stage updated","Careers & Internships",{resource:"Applicant "+row.id,before:row.stage,after:status,reason:payload.reason},"/dashboard/careers/applications/"+row.id);return{value:next};
  }
  if(type==="application.update"){
    const row=record(ctx,K.applications,payload.id),patch=payload.patch||{};ctx.assert(Object.keys(patch).every(key=>["owner"].includes(key)),"Application stages must be changed through the review workflow.");ctx.assert(clean(patch.owner),"Choose a reviewer.");const next={...row,owner:clean(patch.owner),updatedAt:ctx.now,activity:addActivity(row,"Reviewer assigned",ctx,{owner:patch.owner})};replace(ctx,K.applications,row.id,next);log(ctx,"Application assigned","Careers & Internships",{resource:"Applicant "+row.id,before:row.owner,after:next.owner},"/dashboard/careers/applications/"+row.id);return{value:next};
  }
  if(["application.note","application.message","application.offer"].includes(type)){
    const row=record(ctx,K.applications,payload.id),text=clean(payload.text||payload.message);ctx.assert(text,"Enter a message before saving.");
    if(type==="application.offer")ctx.assert(row.stage==="Offer","Move the application to Offer before sending an offer.");
    if(type==="application.note")ctx.update("olentra-admin-applicant-notes-"+row.id,items=>[...items,{id:ctx.id("note"),text,date:display(ctx.now),at:ctx.now,author:ctx.actor,private:true}]);
    else{const item={id:ctx.id("message"),text,date:display(ctx.now),at:ctx.now,author:ctx.actor,kind:type==="application.offer"?"Offer":"Information request"};ctx.update("olentra-admin-applicant-messages-"+row.id,items=>[...items,item]);replace(ctx,K.applications,row.id,{...row,...(type==="application.offer"?{offer:{status:"Sent",message:text,sentAt:ctx.now}}:{}),activity:addActivity(row,item.kind+" sent",ctx)});}
    log(ctx,type==="application.note"?"Private applicant note saved":type==="application.offer"?"Offer recorded":"Information request recorded","Careers & Internships",{resource:"Applicant "+row.id,private:type==="application.note"},"/dashboard/careers/applications/"+row.id);return{value:{saved:true}};
  }
  if(type==="task.review"){
    record(ctx,K.projects,payload.projectId);const key="olentra-admin-project-tasks-"+payload.projectId,task=record(ctx,key,payload.taskId);ctx.assert(["In review","Changes requested"].includes(task.status),"Only submitted work can be reviewed.");ctx.assert(["approve","changes"].includes(payload.decision),"Choose approve or request changes.");if(payload.decision==="changes")ctx.assert(clean(payload.feedback).length>=3,"Add feedback before requesting changes.");
    const status=payload.decision==="approve"?"Approved":"Changes requested",review={id:ctx.id("review"),taskId:task.id,task:task.title,status,feedback:clean(payload.feedback),date:display(ctx.now),at:ctx.now,reviewer:ctx.actor,version:task.version||1};
    replace(ctx,key,task.id,{...task,status,feedback:review.feedback,reviewedAt:ctx.now,history:[...(task.history||[]),{title:status,status,version:task.version||1,feedback:review.feedback,date:review.date,description:review.feedback,at:ctx.now}]});ctx.update("olentra-admin-project-reviews-"+payload.projectId,items=>[...items,review]);log(ctx,"Submission "+(payload.decision==="approve"?"approved":"returned for changes"),"Careers & Internships",{resource:task.title,internId:task.internId||task.intern,before:task.status,after:status},"/dashboard/careers/projects/"+payload.projectId+"/tasks/"+task.id);return{value:review};
  }
  if(type==="intern.transition"){
    const intern=record(ctx,K.interns,payload.id),status=payload.status;ctx.assert(fixtures.reference.internStatuses.includes(status),"Choose a valid intern status.");ctx.assert(status!==intern.status,"This intern already has that status.");ctx.assert(intern.status!=="Completed","Completed internships are closed. Revoke a certificate separately if needed.");
    if(status==="Active")ctx.assert(ctx.get("olentra-admin-intern-checks-"+intern.id,[]).every(Boolean),"Complete and approve all onboarding checks before activating this intern.");
    if(status==="Completed"){ctx.assert(intern.status==="Active","Only active interns can be completed.");ctx.assert(selectInternProgress(ctx.snapshot({all:true}),intern.id).complete,"All required assigned tasks must be approved before completion.");const checks=ctx.get("olentra-admin-intern-completion-"+intern.id,[]);ctx.assert(checks[1]&&checks[2],"Confirm mentor review and administrative closure before completion.");}
    const next={...intern,status,updatedAt:ctx.now,activity:addActivity(intern,"Status changed to "+status,ctx)};replace(ctx,K.interns,intern.id,next);log(ctx,"Intern status updated","Careers & Internships",{resource:"Intern "+intern.id,before:intern.status,after:status},"/dashboard/careers/interns/"+intern.id);return{value:next};
  }
  if(type==="certificate.issue"){
    const intern=record(ctx,K.interns,payload.internId);ctx.assert(intern.status==="Completed","Complete the internship before issuing a certificate.");ctx.assert(selectInternProgress(ctx.snapshot({all:true}),intern.id).complete,"All required tasks must be approved before issuing a certificate.");
    const list=ctx.get(K.certificates,[]),existing=list.find(item=>(item.internId||item.id)===intern.id);ctx.assert(existing?.status!=="Issued","This intern already has an issued certificate.");
    const next={id:intern.id,internId:intern.id,track:intern.track,date:display(ctx.now),issuedAt:ctx.now,eligibility:"Approved",status:"Issued",serial:"OL-"+ctx.now.slice(0,4)+"-"+intern.id+"-"+(Number(existing?.version||0)+1),version:Number(existing?.version||0)+1,portalPublished:true,history:[...(existing?.history||[]),{at:ctx.now,action:"Issued",actor:ctx.actor}]};ctx.set(K.certificates,existing?list.map(item=>item.id===existing.id?next:item):[...list,next]);log(ctx,"Certificate issued","Careers & Internships",{resource:"Intern "+intern.id,serial:next.serial},"/dashboard/careers/certificates");return{value:next};
  }
  if(type==="certificate.revoke"||type==="certificate.publish"){
    const certificate=record(ctx,K.certificates,payload.id);ctx.assert(certificate.status==="Issued","Only an issued certificate can be changed.");if(type==="certificate.revoke")ctx.assert(clean(payload.reason),"Provide a reason for revoking this certificate.");
    const next=type==="certificate.publish"?{...certificate,portalPublished:true}:{...certificate,status:"Revoked",portalPublished:false,revokedAt:ctx.now,reason:clean(payload.reason),history:[...(certificate.history||[]),{at:ctx.now,action:"Revoked",reason:clean(payload.reason),actor:ctx.actor}]};replace(ctx,K.certificates,certificate.id,next);log(ctx,type==="certificate.publish"?"Certificate shared to portal":"Certificate revoked","Careers & Internships",{resource:certificate.serial,reason:payload.reason},"/dashboard/careers/certificates");return{value:next};
  }
  if(type==="program.publish"){
    const row=record(ctx,K.programs,payload.id),key="olentra-admin-program-"+row.id,current=ctx.get(key,{}),model=clone(payload.model||current);ctx.assert(clean(model.title)&&clean(model.description),"Complete the program title and description.");ctx.assert(Number.isInteger(Number(model.capacity))&&Number(model.capacity)>0,"Capacity must be a positive whole number.");ctx.assert(Number.isFinite(Date.parse(model.opens))&&Number.isFinite(Date.parse(model.closes))&&model.closes>model.opens,"Choose valid program dates.");ctx.assert(["public","applications","portal"].every(field=>typeof model[field]==="boolean"),"Program visibility settings must be booleans.");const publishedKey="olentra-admin-published-program-"+row.id,before=ctx.get(publishedKey,null),next={...model,status:"Published",publishedAt:ctx.now};ctx.set(publishedKey,next);if(JSON.stringify(current)===JSON.stringify(model))ctx.set(key,next);replace(ctx,K.programs,row.id,{...row,title:next.title,status:next.applications?"Open":"Closed",publicationStatus:"Published",closing:next.closes,updatedAt:ctx.now});log(ctx,"Internship program published","Careers & Internships",{resource:next.title,approval:payload.approvalId,before,after:next,restore:{key:publishedKey,before,after:next}},"/dashboard/careers/programs/"+row.id+"/edit");return{value:next};
  }
  if(type==="program.save"){
    const row=record(ctx,K.programs,payload.id),model=clone(payload.model);ctx.assert(clean(model?.title)&&clean(model?.description),"Complete the title and description.");ctx.assert(Number.isInteger(Number(model.capacity))&&Number(model.capacity)>0,"Capacity must be a positive whole number.");ctx.assert(/^\d{4}-\d{2}-\d{2}$/.test(model.opens)&&model.closes>model.opens,"Closing date must be after the opening date.");const active=ctx.get(K.interns,[]).filter(item=>item.programId===row.id&&["Active","Onboarding"].includes(item.status)).length;ctx.assert(Number(model.capacity)>=active,"Capacity cannot be below the number of current interns.");const status=payload.status||model.status||"Draft";ctx.assert(["Draft","In review","Published"].includes(status),"Choose a valid program status.");
    const key="olentra-admin-program-"+row.id,before=ctx.get(key,{}),next={...model,status,capacity:Number(model.capacity),updatedAt:ctx.now};ctx.set(key,next);replace(ctx,K.programs,row.id,{...row,title:next.title,publicationStatus:status,closing:next.closes,updatedAt:ctx.now});if(status==="In review")ctx.command("approval.request",{kind:"program",type:"Program",title:"Publish "+next.title,reason:"Program details are ready for review.",target:{id:row.id,model:clone(next)}});log(ctx,"Program saved","Careers & Internships",{resource:row.title,before,after:next,restore:{key,before,after:next}},"/dashboard/careers/programs/"+row.id+"/edit");return{value:next};
  }
  if(type==="enquiry.update"){
    const row=record(ctx,K.enquiries,payload.id),patch=payload.patch||{};ctx.assert(Object.keys(patch).every(key=>["owner","status","priority","followup"].includes(key)),"Unsupported enquiry change.");if(patch.status)ctx.assert(["New","Assigned","In progress","Awaiting reply","Resolved","Spam"].includes(patch.status),"Choose a valid enquiry status.");if(patch.followup){ctx.assert(/^\d{4}-\d{2}-\d{2}$/.test(patch.followup.date)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(patch.followup.time),"Choose a valid follow-up date and time.");ctx.assert(Date.parse(patch.followup.date+"T"+patch.followup.time+":00Z")>Date.parse(ctx.now),"Follow-up time must be in the future.");ctx.set("olentra-admin-enquiry-followup-"+row.id,{...patch.followup,saved:true});}const next={...row,...patch,updatedAt:ctx.now,activity:addActivity(row,"Enquiry updated",ctx)};replace(ctx,K.enquiries,row.id,next);log(ctx,"Enquiry updated","Forms & Enquiries",{resource:row.topic,before:{owner:row.owner,status:row.status},after:{owner:next.owner,status:next.status}},"/dashboard/enquiries/"+row.id);return{value:next};
  }
  if(type==="enquiry.note"||type==="enquiry.reply"){
    const row=record(ctx,K.enquiries,payload.id),text=clean(payload.text);ctx.assert(text,"Enter a message before saving.");ctx.assert(text.length<=10000,"Messages must be no longer than 10,000 characters.");const note={id:ctx.id(type==="enquiry.note"?"note":"reply"),text,message:text,date:display(ctx.now),at:ctx.now,author:ctx.actor,private:type==="enquiry.note"};ctx.update("olentra-admin-enquiry-"+(type==="enquiry.note"?"notes-":"replies-")+row.id,items=>[...items,note]);if(type==="enquiry.reply"){ctx.set("olentra-admin-enquiry-draft-"+row.id,"");replace(ctx,K.enquiries,row.id,{...row,status:"Awaiting reply",activity:addActivity(row,"Reply recorded",ctx),updatedAt:ctx.now});}log(ctx,type==="enquiry.note"?"Private enquiry note saved":"Enquiry reply recorded","Forms & Enquiries",{resource:row.topic,private:type==="enquiry.note"},"/dashboard/enquiries/"+row.id);return{value:note};
  }
  if(type==="media.update"){
    const row=record(ctx,K.media,payload.id),patch=payload.patch||{};ctx.assert(Object.keys(patch).every(key=>["alt","title","folder"].includes(key)),"Unsupported media change.");ctx.assert(!Object.hasOwn(patch,"title")||clean(patch.title),"Asset name cannot be empty.");const next={...row,...patch,updatedAt:ctx.now};replace(ctx,K.media,row.id,next);log(ctx,"Media details saved","Content",{resource:next.title,before:row,after:next},"/dashboard/content/media");return{value:next};
  }
  return false;
}
