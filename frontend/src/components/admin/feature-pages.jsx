"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Box, Check, ClipboardCheck, ExternalLink, Eye, FileText, Globe2, GraduationCap, GripVertical, History, Info, Layers, Link2, MapPin, Monitor, Plus, Sparkles, Trash2, TriangleAlert, Users, Wrench } from "lucide-react";
import { Badge, Button, Field, Input, LineChart, MiniMap, Modal, PageHeader, Panel, Select, Switch, Tabs, useLocalState } from "./ui";
import { MetricCards } from "./overview-page";
import { useAdmin } from "./store";
import { CompanyLogo } from "./company-logo";
import { selectMonitoring } from "@/lib/admin/selectors.mjs";
import { effectiveSiteFeatures, isFeatureHrefVisible } from "@/lib/site-feature-rules.mjs";
import coreData from "@/data/admin/core.json";
import contentData from "@/data/admin/content.json";
import styles from "./core.module.css";

const clone = value => structuredClone(value);
const icons = { services: GraduationCap, products: Box, internships: GraduationCap, blog: FileText, assistant: Sparkles, maintenance: Wrench, applications: ClipboardCheck, portal: Users };
const safeDestination = value => /^(\/(?!\/)|#|https?:\/\/)/.test(value || "");
const own = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);
const labelFor = (features, key) => features.find(item => item.id === key)?.label || key;
const dateLabel = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " UTC" : "";
const dependencyId = value => ({ "Internship public page": "internships", Services: "services", Products: "products" })[value] || value || "None";
function scopedMonitoring(db, scope) {
  if (scope === "Global") return selectMonitoring(db);
  return selectMonitoring({ ...db, datasets: { ...db.datasets, "admin-performance-probes": (db.datasets["admin-performance-probes"] || []).filter(row => row.region === scope), "admin-incidents": (db.datasets["admin-incidents"] || []).filter(row => row.region === scope || row.region === "Global") } });
}
function availableNavigation(rows, flags, region) {
  return (rows || []).filter(item => item.visible && isFeatureHrefVisible(item.href, flags) && (!item.region || item.region === "Global" || region === "Global" || item.region === region) && (dependencyId(item.dependency) === "None" || Boolean(flags[dependencyId(item.dependency)])));
}
function commandResult(command, notify, type, payload, message) {
  const result = command(type, payload);
  if (!result.ok) notify(result.error);
  else if (message) notify(message);
  return result;
}
function useImmediateFeatureActions() {
  const { updateFeature, featureSaving = false, featureError = "", features, environment } = useAdmin();
  const [pending, setPending] = useState(false);
  const pendingRequest = useRef(false);
  const [error, setError] = useState("");
  useEffect(() => { setError(""); }, [features, environment]);
  async function setVisibility(key, value) {
    if (pendingRequest.current || featureSaving) return;
    pendingRequest.current = true;
    setPending(true);
    setError("");
    try {
      const result = await updateFeature(key, value);
      if (!result?.ok) setError(result?.error || "The website setting could not be saved. Please try again.");
    } catch (failure) {
      setError(failure?.message || "The website setting could not be saved. Please try again.");
    } finally { pendingRequest.current = false; setPending(false); }
  }
  return { setVisibility, saving: pending || featureSaving, error: error || featureError };
}
function FeatureSyncStatus({ saving, error }) {
  if (!saving && !error) return null;
  return <div className="ad-stack" aria-live="polite">{saving && <div className="ad-note" role="status">Saving website setting…</div>}{error && <div className="ad-note" role="alert">{error}</div>}</div>;
}
function environmentMessage(environment) {
  return environment === "Production" ? "Switches update the actual public website immediately." : "Staging switches affect this preview only. Production controls the public website.";
}
function NavigationPreview({ draftNavigation, allowNavigationDraft = false }) {
  const { db, scope, environment, features } = useAdmin();
  const reference = db.reference?.core || coreData.reference;
  const [mode, setMode] = useState("draft");
  const [region, setRegion] = useState(allowNavigationDraft ? scope : "Global");
  useEffect(() => { setRegion(allowNavigationDraft ? scope : "Global"); }, [scope, allowNavigationDraft]);
  const isDraftNavigation = allowNavigationDraft && mode === "draft";
  const flags = effectiveSiteFeatures(features);
  const navigation = isDraftNavigation ? draftNavigation || db.datasets.navigation || coreData.datasets.navigation : db.datasets["navigation-published"] || coreData.datasets["navigation-published"];
  const header = availableNavigation(navigation["Header navigation"], flags, region);
  const sections = availableNavigation(navigation["Homepage sections"], flags, region);
  const footer = availableNavigation(navigation.Footer, flags, region);
  const heroVisible = sections.some(item => item.href?.split("#")[1]?.toLowerCase() === "hero");
  const home = db.datasets["olentra-admin-published-page-homepage"] || contentData.datasets["olentra-admin-page-homepage"];
  const link = (item, index) => safeDestination(item.href) ? <a key={item.label + index} href={item.href} target={item.newTab ? "_blank" : undefined} rel={item.newTab ? "noreferrer" : undefined}>{item.label}</a> : <span key={item.label + index} title="Enter a valid destination before publishing.">{item.label}</span>;
  return <div className="ad-stack">
    {allowNavigationDraft ? <div className="ad-between" style={{ flexWrap: "wrap" }}><Tabs items={[{ value: "draft", label: "Navigation draft" }, { value: "published", label: "Published navigation" }]} value={mode} onChange={setMode} /><Select aria-label="Visitor navigation region" options={["Global", ...reference.regions]} value={region} onChange={event => setRegion(event.target.value)} style={{ maxWidth: 190 }} /></div> : <Badge tone={environment === "Production" ? "success" : "blue"}>{environment === "Production" ? "Live website settings" : "Staging preview only"} · Global</Badge>}
    <p className="ad-small ad-muted">{environmentMessage(environment)}{allowNavigationDraft && " Feature switches are live in both navigation views."}</p>
    <div className="ad-preview"><div className="ad-preview-header"><div className={styles.previewBrand}><CompanyLogo className="ad-preview-company-logo" /></div><div className={styles.previewLinks}>{!flags.maintenance && header.map(link)}</div></div>
      {(flags.maintenance || heroVisible) && <div className={styles.previewHero}>{flags.maintenance ? <><h3>Website maintenance</h3><p>Public content is temporarily unavailable while maintenance mode is active.</p></> : <><h3>{home.title}</h3><p>{home.description}</p>{home.button && safeDestination(home.destination) && isFeatureHrefVisible(home.destination, flags) && <a href={home.destination}><span>{home.button} →</span></a>}{flags.internships && <p>Internship opportunities · {flags.applications ? "Applications open" : "Applications closed"}</p>}</>}</div>}
      {!flags.maintenance && <div style={{ padding: 16 }}><p className="ad-small ad-muted">Visible homepage sections</p><div className="ad-row" style={{ flexWrap: "wrap", margin: "10px 0 15px" }}>{sections.map((item, index) => <Badge key={item.label + index} tone="blue">{item.label}</Badge>)}{!sections.length && <span className="ad-small ad-muted">No sections are visible.</span>}</div><div className={styles.previewLinks}>{footer.map(link)}</div></div>}
    </div><div className="ad-row" style={{ flexWrap: "wrap" }}><Badge tone={flags.portal ? "success" : "muted"}>Existing intern portal: {flags.portal ? "Available" : "Paused"}</Badge><Badge tone="muted">Application records are preserved</Badge></div>
  </div>;
}

