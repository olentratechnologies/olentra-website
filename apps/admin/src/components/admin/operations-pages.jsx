"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity, ArrowRight, ArrowUpRight, CheckCircle2,
  Clock3, Download, FileText, Globe2, Info,
  Link2, ListFilter, Mail, Plus, RefreshCw, Search, ShieldCheck, Trash2,
  TriangleAlert, Users, Settings2, Languages,
} from "lucide-react";
import {
  PageHeader, Panel, Button, Badge, Field, Input, Select, Switch, Tabs,
  DataTable, SearchInput, Progress, Stat, Sparkline, MiniMap, Modal, useLocalState,
} from "@/components/admin/ui";
import { useAdmin } from "@/components/admin/store";
import styles from "./operations-pages.module.css";
import fixtures from "@/data/admin/operations.json";
import governanceFixtures from "@/data/admin/governance.json";
import { selectAnalytics, selectMonitoring } from "@/lib/admin/selectors.mjs";

const toneFor = (value = "") => /operational|enabled|good|resolved|published|complete/i.test(value) ? "success" : /degraded|review|warning|pending|missing|investigating/i.test(value) ? "warning" : /critical|error|failed/i.test(value) ? "danger" : "muted";
const textMatch = (row, query) => JSON.stringify(row).toLowerCase().includes(query.toLowerCase());
const formatNumber = (value) => Number(value).toLocaleString("en-US");

