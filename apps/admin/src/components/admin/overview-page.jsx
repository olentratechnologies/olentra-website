"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, Users, MessageSquare, ClipboardCheck, ChevronRight, FilePenLine, SlidersHorizontal, FileText, Check, Clock3, TriangleAlert, ArrowUpRight, Rocket } from "lucide-react";
import { Button, LineChart, MiniMap, Panel, Progress, Select, Stat } from "./ui";
import { useAdmin } from "./store";
import { LiveUsersStat } from "./live-user-count";
import { selectOverview, selectAnalytics, selectMonitoring } from "@/lib/admin/selectors.mjs";
import coreFixtures from "@/data/admin/core.json";
import styles from "./core.module.css";
import hero from "./overview-hero.module.css";
import { siteUrl } from "@/lib/site-url";

const formatNumber = (value) => Number(value || 0).toLocaleString("en-GB");
const formatPercent = (value) => Number(value || 0).toFixed(2) + "%";

function scopedData(db, scope) {
  if (!scope || scope === "Global" || scope === "All regions") return db;
  return {
    ...db,
    datasets: {
      ...db.datasets,
      "admin-visit-events": (db.datasets["admin-visit-events"] || []).filter((row) => row.region === scope),
      "admin-performance-probes": (db.datasets["admin-performance-probes"] || []).filter((row) => row.region === scope),
      "admin-incidents": (db.datasets["admin-incidents"] || []).filter((row) => row.region === scope || row.region === "Global"),
    },
  };
}

export function MetricCards({ visitorFirst = false }) {
  const { db, scope } = useAdmin();
  const overview = selectOverview(scopedData(db, scope));
  const traffic = <Stat spark={false} key="traffic" label="Visitors · 24 hours" value={formatNumber(overview.traffic.visitors)} icon={Users} />;
  const uptime = <Stat spark={false} key="uptime" label="Uptime · 30 days" value={overview.monitoring.probes.length ? formatPercent(overview.monitoring.uptime) : "No data"} icon={Activity} color="#22c55e" />;
  return <div className="workspace-metrics workspace-metrics-5">
    <LiveUsersStat />
    {visitorFirst ? [traffic, uptime] : [uptime, traffic]}
    <Stat spark={false} label="Open enquiries" value={formatNumber(overview.openEnquiries)} icon={MessageSquare} color="#a78bfa" />
    <Stat spark={false} label="Pending approvals" value={formatNumber(overview.pendingApprovals)} icon={ClipboardCheck} color="#a78bfa" />
  </div>;
}