export function WebsiteControlsPage() {
  const { db, features, scope, environment } = useAdmin();
  const { setVisibility, saving, error } = useImmediateFeatureActions();
  const [preview, setPreview] = useState(false);
  const catalog = db.reference?.core?.features || coreData.reference.features;
  const visibleFeatures = effectiveSiteFeatures(features);
  const rows = catalog.filter(row => !["applications", "portal"].includes(row.id));
  const monitoring = scopedMonitoring(db, scope);
  const probes = [...monitoring.probes].filter(row => row.serviceId === "website").sort((a, b) => Date.parse(a.at) - Date.parse(b.at)).slice(-12);
  const activity = (db.datasets["olentra-admin-governance-audit-v1"] || []).slice(0, 3);
  const actions = <><Button onClick={() => setPreview(true)} icon={Eye}>Preview website</Button><Button href="/" target="_blank" rel="noreferrer" variant="primary" icon={ExternalLink}>Open public website</Button></>;
  return <div className={"ad-stack " + styles.featurePage}>
    <PageHeader title="Website control center" description={environmentMessage(environment)} actions={<div className={"ad-actions " + styles.desktopActions}>{actions}</div>} /><FeatureSyncStatus saving={saving} error={error} /><div className={styles.controlStats}><MetricCards /></div>
    <div className={styles.controlsGrid}><Panel title="Feature visibility" description="Each switch is saved immediately and applies globally." actions={<Button href="/dashboard/website-controls/navigation" variant="ghost">Navigation & sections</Button>}><div className={styles.featureHead}><span>Feature</span><span>Public visibility</span><span>Scope</span></div>{rows.map(row => { const Icon = icons[row.id] || Layers; return <div key={row.id} className={styles.featureRow + (row.id === "internships" ? " " + styles.selected : "")}><div className={styles.featureName}><Icon size={21} /><div><Link href={"/dashboard/website-controls/features/" + row.id}>{row.label}</Link>{row.id === "assistant" && <p className="ad-small ad-muted" style={{ marginTop: 4 }}>Add an assistant integration to enable this feature.</p>}</div></div><div className={styles.featureStatus}><Switch aria-label={row.label + " visibility"} checked={row.id === "assistant" ? false : features[row.id]} disabled={saving || row.id === "assistant"} onChange={value => setVisibility(row.id, value)} /><span>{row.id === "assistant" ? "Not configured" : row.id === "maintenance" ? features.maintenance ? "On" : "Off" : visibleFeatures[row.id] ? "Visible" : features[row.id] && features.maintenance ? "Paused by maintenance" : "Hidden"}</span></div><span>Global</span></div>; })}<div className={styles.featureFooter}><Button href="/dashboard/audit" icon={History}>View history</Button></div></Panel>
      <Panel title="Internship settings" actions={<Badge>{visibleFeatures.internships ? "Visible" : "Hidden"}</Badge>}><div className={styles.internSettings}><Switch label="Public page visibility" description={visibleFeatures.internships ? "Shown on public pages" : features.internships && features.maintenance ? "Paused during maintenance" : "Hidden from navigation and public pages"} checked={features.internships} disabled={saving} onChange={value => setVisibility("internships", value)} /><Switch label={labelFor(catalog, "applications")} description={features.internships && features.applications && !features.maintenance ? "New submissions open" : "New submissions closed"} checked={features.applications} disabled={saving} onChange={value => setVisibility("applications", value)} /><Switch label={labelFor(catalog, "portal")} description={features.portal ? "Current interns keep access" : "Portal access is paused"} checked={features.portal} disabled={saving} onChange={value => setVisibility("portal", value)} /><div className={styles.internMeta}><div><Link2 size={19} /><span>Public page: <b>{visibleFeatures.internships ? "Available" : "Not available"}</b></span></div><div><MapPin size={19} /><span>Scope</span><Badge>Global</Badge></div><div><Info size={19} /><span>Existing applications are preserved.</span></div><Button variant="ghost" icon={Eye} onClick={() => setPreview(true)}>Preview visitor experience</Button></div></div></Panel></div>
    <div className={styles.bottomGrid}><Panel title="Global monitoring"><div className={styles.monitorMap}><MiniMap /><div>{monitoring.regionalRows.map(row => { const Icon = row.status === "Operational" ? Check : TriangleAlert; return <div className={styles.regionStatus} key={row.name}><Icon style={row.status === "Operational" ? undefined : { color: "#fbbf24", background: "#49351a" }} /><div><strong>{row.name}</strong><small>{row.status}</small></div></div>; })}</div></div></Panel><Panel title="Performance" description="Regional website response time (ms).">{probes.length ? <LineChart values={probes.map(row => row.responseMs)} labels={[]} height={95} /> : <p className="ad-small ad-muted">No measurements for this scope.</p>}<div className={styles.performance}><div><p>LCP · p75</p><strong>{monitoring.probes.length ? (monitoring.lcpMs / 1000).toFixed(2) + " s" : "—"}</strong></div><div><p>INP · p75</p><strong>{monitoring.probes.length ? Math.round(monitoring.inpMs) + " ms" : "—"}</strong></div><div><p>CLS · p75</p><strong>{monitoring.probes.length ? monitoring.cls.toFixed(3) : "—"}</strong></div></div></Panel><Panel title="Recent activity">{activity.map(event => <div className={styles.activity} key={event.id}><FileText size={20} /><div><strong>{event.action}</strong><p>{event.resource} · {event.actor}</p><p>{event.date || dateLabel(event.at)}</p></div></div>)}{!activity.length && <p className="ad-small ad-muted">No workspace changes yet.</p>}<Button href="/dashboard/audit" variant="ghost" icon={FileText}>View audit log</Button></Panel></div>
    <div className={styles.mobileActions}>{actions}</div><Modal open={preview} onClose={() => setPreview(false)} title="Visitor experience preview"><NavigationPreview /></Modal>
  </div>;
}

