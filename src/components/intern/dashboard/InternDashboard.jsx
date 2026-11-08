"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import * as Popover from "@radix-ui/react-popover";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ClipboardCheck,
  Download,
  House,
  Lightbulb,
  Menu,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useDashboard } from "./DashboardProvider";
import { hasStaffPermission } from "./staffAccess";
import { usePathname, useRouter } from "next/navigation";
import { exportCsv } from "./DashboardUI";
import {
  ApplicationsAreaChart,
  GrowthArtwork,
  InsightGlyph,
  MetricGlyph,
  PlanetArtwork,
  ProgramDonut,
  Sparkline,
} from "./DashboardVisuals";
import styles from "./dashboard.module.css";

const icons = {
  home: House,
  clipboard: ClipboardCheck,
  chart: ChartNoAxesCombined,
  users: Users,
  briefcase: BriefcaseBusiness,
  certificate: ShieldCheck,
  settings: Settings,
  download: Download,
  send: Send,
  application: ClipboardCheck,
};
const colors = {
  blue: "#2583ff",
  green: "#12b889",
  purple: "#9852ff",
  orange: "#ff9c29",
};
const subtitles = {
  applications: "Every new opportunity to learn, build, and grow.",
  analytics: "A closer look at how your internship program is growing.",
  interns: "Meet the people building what comes next.",
  projects: "Real-world work. Meaningful progress.",
  certificates: "Celebrate every milestone and achievement.",
  settings: "Make your internship workspace work for you.",
};
const formatDate = (value) =>
  new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

function Avatar({ application }) {
  return (
    <span
      className={styles.personAvatar}
      style={{ "--avatar-color": application.avatarColor }}
      aria-hidden="true"
    >
      {application.initials}
    </span>
  );
}

function Status({ value }) {
  return (
    <span className={styles.status} data-status={value.toLowerCase()}>
      {value}
    </span>
  );
}

