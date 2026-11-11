"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowLeft, ArrowRight, Bell, BellRing, Building2, Check, CheckCheck, CheckCircle2, ChevronRight, Clock3, Cloud, Database, Download, ExternalLink, FileText, Globe2, History, Inbox, KeyRound, Layers3, Link2, LockKeyhole, Mail, MessageSquare, Monitor, MoreHorizontal, Plug, Plus, RefreshCw, RotateCcw, Save, Search, Send, Settings2, ShieldCheck, ShieldAlert, Smartphone, Sparkles, TestTube2, Trash2, Upload, UserRound, UsersRound, X, AlertTriangle } from "lucide-react";
import { PageHeader, Panel, Button, Badge, Field, Input, Select, Switch, Tabs, DataTable, SearchInput, Stat, Modal, useLocalState } from "@/components/admin/ui";
import { useAdmin } from "@/components/admin/store";
import { CompanyLogo } from "./company-logo";
import styles from "./governance-pages.module.css";
import governanceData from "@/data/admin/governance.json";
import { useRouter } from "next/navigation";
import { changeWorkspacePassword } from "@/lib/workspace-auth.mjs";
import { siteUrl } from "@/lib/site-url";

const FIXTURES = governanceData.datasets;
const REFERENCE = governanceData.reference;
const APPROVAL_KEY = "olentra-admin-governance-approvals-v1";
const AUDIT_KEY = "olentra-admin-governance-audit-v1";
const INTEGRATION_KEY = "olentra-admin-integrations-v1";
const INITIAL_APPROVALS = FIXTURES[APPROVAL_KEY];
const INITIAL_AUDIT = FIXTURES[AUDIT_KEY];
const INITIAL_CONNECTIONS = FIXTURES[INTEGRATION_KEY];
const EMAIL_DEFAULTS = governanceData.templates["olentra-admin-integration-config-"];
const COMPANY_DEFAULTS = FIXTURES["olentra-admin-company-settings-v1"];
const INITIAL_BACKUPS = FIXTURES["olentra-admin-backups-v1"];
const INITIAL_NOTIFICATIONS = FIXTURES["olentra-admin-notifications-v1"];
const ACCOUNT_DEFAULTS = FIXTURES["olentra-admin-account-v1"];
const SERVICE_ICONS = { Mail, Activity, UsersRound, Monitor, Building2, Inbox };
const INTEGRATIONS = REFERENCE.integrations.map((item) => ({ ...item, icon: SERVICE_ICONS[item.icon] || Plug }));
const isFeatureRequest = (request) => request.kind === "features" || (!request.kind && request.type === "Feature change");
const displayValue = (value) => value == null ? "—" : typeof value === "object" ? JSON.stringify(value) : String(value);

function useGovernance() {
  const { db } = useAdmin();
  const approvals = db?.datasets?.[APPROVAL_KEY] || INITIAL_APPROVALS;
  const audit = (db?.datasets?.[AUDIT_KEY] || INITIAL_AUDIT).map((item) => ({ ...item, category: item.category || item.module || "System", resource: item.resource || item.details?.resource || item.action, before: item.before ?? item.details?.before ?? item.restore?.before, after: item.after ?? item.details?.after ?? item.restore?.after, reason: item.reason || item.details?.reason, approval: item.approval || item.details?.approval, restore: item.restore || item.details?.restore, date: item.date || item.createdAt || item.at || "", time: item.time || (item.createdAt || item.at || "").slice(11,16) }));
  return { approvals, audit };
}

function useCommandAction() {
  const { command, notify } = useAdmin();
  return (type, payload, success) => {
    const result = command(type, payload);
    if (!result?.ok) { notify(result?.error || "The change could not be applied."); return null; }
    if (success) notify(success);
    return result;
  };
}