function featureHistory(db, history, featureId, environment) {
  const allAudit = db.datasets["olentra-admin-governance-audit-v1"] || [];
  const catalog = db.reference?.core?.features || coreData.reference.features;
  const ids = new Set(catalog.map(row => row.id));
  const envFor = event => event.environment || event.details?.environment || event.after?.environment || event.before?.environment || (["Production", "Staging"].includes(event.resource) ? event.resource : undefined);
  const relates = event => {
    const target = event.feature || event.featureId || (ids.has(event.resource) ? event.resource : undefined) || (ids.has(event.details?.resource) ? event.details.resource : undefined);
    if (target) return target === featureId;
    const after = event.after || event.details?.after, before = event.before || event.details?.before;
    return own(after, featureId) && (!own(before, featureId) || before[featureId] !== after[featureId]);
  };
  const audit = allAudit.filter(event => envFor(event) === environment && relates(event));
  const publications = history.filter(event => {
    if (envFor(event) !== environment) return false;
    const source = allAudit.find(row => envFor(row) === environment && row.at === event.at && (row.action === event.action || event.values && JSON.stringify(row.after || row.details?.after) === JSON.stringify(event.values)));
    const belongs = relates(event) || (source && relates(source));
    return belongs && !audit.some(row => row.id === source?.id || row.at === event.at && row.action === event.action);
  });
  return [...audit, ...publications].sort((a, b) => Date.parse(b.at || b.createdAt || b.date) - Date.parse(a.at || a.createdAt || a.date));
}

