"use client";

import { useId, useMemo, useState } from "react";
import { CalendarDays, ChevronDown, Maximize2, Search } from "lucide-react";
import { useDashboard } from "./DashboardProvider";
import { EmptyState, Modal, PageHeader, Panel, StatCards, Tabs, TrackBadge } from "./DashboardUI";
import ui from "./pages.module.css";
import styles from "./analytics.module.css";

const number = value => Number(value || 0).toLocaleString("en-US");
const percent = (value, total) => total ? `${((value / total) * 100).toFixed(1)}%` : "0%";

function TrackPerformance({ months, large = false }) {
  const id = `track-bars-${useId().replace(/:/g, "")}`;
  const [hovered, setHovered] = useState(null);
  const maximum = Math.max(
    4,
    Math.ceil(Math.max(...months.flatMap((month) => [month.explorer, month.innovator]), 0) / 4) * 4,
  );
  const chart = { left: 43, right: 624, top: 20, bottom: 239 };
  const groupWidth = (chart.right - chart.left) / Math.max(months.length, 1);
  const barWidth = Math.min(29, groupWidth * 0.28);
  const y = (value) =>
    chart.bottom - (value / maximum) * (chart.bottom - chart.top);
  const active = hovered === null ? null : months[hovered];

  return (
    <div className={`${styles.barChart} ${large ? styles.largeChart : ""}`}>
      <svg
        viewBox="0 0 648 280"
        preserveAspectRatio="none"
        role="img"
        aria-label="Monthly applications by internship track"
        onMouseLeave={() => setHovered(null)}
      >
        <title>Monthly applications for Tech Explorer and Tech Innovator</title>
        <defs>
          <linearGradient id={`${id}-blue`} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#53c5ff" />
            <stop offset="1" stopColor="#2481ff" />
          </linearGradient>
          <linearGradient id={`${id}-purple`} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#b68bff" />
            <stop offset="1" stopColor="#7c4cff" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((step) => {
          const value = (maximum * step) / 4;
          return (
            <g key={step}>
              <line
                x1={chart.left}
                x2={chart.right}
                y1={y(value)}
                y2={y(value)}
                stroke="var(--ad-chart-grid, #cfdbf8)"
                strokeDasharray={step ? "3 3" : undefined}
                strokeWidth=".8"
              />
              <text
                x="29"
                y={y(value) + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--ad-muted, #536b9e)"
              >
                {value >= 1000 ? `${value / 1000}K` : value}
              </text>
            </g>
          );
        })}
        {months.map((month, index) => {
          const center = chart.left + groupWidth * (index + 0.5);
          return (
            <g
              key={`${month.label}-${index}`}
              tabIndex={0}
              role="button"
              aria-label={`${month.month || month.label}: Explorer ${number(month.explorer)}, Innovator ${number(month.innovator)}`}
              onFocus={() => setHovered(index)}
              onBlur={() => setHovered(null)}
              onMouseEnter={() => setHovered(index)}
              onClick={() => setHovered(index)}
            >
              <rect
                x={center - groupWidth * 0.44}
                y={chart.top}
                width={groupWidth * 0.88}
                height={chart.bottom - chart.top}
                fill={hovered === index ? "#759cff0b" : "transparent"}
                rx="6"
              />
              <rect
                x={center - barWidth - 2}
                y={y(month.explorer)}
                width={barWidth}
                height={chart.bottom - y(month.explorer)}
                rx="4"
                fill={`url(#${id}-blue)`}
              />
              <rect
                x={center + 2}
                y={y(month.innovator)}
                width={barWidth}
                height={chart.bottom - y(month.innovator)}
                rx="4"
                fill={`url(#${id}-purple)`}
              />
              <text
                x={center}
                y="263"
                textAnchor="middle"
                fontSize={months.length > 8 ? "9" : "11"}
                fill="var(--ad-muted, #536b9e)"
              >
                {month.label}
              </text>
            </g>
          );
        })}
      </svg>
      {active && (
        <div
          className={styles.chartTooltip}
          style={{
            left: `${Math.min(76, Math.max(6, ((hovered + 0.5) / months.length) * 100 - 9))}%`,
          }}
        >
          <strong>{active.label}</strong>
          <span>
            <i className={styles.blueDot} />
            Explorer <b>{number(active.explorer)}</b>
          </span>
          <span>
            <i className={styles.purpleDot} />
            Innovator <b>{number(active.innovator)}</b>
          </span>
        </div>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const { data } = useDashboard();
  const [tab, setTab] = useState("overview");
  const [range, setRange] = useState("6m");
  const [expanded, setExpanded] = useState(false);
  const [skillQuery, setSkillQuery] = useState("");
  const stats = data.analytics || {}, counts = stats.statusCounts || {};
  const total = stats.totalApplications || 0;
  const months = (stats.months || []).slice(-({ "3m": 3, "6m": 6, "1y": 12 }[range]));
  const statuses = ["Applied", "Under Review", "Shortlisted", "Selected", "Joined", "Rejected", "Declined"];
  const skills = useMemo(() => (stats.skills || []).filter(skill => skill.name.toLowerCase().includes(skillQuery.trim().toLowerCase())), [stats.skills, skillQuery]);
  const highestSkill = Math.max(1, ...(stats.skills || []).map(skill => skill.count));
  const items = [
    { id: "applications", label: "Applications · all time", value: total, tone: "blue", icon: "users" },
    { id: "shortlisted", label: "Currently shortlisted", value: counts.Shortlisted || 0, tone: "purple", icon: "users" },
    { id: "selected", label: "Currently selected", value: counts.Selected || 0, tone: "green", icon: "check" },
    { id: "joined", label: "Joined", value: counts.Joined || 0, tone: "orange", icon: "users" },
  ];
  const chartHeader = <div className={styles.chartHeader}><h2>Track performance</h2><div className={styles.chartHeaderRight}><div className={styles.legend}><span><i className={styles.blueDot}/>Explorer</span><span><i className={styles.purpleDot}/>Innovator</span></div><button type="button" className={styles.iconButton} onClick={() => setExpanded(true)} aria-label="Expand track performance chart"><Maximize2 size={16}/></button></div></div>;
  const statusPanel = <Panel className={styles.funnelPanel}><h2 className={styles.sectionTitle}>Current application status</h2><p className={styles.description}>Each application is counted in its current status.</p><div className={styles.skillsGrid}>{statuses.map((status, index) => <div className={styles.skillRow} key={status}><div><span className={styles.skillRank}>{String(index + 1).padStart(2, "0")}</span><strong>{status}</strong><span>{number(counts[status])}</span></div><div className={styles.skillBar}><span style={{ width: percent(counts[status] || 0, total), background: index % 2 ? "linear-gradient(90deg,#ad8bff,#8764f4)" : "linear-gradient(90deg,#69c6ff,#3e8aff)" }}/></div></div>)}</div></Panel>;
  return <div className={ui.page}>
    <PageHeader title="Analytics" description="Insights from real internship records"><label className={styles.rangeSelect}><CalendarDays size={16}/><select value={range} onChange={event => setRange(event.target.value)} aria-label="Monthly chart date range"><option value="3m">Last 3 Months</option><option value="6m">Last 6 Months</option><option value="1y">Last 12 Months</option></select><ChevronDown size={14}/></label></PageHeader>
    <Tabs label="Analytics views" value={tab} onChange={setTab} items={[{ id: "overview", label: "Overview" }, { id: "comparison", label: "Track Comparison" }, { id: "statuses", label: "Application Status" }, { id: "skills", label: "Skills Analysis" }]}/>
    <StatCards items={items}/>
    {tab === "overview" && <div className={styles.analyticsGrid}><Panel className={styles.performancePanel}>{chartHeader}<TrackPerformance months={months}/><div className={styles.chartFootnote}><span>Applications by calendar month</span><span>Totals above cover all time</span></div></Panel>{statusPanel}</div>}
    {tab === "comparison" && <Panel className={styles.comparisonPanel}>{chartHeader}<TrackPerformance months={months}/><div className={styles.comparisonCards}>{(data.programs || []).map(program => <article className={styles.trackSummary} key={program.id}><div><TrackBadge programId={program.id} label={program.name}/></div><strong>{number(stats.byTrack?.[program.id])}<small>applications · all time</small></strong><div className={styles.trackSummaryBottom}><span>{percent(stats.byTrack?.[program.id] || 0, total)} of all applications</span></div></article>)}</div></Panel>}
    {tab === "statuses" && <div className={styles.analyticsGrid}>{statusPanel}<Panel className={styles.detailedFunnelPanel}><h2 className={styles.sectionTitle}>About these counts</h2><p className={styles.description}>These totals show current application statuses, including rejected and declined applications. They do not represent historical conversion rates.</p></Panel></div>}
    {tab === "skills" && <Panel className={styles.skillsPanel}><div className={styles.chartHeader}><div><h2>Skills across your talent pool</h2><p className={styles.description}>Skills recorded on all applications.</p></div><label className={styles.skillSearch}><Search size={16}/><input value={skillQuery} onChange={event => setSkillQuery(event.target.value)} placeholder="Find a skill..." aria-label="Search skills"/></label></div>{skills.length ? <div className={styles.skillsGrid}>{skills.map((skill, index) => <article className={styles.skillRow} key={skill.name}><div><span className={styles.skillRank}>{String(index + 1).padStart(2, "0")}</span><strong>{skill.name}</strong><span>{number(skill.count)} applicants</span></div><div className={styles.skillBar}><span style={{ width: `${skill.count / highestSkill * 100}%`, background: index % 2 ? "linear-gradient(90deg,#ad8bff,#8764f4)" : "linear-gradient(90deg,#69c6ff,#3e8aff)" }}/></div></article>)}</div> : <EmptyState title={skillQuery ? "No matching skills" : "No skills recorded yet"} description={skillQuery ? "Try another search." : "Skills appear here when applicants add them."}/>}</Panel>}
    <Modal open={expanded} onOpenChange={setExpanded} title="Track Performance" description="Monthly applications across both internship tracks."><div className={styles.expandedChart}><div className={styles.legend}><span><i className={styles.blueDot}/>Tech Explorer</span><span><i className={styles.purpleDot}/>Tech Innovator</span></div><TrackPerformance months={months} large/></div></Modal>
  </div>;
}
