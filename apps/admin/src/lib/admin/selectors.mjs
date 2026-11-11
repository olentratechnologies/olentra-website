const DAY = 86400000;
const rows = (db, key) => db?.datasets?.[key] || [];
const round = (n, digits = 1) => Number(Number(n || 0).toFixed(digits));
const mean = values => values.length ? values.reduce((sum, n) => sum + Number(n || 0), 0) / values.length : 0;
const percentile = (values, p = .75) => { const sorted = values.filter(Number.isFinite).sort((a, b) => a - b); return sorted.length ? sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)] : 0; };
export const clockMs = db => Date.parse(db?.meta?.clock || "2026-11-08T12:00:00.000Z");
function rangeDays(range = "Last 30 days") { if (/last hour/i.test(range)) return 1/24; if (/24|today/i.test(range)) return 1; return Number(String(range).match(/\d+/)?.[0]) || 30; }
function grouped(events, field) { const counts = new Map(); for (const event of events) counts.set(event[field], (counts.get(event[field]) || 0) + 1); return [...counts.entries()].map(([name, count]) => ({ name, count, percent: round(count / (events.length || 1) * 100) })).sort((a,b) => b.count-a.count); }
export function selectAnalytics(db, { range = "Last 30 days", source = "All sources", region = "Global", comparison = "Previous period" } = {}) {
  const end = clockMs(db), days = rangeDays(range), duration = days * DAY;
  const start = days === 1 ? end - DAY : new Date(new Date(end).setUTCHours(0,0,0,0)).getTime() - (days - 1) * DAY;
  const all = rows(db, "admin-visit-events").filter(event => (source === "All sources" || source === "All" || event.source === source) && (region === "Global" || region === "All regions" || event.region === region));
  const events = all.filter(event => Date.parse(event.at) >= start && Date.parse(event.at) <= end);
  const previousEnd = /year/i.test(comparison) ? new Date(new Date(end).setUTCFullYear(new Date(end).getUTCFullYear() - 1)).getTime() : start - 1;
  const previousStart = /year/i.test(comparison) ? new Date(new Date(start).setUTCFullYear(new Date(start).getUTCFullYear() - 1)).getTime() : start - duration;
  const previous = all.filter(event => Date.parse(event.at) >= previousStart && Date.parse(event.at) <= previousEnd);
  const visitors = new Set(events.map(event => event.visitorId || event.id)).size;
  const previousVisitors = new Set(previous.map(event => event.visitorId || event.id)).size;
  const enquiries = events.filter(event => event.enquiry).length;
  const bins = days === 1 ? 6 : days === 7 ? 7 : days <= 30 ? 6 : 9;
  // Multi-day windows start at a UTC midnight, so split whole days (through the
  // end of today) to keep every bucket, and its label, on a day boundary.
  const size = days > 1 ? (new Date(end).setUTCHours(24, 0, 0, 0) - start) / bins : (end - start + 1) / bins;
  const buckets = Array.from({length:bins}, () => []);
  for (const event of events) buckets[Math.min(bins - 1, Math.floor((Date.parse(event.at) - start) / size))].push(event);
  const chart = {
    values: buckets.map(bucket => new Set(bucket.map(event => event.visitorId || event.id)).size),
    enquiryValues: buckets.map(bucket => bucket.filter(event => event.enquiry).length),
    labels: buckets.map((_, i) => new Intl.DateTimeFormat("en-GB", days === 1 ? {hour:"2-digit",minute:"2-digit",timeZone:"UTC",hour12:false} : {month:"short",day:"numeric",timeZone:"UTC"}).format(new Date(start + i * size))),
  };
  const topPages = grouped(events, "page").map(item => { const count = events.filter(event => event.page === item.name && event.enquiry).length; return {page:item.name,views:item.count,enquiries:count,conversion:round(count/(item.count||1)*100,2)}; });
  return { events, visitors, uniqueVisitors:visitors, pageViews:events.length, enquiries, conversionRate:round(enquiries/(events.length||1)*100,2), previousVisitors, changePct:previousVisitors ? round((visitors-previousVisitors)/previousVisitors*100) : 0, chart, topPages, sources:grouped(events,"source"), regions:grouped(events,"region") };
}
export function selectMonitoring(db, {range = "Last 24 hours"} = {}) {
  const end = clockMs(db), start = end - rangeDays(range) * DAY;
  const probes = rows(db,"admin-performance-probes").filter(probe => Date.parse(probe.at) >= start && Date.parse(probe.at) <= end);
  const unresolvedIncidents = rows(db,"admin-incidents").filter(incident => incident.status !== "Resolved");
  const health = subset => ({ uptime:round(subset.filter(probe => probe.available).length/(subset.length||1)*100,2),responseMs:Math.round(mean(subset.map(probe=>probe.responseMs))),lcpMs:Math.round(percentile(subset.map(probe=>probe.lcpMs))),inpMs:Math.round(percentile(subset.map(probe=>probe.inpMs))),cls:round(percentile(subset.map(probe=>probe.cls)),3) });
  const statusFor = (subset, incidents) => incidents.length ? "Degraded" : !subset.length ? "No data" : subset.reduce((latest,probe) => Date.parse(probe.at) >= Date.parse(latest.at) ? probe : latest).available ? "Operational" : "Degraded";
  const regions = [...new Set(rows(db,"admin-performance-probes").map(probe=>probe.region))];
  const regionalRows = regions.map(name => {const subset=probes.filter(probe=>probe.region===name);return {name,region:name,...health(subset),status:statusFor(subset,unresolvedIncidents.filter(incident=>incident.region===name||incident.region==="Global"))};});
  const catalog = db?.reference?.operations?.services || [];
  const serviceIds = [...new Set(rows(db,"admin-performance-probes").map(probe=>probe.serviceId))];
  const serviceRows = serviceIds.map(id => {const subset=probes.filter(probe=>probe.serviceId===id);const known=Array.isArray(catalog)?catalog.find(item=>item.id===id):null;return {id,name:known?.name||known?.label||id,...health(subset),status:statusFor(subset,unresolvedIncidents.filter(incident=>incident.serviceId===id))};});
  const overall = health(probes);
  return {probes,unresolvedIncidents,regionalRows,serviceRows,uptime:overall.uptime,avgResponseMs:overall.responseMs,lcpMs:overall.lcpMs,inpMs:overall.inpMs,cls:overall.cls};
}
export function selectInternProgress(db, internId) {
  const tasks = Object.entries(db.datasets).filter(([key])=>key.startsWith("olentra-admin-project-tasks-")).flatMap(([,value])=>Array.isArray(value)?value:[]).filter(task => (task.internId||task.intern)===internId);
  const required = tasks.filter(task=>task.required!==false), approved=required.filter(task=>task.status==="Approved");
  return {tasks,required,approved,progress:required.length?Math.round(approved.length/required.length*100):0,complete:required.length>0&&required.length===approved.length};
}
export function selectProjectProgress(db, projectId) { const tasks=rows(db,"olentra-admin-project-tasks-"+projectId);const approved=tasks.filter(task=>task.status==="Approved");return {tasks,total:tasks.length,approved:approved.length,review:tasks.filter(task=>task.status==="In review").length,progress:tasks.length?Math.round(approved.length/tasks.length*100):0}; }
export function selectOverview(db) {
  const traffic=selectAnalytics(db,{range:"Last 24 hours"}),monitoring=selectMonitoring(db,{range:"Last 30 days"});
  return {traffic,monitoring,openEnquiries:rows(db,"olentra-admin-enquiries-v1").filter(item=>!["Resolved","Spam"].includes(item.status)).length,pendingApprovals:rows(db,"olentra-admin-governance-approvals-v1").filter(item=>item.status==="pending").length,activeInterns:rows(db,"olentra-admin-interns").filter(item=>item.status==="Active").length,unreadNotifications:rows(db,"olentra-admin-notifications-v1").filter(item=>!item.read).length,activity:rows(db,"olentra-admin-governance-audit-v1").slice(0,4)};
}
export function effectiveFeatures(db,{environment=db.datasets.environment||"Production",region=db.datasets.scope||"Global",draft=false,now=db.meta.clock}={}) {
  const features={...(db.datasets[(draft?"features:":"published-features:")+environment]||{})};
  for (const feature of Object.keys(features)) {
    const rule=db.datasets["feature-rule-"+environment+"-"+feature];
    if(rule?.mode==="Selected regions"&&region!=="Global"&&!rule.regions.includes(region))features[feature]=false;
    for(const schedule of rows(db,"feature-schedules").filter(row=>row.enabled!==false&&row.environment===environment&&row.featureId===feature)){
      if(region!=="Global"&&schedule.regions?.length&&!schedule.regions.includes(region))continue;
      try{const parts=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{timeZone:schedule.timezone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date(now)).map(p=>[p.type,p.value]));const date=parts.year+"-"+parts.month+"-"+parts.day,time=parts.hour+":"+parts.minute;if(date===schedule.date&&time>=schedule.start&&time<schedule.end)features[feature]=schedule.action!=="Hide feature";}catch{features[feature]=rule?.fallback==="Visible";}
    }
  }
  if(features.maintenance)for(const key of ["services","products","internships","blog","assistant","applications"])features[key]=false;
  return features;
}
export function can(db,module,action="view") {const session=db.datasets["auth-session"],account=rows(db,"auth-accounts").find(row=>row.id===session?.userId);if(session?.status!=="authenticated"||!account?.enabled||session.expiresAt&&Date.parse(session.expiresAt)<=clockMs(db))return false;if(account.role==="Owner")return true;const permissions=rows(db,"admin-role-permissions-"+account.role.toLowerCase().replaceAll(" ","-"));return Boolean(permissions.find(row=>row.name===module||row.id===module)?.[action]);}