export function OverviewPage() {
  const { db, scope, can } = useAdmin();
  const [period, setPeriod] = useState("Last 7 days");
  const regionDb = scopedData(db, scope);
  const overview = selectOverview(regionDb);
  const analytics = selectAnalytics(db, { range: period, region: scope });
  const monitoring = selectMonitoring(regionDb, { range: period });
  const approvals = (db.datasets["olentra-admin-governance-approvals-v1"] || []).filter((row) => row.status === "pending");
  const unassigned = (db.datasets["olentra-admin-enquiries-v1"] || []).filter((row) => row.owner === "Unassigned" && !["Resolved", "Spam"].includes(row.status));
  const description = db.reference?.core?.pageHeader?.description || coreFixtures.reference.pageHeader.description;
  const latestProbe = (region) => {
    const probes = monitoring.probes.filter((row) => row.region === region);
    const websiteProbes = probes.filter((row) => row.serviceId === "website");
    return (websiteProbes.length ? websiteProbes : probes).reduce((latest, probe) => !latest || Date.parse(probe.at) > Date.parse(latest.at) ? probe : latest, null);
  };
  const quickActions = [
    { icon: FilePenLine, label: "Edit content", href: "/dashboard/content" },
    { icon: SlidersHorizontal, label: "Manage features", href: "/dashboard/website-controls" },
    { icon: Users, label: "View applications", href: "/dashboard/careers/applications" },
  ];

  return <div className={"workspace-stack " + styles.overviewPage}>
    <section className={hero.hero} aria-labelledby="company-overview-title">
      <div className={hero.heroCopy}>
        <span className={hero.eyebrow}><Rocket size={14} aria-hidden="true" />Company workspace</span>
        <h1 id="company-overview-title">Company <span>overview</span></h1>
        <p>{description}</p>
        <div className={hero.heroActions}>
          {can("Website Controls", "view") && <Button href="/dashboard/website-controls" variant="primary" icon={SlidersHorizontal}>Website controls<ChevronRight size={15} aria-hidden="true" /></Button>}
          {can("Content & Media", "edit") && <Link className={hero.textAction} href="/dashboard/content">Create update<ArrowUpRight size={14} aria-hidden="true" /></Link>}
        </div>
      </div>
      <Link className={hero.websiteLink} href={siteUrl("/")} target="_blank" rel="noreferrer">View website<ArrowUpRight size={13} aria-hidden="true" /></Link>
    </section>
    <MetricCards visitorFirst />
    <div className={styles.overviewTop}>
      <Panel title="Visitor activity" description={`Unique visitors over time · ${scope}.`} actions={<Select aria-label="Visitor chart timeframe" options={["Last 24 hours", "Last 7 days", "Last 30 days"]} value={period} onChange={(event) => setPeriod(event.target.value)} />}>
        <LineChart values={analytics.chart.values} labels={analytics.chart.labels} height={235} />
        <p className="workspace-small workspace-muted">{formatNumber(analytics.visitors)} unique visitors · {formatNumber(analytics.pageViews)} visits · {period.toLowerCase()}</p>
      </Panel>
      <Panel title="Regional visitor distribution" description={`Visit share · ${period.toLowerCase()} · ${scope}.`}>
        <div className={styles.regionPanel}>
          <MiniMap />
          <div>{analytics.regions.map((region) => <div className={styles.region} key={region.name}>
            <div><b>{region.name}</b><b>{region.percent.toFixed(1)}%</b></div>
            <Progress value={region.percent} />
            <small>{formatNumber(region.count)} visits</small>
          </div>)}{!analytics.regions.length && <p className="workspace-muted workspace-small">No visits in this period.</p>}</div>
        </div>
      </Panel>
    </div>
    <div className={styles.overviewBottom}>
      <Panel title="Website health" description={`Availability · ${period.toLowerCase()}. Performance from the latest regional website probe.`}>
        <div className="workspace-table-wrap"><table className={styles.healthyTable}>
          <thead><tr>{["Region", "Uptime", "LCP", "INP", "CLS"].map((label) => <th key={label}>{label}</th>)}</tr></thead>
          <tbody>{monitoring.regionalRows.map((region) => {
            const probe = latestProbe(region.name);
            const Icon = region.status === "Operational" ? Check : region.status === "Degraded" ? TriangleAlert : Clock3;
            return <tr key={region.name}>
              <td title={region.status}><Icon size={13} aria-label={region.status} />{region.name}</td>
              <td>{probe ? formatPercent(region.uptime) : "—"}</td>
              <td>{probe ? (Number(probe.lcpMs) / 1000).toFixed(2) + " s" : "—"}</td>
              <td>{probe ? Math.round(probe.inpMs) + " ms" : "—"}</td>
              <td>{probe ? Number(probe.cls).toFixed(3) : "—"}</td>
            </tr>;
          })}{!monitoring.regionalRows.length && <tr><td colSpan={5}>No monitoring probes for this scope.</td></tr>}</tbody>
        </table></div>
      </Panel>
      <Panel title="Needs attention" description="Items that require your action.">
        <Link className={styles.attention} href="/dashboard/approvals"><ClipboardCheck size={24} color="var(--ad-purple)" /><div><strong>{formatNumber(approvals.length)} changes awaiting review</strong><p>Open the approval queue</p></div><ChevronRight size={17} /></Link>
        <Link className={styles.attention} href="/dashboard/enquiries"><MessageSquare size={24} color="var(--ad-blue)" /><div><strong>{formatNumber(unassigned.length)} {unassigned.length === 1 ? "enquiry" : "enquiries"} unassigned</strong><p>Open enquiries need an owner</p></div><ChevronRight size={17} /></Link>
      </Panel>
      <Panel title="Recent activity" description="Latest changes across your workspace.">
        {overview.activity.map((event) => <div key={event.id} className={styles.activity}>
          <FileText size={21} />
          <div><strong>{event.action}</strong><p>{event.resource} · {event.actor}</p><p>{event.date || event.at || event.createdAt}</p></div>
        </div>)}
        {!overview.activity.length && <p className="workspace-small workspace-muted">No workspace activity yet.</p>}
        <Button href="/dashboard/audit" variant="ghost">View audit history <ChevronRight size={15} /></Button>
      </Panel>
    </div>
    <Panel><div className={styles.quickActions}>
      <div><h2>Quick actions</h2><p>Common tasks to keep your website and operations running.</p></div>
      {quickActions.filter(({href}) => can(href.includes("applications") ? "Applications" : href.includes("website-controls") ? "Website Controls" : "Content & Media", "view")).map(({ icon: Icon, label, href }) => <Link key={href} href={href}><Icon size={23} />{label}<ChevronRight size={18} /></Link>)}
    </div></Panel>
  </div>;
}
