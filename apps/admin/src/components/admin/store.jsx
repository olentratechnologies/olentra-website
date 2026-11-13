"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import coreData from "@/data/admin/core.json";
import { useDataset, useDatabase } from "./data-hooks";
import { command,exportData,importData,resetData,startDataClock,syncSiteFeatureState } from "@/lib/admin/data-store";
import { can as checkPermission,selectOverview } from "@/lib/admin/selectors.mjs";
import { useSiteFeatures } from "@olentra/site-features/react";
import { updateSiteFeature } from "@olentra/site-features/client";
import { effectiveSiteFeatures } from "@olentra/site-features/rules";
import { restoreWorkspaceSession, signInToWorkspace, signOutOfWorkspace, withWorkspaceToken } from "@/lib/workspace-auth.mjs";
import { canControlWebsite, workspaceRole } from "@/lib/workspace-access.mjs";
import { switchLabel } from "@olentra/site-features/rules";

export const initialFeatures=coreData.datasets["features:Production"];
const REFRESH_INTERVAL=12*60*1000;
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
  // Server-verified sign-in state. Browser-stored workspace data is never trusted
  // as proof of identity: the session is restored from the server on every load.
  const [auth,setAuth]=useState({status:"loading",account:null,error:""});
  const busy=useRef(false),authRef=useRef(auth),authRevision=useRef(0);
  authRef.current=auth;
  useEffect(()=>startDataClock(),[]);
  useEffect(()=>{syncSiteFeatureState(siteState);},[siteState]);
  const notify=useCallback(message=>{const id=Date.now();setToast({message,id});setTimeout(()=>setToast(current=>current?.id===id?null:current),4500);},[]);
  const run=(type,payload)=>{const result=command(type,payload);if(!result.ok)notify(result.error);return result;};

  /** Applies a verified staff account (or null when signed out) to the workspace. */
  const establish=useCallback(serverAccount=>{
    if(!serverAccount){command("auth.signOut");setAuth({status:"anonymous",account:null,error:""});return null;}
    const role=workspaceRole(serverAccount);
    if(!role){command("auth.signOut");setAuth({status:"no-access",account:serverAccount,error:""});return null;}
    const result=command("auth.session.establish",{id:serverAccount.id,name:serverAccount.name,email:serverAccount.email,role});
    if(!result.ok){setAuth({status:"unavailable",account:null,error:result.error});return null;}
    setAuth({status:"authenticated",account:serverAccount,error:""});
    return role;
  },[]);

  // Restore the session once the local data has loaded, retrying while the
  // sign-in service is unreachable, then renew it before the access token expires.
  useEffect(()=>{
    if(!ready)return;
    let live=true,retry,delay=2000;
    const restore=async()=>{
      const revision=authRevision.current;
      try{const account=await restoreWorkspaceSession();if(live&&revision===authRevision.current)establish(account);delay=2000;}
      catch(failure){if(!live||revision!==authRevision.current)return;setAuth(current=>current.status==="authenticated"?current:{status:"unavailable",account:null,error:failure.message});clearTimeout(retry);retry=setTimeout(restore,delay);delay=Math.min(delay*2,30000);}
    };
    void restore();
    const timer=setInterval(()=>{if(authRef.current.status==="authenticated")void restore();},REFRESH_INTERVAL);
    return()=>{live=false;clearTimeout(retry);clearInterval(timer);};
  },[ready,establish]);

  const signIn=useCallback(async(email,password)=>{
    ++authRevision.current;
    const account=await signInToWorkspace(email,password);
    const role=establish(account);
    if(!role)await signOutOfWorkspace().catch(()=>{});
    return role;
  },[establish]);
  const signOut=useCallback(async()=>{++authRevision.current;establish(null);try{await signOutOfWorkspace();}catch{}},[establish]);

  async function updateFeature(key,value,targetEnvironment=environment){
    if(busy.current)return{ok:false,error:"Wait for the current setting to finish saving."};
    if(!checkPermission(db,"Website Controls","edit")||!canControlWebsite(auth.account)){const failure={ok:false,error:"Only workspace owners and administrators can change live website switches."};setFeatureError(failure.error);return failure;}
    busy.current=true;setFeatureSaving(true);setFeatureError("");
    try{
      const result=await withWorkspaceToken(token=>updateSiteFeature(targetEnvironment,key,value,token));
      if(!result.ok){
        if(result.status===401){establish(null);}
        setFeatureError(result.error);return result;
      }
      syncSiteFeatureState(result.value);
      const label=db.reference.core.features.find(row=>row.id===key)?.label||switchLabel(key);
      notify(label+" "+(value?"enabled":"disabled")+(targetEnvironment==="Production"?" on the website.":" in Staging."));return result;
    }catch(failure){const message=failure.message||"Could not save website settings. Check your connection and try again.";setFeatureError(message);return{ok:false,error:message};}
    finally{busy.current=false;setFeatureSaving(false);}
  }

  const session=auth.status==="authenticated"?db.datasets["auth-session"]:{status:auth.status==="no-access"?"forbidden":"anonymous",userId:null};
  const account=auth.status==="authenticated"?db.datasets["auth-accounts"]?.find(item=>item.id===session?.userId):null;
  const overview=selectOverview(db);
  const can=(module,action)=>auth.status==="authenticated"&&checkPermission(db,module,action);
  return <AdminContext.Provider value={{db,ready,error,persisted,auth,signIn,signOut,command:run,exportData,importData,resetData,features,publishedFeatures,updateFeature,featureSaving,featureError,scope,environment,history,notify,session,account,staffAccount:auth.account,can,liveFeatures:effectiveSiteFeatures(features),previewFeatures:effectiveSiteFeatures(features),unreadNotifications:overview.unreadNotifications}}>{children}{toast&&<div className="workspace-toast" role="status"><CheckCircle2 size={18}/><span>{toast.message}</span><button type="button" aria-label="Dismiss notification" onClick={()=>setToast(null)}><X size={16}/></button></div>}</AdminContext.Provider>;
}
export function useAdmin(){const context=useContext(AdminContext);if(!context)throw new Error("Dashboard pages must be inside AdminProvider");return context;}