function Notice({ children, tone, icon: Icon = ShieldCheck }) {
  return <div className={`${styles.notice} ${tone ? styles[tone] : ""}`}><Icon size={17} /><div>{children}</div></div>;
}
function KeyValue({ label, children }) { return <div className={styles.kv}><span>{label}</span><strong>{children}</strong></div>; }
function Empty({ title = "No matching items", description = "Try another filter to see more results.", icon: Icon = Inbox }) { return <div className={styles.empty}><Icon size={30} /><strong>{title}</strong>{description}</div>; }
function Status({ status }) {
  const values = { pending: ["warning", "Pending"], approved: ["success", "Approved"], rejected: ["danger", "Rejected"], changes: ["blue", "Changes requested"], superseded: ["muted", "Superseded"], connected: ["success", "Connected"], attention: ["warning", "Needs attention"], available: ["muted", "Not connected"] };
  const [tone, label] = values[status] || ["muted", status];
  return <Badge tone={tone}>{label}</Badge>;
}
function downloadPreview(filename, value, mime = "application/json") {
  const blob = new Blob([typeof value === "string" ? value : JSON.stringify(value, null, 2)], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
}
function ChangeSummary({ request }) {
  return <><KeyValue label="Requested by">{request.actor}</KeyValue><KeyValue label="Scope">{request.scope}</KeyValue><KeyValue label="Submitted">{request.submitted}</KeyValue><div className={styles.section}><div className={styles.title}>{isFeatureRequest(request) ? "Archived proposal" : "Proposed change"}</div>{isFeatureRequest(request) ? <><KeyValue label="Public visibility">{request.previous?.internships === false ? "Off" : "On"} → {request.changes.internships ? "On" : "Off"}</KeyValue><KeyValue label="New applications">{request.previous?.applications === false ? "Off" : "On"} → {request.changes.applications ? "On" : "Off"}</KeyValue><KeyValue label="Existing intern portal">Remains on</KeyValue></> : <p className={styles.description}>{request.reason}</p>}</div>{isFeatureRequest(request) && <Notice>Legacy review record. Live website switches are managed in Website controls.</Notice>}</>;
}

function ReadonlyReviewSnapshot({ model = {}, kind }) {
  const { db } = useAdmin();
  if (!model || !Object.keys(model).length) return <Empty title="Not published yet" description="There is no saved published snapshot for this item." icon={FileText} />;
  const fields = kind === "program"
    ? [["title", "Title"], ["description", "Description"], ["track", "Track"], ["mode", "Work mode"], ["duration", "Duration"], ["skills", "Skills"], ["eligibility", "Eligibility"], ["opens", "Opens on"], ["closes", "Closes on"], ["timezone", "Time zone"], ["capacity", "Capacity"], ["regions", "Regions"], ["public", "Public visibility"], ["applications", "Accept applications"], ["portal", "Existing intern portal"]]
    : kind === "seo"
      ? [["title", "Meta title"], ["description", "Meta description"], ["canonical", "Canonical URL"], ["index", "Search indexing"]]
      : kind === "translation"
        ? [["title", "Localized title"], ["summary", "Localized summary"], ["cta", "Call to action"]]
        : [["title", "Headline"], ["description", "Description"], ["button", "Button label"], ["destination", "Button destination"], ["visibility", "Visibility"], ["seo", "SEO title"]];
  return <div className={styles.reviewReadOnly}>{fields.filter(([key]) => Object.hasOwn(model, key)).map(([key, label]) => <div className={styles.reviewReadOnlyField} key={key}><span>{label}</span><strong>{typeof model[key] === "boolean" ? model[key] ? "Enabled" : "Disabled" : displayValue(model[key])}</strong></div>)}
    {kind === "program" && Array.isArray(model.form) && <div className={styles.reviewReadOnlyField}><span>Application form requirements</span>{model.form.map((required, index) => <strong key={index}>{db?.reference?.content?.programFormLabels?.[index] || `Field ${index + 1}`}: {required ? "Required" : "Optional"}</strong>)}</div>}
    {kind === "content" && model.blocks && Object.entries(model.blocks).map(([name, block]) => <div className={styles.reviewReadOnlyField} key={name}><span>{name} section</span><strong>{block.title}</strong><p>{block.description}</p></div>)}
  </div>;
}

export function ApprovalsPage() {
  const { notify } = useAdmin();
  const { approvals } = useGovernance();
  const [tab, setTab] = useState("pending");
  const [selectedId, setSelectedId] = useState("CHG-024");
  const [policyOpen, setPolicyOpen] = useState(false);
  const [savedPolicy] = useLocalState("olentra-admin-approval-policy-v1", FIXTURES["olentra-admin-approval-policy-v1"]);
  const [policy, setPolicy] = useState(savedPolicy); useEffect(() => setPolicy(savedPolicy), [savedPolicy]); const run = useCommandAction();
  const filtered = approvals.filter((item) => tab === "mine" ? item.actor === "Owner" : item.status === tab);
  const selected = filtered.find((item) => item.id === selectedId) || filtered[0];
  const pending = approvals.filter((item) => item.status === "pending");
  const columns = [
    { key: "title", label: "Change", render: (value, row) => <span className={styles.tableTitle}><FileText size={16} /><span><Link href={`/dashboard/approvals/${row.id}`} className="workspace-link">{value}</Link><span className={styles.tableSub}>{row.id}</span></span></span> },
    { key: "type", label: "Type" }, { key: "scope", label: "Scope" }, { key: "actor", label: "Requested by" },
    { key: "submitted", label: "Submitted" }, { key: "status", label: "Status", render: (value) => <Status status={value} /> },
  ];
  return <>
    <PageHeader title="Approvals" description="Review saved content and browser-local configuration revisions." actions={<Button icon={Settings2} onClick={() => setPolicyOpen(true)}>Review policies</Button>} />
    <Tabs items={[{ value: "pending", label: `Pending ${pending.length}` }, { value: "mine", label: "Requested by me" }, { value: "approved", label: "Approved" }, { value: "rejected", label: "Rejected" }, { value: "superseded", label: "Archived" }]} value={tab} onChange={setTab} />
    <div className={styles.metricGrid} style={{ marginTop: 20 }}><Stat label="Pending" value={pending.length} icon={Layers3} color="#3b82f6" /><Stat label="High impact" value={pending.filter((item) => item.impact === "High impact").length} icon={AlertTriangle} color="#fbbf24" /><Stat label="Content updates" value={pending.filter((item) => item.type !== "Feature change").length} icon={FileText} color="#a78bfa" /></div>
    <div className={styles.wideSplit}><Panel title="Approval queue" description="Changes waiting for review and approval.">{filtered.length ? <DataTable columns={columns} rows={filtered} onRowClick={(row) => setSelectedId(row.id)} /> : <Empty title={tab === "mine" ? "No requests from you" : `No ${tab} changes`} description="Requests will appear here when their status changes." />}</Panel>
      <Panel title={selected?.title || "Change summary"} actions={selected && <Badge tone={selected.impact === "High impact" ? "warning" : "blue"}>{selected.impact}</Badge>}>{selected ? <><ChangeSummary request={selected} /><div className={styles.footerActions}><Button href={`/dashboard/approvals/${selected.id}`} variant="primary" icon={Layers3}>{isFeatureRequest(selected) ? "View archived values" : "Compare changes"}</Button></div></> : <Empty description="Select a change to see its details." />}</Panel></div>
    <div className={styles.equal} style={{ marginTop: 20 }}><Panel title="Activity" description="A review path for browser-local content revisions."><div className={styles.timeline}><TimelineItem title="Request submitted" description="The author records the proposed change and its reason." /><TimelineItem title="Awaiting approval" description="An authorized reviewer checks the visitor experience and impact." /><TimelineItem title="Record the approved revision" description="Approved changes are recorded in the audit history." last /></div></Panel><Panel title="Content review policy" description="Policies for local content and translation workflows."><div className={styles.section}><div className={styles.title}><UsersRound size={19} /> Content revisions use review</div><p className={styles.description}>Website on/off switches apply immediately. These policies apply to browser-local content and translation reviews.</p></div><div className={styles.section}><div className={styles.title}><ShieldCheck size={19} /> Changes remain attributable</div><p className={styles.description}>Requests, decisions and publication events stay in the audit history.</p></div><Button href="/dashboard/audit" variant="ghost" icon={History}>View audit history</Button></Panel></div>
    <Modal open={policyOpen} onClose={() => setPolicyOpen(false)} title="Review policies"><div className={styles.form}><Notice>These settings apply to local content and translation workflows. Live website feature switches apply immediately and do not require approval.</Notice><Switch label="Review content publishing" checked={policy.content} onChange={(value) => setPolicy({ ...policy, content: value })} /><Switch label="Review translations" checked={policy.translations} onChange={(value) => setPolicy({ ...policy, translations: value })} /></div><div className={styles.modalFooter}><Button onClick={() => setPolicyOpen(false)}>Close</Button><Button variant="primary" onClick={() => { if (run("settings.save", { section: "approvalPolicy", values: policy }, "Review policy saved.")) setPolicyOpen(false); }}>Save policy</Button></div></Modal>
  </>;
}

function TimelineItem({ title, description, time }) { return <div className={styles.timelineItem}><span className={styles.timelineIcon}><Check size={14} /></span><div className={styles.timelineBody}><strong>{title}</strong><p>{description}</p>{time && <time>{time}</time>}</div></div>; }

export function ChangeReviewPage({ changeId = "CHG-024" }) {
  const { notify, features, db } = useAdmin(); const run = useCommandAction();
  const { approvals } = useGovernance();
  const canonicalChangeId = changeId === "internships" ? "CHG-024" : changeId;
  const request = approvals.find((item) => item.id === canonicalChangeId);
  const [decision, setDecision] = useState(null);
  const [comment, setComment] = useState("");
  const [preview, setPreview] = useState(false);
  if (!request) return <><PageHeader title="Change not found" description="This request is no longer available in the local preview." /><Button href="/dashboard/approvals" icon={ArrowLeft}>Back to approvals</Button></>;
  const setDecisionStatus = (status) => {
    if (isFeatureRequest(request)) { notify("Live website switches are managed directly in Website controls."); return; }
    const result = run("approval.decide", { id: request.id, decision: status === "approved" ? "approve" : status === "rejected" ? "reject" : "changes", reason: comment }, status === "approved" ? "Change approved and published to the shared JSON state." : status === "rejected" ? "Change rejected." : "Review note saved.");
    if (result) { setDecision(null); setComment(""); }
  };
  const contentId = request.target?.id || "homepage";
  const translation = db?.datasets?.[`admin-translation-${request.target?.locale}-${request.target?.contentId}`];
  const revisions = db?.datasets?.[`olentra-admin-page-history-${contentId}`] || [];
  const contentModel = db?.datasets?.[`olentra-admin-page-${contentId}`] || request.target?.model || {};
  const seoDraft = db?.datasets?.["admin-seo-pages"]?.find((item) => item.id === request.target?.id) || {};
  const seoPublished = db?.datasets?.["admin-seo-published"]?.find((item) => item.id === request.target?.id) || {};
  const programModel = db?.datasets?.[`olentra-admin-program-${request.target?.id}`] || {};
  const publishedProgram = db?.datasets?.[`olentra-admin-published-program-${request.target?.id}`] || {};
  const beforeModel = request.kind === "program" ? publishedProgram : request.kind === "seo" ? seoPublished : request.kind === "translation" ? translation?.publishedFields || (translation?.status === "Published" ? translation.fields : {}) || {} : db?.datasets?.[`olentra-admin-published-page-${contentId}`] || revisions.find((item) => item.status === "Published")?.model || contentModel;
  const proposedModel = request.kind === "program" ? request.target?.model || programModel : request.kind === "seo" ? request.target?.patch || seoDraft : request.kind === "translation" ? request.changes?.fields || translation?.fields || {} : request.target?.model || contentModel;
  const settings = REFERENCE.featureReviewSettings;
  return <>
    <PageHeader eyebrow={<Link href="/dashboard/approvals" className="workspace-link">Approvals / Change review</Link>} title={isFeatureRequest(request) ? "Legacy feature review" : request.title} description={`Request ID: ${request.id}`} actions={<Status status={request.status} />} />
    {isFeatureRequest(request) && <div className={styles.stack} style={{ marginBottom: 20 }}><Notice tone="warning" icon={History}>This is a historical browser-scenario record. Live website switches apply immediately in Website controls; this review cannot publish or change public visibility.</Notice><div><Button href="/dashboard/website-controls" variant="primary" icon={Settings2}>Open Website controls</Button></div></div>}
    <div className={styles.wideSplit}><div className={styles.stack}>{isFeatureRequest(request) ? <div className={styles.reviewGrid}>{[false, true].map((proposed) => <Panel key={String(proposed)} title={proposed ? "Archived proposal" : "Recorded previous state"} description="Historical browser-local values retained for reference.">{settings.map((setting) => { const current = !!(request.previous || features)[setting.key]; const value = proposed ? !!request.changes[setting.key] : current; const changed = proposed && value !== current; return <div key={setting.key} className={`${styles.reviewSetting} ${proposed ? changed ? styles.changed : styles.unchanged : ""}`}><div className={styles.between}><span className={styles.title}>{setting.title}</span>{proposed && <Badge tone={changed ? "warning" : "success"}>{changed ? "Changed" : "Unchanged"}</Badge>}</div><p>{setting.description}</p><div className={styles.row} style={{ marginTop: 11 }}><Badge tone={value ? "blue" : "muted"}>{value ? "On" : "Off"}</Badge></div></div>; })}</Panel>)}</div> : <div className={styles.reviewGrid}>{[{ label: "Current published snapshot", model: beforeModel, tone: Object.keys(beforeModel).length ? "success" : "muted", status: Object.keys(beforeModel).length ? "Published" : "Not published" }, { label: "Proposed saved snapshot", model: proposedModel, tone: request.status === "approved" ? "success" : request.status === "rejected" ? "danger" : "warning", status: request.status === "approved" ? "Approved revision" : request.status === "rejected" ? "Rejected proposal" : "Awaiting review" }].map((version) => <Panel key={version.label} title={version.label} actions={<Badge tone={version.tone}>{version.status}</Badge>}><ReadonlyReviewSnapshot model={version.model} kind={request.kind || "content"} /></Panel>)}</div>}
        <Panel title={isFeatureRequest(request) ? "Historical snapshot" : "Impact summary"} description={isFeatureRequest(request) ? "Archived values do not control the live website." : "Effect of approving this saved local revision."}><ul className={styles.impactList}>{(isFeatureRequest(request) ? [`Archived public visibility: ${request.changes.internships ? "Visible" : "Hidden"}`, `Archived intake: ${request.changes.applications ? "Open" : "Closed"}`, `Archived intern portal: ${request.changes.portal ? "Enabled" : "Disabled"}`, "Manage live switches in Website controls"] : ["Reviewed content replaces the current version", `Publishing scope: ${request.scope}`, "Previous content stays in the history", "Other website sections remain available"]).map((text) => <li key={text}><CheckCircle2 size={19} />{text}</li>)}</ul></Panel></div>
      <div className={styles.stack}><Panel title="Request details"><KeyValue label="Requested by">{request.actor}</KeyValue><KeyValue label="Reviewer">Owner</KeyValue><KeyValue label="Requested">{request.submitted}</KeyValue><KeyValue label="Scope">{request.scope}</KeyValue><KeyValue label="Status"><Status status={request.status} /></KeyValue></Panel><Panel title="Reason"><p className={styles.description}>{request.reason}</p>{request.decisionNote && <><div className={styles.section}><div className={styles.title}>Reviewer note</div><p className={styles.description}>{request.decisionNote}</p></div></>}</Panel>{!isFeatureRequest(request) && <Button variant="ghost" icon={ExternalLink} onClick={() => setPreview(true)}>Preview saved revision</Button>}<Button href="/dashboard/audit" variant="ghost" icon={History}>View approval history</Button></div>
    </div>
    {!isFeatureRequest(request) && (request.status === "pending" || request.status === "changes" ? <div className={styles.footerActions}><Button variant="primary" icon={Check} onClick={() => setDecision("approved")}>Approve revision</Button><Button icon={MessageSquare} onClick={() => setDecision("changes")}>Request changes</Button><Button variant="danger" icon={X} onClick={() => setDecision("rejected")}>Reject</Button></div> : <div style={{ marginTop: 20 }}><Notice tone={request.status === "approved" ? "success" : undefined}>This request has been {request.status}. Its decision is recorded in the audit history.</Notice></div>)}
    <Modal open={!isFeatureRequest(request) && !!decision} onClose={() => setDecision(null)} title={decision === "approved" ? "Approve this change?" : decision === "rejected" ? "Reject this change?" : "Request changes"}><p className={styles.modalText}>{decision === "approved" ? "Approving records the proposed revision in the browser-local JSON dataset and its audit history." : "Add a reviewer note to explain your decision to the author."}</p><Field label={decision === "approved" ? "Review note (optional)" : "Review note"}><textarea className={styles.reason} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add context for the change history…" /></Field><div className={styles.modalFooter}><Button onClick={() => setDecision(null)}>Cancel</Button><Button variant={decision === "rejected" ? "danger" : "primary"} disabled={decision !== "approved" && !comment.trim()} onClick={() => setDecisionStatus(decision)}>{decision === "approved" ? "Approve revision" : decision === "rejected" ? "Reject change" : "Send review note"}</Button></div></Modal>
    <Modal open={!isFeatureRequest(request) && preview} onClose={() => setPreview(false)} title="Saved revision preview"><Notice>This is the saved local proposal for its selected language and publishing scope.</Notice><div style={{ marginTop: 20 }}><ReadonlyReviewSnapshot model={proposedModel} kind={request.kind || "content"} /></div><div className={styles.modalFooter}><Button onClick={() => setPreview(false)}>Close preview</Button></div></Modal>
  </>;
}

export function AuditHistoryPage() {
  const { notify, db } = useAdmin();
  const { audit } = useGovernance(); const run = useCommandAction();
  const [query, setQuery] = useState(""); const [actor, setActor] = useState("All"); const [module, setModule] = useState("All"); const [tab, setTab] = useState("All events"); const [range, setRange] = useState("Last 7 days");
  const [selectedId, setSelectedId] = useState("AUD-105"); const [restore, setRestore] = useState(false);
  const todayUTC = new Date(db?.meta?.clock || db?.meta?.now || "2026-11-08T12:00:00.000Z").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
  const filtered = audit.filter((item) => (actor === "All" || item.actor === actor) && (module === "All" || item.category === module) && (tab === "All events" || item.category === tab) && `${item.actor} ${item.action} ${item.resource} ${item.scope}`.toLowerCase().includes(query.toLowerCase()) && (range !== "Today" || item.date.startsWith(todayUTC) || new Date(item.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }) === todayUTC));
  const selected = filtered.find((item) => item.id === selectedId) || filtered[0];
  const restoreReview = () => {
    if (run("audit.restore", { id: selected.id }, "The saved JSON configuration was restored.")) setRestore(false);
  };
  const columns = [{ key: "time", label: "Time" }, { key: "actor", label: "Actor", render: (value) => <span className={styles.tag}><UserRound size={15} />{value}</span> }, { key: "action", label: "Action", render: (value) => <Badge tone={value.includes("Verified") || value.includes("Approved") ? "success" : "blue"}>{value}</Badge> }, { key: "resource", label: "Resource" }, { key: "scope", label: "Scope", render: (value) => <Badge tone="blue">{value}</Badge> }];
  return <><PageHeader title="Audit history" description="Trace configuration, content and access changes." actions={<Button icon={Download} onClick={() => { downloadPreview("olentra-audit-preview.json", filtered); notify("Filtered audit history exported."); }}>Export log</Button>} />
    <Panel><div className={styles.filterGrid}><SearchInput value={query} onChange={setQuery} placeholder="Search events…" /><label>Date range<Select options={["Today", "Last 7 days", "All time"]} value={range} onChange={(event) => setRange(event.target.value)} /></label><label>Actor<Select options={["All", ...new Set(audit.map((item) => item.actor))]} value={actor} onChange={(event) => setActor(event.target.value)} /></label><label>Module<Select options={["All", ...new Set(audit.map((item) => item.category))]} value={module} onChange={(event) => setModule(event.target.value)} /></label></div></Panel>
    <div className={styles.tabSpace}><Tabs items={["All events", "Content", "Feature switches", "Access", "System"]} value={tab} onChange={setTab} /></div>
    <div className={styles.split}><Panel title={`${filtered.length} ${filtered.length === 1 ? "event" : "events"}`}>{filtered.length ? <DataTable columns={columns} rows={filtered} onRowClick={(row) => setSelectedId(row.id)} /> : <Empty />}</Panel><Panel title={selected?.resource || "Event details"} actions={selected && <Badge tone="blue">{selected.id}</Badge>}>{selected ? <><KeyValue label="Actor">{selected.actor}</KeyValue><KeyValue label="Date">{selected.date}</KeyValue><KeyValue label="Action">{selected.action}</KeyValue><KeyValue label="Scope">{selected.scope}</KeyValue><div className={styles.diff}><div className={styles.diffBox}><span>Before</span><strong>{displayValue(selected.before)}</strong></div><ArrowRight size={19} /><div className={styles.diffBox}><span>After</span><strong>{displayValue(selected.after)}</strong></div></div><KeyValue label="Reason">{selected.reason || "No note recorded"}</KeyValue>{selected.approval && <KeyValue label="Approval"><Link href={`/dashboard/approvals/${selected.approval}`} className="workspace-link">{selected.approval}</Link></KeyValue>}{selected.restore && <div className={styles.form} style={{ marginTop: 18 }}><Button icon={RotateCcw} onClick={() => setRestore(true)}>Restore previous configuration</Button><Notice>Restoring applies this event’s saved JSON snapshot and records a new audit event.</Notice></div>}</> : <Empty description="Select an event to inspect its details." />}</Panel></div>
    <Modal open={restore} onClose={() => setRestore(false)} title="Restore saved JSON configuration"><p className={styles.modalText}>Restore the saved configuration from this audit event. This updates the shared local JSON data and records a new audit event.</p><div className={styles.modalFooter}><Button onClick={() => setRestore(false)}>Cancel</Button><Button variant="primary" onClick={restoreReview}>Restore configuration</Button></div></Modal>
  </>;
}

