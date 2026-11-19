"use client";

import { useEffect, useState } from "react";
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
import { hasStaffPermission } from "./staffAccess";
import { useInternQuery, useInternSearch } from "../useInternQuery";
import QueryStatus from "./QueryStatus";
import { useInternHistory } from "@/components/intern/useInternHistory";
import LoadingIndicator from "@olentra/ui/LoadingIndicator";
import {
  Avatar,
  Button,
  EmptyState,
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
} from "./DashboardUI";
import ui from "./pages.module.css";
import styles from "./analytics.module.css";
import TemplatePicker from "./TemplatePicker";
import InternCheckins from "./InternCheckins";

export default function InternsPage() {
  const { data, query = "", notify, updateIntern, commands, account } = useDashboard();
  const isAdmin = account?.staffRole === "admin";
  const canApplications = hasStaffPermission(account, "applications.read");
  const canMessage = hasStaffPermission(account, "messages.interns");
  const [checkinsFor,setCheckinsFor] = useState(null);
  const [recipient,setRecipient] = useState(null), [subject,setSubject] = useState(""), [body,setBody] = useState(""), [sending,setSending] = useState(false), [messageError,setMessageError] = useState("");
  const messages = useInternHistory("messages", { applicationId: recipient?.applicationId, enabled: Boolean(recipient && canMessage), revision: data.messages });
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [track, setTrack] = useState("all");
  const [batch, setBatch] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState({ key: "name", direction: "asc" });
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const debouncedSearch = useInternSearch(search);
  const debouncedQuery = useInternSearch(query);
  const params = { search: debouncedSearch, query: debouncedQuery, programId: track, batch };
  const listQuery = useInternQuery("intern.list", { ...params, status: tab, page, pageSize, sortField: sort.key, sortDirection: sort.direction });
  const summaryQuery = useInternQuery("intern.list", { ...params, status: "all", page: 1, pageSize: 1 });
  const listing = listQuery.data || { items: [], total: 0 };
  // Admins link a mentor (a staff member with the Mentor role) to each intern.
  const mentorsQuery = useInternQuery("staff.mentors", {}, { enabled: isAdmin });
  const mentors = mentorsQuery.data || [];
  async function assignMentor(intern, mentorId) {
    const result = await commands.assignMentor(intern.id, mentorId || null);
    if (!result.ok) { notify?.(typeof result.error === "string" ? result.error : "Couldn't change the mentor."); return; }
    notify?.(mentorId ? `${intern.name} now has a mentor.` : `Mentor removed for ${intern.name}.`);
    void listQuery.refresh();
  }
  const summary = summaryQuery.data;
  useEffect(() => { setPage(1); }, [query, search, track, batch, tab]);
  useEffect(() => {
    if (!listQuery.data || page <= 1) return;
    const lastPage = Math.max(1, Math.ceil(listQuery.data.total / pageSize));
    if (page > lastPage) setPage(lastPage);
  }, [listQuery.data, page, pageSize]);
  const interns = listing.items.map(intern => ({...intern.application,...intern,name:intern.application?.name || intern.name || "Intern",email:intern.application?.email || intern.email || "",programId:intern.application?.programId || intern.programId,program:intern.application?.program || intern.program,projects:intern.projects || []}));
  const counts = summary ? { all: summary.total, active: summary.counts?.statuses?.Active || 0, completed: summary.counts?.statuses?.Completed || 0, dropped: summary.counts?.statuses?.Dropped || 0 } : {};
  const batches = summary?.batches || [];
  const baseline = data.metrics?.find((metric) => metric.id === "joined");
  const metrics = [
    {
      ...baseline,
      id: "total",
      label: "Total Interns",
      value: counts.all ?? "—",
      tone: "orange",
      icon: "trophy",
      change: null,
    },
    {
      ...baseline,
      id: "active",
      label: "Active",
      value: counts.active ?? "—",
      tone: "blue",
      icon: "users",
      change: null,
    },
    {
      ...baseline,
      id: "completed",
      label: "Completed",
      value: counts.completed ?? "—",
      tone: "green",
      icon: "check",
      change: null,
    },
    {
      ...baseline,
      id: "dropped",
      label: "Dropped",
      value: counts.dropped ?? "—",
      tone: "purple",
      icon: "users",
      change: null,
    },
  ];
  const filtered = interns;
  const safePage = page;
  const visible = interns;
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
    notify?.(`${filtered.length.toLocaleString()} intern records from this page exported.`);
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
          <Button variant="secondary" onClick={exportInterns} disabled={!listQuery.data || !filtered.length}>
            <Download size={16} />
            Export current page
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
      <QueryStatus query={summaryQuery} label="intern totals" compact/>
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
              Program
              <select
                value={track}
                onChange={(event) => updateFilter(setTrack, event.target.value)}
              >
                <option value="all">All programs</option>
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
      <Panel className={styles.internTablePanel} aria-busy={listQuery.loading || listQuery.refreshing}>
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
                <th>Mentor</th>
                <th className={styles.actionsHeading}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((intern) => (
                <tr key={intern.id}>
                  <td>
                    {canApplications ? <Link
                      className={styles.internPerson}
                      href={`/intern/dashboard/applications/${intern.applicationId}`}
                    >
                      <Avatar person={intern} size={34} />
                      <span>
                        <strong>{intern.name}</strong>
                        <small>{intern.email}</small>
                      </span>
                    </Link> : <div className={styles.internPerson}><Avatar person={intern} size={34}/><span><strong>{intern.name}</strong><small>{intern.email}</small></span></div>}
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
                  <td>
                    {isAdmin && mentors.length ? (
                      <select className={styles.mentorSelect} aria-label={`Mentor for ${intern.name}`} value={intern.mentorId || ""} onChange={(event) => void assignMentor(intern, event.target.value)}>
                        <option value="">No mentor</option>
                        {mentors.map((mentor) => <option key={mentor.id} value={mentor.id}>{mentor.name}</option>)}
                      </select>
                    ) : (intern.mentorName || <span className={styles.unassigned}>None</span>)}
                  </td>
                  <td className={styles.rowActions}>
                    {(isAdmin || canApplications || canMessage) && <RowMenu
                      items={[
                        ...(canApplications ? [{
                          label: "View profile",
                          href: `/intern/dashboard/applications/${intern.applicationId}`,
                        }] : []),
                        ...(canMessage ? [{label:"Message intern",onClick:()=>{setRecipient(intern);setSubject("");setBody("");setMessageError("")}}] : []),
                        {label:"Check-ins",onClick:()=>setCheckinsFor(intern)},
                        ...(!isAdmin || intern.status === "Completed"
                          ? []
                          : [
                              {
                                label: "Mark as completed",
                                onClick: () =>
                                  changeStatus(intern, "Completed"),
                              },
                            ]),
                        ...(!isAdmin || intern.status === "Completed"
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
                    />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <QueryStatus query={listQuery} label="interns"/>
        {listQuery.data && !filtered.length && (
          <EmptyState
            title="No interns found"
            description="Try a different search, program, batch, or status."
          />
        )}
        {listQuery.data && <Pagination
          page={safePage}
          pageSize={pageSize}
          total={listing.total}
          onChange={setPage}
        />}
      </Panel>
      <Modal open={Boolean(recipient)} onOpenChange={open=>{if(!open)setRecipient(null)}} title={`Message ${recipient?.name || "intern"}`} description="Communicate with an intern in their workspace.">
        {messages.error && <p role="alert">{messages.error}</p>}
        {messages.loading && <LoadingIndicator label="Loading messages…" compact={messages.items.length > 0} />}
        {messages.items.map(item=><article key={item.id}><strong>{item.subject}</strong><p>{item.body}</p></article>)}
        {messages.hasMore && <Button variant="ghost" onClick={messages.loadMore} disabled={messages.loading}>Load older messages</Button>}
        {recipient && <form onSubmit={async event=>{event.preventDefault();setSending(true);setMessageError("");const result=await commands.sendMessage(recipient.applicationId,{subject:subject.trim(),body:body.trim()});setSending(false);if(!result.ok){setMessageError(result.error);return}setSubject("");setBody("");notify("Message sent.")}}>
          <TemplatePicker application={data.applications.find(item=>item.id===recipient.applicationId) || recipient} onPick={(nextSubject,nextBody)=>{setSubject(nextSubject);setBody(nextBody);}}/>
          <label className={ui.field}>Subject<input required maxLength={140} value={subject} onChange={event=>setSubject(event.target.value)}/></label>
          <label className={ui.field}>Message<textarea required maxLength={3000} rows={4} value={body} onChange={event=>setBody(event.target.value)}/></label>
          {messageError && <p role="alert">{messageError}</p>}<div className={ui.formActions}><Button type="submit" disabled={sending}>{sending ? "Sending…" : "Send message"}</Button></div>
        </form>}
      </Modal>
      <Modal open={Boolean(checkinsFor)} onOpenChange={open=>{if(!open)setCheckinsFor(null)}} title={`${checkinsFor?.name || "Intern"}'s check-ins`} description="Recent weekly check-ins, newest first.">
        {checkinsFor && <InternCheckins applicationId={checkinsFor.applicationId} commands={commands} notify={notify}/>}
      </Modal>
    </div>
  );
}