export default function InternDashboard() {
  const {
    data,
    seed,
    query,
    dateRange,
    setDateRange,
    notify,
    setNotificationDialog,
    account,
  } = useDashboard();
  const canApplications = hasStaffPermission(account, "applications.read");
  const canNotifications = hasStaffPermission(account, "notifications.read");
  const [periodId, setPeriodId] = useState("1Y");
  const router = useRouter();
  const section = "dashboard";
  useEffect(() => {
    setPeriodId(
      data.dateRanges.find((range) => range.id === dateRange)?.chartPeriod ||
        "1Y",
    );
  }, [dateRange, data.dateRanges]);
  const applications = data.applications;
  const activities = data.activity;
  const period =
    data.chart.periods.find((item) => item.id === periodId) ||
    data.chart.periods[0];
  const filteredApplications = applications.filter((application) =>
    `${application.name} ${application.email} ${application.program} ${application.status}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const metrics = data.metrics.map((metric) => {
    const range = seed.metricsByRange?.[dateRange]?.find(
      (item) => item.id === metric.id,
    );
    const initial =
      seed.metrics.find((item) => item.id === metric.id)?.value || 1;
    return {
      ...metric,
      ...(range || {}),
      value:
        dateRange === "30d"
          ? metric.value
          : Math.round((metric.value * (range?.value || initial)) / initial),
    };
  });
  function navigate(next) {
    router.push(
      next === "dashboard" ? "/intern/dashboard" : `/intern/dashboard/${next}`,
    );
  }
  function changeDateRange(value) {
    setDateRange(value);
    setPeriodId(
      data.dateRanges.find((range) => range.id === value).chartPeriod,
    );
  }
  function exportReport() {
    exportCsv(
      "olentra-internship-report.csv",
      ["Name", "Email", "Program", "Applied On", "Status"],
      filteredApplications.map((item) => [
        item.name,
        item.email,
        item.program,
        item.appliedOn,
        item.status,
      ]),
    );
    notify("Your internship report has been exported.");
  }
  function quickAction(id) {
    if (id === "export") exportReport();
    else if (id === "notifications") setNotificationDialog(true);
    else navigate(id);
  }
  const setSelectedApplication = (application) =>
    router.push(`/intern/dashboard/applications/${application.id}`);
  const activityList = (all = false) => (
    <ol className={styles.activityList}>
      {activities.slice(0, all ? 10 : 4).map((activity) => {
        const Icon = icons[activity.icon] || ClipboardCheck;
        return (
          <li key={activity.id}>
            <span className={styles.activityIcon} data-tone={activity.tone}>
              <Icon size={15} strokeWidth={2.2} />
            </span>
            <div>
              <div className={styles.activityLine}>
                <strong>{activity.title}</strong>
                <time>{activity.time}</time>
              </div>
              <p>{activity.detail}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );

  return (
    <>
      <div className={styles.welcomeRow}>
        <div>
          <h1>
            {section === "dashboard" ? (
              <>
                Welcome back, {data.user.firstName}!{" "}
                <span
                  className={styles.wave}
                  role="img"
                  aria-label="Waving hand"
                >
                  👋
                </span>
              </>
            ) : (
              data.navigation.find((item) => item.id === section)?.label
            )}
          </h1>
          <p>
            {section === "dashboard"
              ? "Here’s what’s happening with your Olentra Internship Program."
              : subtitles[section]}
          </p>
        </div>
        <label className={styles.dateSelect}>
          <CalendarDays size={19} />
          <select
            aria-label="Dashboard date range"
            value={dateRange}
            onChange={(event) => changeDateRange(event.target.value)}
          >
            {data.dateRanges.map((range) => (
              <option key={range.id} value={range.id}>
                {range.label}
              </option>
            ))}
          </select>
          <ChevronDown size={15} />
        </label>
      </div>

      <>
        <section
          className={styles.metrics}
          aria-label="Internship program statistics"
        >
          {metrics.map((metric) => (
            <article
              key={metric.id}
              className={styles.metricCard}
              data-tone={metric.tone}
            >
              <MetricGlyph
                type={metric.icon}
                tone={metric.tone}
                className={styles.metricGlyph}
              />
              <div className={styles.metricText}>
                <strong>{metric.value.toLocaleString("en-US")}</strong>
                <span>{metric.label}</span>
              </div>
              {metric.change != null && <span className={styles.metricChange}><ArrowUp size={15} strokeWidth={2.5} /> +{metric.change}%</span>}
              <div className={styles.sparkline}>
                <Sparkline
                  values={metric.trend}
                  color={colors[metric.tone]}
                  id={metric.id}
                />
              </div>
            </article>
          ))}
        </section>

        <div className={styles.dashboardGrid}>
          <div className={styles.primaryColumn}>
            <div className={styles.chartsRow}>
              <section
                className={`${styles.panel} ${styles.overview}`}
                aria-labelledby="applications-overview-title"
              >
                <div className={styles.panelHeader}>
                  <h2 id="applications-overview-title">
                    <ChartNoAxesCombined
                      className={styles.headingChartIcon}
                      size={23}
                    />{" "}
                    Applications Overview
                  </h2>
                  <div className={styles.periodTabs} aria-label="Chart period">
                    {data.chart.periods
                      .filter((item) => item.id !== "7D")
                      .map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setPeriodId(item.id)}
                          aria-pressed={periodId === item.id}
                          className={
                            periodId === item.id ? styles.periodActive : ""
                          }
                        >
                          {item.label}
                        </button>
                      ))}
                  </div>
                </div>
                <div className={styles.chartLegend}>
                  {data.programs.map((program) => (
                    <span key={program.id}>
                      <i style={{ background: program.color }} />
                      {program.name}
                    </span>
                  ))}
                </div>
                <div className={styles.chartBody}>
                  <ApplicationsAreaChart
                    period={period}
                    className={styles.areaChart}
                  />

                </div>
              </section>
              <section
                className={`${styles.panel} ${styles.programSplit}`}
                aria-labelledby="program-split-title"
              >
                <h2 id="program-split-title">
                  <span className={styles.programHeadingIcon}>✥</span> Program
                  Split
                </h2>
                <ProgramDonut
                  programs={data.programs}
                  className={styles.programDonut}
                />
                <div className={styles.programLegend}>
                  {data.programs.map((program) => (
                    <div key={program.id}>
                      <i style={{ background: program.color }} />
                      <span>
                        {program.name}
                        <small>({program.detail})</small>
                      </span>
                      <strong>{program.share}%</strong>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className={styles.bottomRow}>
              <section
                className={`${styles.panel} ${styles.insights}`}
                aria-labelledby="key-insights-title"
              >
                <h2 id="key-insights-title">
                  <Lightbulb size={23} className={styles.bulbIcon} /> Key
                  Insights
                </h2>
                <div className={styles.insightGrid}>
                  {data.insights.map((insight) => (
                    <article key={insight.id} className={styles.insightCard}>
                      <InsightGlyph
                        type={insight.icon}
                        className={styles.insightGlyph}
                      />
                      <strong>{insight.value}</strong>
                      <p>
                        {insight.label}
                        {insight.change != null && (
                          <span>
                            (
                            {insight.change < 0 ? (
                              <ArrowDown size={13} />
                            ) : (
                              <ArrowUp size={13} />
                            )}{" "}
                            {insight.change > 0 ? "+" : ""}
                            {Math.abs(insight.change)}%)
                          </span>
                        )}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
              {canApplications && <section
                className={`${styles.panel} ${styles.recentApplications}`}
                aria-labelledby="recent-applications-title"
              >
                <div className={styles.panelHeader}>
                  <h2 id="recent-applications-title">Recent Applications</h2>
                  <button
                    className={styles.viewAll}
                    onClick={() => navigate("applications")}
                  >
                    View All <ArrowRight size={13} />
                  </button>
                </div>
                <div className={styles.tableScroll}>
                  <table className={styles.recentTable}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Program</th>
                        <th>Applied On</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredApplications.slice(0, 5).map((application) => (
                        <tr key={application.id}>
                          <td>
                            <button
                              onClick={() =>
                                setSelectedApplication(application)
                              }
                            >
                              <Avatar application={application} />
                              {application.name}
                            </button>
                          </td>
                          <td>{application.program}</td>
                          <td>{formatDate(application.appliedOn)}</td>
                          <td>
                            <Status value={application.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredApplications.length === 0 && (
                    <p className={styles.emptyState}>
                      No applications match “{query}”.
                    </p>
                  )}
                </div>
              </section>}
            </div>
          </div>

          <div className={styles.rightRail}>
            <section
              className={styles.quickActions}
              aria-labelledby="quick-actions-title"
            >
              <PlanetArtwork className={styles.quickPlanet} />
              <div className={styles.quickOrbit} />
              <h2 id="quick-actions-title">
                <Zap size={23} fill="#ffe3a5" stroke="#fff3ca" /> Quick Actions
              </h2>
              <div className={styles.quickActionList}>
                {data.quickActions.map((action) => {
                  const Icon = icons[action.icon] || ArrowRight;
                  return (
                    <button
                      key={action.id}
                      onClick={() => quickAction(action.id)}
                    >
                      <Icon size={19} />
                      <span>{action.label}</span>
                      {action.id !== "export" && (
                        <ArrowRight size={16} className={styles.quickArrow} />
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
            {canNotifications && <section
              className={`${styles.panel} ${styles.activity}`}
              aria-labelledby="recent-activity-title"
            >
              <div className={styles.panelHeader}>
                <h2 id="recent-activity-title">Recent Activity</h2>
                <Popover.Root>
                  <Popover.Trigger asChild>
                    <button className={styles.activityViewAll}>
                      View All <ArrowRight size={12} />
                    </button>
                  </Popover.Trigger>
                  <Popover.Portal>
                    <Popover.Content
                      className={`${styles.popover} ${styles.notificationsPopover}`}
                      align="end"
                      sideOffset={10}
                      collisionPadding={16}
                    >
                      <div className={styles.popoverHeading}>
                        <h2>All activity</h2>
                      </div>
                      {activityList(true)}
                    </Popover.Content>
                  </Popover.Portal>
                </Popover.Root>
              </div>
              {activityList()}
            </section>}
          </div>
        </div>
      </>
    </>
  );
}