export function FeatureConfigurationPage({ featureId }) {
  const { db, features, environment, history } = useAdmin();
  const { setVisibility, saving, error } = useImmediateFeatureActions();
  const [preview, setPreview] = useState(false);
  const reference = db.reference?.core || coreData.reference;
  const feature = reference.features.find(row => row.id === featureId);
  const events = featureHistory(db, history, featureId, environment);
  if (!feature) return <div className="ad-stack"><PageHeader title="Feature not found" description="This feature is not configured in your workspace." /><Button href="/dashboard/website-controls">Back to website controls</Button></div>;
  const internship = featureId === "internships";
  const controlIds = internship ? [featureId, "applications", "portal"] : [featureId];
  const visibleFeatures = effectiveSiteFeatures(features);
  const notConfigured = featureId === "assistant";
  const navigation = db.datasets["navigation-published"] || coreData.datasets["navigation-published"];
  const featureTargets = { services: "/services", products: "/products", internships: "/careers/intern", blog: "/blogs" };
  const publicTarget = featureTargets[featureId] || Object.values(navigation).flat().find(row => dependencyId(row.dependency) === featureId && row.href?.startsWith("/") && !row.href.includes("#"))?.href;
  return <div className="ad-stack">
    <PageHeader eyebrow={"Website Controls / " + environment} title={feature.label + " controls"} description={notConfigured ? "Add an assistant integration to enable this feature." : environmentMessage(environment)} actions={<><Button icon={Eye} onClick={() => setPreview(true)}>Preview website</Button><Button href={publicTarget || "/"} target="_blank" rel="noreferrer" variant="primary" icon={ExternalLink}>Open public website</Button></>} />
    <FeatureSyncStatus saving={saving} error={error} />
    <div className="ad-row" style={{ flexWrap: "wrap" }}><Badge tone={environment === "Production" ? "success" : "blue"}>{environment === "Production" ? "Live production controls" : "Staging preview only"}</Badge><Badge>Global scope</Badge></div>
    <div className={styles.detailTop}>{controlIds.map(id => { const Icon = icons[id] || Eye; return <Panel key={id}><div className={styles.detailFeature}><Icon size={28} /><div><h3>{id === "maintenance" ? feature.label : id === featureId && !["applications", "portal"].includes(id) ? "Public visibility" : labelFor(reference.features, id)}</h3><p>{notConfigured ? "Not configured" : id === "portal" ? features[id] ? "Current interns retain access" : "Existing portal access is paused" : features[id] ? "Enabled" : "Disabled"}</p></div><Switch aria-label={labelFor(reference.features, id)} checked={notConfigured ? false : features[id]} disabled={saving || notConfigured} onChange={value => setVisibility(id, value)} /></div></Panel>; })}</div>
    <div className={styles.detailGrid}>
      <Panel title="Current state" description="Switch changes are saved immediately."><div className="ad-list"><div className="ad-list-row"><div><strong>{feature.label}</strong><p className="ad-small ad-muted">{environment} · Global</p></div><Badge tone={!notConfigured && features[featureId] ? "success" : "muted"}>{notConfigured ? "Not configured" : features[featureId] ? "Enabled" : "Disabled"}</Badge></div>{controlIds.filter(id => id !== featureId).map(id => <div className="ad-list-row" key={id}><strong>{labelFor(reference.features, id)}</strong><Badge tone={features[id] ? "success" : "muted"}>{features[id] ? "Enabled" : "Disabled"}</Badge></div>)}</div><div className="ad-note" style={{ marginTop: 16 }}>{environment === "Production" ? "The saved switches control the public website directly." : "These settings change the Staging preview. Switch to Production to control the public website."}</div></Panel>
      <Panel title="Impact summary"><div className={styles.impact}><Layers size={23} /><div><strong>Navigation and homepage</strong><p>{notConfigured ? "No assistant integration is configured on the website." : featureId === "maintenance" ? features.maintenance ? "Maintenance is active; public website content is unavailable." : "Maintenance is off; public website content is available." : features[featureId] ? "The enabled feature can appear in its configured website locations." : "The feature is hidden from its website locations."}</p></div></div>{publicTarget && <div className={styles.impact}><Link2 size={23} /><div><strong>Public page</strong><p>{publicTarget} · {visibleFeatures[featureId] ? "Available" : "Not available"}</p></div></div>}<div className={styles.impact}><Globe2 size={23} /><div><strong>Scope</strong><p>Global · {environment}</p></div></div>{internship && <><div className={styles.impact}><Plus size={23} /><div><strong>New applications</strong><p>{visibleFeatures.applications ? "Open" : "Closed"}</p></div></div><div className={styles.impact}><Users size={23} /><div><strong>Existing intern portal</strong><p>{features.portal ? "Available" : "Paused"}</p></div></div><div className={styles.impact}><FileText size={23} /><div><strong>Application records</strong><p>Preserved</p></div></div></>}</Panel>
    </div>
    <Panel title="Change history" description={"Saved changes for " + feature.label + " · " + environment + "."} actions={<Button href="/dashboard/audit" variant="ghost" icon={History}>Open audit history</Button>}><div className="ad-stack">{events.map(event => <div className="ad-list-row" key={event.id}><History size={18} /><div><strong>{event.action}</strong><p className="ad-small ad-muted">{event.actor} · {dateLabel(event.at || event.createdAt || event.date)}</p></div><Badge>{environment}</Badge></div>)}{!events.length && <p className="ad-small ad-muted">No saved changes for this feature in {environment}.</p>}</div></Panel>
    <Modal open={preview} onClose={() => setPreview(false)} title="Visitor experience preview"><NavigationPreview /></Modal>
  </div>;
}

