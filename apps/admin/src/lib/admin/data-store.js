"use client";

import { initialDatabase } from "./data-source";
import { can } from "./selectors.mjs";
import { executeCommand, migrateSnapshot, resolveDataset, updateDataset, validateSnapshot } from "./model.mjs";
import { switchLabel } from "@olentra/site-features/rules";

const STORAGE_KEY="olentra.admin.database.v2";
const clone=value=>JSON.parse(JSON.stringify(value));
let database=initialDatabase,hydrated=false,anchor=Date.now(),sequence=0,liveSiteState=null;
let status={ready:false,error:null,persisted:true};
const serverStatus=status,listeners=new Set();
const emit=()=>listeners.forEach(listener=>listener());
export const subscribe=listener=>{listeners.add(listener);return()=>listeners.delete(listener);};
export const getDatabase=()=>database;
export const getServerDatabase=()=>initialDatabase;
export const getStatus=()=>status;
export const getServerStatus=()=>serverStatus;
export const getDataset=(key,fallback)=>resolveDataset(database,key,fallback);
export const getServerDataset=(key,fallback)=>resolveDataset(initialDatabase,key,fallback);
const actionNow=()=>new Date(Date.parse(database.meta.clock)+Math.max(0,Date.now()-anchor)).toISOString();
// Staff sessions belong to this tab. Shared browser content, imported snapshots,
// and resets must never replace the identity verified by this tab's provider.
function withTabIdentity(next,current=database,keepProfile=true){
  const datasets={...next.datasets};
  for(const key of ["auth-session","auth-accounts",...(keepProfile?["olentra-admin-account-v1"]:[])])datasets[key]=current.datasets[key];
  return{...next,datasets};
}
function storedDatasets(next){return{...next.datasets,"auth-session":{status:"anonymous",userId:null},"auth-accounts":[]};}

