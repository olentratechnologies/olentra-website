"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpDown,
  Check,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { useDashboard } from "./DashboardProvider";
import {
  Avatar,
  Button,
  EmptyState,
  FilterMenu,
  Modal,
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
  formatDate,
} from "./DashboardUI";
import common from "./pages.module.css";
import styles from "./applicant.module.css";

const STATUSES = [
  "Applied",
  "Under Review",
  "Shortlisted",
  "Selected",
  "Joined",
  "Rejected",
  "Declined",
];

function applicationMetric(data, id, label, value, tone, icon) {
  const source = (data.applicationMetrics || data.metrics || []).find(
    (metric) => metric.id === id,
  );
  return { ...source, id, label, value, tone, icon };
}

export default function ApplicationsPage() {
  const { data, query, setQuery, notify, updateApplication } = useDashboard();
  const [search, setSearch] = useState("");
  const [track, setTrack] = useState("all");
  const [status, setStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [sort, setSort] = useState({ key: "appliedOn", direction: "desc" });
  const [editingApplication, setEditingApplication] = useState(null);
  const [nextStatus, setNextStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const applications = data.applications || [];
  const activeFilters =
    Number(status !== "all") +
    Number(Boolean(dateFrom)) +
    Number(Boolean(dateTo));
  const invalidDateRange = Boolean(dateFrom && dateTo && dateFrom > dateTo);

  useEffect(() => {
    setPage(1);
  }, [query, search, track, status, dateFrom, dateTo, pageSize]);

  const filtered = useMemo(() => {
    const globalText = (query || "").trim().toLowerCase();
    const localText = search.trim().toLowerCase();
    return applications
      .filter((application) => {
        const haystack =
          `${application.name} ${application.email} ${application.college || ""} ${application.program} ${application.id} ${application.status}`.toLowerCase();
        return (
          haystack.includes(globalText) &&
          haystack.includes(localText) &&
          (track === "all" || application.programId === track) &&
          (status === "all" || application.status === status) &&
          (!dateFrom || application.appliedOn.slice(0, 10) >= dateFrom) &&
          (!dateTo || application.appliedOn.slice(0, 10) <= dateTo) &&
          !invalidDateRange
        );
      })
      .sort((a, b) => {
        const first = String(a[sort.key] || "");
        const second = String(b[sort.key] || "");
        const comparison = first.localeCompare(second, undefined, {
          numeric: true,
        });
        return (
          (sort.direction === "asc" ? comparison : -comparison) ||
          a.id.localeCompare(b.id)
        );
      });
  }, [
    applications,
    query,
    search,
    track,
    status,
    dateFrom,
    dateTo,
    invalidDateRange,
    sort,
  ]);

  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / pageSize)),
  );
  const displayed = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const trackTabs = [
    { id: "all", label: "All", count: applications.length },
    ...(data.programs || []).map((program) => ({
      id: program.id,
      label: program.name,
      count: applications.filter(
        (application) => application.programId === program.id,
      ).length,
    })),
  ];
  const metricItems = [
    applicationMetric(
      data,
      "applications",
      "Total Applications",
      applications.length,
      "blue",
      "users",
    ),
    applicationMetric(
      data,
      "under-review",
      "Under Review",
      applications.filter(
        (application) => application.status === "Under Review",
      ).length,
      "orange",
      "users",
    ),
    applicationMetric(
      data,
      "shortlisted",
      "Shortlisted",
      applications.filter((application) => application.status === "Shortlisted")
        .length,
      "green",
      "check",
    ),
    applicationMetric(
      data,
      "rejected",
      "Rejected",
      applications.filter((application) => application.status === "Rejected")
        .length,
      "purple",
      "users",
    ),
  ];

  function changeSort(key) {
    setSort((previous) => ({
      key,
      direction:
        previous.key === key && previous.direction === "asc" ? "desc" : "asc",
    }));
    setPage(1);
  }

  function resetFilters() {
    setQuery("");
    setSearch("");
    setTrack("all");
    setStatus("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  function exportApplications() {
    exportCsv(
      "olentra-applications.csv",
      [
        "Application ID",
        "Applicant",
        "Email",
        "Track",
        "College",
        "Applied On",
        "Status",
      ],
      filtered.map((application) => [
        application.id,
        application.name,
        application.email,
        application.program,
        application.college || "",
        application.appliedOn,
        application.status,
      ]),
    );
    notify(`${filtered.length.toLocaleString()} applications exported.`);
  }

  async function saveStatus(event) {
    event.preventDefault();
    if (!editingApplication || !nextStatus || saving) return;
    setSaving(true);
    try {
      if (nextStatus !== editingApplication.status) {
        if (
          (await updateApplication(editingApplication.id, {
            status: nextStatus,
          })) === false
        )
          return;
        notify(
          `${editingApplication.name} is now ${nextStatus.toLowerCase()}.`,
        );
      }
      setEditingApplication(null);
    } finally {
      setSaving(false);
    }
  }

  function SortHeading({ label, sortKey }) {
    const active = sort.key === sortKey;
    const Icon = active
      ? sort.direction === "asc"
        ? ArrowUp
        : ArrowDown
      : ArrowUpDown;
    return (
      <button className={styles.sortButton} onClick={() => changeSort(sortKey)}>
        {label}
        <Icon size={12} aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className={common.page}>
      <PageHeader
        title="Applications"
        description="Manage and review all internship applications."
      >
        <Button variant="secondary" onClick={exportApplications}>
          <ArrowDownToLine size={16} />
          Export
        </Button>
        <FilterMenu>
          <div className={styles.filterFields}>
            <div className={styles.filterHeading}>
              <SlidersHorizontal size={16} />
              <strong>Filter applications</strong>
              {activeFilters > 0 && <span>{activeFilters}</span>}
            </div>
            <label>
              Status
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="all">All statuses</option>
                {STATUSES.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              Applied from
              <input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(event) => setDateFrom(event.target.value)}
              />
            </label>
            <label>
              Applied until
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </label>
            {invalidDateRange && (
              <p className={styles.fieldError}>
                The end date must be on or after the start date.
              </p>
            )}
            <Button variant="ghost" onClick={resetFilters}>
              <RotateCcw size={14} />
              Reset filters
            </Button>
          </div>
        </FilterMenu>
      </PageHeader>

      <StatCards items={metricItems} />

      <Panel className={styles.applicationsPanel}>
        <div className={styles.applicationTabs}>
          <Tabs
            items={trackTabs}
            value={track}
            onChange={setTrack}
            label="Application track"
          />
        </div>
        <div className={styles.listToolbar}>
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search applicants, college, or email..."
          />
          <div className={styles.listToolbarRight}>
            {(activeFilters > 0 || search || track !== "all") && (
              <Button variant="ghost" onClick={resetFilters}>
                <RotateCcw size={13} />
                Reset
              </Button>
            )}
            <label className={styles.pageSize}>
              Rows
              <select
                aria-label="Applications per page"
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
              </select>
            </label>
          </div>
        </div>
        {filtered.length ? (
          <div className={common.tableWrap}>
            <table className={`${common.table} ${styles.applicationTable}`}>
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
                    <SortHeading label="Applicant" sortKey="name" />
                  </th>
                  <th
                    aria-sort={
                      sort.key === "program"
                        ? sort.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <SortHeading label="Track" sortKey="program" />
                  </th>
                  <th
                    aria-sort={
                      sort.key === "college"
                        ? sort.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <SortHeading label="College" sortKey="college" />
                  </th>
                  <th
                    aria-sort={
                      sort.key === "appliedOn"
                        ? sort.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <SortHeading label="Applied On" sortKey="appliedOn" />
                  </th>
                  <th
                    aria-sort={
                      sort.key === "status"
                        ? sort.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <SortHeading label="Status" sortKey="status" />
                  </th>
                  <th className={styles.actionHeading}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((application) => (
                  <tr key={application.id}>
                    <td>
                      <Link
                        className={styles.applicantLink}
                        href={`/intern/dashboard/applications/${application.id}`}
                      >
                        <Avatar person={application} size={31} />
                        <span>{application.name}</span>
                      </Link>
                    </td>
                    <td>
                      <TrackBadge programId={application.programId} />
                    </td>
                    <td className={styles.collegeCell}>
                      {application.college || "Not provided"}
                    </td>
                    <td>{formatDate(application.appliedOn)}</td>
                    <td>
                      <StatusBadge status={application.status} />
                    </td>
                    <td className={styles.actionCell}>
                      <RowMenu
                        items={[
                          {
                            label: "View application",
                            href: `/intern/dashboard/applications/${application.id}`,
                          },
                          {
                            label: "Update status",
                            onClick: () => {
                              setEditingApplication(application);
                              setNextStatus(application.status);
                            },
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyContainer}>
            <EmptyState
              title="No applications found"
              description={
                invalidDateRange
                  ? "Choose a valid application date range."
                  : "Try a different search, track, or status filter."
              }
            />
            <Button variant="secondary" onClick={resetFilters}>
              Clear filters
            </Button>
          </div>
        )}
        <div className={styles.paginationRow}>
          <Pagination
            page={currentPage}
            pageSize={pageSize}
            total={filtered.length}
            onChange={setPage}
          />
        </div>
      </Panel>

      <Modal
        open={Boolean(editingApplication)}
        onOpenChange={(open) => !open && setEditingApplication(null)}
        title="Update application status"
        description={
          editingApplication
            ? `Manage ${editingApplication.name}’s progress through the application process.`
            : ""
        }
      >
        <form className={styles.modalForm} onSubmit={saveStatus}>
          <label>
            Status
            <select
              value={nextStatus}
              onChange={(event) => setNextStatus(event.target.value)}
            >
              {STATUSES.map((value) => (
                <option
                  key={value}
                  disabled={
                    (value === "Joined" &&
                      editingApplication?.status !== "Joined") ||
                    (editingApplication?.status === "Joined" &&
                      value !== "Joined")
                  }
                >
                  {value}
                </option>
              ))}
            </select>
          </label>
          {editingApplication?.status === "Joined" && (
            <p className={styles.mutedText}>
              This applicant has joined the program. Manage their active,
              completed, or dropped status in{" "}
              <Link href="/intern/dashboard/interns">Interns</Link>.
            </p>
          )}
          {editingApplication?.status !== "Joined" && (
            <p className={styles.mutedText}>
              Enrollment is completed by approving onboarding from the
              applicant’s detail page.
            </p>
          )}
          <div className={styles.modalActions}>
            <Button
              variant="secondary"
              type="button"
              onClick={() => setEditingApplication(null)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              <Check size={16} />
              {saving ? "Saving…" : "Save status"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
