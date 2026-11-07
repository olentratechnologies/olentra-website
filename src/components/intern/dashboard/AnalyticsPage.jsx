"use client";

import { useId, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  Maximize2,
  Search,
  TrendingUp,
} from "lucide-react";
import { useDashboard } from "./DashboardProvider";
import {
  EmptyState,
  Modal,
  PageHeader,
  Panel,
  StatCards,
  Tabs,
  TrackBadge,
} from "./DashboardUI";
import ui from "./pages.module.css";
import styles from "./analytics.module.css";

const number = (value) => Number(value || 0).toLocaleString("en-US");
const percent = (value, total) =>
  total ? `${((value / total) * 100).toFixed(1)}%` : "0%";

function TrackPerformance({ months, large = false }) {
  const id = `track-bars-${useId().replace(/:/g, "")}`;
  const [hovered, setHovered] = useState(null);
  const maximum = Math.max(
    500,
    Math.ceil(
      Math.max(
        ...months.flatMap((month) => [month.explorer, month.innovator]),
        0,
      ) / 500,
    ) * 500,
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
                stroke="#cfdbf8"
                strokeDasharray={step ? "3 3" : undefined}
                strokeWidth=".8"
              />
              <text
                x="29"
                y={y(value) + 4}
                textAnchor="end"
                fontSize="11"
                fill="#536b9e"
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
              aria-label={`${month.label}: Explorer ${number(month.explorer)}, Innovator ${number(month.innovator)}`}
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
                fill="#536b9e"
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

function Funnel({ stages, detailed = false }) {
  return (
    <div
      className={`${styles.funnel} ${detailed ? styles.detailedFunnel : ""}`}
    >
      <svg
        className={styles.funnelDiagram}
        viewBox="0 0 240 260"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id="analytics-funnel-blue"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop stopColor="#afd1ff" />
            <stop offset="1" stopColor="#80bbff" />
          </linearGradient>
          <linearGradient
            id="analytics-funnel-cyan"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop stopColor="#7dc8ff" />
            <stop offset="1" stopColor="#5daaff" />
          </linearGradient>
          <linearGradient
            id="analytics-funnel-green"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop stopColor="#68d2d1" />
            <stop offset="1" stopColor="#39b8c5" />
          </linearGradient>
          <linearGradient
            id="analytics-funnel-purple"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop stopColor="#6881ff" />
            <stop offset="1" stopColor="#6654ff" />
          </linearGradient>
          <filter id="analytics-funnel-shadow">
            <feDropShadow
              dx="0"
              dy="4"
              stdDeviation="4"
              floodColor="#798dff"
              floodOpacity=".15"
            />
          </filter>
        </defs>
        {[
          { top: 15, left: 13, right: 227, inset: 22, fill: "blue" },
          { top: 77, left: 40, right: 200, inset: 19, fill: "cyan" },
          { top: 139, left: 64, right: 176, inset: 15, fill: "green" },
          { top: 201, left: 84, right: 156, inset: 13, fill: "purple" },
        ].map((segment) => (
          <path
            key={segment.fill}
            d={`M ${segment.left + 5} ${segment.top} H ${segment.right - 5} Q ${segment.right + 3} ${segment.top} ${segment.right - 1} ${segment.top + 8} L ${segment.right - segment.inset} ${segment.top + 46} Q ${segment.right - segment.inset - 2} ${segment.top + 50} ${segment.right - segment.inset - 6} ${segment.top + 50} H ${segment.left + segment.inset + 6} Q ${segment.left + segment.inset + 2} ${segment.top + 50} ${segment.left + segment.inset} ${segment.top + 46} L ${segment.left + 1} ${segment.top + 8} Q ${segment.left - 3} ${segment.top} ${segment.left + 5} ${segment.top} Z`}
            fill={`url(#analytics-funnel-${segment.fill})`}
            filter="url(#analytics-funnel-shadow)"
          />
        ))}
      </svg>
      <ol className={styles.funnelStages}>
        {stages.map((stage, index) => (
          <li key={stage.id}>
            <span>
              {stage.label}
              {detailed && (
                <small>
                  {index === 0
                    ? "Your applicant pool"
                    : `${percent(stage.value, stages[index - 1].value)} from previous stage`}
                </small>
              )}
            </span>
            <strong>{number(stage.value)}</strong>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function AnalyticsPage() {
  const { data } = useDashboard();
  const [tab, setTab] = useState("overview");
  const [range, setRange] = useState("6m");
  const [expanded, setExpanded] = useState(false);
  const [skillQuery, setSkillQuery] = useState("");
  const allMonths = [
    ...(data.analytics?.previousMonths || []),
    ...(data.analytics?.months || []),
  ];
  const months = allMonths.slice(-{ "3m": 3, "6m": 6, "1y": 12 }[range]);
  const applicants = data.applications || [];
  const latestApplication = applicants.reduce(
    (latest, applicant) =>
      applicant.appliedOn > latest ? applicant.appliedOn : latest,
    "2026-11-02",
  );
  const firstMonth = new Date(
    Date.UTC(
      Number(latestApplication.slice(0, 4)),
      Number(latestApplication.slice(5, 7)) -
        1 -
        { "3m": 2, "6m": 5, "1y": 11 }[range],
      1,
    ),
  )
    .toISOString()
    .slice(0, 10);
  const periodApplicants = useMemo(
    () =>
      applicants.filter(
        (applicant) =>
          applicant.appliedOn >= firstMonth &&
          applicant.appliedOn <= latestApplication,
      ),
    [applicants, firstMonth, latestApplication],
  );
  const values = {
    views: Math.round(
      ((data.analytics?.views || 0) * periodApplicants.length) /
        Math.max(1, applicants.length),
    ),
    applications: periodApplicants.length,
    shortlisted: periodApplicants.filter((applicant) =>
      ["Shortlisted", "Selected", "Joined"].includes(applicant.status),
    ).length,
    selected: periodApplicants.filter((applicant) =>
      ["Selected", "Joined"].includes(applicant.status),
    ).length,
    joined: periodApplicants.filter(
      (applicant) => applicant.status === "Joined",
    ).length,
  };
  const metricById = Object.fromEntries(
    (data.metrics || []).map((metric) => [metric.id, metric]),
  );
  const items = [
    {
      ...metricById.applications,
      id: "views",
      label: "Total Views",
      value: values.views,
      change: 18,
      tone: "blue",
      icon: "users",
    },
    {
      ...metricById.shortlisted,
      id: "applications",
      label: "Applications",
      value: values.applications,
      change: 12,
      tone: "green",
      icon: "check",
    },
    { ...metricById.selected, value: values.selected },
    { ...metricById.joined, label: "Joined", value: values.joined },
  ];
  const stages = [
    { id: "applications", label: "Applications", value: values.applications },
    { id: "shortlisted", label: "Shortlisted", value: values.shortlisted },
    { id: "selected", label: "Selected", value: values.selected },
    { id: "joined", label: "Joined", value: values.joined },
  ];
  const trackStats = useMemo(
    () =>
      (data.programs || []).map((program) => {
        const applications = periodApplicants.filter(
          (application) => application.programId === program.id,
        );
        const ids = new Set(applications.map((application) => application.id));
        const interns = (data.interns || []).filter((intern) =>
          ids.has(intern.applicationId),
        );
        return {
          ...program,
          applications: applications.length,
          selected: applications.filter((application) =>
            ["Selected", "Joined"].includes(application.status),
          ).length,
          interns: interns.length,
        };
      }),
    [data, periodApplicants],
  );
  const periodSkills = (data.analytics?.skills || [])
    .map((skill) => ({
      ...skill,
      count: periodApplicants.filter((applicant) =>
        applicant.skills?.includes(skill.name),
      ).length,
    }))
    .sort((first, second) => second.count - first.count);
  const skills = periodSkills.filter((skill) =>
    skill.name.toLowerCase().includes(skillQuery.toLowerCase()),
  );
  const highestSkill = Math.max(...periodSkills.map((skill) => skill.count), 1);

  const chartHeader = (button = true) => (
    <div className={styles.chartHeader}>
      <h2>Track Performance</h2>
      <div className={styles.chartHeaderRight}>
        <div className={styles.legend}>
          <span>
            <i className={styles.blueDot} />
            Explorer
          </span>
          <span>
            <i className={styles.purpleDot} />
            Innovator
          </span>
        </div>
        {button && (
          <button
            className={styles.iconButton}
            onClick={() => setExpanded(true)}
            aria-label="Expand track performance chart"
          >
            <Maximize2 size={16} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className={ui.page}>
      <PageHeader
        title="Analytics"
        description="Deep insights into your internship program"
      >
        <label className={styles.rangeSelect}>
          <CalendarDays size={16} />
          <select
            value={range}
            onChange={(event) => setRange(event.target.value)}
            aria-label="Analytics date range"
          >
            <option value="3m">Last 3 Months</option>
            <option value="6m">Last 6 Months</option>
            <option value="1y">Last 12 Months</option>
          </select>
          <ChevronDown size={14} />
        </label>
      </PageHeader>
      <Tabs
        label="Analytics views"
        value={tab}
        onChange={setTab}
        items={[
          { id: "overview", label: "Overview" },
          { id: "comparison", label: "Track Comparison" },
          { id: "funnel", label: "Conversion Funnel" },
          { id: "skills", label: "Skills Analysis" },
        ]}
      />
      <StatCards items={items} />

      {tab === "overview" && (
        <div className={styles.analyticsGrid}>
          <Panel className={styles.performancePanel}>
            {chartHeader()}
            <TrackPerformance months={months} />
            <div className={styles.chartFootnote}>
              <span>Applications by month</span>
              <span>
                <TrendingUp size={14} /> Growing together, one builder at a time
              </span>
            </div>
          </Panel>
          <Panel className={styles.funnelPanel}>
            <h2 className={styles.sectionTitle}>Conversion Funnel</h2>
            <Funnel stages={stages} />
            <div className={styles.funnelFootnote}>
              <span>Application to internship</span>
              <strong>
                {percent(values.joined, values.applications)}{" "}
                <ArrowUpRight size={13} />
              </strong>
            </div>
          </Panel>
        </div>
      )}

      {tab === "comparison" && (
        <>
          <Panel className={styles.comparisonPanel}>
            {chartHeader()}
            <TrackPerformance months={months} />
            <div className={styles.comparisonCards}>
              {trackStats.map((track) => (
                <article className={styles.trackSummary} key={track.id}>
                  <div>
                    <TrackBadge programId={track.id} label={track.name} />
                    <span>{track.detail}</span>
                  </div>
                  <strong>
                    {number(track.applications)}
                    <small>applications</small>
                  </strong>
                  <div className={styles.trackSummaryBottom}>
                    <span>{number(track.interns)} interns</span>
                    <span>
                      {percent(track.interns, track.applications)} joined
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </Panel>
          <Panel className={styles.comparisonTablePanel}>
            <h2 className={styles.sectionTitle}>
              Track comparison at a glance
            </h2>
            <div className={ui.tableWrap}>
              <table className={ui.table}>
                <thead>
                  <tr>
                    <th>Track</th>
                    <th>Applications</th>
                    <th>Selected</th>
                    <th>Joined</th>
                    <th>Joining rate</th>
                  </tr>
                </thead>
                <tbody>
                  {trackStats.map((track) => (
                    <tr key={track.id}>
                      <td>
                        <TrackBadge programId={track.id} label={track.name} />
                      </td>
                      <td>{number(track.applications)}</td>
                      <td>{number(track.selected)}</td>
                      <td>{number(track.interns)}</td>
                      <td>
                        <span className={styles.positive}>
                          {percent(track.interns, track.applications)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}

      {tab === "funnel" && (
        <div className={styles.conversionGrid}>
          <Panel className={styles.detailedFunnelPanel}>
            <div className={styles.chartHeader}>
              <h2>From interest to impact</h2>
              <span className={styles.periodNote}>
                {range === "3m"
                  ? "Last 3 months"
                  : range === "1y"
                    ? "Last 12 months"
                    : "Last 6 months"}
              </span>
            </div>
            <p className={styles.description}>
              Follow every step of your internship application journey.
            </p>
            <Funnel stages={stages} detailed />
          </Panel>
          <div className={styles.conversionSteps}>
            {stages.slice(1).map((stage, index) => (
              <Panel key={stage.id} className={styles.conversionStep}>
                <span className={styles.stepIndex}>0{index + 1}</span>
                <div>
                  <span>
                    {stages[index].label} <ArrowRight size={13} /> {stage.label}
                  </span>
                  <strong>{percent(stage.value, stages[index].value)}</strong>
                  <small>{number(stage.value)} candidates moved forward</small>
                </div>
                <div className={styles.conversionProgress}>
                  <span
                    style={{
                      width: percent(stage.value, stages[index].value),
                      background: ["#438dff", "#40bfbc", "#8771ff"][index],
                    }}
                  />
                </div>
              </Panel>
            ))}
          </div>
        </div>
      )}

      {tab === "skills" && (
        <Panel className={styles.skillsPanel}>
          <div className={styles.chartHeader}>
            <div>
              <h2>Skills across your talent pool</h2>
              <p className={styles.description}>
                Discover what your next generation of builders brings to the
                table.
              </p>
            </div>
            <label className={styles.skillSearch}>
              <Search size={16} />
              <input
                value={skillQuery}
                onChange={(event) => setSkillQuery(event.target.value)}
                placeholder="Find a skill..."
                aria-label="Search skills"
              />
            </label>
          </div>
          {skills.length ? (
            <div className={styles.skillsGrid}>
              {skills.map((skill, index) => (
                <article className={styles.skillRow} key={skill.name}>
                  <div>
                    <span className={styles.skillRank}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <strong>{skill.name}</strong>
                    <span>{number(skill.count)} applicants</span>
                  </div>
                  <div className={styles.skillBar}>
                    <span
                      style={{
                        width: `${(skill.count / highestSkill) * 100}%`,
                        background:
                          index % 2
                            ? "linear-gradient(90deg,#ad8bff,#8764f4)"
                            : "linear-gradient(90deg,#69c6ff,#3e8aff)",
                      }}
                    />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No matching skills"
              description="Try searching for another skill."
            />
          )}
        </Panel>
      )}

      <Modal
        open={expanded}
        onOpenChange={setExpanded}
        title="Track Performance"
        description="Compare monthly applications across both internship tracks."
      >
        <div className={styles.expandedChart}>
          <div className={styles.legend}>
            <span>
              <i className={styles.blueDot} />
              Tech Explorer
            </span>
            <span>
              <i className={styles.purpleDot} />
              Tech Innovator
            </span>
          </div>
          <TrackPerformance months={months} large />
        </div>
      </Modal>
    </div>
  );
}
