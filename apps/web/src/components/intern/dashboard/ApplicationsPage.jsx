"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpDown,
  Check,
  RotateCcw,
  SlidersHorizontal,
  Video,
} from "lucide-react";
import { useDashboard } from "./DashboardProvider";
import { useInternship } from "@/components/intern/InternshipProvider";
import { bulkActionsFor, canBulkUpdate, runBulkRequests } from "@/lib/intern/bulk.mjs";
import { burstFrom } from "@/lib/confetti.mjs";
import {
  APPLICATION_EXPORT_COLUMNS,
  fetchAllPages,
  applicationExportRow,
} from "@/lib/intern/application-export.mjs";
import { hasStaffPermission } from "./staffAccess";
import { useInternQuery, useInternSearch } from "../useInternQuery";
import QueryStatus from "./QueryStatus";
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

const VIDEOS_FIRST_KEY = "olentra_applications_videos_first_v1";

export default function ApplicationsPage() {
  const { data, query, setQuery, notify, updateApplication, account } = useDashboard();
  const canReview = hasStaffPermission(account, "applications.review");
  const isAdmin = account?.staffRole === "admin";
  const { commands, connected, staffEvents } = useInternship();
  const [selected, setSelected] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmReject, setConfirmReject] = useState(null);
  // Rows that just arrived through a live "new application" event get a brief highlight.
  const [freshIds, setFreshIds] = useState(() => new Set());
  const refreshListsRef = useRef(null);
  useEffect(() => {
    if (!connected || !staffEvents) return undefined;
    const timers = [];
    const stop = staffEvents.listen(({ applicationId }) => {
      if (!applicationId) return;
      setFreshIds((current) => new Set(current).add(applicationId));
      refreshListsRef.current?.();
      timers.push(setTimeout(() => setFreshIds((current) => { const next = new Set(current); next.delete(applicationId); return next; }), 6500));
    });
    return () => { stop(); timers.forEach(clearTimeout); };
  }, [connected, staffEvents]);
  const [search, setSearch] = useState("");
  const [track, setTrack] = useState("all");
  const [status, setStatus] = useState("all");
  const [video, setVideo] = useState("all");
  const [skill, setSkill] = useState("all");
  // "Videos first" is a per-reviewer preference, remembered in this browser only.
  const [videosFirst, setVideosFirst] = useState(false);
  useEffect(() => { try { setVideosFirst(localStorage.getItem(VIDEOS_FIRST_KEY) === "1"); } catch { /* storage blocked */ } }, []);
  function toggleVideosFirst() {
    setVideosFirst((value) => {
      try { localStorage.setItem(VIDEOS_FIRST_KEY, value ? "0" : "1"); } catch { /* storage blocked */ }
      return !value;
    });
    setPage(1);
  }
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [sort, setSort] = useState({ key: "appliedOn", direction: "desc" });
  const [editingApplication, setEditingApplication] = useState(null);
  const [nextStatus, setNextStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const activeFilters =
    Number(status !== "all") +
    Number(video !== "all") +
    Number(skill !== "all") +
    Number(Boolean(dateFrom)) +
    Number(Boolean(dateTo));
  const invalidDateRange = Boolean(dateFrom && dateTo && dateFrom > dateTo);

  useEffect(() => {
    setPage(1);
  }, [query, search, track, status, video, skill, dateFrom, dateTo, pageSize]);
  // Selection is scoped to the rows on screen; any change of view clears it.
  useEffect(() => {
    setSelected(new Set());
  }, [query, search, track, status, video, skill, dateFrom, dateTo, pageSize, page, sort.key, sort.direction, videosFirst]);

  const debouncedSearch = useInternSearch(search);
  const debouncedQuery = useInternSearch(query);
  const queryParams = { search: debouncedSearch, query: debouncedQuery, status, programId: track, video, skill, dateFrom, dateTo };
  const listQuery = useInternQuery("application.list", { ...queryParams, page, pageSize, sortField: sort.key, sortDirection: sort.direction, videosFirst }, { enabled: !invalidDateRange });
  const summaryQuery = useInternQuery("application.list", { ...queryParams, skill: "all", page: 1, pageSize: 1, facets: true }, { enabled: !invalidDateRange });
  refreshListsRef.current = () => { void listQuery.refresh(); void summaryQuery.refresh(); };
  const result = listQuery.data || { items: [], total: 0 };
  const summary = summaryQuery.data;
  useEffect(() => {
    if (!listQuery.data || page <= 1) return;
    const lastPage = Math.max(1, Math.ceil(listQuery.data.total / pageSize));
    if (page > lastPage) setPage(lastPage);
  }, [listQuery.data, page, pageSize]);
  const applications = result.items;
  const filtered = applications;
  const currentPage = page;
  const displayed = applications;
  const trackTabs = [{ id: "all", label: "All", count: summary?.total }, ...(data.programs || []).map(program => ({ id: program.id, label: program.name, count: summary ? summary.counts?.programs?.[program.id] || 0 : undefined }))];
  const metricItems = [applicationMetric(data, "applications", "Total Applications", summary?.total ?? "—", "blue", "users"), applicationMetric(data, "under-review", "Under Review", summary ? summary.counts?.statuses?.["Under Review"] || 0 : "—", "orange", "users"), applicationMetric(data, "shortlisted", "Shortlisted", summary ? summary.counts?.statuses?.Shortlisted || 0 : "—", "green", "check"), applicationMetric(data, "rejected", "Rejected", summary ? summary.counts?.statuses?.Rejected || 0 : "—", "purple", "users")];

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
    setVideo("all");
    setSkill("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  const [exporting, setExporting] = useState(false);
  // Exports every application matching the current filters, not just this page.
  async function exportApplications() {
    if (exporting) return;
    setExporting(true);
    try {
      const { items, total, capped } = await fetchAllPages((number) => commands.listApplications({ ...queryParams, page: number, pageSize: 100, sortField: sort.key, sortDirection: sort.direction, videosFirst }));
      exportCsv("olentra-applications.csv", APPLICATION_EXPORT_COLUMNS, items.map(applicationExportRow));
      notify(capped
        ? `Exported the first ${items.length.toLocaleString()} of ${total.toLocaleString()} matching applications. Narrow the filters to export the rest.`
        : `${items.length.toLocaleString()} matching ${items.length === 1 ? "application" : "applications"} exported.`);
    } catch (error) {
      notify(error?.message || "Couldn't export the applications. Please try again.");
    } finally {
      setExporting(false);
    }
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
          }, editingApplication.version)) === false
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

  const selectable = canReview ? displayed.filter((application) => canBulkUpdate(application, { isAdmin })) : [];
  const selectedRows = selectable.filter((application) => selected.has(application.id));
  const allSelected = selectable.length > 0 && selectedRows.length === selectable.length;
  function toggleRow(id) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(selectable.map((application) => application.id)));
  }
  async function applyBulk(action, trigger) {
    if (bulkBusy || !selectedRows.length) return;
    const rows = selectedRows.filter((application) => application.status !== action.status);
    const unchanged = selectedRows.length - rows.length;
    setBulkBusy(true);
    try {
      // One request per 25 rows; the server applies each row with the normal single-update rules.
      const { succeeded, failed } = await runBulkRequests(rows, (chunk) => commands.bulkSetApplicationStatus(chunk.map((application) => ({ id: application.id, expectedVersion: application.version })), action.status));
      const verb = { "Under Review": "moved to under review", Shortlisted: "shortlisted", Rejected: "rejected" }[action.status];
      const parts = [`${succeeded.length} ${succeeded.length === 1 ? "applicant" : "applicants"} ${verb}`];
      if (unchanged) parts.push(`${unchanged} already ${action.status.toLowerCase()}`);
      if (failed.length) parts.push(`${failed.length} skipped — changed by someone else or not allowed`);
      notify(parts.join(" · ") + ".");
      if (succeeded.length && action.status !== "Rejected") burstFrom(trigger, { count: 60 });
      setSelected(new Set(failed.map(({ item }) => item.id)));
      void listQuery.refresh();
      void summaryQuery.refresh();
    } finally {
      setBulkBusy(false);
      setConfirmReject(null);
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
        <Button variant="secondary" onClick={exportApplications} disabled={!listQuery.data || !filtered.length || invalidDateRange || exporting}>
          <ArrowDownToLine size={16} />
          {exporting ? "Exporting…" : `Export ${result.total > filtered.length ? `all ${result.total.toLocaleString()}` : "CSV"}`}
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
                onChange={(event) => { setStatus(event.target.value); setPage(1); }}
              >
                <option value="all">All statuses</option>
                {STATUSES.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <fieldset className={styles.skillFilters}>
              <legend>Skills</legend>
              <div>
                {(summary?.counts?.skills || []).map(({ name }) => (
                  <button
                    key={name}
                    type="button"
                    className={skill === name ? styles.skillFilterActive : ""}
                    aria-pressed={skill === name}
                    onClick={() => { setSkill(skill === name ? "all" : name); setPage(1); }}
                  >
                    {name}
                  </button>
                ))}
                {!summary?.counts?.skills?.length && <span>No skills listed</span>}
              </div>
            </fieldset>
            <label>
              Intro video
              <select
                value={video}
                onChange={(event) => { setVideo(event.target.value); setPage(1); }}
              >
                <option value="all">Any</option>
                <option value="with">Has intro video{summary?.counts?.withVideo != null ? ` (${summary.counts.withVideo})` : ""}</option>
                <option value="without">No intro video</option>
              </select>
            </label>
            <label>
              Applied from
              <input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(event) => { setDateFrom(event.target.value); setPage(1); }}
              />
            </label>
            <label>
              Applied until
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(event) => { setDateTo(event.target.value); setPage(1); }}
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
      <QueryStatus query={summaryQuery} label="application totals" compact/>

      <Panel className={styles.applicationsPanel} aria-busy={listQuery.loading || listQuery.refreshing}>
        <div className={styles.applicationTabs}>
          <Tabs
            items={trackTabs}
            value={track}
            onChange={value => { setTrack(value); setPage(1); }}
            label="Application track"
          />
        </div>
        <div className={styles.listToolbar}>
          <SearchBox
            value={search}
            onChange={value => { setSearch(value); setPage(1); }}
            placeholder="Search applicants, college, email, or skill..."
          />
          <div className={styles.listToolbarRight}>
            <button
              type="button"
              className={`${styles.videosFirst} ${videosFirst ? styles.videosFirstOn : ""}`}
              aria-pressed={videosFirst}
              onClick={toggleVideosFirst}
              title="Show applicants who shared an intro video at the top"
            >
              <Video size={14} aria-hidden="true" />
              Videos first
            </button>
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
                onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
              </select>
            </label>
          </div>
        </div>
        <QueryStatus query={listQuery} label="applications"/>
        {selectedRows.length > 0 && (
          <div className={styles.bulkBar} role="toolbar" aria-label="Bulk actions">
            <strong>{selectedRows.length} selected</strong>
            <div className={styles.bulkActions}>
              {bulkActionsFor({ isAdmin }).map((action) => (
                <button
                  key={action.status}
                  type="button"
                  className={`${styles.bulkButton} ${action.danger ? styles.bulkDanger : ""}`}
                  disabled={bulkBusy}
                  onClick={(event) => (action.danger ? setConfirmReject({ action, trigger: event.currentTarget }) : applyBulk(action, event.currentTarget))}
                >
                  {action.label}
                </button>
              ))}
              <button type="button" className={styles.bulkClear} disabled={bulkBusy} onClick={() => setSelected(new Set())}>
                Clear
              </button>
            </div>
            {bulkBusy && <span className={styles.bulkWorking} role="status">Updating…</span>}
          </div>
        )}
        {filtered.length ? (
          <div className={`${common.tableWrap} ${styles.applicationTableWrap}`}>
            <table className={`${common.table} ${styles.applicationTable}`}>
              <thead>
                <tr>
                  {canReview && (
                    <th className={styles.selectCell}>
                      <input
                        type="checkbox"
                        aria-label="Select all applicants on this page"
                        checked={allSelected}
                        ref={(element) => { if (element) element.indeterminate = selectedRows.length > 0 && !allSelected; }}
                        disabled={!selectable.length || bulkBusy}
                        onChange={toggleAll}
                      />
                    </th>
                  )}
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
                  <tr key={application.id} className={`${selected.has(application.id) ? styles.rowSelected : ""} ${freshIds.has(application.id) ? styles.rowFresh : ""}`}>
                    {canReview && (
                      <td className={styles.selectCell}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${application.name}`}
                          checked={selected.has(application.id)}
                          disabled={bulkBusy || !canBulkUpdate(application, { isAdmin })}
                          title={canBulkUpdate(application, { isAdmin }) ? undefined : "Only an admin can change a final decision"}
                          onChange={() => toggleRow(application.id)}
                        />
                      </td>
                    )}
                    <td>
                      <Link
                        className={styles.applicantLink}
                        href={`/intern/dashboard/applications/${application.id}`}
                      >
                        <Avatar person={application} size={31} />
                        <span>{application.name}</span>
                        {application.hasVideo && (
                          <span className={styles.videoBadge} title="Intro video shared">
                            <Video size={12} aria-hidden="true" />
                            <span className={styles.srOnlyText}>Intro video shared</span>
                          </span>
                        )}
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
                          ...(canReview && (isAdmin || ["Applied", "Under Review", "Shortlisted"].includes(application.status)) ? [{
                            label: "Update status",
                            onClick: () => {
                              setEditingApplication(application);
                              setNextStatus(application.status);
                            },
                          }] : []),
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : listQuery.data || invalidDateRange ? (
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
        ) : null}
        {listQuery.data && <div className={styles.paginationRow}>
          <Pagination
            page={currentPage}
            pageSize={pageSize}
            total={result.total}
            onChange={setPage}
          />
        </div>}
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
                    (!isAdmin && !["Applied", "Under Review", "Shortlisted"].includes(value) && value !== editingApplication?.status) || (value === "Joined" &&
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
      <Modal
        open={Boolean(confirmReject)}
        onOpenChange={(open) => !open && !bulkBusy && setConfirmReject(null)}
        title={`Reject ${selectedRows.length} ${selectedRows.length === 1 ? "applicant" : "applicants"}?`}
        description="Each applicant is notified in their portal that their application was not selected. You can change a decision later from the applicant’s page."
      >
        <div className={styles.modalActions}>
          <Button variant="secondary" type="button" disabled={bulkBusy} onClick={() => setConfirmReject(null)}>
            Cancel
          </Button>
          <Button type="button" disabled={bulkBusy} onClick={() => applyBulk(confirmReject.action, confirmReject.trigger)}>
            {bulkBusy ? "Rejecting…" : "Reject applicants"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