export function IntegrationsPage() {
  const { notify } = useAdmin(); const run = useCommandAction();
  const [connections] = useLocalState(INTEGRATION_KEY, INITIAL_CONNECTIONS);
  const [query, setQuery] = useState(""); const [filter, setFilter] = useState("All categories"); const [connect, setConnect] = useState(null); const [serviceName, setServiceName] = useState("");
  const filtered = INTEGRATIONS.filter((item) => `${item.title} ${item.description}`.toLowerCase().includes(query.toLowerCase()) && (filter === "All categories" || filter === "Connected" && connections[item.id] === "connected" || filter === "Needs attention" && connections[item.id] === "attention" || filter === "Available" && connections[item.id] === "available"));
  return <><PageHeader title="Integrations" description="Connect the services that power your website." actions={<Button variant="primary" icon={Plus} onClick={() => { setConnect("new"); setServiceName(""); }}>Add integration</Button>} />
    <div className={styles.metricGrid}><Stat label="Connected" value={Object.values(connections).filter((state) => state === "connected").length} icon={Link2} color="#34d399" /><Stat label="Needs attention" value={Object.values(connections).filter((state) => state === "attention").length} icon={AlertTriangle} color="#fbbf24" /><Stat label="Available" value={Object.values(connections).filter((state) => state === "available").length} icon={Layers3} color="#a78bfa" /></div>
    <div className={styles.between}><div style={{ flex: 1, minWidth: 200 }}><SearchInput value={query} onChange={setQuery} placeholder="Search integrations…" /></div><Select options={["All categories", "Connected", "Needs attention", "Available"]} value={filter} onChange={(event) => setFilter(event.target.value)} /></div>
    <div className={styles.integrationGrid}>{filtered.map((item) => { const Icon = item.icon; const state = connections[item.id]; return <article className={styles.integrationCard} key={item.id}><div className={styles.integrationTop}><div className={styles.integrationIcon}><Icon size={24} /></div><div><h2 className={styles.integrationHeading}>{item.title}</h2><Status status={state} /></div></div><p>{item.description}</p><div className={styles.integrationFooter}><span>{state === "connected" ? item.sync : state === "attention" ? "Connection needs review" : item.sync}</span>{state === "connected" ? <Button href={`/dashboard/integrations/${item.id}`}>Configure</Button> : <Button onClick={() => setConnect(item.id)}>{state === "attention" ? "Reconnect" : "Connect"}</Button>}</div></article>; })}</div>{!filtered.length && <Panel><Empty /></Panel>}
    <div className={styles.equal}><Panel title="Recent integration activity" description="Illustrative connection events."><DataTable columns={[{ key: "time", label: "Time" }, { key: "integration", label: "Integration" }, { key: "event", label: "Event" }, { key: "status", label: "Status", render: (value) => <Badge tone={value === "Success" ? "success" : "warning"}>{value}</Badge> }]} rows={REFERENCE.integrationActivity} /></Panel><Panel title="Connection health" description="Sample delivery events over the last seven days."><div className={styles.health}><div className={styles.healthMetric}><span>Successful deliveries</span><strong>{REFERENCE.integrationHealth.successful.toLocaleString()}</strong><Badge tone="success">+3.8%</Badge></div><div className={styles.healthMetric}><span>Failed deliveries</span><strong>{REFERENCE.integrationHealth.failed}</strong><Badge tone="warning">Review deliveries</Badge></div></div><div style={{ marginTop: 24 }}><Notice icon={Activity}>Connection tests validate the saved JSON configuration locally. No external services are contacted.</Notice></div></Panel></div>
    <Modal open={!!connect} onClose={() => setConnect(null)} title={connect === "new" ? "Add integration" : `Connect ${INTEGRATIONS.find((item) => item.id === connect)?.title || "service"}`}><div className={styles.form}><Notice icon={Plug}>Preview the connection workflow. A saved, valid local configuration is required. No external service is contacted.</Notice>{connect === "new" && <Field label="Integration type"><Select options={[{ value: "", label: "Select a service" }, ...INTEGRATIONS.map((item) => ({ value: item.id, label: item.title }))]} value={serviceName} onChange={(event) => setServiceName(event.target.value)} /></Field>}<Notice icon={Settings2}>Configure the service before connecting. A missing credential or invalid URL will return a validation error.</Notice>{connect && connect !== "new" && <Button href={`/dashboard/integrations/${connect}`}>Configure service</Button>}</div><div className={styles.modalFooter}><Button onClick={() => setConnect(null)}>Cancel</Button><Button variant="primary" disabled={connect === "new" && !serviceName} onClick={() => { const id = connect === "new" ? serviceName : connect; if (run("integration.connect", { id }, "Saved service configuration connected.")) setConnect(null); }}>Validate & connect</Button></div></Modal>
  </>;
}