function downloadCsv(name, rows) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const quote = (value) => '"' + String(value ?? "").replaceAll('"', '""') + '"';
  const csv = [keys, ...rows.map((row) => keys.map((key) => row[key]))].map((row) => row.map(quote).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function Status({ value }) {
  return <Badge tone={toneFor(value)}>{value}</Badge>;
}

function Empty({ children = "No results match your filters." }) {
  return <div className={styles.empty}>{children}</div>;
}

function AudienceChart({ values, enquiryValues = [], labels }) {
  const width = 700;
  const maximum = Math.max(0, ...values, ...enquiryValues) * 1.12 || 1;
  const points = values.map((value, index) => [42 + index * 632 / Math.max(1, values.length - 1), 190 - value / maximum * 155]);
  const enquiryPoints = enquiryValues.map((value, index) => [42 + index * 632 / Math.max(1, enquiryValues.length - 1), 190 - value / maximum * 155]);
  return <svg viewBox={"0 0 " + width + " 235"} preserveAspectRatio="none" className={styles.audienceChart} role="img" aria-label="Visitors and enquiries across the selected period">
    {[0, 1, 2, 3, 4].map((index) => <g key={index}><line x1="42" x2="674" y1={35 + index * 39} y2={35 + index * 39} stroke="var(--ad-chart-grid)" /><text x="32" y={39 + index * 39} textAnchor="end" fill="var(--ad-subtle)" fontSize="10">{formatNumber(Math.round(maximum * (1 - index / 4)))}</text></g>)}
    <polygon points={"42,190 " + points.map((point) => point.join(",")).join(" ") + " 674,190"} fill="var(--ad-blue-soft)" />
    <polyline points={points.map((point) => point.join(",")).join(" ")} fill="none" stroke="var(--ad-blue)" strokeWidth="3" strokeLinejoin="round" />
    <polyline points={enquiryPoints.map((point) => point.join(",")).join(" ")} fill="none" stroke="var(--ad-subtle)" strokeWidth="2.5" strokeLinejoin="round" />
    {points.map(([x, y], index) => <circle key={index} cx={x} cy={y} r="3" fill="var(--ad-panel)" stroke="var(--ad-blue)" />)}
    {enquiryPoints.map(([x, y], index) => <circle key={index} cx={x} cy={y} r="2.5" fill="var(--ad-panel)" stroke="var(--ad-subtle)" />)}
    {labels.map((label, index) => <text key={label} x={42 + index * 632 / Math.max(1, labels.length - 1)} y="220" fill="var(--ad-muted)" fontSize="10" textAnchor="middle">{label}</text>)}
  </svg>;
}

const seoSeed = fixtures.datasets["admin-seo-pages"];
const reference = fixtures.reference;
const fieldValue = (value) => structuredClone(value);
const when = (value) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " UTC" : "Not yet";
function commit(command, notify, type, payload, message) {
  const result = command(type, payload);
  if (!result.ok) { notify(result.error || "The change could not be saved."); return null; }
  if (message) notify(message);
  return result;
}


export function AnalyticsPage() {
  const { notify, db, scope } = useAdmin();
  const [range, setRange] = useState("Last 30 days");
  const [comparison, setComparison] = useState("Previous period");
  const [source, setSource] = useState("All sources");
  const analytics = selectAnalytics(db, { range, source, region: scope });
  const { visitors: total, pageViews, enquiries, conversionRate, topPages, sources, regions, chart } = analytics;
  const days = range === "Last 7 days" ? 7 : range === "Last 90 days" ? 90 : 30;
  const baseline = new Date(db.meta.clock);
  if (comparison === "Previous year") baseline.setUTCFullYear(baseline.getUTCFullYear() - 1); else baseline.setUTCDate(baseline.getUTCDate() - days);
  const previous = selectAnalytics({ ...db, meta: { ...db.meta, clock: baseline.toISOString() } }, { range, source, region: scope });
  const difference = (value, before) => comparison === "No comparison" ? undefined : before ? ((value - before) / before >= 0 ? "+" : "") + ((value - before) / before * 100).toFixed(1) + "%" : value ? "New activity" : "No change";
  const organic = analytics.events.filter(event => event.source === "Organic search").length;
  const organicBefore = previous.events.filter(event => event.source === "Organic search").length;
  const seo = db.datasets["admin-seo-pages"] || seoSeed;
  const broken = db.datasets["admin-seo-broken"] || fixtures.datasets["admin-seo-broken"];
  let cursor = 0;
  const slices = regions.map((row, index) => { const start = cursor; cursor += row.percent; return ["var(--ad-chart-series-1)", "var(--ad-chart-series-2)", "var(--ad-chart-series-3)", "var(--ad-chart-series-4)"][index % 4] + " " + start + "% " + cursor + "%"; });
  return <div className="workspace-stack">
    <PageHeader title="Analytics & SEO" description="Understand traffic, engagement and enquiries." actions={<><Select aria-label="Analytics date range" options={["Last 7 days", "Last 30 days", "Last 90 days"]} value={range} onChange={(e) => setRange(e.target.value)} /><Select aria-label="Comparison period" options={["Previous period", "Previous year", "No comparison"]} value={comparison} onChange={(e) => setComparison(e.target.value)} /><Button icon={Download} onClick={() => { downloadCsv("olentra-analytics.csv", topPages); notify(topPages.length ? "Filtered analytics report downloaded." : "There is no activity in this period to export."); }}>Export</Button></>} />
    <div className="workspace-grid workspace-grid-4"><Stat label="Visitors" value={formatNumber(total)} icon={Users} change={difference(total, previous.visitors)} /><Stat label="Page views" value={formatNumber(pageViews)} icon={FileText} change={difference(pageViews, previous.pageViews)} /><Stat label="Enquiry conversion" value={Number(conversionRate).toFixed(1) + "%"} icon={Mail} change={comparison === "No comparison" ? undefined : (conversionRate - previous.conversionRate >= 0 ? "+" : "") + (conversionRate - previous.conversionRate).toFixed(2) + " pp"} /><Stat label="Organic visits" value={formatNumber(organic)} icon={Globe2} change={difference(organic, organicBefore)} /></div>
    <div className={styles.splitWide}>
      <Panel title="Visitors and enquiries" actions={<Select aria-label="Traffic source" options={["All sources", ...reference.sources]} value={source} onChange={(e) => setSource(e.target.value)} />}><div className={styles.chartLegend}><span><i className={styles.legendDot} />Visitors</span><span><i className={styles.legendDot} style={{ background: "var(--ad-subtle)" }} />Enquiries</span></div><div className={styles.chartArea}><AudienceChart values={chart.values} enquiryValues={chart.enquiryValues} labels={chart.labels} /></div><div className={styles.comparison}><span>{range} · {source}</span><span>{comparison === "No comparison" ? "Comparison hidden" : "Compared with " + comparison.toLowerCase()}</span></div></Panel>
      <Panel title="Traffic sources"><div className={styles.sources}>{sources.map((row) => <button className={styles.mutedButton} key={row.name} onClick={() => setSource(row.name)}><div className={styles.sourceRow}><div className={styles.sourceTitle}><span>{row.name}</span><strong>{row.percent.toFixed(1)}%</strong></div><Progress value={row.percent} /></div></button>)}</div>{!sources.length && <Empty>No visits match this period.</Empty>}</Panel>
    </div>
    <div className={styles.splitEqual}>
      <Panel title="Top pages"><DataTable columns={[{ key: "page", label: "Page", render: (value) => <span className="workspace-link">{value}</span> }, { key: "views", label: "Views", render: formatNumber }, { key: "enquiries", label: "Enquiries", render: formatNumber }, { key: "conversion", label: "Conversion", render: value => typeof value === "number" ? value.toFixed(1) + "%" : value }]} rows={topPages} /></Panel>
      <Panel title="Visits by region"><div className={styles.donutWrap}><div className={styles.donut} style={{ background: slices.length ? "conic-gradient(" + slices.join(",") + ")" : "var(--ad-panel-soft)" }}><div className={styles.donutInner}><strong>{formatNumber(pageViews)}</strong><span>Visits</span></div></div><div className={styles.regionList}>{regions.map((row, index) => <div className={styles.regionRow} key={row.name}><i className={styles.legendDot} style={{ background: ["var(--ad-chart-series-1)", "var(--ad-chart-series-2)", "var(--ad-chart-series-3)", "var(--ad-chart-series-4)"][index % 4] }} /><span>{row.name}</span><strong>{row.percent.toFixed(1)}%</strong></div>)}</div></div></Panel>
    </div>
    <Panel><div className={styles.strip}><div className={styles.stripMetric}><Search size={30} /><div><strong style={{ fontSize: 18 }}>SEO health</strong><small>Key issues affecting search visibility.</small></div></div><div className={styles.stripMetric}><TriangleAlert /><div><small>Metadata issues</small><strong>{seo.filter(row => !row.title || !row.description || /review/i.test(row.status)).length}</strong></div></div><div className={styles.stripMetric}><Link2 /><div><small>Broken links</small><strong>{broken.length}</strong></div></div><Button href="/dashboard/analytics/seo" variant="ghost" icon={ArrowUpRight}>Review SEO issues</Button></div></Panel>
  </div>;
}

export function SeoManagerPage() {
  const { notify, command } = useAdmin();
  const [pages] = useLocalState("admin-seo-pages", seoSeed);
  const [tab, setTab] = useState("Page metadata");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All pages");
  const [draft, setDraft] = useState(() => seoSeed.find(row => row.id === reference.initialSeoPageId) || null);
  const [redirects] = useLocalState("admin-seo-redirects", fixtures.datasets["admin-seo-redirects"]);
  const [broken] = useLocalState("admin-seo-broken", fixtures.datasets["admin-seo-broken"]);
  const [redirectOpen, setRedirectOpen] = useState(false);
  const [newRedirect, setNewRedirect] = useState(() => fieldValue(reference.emptyRedirect));
  const [generated] = useLocalState("admin-sitemap-generated", fixtures.datasets["admin-sitemap-generated"]);
  const filtered = pages.filter((row) => textMatch(row, query) && (status === "All pages" || row.status !== "Good"));
  useEffect(() => { setDraft((current) => pages.find((row) => row.id === current?.id) || null); }, [pages]);
  function saveMetadata(review = false) {
    if (!draft) return notify("Select a page before saving metadata.");
    commit(command, notify, "seo.save", { id: draft.id, patch: { ...draft, status: review ? "In review" : "Draft" } }, review ? "Metadata sent for review." : "Metadata draft saved.");
  }
  function addRedirect(event) {
    event.preventDefault();
    const result = commit(command, notify, "seo.redirect.save", { redirect: newRedirect }, "Redirect saved.");
    if (!result) return;
    setRedirectOpen(false);
    setNewRedirect(fieldValue(reference.emptyRedirect));
  }
  return <div className="workspace-stack">
    <PageHeader title="SEO manager" description="Manage search metadata, redirects and indexing." />
    <Tabs items={["Page metadata", "Redirects", "Broken links", "Sitemap"]} value={tab} onChange={setTab} />
    <div className="workspace-grid workspace-grid-4"><Stat label="Pages checked" value={pages.length} icon={FileText} /><Stat label="Missing descriptions" value={pages.filter((x) => !x.description).length} icon={TriangleAlert} /><Stat label="Broken links" value={broken.length} icon={Link2} /><Stat label="Redirects" value={redirects.length} icon={ArrowRight} /></div>
    {tab === "Page metadata" && <div className={styles.splitEqual}>
      <Panel title={"Website pages (" + pages.length + ")"} description="Review and update search metadata for your website pages." actions={<Select aria-label="Page status" options={["All pages", "Needs attention"]} value={status} onChange={(e) => setStatus(e.target.value)} />}>
        <div className="workspace-toolbar"><SearchInput value={query} onChange={setQuery} placeholder="Search pages or titles..." /></div>
        <DataTable columns={[{ key: "page", label: "Page", render: (value, row) => <button className={styles.mutedButton} onClick={() => setDraft(row)}>{value}</button> }, { key: "title", label: "Title", render: (value) => <span title={value}>{value.length > 24 ? value.slice(0, 24) + "…" : value}</span> }, { key: "status", label: "Status", render: (value) => <Status value={value} /> }]} rows={filtered} onRowClick={(row) => setDraft(row)} />
        {!filtered.length && <Empty />}
      </Panel>
      <Panel title="Edit page metadata">{draft ? <div className={styles.formStack}><div className="workspace-row"><span className="workspace-muted workspace-small">Page</span><Badge tone="blue">{draft.page}</Badge></div><Field label="Meta title"><Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={80} /></Field><Field label="Meta description" hint={draft.description.length + " / 160"}><textarea className={styles.textArea} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} maxLength={160} /></Field><Field label="Canonical URL"><Input type="url" value={draft.canonical} onChange={(e) => setDraft({ ...draft, canonical: e.target.value })} /></Field><Switch checked={draft.index} onChange={(index) => setDraft({ ...draft, index })} label="Index page" /><div className={styles.preview}><p className={styles.subheading}>Search result preview</p><h3>{draft.title || "Page title"}</h3><span className={styles.previewUrl}>{draft.canonical}</span><p>{draft.description || "Add a description to help visitors understand this page."}</p></div><div className="workspace-row"><Button onClick={() => saveMetadata(false)}>Save draft</Button><Button variant="primary" onClick={() => saveMetadata(true)}>Request review</Button></div></div> : <Empty>Select a page to edit metadata.</Empty>}</Panel>
    </div>}
    {tab === "Redirects" && <Panel title="Redirects" description="Guide visitors from old URLs to current pages." actions={<Button icon={Plus} variant="primary" onClick={() => setRedirectOpen(true)}>Add redirect</Button>}><DataTable columns={[{ key: "from", label: "Source path" }, { key: "to", label: "Destination" }, { key: "type", label: "Status code" }, { key: "hits", label: "Visits" }, { key: "id", label: "Actions", render: (id) => <Button variant="ghost" icon={Trash2} aria-label="Delete redirect" onClick={() => commit(command, notify, "seo.redirect.delete", { id }, "Redirect removed.")}>Remove</Button> }]} rows={redirects} />{!redirects.length && <Empty>No redirects yet. Add a redirect to get started.</Empty>}</Panel>}
    {tab === "Broken links" && <Panel title="Broken links" description="Review destinations that could not be reached."><DataTable columns={[{ key: "source", label: "Found on" }, { key: "target", label: "Broken destination" }, { key: "status", label: "Response", render: (value) => <Badge tone="danger">{value}</Badge> }, { key: "found", label: "Last checked" }, { key: "id", label: "Actions", render: (id, row) => <div className={styles.inlineActions}><Button variant="ghost" onClick={() => { setNewRedirect({ ...fieldValue(reference.emptyRedirect), from: row.target, to: "/" }); setRedirectOpen(true); }}>Create redirect</Button><Button variant="ghost" onClick={() => commit(command, notify, "seo.link.resolve", { id }, "Issue marked reviewed.")}>Dismiss</Button></div> }]} rows={broken} />{!broken.length && <Empty>All broken links have been reviewed.</Empty>}</Panel>}
    {tab === "Sitemap" && <Panel title="Sitemap" description="Review the pages included in your website sitemap." actions={<Button icon={RefreshCw} variant="primary" onClick={() => commit(command, notify, "seo.sitemap.generate", {}, "Sitemap regenerated.")}>Regenerate sitemap</Button>}><div className={styles.notice}><Info /><span>Last generated: {when(generated)}. Only pages marked for indexing are included.</span></div><DataTable columns={[{ key: "page", label: "Page" }, { key: "canonical", label: "Canonical URL" }, { key: "index", label: "Included", render: (value) => <Badge tone={value ? "success" : "muted"}>{value ? "Included" : "Excluded"}</Badge> }]} rows={pages} /></Panel>}
    <Panel><div className="workspace-row"><Globe2 size={18} /><span className="workspace-small">Sitemap last generated · {when(generated)}</span></div></Panel>
    <Modal open={redirectOpen} onClose={() => setRedirectOpen(false)} title="Add redirect"><form className={styles.formStack} onSubmit={addRedirect}><Field label="Source path"><Input required placeholder="/old-page" value={newRedirect.from} onChange={(e) => setNewRedirect({ ...newRedirect, from: e.target.value })} /></Field><Field label="Destination path"><Input required placeholder="/new-page" value={newRedirect.to} onChange={(e) => setNewRedirect({ ...newRedirect, to: e.target.value })} /></Field><Field label="Redirect type"><Select options={["301", "302"]} value={newRedirect.type} onChange={(e) => setNewRedirect({ ...newRedirect, type: e.target.value })} /></Field><Button type="submit" variant="primary">Add redirect</Button></form></Modal>
  </div>;
}

