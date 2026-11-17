import { handleContentCommand } from "./content-commands.mjs";
import { handleOperationsCommand } from "./operations-commands.mjs";
import { handleGovernanceCommand } from "./governance-commands.mjs";
import { can, effectiveFeatures, selectInternProgress } from "./selectors.mjs";

export const SCHEMA_VERSION=2;
export const AUDIT_KEY="olentra-admin-governance-audit-v1";
export const NOTICE_KEY="olentra-admin-notifications-v1";
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
const safeKey=key=>typeof key==="string"&&!["__proto__","constructor","prototype"].includes(key);
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
const PRIVATE_KEYS=new Set([AUDIT_KEY,NOTICE_KEY,"olentra-admin-backups-v1","auth-accounts","auth-session"]);
// Datasets from the retired browser-only demo login and team directory. Saved
// browser data is scrubbed of them so no demo credentials survive the upgrade.
const RETIRED_DEMO_KEYS=["auth-pending","auth-reset","auth-trusted-devices","auth-remembered-email","admin-team-members","admin-team-invitations","olentra-admin-security-sessions-v1","olentra-admin-sso-preview-v1","olentra-admin-security-policy-v1"];
const hasDemoSecrets=account=>account&&typeof account==="object"&&["passwordDigest","mfaCode","recoveryDigests"].some(field=>field in account);
const TELEMETRY=new Set(["admin-visit-events","admin-performance-probes"]);
export function resolveDataset(state,key,fallback=null){if(own(state.datasets,key))return state.datasets[key];const prefix=Object.keys(state.templates||{}).sort((a,b)=>b.length-a.length).find(item=>key.startsWith(item));return prefix?state.templates[prefix]:fallback;}
export function createInitialState(parts){
  const domains=Array.isArray(parts)?parts:Object.values(parts);const state={meta:{schemaVersion:SCHEMA_VERSION,revision:0,clock:"2026-11-08T12:00:00.000Z"},datasets:{},templates:{},reference:{}};
  for(const [index,part] of domains.entries()){Object.assign(state.meta,part.meta||{});Object.assign(state.datasets,clone(part.datasets||{}));Object.assign(state.templates,clone(part.templates||{}));state.reference[part.domain||["core","content","operations","governance"][index]]=clone(part.reference||{});}
  state.meta.schemaVersion=SCHEMA_VERSION;reconcile(state);return state;
}
function assertJson(value,depth=0){assert(depth<60,"JSON is nested too deeply.");if(value===null||typeof value==="string"||typeof value==="boolean")return;if(typeof value==="number"){assert(Number.isFinite(value),"JSON contains an invalid number.");return;}assert(typeof value==="object","Only JSON values are supported.");for(const [key,item]of Object.entries(value)){assert(safeKey(key),"JSON contains an unsafe property name.");assertJson(item,depth+1);}}

// Extend older v2 snapshots without replacing user records or custom permissions.
// Validation still runs afterwards; malformed existing fields are never repaired.
export function migrateSnapshot(value){
  assertJson(value);
  const next=clone(value);
  if(!next||typeof next!=="object"||Array.isArray(next)||next.meta?.schemaVersion!==SCHEMA_VERSION||!next.datasets||typeof next.datasets!=="object"||Array.isArray(next.datasets))return next;
  delete next.datasets["olentra-admin-email-template-selections-v1"];
  if(next.reference?.governance)delete next.reference.governance.emailTemplates;
  if(Array.isArray(next.reference?.operations?.permissionModules))next.reference.operations.permissionModules=next.reference.operations.permissionModules.filter(name=>name!=="Email Templates");
  for(const key of RETIRED_DEMO_KEYS)delete next.datasets[key];
  if(Array.isArray(next.datasets["auth-accounts"])&&next.datasets["auth-accounts"].some(hasDemoSecrets)){next.datasets["auth-accounts"]=[];next.datasets["auth-session"]={status:"anonymous",userId:null};}
  for(const [key,rows]of Object.entries(next.datasets)){
    if(key.startsWith("admin-role-permissions-")&&Array.isArray(rows))next.datasets[key]=rows.filter(row=>row?.id!=="Email Templates"&&row?.name!=="Email Templates");
  }
  return next;
}

