"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import coreData from "@/data/admin/core.json";
import { useDataset, useDatabase } from "./data-hooks";
import { command,exportData,importData,resetData,startDataClock,syncSiteFeatureState } from "@/lib/admin/data-store";
import { can as checkPermission,effectiveFeatures,selectOverview } from "@/lib/admin/selectors.mjs";
import { useSiteFeatures } from "@/components/site-features";
import { bootstrapFeatureSession, establishFeatureSession, updateSiteFeature } from "@/lib/site-features-client";
import { effectiveSiteFeatures } from "@/lib/site-feature-rules.mjs";
import { Button, Field, Input, Modal } from "./ui";

export const initialFeatures=coreData.datasets["features:Production"];
const AdminContext=createContext(null);
export function AdminProvider({children}){
  const {db,ready,error,persisted}=useDatabase();
  const {state:siteState}=useSiteFeatures();
  // The workspace manages the live site; ignore a legacy saved Staging selection.
  const environment="Production";
  const scope="Global";
  const features=siteState.environments[environment]||initialFeatures;
  const publishedFeatures=features;
  const [history]=useDataset("feature-history",[]);
  const [toast,setToast]=useState(null);
  const [featureSaving,setFeatureSaving]=useState(false),[featureError,setFeatureError]=useState("");
  const [featureLogin,setFeatureLogin]=useState(false),[loginError,setLoginError]=useState(""),[loginBusy,setLoginBusy]=useState(false),[mfaRequired,setMfaRequired]=useState(false);
  const [credentials,setCredentials]=useState({email:"",password:"",code:""});
  const pendingFeature=useRef(null),busy=useRef(false);
  useEffect(()=>startDataClock(),[]);
  useEffect(()=>{syncSiteFeatureState(siteState);},[siteState]);
  const notify=useCallback(message=>{const id=Date.now();setToast({message,id});setTimeout(()=>setToast(current=>current?.id===id?null:current),4500);},[]);
  const run=(type,payload)=>{if(type==="auth.signOut")fetch("/api/site-features/session",{method:"DELETE"}).catch(()=>{});const result=command(type,payload);if(!result.ok)notify(result.error);return result;};
  useEffect(()=>{if(ready&&checkPermission(db,"Website Controls","edit"))bootstrapFeatureSession().catch(()=>{});},[ready,db.datasets["auth-session"]?.userId]);
  async function updateFeature(key,value,targetEnvironment=environment){
    if(busy.current)return{ok:false,error:"Wait for the current setting to finish saving."};
    if(!checkPermission(db,"Website Controls","edit")){const failure={ok:false,error:"Your role cannot change website features."};setFeatureError(failure.error);return failure;}
    busy.current=true;setFeatureSaving(true);setFeatureError("");
    try{
      const access=await bootstrapFeatureSession();
      if(!access.ok){pendingFeature.current={key,value,environment:targetEnvironment};setMfaRequired(Boolean(access.mfaRequired));setFeatureLogin(true);return{ok:false,error:"Sign in to website controls to save this change."};}
      const result=await updateSiteFeature(targetEnvironment,key,value);
      if(!result.ok){setFeatureError(result.error);if(result.status===401){pendingFeature.current={key,value,environment:targetEnvironment};setFeatureLogin(true);}return result;}
      syncSiteFeatureState(result.value);
      const label=db.reference.core.features.find(row=>row.id===key)?.label||key;
      notify(label+" "+(value?"enabled":"disabled")+(targetEnvironment==="Production"?" on the website.":" in Staging."));return result;
    }catch(failure){const message=failure.message||"Could not save website settings. Check your connection and try again.";setFeatureError(message);return{ok:false,error:message};}
    finally{busy.current=false;setFeatureSaving(false);}
  }
  async function signInToControls(event){event.preventDefault();setLoginBusy(true);setLoginError("");try{const result=await establishFeatureSession(credentials);if(!result.ok){setLoginError(result.error);return;}setFeatureLogin(false);setCredentials({email:"",password:"",code:""});const pending=pendingFeature.current;pendingFeature.current=null;if(pending)await updateFeature(pending.key,pending.value,pending.environment);}catch(failure){setLoginError(failure.message);}finally{setLoginBusy(false);}}
  const session=db.datasets["auth-session"];
  const account=db.datasets["auth-accounts"]?.find(item=>item.id===session?.userId);
  const overview=selectOverview(db);
  return <AdminContext.Provider value={{db,ready,error,persisted,command:run,exportData,importData,resetData,features,publishedFeatures,updateFeature,featureSaving,featureError,scope,environment,history,notify,session,account,can:(module,action)=>checkPermission(db,module,action),liveFeatures:effectiveSiteFeatures(features),previewFeatures:effectiveSiteFeatures(features),unreadNotifications:overview.unreadNotifications}}>{children}<Modal open={featureLogin} onClose={()=>{setFeatureLogin(false);pendingFeature.current=null;}} title="Sign in to website controls"><form className="workspace-stack" onSubmit={signInToControls}><p>Use your website administrator account to manage live visibility.</p><Field label="Administrator email"><Input required type="email" autoComplete="username" value={credentials.email} onChange={event=>setCredentials({...credentials,email:event.target.value})}/></Field><Field label="Administrator password"><Input required type="password" autoComplete="current-password" value={credentials.password} onChange={event=>setCredentials({...credentials,password:event.target.value})}/></Field>{mfaRequired&&<Field label="Verification code"><Input required inputMode="numeric" autoComplete="one-time-code" value={credentials.code} onChange={event=>setCredentials({...credentials,code:event.target.value})}/></Field>}{loginError&&<p role="alert" className="workspace-auth-error">{loginError}</p>}<Button variant="primary" type="submit" disabled={loginBusy}>{loginBusy?"Signing in…":"Sign in"}</Button></form></Modal>{toast&&<div className="workspace-toast" role="status"><CheckCircle2 size={18}/><span>{toast.message}</span><button type="button" aria-label="Dismiss notification" onClick={()=>setToast(null)}><X size={16}/></button></div>}</AdminContext.Provider>;
}
export function useAdmin(){const context=useContext(AdminContext);if(!context)throw new Error("Dashboard pages must be inside AdminProvider");return context;}