export function IntegrationSettingsPage({ integrationId = "email" }) {
  const { notify, command } = useAdmin(); const run = useCommandAction();
  const service = INTEGRATIONS.find((item) => item.id === integrationId) || INTEGRATIONS[0];
  const [saved] = useLocalState(`olentra-admin-integration-config-${service.id}-v1`, FIXTURES[`olentra-admin-integration-config-${service.id}-v1`] || EMAIL_DEFAULTS);
  const [connections] = useLocalState(INTEGRATION_KEY, INITIAL_CONNECTIONS);
  const [form, setForm] = useState(saved); useEffect(() => setForm(saved), [saved]); const [tab, setTab] = useState("Configuration"); const [testOpen, setTestOpen] = useState(false); const [testResult, setTestResult] = useState(null);
  const set = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const save = (event) => {
    event?.preventDefault();
    const config = { sender: form.sender, email: form.email, environment: form.environment, webhook: form.webhook, subscriptions: form.subscriptions, credentialConfigured: !!form.credential || !!form.credentialConfigured, signingSecretConfigured: !!form.signingSecret || !!saved.signingSecretConfigured };
    if (run("integration.save", { id: service.id, config }, "Service configuration saved. Typed credentials were not stored.")) setForm((previous) => ({ ...previous, credential: "", signingSecret: "" }));
  };
  const testConnection = () => {
    const result = command("integration.test", { id: service.id });
    setTestResult({ ok: !!result?.ok, message: result?.ok ? result.value?.message || "Saved service configuration passed local validation." : result?.error || "Configuration validation failed." });
    setTestOpen(true);
  };
  const logs = REFERENCE.deliveryLogs;
  const subscriptions = REFERENCE.subscriptions;
  return <><PageHeader eyebrow={<Link href="/dashboard/integrations" className="workspace-link">Integrations / {service.title}</Link>} title={service.title} description="Manage service configuration and delivery events." actions={<><Button icon={TestTube2} onClick={() => { setTestResult(null); setTestOpen(true); }}>Test connection</Button><Button variant="primary" icon={Save} onClick={save}>Save changes</Button></>} />
    <Tabs items={["Configuration", "Delivery logs", "Webhooks"]} value={tab} onChange={setTab} />
    {tab === "Delivery logs" ? <Panel title="Delivery logs" description="Illustrative events from the selected service."><DataTable columns={[{ key: "event", label: "Event" }, { key: "time", label: "Time" }, { key: "status", label: "Status", render: (value) => <Badge tone={value === "Delivered" ? "success" : "warning"}>{value}</Badge> }]} rows={logs} /><Button icon={Download} onClick={() => downloadPreview("delivery-log-preview.json", logs)}>Export events</Button></Panel> : <div className={styles.equal} style={{ marginTop: 20 }}><div className={styles.stack}>{tab === "Configuration" && <Panel title="Configuration" description="Service identity and event subscriptions."><form className={styles.form} onSubmit={save}><Field label={service.id === "email" ? "Sender name" : "Workspace name"}><Input value={form.sender} onChange={(event) => set("sender", event.target.value)} required /></Field><Field label="Notification email"><Input type="email" value={form.email} onChange={(event) => set("email", event.target.value)} required /></Field><Field label="API credential" hint="Credentials stay masked and are not saved in this preview."><Input type="password" autoComplete="off" value={form.credential} onChange={(event) => set("credential", event.target.value)} placeholder="••••••••••••••••" /></Field><Button variant="ghost" icon={RefreshCw} onClick={() => { setForm((previous) => ({ ...previous, credential: "", credentialConfigured: false })); notify("Enter a new demo credential and save before testing."); }}>Rotate credential</Button><Field label="Environment"><Select options={["Production", "Staging"]} value={form.environment} onChange={(event) => set("environment", event.target.value)} /></Field><div className={styles.section}><div className={styles.title}>Event subscriptions</div><div className={styles.checkboxList} style={{ marginTop: 17 }}>{subscriptions.map((item) => <label className={styles.checkbox} key={item.key}><input type="checkbox" checked={!!form.subscriptions[item.key]} onChange={(event) => set("subscriptions", { ...form.subscriptions, [item.key]: event.target.checked })} /><span>{item.label}<small>{item.description}</small></span></label>)}</div></div><button type="submit" className={styles.hidden}>Save settings</button></form></Panel>}{tab === "Webhooks" && <Panel title="Webhook events"><Notice icon={Link2}>The URL is a local demo configuration. Testing validates the saved fields without sending a request.</Notice><div className={styles.checkboxList} style={{ marginTop: 20 }}>{subscriptions.map((item) => <label className={styles.checkbox} key={item.key}><input type="checkbox" checked={!!form.subscriptions[item.key]} onChange={(event) => set("subscriptions", { ...form.subscriptions, [item.key]: event.target.checked })} /><span>{item.label}<small>{item.description}</small></span></label>)}</div></Panel>}</div>
      <div className={styles.stack}><Panel title="Connection health"><div className={styles.health}><Status status={connections[service.id]} /><div className={styles.healthMetric}><span>Last local test</span><strong>{saved.lastTestAt ? saved.lastTestAt.slice(11, 16) + " UTC" : "Not tested"}</strong></div><div className={styles.healthMetric}><span>Delivery rate · {REFERENCE.connectionHealth.period}</span><strong>{REFERENCE.connectionHealth.deliveryRate}</strong></div></div></Panel><Panel title="Webhook destination" description="Delivery events and status updates."><div className={styles.form}><Field label="Webhook URL"><Input value={form.webhook} onChange={(event) => set("webhook", event.target.value)} /></Field><Field label="Signing secret"><Input type="password" autoComplete="off" value={form.signingSecret} onChange={(event) => set("signingSecret", event.target.value)} placeholder="••••••••••••••••" /></Field><div className={styles.row}><Button icon={Send} onClick={() => { testConnection(); }}>Send test event</Button><Button icon={FileText} onClick={() => setTab("Delivery logs")}>View logs</Button></div></div></Panel><Panel title="Recent delivery log"><DataTable columns={[{ key: "event", label: "Event" }, { key: "time", label: "Time" }, { key: "status", label: "Status", render: (value) => <Badge tone={value === "Delivered" ? "success" : "warning"}>{value}</Badge> }]} rows={logs.slice(0, 3)} /></Panel></div>
    </div>}
    <Modal open={testOpen} onClose={() => setTestOpen(false)} title="Connection test preview"><Notice icon={TestTube2}>This test validates the saved JSON service configuration. Missing credentials, invalid addresses or malformed URLs return errors. No remote request is sent.</Notice>{testResult ? <div style={{ marginTop: 20 }}><Notice tone={testResult.ok ? "success" : "warning"} icon={testResult.ok ? CheckCircle2 : AlertTriangle}>{testResult.message}</Notice></div> : <p className={styles.modalText} style={{ marginTop: 18 }}>Check how connection feedback will appear for {service.title.toLowerCase()}.</p>}<div className={styles.modalFooter}><Button onClick={() => setTestOpen(false)}>Close</Button>{!testResult && <Button variant="primary" onClick={testConnection}>Validate configuration</Button>}</div></Modal>
  </>;
}

