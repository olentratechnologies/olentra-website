"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDownToLine, ArrowUpRight, ExternalLink, FileText } from "lucide-react";
import { useDashboard } from "./DashboardProvider";
import { useInternQuery, useInternSearch } from "../useInternQuery";
import QueryStatus from "./QueryStatus";
import { Avatar, Button, EmptyState, FilterMenu, Modal, PageHeader, Pagination, Panel, SearchBox, StatCards, StatusBadge, Tabs, exportCsv, formatDate } from "./DashboardUI";
import { ScheduleBadge, ScheduleBanner, ScheduleEntry, useScheduleView } from "./ScheduleSplit";
import { scheduleLabel, scheduleParams } from "@/lib/intern/schedule-split.mjs";
import { buildOfferLetterPdfBytes, downloadOfferLetterPdf } from "@/lib/intern/offer-letter-pdf.js";
import common from "./pages.module.css";
import styles from "./offers.module.css";

const STATUSES = ["Open", "Accepted", "Declined", "Expired", "Withdrawn", "Superseded"];
const TYPE_LABELS = { formal: "Formal offer", instant: "Instant offer", direct: "Direct enrolment" };
const SORTS = [
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
  { id: "name", label: "Name A–Z" },
  { id: "start", label: "Start date" },
];
const STATUS_HELP = {
  Open: "Waiting for the student to accept or decline.",
  Expired: "The response deadline passed without a decision.",
  Superseded: "Replaced by a newer version of this applicant’s offer.",
};
const money = (amount, period) => (amount ? `₹${Number(amount).toLocaleString("en-IN")}/${period === "month" ? "mo" : period}` : "Unpaid");

/** Offer-letter details for one generated offer, in the shape the PDF builder expects. */
function letterDetails(row) {
  return {
    name: row.name, email: row.email, college: row.college, program: row.program,
    startOn: row.startOn, endOn: row.endOn, stipend: row.stipend, stipendPeriod: row.stipendPeriod,
    applicationId: row.applicationId, durationLabel: row.durationLabel, offerVersion: row.version,
    issueDate: row.issueDate || row.sentOn,
  };
}

/** Offers are viewed as Full-time or Part-time (or All), chosen first. */
export default function OffersPage() {
  const { account } = useDashboard();
  const [view, chooseView] = useScheduleView();
  const isAdmin = account?.role === "company" && account?.staffRole === "admin";
  if (!isAdmin) return <div className={common.page}><PageHeader title="Offers" description="Only admins can view offers." /></div>;
  if (!view) {
    return (
      <div className={common.page}>
        <ScheduleEntry
          title="Offers"
          description="Choose which offers to look at: formal, instant and direct enrolments, all versions."
          noun="offers"
          method="offer.list"
          details={(result) => [
            ["waiting", result.counts?.statuses?.Open || 0],
            ["accepted", result.counts?.statuses?.Accepted || 0],
            ["declined", result.counts?.statuses?.Declined || 0],
            ["expired", result.counts?.statuses?.Expired || 0],
          ]}
          onChoose={chooseView}
        />
      </div>
    );
  }
  return <OffersWorkspace key={view} view={view} chooseView={chooseView} />;
}