function shareUnchanged(previous,next){
  for(const [key,value]of Object.entries(next.datasets)){const before=previous.datasets[key];if(before===value||before!==undefined&&JSON.stringify(before)===JSON.stringify(value))next.datasets[key]=before;}
  next.reference=initialDatabase.reference;next.templates=initialDatabase.templates;return next;
}
function persist(next){
  if(typeof window==="undefined")return;
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify({meta:{...next.meta,wallSavedAt:Date.now()},datasets:storedDatasets(next)}));status={ready:true,error:null,persisted:true};}
  catch{status={ready:true,persisted:false,error:"Browser storage is unavailable or full. Changes remain in memory; export the JSON snapshot to keep them."};}
}
function overlayLiveFeatures(next){
  if(!liveSiteState)return next;
  next={...next,meta:{...next.meta,liveFeatureRevision:liveSiteState.revision},datasets:{...next.datasets}};
  for(const environment of ["Production","Staging"]){next.datasets["features:"+environment]={...liveSiteState.environments[environment]};next.datasets["published-features:"+environment]={...liveSiteState.environments[environment]};}
  const approvals=next.datasets["olentra-admin-governance-approvals-v1"];
  if(approvals?.some(row=>(row.kind==="features"||row.type==="Feature change")&&row.status==="pending"))next.datasets["olentra-admin-governance-approvals-v1"]=approvals.map(row=>(row.kind==="features"||row.type==="Feature change")&&row.status==="pending"?{...row,status:"superseded",decisionNote:"Website switches now apply immediately; this review is no longer needed."}:row);
  return next;
}
function commit(next){database=shareUnchanged(database,overlayLiveFeatures(next));anchor=Date.now();persist(database);emit();}
export function syncSiteFeatureState(state){
  if(!state?.environments?.Production||!state?.environments?.Staging)return;hydrateDatabase();liveSiteState=state;
  const changed=database.meta.liveFeatureRevision!==state.revision||["Production","Staging"].some(env=>JSON.stringify(database.datasets["features:"+env])!==JSON.stringify(state.environments[env]));
  if(changed){
    let next=database;const change=state.lastChange,id="SITE-"+state.revision;
    if(change&&!database.datasets["olentra-admin-governance-audit-v1"].some(row=>row.id===id)){
      const label=initialDatabase.reference.core.features.find(row=>row.id===change.feature)?.label||switchLabel(change.feature);
      const action=(change.enabled?"Enabled ":"Disabled ")+label;
      const event={id,action,category:"Feature switches",module:"Website Controls",resource:change.feature,environment:change.environment,scope:"Global",actor:change.actor,at:change.at,date:new Date(change.at).toLocaleString("en-GB",{timeZone:"UTC"})+" UTC",after:state.environments[change.environment]};
      next={...database,datasets:{...database.datasets,"olentra-admin-governance-audit-v1":[event,...database.datasets["olentra-admin-governance-audit-v1"]].slice(0,1000),"feature-history":[{...event,feature:change.feature,values:state.environments[change.environment]},...database.datasets["feature-history"]]}};
    }
    commit(next);
  }
}
export function hydrateDatabase(){
  if(hydrated||typeof window==="undefined")return;hydrated=true;
  try{const text=localStorage.getItem(STORAGE_KEY);if(text){const parsed=migrateSnapshot(JSON.parse(text));validateSnapshot(parsed,initialDatabase);database=withTabIdentity({...initialDatabase,meta:parsed.meta,datasets:parsed.datasets},initialDatabase,false);if(Number.isFinite(parsed.meta.wallSavedAt)){const elapsed=Math.max(0,Date.now()-parsed.meta.wallSavedAt);database.meta={...database.meta,clock:new Date(Date.parse(parsed.meta.clock)+elapsed).toISOString()};}}status={ready:true,error:null,persisted:true};}
  catch{database=initialDatabase;status={ready:true,persisted:false,error:"Saved dashboard data could not be loaded. The JSON fixtures are available; export or reset your local scenario in Company settings."};}
  database=overlayLiveFeatures(database);anchor=Date.now();emit();
}
export function setDataset(key,value,fallback){
  hydrateDatabase();
  try{commit(updateDataset(database,key,value,fallback,{now:actionNow(),id:"edit-"+Date.now()+"-"+(++sequence)}));return{ok:true};}
  catch(error){status={...status,error:error.message};emit();return{ok:false,error:error.message};}
}
export function command(type,payload={}){
  hydrateDatabase();const previous=database,result=executeCommand(database,type,payload,{initial:initialDatabase,now:actionNow(),id:Date.now().toString(36)+"-"+(++sequence)});
  if(result.state!==previous)commit(result.state);
  return{ok:result.ok,error:result.error,value:result.value,persisted:status.persisted};
}
export function exportData(){
  hydrateDatabase();if(!can({...database,meta:{...database.meta,clock:actionNow()}},"Settings & Backups","manage"))return{error:"Sign in with a role that can export the workspace database."};
  return clone({format:"olentra-admin-database",meta:{...database.meta,schemaVersion:2},datasets:storedDatasets(database)});
}
export function importData(value){
  hydrateDatabase();try{if(!can({...database,meta:{...database.meta,clock:actionNow()}},"Settings & Backups","manage"))throw new Error("Sign in with a role that can import workspace data.");const migrated=migrateSnapshot(value);validateSnapshot(migrated,initialDatabase);const next=withTabIdentity({...initialDatabase,meta:{...migrated.meta,revision:database.meta.revision+1,lastAction:"data.import"},datasets:clone(migrated.datasets)});commit(next);return{ok:true,persisted:status.persisted};}catch(error){return{ok:false,error:error.message};}
}
export function resetData(){
  hydrateDatabase();if(!can({...database,meta:{...database.meta,clock:actionNow()}},"Settings & Backups","manage"))return{ok:false,error:"Sign in with a role that can reset the workspace data."};const next=withTabIdentity(clone(initialDatabase));next.meta.revision=database.meta.revision+1;next.meta.lastAction="data.reset";commit(next);return{ok:true};
}
export function startDataClock(){
  if(typeof window==="undefined")return()=>{};hydrateDatabase();
  const timer=setInterval(()=>command("clock.tick",{}),30000);
  const sync=event=>{if(event.key!==STORAGE_KEY||!event.newValue)return;try{const next=migrateSnapshot(JSON.parse(event.newValue));validateSnapshot(next,initialDatabase);database=shareUnchanged(database,withTabIdentity({...initialDatabase,meta:next.meta,datasets:next.datasets}));anchor=Date.now();status={ready:true,error:null,persisted:true};emit();}catch{status={...status,error:"A different tab supplied invalid dashboard data; it was ignored."};emit();}};
  window.addEventListener("storage",sync);return()=>{clearInterval(timer);window.removeEventListener("storage",sync);};
}