export function validateSnapshot(value,initial){
  const isRecord=item=>item!==null&&typeof item==="object"&&!Array.isArray(item);
  const validateRequiredShape=(seed,candidate,path)=>{
    if(seed===null)return;
    if(Array.isArray(seed)){assert(Array.isArray(candidate),"Invalid field type: "+path);return;}
    if(typeof seed==="object"){
      assert(isRecord(candidate),"Invalid field type: "+path);
      for(const [field,example]of Object.entries(seed)){
        assert(own(candidate,field),"Missing required field: "+path+"."+field);
        validateRequiredShape(example,candidate[field],path+"."+field);
      }
      return;
    }
    assert(typeof candidate===typeof seed,"Invalid field type: "+path);
  };
  assertJson(value);assert(value&&typeof value==="object"&&!Array.isArray(value),"Choose an exported dashboard JSON snapshot.");assert(value.meta?.schemaVersion===SCHEMA_VERSION,"This JSON file uses an unsupported data version.");assert(value.datasets&&typeof value.datasets==="object"&&!Array.isArray(value.datasets),"The JSON file must contain a datasets object.");assert(Number.isFinite(Date.parse(value.meta.clock)),"The simulation clock is invalid.");
  for(const [key,seed]of Object.entries(initial.datasets)){
    assert(own(value.datasets,key),"Missing required dataset: "+key);
    const candidate=value.datasets[key];
    assert(seed===null||candidate!==null&&Array.isArray(seed)===Array.isArray(candidate)&&typeof seed===typeof candidate,"Invalid dataset type: "+key);
    if(isRecord(seed)&&key!=="auth-session")validateRequiredShape(seed,candidate,key);
  }
  for(const [key,items]of Object.entries(value.datasets)){assert(safeKey(key),"Invalid dataset key.");if(Array.isArray(items)){assert(items.length<=20000,"A dataset has too many records: "+key);const ids=items.filter(item=>item&&typeof item==="object"&&own(item,"id")).map(item=>String(item.id));assert(new Set(ids).size===ids.length,"Duplicate record IDs in "+key);}}
  const data=value.datasets;
  assert(["Production","Staging"].includes(data.environment),"Choose a valid environment.");assert(["Global","Americas","Europe","Asia Pacific"].includes(data.scope),"Choose a valid region scope.");
  for(const environment of ["Production","Staging"]){for(const key of ["features:","published-features:"]){const flags=data[key+environment];assert(flags&&Object.keys(initial.datasets[key+environment]).every(id=>typeof flags[id]==="boolean"),"Feature switches must be booleans.");}}
  const accounts=data["auth-accounts"],emails=new Set();
  for(const account of accounts){
    assert(isRecord(account)&&typeof account.id==="string"&&account.id.trim(),"A workspace account has an invalid ID.");
    assert(typeof account.email==="string"&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email),"A workspace account has an invalid email.");
    assert(!hasDemoSecrets(account),"Workspace data must not contain credentials.");
    const email=account.email.trim().toLowerCase();assert(!emails.has(email),"Duplicate workspace account email: "+email);emails.add(email);
    assert(typeof account.role==="string"&&account.role.trim()&&typeof account.enabled==="boolean","A workspace account has an invalid role or enabled state.");
  }
  // Only the signed-in staff identity is kept locally; ownership is managed on the server.
  assert(accounts.length<=1,"Workspace data may hold only the signed-in account.");
  const session=data["auth-session"];
  assert(isRecord(session)&&["authenticated","anonymous"].includes(session.status),"The workspace session is invalid.");
  assert(session.userId===null||typeof session.userId==="string","The workspace session user ID is invalid.");
  if(typeof session.userId==="string")assert(accounts.some(item=>item.id===session.userId),"The workspace session refers to a missing account.");
  if(session.status==="authenticated"){
    const account=accounts.find(item=>item.id===session.userId);
    assert(account?.enabled,"The authenticated workspace session requires an active account.");
    assert(session.role===account.role,"The workspace session role does not match its account.");
  }
  if(session.expiresAt!==undefined&&session.expiresAt!==null)assert(typeof session.expiresAt==="string"&&Number.isFinite(Date.parse(session.expiresAt)),"The workspace session expiry is invalid.");
  const programs=new Set(data["olentra-admin-opportunities"].map(row=>row.id));const applications=new Set(data["olentra-admin-applications-v1"].map(row=>row.id));const interns=new Map(data["olentra-admin-interns"].map(row=>[row.id,row]));const projects=new Map(data["olentra-admin-projects"].map(row=>[row.id,row]));
  for(const row of data["olentra-admin-applications-v1"])assert(programs.has(row.programId),"An application refers to an unknown program.");
  for(const row of interns.values()){assert(programs.has(row.programId),"An intern refers to an unknown program.");assert(applications.has(row.applicationId),"An intern refers to an unknown application.");for(const id of row.projectIds||[])assert(projects.has(id)&&projects.get(id).internIds.includes(row.id),"Project memberships are inconsistent.");}
  for(const row of projects.values()){for(const id of row.internIds||[])assert(interns.has(id)&&interns.get(id).projectIds.includes(row.id),"A project refers to an unknown intern.");for(const task of data["olentra-admin-project-tasks-"+row.id]||[])assert(interns.has(task.internId||task.intern)&&(row.internIds||[]).includes(task.internId||task.intern),"A task has an invalid assignee.");}
  for(const row of data["olentra-admin-certificates"]){const intern=interns.get(row.internId||row.id);assert(intern,"A certificate refers to an unknown intern.");if(row.status==="Issued")assert(intern.status==="Completed"&&selectInternProgress(value,intern.id).complete,"An issued certificate requires a completed internship and approved tasks.");}
  return true;
}
function snapshot(state,{all=false}={}){const datasets=Object.fromEntries(Object.entries(state.datasets).filter(([key])=>all||!PRIVATE_KEYS.has(key)&&!TELEMETRY.has(key)&&!key.startsWith("account-profile-")));return clone({meta:state.meta,datasets});}
function restore(state,value,scope="Content and configuration"){
  assert(value?.datasets&&typeof value.datasets==="object","The backup has no data.");assertJson(value);
  value=migrateSnapshot(value);
  for(const [key,val]of Object.entries(value.datasets)){if(PRIVATE_KEYS.has(key)||TELEMETRY.has(key)||key.startsWith("auth-")||key.startsWith("account-profile-"))continue;
    const isContent=key.startsWith("olentra-admin-content")||key.startsWith("olentra-admin-page-")||key.startsWith("olentra-admin-published-page-")||key.startsWith("olentra-admin-media")||key.startsWith("admin-translation-");
    if(scope==="Content only"&&!isContent||scope==="Configuration only"&&isContent)continue;
    state.datasets[key]=clone(val);
  }
}
function reconcile(state){
  const data=state.datasets;
  if(data["olentra-admin-interns"])data["olentra-admin-interns"]=data["olentra-admin-interns"].map(intern=>({...intern,progress:selectInternProgress(state,intern.id).progress}));
  if(data["olentra-admin-opportunities"])data["olentra-admin-opportunities"]=data["olentra-admin-opportunities"].map(program=>({...program,applications:(data["olentra-admin-applications-v1"]||[]).filter(row=>row.programId===program.id).length,interns:(data["olentra-admin-interns"]||[]).filter(row=>row.programId===program.id&&["Active","Onboarding"].includes(row.status)).length}));
  const session=data["auth-session"],account=data["auth-accounts"]?.find(row=>row.id===session?.userId);
  if(session?.status==="authenticated"&&account){data["auth-session"]={...session,role:account.role};const profile=data["olentra-admin-account-v1"];if(profile)data["olentra-admin-account-v1"]={...profile,name:account.name,email:account.email,role:account.role};}
}
const commandPermission=(type,payload)=>{
  if(type.startsWith("auth.")||type==="clock.tick")return null;
  if(type==="clock.set")return["Settings & Backups","manage"];
  if(type.startsWith("notification."))return null;
  if(type==="settings.save"&&payload.section==="account")return null;
  if(type.startsWith("content.")||type.startsWith("media."))return["Content & Media",type==="content.publish"?"publish":"edit"];
  if(type.startsWith("application."))return["Applications","edit"];
  if(/^(task|intern|certificate|program)\./.test(type))return["Careers & Internships",type==="program.publish"?"publish":"edit"];
  if(type.startsWith("enquiry."))return["Forms & Enquiries","edit"];
  if(type.startsWith("features.")||type.startsWith("navigation."))return["Website Controls",type.includes("publish")?"publish":"edit"];
  if(type.startsWith("approval."))return["Approvals & Audit Log",type==="approval.request"?"view":"publish"];
  if(type.startsWith("audit."))return["Approvals & Audit Log","manage"];
  if(/^(incident|alert)\./.test(type))return["Monitoring & Alerts","edit"];
  if(type.startsWith("seo."))return["Analytics & SEO",type==="seo.publish"?"publish":"edit"];
  if(/^(locale|regional|translation)\./.test(type))return["Regions & Languages",type==="translation.publish"?"publish":"edit"];
  if(/^(team|role|session)\./.test(type))return["Team & Access","manage"];
  if(type.startsWith("integration."))return["Integrations","manage"];
  return["Settings & Backups","manage"];
};
function coreCommand(type,payload,ctx){
  const environment=payload.environment||ctx.get("environment","Production");
  if(type==="features.set"){
    const current=ctx.get("features:"+environment,{});ctx.assert(["Production","Staging"].includes(environment)&&own(current,payload.feature)&&typeof payload.enabled==="boolean","Choose a valid feature switch.");const values={...current,[payload.feature]:payload.enabled},before=ctx.get("published-features:"+environment,{});
    ctx.set("features:"+environment,values);ctx.set("published-features:"+environment,values);ctx.update("feature-history",items=>[{id:ctx.id("feature"),feature:payload.feature,action:(payload.enabled?"Enabled ":"Disabled ")+payload.feature,actor:ctx.actor,at:ctx.now,date:ctx.now,scope:"Global",environment,values:clone(values)},...items]);ctx.audit((payload.enabled?"Enabled ":"Disabled ")+payload.feature,"Feature switches",{resource:payload.feature,environment,before,after:values});return{value:values};
  }
  if(type==="features.draft"||type==="features.publish"){
    ctx.assert(["Production","Staging"].includes(environment),"Choose a valid environment.");const key="features:"+environment,current=ctx.get(key,{}),published="published-features:"+environment,before=ctx.get(published,{}),values={...(type==="features.publish"?before:current),...payload.values};for(const [id,value]of Object.entries(values))ctx.assert(own(current,id)&&typeof value==="boolean","Invalid feature value: "+id);
    if(type==="features.draft")ctx.set(key,values);
    if(type==="features.publish"){if(Object.keys(current).every(id=>current[id]===before[id])||Object.keys(current).every(id=>current[id]===values[id]))ctx.set(key,values);ctx.set(published,clone(values));ctx.update("feature-history",items=>[{id:ctx.id("feature"),action:"Website settings published",actor:ctx.actor,at:ctx.now,date:ctx.now,scope:ctx.get("scope","Global"),environment,values:clone(values)},...items]);ctx.audit("Published website features","Feature switches",{resource:environment,before,after:values,restore:{key:published,before,after:clone(values)}});ctx.notify({title:"Website features published",body:environment+" settings were updated.",href:"/dashboard/website-controls",category:"System",severity:"success"});}return{value:values};
  }
  if(type==="features.availability"){
    const flags=ctx.get("features:"+environment,{});ctx.assert(own(flags,payload.featureId),"Feature not found.");const rule=payload.rule;ctx.assert(rule&&["Global","Selected regions"].includes(rule.mode)&&Array.isArray(rule.regions)&&rule.regions.every(region=>["Americas","Europe","Asia Pacific"].includes(region)),"Choose valid feature regions.");ctx.assert(rule.mode!=="Selected regions"||rule.regions.length>0,"Choose at least one region.");ctx.assert(["Hidden","Visible"].includes(rule.fallback),"Choose a fallback visibility.");const key="feature-rule-"+environment+"-"+payload.featureId,before=ctx.get(key,null);ctx.set(key,clone(rule));ctx.audit("Updated feature availability","Feature switches",{resource:payload.featureId,environment,before,after:rule,restore:{key,before,after:rule}});return{value:rule};
  }
  if(type==="features.schedule.save"){
    const row=clone(payload.schedule||{});ctx.assert(own(ctx.get("features:"+environment,{}),row.featureId),"Choose a valid feature.");ctx.assert(/^\d{4}-\d{2}-\d{2}$/.test(row.date)&&Number.isFinite(Date.parse(row.date)),"Choose a valid date.");ctx.assert(/^([01]\d|2[0-3]):[0-5]\d$/.test(row.start)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(row.end)&&row.end>row.start,"End time must be after the start time.");try{new Intl.DateTimeFormat("en",{timeZone:row.timezone});}catch{ctx.assert(false,"Choose a valid time zone.");}ctx.assert(["Make visible","Hide feature"].includes(row.action),"Choose a valid schedule action.");row.id ||=ctx.id("SCH");row.environment=environment;row.enabled=true;const existing=ctx.get("feature-schedules",[]);ctx.assert(!existing.some(item=>item.id!==row.id&&item.environment===environment&&item.featureId===row.featureId&&item.date===row.date&&item.timezone===row.timezone&&item.start<row.end&&row.start<item.end),"This schedule overlaps another change for the same feature.");ctx.set("feature-schedules",existing.some(item=>item.id===row.id)?existing.map(item=>item.id===row.id?row:item):[...existing,row]);ctx.audit("Scheduled feature availability","Feature switches",{resource:row.featureId,environment,after:row});return{value:row};
  }
  if(type==="features.schedule.delete"){const items=ctx.get("feature-schedules",[]);ctx.assert(items.some(item=>item.id===payload.id),"Schedule not found.");ctx.set("feature-schedules",items.filter(item=>item.id!==payload.id));ctx.audit("Removed feature schedule","Feature switches",{resource:payload.id});return{value:payload.id};}
  if(type==="navigation.publish"){
    const values=payload.values||ctx.get("navigation",{});for(const items of Object.values(values)){ctx.assert(Array.isArray(items),"Navigation sections must contain link lists.");for(const item of items)ctx.assert(typeof item.label==="string"&&item.label.trim()&&typeof item.href==="string"&&/^(\/(?!\/)|#|https?:\/\/)/.test(item.href)&&typeof item.visible==="boolean","Every link needs a label, safe destination and visibility.");}
    const before=ctx.get("navigation-published",{});ctx.set("navigation",clone(values));ctx.set("navigation-published",clone(values));ctx.audit("Published navigation","Content",{resource:"Navigation and page sections",before,after:values,restore:{key:"navigation-published",before,after:values}});return{value:values};
  }
  if(type==="clock.set"||type==="clock.tick"){const now=type==="clock.set"?payload.now:ctx.now;ctx.assert(Number.isFinite(Date.parse(now)),"Enter a valid simulation date and time.");ctx.setClock(new Date(now).toISOString());if(type==="clock.set")ctx.audit("Changed simulation clock","System",{resource:"Fixture clock",after:now});return{value:now};}
  return false;
}
// Accounts and passwords live on the realtime server. After a real sign-in or
// session refresh, the workspace provider records the verified identity here so
// the local permission matrix and audit history know who is acting.
export const WORKSPACE_ROLES=["Owner","Administrator","Editor","Recruiter","Analyst"];
function authCommand(type,payload,ctx){
  const session=ctx.get("auth-session",{});
  if(type==="auth.session.establish"){
    const id=String(payload.id||"").trim(),email=String(payload.email||"").trim().toLowerCase(),name=String(payload.name||"").trim()||email,role=payload.role;
    ctx.assert(id&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)&&WORKSPACE_ROLES.includes(role),"A verified staff account is required.");
    const account={id,email,name,role,enabled:true};
    const changed=session?.status!=="authenticated"||session.userId!==id||session.role!==role;
    ctx.set("auth-accounts",[account]);
    const previousProfile=ctx.get("olentra-admin-account-v1",{});
    if(session?.userId&&session.userId!==id)ctx.set("account-profile-"+session.userId,previousProfile);
    const profile=session?.userId===id?previousProfile:ctx.get("account-profile-"+id,{...previousProfile,jobTitle:""});
    ctx.set("olentra-admin-account-v1",{...profile,name,email,role});
    ctx.set("auth-session",{status:"authenticated",userId:id,role,authenticatedAt:changed?ctx.now:session.authenticatedAt||ctx.now,expiresAt:null});
    if(changed)ctx.audit("Signed in to company workspace","Access",{resource:email});
    return{value:{userId:id,role}};
  }
  if(type==="auth.signOut"){if(session?.userId)ctx.set("account-profile-"+session.userId,ctx.get("olentra-admin-account-v1",{}));ctx.set("auth-session",{status:"anonymous",userId:null});ctx.set("auth-accounts",[]);if(session?.userId)ctx.audit("Signed out of company workspace","Access",{resource:session.userId});return{value:true};}
  return false;
}
export function executeCommand(state,type,payload={},options={}){
  const next=clone(state);let serial=0;const now=options.now||state.meta.clock,nonce=options.id||String(state.meta.revision+1);next.meta.clock=now;
  const actor=next.datasets["auth-accounts"]?.find(row=>row.id===next.datasets["auth-session"]?.userId)?.name||"System";
  const get=(key,fallback)=>resolveDataset(next,key,fallback);
  const ctx={now,actor,reference:next.reference,get,set:(key,value)=>{assert(safeKey(key),"Invalid dataset key.");next.datasets[key]=clone(value);},update:(key,fn)=>{next.datasets[key]=clone(fn(get(key,[])));},assert,id:prefix=>prefix+"-"+nonce+"-"+(++serial),setClock:value=>{next.meta.clock=value;},snapshot:options=>snapshot(next,options),initialSnapshot:snapshot(options.initial||state),restore:(value,scope)=>restore(next,value,scope)};
  ctx.audit=(action,category,details={})=>{const safe=clone(details);const entry={id:ctx.id("AUD"),action,category,module:category,actor,at:now,createdAt:now,time:new Date(now).toISOString().slice(11,16),date:new Intl.DateTimeFormat("en-GB",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"UTC"}).format(new Date(now))+" UTC",scope:get("scope","Global"),...safe,resource:safe.resource||safe.description||safe.id||category,details:safe};ctx.update(AUDIT_KEY,items=>[entry,...items].slice(0,1000));};
  ctx.notify=notice=>{const preferences=get("olentra-admin-notification-preferences-v1",{});if(preferences.inApp===false)return;const category=notice.category==="Approvals"?"Approvals":/monitor|alert/i.test(notice.category||"")?"Alerts":"System";if(category==="Approvals"&&preferences.approvals===false||category==="Alerts"&&preferences.critical===false||category==="System"&&preferences.system===false)return;const critical=/critical|danger/i.test(notice.severity||"");if(preferences.quiet&&!critical){try{const time=new Intl.DateTimeFormat("en-GB",{timeZone:preferences.timezone||"UTC",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date(now));const quiet=preferences.from>preferences.to?time>=preferences.from||time<preferences.to:time>=preferences.from&&time<preferences.to;if(quiet)return;}catch{}}ctx.update(NOTICE_KEY,items=>[{id:ctx.id("notice"),title:notice.title,description:notice.body||notice.description||"",body:notice.body||notice.description||"",category,source:notice.category||"System",time:"Just now",at:now,tone:notice.severity==="warning"||notice.severity==="danger"?"warning":"blue",type:notice.severity==="warning"?"Warning":"Information",href:notice.href||"/dashboard",action:"View details",read:false},...items].slice(0,300));};
  const dispatch=(command,p)=>{for(const handler of [coreCommand,authCommand,handleContentCommand,handleOperationsCommand,handleGovernanceCommand]){const result=handler(command,p,ctx);if(result!==false)return result;}throw new Error("Unknown action: "+command);};ctx.command=dispatch;
  try{
    assert(Number.isFinite(Date.parse(now)),"The simulation clock is invalid.");
    const activeSession=next.datasets["auth-session"];
    if(!type.startsWith("auth.")&&!type.startsWith("clock.")&&activeSession?.status==="authenticated"&&activeSession.expiresAt&&Date.parse(activeSession.expiresAt)<=Date.parse(now)){
      next.datasets["auth-session"]={status:"anonymous",userId:null};ctx.notify({title:"Session expired",body:"Sign in to continue.",category:"System",href:"/dashboard/login"});next.meta.revision=state.meta.revision+1;next.meta.lastAction="auth.expired";return{ok:false,error:"Your session expired. Sign in to continue.",state:next};
    }
    const permission=commandPermission(type,payload);if(permission)assert(can(next,...permission),"Your role cannot perform this action.");
    else if(!type.startsWith("auth.")&&!type.startsWith("clock."))assert(next.datasets["auth-session"]?.status==="authenticated","Sign in before changing workspace data.");
    const result=dispatch(type,payload)||{};
    const session=next.datasets["auth-session"];if(session?.status==="authenticated"&&session.expiresAt&&Date.parse(session.expiresAt)<=Date.parse(next.meta.clock)){next.datasets["auth-session"]={status:"anonymous",userId:null};ctx.notify({title:"Session expired",body:"Sign in to continue.",category:"System",href:"/dashboard/login"});}
    reconcile(next);if(type==="backup.restore")validateSnapshot(next,options.initial||state);next.meta.revision=state.meta.revision+1;next.meta.lastAction=type;
    return {ok:result.ok!==false,error:result.error,value:result.value,state:next};
  }catch(error){return{ok:false,error:error.message||"The action could not be completed.",state};}
}
export function updateDataset(state,key,value,fallback,options={}){
  assert(safeKey(key),"Invalid dataset key.");assert(state.datasets["auth-session"]?.status==="authenticated","Sign in before changing workspace data.");
  if(!["scope","environment"].includes(key)){
    let auditModule="Settings & Backups",action="manage";
    if(/^features:|^feature-|^navigation/.test(key)){auditModule="Website Controls";action="edit";}
    else if(/olentra-admin-(content|page-|media)/.test(key)){auditModule="Content & Media";action="edit";}
    else if(/olentra-admin-(applications|applicant-)/.test(key)){auditModule="Applications";action="edit";}
    else if(/olentra-admin-(intern|project|program|opportunit|certificate)/.test(key)){auditModule="Careers & Internships";action="edit";}
    else if(/olentra-admin-(enquir|contact-form|spam-filter)/.test(key)){auditModule="Forms & Enquiries";action="edit";}
    else if(/^admin-(seo|sitemap)/.test(key)){auditModule="Analytics & SEO";action="edit";}
    else if(/^admin-(incident|alert)/.test(key)){auditModule="Monitoring & Alerts";action="edit";}
    else if(/^admin-(locale|regional|translation)/.test(key)){auditModule="Regions & Languages";action="edit";}
    else if(/^admin-(team|role)/.test(key)){auditModule="Team & Access";}
    else if(/integration/.test(key)){auditModule="Integrations";}
    else if(["olentra-admin-account-v1","olentra-admin-notification-preferences-v1"].includes(key)){auditModule=null;}
    assert(!auditModule||can(state,auditModule,action),"Your role cannot change this dataset.");
  }
  const before=resolveDataset(state,key,fallback),nextValue=typeof value==="function"?value(before):value;assertJson(nextValue);const next={...state,meta:{...state.meta,revision:state.meta.revision+1,lastAction:"dataset.set"},datasets:{...state.datasets,[key]:clone(nextValue)}};
  if(["olentra-admin-content-v1","olentra-admin-applications-v1","olentra-admin-enquiries-v1","olentra-admin-interns","olentra-admin-opportunities","olentra-admin-projects","olentra-admin-certificates","olentra-admin-media-v1"].includes(key)){
    reconcile(next);validateSnapshot(next,state);const oldIds=new Set((before||[]).map(row=>row.id)),created=nextValue.filter(row=>!oldIds.has(row.id));if(created.length){const actor=state.datasets["auth-accounts"]?.find(row=>row.id===state.datasets["auth-session"]?.userId)?.name||"Company owner";next.datasets[AUDIT_KEY]=[{id:"AUD-data-"+(options.id||next.meta.revision),at:options.now||state.meta.clock,date:options.now||state.meta.clock,actor,action:"Created "+created.length+" record"+(created.length===1?"":"s"),category:key.includes("content")||key.includes("media")?"Content":"System",resource:created.map(row=>row.title||row.name||row.id).join(", ")},...(next.datasets[AUDIT_KEY]||[])];}
  }
  return next;
}
export { snapshot as createSnapshot, effectiveFeatures };