export function NavigationSectionsPage() {
  const { db, notify, command } = useAdmin();
  const reference = db.reference?.core || coreData.reference;
  const [storedData, saveStoredData] = useLocalState("navigation", coreData.datasets.navigation);
  const [data, setData] = useState(() => clone(storedData));
  const [tab, setTab] = useState(Object.keys(coreData.datasets.navigation)[0]), [selected, setSelected] = useState(0), [add, setAdd] = useState(false), [newLabel, setNewLabel] = useState(""), [newUrl, setNewUrl] = useState(""), [dragged, setDragged] = useState(null), [review, setReview] = useState(false), [error, setError] = useState("");
  useEffect(() => { setData(clone(storedData)); }, [storedData]);
  const rows = data[tab] || [], index = selected < rows.length ? selected : -1, row = rows[index];
  const published = db.datasets["navigation-published"] || coreData.datasets["navigation-published"];
  const dirty = JSON.stringify(data) !== JSON.stringify(storedData), unpublished = JSON.stringify(data) !== JSON.stringify(published);
  const dependencies = [{ value: "None", label: "None" }, ...reference.features.map(feature => ({ value: feature.id, label: feature.id === "internships" ? "Internship public page" : feature.label }))];
  const update = (at, patch) => { setData(current => ({ ...current, [tab]: current[tab].map((item, position) => position === at ? { ...item, ...patch } : item) })); setError(""); };
  function move(from, to) { if (!Number.isInteger(from) || from < 0 || from >= rows.length || to < 0 || to >= rows.length) return; setData(current => { const next = [...current[tab]], item = next.splice(from, 1)[0]; next.splice(to, 0, item); return { ...current, [tab]: next }; }); setSelected(to); }
  function validate() { for (const list of Object.values(data)) for (const item of list) if (!item.label?.trim() || !safeDestination(item.href)) return "Every link needs a label and a safe relative, anchor, or HTTP(S) destination."; return ""; }
  function saveDraft() { const invalid = validate(); if (invalid) { setError(invalid); return notify(invalid); } const result = saveStoredData(clone(data)); if (result.ok) notify("Navigation draft saved. Published navigation is unchanged."); else { setError(result.error); notify(result.error); } }
  function publish() { const result = commandResult(command, notify, "navigation.publish", { values: data }, "Navigation published."); if (result.ok) { setReview(false); setError(""); } else setError(result.error); }
  function addLink(event) { event.preventDefault(); if (!newLabel.trim() || !safeDestination(newUrl.trim())) { setError("Enter a label and valid destination."); return; } setData(current => ({ ...current, [tab]: [...current[tab], { label: newLabel.trim(), href: newUrl.trim(), visible: true, dependency: "None", region: "Global", newTab: false }] })); setSelected(rows.length); setNewLabel(""); setNewUrl(""); setAdd(false); setError(""); }
  return <div className="ad-stack"><PageHeader title="Navigation & sections" description="Configure navigation and page sections across your website." actions={<>{(dirty || unpublished) && <Badge tone="warning">{dirty ? "Unsaved changes" : "Unpublished draft"}</Badge>}<Button disabled={!dirty} onClick={saveDraft}>Save draft</Button><Button variant="primary" disabled={!unpublished} onClick={() => setReview(true)}>Review & publish</Button></>} /><Tabs items={Object.keys(data)} value={tab} onChange={value => { setTab(value); setSelected(0); }} />{error && <div className="ad-note" role="alert">{error}</div>}
    <div className={styles.navGrid}><Panel title={tab} description="Configure links and sections shown to your visitors." actions={<Button variant="primary" icon={Plus} onClick={() => setAdd(true)}>Add {tab === "Homepage sections" ? "section" : "link"}</Button>}><div className="ad-note" style={{ marginBottom: 14 }}>Hidden links and links with disabled dependencies are omitted from visitor navigation.</div><div className={styles.navRow} style={{ background: "var(--ad-panel-soft)", borderRadius: 5 }}><span /><span>#</span><b>Navigation label</b><b>Visible</b><b className={styles.navUrl}>Target URL</b><span /></div>{rows.map((item, at) => <div className={styles.navRow} key={at} data-selected={at === index} draggable onDragStart={() => setDragged(at)} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); move(dragged, at); setDragged(null); }}><GripVertical className={styles.navHandle} size={17} /><span>{at + 1}</span><button type="button" className="ad-button ad-button-ghost" style={{ justifyContent: "flex-start", color: "var(--ad-text)" }} onClick={() => setSelected(at)}>{item.label}</button><Switch aria-label={item.label + " navigation visibility"} checked={item.visible} onChange={value => update(at, { visible: value })} /><Input className={styles.navUrl} aria-label={item.label + " target URL"} value={item.href} onChange={event => update(at, { href: event.target.value })} /><div className="ad-row" style={{ gap: 0 }}><button type="button" className="ad-icon-button" aria-label={"Move " + item.label + " up"} disabled={at === 0} onClick={() => move(at, at - 1)}><ArrowUp size={13} /></button><button type="button" className="ad-icon-button" aria-label={"Move " + item.label + " down"} disabled={at === rows.length - 1} onClick={() => move(at, at + 1)}><ArrowDown size={13} /></button></div></div>)}{!rows.length && <p className="ad-small ad-muted">No links in this section. Add one to get started.</p>}</Panel>
      <div className="ad-stack"><Panel title="Navigation link details">{row ? <div className="ad-stack"><div className="ad-form-grid"><Field label="Label *"><Input value={row.label} onChange={event => update(index, { label: event.target.value })} /></Field><Field label="Destination URL *"><Input value={row.href} onChange={event => update(index, { href: event.target.value })} /></Field><Field label="Menu visibility"><Select options={["Visible", "Hidden"]} value={row.visible ? "Visible" : "Hidden"} onChange={event => update(index, { visible: event.target.value === "Visible" })} /></Field><Field label="Region"><Select options={["Global", ...reference.regions]} value={row.region || "Global"} onChange={event => update(index, { region: event.target.value })} /></Field></div><label className="ad-row"><input type="checkbox" checked={Boolean(row.newTab)} onChange={event => update(index, { newTab: event.target.checked })} />Open in new tab</label><hr className="ad-divider" /><h3>Feature visibility dependency</h3><p className="ad-muted ad-small">The selected feature must be available in the visitor’s region for this link to appear.</p><Select aria-label="Feature dependency" options={dependencies} value={dependencyId(row.dependency)} onChange={event => update(index, { dependency: event.target.value })} /><div className="ad-actions"><Button variant="danger" icon={Trash2} onClick={() => { setData(current => ({ ...current, [tab]: current[tab].filter((_, at) => at !== index) })); setSelected(Math.max(0, index - 1)); }}>Remove from draft</Button></div></div> : <p className="ad-small ad-muted">Select a link to edit its details.</p>}</Panel><Panel title="Visitor preview"><NavigationPreview allowNavigationDraft draftNavigation={data} /></Panel></div></div>
    <Modal open={add} onClose={() => setAdd(false)} title={"Add " + (tab === "Homepage sections" ? "section" : "navigation link")}><form className="ad-stack" onSubmit={addLink}><Field label="Label"><Input required value={newLabel} onChange={event => setNewLabel(event.target.value)} /></Field><Field label="Destination"><Input required placeholder="/your-page" value={newUrl} onChange={event => setNewUrl(event.target.value)} /></Field>{error && <p role="alert">{error}</p>}<Button type="submit" variant="primary">Add to draft</Button></form></Modal>
    <Modal open={review} onClose={() => setReview(false)} title="Review navigation changes"><div className="ad-stack"><p className="ad-small ad-muted">Publish the current navigation and section configuration. Feature dependencies and regional rules continue to control visitor visibility.</p>{Object.keys(data).map(section => <div className={styles.changes} key={section}><strong>{section}</strong><Badge tone={JSON.stringify(data[section]) === JSON.stringify(published[section]) ? "muted" : "blue"}>{data[section].length} entries · {JSON.stringify(data[section]) === JSON.stringify(published[section]) ? "Unchanged" : "Changed"}</Badge></div>)}{error && <div className="ad-note" role="alert">{error}</div>}<div className="ad-actions"><Button onClick={() => setReview(false)}>Keep editing</Button><Button variant="primary" disabled={!unpublished} onClick={publish}>Publish navigation</Button></div></div></Modal>
  </div>;
}