function SettingsTabs({ value }) { return <div className={styles.row} style={{ marginBottom: 22 }}>{[{ title: "Company", href: "/dashboard/settings/company", icon: Building2 }, { title: "Security", href: "/dashboard/settings/security", icon: ShieldCheck }, { title: "Backups", href: "/dashboard/settings/backups", icon: Database }, { title: "Notifications", href: "/dashboard/notifications", icon: Bell }].map((item) => <Button key={item.title} href={item.href} icon={item.icon} variant={value === item.title ? "primary" : "default"}>{item.title}</Button>)}</div>; }

function DataManagementPanel() {
  const { db, exportData, importData, resetData, notify } = useAdmin();
  const run = useCommandAction();
  const [pendingImport, setPendingImport] = useState(null);
  const [importName, setImportName] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [clock, setClock] = useState(String(db?.meta?.clock || db?.meta?.now || "2026-11-08T12:00:00.000Z").slice(0, 16));
  useEffect(() => { if (db?.meta?.clock) setClock(String(db.meta.clock).slice(0, 16)); }, [db?.meta?.clock]);
  const [error, setError] = useState("");
  const loadFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { setError("Choose a JSON snapshot smaller than 20 MB."); return; }
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || !parsed.datasets || typeof parsed.datasets !== "object" || Array.isArray(parsed.datasets)) throw new Error("The file must contain a dashboard snapshot with a datasets object.");
      setError(""); setImportName(file.name); setPendingImport(parsed);
    } catch (caught) { setError(caught.message || "This file is not valid JSON."); }
  };
  const applyImport = () => {
    const result = importData(pendingImport);
    if (!result?.ok) { setError(result?.error || "The JSON snapshot failed validation."); return; }
    setPendingImport(null); setError(""); notify("JSON snapshot imported. All modules now use the restored data.");
  };
  return <Panel title="Data management" description="Export, import and reset the shared JSON dataset used by every dashboard page.">
    <div className={styles.form}>
      <KeyValue label="Datasets">{Object.keys(db?.datasets || {}).length}</KeyValue>
      <div className={styles.row}>
        <Button icon={Download} onClick={() => { const snapshot = exportData(); if (!snapshot || snapshot.error) { setError(snapshot?.error || "The snapshot could not be exported."); return; } downloadPreview("olentra-dashboard-data.json", snapshot); notify("Shared JSON snapshot exported."); }}>Download JSON</Button>
        <label className={styles.importControl}><Upload size={16} />Upload JSON<input type="file" accept="application/json,.json" onChange={loadFile} /></label>
        <Button variant="danger" icon={RotateCcw} onClick={() => { setResetConfirmation(""); setResetOpen(true); }}>Reset fixtures</Button>
      </div>
      {error && <Notice tone="warning" icon={AlertTriangle}>{error}</Notice>}
      <Notice icon={Database}>Changes are stored in this browser. Downloads contain the complete local JSON state; imports validate the entire snapshot before replacing it.</Notice>
      <div className={styles.section}><div className={styles.title}><Clock3 size={18} /> Simulation clock</div><p className={styles.description}>Change the browser scenario time to exercise date-dependent demo workflows. Live website switches do not use this simulation clock.</p><div className={styles.row} style={{ marginTop: 14 }}><label className={styles.inlineInput}><span className={styles.muted}>Date and time · UTC</span><Input type="datetime-local" value={clock} onChange={(event) => setClock(event.target.value)} /></label><Button icon={Clock3} onClick={() => { const next = new Date(`${clock.length === 16 ? clock + ":00" : clock}Z`); if (Number.isNaN(next.getTime())) { setError("Choose a valid UTC date and time."); return; } if (run("clock.set", { now: next.toISOString() }, "Simulation clock updated for browser-local workflows.")) setError(""); }}>Set clock</Button></div></div>
    </div>
    <Modal open={!!pendingImport} onClose={() => setPendingImport(null)} title="Import JSON snapshot"><Notice tone="warning" icon={AlertTriangle}>This replaces the current shared dashboard data after schema validation. Download your current snapshot first if you need to preserve it.</Notice><KeyValue label="File">{importName}</KeyValue><KeyValue label="Datasets">{Object.keys(pendingImport?.datasets || {}).length}</KeyValue>{error && <Notice tone="warning">{error}</Notice>}<div className={styles.modalFooter}><Button onClick={() => setPendingImport(null)}>Cancel</Button><Button variant="primary" onClick={applyImport}>Validate & import</Button></div></Modal>
    <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Reset all local JSON fixtures"><Notice tone="warning" icon={AlertTriangle}>Reset replaces your local changes with the original JSON fixtures across all modules.</Notice><div style={{ marginTop: 18 }}><Field label="Type RESET to confirm"><Input value={resetConfirmation} onChange={(event) => setResetConfirmation(event.target.value)} placeholder="RESET" /></Field></div><div className={styles.modalFooter}><Button onClick={() => setResetOpen(false)}>Cancel</Button><Button variant="danger" disabled={resetConfirmation !== "RESET"} onClick={() => { const result = resetData(); if (!result?.ok) { setError(result?.error || "The fixtures could not be reset."); return; } setResetOpen(false); setError(""); notify("Original JSON fixtures restored across the dashboard."); }}>Reset shared data</Button></div></Modal>
  </Panel>;
}

