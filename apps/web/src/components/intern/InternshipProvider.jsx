"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { InternClient, internAuth, refreshInternSession, forgetInternToken, internLogoutPending, internCommandFailure } from "@/lib/intern-client.mjs";
import { createSnapshotRefresh } from "@/lib/intern-snapshot-refresh.mjs";
import { prepareInternSession } from "@/lib/intern-session-startup.mjs";
import { createInternQueryCache } from "@/lib/intern-query-cache.mjs";
import { internQueryScope } from "@/lib/intern-query-scope.mjs";
import { canReconcileInternWrite, canRefreshInternWriteInBackground, reconcileInternWrite } from "@/lib/intern-committed-write.mjs";
import LoadingIndicator from "@olentra/ui/LoadingIndicator";
import styles from "./session.module.css";

const Context = createContext(null);
const PENDING_KEY = "olentra_intern_pending_service_v1";
// Older builds kept an account-claim token here after applying; it is no longer used.
const clearLegacyPending = () => { try { sessionStorage.removeItem(PENDING_KEY); } catch { /* storage unavailable */ } };
const safeRedirect = (path, role) => { const home = role === "company" ? "/intern/dashboard" : "/intern/portal"; return typeof path === "string" && (path === home || path.startsWith(home + "/") || path.startsWith(home + "?")) && !path.includes("\\") ? path : home; };
const navigation = [{ id:"dashboard",label:"Dashboard",icon:"home" },{ id:"applications",label:"Applications",icon:"clipboard" },{ id:"analytics",label:"Analytics",icon:"chart" },{ id:"interns",label:"Interns",icon:"users" },{ id:"projects",label:"Projects",icon:"briefcase" },{ id:"certificates",label:"Certificates",icon:"certificate" },{ id:"settings",label:"Settings",icon:"settings" },{ id:"staff",label:"Staff & Roles",icon:"users" }];
const dateRanges = [{id:"all",label:"All time",chartPeriod:"1Y"}];
const chart = { periods: ["30D","7D","3M","1Y"].map(id => ({ id, label:id, growth:0, comparison:"", maxValue:1, points:[{label:"",explorer:0,innovator:0},{label:"",explorer:0,innovator:0}] })) };
const emptyMy = { application:null, intern:null, offer:null, interview:null, onboarding:{status:"Not started",acknowledged:false}, projects:[],tasks:[],submissions:[],certificates:[],messages:[],notifications:[],resources:[] };
const blank = { organization:{name:"Olentra",legalName:"Olentra Technologies Pvt. Ltd.",website:"/"}, user:{name:"",firstName:"",initials:"",email:"",role:""}, navigation, dateRanges, chart, quickActions:[], insights:[], programs:[], settings:{programEnabled:false,compensationMode:"both",explorerEnabled:false,innovatorEnabled:false,programName:"Olentra Internship Program",defaultBatch:"",maxStipend:0,rejectionEmails:false,integrations:{},applicationDeadline:null}, applications:[],interns:[],projects:[],tasks:[],submissions:[],offers:[],onboarding:[],certificates:[],interviews:[],messages:[],notifications:[],resources:[],activity:[],metrics:[],analytics:{months:[],previousMonths:[],skills:[]} };
function mergeApplicationWorkflow(data, applicationId, workflow) {
  const next = { ...data };
  for (const [collection, key] of [["offers", "offer"], ["onboarding", "onboarding"], ["interns", "intern"]]) {
    next[collection] = [...(data[collection] || []).filter(row => row.applicationId !== applicationId), ...(workflow[key] ? [workflow[key]] : [])];
  }
  return next;
}
function shapeSnapshot(snapshot) {
  const raw = snapshot?.data || {}, account = snapshot?.account || null, applications = raw.applications || [];
  const stats = raw.analytics, statuses = stats?.statusCounts || {}, total = stats?.totalApplications || 0;
  // Current-status counts, matching the Analytics and Applications pages (not a cumulative funnel).
  const counts = { applications:total,shortlisted:statuses.Shortlisted || 0,selected:statuses.Selected || 0,joined:statuses.Joined || 0 };
  const definitions = [{id:"applications",label:"Total applications",tone:"blue",icon:"users"},{id:"shortlisted",label:"Currently shortlisted",tone:"purple",icon:"clipboard"},{id:"selected",label:"Currently selected",tone:"green",icon:"check"},{id:"joined",label:"Joined",tone:"orange",icon:"users"}];
  const user = account ? {...account, firstName:account.name?.split(" ")[0] || "", initials:(account.name || "").split(/\s+/).slice(0,2).map(p=>p[0]).join("").toUpperCase()} : blank.user;
  return { data:{...blank,...raw,user,settings:{...blank.settings,...raw.settings,integrations:{...blank.settings.integrations,...raw.settings?.integrations}}, programs:(raw.programs || []).map(p=>({...p,color:p.id === "explorer" ? "#2583ff" : "#8256ff", detail:p.fee == null || p.stipend == null ? "Not configured" : `Fee ₹${p.fee}, stipend ₹${p.stipend}`,share:total ? Math.round((stats?.byTrack?.[p.id] || 0) / total * 100) : 0})), metrics:raw.metrics?.length ? raw.metrics : definitions.map(m=>({...m,value:counts[m.id],change:null,trend:[]})),chart:stats ? { periods:[{id:"1Y",label:"12 months",maxValue:Math.max(1,...stats.months.flatMap(m=>[m.explorer,m.innovator])),points:stats.months}] } : chart,navigation,dateRanges,quickActions:raw.quickActions || [],insights:raw.insights || []}, my:{...emptyMy,...snapshot?.my}, account };
}
export function InternshipProvider({ children }) {
  const [snapshot,setSnapshot]=useState(()=>shapeSnapshot(null)), [ready,setReady]=useState(false), [authReady,setAuthReady]=useState(false), [sessionReady,setSessionReady]=useState(false), [authUnavailable,setAuthUnavailable]=useState(false), [connected,setConnected]=useState(false), [workspaceState,setWorkspaceState]=useState(null), [sessionNotice,setSessionNotice]=useState(""), [toast,setToast]=useState(""), [query,setQuery]=useState(""), [dateRange,setDateRange]=useState("all"), [notificationDialog,setNotificationDialog]=useState(false);
  const publicClient = useRef(null);
  useEffect(() => () => { publicClient.current?.close(); publicClient.current = null; }, []);
  const client = useRef(null), snapshotRef = useRef(snapshot), mounted = useRef(false), refreshTimer = useRef(null), applicationCache = useRef(new Map()), snapshotVersion = useRef(0), refreshCoordinator = useRef(null), queryCacheRef = useRef(null);
  snapshotRef.current = snapshot;
  const notify = useCallback(message=>setToast(message),[]);
  const loadSnapshot = useCallback(async () => {
    if (!client.current || !mounted.current) return false;
    const version=snapshotVersion.current;
    try {
      const value=await client.current.request("intern.snapshot");
      if (!mounted.current || version!==snapshotVersion.current) return false;
      const next=shapeSnapshot(value), prior=snapshotRef.current.account;
      if (internQueryScope(prior) !== internQueryScope(next.account)) { applicationCache.current.clear(); queryCacheRef.current?.clear(); }
      if(next.account?.role === "company") {
        for (const id of applicationCache.current.keys()) {
          try {
            const [record,workflow]=await Promise.all([client.current.request("application.get",{id}),client.current.request("application.workflow",{applicationId:id})]);
            if(version!==snapshotVersion.current)return false;
            applicationCache.current.set(id,record); next.data.applications=[...next.data.applications.filter(row=>row.id!==id),record]; next.data=mergeApplicationWorkflow(next.data,id,workflow);
          } catch { applicationCache.current.delete(id); }
        }
      } else applicationCache.current.clear();
      if(!mounted.current || version!==snapshotVersion.current)return false;
      setSnapshot(next); setWorkspaceState(null); setReady(true); return true;
    } catch(error) {
      if (!mounted.current || version!==snapshotVersion.current) return false;
      if(error.code === "UNAUTHENTICATED") {
        snapshotVersion.current++; applicationCache.current.clear(); queryCacheRef.current?.clear(); forgetInternToken(); setSnapshot(shapeSnapshot(null)); setWorkspaceState(null); setSessionNotice("Your session ended. Please sign in again."); client.current?.authenticate().catch(()=>{});
      } else setWorkspaceState(state=>state === "loading" ? "error" : state);
      return false;
    }
  },[]);
  if (!refreshCoordinator.current) refreshCoordinator.current=createSnapshotRefresh(loadSnapshot);
  const reload = useCallback(() => refreshCoordinator.current.request(),[]);
  const invalidateSnapshot = useCallback(() => refreshCoordinator.current.invalidate(),[]);
  const resetSnapshot = useCallback(() => refreshCoordinator.current.reset(),[]);
  useEffect(()=>{
    let live=true, initializing=true, changedDuringInit=false, refreshingBackground=false, startupTimer, refreshRetryTimer, startupDelay=2000, refreshDelay=2000; mounted.current=true; clearLegacyPending();
    const instance=new InternClient({onChange:reason=>{queryCacheRef.current?.invalidate();if(initializing){if(reason!=="connected")changedDuringInit=true;return;}if(reason==="connected")void reload();else void invalidateSnapshot()},onConnection:value=>{if(live && mounted.current)setConnected(value)},onSessionChanged:()=>{snapshotVersion.current++;applicationCache.current.clear();queryCacheRef.current?.clear();if(live && mounted.current){setAuthUnavailable(false);setSnapshot(shapeSnapshot(null));setWorkspaceState(null);setSessionNotice("Your access changed. Please sign in again.")}}}); client.current=instance;
    const startSession=async()=>{
      try {
        const session=await prepareInternSession({restore:refreshInternSession,connect:()=>instance.connect(),authenticate:()=>instance.authenticate(),clear:forgetInternToken,isActive:()=>live});
        if(!live || !session)return;
        if(session.account){snapshotVersion.current++;applicationCache.current.clear();queryCacheRef.current?.clear();setSnapshot(shapeSnapshot({account:session.account}));setWorkspaceState("loading");}
        initializing=false;setAuthUnavailable(false);setAuthReady(true);setSessionReady(true);startupDelay=2000;
        if(changedDuringInit || session.account) await invalidateSnapshot(); else await reload();
      } catch { if(live){setAuthUnavailable(true);startupTimer=setTimeout(startSession,startupDelay);startupDelay=Math.min(startupDelay*2,30000);} }
      finally { if(live && mounted.current)setReady(true); }
    };
    void startSession();
    const refreshSession=async()=>{
      if (!live || !snapshotRef.current.account || refreshingBackground) return;
      refreshingBackground=true;
      try { await refreshInternSession(); await instance.authenticate(); if(live){clearTimeout(refreshRetryTimer);refreshDelay=2000;setAuthUnavailable(false);} }
      catch(error) {
        if(!live)return;
        if(error?.code === "UNAUTHENTICATED") { if(internLogoutPending())return; snapshotVersion.current++;applicationCache.current.clear();queryCacheRef.current?.clear();forgetInternToken();setAuthUnavailable(false);if(mounted.current){setSnapshot(shapeSnapshot(null));setWorkspaceState(null);setSessionNotice("Your session ended. Please sign in again.");} }
        else { setAuthUnavailable(true);clearTimeout(refreshRetryTimer);refreshRetryTimer=setTimeout(refreshSession,refreshDelay);refreshDelay=Math.min(refreshDelay*2,30000); }
      }
      finally { refreshingBackground=false; }
    };
    refreshTimer.current=setInterval(refreshSession,12*60*1000);
    return ()=>{live=false;mounted.current=false;snapshotVersion.current++;clearInterval(refreshTimer.current);clearTimeout(startupTimer);clearTimeout(refreshRetryTimer);instance.close();if(client.current===instance)client.current=null;void invalidateSnapshot();};
  },[reload,invalidateSnapshot]);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(""),4500);return()=>clearTimeout(timer)},[toast]);
  const call=useCallback(async(method,params={},write=true)=>{
    try {
      const actor=snapshotRef.current.account, data=await client.current.request(method,params,write);
      if (internQueryScope(actor) !== internQueryScope(snapshotRef.current.account)) return { ok:false, error:"Your session changed. Reload this view." };
      if(write) {
        queryCacheRef.current?.invalidate();
        if(canRefreshInternWriteInBackground(method)) {
          if(canReconcileInternWrite(method)) { snapshotVersion.current++; setSnapshot(old=>reconcileInternWrite(old,actor,method,params,data)); }
          void invalidateSnapshot();
        } else await invalidateSnapshot();
      }
      return {ok:true,data};
    } catch(error) { return internCommandFailure(error); }
  },[invalidateSnapshot]);
  const queryScope = internQueryScope(snapshot.account);
  const queryCache = useMemo(() => {
    const cache = createInternQueryCache((method, params) => call(method, params, false));
    cache.setScope(queryScope);
    return cache;
  }, [call, queryScope]);
  queryCacheRef.current = queryCache;
  // Effect cleanup is also replayed by React Strict Mode. Clear pending data
  // without permanently disabling the cache that the replay will reuse.
  useEffect(() => () => queryCache.clear(), [queryCache]);
  const signIn=useCallback(async({email,password,returnTo})=>{queryCacheRef.current?.clear();try {const result=await internAuth("login",{email,password});snapshotVersion.current++;await client.current.authenticate();snapshotVersion.current++;applicationCache.current.clear();setSnapshot(shapeSnapshot({account:result.account}));setWorkspaceState("loading");setSessionNotice("");void resetSnapshot();return {ok:true,role:result.account.role,redirect:safeRedirect(returnTo,result.account.role)};}catch(error){return {ok:false,error:error?.message || "Unable to sign in."}}},[resetSnapshot]);
  const signOut=useCallback(async()=>{queryCacheRef.current?.clear();snapshotVersion.current++;setWorkspaceState(null);try{await internAuth("logout")}catch{}forgetInternToken();try{await client.current?.authenticate()}catch{}setSnapshot(shapeSnapshot(null));setQuery("");await resetSnapshot()},[resetSnapshot]);
  const verifyMagicLink=useCallback(async(token)=>{queryCacheRef.current?.clear();try{const result=await internAuth("verify-magic-link",{token});snapshotVersion.current++;await client.current?.authenticate();snapshotVersion.current++;applicationCache.current.clear();setSnapshot(shapeSnapshot({account:result.account}));setWorkspaceState("loading");setSessionNotice("");void resetSnapshot();return {ok:true,role:result.account.role,redirect:"/intern/portal"};}catch(error){return {ok:false,error:error?.message||"Invalid or expired sign-in link."};}},[resetSnapshot]);
  const requestMagicLink=useCallback(async(email)=>{try{const result=await internAuth("magic-link",{email});return {ok:true,message:result?.message||"A sign-in link has been sent to your email."};}catch(error){return {ok:false,error:error?.message||"Unable to send sign-in link. Please try again."};}},[]);
  const commands=useMemo(()=>({
    // Each email can submit one application; repeated requests with a new key are rejected.
    submitApplication:async payload=>{
      // Keep the public application independent of the signed-in dashboard.
      publicClient.current ||= new InternClient({ publicOnly: true });
      try { const data=await publicClient.current.request("application.submit",payload,true); void invalidateSnapshot(); return {ok:true,data}; }
      catch(error) { return internCommandFailure(error); }
    },
    saveAutomatedEmail:template=>call("automatedEmail.save",{id:template.id,subject:template.subject,body:template.body}), previewAutomatedEmail:template=>call("automatedEmail.preview",{id:template.id,subject:template.subject,body:template.body},false), resetAutomatedEmail:id=>call("automatedEmail.reset",{id}),
    listStaff:params=>call("staff.list",params,false), createStaff:params=>call("staff.create",params), updateStaff:params=>call("staff.update",params), resetStaffPassword:params=>call("staff.resetPassword",params), listRoles:()=>call("role.list",{},false), createRole:params=>call("role.create",params), updateRole:params=>call("role.update",params), listStaffAudit:params=>call("audit.list",params,false),
    listInterns:params=>call("intern.list",params,false), listProjects:params=>call("project.list",params,false), listCertificates:params=>call("certificate.list",params,false), listTasks:params=>call("task.list",params,false), listSubmissions:params=>call("submission.list",params,false), listMessages:params=>call("message.list",params,false), listNotifications:params=>call("notification.list",params,false), listApplications:params=>call("application.list",params,false), getApplication:async id=>{const [result,workflow]=await Promise.all([call("application.get",{id},false),call("application.workflow",{applicationId:id},false)]);if(!result.ok)return result;if(!workflow.ok)return workflow;applicationCache.current.clear();applicationCache.current.set(id,result.data);setSnapshot(old=>{const data={...old.data,applications:[...old.data.applications.filter(a=>a.id!==id),result.data]};return {...old,data:mergeApplicationWorkflow(data,id,workflow.data)}});return result}, configureProgram:payload=>call("program.configure",payload), createAccountForApplication:(applicationId,password)=>call("account.createForApplication",{applicationId,password}), resetPassword:(accountId,password)=>call("account.resetPassword",{accountId,password}), changePassword:({currentPassword,newPassword})=>call("account.changePassword",{currentPassword,newPassword}),
    // Quiet status change for bulk actions: returns {ok,error} instead of toasting each failure.
    bulkSetApplicationStatus:(items,status)=>call("application.bulkUpdate",{items,status}),setApplicationStatus:(id,status,version)=>call("application.update",{id,status,expectedVersion:version}),
    submitStory:story=>call("story.submit",story),withdrawStory:()=>call("story.withdraw",{}),reviewStory:(id,decision)=>call("story.review",{id,decision}),
    sendOffer:(applicationId,terms)=>call("offer.send",{applicationId,...terms}),scheduleInterview:(applicationId,details)=>call("interview.schedule",{applicationId,...details}),cancelInterview:(applicationId,reason)=>call("interview.cancel",{applicationId,reason}),acceptOffer:applicationId=>call("offer.accept",{applicationId}),extendOffer:(applicationId,days)=>call("offer.extend",{applicationId,days}),withdrawApplication:(applicationId,reason)=>call("application.withdraw",{applicationId,reason}),assignMentor:(internId,mentorId)=>call("intern.assignMentor",{internId,mentorId}),submitFeedback:values=>call("feedback.submit",values),uploadOnboardingDocument:(applicationId,docId,attachmentId)=>call("onboarding.document",{applicationId,docId,attachmentId}),reviewOnboardingDocument:(applicationId,docId,decision,note)=>call("onboarding.reviewDocument",{applicationId,docId,decision,note}),submitCheckin:checkin=>call("checkin.submit",checkin),replyCheckin:(id,reply)=>call("checkin.reply",{id,reply}),completeResource:(resourceId,done)=>call("resource.complete",{resourceId,done}),saveResource:resource=>call("resource.save",resource),deleteResource:id=>call("resource.delete",{id}),saveView:(name,filters)=>call("view.save",{name,filters}),deleteView:id=>call("view.delete",{id}),saveTemplate:template=>call("template.save",template),deleteTemplate:id=>call("template.delete",{id}),listReviewers:()=>call("staff.reviewers",{},false),assignApplications:(applicationIds,assigneeId)=>call("application.assign",{applicationIds,assigneeId}),saveReview:(applicationId,scores,comment)=>call("review.save",{applicationId,scores,comment}),eraseApplicant:(applicationId,confirmEmail)=>call("applicant.erase",{applicationId,confirmEmail}),declineOffer:(applicationId,reason)=>call("offer.decline",{applicationId,reason}),saveOnboarding:(applicationId,details)=>call("onboarding.save",{applicationId,details}),submitOnboarding:applicationId=>call("onboarding.submit",{applicationId}),approveOnboarding:applicationId=>call("onboarding.approve",{applicationId}),updateProfile:profile=>call("profile.update",profile),createTask:task=>call("task.create",task),updateTask:(id,patch)=>call("task.update",{id,patch}),startTask:taskId=>call("task.start",{taskId}),submitWork:(taskId,submission)=>call("submission.create",{taskId,...submission}),reviewSubmission:(id,review)=>call("submission.review",{id,...review}),sendMessage:(applicationId,message)=>call("message.send",{applicationId,...message}),markNotificationsRead:ids=>call("notification.markRead",{ids}),completeInternship:id=>call("intern.update",{id,patch:{status:"Completed"}}),sendAnnouncement:announcement=>call("announcement.send",announcement),
  }),[call,invalidateSnapshot]);
  const legacy=useCallback(async(method,params,failure=false)=>{const result=await call(method,params);if(!result.ok){notify(result.error);return failure}return result.data},[call,notify]);
  const retryWorkspace=useCallback(()=>{setWorkspaceState("loading");void invalidateSnapshot()},[invalidateSnapshot]);
  const insightsChannel=useMemo(()=>({
    subscribe:()=>client.current ? client.current.request("insights.subscribe") : Promise.reject(new Error("The internship service is unavailable.")),
    unsubscribe:()=>client.current?.request("insights.unsubscribe").catch(()=>{}),
    listen:listener=>client.current ? client.current.addInsightsListener(listener) : ()=>{},
  }),[]);
  const staffEvents=useMemo(()=>({listen:listener=>client.current ? client.current.addStaffListener(listener) : ()=>{}}),[]);
  const value={...snapshot,insightsChannel,staffEvents,queryCache,seed:{metrics:[],metricsByRange:{}},ready,authReady,sessionReady,authUnavailable,connected,workspaceState,retryWorkspace,session:snapshot.account ? {role:snapshot.account.role,accountId:snapshot.account.id}:null,sessionNotice,demoAccounts:[],commands,signIn,verifyMagicLink,requestMagicLink,signOut,requestPasswordReset:async(email)=>{try{const result=await internAuth("request-password-reset",{email});return {ok:true,message:result?.message||"Password reset instructions sent."};}catch(error){return {ok:false,error:error?.message||"Unable to send reset link. Please try again."};}},resetPassword:async({token,password})=>{try{await internAuth("reset-password",{token,password});return {ok:true};}catch(error){return {ok:false,error:error?.message||"Unable to reset password. The link may have expired."};}},notify,toast,dismissToast:()=>setToast(""),query,setQuery,dateRange,setDateRange,notificationDialog,setNotificationDialog,
    updateApplication:(id,patch,version)=>legacy("application.update",{id,patch,expectedVersion:version ?? snapshotRef.current.data.applications.find(a=>a.id===id)?.version}),updateIntern:(id,patch)=>legacy("intern.update",{id,patch}),createProject:project=>legacy("project.create",{project},null),updateProject:(id,patch)=>legacy("project.update",{id,patch}),generateCertificates:internIds=>legacy("certificate.generate",{internIds},[]),updateSettings:patch=>legacy("settings.update",{patch}),addActivity:entry=>legacy("activity.add",entry),markNotificationsRead:()=>commands.markNotificationsRead(snapshotRef.current.my.notifications.map(n=>n.id)),resetDemo:async()=>{notify("Demo data is not used by the internship service.");return false},reload};
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useInternship(){const context=useContext(Context);if(!context)throw new Error("useInternship must be inside InternshipProvider");return context}
export function RoleGuard({ role, children }) {
  const { sessionReady, authUnavailable, account, sessionNotice, connected } = useInternship();
  const router = useRouter(), pathname = usePathname();
  useEffect(() => {
    if (!sessionReady || !connected || authUnavailable) return;
    if (!account) {
      const target = pathname + (typeof window !== "undefined" ? window.location.search : "");
      router.replace(`/intern/login?role=${role}&returnTo=${encodeURIComponent(target)}${sessionNotice ? "&notice=session" : ""}`);
    } else if (account.role !== role) router.replace(account.role === "company" ? "/intern/dashboard" : "/intern/portal");
  }, [sessionReady, connected, authUnavailable, account, role, pathname, router, sessionNotice]);
  // Authentication is the boundary. The persistent shell owns snapshot loading,
  // so a verified session can see navigation before its workspace data arrives.
  if (!sessionReady || !connected || authUnavailable || account?.role !== role) {
    const unavailable = authUnavailable || (sessionReady && !connected);
    return <div className={styles.loading}>{unavailable ? <strong role="alert">Internship service unavailable</strong> : <LoadingIndicator label="Opening your workspace…" />}<p>{unavailable ? "Check your connection. We will reconnect automatically." : sessionReady ? "Taking you to the right place…" : "Restoring your session…"}</p></div>;
  }
  return children;
}