export function MonitoringPage() {
  const { db, scope } = useAdmin();
  const [range, setRange] = useState("Last 24 hours");
  const [errorFilter, setErrorFilter] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const regionDb = scope === "Global" ? db : { ...db, datasets: { ...db.datasets, "admin-performance-probes": (db.datasets["admin-performance-probes"] || []).filter(row => row.region === scope), "admin-incidents": (db.datasets["admin-incidents"] || []).filter(row => row.region === scope || row.region === "Global") } };
  const monitoring = selectMonitoring(regionDb, { range });
  const incidents = regionDb.datasets["admin-incidents"] || fixtures.datasets["admin-incidents"];
  const probes = monitoring.probes;
  const errorGroups = new Map();
  for (const probe of probes.filter(row => row.error)) {
    const key = probe.error.route + ":" + probe.error.message;
    const current = errorGroups.get(key);
    errorGroups.set(key, { id: key, route: probe.error.route, message: probe.error.message, count: (current?.count || 0) + 1, lastSeen: !current || Date.parse(probe.at) > Date.parse(current.lastSeen) ? probe.at : current.lastSeen });
  }
  const errors = [...errorGroups.values()].filter(row => textMatch(row, errorFilter));
  const chronological = [...probes].sort((x, y) => Date.parse(x.at) - Date.parse(y.at));
  const metrics = [
    { label: "LCP", value: (monitoring.lcpMs / 1000).toFixed(2) + " s", field: "lcpMs" },
    { label: "INP", value: Math.round(monitoring.inpMs) + " ms", field: "inpMs" },
    { label: "CLS", value: Number(monitoring.cls).toFixed(3), field: "cls" },
  ];
  return <div className="workspace-stack">
    <PageHeader title="Monitoring & alerts" description="Availability and visitor experience across regions." actions={<><Select aria-label="Monitoring date range" options={["Last hour", "Last 24 hours", "Last 7 days"]} value={range} onChange={(e) => setRange(e.target.value)} /><Button href="/dashboard/monitoring/alert-rules" variant="primary" icon={Settings2}>Configure alerts</Button></>} />
    <div className="workspace-grid workspace-grid-4"><Stat label="Uptime" value={Number(monitoring.uptime).toFixed(2) + "%"} icon={Activity} color="#34d399" /><Stat label="Mean response" value={Math.round(monitoring.avgResponseMs) + " ms"} icon={Clock3} /><Stat label="Open incidents" value={monitoring.unresolvedIncidents.length} icon={TriangleAlert} color="#a78bfa" /><Stat label="Browser errors" value={probes.filter(row => row.error).length} icon={FileText} color="#a78bfa" /></div>
    <div className={styles.splitEqual}>
      <Panel title="Regional availability"><div className={styles.splitEqual} style={{ gridTemplateColumns: "minmax(0,1.6fr) minmax(135px,1fr)", alignItems: "center" }}><MiniMap /><div className={styles.regionList}>{monitoring.regionalRows.map(region => <div key={region.name} className={styles.statusRow} data-warning={region.status !== "Operational"}>{region.status !== "Operational" ? <TriangleAlert /> : <CheckCircle2 />}<div><strong className="workspace-small">{region.name}</strong><div className="workspace-muted workspace-small">{region.status}</div></div></div>)}</div></div></Panel>
      <Panel title="Visitor performance · p75" actions={<span title="75th percentile of visitor measurements"><Info size={16} /></span>}>{metrics.map(metric => <div className={styles.performanceRow} key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><div className={styles.metricSpark}><small>{probes.length} measured probes</small>{chronological.length ? <Sparkline values={chronological.slice(-12).map(row => row[metric.field])} /> : <span className="workspace-small workspace-muted">No measurements</span>}</div></div>)}</Panel>
    </div>
    <div className={styles.splitEqual}>
      <Panel title="Service status"><DataTable columns={[{ key: "name", label: "Service" }, { key: "status", label: "Status", render: value => <Status value={value} /> }, { key: "uptime", label: "Uptime", render: value => Number(value).toFixed(2) + "%" }, { key: "responseMs", label: "Mean response", render: value => Math.round(value) + " ms" }]} rows={monitoring.serviceRows} /></Panel>
      <Panel title="Recent incidents"><div className="workspace-list">{incidents.map(incident => <Link key={incident.id} className="workspace-list-row" href={"/dashboard/monitoring/incidents/" + incident.id}>{incident.status === "Resolved" ? <CheckCircle2 size={20} style={{ color: "#34d399" }} /> : <TriangleAlert size={20} style={{ color: "#fbbf24" }} />}<div><strong className="workspace-small">{incident.title}</strong><p className="workspace-muted workspace-small">{incident.region} · {when(incident.startedAt)}</p></div><Status value={incident.status} /></Link>)}</div>{!incidents.length && <Empty>No incidents have been recorded.</Empty>}</Panel>
    </div>
    <Panel title="Recent browser errors" actions={<Button variant="ghost" icon={ListFilter} onClick={() => setShowErrors(!showErrors)}>{showErrors ? "Hide details" : "View errors"}</Button>}>{showErrors && <div className="workspace-toolbar"><SearchInput value={errorFilter} onChange={setErrorFilter} placeholder="Filter routes and messages..." /></div>}<DataTable columns={[{ key: "route", label: "Route", render: value => <span className="workspace-link">{value}</span> }, { key: "count", label: "Count" }, { key: "message", label: "Message" }, ...(showErrors ? [{ key: "lastSeen", label: "Last seen", render: when }] : [])]} rows={errors} /></Panel>
  </div>;
}

