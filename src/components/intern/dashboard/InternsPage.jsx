"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  Download,
  Filter,
  X,
} from "lucide-react";
import { useDashboard } from "./DashboardProvider";
import {
  Avatar,
  Button,
  EmptyState,
  PageHeader,
  Pagination,
  Panel,
  RowMenu,
  SearchBox,
  StatCards,
  StatusBadge,
  Tabs,
  TrackBadge,
  exportCsv,
} from "./DashboardUI";
import ui from "./pages.module.css";
import styles from "./analytics.module.css";

export default function InternsPage() {
  const { data, query = "", notify, updateIntern } = useDashboard();
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [track, setTrack] = useState("all");
  const [batch, setBatch] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState({ key: "name", direction: "asc" });
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const interns = useMemo(() => {
    const applicants = new Map(
      (data.applications || []).map((application) => [
        application.id,
        application,
      ]),
    );
    const projects = new Map(
      (data.projects || []).map((project) => [project.id, project]),
    );
    return (data.interns || []).map((intern) => {
      const person = applicants.get(intern.applicationId) || {};
      return {
        ...person,
        ...intern,
        applicationId: intern.applicationId,
        name: person.name || intern.name || "Intern",
        email: person.email || intern.email || "",
        programId: person.programId || intern.programId,
        program: person.program || intern.program,
        projects: (intern.projectIds || [])
          .map((id) => projects.get(id))
          .filter(Boolean),
      };
    });
  }, [data]);
  const count = (status) =>
    interns.filter(
      (intern) => intern.status?.toLowerCase() === status.toLowerCase(),
    ).length;
  const counts = {
    all: interns.length,
    active: count("Active"),
    completed: count("Completed"),
    dropped: count("Dropped"),
  };
  const batches = [
    ...new Set(interns.map((intern) => intern.batch).filter(Boolean)),
  ];
  const baseline = data.metrics?.find((metric) => metric.id === "joined");
  const metrics = [
    {
      ...baseline,
      id: "total",
      label: "Total Interns",
      value: counts.all,
      tone: "orange",
      icon: "trophy",
      change: 15,
    },
    {
      ...baseline,
      id: "active",
      label: "Active",
      value: counts.active,
      tone: "blue",
      icon: "users",
      change: 12,
    },
    {
      ...baseline,
      id: "completed",
      label: "Completed",
      value: counts.completed,
      tone: "green",
      icon: "check",
      change: 8,
    },
    {
      ...baseline,
      id: "dropped",
      label: "Dropped",
      value: counts.dropped,
      tone: "purple",
      icon: "users",
      change: -5,
    },
  ];
  const filtered = interns
    .filter((intern) => {
      const text =
        `${intern.name} ${intern.email} ${intern.batch} ${intern.program} ${intern.projects.map((project) => project.name).join(" ")}`.toLowerCase();
      return (
        text.includes(query.toLowerCase()) &&
        text.includes(search.toLowerCase()) &&
        (tab === "all" || intern.status?.toLowerCase() === tab) &&
        (track === "all" || intern.programId === track) &&
        (batch === "all" || intern.batch === batch)
      );
    })
    .sort((first, second) => {
      const firstValue =
        sort.key === "project"
          ? first.projects[0]?.name || ""
          : first[sort.key] || "";
      const secondValue =
        sort.key === "project"
          ? second.projects[0]?.name || ""
          : second[sort.key] || "";
      return (
        String(firstValue).localeCompare(String(secondValue), undefined, {
          numeric: true,
        }) * (sort.direction === "asc" ? 1 : -1)
      );
    });
  const safePage = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / pageSize)),
  );
  const visible = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );
  const activeFilters = Number(track !== "all") + Number(batch !== "all");

  function updateFilter(setter, value) {
    setter(value);
    setPage(1);
  }

  function changeSort(key) {
    setSort((previous) => ({
      key,
      direction:
        previous.key === key && previous.direction === "asc" ? "desc" : "asc",
    }));
    setPage(1);
  }

  function sortable(label, key) {
    const Icon =
      sort.key === key
        ? sort.direction === "asc"
          ? ArrowUp
          : ArrowDown
        : ArrowUpDown;
    return (
      <button className={styles.sortButton} onClick={() => changeSort(key)}>
        {label}
        <Icon size={12} />
      </button>
    );
  }

  function exportInterns() {
    exportCsv(
      "olentra-interns.csv",
      ["Name", "Email", "Track", "Batch", "Projects", "Status"],
      filtered.map((intern) => [
        intern.name,
        intern.email,
        intern.program,
        intern.batch,
        intern.projects.map((project) => project.name).join("; "),
        intern.status,
      ]),
    );
    notify?.(`${filtered.length.toLocaleString()} intern records exported.`);
  }

  async function changeStatus(intern, status) {
    if ((await updateIntern(intern.id, { status })) === false) return;
    notify?.(`${intern.name} marked as ${status.toLowerCase()}.`);
  }

  return (
    <div className={ui.page}>
      <PageHeader
        title="Interns"
        description="Manage your active and completed interns"
      >
        <div className={styles.headerActions}>
          <Button variant="secondary" onClick={exportInterns}>
            <Download size={16} />
            Export
          </Button>
          <Button
            onClick={() => setShowFilters((open) => !open)}
            aria-expanded={showFilters}
          >
            <Filter size={15} />
            Filter
            {activeFilters > 0 && (
              <span className={styles.filterCount}>{activeFilters}</span>
            )}
            <ChevronDown size={14} />
          </Button>
        </div>
      </PageHeader>
      <StatCards items={metrics} />
      <div className={styles.internTabsRow}>
        <Tabs
          label="Intern status"
          value={tab}
          onChange={(value) => updateFilter(setTab, value)}
          items={[
            { id: "all", label: "All", count: counts.all },
            { id: "active", label: "Active", count: counts.active },
            { id: "completed", label: "Completed", count: counts.completed },
            { id: "dropped", label: "Dropped", count: counts.dropped },
          ]}
        />
        <div className={styles.internSearch}>
          <SearchBox
            value={search}
            onChange={(value) => updateFilter(setSearch, value)}
            placeholder="Search interns..."
          />
        </div>
      </div>
      {showFilters && (
        <Panel className={styles.filterPanel}>
          <div className={styles.filterFields}>
            <label>
              Track
              <select
                value={track}
                onChange={(event) => updateFilter(setTrack, event.target.value)}
              >
                <option value="all">All tracks</option>
                {(data.programs || []).map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Batch
              <select
                value={batch}
                onChange={(event) => updateFilter(setBatch, event.target.value)}
              >
                <option value="all">All batches</option>
                {batches.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
            <Button
              variant="ghost"
              onClick={() => {
                setTrack("all");
                setBatch("all");
                setSearch("");
                setPage(1);
              }}
            >
              <X size={14} />
              Clear filters
            </Button>
          </div>
        </Panel>
      )}
      <Panel className={styles.internTablePanel}>
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th
                  aria-sort={
                    sort.key === "name"
                      ? sort.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  {sortable("Name", "name")}
                </th>
                <th>{sortable("Track", "program")}</th>
                <th>{sortable("Batch", "batch")}</th>
                <th>{sortable("Project", "project")}</th>
                <th>{sortable("Status", "status")}</th>
                <th className={styles.actionsHeading}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((intern) => (
                <tr key={intern.id}>
                  <td>
                    <Link
                      className={styles.internPerson}
                      href={`/intern/dashboard/applications/${intern.applicationId}`}
                    >
                      <Avatar person={intern} size={34} />
                      <span>
                        <strong>{intern.name}</strong>
                        <small>{intern.email}</small>
                      </span>
                    </Link>
                  </td>
                  <td>
                    <TrackBadge programId={intern.programId} />
                  </td>
                  <td>
                    <span className={styles.batchText}>
                      {intern.batch || "—"}
                    </span>
                  </td>
                  <td>
                    {intern.projects.length ? (
                      <Link
                        className={styles.projectLink}
                        href="/intern/dashboard/projects"
                      >
                        {intern.projects[0].name}
                        {intern.projects.length > 1 && (
                          <span>+{intern.projects.length - 1}</span>
                        )}
                      </Link>
                    ) : (
                      <span className={styles.unassigned}>Unassigned</span>
                    )}
                  </td>
                  <td>
                    <StatusBadge status={intern.status} />
                  </td>
                  <td className={styles.rowActions}>
                    <RowMenu
                      items={[
                        {
                          label: "View profile",
                          href: `/intern/dashboard/applications/${intern.applicationId}`,
                        },
                        ...(intern.status === "Completed"
                          ? []
                          : [
                              {
                                label: "Mark as completed",
                                onClick: () =>
                                  changeStatus(intern, "Completed"),
                              },
                            ]),
                        ...(intern.status === "Completed"
                          ? []
                          : intern.status === "Dropped"
                            ? [
                                {
                                  label: "Reactivate intern",
                                  onClick: () => changeStatus(intern, "Active"),
                                },
                              ]
                            : [
                                {
                                  label: "Mark as dropped",
                                  onClick: () =>
                                    changeStatus(intern, "Dropped"),
                                  danger: true,
                                },
                              ]),
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <EmptyState
            title="No interns found"
            description="Try a different search, track, batch, or status."
          />
        )}
        <Pagination
          page={safePage}
          pageSize={pageSize}
          total={filtered.length}
          onChange={setPage}
        />
      </Panel>
    </div>
  );
}