/** Every offer the program has generated: formal, instant and direct enrolments, all versions. Admin only. */
function OffersWorkspace({ view, chooseView }) {
  const { account } = useDashboard();
  const isAdmin = account?.role === "company" && account?.staffRole === "admin";
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [sort, setSort] = useState("newest");
  const [currentOnly, setCurrentOnly] = useState(false);
  const [search, setSearch] = useState("");
  const debounced = useInternSearch(search);
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [letter, setLetter] = useState(null); // { row, url }

  const params = { ...scheduleParams(view), search: debounced, ...(status === "all" ? {} : { status }), ...(type === "all" ? {} : { type }), sort, currentOnly };
  const query = useInternQuery("offer.list", { ...params, page, pageSize }, { enabled: isAdmin });
  const totals = useInternQuery("offer.list", { ...scheduleParams(view), pageSize: 1 }, { enabled: isAdmin });
  const listing = query.data;
  const counts = listing?.counts || { statuses: {}, types: {}, all: 0 };
  const overall = totals.data?.counts?.statuses || {};
  useEffect(() => { setPage(1); }, [debounced, status, type, sort, currentOnly]);
  useEffect(() => () => { if (letter?.url) URL.revokeObjectURL(letter.url); }, [letter]);

  if (!isAdmin) {
    return <div className={common.page}><PageHeader title="Offers" description="Only admins can view offers." /></div>;
  }

  function openLetter(row) {
    const url = URL.createObjectURL(new Blob([buildOfferLetterPdfBytes(letterDetails(row))], { type: "application/pdf" }));
    setLetter({ row, url });
  }

  const tabItems = [{ id: "all", label: "All", count: counts.all }, ...STATUSES.map((value) => ({ id: value, label: value, count: counts.statuses?.[value] || 0 }))];
  const rows = listing?.items || [];
  const totalAll = totals.data?.counts?.all;

  return (
    <div className={common.page}>
      <ScheduleBanner view={view} noun="offers" onChoose={chooseView} />
      <PageHeader title={view === "all" ? "Offers" : `${scheduleLabel(view)} offers`} description="Every offer generated: formal offers, instant offers and direct enrolments, including revised versions.">
        <OfferExport params={params} disabled={!listing?.total} />
      </PageHeader>
      <QueryStatus query={totals} label="offer totals" compact />
      <StatCards items={[
        { id: "total", label: "Offers generated", value: totalAll ?? "—", icon: "users", tone: "blue" },
        { id: "open", label: "Waiting for a decision", value: totals.data ? overall.Open || 0 : "—", icon: "clock", tone: "purple" },
        { id: "accepted", label: "Accepted", value: totals.data ? overall.Accepted || 0 : "—", icon: "check", tone: "green" },
        { id: "closed", label: "Declined or expired", value: totals.data ? (overall.Declined || 0) + (overall.Expired || 0) : "—", icon: "trophy", tone: "orange" },
      ]} />
      <Panel aria-busy={query.loading || query.refreshing}>
        <Tabs items={tabItems} value={status} onChange={setStatus} label="Offer status" />
        <div className={common.toolbar}>
          <SearchBox value={search} onChange={setSearch} placeholder="Search name, email, college or application ID…" />
          <div className={common.filters}>
            <select aria-label="Offer type" className={styles.select} value={type} onChange={(event) => setType(event.target.value)}>
              <option value="all">All types{counts.types ? ` (${Object.values(counts.types).reduce((a, b) => a + b, 0)})` : ""}</option>
              {Object.entries(TYPE_LABELS).map(([id, label]) => <option key={id} value={id}>{label} ({counts.types?.[id] || 0})</option>)}
            </select>
            <select aria-label="Sort offers" className={styles.select} value={sort} onChange={(event) => setSort(event.target.value)}>
              {SORTS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
            <FilterMenu>
              <label className={styles.checkRow}><input type="checkbox" checked={currentOnly} onChange={(event) => setCurrentOnly(event.target.checked)} /> Only each applicant’s current offer</label>
              <Button variant="ghost" onClick={() => { setStatus("all"); setType("all"); setSort("newest"); setCurrentOnly(false); setSearch(""); }}>Clear filters</Button>
            </FilterMenu>
          </div>
        </div>
        <QueryStatus query={query} label="offers" />
        {listing && !rows.length ? (
          <EmptyState title="No offers found" description={counts.all || totalAll ? "Try another status, type or search." : "Offers you send from an applicant’s page, Select by AI score or the bulk bar appear here."} />
        ) : (
          <div className={common.tableWrap}>
            <table className={common.table}>
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Internship</th>
                  <th>Stipend</th>
                  <th>Sent</th>
                  <th>Respond by / decided</th>
                  <th><span className={common.srOnly}>Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} data-current={row.current}>
                    <td>
                      <Link className={common.personCell} href={`/intern/dashboard/applications/${row.applicationId}`}>
                        <Avatar person={{ name: row.name }} size={32} />
                        <span><strong>{row.name || "Applicant"} {view === "all" && <ScheduleBadge schedule={row.scheduleId} />}</strong><small>{row.email}</small></span>
                      </Link>
                    </td>
                    <td>
                      <span className={styles.type} data-type={row.type}>{TYPE_LABELS[row.type]}</span>
                      <small className={styles.version}>v{row.version}{row.current ? " · current" : ""}</small>
                    </td>
                    <td title={STATUS_HELP[row.status] || ""}><StatusBadge status={row.status} /></td>
                    <td>
                      {row.startOn ? <>{formatDate(row.startOn)} → {row.endOn ? formatDate(row.endOn) : "—"}</> : "—"}
                      {row.durationLabel && <small className={styles.version}>{row.durationLabel}{row.schedule ? ` · ${row.schedule}` : ""}</small>}
                    </td>
                    <td>{money(row.stipend, row.stipendPeriod)}</td>
                    <td>{row.sentOn ? formatDate(row.sentOn) : "—"}</td>
                    <td>{["Open", "Expired"].includes(row.status) ? (row.expiresOn ? formatDate(row.expiresOn) : "—") : row.decidedOn ? formatDate(row.decidedOn) : "—"}</td>
                    <td>
                      <div className={styles.actions}>
                        <Button variant="secondary" onClick={() => openLetter(row)}><FileText size={14} /> View letter</Button>
                        <Link className={styles.open} href={`/intern/dashboard/applications/${row.applicationId}`}>Applicant <ArrowUpRight size={13} /></Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {listing && <Pagination page={page} pageSize={pageSize} total={listing.total} onChange={setPage} />}
      </Panel>
      <Modal
        open={Boolean(letter)}
        onOpenChange={(open) => { if (!open) setLetter(null); }}
        title={letter ? `Offer letter: ${letter.row.name}` : "Offer letter"}
        description={letter ? `${TYPE_LABELS[letter.row.type]} · version ${letter.row.version} · ${letter.row.status}. ${letter.row.status === "Accepted" ? "This is the letter the student received." : "The student receives this letter when they accept."}` : ""}
        className={styles.letterModal}
      >
        {letter && (
          <>
            <div className={styles.letterToolbar}>
              <Button variant="ghost" onClick={() => window.open(letter.url, "_blank", "noopener")}><ExternalLink size={15} /> Open in new tab</Button>
              <Button variant="secondary" onClick={() => downloadOfferLetterPdf(letterDetails(letter.row))}><ArrowDownToLine size={15} /> Download PDF</Button>
            </div>
            <iframe className={styles.letterFrame} src={letter.url} title={`Offer letter for ${letter.row.name}`} />
          </>
        )}
      </Modal>
    </div>
  );
}

const EXPORT_COLUMNS = ["Applicant", "Email", "Application ID", "Schedule", "Type", "Version", "Current", "Status", "Start", "End", "Duration", "Stipend", "Sent", "Respond by", "Decided"];
function exportRow(row) {
  return [row.name, row.email, row.applicationId, scheduleLabel(row.scheduleId), TYPE_LABELS[row.type], row.version, row.current ? "Yes" : "No", row.status, row.startOn || "", row.endOn || "", row.durationLabel || "", row.stipend || 0, row.sentOn || "", row.expiresOn || "", row.decidedOn || ""];
}

/** Exports every offer matching the current filters (all pages). */
function OfferExport({ params, disabled }) {
  const { commands, notify } = useDashboard();
  const [busy, setBusy] = useState(false);
  async function run() {
    if (busy) return;
    setBusy(true);
    try {
      const rows = [];
      for (let page = 1; page <= 500; page++) {
        const result = await commands.listOffers({ ...params, page, pageSize: 100 });
        if (!result?.ok) { notify(typeof result?.error === "string" ? result.error : "Couldn’t export the offers."); return; }
        rows.push(...result.data.items);
        if (rows.length >= result.data.total || !result.data.items.length) break;
      }
      exportCsv("olentra-offers.csv", EXPORT_COLUMNS, rows.map(exportRow));
      notify(`${rows.length} ${rows.length === 1 ? "offer" : "offers"} exported.`);
    } finally {
      setBusy(false);
    }
  }
  return <Button variant="secondary" onClick={() => void run()} disabled={disabled || busy}><ArrowDownToLine size={16} /> {busy ? "Exporting…" : "Export CSV"}</Button>;
}