export function IncidentDetailPage({ incidentId }) {
  const { notify, command } = useAdmin();
  const [incidents] = useLocalState("admin-incidents", fixtures.datasets["admin-incidents"]);
  const incident = incidents.find(row => row.id === incidentId || row.aliases?.includes(incidentId));
  const [update, setUpdate] = useState("");
  const [routing, setRouting] = useState(incident?.notificationTeam || (incident?.owner ? incident.owner + " team" : ""));
  useEffect(() => { setRouting(incident?.notificationTeam || (incident?.owner ? incident.owner + " team" : "")); }, [incident?.notificationTeam, incident?.owner]);
  if (!incident) return <div className="workspace-stack"><PageHeader title="Incident not found" description="The requested incident does not exist in this workspace." /><Button href="/dashboard/monitoring">Back to monitoring</Button></div>;
  const service = reference.services.find(row => row.id === incident.serviceId);
  const related = incident.timeline.slice(-2);
  function addUpdate(event) {
    event.preventDefault();
    const result = commit(command, notify, "incident.update", { id: incident.id, message: update, notificationTeam: routing }, "Internal incident update saved.");
    if (result) setUpdate("");
  }
  return <div className="workspace-stack">
    <PageHeader title={incident.title} eyebrow={"Monitoring & Alerts / Incidents / " + incident.id} actions={<><Button disabled={incident.acknowledged || incident.status === "Resolved"} onClick={() => commit(command, notify, "incident.update", { id: incident.id, acknowledged: true }, "Incident acknowledged.")}>{incident.acknowledged ? "Acknowledged" : "Acknowledge"}</Button><Button variant="primary" disabled={incident.status === "Resolved"} onClick={() => commit(command, notify, "incident.update", { id: incident.id, status: "Resolved" }, "Incident resolved. Website health has been updated.")}>{incident.status === "Resolved" ? "Resolved" : "Resolve incident"}</Button></>} />
    <div className="workspace-row"><Status value={incident.status} /><Badge tone="muted">Severity: {incident.severity}</Badge>{incident.acknowledged && <Badge tone="blue">Acknowledged</Badge>}</div>
    <div className={"workspace-grid workspace-grid-4 " + styles.incidentStats}><Stat label="Affected service" value={service?.name || incident.serviceId} icon={Mail} spark={false} /><Stat label="Region" value={incident.region} icon={Globe2} spark={false} /><Stat label="Started" value={when(incident.startedAt)} icon={Clock3} spark={false} /><Stat label="Owner" value={incident.owner} icon={Users} spark={false} /></div>
    <div className={styles.splitWide}>
      <Panel title="Incident timeline"><div className={styles.timeline}>{[...incident.timeline, ...incident.updates].map(event => <div className={styles.timelineItem} key={event.id}><time>{new Date(event.at).toLocaleTimeString("en-GB", { timeZone: "UTC", hour: "2-digit", minute: "2-digit" })}<small>UTC</small></time><div><strong>{event.title}</strong><p>{event.description}</p></div></div>)}</div></Panel>
      <div className="workspace-stack"><Panel title="Impact"><div className="workspace-list"><div className="workspace-list-row"><Info size={17} /><span className="workspace-small">{incident.status === "Resolved" ? "The affected service has recovered." : incident.description}</span></div><div className="workspace-list-row"><div><strong className="workspace-small">Affected</strong><p className="workspace-muted workspace-small">{service?.name || incident.serviceId} · {incident.region}</p></div></div></div></Panel><Panel title="Related events"><div className="workspace-list">{related.map(event => <div className="workspace-list-row" key={event.id}><Activity size={18} /><div><strong className="workspace-small">{event.title}</strong><p className="workspace-muted workspace-small">{when(event.at)}</p></div></div>)}</div></Panel></div>
    </div>
    <Panel title="Internal update" actions={<Badge tone="muted">Visible to administrators only</Badge>}><form className={styles.formStack} onSubmit={addUpdate}><textarea aria-label="Internal incident update" className={styles.textArea} value={update} onChange={(e) => setUpdate(e.target.value)} placeholder="Add an internal update, next steps, or status for the team..." required /><div className="workspace-between"><div className="workspace-row"><span className="workspace-small workspace-muted">Notification routing</span><Select options={[...new Set(fixtures.datasets["admin-alert-rules"].map(row => row.team))]} value={routing} onChange={(e) => setRouting(e.target.value)} aria-label="Notification routing" /></div><Button variant="primary" type="submit">Update incident</Button></div></form></Panel>
  </div>;
}

const alertSeed = fixtures.datasets["admin-alert-rules"];

