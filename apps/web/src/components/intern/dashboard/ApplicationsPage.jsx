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
  Star,
  Video,
} from "lucide-react";
import { useDashboard } from "./DashboardProvider";
import { useInternship } from "@/components/intern/InternshipProvider";
import { bulkActionsFor, canBulkUpdate, runBulk, runBulkRequests } from "@/lib/intern/bulk.mjs";
import { burstFrom } from "@/lib/confetti.mjs";
import {
  APPLICATION_EXPORT_COLUMNS,
  fetchAllPages,
  applicationExportRow,
} from "@/lib/intern/application-export.mjs";
import { hasStaffPermission } from "./staffAccess";
import { useInternQuery, useInternSearch } from "../useInternQuery";
import QueryStatus from "./QueryStatus";
import ResumeViewer from "./ResumeViewer";
import { useBookmarks } from "./useBookmarks";
import {
  Avatar,
  BookmarkToggle,
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
import ApplicationsBoard from "./ApplicationsBoard";
import EraseApplicantPanel from "./EraseApplicantPanel";
import { internScheduleLabel } from "@/lib/intern/opportunities.mjs";

const STATUSES = [
  "Applied",
  "Under Review",
  "Shortlisted",
  "Selected",
  "Joined",
  "Rejected",
  "Declined",
  "Withdrawn",
];

function applicationMetric(data, id, label, value, tone, icon) {
  const source = (data.applicationMetrics || data.metrics || []).find(
    (metric) => metric.id === id,
  );
  return { ...source, id, label, value, tone, icon };
}

const VIDEOS_FIRST_KEY = "olentra_applications_videos_first_v1";
const LAYOUT_KEY = "olentra_applications_layout_v1";

export default function ApplicationsPage() {
  const { data, query, setQuery, notify, updateApplication, account } = useDashboard();
  const canReview = hasStaffPermission(account, "applications.review");
  const canResume = hasStaffPermission(account, "resumes.read");
  const [resumeApplication, setResumeApplication] = useState(null);
  const isAdmin = account?.staffRole === "admin";
  const { commands, connected, staffEvents } = useInternship();
  const [selected, setSelected] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkDeletion, setBulkDeletion] = useState(null);
  const [deletePhrase, setDeletePhrase] = useState("");
  const [loadingDeletion, setLoadingDeletion] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [deleteFailures, setDeleteFailures] = useState([]);
  const [deletingApplication, setDeletingApplication] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [boardVersion, setBoardVersion] = useState(0);
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
  const [batch, setBatch] = useState("all");
  // "?assignee=me" (from an assignment alert) opens the page filtered to my reviews.
  const [assignee, setAssignee] = useState(() => (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("assignee") === "me" ? "me" : "all"));
  const reviewersQuery = useInternQuery("staff.reviewers", {}, { enabled: canReview });
  const reviewers = reviewersQuery.data || [];
  const [skill, setSkill] = useState("all");
  // Team bookmarks: show only the candidates someone starred.
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
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
  // Table or kanban board; remembered in this browser.
  const [layout, setLayout] = useState("table");
  useEffect(() => { try { if (localStorage.getItem(LAYOUT_KEY) === "board") setLayout("board"); } catch { /* storage blocked */ } }, []);
  function chooseLayout(next) {
    setLayout(next);
    try { localStorage.setItem(LAYOUT_KEY, next); } catch { /* storage blocked */ }
  }
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  // Saved views: each staff member's own named filter sets, kept on the server.
  const viewsQuery = useInternQuery("view.list", {});
  const savedViews = viewsQuery.data || [];
  const [activeView, setActiveView] = useState("");
  function applyView(viewId) {
    setActiveView(viewId);
    const view = savedViews.find((item) => item.id === viewId);
    if (!view) return;
    const f = view.filters || {};
    setSearch(f.search || ""); setStatus(f.status || "all"); setTrack(f.programId || "all"); setBatch(f.batch || "all"); setVideo(f.video || "all");
    setSkill(f.skill || "all"); setDateFrom(f.dateFrom || ""); setDateTo(f.dateTo || ""); setAssignee(f.assignee || "all"); setBookmarkedOnly(f.bookmarked === "true");
    if (f.sortKey) setSort({ key: f.sortKey, direction: f.sortDirection === "asc" ? "asc" : "desc" });
    setPage(1);
  }
  async function saveView() {
    const name = window.prompt("Name this view", savedViews.find((item) => item.id === activeView)?.name || "")?.trim();
    if (!name) return;
    const result = await commands.saveView(name, { search, status, programId: track, batch, video, skill, dateFrom, dateTo, assignee, bookmarked: bookmarkedOnly, sortKey: sort.key, sortDirection: sort.direction });
    if (!result.ok) { notify(typeof result.error === "string" ? result.error : result.error?.message || "Could not save the view."); return; }
    notify(`Saved “${name}”.`);
    setActiveView(result.data.id);
    void viewsQuery.refresh();
  }
  async function deleteView() {
    const view = savedViews.find((item) => item.id === activeView);
    if (!view || !window.confirm(`Delete the saved view “${view.name}”?`)) return;
    const result = await commands.deleteView(view.id);
    if (!result.ok) { notify("Could not delete the view."); return; }
    setActiveView("");
    void viewsQuery.refresh();
  }
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [sort, setSort] = useState({ key: "appliedOn", direction: "desc" });
  const [editingApplication, setEditingApplication] = useState(null);
  const [nextStatus, setNextStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const activeFilters =
    Number(status !== "all") +
    Number(batch !== "all") +
    Number(video !== "all") +
    Number(assignee !== "all") +
    Number(bookmarkedOnly) +
    Number(skill !== "all") +
    Number(Boolean(dateFrom)) +
    Number(Boolean(dateTo));
  const invalidDateRange = Boolean(dateFrom && dateTo && dateFrom > dateTo);

  useEffect(() => {
    setPage(1);
  }, [query, search, track, status, batch, video, skill, dateFrom, dateTo, pageSize, bookmarkedOnly]);
  // Selection is scoped to the rows on screen; any change of view clears it.
  useEffect(() => {
    setSelected(new Set());
  }, [query, search, track, status, batch, video, skill, dateFrom, dateTo, pageSize, page, sort.key, sort.direction, videosFirst, bookmarkedOnly]);

  const debouncedSearch = useInternSearch(search);
  const debouncedQuery = useInternSearch(query);
  const queryParams = { search: debouncedSearch, query: debouncedQuery, status, programId: track, batch, video, skill, dateFrom, dateTo, ...(assignee === "all" ? {} : { assignee }), ...(bookmarkedOnly ? { bookmarked: true } : {}) };
  const listQuery = useInternQuery("application.list", { ...queryParams, page, pageSize, sortField: sort.key, sortDirection: sort.direction, videosFirst }, { enabled: !invalidDateRange });
  // Tab-count summary must NOT include programId — otherwise switching tracks
  // causes the facet response to be scoped to a single program and the other
  // tabs show stale / zero counts.  Every other filter (status, search, date
  // range, assignee, video) still applies so the counts stay contextually
  // accurate; only the program dimension is kept unfiltered for the tab badges.
  const { programId: _excludeProgram, ...tabSummaryParams } = queryParams;
  const tabSummaryQuery = useInternQuery("application.list", { ...tabSummaryParams, skill: "all", page: 1, pageSize: 1, facets: true }, { enabled: !invalidDateRange });
  // Filtered summary: includes the selected programId for stat cards, metric
  // cards, skill facets, and video counts that should reflect the active tab.
  const summaryQuery = useInternQuery("application.list", { ...queryParams, skill: "all", page: 1, pageSize: 1, facets: true }, { enabled: !invalidDateRange });
  refreshListsRef.current = () => { void listQuery.refresh(); void tabSummaryQuery.refresh(); void summaryQuery.refresh(); };
  const bookmarks = useBookmarks({ commands, notify, onChanged: () => Promise.all([listQuery.refresh(), tabSummaryQuery.refresh(), summaryQuery.refresh()]) });
  const result = listQuery.data || { items: [], total: 0 };
  const tabSummary = tabSummaryQuery.data;
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
  const trackTabs = [{ id: "all", label: "All", count: tabSummary?.total }, ...(data.programs || []).map(program => ({ id: program.id, label: program.name, count: tabSummary ? tabSummary.counts?.programs?.[program.id] || 0 : undefined }))];
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
    setActiveView("");
    setQuery("");
    setSearch("");
    setTrack("all");
    setStatus("all");
    setBatch("all");
    setVideo("all");
    setAssignee("all");
    setBookmarkedOnly(false);
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

  const selectable = canReview ? displayed.filter((application) => isAdmin || canBulkUpdate(application, { isAdmin })) : [];
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
    const rows = selectedRows.filter((application) => canBulkUpdate(application, { isAdmin }) && application.status !== action.status);
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
      void tabSummaryQuery.refresh();
      void summaryQuery.refresh();
    } finally {
      setBulkBusy(false);
      setConfirmReject(null);
    }
  }

  async function prepareDeletion(all = false) {
    if (!isAdmin || bulkBusy || loadingDeletion) return;
    setLoadingDeletion(true);
    setDeletePhrase("");
    setDeleteFailures([]);
    setDeleteProgress(0);
    try {
      // Freeze the full unfiltered list before asking for confirmation.
      const rows = all ? (await fetchAllPages((page) => commands.listApplications({ page, pageSize: 100, sortField: "appliedOn", sortDirection: "asc" }), { max: Infinity })).items : selectedRows;
      const unique = [...new Map(rows.map((row) => [row.id, row])).values()];
      if (!unique.length) { notify("No applications to delete."); return; }
      setBulkDeletion({ all, rows: unique });
    } catch (error) { notify(error?.message || "Could not load applications for deletion."); }
    finally { setLoadingDeletion(false); }
  }

  async function deleteApplications(event) {
    event.preventDefault();
    if (!isAdmin || bulkBusy || !bulkDeletion || deletePhrase !== `DELETE ${bulkDeletion.rows.length}`) return;
    setBulkBusy(true);
    setDeleteProgress(0);
    try {
      const { succeeded, failed } = await runBulk(bulkDeletion.rows, async (application) => {
        try { return await commands.eraseApplicant(application.id, application.email); }
        finally { setDeleteProgress((value) => value + 1); }
      }, 2);
      setSelected(new Set(failed.map(({ item }) => item.id)));
      setDeleteFailures(failed);
      notify(`${succeeded.length} applications permanently deleted. ${failed.length ? `${failed.length} could not be deleted; review the details.` : ""}`);
      setBoardVersion((value) => value + 1);
      refreshListsRef.current?.();
      if (!failed.length) setBulkDeletion(null);
      else { setBulkDeletion({ all: false, rows: failed.map(({ item }) => item) }); setDeletePhrase(""); }
    } finally { setBulkBusy(false); }
  }

  async function assignSelected(assigneeId) {
    if (bulkBusy || !selectedRows.length) return;
    setBulkBusy(true);
    try {
      const result = await commands.assignApplications(selectedRows.map((application) => application.id), assigneeId);
      if (!result.ok) { notify(typeof result.error === "string" ? result.error : result.error?.message || "Could not assign these applications."); return; }
      const name = result.data?.assigneeName;
      notify(name ? `${selectedRows.length} ${selectedRows.length === 1 ? "application" : "applications"} assigned to ${name}.` : `${selectedRows.length} unassigned.`);
      setSelected(new Set());
      void listQuery.refresh();
    } finally {
      setBulkBusy(false);
    }
  }

  async function bookmarkSelected(bookmarked) {
    if (bulkBusy || !selectedRows.length) return;
    setBulkBusy(true);
    try {
      const count = selectedRows.length;
      const result = await bookmarks.setBookmarked(selectedRows, bookmarked);
      if (!result) return;
      const noun = `${count} ${count === 1 ? "applicant" : "applicants"}`;
      notify(bookmarked ? `${noun} bookmarked.` : `Bookmark removed from ${noun}.`);
      setSelected(new Set());
    } finally {
      setBulkBusy(false);
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
        {isAdmin && <Button variant="danger" disabled={bulkBusy || loadingDeletion} onClick={() => void prepareDeletion(true)}>{loadingDeletion ? "Loading applications…" : "Delete all"}</Button>}
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
            <label>
              Batch
              <select
                value={batch}
                onChange={(event) => { setBatch(event.target.value); setPage(1); }}
              >
                <option value="all">All batches</option>
                {[...new Set([...(summary?.batches || []), ...(batch !== "all" ? [batch] : [])])].map((name) => (
                  <option key={name} value={name}>{name}</option>
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
              Assigned
              <select value={assignee} onChange={(event) => { setAssignee(event.target.value); setPage(1); }}>
                <option value="all">Anyone</option>
                <option value="me">Assigned to me</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </label>
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
            <button
              type="button"
              className={`${styles.videosFirst} ${bookmarkedOnly ? styles.videosFirstOn : ""}`}
              aria-pressed={bookmarkedOnly}
              onClick={() => { setBookmarkedOnly((value) => !value); setPage(1); }}
              title="Show only candidates the team bookmarked"
            >
              <Star size={14} aria-hidden="true" fill={bookmarkedOnly ? "currentColor" : "none"} />
              Bookmarked{summary?.counts?.bookmarked != null ? ` (${summary.counts.bookmarked})` : ""}
            </button>
            <div className={styles.layoutToggle} role="group" aria-label="Layout">
              <button type="button" aria-pressed={layout === "table"} onClick={() => chooseLayout("table")}>Table</button>
              <button type="button" aria-pressed={layout === "board"} onClick={() => chooseLayout("board")}>Board</button>
            </div>
            <label className={styles.pageSize}>
              View
              <select aria-label="Saved views" value={activeView} onChange={(event) => applyView(event.target.value)}>
                <option value="">{savedViews.length ? "Choose a saved view" : "No saved views"}</option>
                {savedViews.map((view) => <option key={view.id} value={view.id}>{view.name}</option>)}
              </select>
            </label>
            <Button variant="ghost" onClick={() => void saveView()}>Save view</Button>
            {activeView && <Button variant="ghost" onClick={() => void deleteView()}>Delete view</Button>}
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
              <button type="button" className={styles.bulkButton} disabled={bulkBusy} onClick={() => void bookmarkSelected(true)}>Bookmark</button>
              <button type="button" className={styles.bulkButton} disabled={bulkBusy} onClick={() => void bookmarkSelected(false)}>Remove bookmark</button>
              {isAdmin && <button type="button" className={`${styles.bulkButton} ${styles.bulkDanger}`} disabled={bulkBusy || loadingDeletion} onClick={() => void prepareDeletion(false)}>Delete selected</button>}
              {reviewers.length > 0 && (
                <select
                  className={styles.bulkButton}
                  aria-label="Assign selected applications"
                  value=""
                  disabled={bulkBusy}
                  onChange={(event) => { if (event.target.value) void assignSelected(event.target.value === "none" ? null : event.target.value); }}
                >
                  <option value="">Assign to…</option>
                  {reviewers.map((reviewer) => <option key={reviewer.id} value={reviewer.id}>{reviewer.name}</option>)}
                  <option value="none">Unassign</option>
                </select>
              )}
              <button type="button" className={styles.bulkClear} disabled={bulkBusy} onClick={() => setSelected(new Set())}>
                Clear
              </button>
            </div>
            {bulkBusy && <span className={styles.bulkWorking} role="status">Updating…</span>}
          </div>
        )}
        {layout === "board" ? (
          <ApplicationsBoard key={boardVersion} onDelete={setDeletingApplication} queryParams={queryParams} isAdmin={isAdmin} commands={commands} notify={notify} bookmarks={bookmarks} canBookmark={canReview} onChanged={() => { void listQuery.refresh(); void tabSummaryQuery.refresh(); void summaryQuery.refresh(); }} />
        ) : filtered.length ? (
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
                  <th
                    aria-sort={
                      sort.key === "score"
                        ? sort.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <SortHeading label="Score" sortKey="score" />
                  </th>
                  <th>Reviewer</th>
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
                          disabled={bulkBusy || (!isAdmin && !canBulkUpdate(application, { isAdmin }))}
                          title={canBulkUpdate(application, { isAdmin }) ? undefined : "Only an admin can change a final decision"}
                          onChange={() => toggleRow(application.id)}
                        />
                      </td>
                    )}
                    <td>
                      <div className={styles.applicantCell}>
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
                        <BookmarkToggle
                          bookmarked={bookmarks.isBookmarked(application)}
                          name={application.name}
                          by={application.bookmarkedByName}
                          on={application.bookmarkedOn}
                          canEdit={canReview}
                          busy={bookmarks.isBusy(application)}
                          onToggle={(next) => void bookmarks.setBookmarked([application], next)}
                        />
                      </div>
                    </td>
                    <td>
                      <TrackBadge programId={application.programId} />
                      <small>{internScheduleLabel(application.schedule)}</small>
                    </td>
                    <td className={styles.collegeCell}>
                      {application.college || "Not provided"}
                    </td>
                    <td>{formatDate(application.appliedOn)}</td>
                    <td>
                      <StatusBadge status={application.status} />
                    </td>
                    <td className={styles.scoreCell}>
                      {typeof application.score === "number" ? application.score.toFixed(1) : <span aria-label="Not scored">—</span>}
                    </td>
                    <td className={styles.reviewerCell}>{application.assignedToName || <span aria-label="Unassigned">—</span>}</td>
                    <td className={styles.actionCell}>
                      <RowMenu
                        items={[
                          {
                            label: "View application",
                            href: `/intern/dashboard/applications/${application.id}`,
                          },
                          ...(canResume && application.resumeAttachmentId ? [{ label: "View resume", onClick: () => setResumeApplication(application) }] : []),
                          ...(isAdmin ? [{ label: "Delete application", danger: true, onClick: () => setDeletingApplication(application) }] : []),
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
              title={bookmarkedOnly && !invalidDateRange ? "No bookmarked applications" : "No applications found"}
              description={
                invalidDateRange
                  ? "Choose a valid application date range."
                  : bookmarkedOnly
                    ? "Star a candidate to find them here, or widen the other filters."
                    : "Try a different search, track, or status filter."
              }
            />
            <Button variant="secondary" onClick={resetFilters}>
              Clear filters
            </Button>
          </div>
        ) : null}
        {layout === "table" && listQuery.data && <div className={styles.paginationRow}>
          <Pagination
            page={currentPage}
            pageSize={pageSize}
            total={result.total}
            onChange={setPage}
          />
        </div>}
      </Panel>

      <Modal
        open={Boolean(bulkDeletion)}
        onOpenChange={(open) => { if (!open && !bulkBusy) setBulkDeletion(null); }}
        title={bulkDeletion?.all ? "Delete all applications?" : "Delete selected applications?"}
        description={`${bulkDeletion?.rows.length || 0} applications and linked accounts, files, messages and internship records will be permanently deleted. ${bulkDeletion?.all ? "Includes all pages, regardless of current filters. Only applications listed below are included." : "Only the listed applications are included."} Active internships are protected and will be skipped. This cannot be undone.`}
      >
        <form className={styles.modalForm} onSubmit={deleteApplications}>
          <details><summary>Review {bulkDeletion?.rows.length || 0} applications</summary><ul style={{ maxHeight: 180, overflowY: "auto" }}>{bulkDeletion?.rows.map((row) => <li key={row.id}>{row.name} — {row.email}</li>)}</ul></details>
          {deleteFailures.length > 0 && <div role="alert"><p>These applications were not deleted:</p><ul style={{ maxHeight: 180, overflowY: "auto" }}>{deleteFailures.map(({ item, error }) => <li key={item.id}>{item.name}: {error}</li>)}</ul></div>}
          <label>Type DELETE {bulkDeletion?.rows.length || 0} to confirm<input autoComplete="off" spellCheck={false} value={deletePhrase} disabled={bulkBusy} onChange={(event) => setDeletePhrase(event.target.value)} /></label>
          {bulkBusy && <p role="status">Processed {deleteProgress} of {bulkDeletion?.rows.length || 0}. Keep this page open until deletion finishes.</p>}
          <div className={styles.modalActions}>
            <Button variant="secondary" type="button" disabled={bulkBusy} onClick={() => setBulkDeletion(null)}>Cancel</Button>
            <Button variant="danger" type="submit" disabled={bulkBusy || deletePhrase !== `DELETE ${bulkDeletion?.rows.length}`}>{bulkBusy ? "Deleting…" : "Delete permanently"}</Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={Boolean(deletingApplication)}
        onOpenChange={(open) => { if (!open && !deleteBusy) setDeletingApplication(null); }}
        title="Permanently delete application?"
        description={deletingApplication ? `Delete ${deletingApplication.name}’s application and linked records. This cannot be undone.` : ""}
      >
        {deletingApplication && <EraseApplicantPanel key={deletingApplication.id} application={deletingApplication} commands={commands} notify={notify} onBusyChange={setDeleteBusy} onDeleted={(id) => {
          setDeletingApplication(null);
          setSelected((current) => { const next = new Set(current); next.delete(id); return next; });
          setBoardVersion((value) => value + 1);
          refreshListsRef.current?.();
        }} />}
        <Button variant="secondary" disabled={deleteBusy} onClick={() => setDeletingApplication(null)}>Cancel</Button>
      </Modal>
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
      {canResume && <ResumeViewer application={resumeApplication} open={Boolean(resumeApplication)} onOpenChange={(open) => !open && setResumeApplication(null)} />}
    </div>
  );
}