export function CompanySettingsPage() {
  const { notify } = useAdmin(); const run = useCommandAction();
  const [saved] = useLocalState("olentra-admin-company-settings-v1", COMPANY_DEFAULTS); const [form, setForm] = useState(saved); useEffect(() => setForm(saved), [saved]); const [changed, setChanged] = useState(false);
  const set = (key, value) => { setForm((previous) => ({ ...previous, [key]: value })); setChanged(true); };
  const save = (event) => { event?.preventDefault(); if (!form.company.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { notify("Enter a company name and valid contact email."); return; } if (run("settings.save", { section: "company", values: form }, "Company settings saved to the shared JSON data.")) setChanged(false); };
  const upload = (event) => { const file = event.target.files?.[0]; if (!file) return; if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 2 * 1024 * 1024) { notify("Choose a PNG, JPG or WebP image under 2 MB."); return; } const reader = new FileReader(); reader.onload = () => set("logo", reader.result); reader.readAsDataURL(file); };
  return <><PageHeader title="Company settings" description="Manage the public identity and defaults for your workspace." actions={<Button variant="primary" icon={Save} onClick={save}>Save changes{changed ? " •" : ""}</Button>} /><SettingsTabs value="Company" />
    <div className={styles.equal}><div className={styles.stack}><Panel title="Public company profile" description="Information used on your public website and related pages."><form className={styles.form} onSubmit={save}><Field label="Company name"><Input value={form.company} onChange={(event) => set("company", event.target.value)} required /></Field><Field label="Website"><Input type="url" value={form.website} onChange={(event) => set("website", event.target.value)} /></Field><Field label="Contact email"><Input type="email" value={form.email} onChange={(event) => set("email", event.target.value)} required /></Field><Field label="Contact phone"><Input type="tel" value={form.phone} onChange={(event) => set("phone", event.target.value)} placeholder="Add a public contact number" /></Field><Field label="Description"><textarea className={styles.reason} value={form.description} onChange={(event) => set("description", event.target.value)} /></Field><button type="submit" className={styles.hidden}>Save profile</button></form></Panel><Panel title="Regional defaults" description="Default language and formatting for your workspace."><div className={styles.form}><Field label="Default language"><Select options={["English", "French", "Spanish", "German", "Hindi"]} value={form.language} onChange={(event) => set("language", event.target.value)} /></Field><Field label="Time zone"><Select options={["Asia/Kolkata", "UTC", "Europe/London", "America/New_York", "Asia/Singapore"]} value={form.timezone} onChange={(event) => set("timezone", event.target.value)} /></Field><Field label="Operating scope"><Select options={["Global", "Asia Pacific", "Europe", "Americas"]} value={form.scope} onChange={(event) => set("scope", event.target.value)} /></Field><Field label="Date format"><Select options={["DD MMM YYYY", "DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]} value={form.dateFormat} onChange={(event) => set("dateFormat", event.target.value)} /></Field></div></Panel></div>
      <div className={styles.stack}><Panel title="Brand and appearance" description="Your brand identity and core visual settings."><div className={styles.subtitle}>Company logo preview</div><div className={styles.brandPreview}><CompanyLogo src={form.logo} companyName={form.company} className={styles.thumbnail} /></div><label className={styles.upload}><Upload size={25} /><strong>Upload brand asset</strong><small>PNG, JPG or WebP · Maximum 2 MB</small><input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} /></label>{form.logo && <Button variant="ghost" icon={Trash2} onClick={() => set("logo", "")}>Remove uploaded image</Button>}<div className={styles.swatches}><div className={styles.swatch}><span style={{ background: "#2563eb" }} /><div><strong>Primary brand color</strong>#2563EB</div></div><div className={styles.swatch}><span style={{ background: "#070b12" }} /><div><strong>Background</strong>#070B12</div></div></div></Panel><Panel title="Workspace details" description="Administrative information for this workspace."><KeyValue label="Workspace">Company workspace</KeyValue><KeyValue label="Environment"><Badge tone="blue">Production</Badge></KeyValue><KeyValue label="Storage">Local preview</KeyValue><KeyValue label="Account role">Owner</KeyValue></Panel><Notice>Public profile changes in this preview stay in your browser until a website backend is connected.</Notice></div>
    </div><div style={{ marginTop: 20 }}><DataManagementPanel /></div></>;
}


export function SecuritySettingsPage() {
  const staffPage = siteUrl("/intern/dashboard/staff");
  return <><PageHeader title="Security settings" description="How administrator sign-in is protected and how access is recovered." actions={<Button href={staffPage} target="_blank" rel="noopener noreferrer" variant="primary" icon={UsersRound}>Manage staff &amp; roles</Button>} /><SettingsTabs value="Security" />
    <div className={styles.equal}>
      <Panel title="How sign-in is protected" description="Enforced by the account service for both dashboards.">
        <KeyValue label="Accounts">Olentra staff accounts, shared with the internship dashboard</KeyValue>
        <KeyValue label="Passwords">Stored as Argon2id hashes · at least 12 characters</KeyValue>
        <KeyValue label="Brute-force protection">Sign-in pauses after repeated failures for 15 minutes</KeyValue>
        <KeyValue label="Sessions">15-minute access tokens, renewed automatically · up to 7 days per browser tab</KeyValue>
        <KeyValue label="Password reset">One-time email link · expires in 1 hour · signs out every session</KeyValue>
        <KeyValue label="Workspace access">Admins, plus staff roles granted a workspace access level</KeyValue>
      </Panel>
      <Panel title="If someone is locked out" description="Recovery never depends on a single person or device.">
        <div className={styles.section}><div className={styles.title}><KeyRound size={22} /> 1. Forgot password</div><p className={styles.description}>Use “Forgot password?” on the sign-in page to email a one-time reset link.</p></div>
        <div className={styles.section}><div className={styles.title}><UsersRound size={22} /> 2. Another admin resets it</div><p className={styles.description}>Any internship admin can set a new password in Staff &amp; roles. Keep at least two admins.</p></div>
        <div className={styles.section}><div className={styles.title}><ShieldCheck size={22} /> 3. Break-glass command</div><p className={styles.description}>An operator with database access runs <code>npm run internship:admin -- reset --email you@company.com</code> to restore admin access and email a fresh link.</p></div>
      </Panel>
    </div>
    <div style={{ marginTop: 20 }}><Notice icon={LockKeyhole}>Authenticator-app two-factor authentication is planned as the next security step.</Notice></div>
  </>;
}

export function BackupsRecoveryPage() {
  const { notify } = useAdmin(); const run = useCommandAction(); const [backups] = useLocalState("olentra-admin-backups-v1", INITIAL_BACKUPS); const [savedSettings] = useLocalState("olentra-admin-backup-settings-v1", FIXTURES["olentra-admin-backup-settings-v1"]); const [settings, setSettings] = useState(savedSettings); useEffect(() => setSettings(savedSettings), [savedSettings]);
  const [detail, setDetail] = useState(null); const [restore, setRestore] = useState(false); const [confirm, setConfirm] = useState(""); const [restoreResult] = useLocalState("olentra-admin-restore-preview-v1", FIXTURES["olentra-admin-restore-preview-v1"]);
  const selected = backups.find((item) => item.id === settings.selected) || backups[0] || { id: "", title: "No backup selected", date: "—", time: "—" };
  const runBackup = () => run("backup.create", {}, "A restorable JSON backup was created.");
  const prepare = (selectedId = settings.selected) => {
    if (!run("settings.save", { section: "backup", values: { ...settings, selected: selectedId } })) return;
    setConfirm(""); setRestore(true);
  };
  return <><PageHeader title="Backups & recovery" description="Protect website content and workspace configuration." actions={<><Button variant="primary" icon={Layers3} onClick={runBackup}>Run backup</Button><Button icon={RotateCcw} disabled={!backups.length} onClick={() => prepare()}>Restore local data</Button></>} /><SettingsTabs value="Backups" />
    <div className={styles.metricGrid}><Stat label="Last backup" value={backups[0]?.title.startsWith("Manual backup") ? "Just now" : REFERENCE.backupOverview.lastBackup} icon={Database} change={backups[0]?.status || "No backups"} color="#34d399" /><Stat label="Backup schedule" value={REFERENCE.backupOverview.schedule} icon={Clock3} color="#3b82f6" /><Stat label="Last restore test" value={restoreResult ? "Just now" : REFERENCE.backupOverview.lastRestoreTest} icon={TestTube2} change={restoreResult ? "Restored" : REFERENCE.backupOverview.lastRestoreStatus} color="#a78bfa" /></div>
    <div className={styles.wideSplit}><div className={styles.stack}><Panel title="Backups" description="Restorable snapshots of the shared dashboard data."><DataTable columns={[{ key: "title", label: "Backup", render: (value) => <span className={styles.tableTitle}><Database size={16} />{value}</span> }, { key: "date", label: "Created UTC", render: (value, row) => <span>{value}<span className={styles.tableSub}>{row.time}</span></span> }, { key: "scope", label: "Scope" }, { key: "size", label: "Size" }, { key: "status", label: "Status", render: (value) => <Badge tone="success">{value}</Badge> }, { key: "actions", label: "Actions", render: (_, row) => <div className={styles.row}><button className={styles.linkButton} onClick={() => setDetail(row)}>View</button><Button onClick={() => { setSettings({ ...settings, selected: row.id }); prepare(row.id); }}>Restore</Button></div> }]} rows={backups} /></Panel>
        <Panel title="Backup verification timeline" description="Sample verification steps for the selected snapshot."><div className={styles.checkTimeline}>{REFERENCE.backupTimeline.map((item) => <div key={item.label}><CheckCircle2 size={28} /><strong>{item.label}</strong><time>{selected.date} · {item.time}</time></div>)}</div></Panel>{restoreResult && <Notice tone="success">Local JSON restored from {restoreResult.backup}.</Notice>}</div>
      <Panel title="Recovery settings"><div className={styles.form}><Field label="Retention"><Select options={["7 days", "30 days", "90 days"]} value={settings.retention} onChange={(event) => setSettings({ ...settings, retention: event.target.value })} /></Field><Field label="Target environment"><Select options={["Staging"]} value={settings.target} onChange={(event) => setSettings({ ...settings, target: event.target.value })} /></Field><Field label="Restore scope"><Select options={["Content and configuration", "Content only", "Configuration only"]} value={settings.scope} onChange={(event) => setSettings({ ...settings, scope: event.target.value })} /></Field><Field label="Selected backup"><Select options={backups.map((item) => ({ value: item.id, label: `${item.date} ${item.time}` }))} value={settings.selected} onChange={(event) => setSettings({ ...settings, selected: event.target.value })} /></Field><label className={styles.checkbox}><input type="checkbox" checked={settings.review} onChange={(event) => setSettings({ ...settings, review: event.target.checked })} /><span>Review before restoring</span></label><Notice>Recovery replaces the selected shared JSON content and settings. Authentication, audit history and backup records are preserved.</Notice><Button variant="primary" icon={Layers3} onClick={() => prepare()}>Prepare restore</Button></div></Panel></div>
    <Modal open={!!detail} onClose={() => setDetail(null)} title="Backup details">{detail && <><KeyValue label="Backup">{detail.title}</KeyValue><KeyValue label="Created">{detail.date} · {detail.time}</KeyValue><KeyValue label="Scope">{detail.scope}</KeyValue><KeyValue label="Size">{detail.size}</KeyValue><KeyValue label="Verification"><Badge tone="success">{detail.status}</Badge></KeyValue><div className={styles.modalFooter}><Button onClick={() => setDetail(null)}>Close</Button><Button icon={Download} onClick={() => { downloadPreview(`${detail.id}-preview.json`, detail); notify("Sample backup manifest exported."); }}>Export manifest</Button></div></>}</Modal>
    <Modal open={restore} onClose={() => setRestore(false)} title="Restore shared JSON data"><Notice tone="warning" icon={AlertTriangle}>This replaces selected data in the local dashboard with the saved JSON snapshot. Export your current data first if you need to preserve it.</Notice><KeyValue label="Selected backup">{selected.title}</KeyValue><KeyValue label="Target environment">Staging</KeyValue><KeyValue label="Restore scope">{settings.scope}</KeyValue><div style={{ marginTop: 20 }}><Field label="Type RESTORE to confirm recovery"><Input value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="off" placeholder="RESTORE" /></Field></div><div className={styles.modalFooter}><Button onClick={() => setRestore(false)}>Cancel</Button><Button variant="primary" disabled={confirm !== "RESTORE"} onClick={() => { if (run("backup.restore", { id: selected.id, confirmation: confirm }, "The selected JSON snapshot was restored.")) setRestore(false); }}>Restore JSON snapshot</Button></div></Modal>
  </>;
}


export function NotificationCenterPage() {
  const { notify } = useAdmin(); const run = useCommandAction(); const [notificationRecords] = useLocalState("olentra-admin-notifications-v1", INITIAL_NOTIFICATIONS); const notifications = notificationRecords.map((item) => ({ ...item, description: item.description || item.body, tone: item.tone || (item.severity === "warning" || item.severity === "critical" ? "warning" : item.severity === "success" ? "success" : "blue"), type: item.type || item.severity || "Update", source: item.source || item.category || "System", time: item.time || "Just now", action: item.action || "View details", href: item.href || "/dashboard/notifications" })); const [savedPreferences] = useLocalState("olentra-admin-notification-preferences-v1", FIXTURES["olentra-admin-notification-preferences-v1"]); const [preferences, setPreferences] = useState(savedPreferences); useEffect(() => setPreferences(savedPreferences), [savedPreferences]);
  const [tab, setTab] = useState("All"); const [preferencesOpen, setPreferencesOpen] = useState(false);
  const unread = notifications.filter((item) => !item.read).length;
  const filtered = notifications.filter((item) => tab === "All" || tab === "Unread" && !item.read || item.category === tab);
  const setPreference = (key, value) => setPreferences({ ...preferences, [key]: value });
  const preferenceFields = REFERENCE.notificationPreferenceFields;
  const categories = REFERENCE.notificationCategories;
  const preferenceBody = <div className={styles.stack}><div>{preferenceFields.map((item) => <div className={styles.section} key={item.key}><Switch label={item.label} description={item.description} checked={preferences[item.key]} onChange={(value) => setPreference(item.key, value)} /></div>)}</div><div><div className={styles.title}>Notification categories</div>{categories.map((item) => <div className={styles.section} key={item.key}><Switch label={item.label} description={item.description} checked={preferences[item.key]} onChange={(value) => setPreference(item.key, value)} /></div>)}</div><div className={styles.form}><Switch label="Quiet hours" description="Pause non-critical updates during selected hours." checked={preferences.quiet} onChange={(value) => setPreference("quiet", value)} />{preferences.quiet && <><Field label="Time zone"><Select options={["Asia/Kolkata", "UTC", "Europe/London", "America/New_York"]} value={preferences.timezone} onChange={(event) => setPreference("timezone", event.target.value)} /></Field><div className={styles.formGrid}><Field label="From"><Input type="time" value={preferences.from} onChange={(event) => setPreference("from", event.target.value)} /></Field><Field label="To"><Input type="time" value={preferences.to} onChange={(event) => setPreference("to", event.target.value)} /></Field></div></>}<Notice>Enabled critical incident alerts bypass quiet hours.</Notice><Button icon={Save} onClick={() => run("settings.save", { section: "notificationPreferences", values: preferences }, "Notification preferences saved.")}>Save preferences</Button></div></div>;
  return <><PageHeader title="Notification center" description="Follow alerts, approvals and workspace updates." actions={<><Button icon={CheckCheck} disabled={!unread} onClick={() => { run("notification.readAll", {}, "All notifications marked as read."); }}>Mark all as read</Button><Button icon={Settings2} onClick={() => setPreferencesOpen(true)}>Preferences</Button></>} />
    <div className={styles.wideSplit}><div className={styles.stack}><Tabs items={[{ value: "All", label: "All" }, { value: "Unread", label: `Unread ${unread}` }, { value: "Alerts", label: "Alerts" }, { value: "Approvals", label: "Approvals" }, { value: "System", label: "System" }]} value={tab} onChange={setTab} /><Panel title="Today"><div className={styles.notifications}>{filtered.length ? filtered.map((item) => { const Icon = item.tone === "warning" ? AlertTriangle : item.tone === "success" ? Check : item.category === "Approvals" ? Layers3 : MessageSquare; return <article key={item.id} className={`${styles.notification} ${!item.read ? styles.unread : ""}`}>{!item.read && <span className={styles.unreadDot} aria-label="Unread" />}<div className={`${styles.notificationIcon} ${styles[item.tone] || ""}`}><Icon size={23} /></div><div className={styles.notificationContent}><strong>{item.title}</strong><p>{item.description}</p><div className={styles.notificationMeta}><Badge tone={item.tone}>{item.type}</Badge><span>{item.source} · {item.time}</span></div></div><div className={styles.noticeActions}><Button href={item.href} variant="primary" onClick={() => run("notification.read", { id: item.id, read: true })}>{item.action}</Button><button className={styles.linkButton} onClick={() => run("notification.read", { id: item.id, read: !item.read })}>{item.read ? "Mark unread" : "Mark read"}</button><button className={styles.linkButton} onClick={() => run("notification.delete", { id: item.id }, "Notification deleted.")} aria-label={`Delete ${item.title}`}><Trash2 size={13} /></button></div></article>; }) : <Empty title="You're all caught up" description="No notifications match this filter." icon={Bell} />}</div></Panel></div><Panel title="Delivery preferences" description="Choose how to receive notifications.">{preferenceBody}</Panel></div>
    <Modal open={preferencesOpen} onClose={() => setPreferencesOpen(false)} title="Notification preferences">{preferenceBody}<div className={styles.modalFooter}><Button onClick={() => setPreferencesOpen(false)}>Done</Button></div></Modal>
  </>;
}


export function AccountPreferencesPage() {
  const { notify, account, staffAccount, signOut } = useAdmin(); const router = useRouter(); const run = useCommandAction();
  const [saved] = useLocalState("olentra-admin-account-v1", ACCOUNT_DEFAULTS); const [form, setForm] = useState(saved); useEffect(() => setForm(saved), [saved]);
  useEffect(() => { document.documentElement.dataset.adminReducedMotion = String(form.reduceMotion); }, [form.reduceMotion]);
  const [passwordOpen, setPasswordOpen] = useState(false), [password, setPassword] = useState({ current: "", next: "", confirm: "" }), [passwordError, setPasswordError] = useState(""), [passwordBusy, setPasswordBusy] = useState(false);
  const name = staffAccount?.name || account?.name || "", email = staffAccount?.email || account?.email || "";
  const set = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const save = (event) => { event?.preventDefault(); run("settings.save", { section: "account", values: { ...form, name: saved.name, email: saved.email, role: saved.role } }, "Account preferences saved."); };
  const changePassword = async () => {
    if (!password.current || password.next.length < 12) { setPasswordError("Enter your current password and a new password of at least 12 characters."); return; }
    if (password.next !== password.confirm) { setPasswordError("The new password and confirmation do not match."); return; }
    setPasswordBusy(true); setPasswordError("");
    try {
      await changeWorkspacePassword(password.current, password.next);
      setPassword({ current: "", next: "", confirm: "" }); setPasswordOpen(false);
      await signOut(); router.replace("/dashboard/login?notice=password-changed");
    } catch (reason) { setPasswordError(reason.message); }
    finally { setPasswordBusy(false); }
  };
  return <><PageHeader title="Account preferences" description="Your staff account, workspace preferences and password." actions={<Button variant="primary" icon={Save} onClick={save}>Save changes</Button>} />
    <div className={styles.equal}><div className={styles.stack}><Panel title="Your profile" description="Managed in Internship dashboard → Staff & roles."><div className={styles.accountCard}><span className={styles.accountAvatar}>{name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "?"}</span><div><strong>{name}</strong><small>{email}</small><div className={styles.rolePills}><Badge tone="blue">{account?.role || "—"}</Badge>{staffAccount?.staffRole && <Badge tone="muted">Staff role: {staffAccount.staffRole}</Badge>}</div></div></div><form className={styles.form} onSubmit={save}><Field label="Display name"><Input value={name} disabled /></Field><Field label="Email address"><Input type="email" value={email} disabled /></Field><Field label="Job title"><Input value={form.jobTitle || ""} onChange={(event) => set("jobTitle", event.target.value)} /></Field><Field label="Workspace access" hint="Granted by your staff role."><Input value={account?.role || ""} disabled /></Field><button type="submit" className={styles.hidden}>Save account</button></form></Panel>
      <Panel title="Workspace preferences"><div className={styles.form}><Field label="Time zone"><Select options={["Asia/Kolkata", "UTC", "Europe/London", "America/New_York"]} value={form.timezone} onChange={(event) => set("timezone", event.target.value)} /></Field><Field label="Language"><Select options={["English", "French", "Spanish", "German", "Hindi"]} value={form.language} onChange={(event) => set("language", event.target.value)} /></Field><Field label="Date format"><Select options={["DD MMM YYYY", "DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]} value={form.dateFormat} onChange={(event) => set("dateFormat", event.target.value)} /></Field></div></Panel></div>
      <div className={styles.stack}><Panel title="Password and sign-in" description="Your password protects both the company workspace and the internship dashboard."><KeyValue label="Signed in as">{email}</KeyValue><KeyValue label="Password">At least 12 characters · changing it signs out every session</KeyValue><div className={styles.footerActions}><Button icon={KeyRound} onClick={() => { setPasswordError(""); setPasswordOpen(true); }}>Change password</Button><Button href="/dashboard/settings/security" icon={ShieldCheck}>Security settings</Button></div></Panel>
        <Panel title="Personal notifications"><div className={styles.section}><Switch label="Email updates" description="Updates relevant to your workspace role." checked={form.emailUpdates} onChange={(value) => set("emailUpdates", value)} /></div><div className={styles.section}><Switch label="Approval digest" description="A summary of changes waiting for your review." checked={form.approvalDigest} onChange={(value) => set("approvalDigest", value)} /></div><Button href="/dashboard/notifications" variant="ghost" icon={Bell}>All notification preferences</Button></Panel>
        <Panel title="Accessibility"><Switch label="Reduce motion" description="Prefer simpler motion within the dashboard." checked={form.reduceMotion} onChange={(value) => { set("reduceMotion", value); document.documentElement.dataset.adminReducedMotion = String(value); }} /></Panel>
      </div>
    </div>
    <Modal open={passwordOpen} onClose={() => { setPasswordOpen(false); setPassword({ current: "", next: "", confirm: "" }); }} title="Change your password"><div className={styles.form}><Notice icon={LockKeyhole}>You will be signed out of every device, including this one, and sign in again with the new password.</Notice>{passwordError && <p role="alert" className="workspace-auth-error">{passwordError}</p>}<Field label="Current password"><Input type="password" value={password.current} onChange={(event) => setPassword({ ...password, current: event.target.value })} autoComplete="current-password" /></Field><Field label="New password" hint="Use at least 12 characters."><Input type="password" value={password.next} onChange={(event) => setPassword({ ...password, next: event.target.value })} autoComplete="new-password" /></Field><Field label="Confirm new password"><Input type="password" value={password.confirm} onChange={(event) => setPassword({ ...password, confirm: event.target.value })} autoComplete="new-password" /></Field><div className={styles.modalFooter}><Button onClick={() => setPasswordOpen(false)}>Cancel</Button><Button variant="primary" disabled={passwordBusy} onClick={changePassword}>{passwordBusy ? "Changing…" : "Change password"}</Button></div></div></Modal>
  </>;
}