export function AlertRulesPage() {
  const { notify, command, db } = useAdmin();
  const [rules] = useLocalState("admin-alert-rules", alertSeed);
  const [draft, setDraft] = useState(() => alertSeed[0] || null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [test, setTest] = useState(false);
  const filtered = rules.filter((row) => textMatch(row, query));
  useEffect(() => { setDraft((current) => rules.find((row) => row.id === current?.id) || null); }, [rules]);
  const changeDraft = (key, value) => { setDraft({ ...draft, [key]: value }); setTest(false); };
  function testRule() {
    if (!draft) return;
    const minutes = Number(draft.window.match(/\d+/)?.[0]) || 2;
    const probes = (db.datasets["admin-performance-probes"] || []).filter(row => row.serviceId === draft.serviceId && (draft.regions === "All monitored regions" || row.region === draft.regions) && Date.parse(row.at) >= Date.parse(db.meta.clock) - minutes * 60000 && Date.parse(row.at) <= Date.parse(db.meta.clock));
    if (!probes.length) return setTest("There are no probes for this rule in the selected evaluation window.");
    const threshold = Number(draft.condition.match(/[\d.]+/)?.[0]) || 0;
    const value = draft.metric === "Availability" ? probes.filter(row => !row.available).length : draft.metric === "Browser error rate" ? probes.filter(row => row.error).length / probes.length * 100 : draft.metric === "Largest contentful paint" ? Math.max(...probes.map(row => row.lcpMs)) / 1000 : Math.max(...probes.map(row => row.responseMs)) / 1000;
    const matched = draft.metric === "Availability" ? value >= threshold : value > threshold;
    setTest((!draft.enabled ? "Rule is disabled. " : "") + (matched ? "Condition matched" : "Condition did not match") + " across " + probes.length + " recorded probes. Observed: " + value.toFixed(2) + ". No message was sent.");
  }
  function saveRule() {
    if (draft) commit(command, notify, "alert.save", { rule: draft }, "Alert rule saved.");
  }
  function createRule(event) {
    event.preventDefault();
    const result = commit(command, notify, "alert.save", { rule: { ...fieldValue(reference.newAlertRule), name } }, "Alert rule created.");
    if (!result) return;
    setDraft(result.value);
    setOpen(false);
    setName("");
  }
  return <div className="workspace-stack">
    <PageHeader title="Alert rules" description="Notify the right team when website health changes." actions={<Button variant="primary" icon={Plus} onClick={() => setOpen(true)}>New rule</Button>} />
    <div className={styles.splitWide}>
      <Panel><div className="workspace-toolbar"><SearchInput value={query} onChange={setQuery} placeholder="Search alert rules..." /></div><DataTable columns={[{ key: "name", label: "Rule", render: (value, row) => <button className={styles.ruleButton + (draft?.id === row.id ? " " + styles.ruleSelected : "")} onClick={() => { setDraft(row); setTest(false); }}>{value}</button> }, { key: "condition", label: "Condition" }, { key: "severity", label: "Severity", render: (value) => <Badge tone={value === "Critical" ? "danger" : "warning"}>{value}</Badge> }, { key: "enabled", label: "Status", render: (value, row) => <Switch checked={value} onChange={(enabled) => commit(command, notify, "alert.save", { rule: { ...row, enabled } }, enabled ? "Alert enabled." : "Alert disabled.")} aria-label={"Enable " + row.name} /> }]} rows={filtered} /></Panel>
      <Panel title={draft?.name || "Alert settings"}>{draft ? <div className={styles.formStack}><Field label="Service"><Select options={reference.services.map(service => ({ value: service.id, label: service.name }))} value={draft.serviceId || reference.newAlertRule.serviceId} onChange={e => changeDraft("serviceId", e.target.value)} /></Field><Field label="Metric"><Select value={draft.metric} options={["Availability", "Browser error rate", "Largest contentful paint", "Delivery time"]} onChange={(e) => changeDraft("metric", e.target.value)} /></Field><Field label="Condition"><Input value={draft.condition} onChange={(e) => changeDraft("condition", e.target.value)} /></Field><Field label="Evaluation window"><Select options={["2 minutes", "5 minutes", "15 minutes"]} value={draft.window} onChange={(e) => changeDraft("window", e.target.value)} /></Field><Field label="Regions"><Select options={["All monitored regions", "Americas", "Europe", "Asia Pacific"]} value={draft.regions} onChange={(e) => changeDraft("regions", e.target.value)} /></Field><Field label="Severity"><Select options={["Critical", "High", "Medium", "Low"]} value={draft.severity} onChange={(e) => changeDraft("severity", e.target.value)} /></Field><Field label="Notify"><Select options={["Operations team", "Engineering team", "Web team"]} value={draft.team} onChange={(e) => changeDraft("team", e.target.value)} /></Field><Switch label="Rule enabled" checked={draft.enabled} onChange={(value) => changeDraft("enabled", value)} /><Switch label="Send recovery notification" description="Notify the team when the issue is resolved." checked={draft.recovery} onChange={(value) => changeDraft("recovery", value)} /><div className={styles.notice}><Info /><span>{test || "No rule test has been run."}</span></div><div className={styles.inlineActions}><Button onClick={testRule}>Test rule</Button><Button variant="primary" onClick={saveRule}>Save rule</Button><Button variant="ghost" icon={Trash2} aria-label="Delete selected rule" onClick={() => { const result = commit(command, notify, "alert.delete", { id: draft.id }, "Alert rule removed."); if (result) setDraft(null); }} /></div></div> : <Empty>Select a rule or create a new one.</Empty>}</Panel>
    </div>
    <Modal open={open} onClose={() => setOpen(false)} title="Create alert rule"><form className={styles.formStack} onSubmit={createRule}><Field label="Rule name"><Input autoFocus required value={name} onChange={(e) => setName(e.target.value)} placeholder="Name this alert rule" /></Field><p className="workspace-small workspace-muted">Create a rule, then configure its condition and notification routing.</p><Button type="submit" variant="primary">Create rule</Button></form></Modal>
  </div>;
}

const localesSeed = fixtures.datasets["admin-locales"];
const regionalSeed = fixtures.datasets["admin-regional-settings"];
const visibilitySeed = fixtures.datasets["admin-regional-visibility"];

export function LocalizationPage() {
  const { notify, command } = useAdmin();
  const [locales] = useLocalState("admin-locales", localesSeed);
  const [storedSettings] = useLocalState("admin-regional-settings", regionalSeed);
  const [settings, setSettings] = useState(storedSettings);
  useEffect(() => { setSettings(storedSettings); }, [storedSettings]);
  const [storedVisibility] = useLocalState("admin-regional-visibility", visibilitySeed);
  const [visibility, setVisibility] = useState(storedVisibility);
  useEffect(() => { setVisibility(storedVisibility); }, [storedVisibility]);
  const [addOpen, setAddOpen] = useState(false);
  const [newLocale, setNewLocale] = useState(Object.keys(reference.localeCodes)[0]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  function addLocale(event) {
    event.preventDefault();
    const id = reference.localeCodes[newLocale];
    if (locales.some(row => row.id === id)) return notify("This locale is already configured.");
    const result = commit(command, notify, "locale.save", { locale: { ...fieldValue(reference.newLocale), id, code: id.toUpperCase(), name: newLocale } }, newLocale + " locale added.");
    if (result) setAddOpen(false);
  }
  return <div className="workspace-stack">
    <PageHeader title="Regions & languages" description="Coordinate content and availability worldwide." actions={<><Button icon={Plus} onClick={() => setAddOpen(true)}>Add locale</Button><Button icon={Settings2} onClick={() => document.getElementById("regional-settings")?.scrollIntoView({ behavior: "smooth", block: "center" })}>Regional settings</Button></>} />
    <div className="workspace-grid workspace-grid-4"><Stat label="Active locales" value={locales.length} icon={Globe2} /><Stat label="Translated pages" value={locales.reduce((sum, row) => sum + row.published, 0)} icon={FileText} /><Stat label="Awaiting translation" value={locales.reduce((sum, row) => sum + row.missing, 0)} icon={Languages} color="#a78bfa" /><Stat label="Regional rules" value={visibility.length} icon={Settings2} /></div>
    <div className={styles.splitWide}>
      <Panel title="Locale coverage" description="Translation and publishing status by locale."><DataTable columns={[{ key: "name", label: "Locale", render: (value, row) => <Link className={styles.tableLink + " " + styles.localeName} href={"/dashboard/localization/" + row.id + "/services"}><span className={styles.localeCode}>{row.code}</span>{value}</Link> }, { key: "published", label: "Published" }, { key: "review", label: "In review" }, { key: "missing", label: "Missing" }, { key: "id", label: "Coverage", render: (_, row) => <div className={styles.coverage}><span>{Math.round(row.published / (row.published + row.review + row.missing || 1) * 100)}%</span><Progress value={row.published / (row.published + row.review + row.missing || 1) * 100} /></div> }, { key: "default", label: "Default", render: (value) => value ? <Badge tone="blue">Default</Badge> : "—" }]} rows={locales} /></Panel>
      <Panel title="Region settings" id="regional-settings"><div className={styles.formStack}><Field label="Region"><Select options={["Global", "Americas", "Europe", "Asia Pacific"]} value={settings.region} onChange={(e) => { setSettings({ ...settings, region: e.target.value }); setSaved(false); }} /></Field><Field label="Default language"><Select options={locales.map((row) => row.name)} value={settings.language} onChange={(e) => { setSettings({ ...settings, language: e.target.value }); setSaved(false); }} /></Field><Field label="Publishing timezone"><Select options={["Europe/London", "America/New_York", "Asia/Kolkata", "Asia/Singapore", "UTC"]} value={settings.timezone} onChange={(e) => { setSettings({ ...settings, timezone: e.target.value }); setSaved(false); }} /></Field><Switch label="Allow locale fallback" description="Use the default language when a translation is missing." checked={settings.fallback} onChange={(value) => { setSettings({ ...settings, fallback: value }); setSaved(false); }} /><Switch label="Show region selector" description="Let visitors choose their region and language." checked={settings.selector} onChange={(value) => { setSettings({ ...settings, selector: value }); setSaved(false); }} /></div></Panel>
    </div>
    <Panel title="Regional feature visibility" description="Control which features are visible in each region."><DataTable columns={[{ key: "feature", label: "Feature" }, ...["Americas", "Europe", "Asia Pacific"].map((region) => ({ key: region, label: region, render: (value, row) => <button className={styles.visibilityButton} aria-label={(value ? "Hide " : "Show ") + row.feature + " in " + region} onClick={() => { setVisibility((current) => current.map((item) => item.id === row.id ? { ...item, [region]: !value } : item)); setSaved(false); }}><Badge tone={value ? "success" : "muted"}>{value ? "Visible" : "Hidden"}</Badge></button> }))]} rows={visibility} /></Panel>
    <div className="workspace-between"><p className={styles.statNote}>{saved ? "Regional changes saved in the shared frontend data." : "Review your regional settings before applying changes."}</p><Button variant="primary" icon={FileText} onClick={() => setReviewOpen(true)}>Review regional changes</Button></div>
    <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add locale"><form className={styles.formStack} onSubmit={addLocale}><Field label="Language"><Select options={Object.keys(reference.localeCodes)} value={newLocale} onChange={(e) => setNewLocale(e.target.value)} /></Field><div className={styles.notice}><Info /><span>New locales begin with empty translations and can use the configured fallback.</span></div><Button type="submit" variant="primary">Add locale</Button></form></Modal>
    <Modal open={reviewOpen} onClose={() => setReviewOpen(false)} title="Review regional changes"><div className={styles.formStack}><p className="workspace-small workspace-muted">These settings apply to the selected region across the frontend workspace.</p><div className="workspace-list"><div className="workspace-list-row"><span>Region</span><strong>{settings.region}</strong></div><div className="workspace-list-row"><span>Default language</span><strong>{settings.language}</strong></div><div className="workspace-list-row"><span>Publishing timezone</span><strong>{settings.timezone}</strong></div><div className="workspace-list-row"><span>Locale fallback</span><strong>{settings.fallback ? "Enabled" : "Disabled"}</strong></div></div><Button variant="primary" onClick={() => { const result = commit(command, notify, "regional.save", { settings, visibility }, "Regional settings saved."); if (result) { setSaved(true); setReviewOpen(false); } }}>Apply regional changes</Button></div></Modal>
  </div>;
}

const localeNames = reference.localeNames;
function sourceForContent(db, contentId) {
  const model = db.datasets["olentra-admin-page-" + contentId];
  if (model) return { title: model.title || "", summary: model.description || "", cta: model.button || "" };
  return reference.sourceContent[contentId] || null;
}

export function TranslationEditorPage({ locale = "de", contentId = "services" }) {
  const { notify, command, db } = useAdmin();
  const locales = db.datasets["admin-locales"] || localesSeed;
  const localeRecord = locales.find(row => row.id === locale);
  const language = localeRecord?.name || localeNames[locale] || locale;
  const key = "admin-translation-" + locale + "-" + contentId;
  const initial = fixtures.datasets[key] || fixtures.templates["admin-translation-"];
  const [saved] = useLocalState(key, initial);
  const [draft, setDraft] = useState(saved.fields);
  const [fallback, setFallback] = useState(saved.fallback || (db.datasets["admin-regional-settings"]?.fallback === false ? "None" : "English"));
  const regionalFallback = db.datasets["admin-regional-settings"]?.fallback !== false;
  useEffect(() => { setDraft(saved.fields); setFallback(saved.fallback || (regionalFallback ? "English" : "None")); }, [saved, regionalFallback]);
  const source = sourceForContent(db, contentId);
  const pageName = contentId.charAt(0).toUpperCase() + contentId.slice(1).replaceAll("-", " ");
  const fields = [["title", "Page title"], ["summary", "Summary"], ["cta", "Call to action"]];
  const completed = Object.values(draft).filter((value) => value.trim()).length;
  function save(status) {
    commit(command, notify, "translation.save", { locale, contentId, fields: draft, status, fallback }, status === "In review" ? "Translation sent for approval." : "Translation draft saved.");
  }
  if (!localeRecord || !source) return <div className="workspace-stack"><PageHeader title="Translation not found" description="This locale or source content is not configured." /><Button href="/dashboard/localization">Back to languages</Button></div>;
  return <div className="workspace-stack">
    <PageHeader title="Translate page" description={"Manage the " + language + " translation of " + pageName + "."} eyebrow={"Regions & Languages / " + pageName + " / " + language} actions={<><Badge tone="blue">{language} ({locale})</Badge><Status value={saved.status} /><Button onClick={() => save("Draft")}>Save draft</Button><Button variant="primary" onClick={() => save("In review")}>Request approval</Button></>} />
    <div className={styles.splitEqual}>
      <Panel title="Source · English" actions={<Badge tone="muted">Read-only</Badge>}><div className={styles.formStack}>{fields.map(([key, label]) => <Field key={key} label={label}><Input value={source[key]} readOnly /></Field>)}<div className={styles.preview}><p className={styles.subheading}>Preview · English</p><h3 style={{ color: "var(--ad-text)", fontSize: 23 }}>{source.title}</h3><p>{source.summary}</p><Button variant="primary" onClick={() => notify("This is a content preview.")} icon={ArrowRight}>{source.cta}</Button></div></div></Panel>
      <Panel title={"Translation · " + language} actions={<Badge tone="blue">Editable</Badge>}><div className={styles.formStack}>{fields.map(([key, label]) => <Field key={key} label={label}><Input lang={locale} value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} placeholder={"Enter " + language.toLowerCase() + " translation"} /></Field>)}<div className={styles.preview}><p className={styles.subheading}>Preview · {language}</p><h3 style={{ color: "var(--ad-text)", fontSize: 23 }}>{draft.title || (fallback === "English" ? source.title : "Translation title")}</h3><p>{draft.summary || (fallback === "English" ? source.summary : "")}</p><Button variant="primary" onClick={() => notify("This is a content preview.")} icon={ArrowRight}>{draft.cta || (fallback === "English" ? source.cta : "Call to action")}</Button></div></div></Panel>
    </div>
    <Panel><div className={styles.strip}><Field label="Fallback language"><Select options={["English", "None"]} value={fallback} onChange={(e) => setFallback(e.target.value)} /></Field><div className={styles.stripMetric}><Clock3 /><div><small>Source updated</small><strong style={{ fontSize: 13 }}>{when(db.datasets["olentra-admin-page-" + contentId]?.updatedAt || saved.updatedAt)}</strong></div></div><div><p className="workspace-small workspace-muted">Translation status</p><Status value={saved.status} /></div><div style={{ minWidth: 160 }}><p className="workspace-small workspace-muted">Language coverage</p><p className="workspace-small">{completed} / 3 fields ({Math.round(completed / 3 * 100)}%)</p><Progress value={completed / 3 * 100} /></div></div></Panel>
    <div className={styles.notice}><Info /><span>{fallback === "None" ? "Untranslated fields remain empty when no fallback is configured." : "Untranslated fields use the configured fallback."}</span></div>
    <div className="workspace-between"><div className="workspace-row"><Globe2 size={22} /><div><p className="workspace-small workspace-muted">Publication scope</p><strong className="workspace-small">Global · {language}-language visitors</strong></div></div><Button href="/dashboard/localization" variant="ghost">Back to languages</Button></div>
  </div>;
}

const teamSeed = fixtures.datasets["admin-team-members"];
const roles = reference.roles;
const accessForRole = reference.accessForRole;
const roleSlug = role => role.toLowerCase().replaceAll(" ", "-");
function memberAccess(db, member) {
  if (member.role === "Owner") return "All modules";
  const permissions = db.datasets["admin-role-permissions-" + roleSlug(member.role)] || fixtures.datasets["admin-role-permissions-" + roleSlug(member.role)] || [];
  const accessible = permissions.filter(row => row.view).length;
  return !permissions.length ? "No access" : accessible === permissions.length ? "All modules" : accessible + " modules";
}

export function TeamPage() {
  const { notify, command, db } = useAdmin();
  const [memberRecords] = useLocalState("admin-team-members", teamSeed);
  const members = memberRecords.filter(row => row.status !== "Removed");
  const [invitationRecords] = useLocalState("admin-team-invitations", fixtures.datasets["admin-team-invitations"]);
  const invitations = invitationRecords.filter(row => !row.status || row.status === "Pending");
  const [policies] = useLocalState("olentra-admin-security-policy-v1", governanceFixtures.datasets["olentra-admin-security-policy-v1"]);
  const [sessions] = useLocalState("olentra-admin-security-sessions-v1", governanceFixtures.datasets["olentra-admin-security-sessions-v1"]);
  const [tab, setTab] = useState("Members");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState(reference.defaultInvitationRole);
  const [editing, setEditing] = useState(null);
  const filtered = members.filter((row) => textMatch(row, query));
  const totalPages = Math.max(1, Math.ceil(filtered.length / 5));
  const visibleMembers = filtered.slice(Math.min(page, totalPages - 1) * 5, Math.min(page, totalPages - 1) * 5 + 5);
  function invite(event) {
    event.preventDefault();
    const result = commit(command, notify, "team.invite", { email: inviteEmail, role: inviteRole }, "Invitation created in frontend data. No email was sent.");
    if (!result) return;
    setInviteOpen(false);
    setInviteEmail("");
  }
  const invitationColumns = [
    { key: "name", label: "Invitation" },
    { key: "role", label: "Role", render: value => <Badge tone="muted">{value}</Badge> },
    { key: "expiresAt", label: "Expires", render: value => Date.parse(value) <= Date.parse(db.meta.clock) ? <Badge tone="warning">Expired</Badge> : when(value) },
    { key: "id", label: "Actions", render: (id, row) => <div className={styles.inlineActions}><Button variant="ghost" icon={RefreshCw} onClick={() => commit(command, notify, "team.invitation.resend", { id }, "Invitation refreshed. No email was sent.")}>Refresh</Button><Button disabled={Date.parse(row.expiresAt) <= Date.parse(db.meta.clock)} onClick={() => commit(command, notify, "team.invitation.accept", { id }, "Invitation accepted. Team membership updated.")}>Accept invitation</Button><Button icon={Trash2} onClick={() => commit(command, notify, "team.invitation.revoke", { id }, "Invitation revoked.")}>Revoke</Button></div> },
  ];
  return <div className="workspace-stack">
    <PageHeader title="Team & access" description="Manage workspace members and administrator access." actions={<Button variant="primary" icon={Plus} onClick={() => setInviteOpen(true)}>Invite member</Button>} />
    <Tabs items={["Members", "Roles", "Invitations", "Sessions"]} value={tab} onChange={setTab} />
    <div className="workspace-grid workspace-grid-4"><Stat label="Members" value={members.length} icon={Users} /><Stat label="Pending invitations" value={invitations.length} icon={Mail} color="#a78bfa" /><Stat label="Roles" value={roles.length + 1} icon={ShieldCheck} /><Stat label="MFA enabled" value={members.filter((row) => row.mfa).length + " of " + members.length} icon={ShieldCheck} color="#34d399" /></div>
    {tab === "Members" && <><div className={styles.splitWide}><Panel title="Workspace members" actions={<SearchInput value={query} onChange={(value) => { setQuery(value); setPage(0); }} placeholder="Search members..." />}><DataTable columns={[{ key: "name", label: "Member", render: (value, row) => <div className={styles.person}><span className={styles.personAvatar}>{row.initials}</span><strong className="workspace-small">{value}</strong></div> }, { key: "role", label: "Role", render: (value) => <Badge tone={value === "Owner" ? "blue" : "muted"}>{value}</Badge> }, { key: "access", label: "Access", render: (_, row) => memberAccess(db, row) }, { key: "mfa", label: "MFA", render: (value) => <Badge tone={value ? "success" : "warning"}>{value ? "Enabled" : "Not enabled"}</Badge> }, { key: "active", label: "Last active", render: (value, row) => row.lastActiveAt ? when(row.lastActiveAt) : value }, { key: "id", label: "Actions", render: (_, row) => <Button variant="ghost" disabled={row.role === "Owner"} onClick={() => setEditing(row)}>Manage</Button> }]} rows={visibleMembers} /><div className="workspace-between" style={{ paddingTop: 18 }}><span className="workspace-small workspace-muted">Page {Math.min(page, totalPages - 1) + 1} of {totalPages} · {filtered.length} members</span><div className="workspace-row"><Button disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button><Button disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}>Next</Button></div></div></Panel><Panel title="Access policies"><div className={styles.formStack}><Switch label="Require multi-factor authentication" checked={policies.mfa} onChange={(value) => commit(command, notify, "settings.save", { section: "security", values: { ...policies, mfa: value } }, "MFA policy saved.")} /><Field label="Session timeout"><Select options={[...new Set([policies.timeout, "15 minutes", "30 minutes", "1 hour", "4 hours", "8 hours"])]} value={policies.timeout} onChange={(e) => commit(command, notify, "settings.save", { section: "security", values: { ...policies, timeout: e.target.value } }, "Session policy saved.")} /></Field><div><p className={styles.subheading}>Owner actions restricted <Badge tone="success">Enabled</Badge></p><p className="workspace-small workspace-muted">Sensitive workspace actions are reserved for the owner role.</p></div><Button href="/dashboard/team/roles/recruiter" variant="ghost" icon={Settings2}>Manage role permissions</Button></div></Panel></div><Panel title="Pending invitations"><DataTable columns={invitationColumns} rows={invitations} /></Panel></>}
    {tab === "Roles" && <div className="workspace-grid workspace-grid-3">{["Owner", ...roles].map((role) => <Panel key={role} title={role} actions={<Badge tone="blue">{members.filter((member) => member.role === role).length} members</Badge>}><div className={styles.formStack}><p className="workspace-small workspace-muted">{role === "Owner" ? "Full workspace ownership and protected company settings." : ((db.datasets["admin-role-permissions-" + roleSlug(role)] || []).filter(row => row.view).length + " accessible modules.")}</p>{role === "Owner" ? <Badge tone="muted">System role · cannot be changed</Badge> : <Button href={"/dashboard/team/roles/" + roleSlug(role)}>Edit permissions</Button>}</div></Panel>)}</div>}
    {tab === "Invitations" && <Panel title="Pending invitations" description="Invitation acceptance updates the shared team records in this frontend workspace."><DataTable columns={invitationColumns} rows={invitations} /></Panel>}
    {tab === "Sessions" && <Panel title="Active sessions" description="Manage illustrative administrator sessions in this preview."><DataTable columns={[{ key: "account", label: "Member" }, { key: "device", label: "Device" }, { key: "region", label: "Region" }, { key: "active", label: "Last active" }, { key: "id", label: "Actions", render: (id, row) => row.current ? <Badge tone="blue">Current session</Badge> : <Button onClick={() => commit(command, notify, "session.revoke", { id }, "Session revoked.")}>Revoke session</Button> }]} rows={sessions} /></Panel>}
    <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite team member"><form className={styles.formStack} onSubmit={invite}><Field label="Email address"><Input type="email" placeholder="colleague@example.com" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} /></Field><Field label="Role"><Select options={roles} value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} /></Field><div className={styles.notice}><Info /><span>This creates a local preview invitation. No email will be sent.</span></div><Button type="submit" variant="primary">Create invitation</Button></form></Modal>
    <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={"Manage " + (editing?.name || "member")}>{editing && <div className={styles.formStack}><Field label="Role"><Select options={roles} value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value, access: accessForRole[e.target.value] })} /></Field><Switch label="MFA enrolled" checked={editing.mfa} onChange={value => setEditing({ ...editing, mfa: value })} /><span className="workspace-small workspace-muted">Last active {editing.active}</span><div className="workspace-between"><Button variant="danger" onClick={() => { const result = commit(command, notify, "team.member.delete", { id: editing.id }, "Member removed."); if (result) setEditing(null); }}>Remove member</Button><Button variant="primary" onClick={() => { const result = commit(command, notify, "team.member.update", { id: editing.id, patch: { role: editing.role, mfa: editing.mfa } }, "Member access updated."); if (result) setEditing(null); }}>Save changes</Button></div></div>}</Modal>
  </div>;
}

function permissionsFor(role) {
  return fixtures.datasets["admin-role-permissions-" + role] || fixtures.templates["admin-role-permissions-"];
}

export function RolePermissionsPage({ roleId = "recruiter" }) {
  const router = useRouter();
  const { notify, command, db } = useAdmin();
  const role = roles.find((value) => roleSlug(value) === roleId);
  const [saved] = useLocalState("admin-role-permissions-" + roleId, permissionsFor(roleId));
  const [draft, setDraft] = useState(saved);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [memberRecords] = useLocalState("admin-team-members", teamSeed);
  const members = memberRecords.filter(row => row.status !== "Removed");
  useEffect(() => { setDraft(saved); }, [saved]);
  function toggle(name, key) {
    setDraft((current) => current.map((row) => {
      if (row.name !== name) return row;
      const next = { ...row, [key]: !row[key] };
      if (key === "view" && !next.view) return { ...next, edit: false, publish: false, manage: false };
      if (next[key] && key !== "view") next.view = true;
      if (key === "publish" && next.publish) next.edit = true;
      if (key === "edit" && !next.edit) next.publish = false;
      return next;
    }));
  }
  const allowed = draft.filter((row) => row.view && !["Overview", "Approvals & Audit Log"].includes(row.name));
  const restricted = draft.filter((row) => !row.view);
  const changed = JSON.stringify(saved) !== JSON.stringify(draft);
  if (!role) return <div className="workspace-stack"><PageHeader title="Role not found" description="This administrator role is not configured." /><Button href="/dashboard/team">Back to team</Button></div>;
  return <div className="workspace-stack">
    <PageHeader title="Role permissions" description="Define what members assigned to this role can do across the workspace." eyebrow={"Team & Access / Roles / " + role} actions={<><Button onClick={() => { setDraft(saved); notify("Unsaved permission changes discarded."); }}>Cancel</Button><Button variant="primary" disabled={!changed} onClick={() => setReviewOpen(true)}>Review & save</Button></>} />
    <div className={styles.permissionRole}><span>Role</span><div><Select options={roles.map((value) => ({ value: roleSlug(value), label: value }))} value={roleSlug(role)} onChange={(e) => router.push("/dashboard/team/roles/" + e.target.value)} aria-label="Administrator role" /></div><span>{role === "Recruiter" ? "Manage recruitment without website administration access." : "Set permissions that match this role’s responsibilities."}</span></div>
    <div className={styles.splitWide}>
      <Panel title="Module permissions" description="Set access for each product module. Changes apply to all members in this role."><div className="workspace-table-wrap"><table className={styles.permissionTable}><thead><tr><th>Module</th><th>View</th><th>Create/Edit</th><th>Publish</th><th>Manage</th></tr></thead><tbody>{draft.map((row) => <tr key={row.id}><td>{row.name}</td>{["view", "edit", "publish", "manage"].map((key) => <td key={key}>{row.name === "Applications" && key === "publish" ? "—" : <><input type="checkbox" checked={Boolean(row[key])} onChange={() => toggle(row.name, key)} aria-label={key + " " + row.name} />{row.name === "Approvals & Audit Log" && key === "view" && row.view && role !== "Administrator" && <small>(only own actions)</small>}</>}</td>)}</tr>)}</tbody></table></div></Panel>
      <Panel title={role + " access"} description="What members with this role can and cannot do."><div className={styles.formStack}><div><h3 className={styles.subheading} style={{ color: "#34d399" }}>Can access</h3><ul className={styles.accessList}>{allowed.length ? allowed.map((row) => <li key={row.name}>{row.name}{row.edit ? " · edit" : " · view only"}</li>) : <li>Overview and permitted activity only</li>}</ul></div><div><h3 className={styles.subheading} style={{ color: "#fb7185" }}>Restricted</h3><ul className={styles.accessList}>{restricted.slice(0, 5).map((row) => <li key={row.name}>{row.name}</li>)}{restricted.length > 5 && <li>{restricted.length - 5} other modules</li>}</ul></div><div className={styles.notice}><Info /><span>Changes apply to <strong>{members.filter((member) => member.role === role).length} members</strong>.</span></div><p className="workspace-small workspace-muted">Last reviewed · {(db.datasets["admin-role-reviews"] || fixtures.datasets["admin-role-reviews"])[roleId]?.reviewedBy || "Not reviewed"}<br />{when((db.datasets["admin-role-reviews"] || fixtures.datasets["admin-role-reviews"])[roleId]?.reviewedAt)}</p></div></Panel>
    </div>
    <Modal open={reviewOpen} onClose={() => setReviewOpen(false)} title="Review role changes"><div className={styles.formStack}><p className="workspace-small">Update permissions for <strong>{role}</strong>?</p><p className="workspace-muted workspace-small">{draft.filter((row) => row.view).length} modules can be viewed and {draft.filter((row) => row.edit).length} modules can be edited. Saving updates access for all members assigned to this role.</p><Button variant="primary" onClick={() => { const result = commit(command, notify, "role.save", { roleId, permissions: draft }, role + " permissions saved."); if (result) setReviewOpen(false); }}>Save permissions</Button></div></Modal>
  </div>;
}
