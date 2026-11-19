"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CompanyBrand from "@/components/intern/CompanyBrand";
import {
  ArrowRight,
  Award,
  Download,
  FileCheck2,
  Plus,
  Printer,
  ShieldCheck,
} from "lucide-react";
import { useDashboard } from "./DashboardProvider";
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
  TrackBadge,
  exportCsv,
  formatDate,
} from "./DashboardUI";
import common from "./pages.module.css";
import styles from "./portfolio.module.css";
import { burstFrom } from "@/lib/confetti.mjs";
import StoriesReview from "./StoriesReview";

export function CertificatesPage() {
  const { data, query, notify, generateCertificates, account } = useDashboard();
  const isAdmin = account?.staffRole === "admin";
  const [search, setSearch] = useState("");
  const [track, setTrack] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [previewId, setPreviewId] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSearch, setBulkSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [generationError, setGenerationError] = useState("");
  const [generating, setGenerating] = useState(false);
  const pageSize = 8;
  const [eligiblePage, setEligiblePage] = useState(1);
  const [createdPreview, setCreatedPreview] = useState(null);
  const debouncedSearch = useInternSearch(search);
  const debouncedQuery = useInternSearch(query);
  const debouncedBulkSearch = useInternSearch(bulkSearch);
  const listQuery = useInternQuery("certificate.list", { search: debouncedSearch, query: debouncedQuery, programId: track, status, page, pageSize });
  const summaryQuery = useInternQuery("certificate.list", { page: 1, pageSize: 1 });
  const eligibleCountQuery = useInternQuery("intern.list", { eligible: true, page: 1, pageSize: 1 }, { enabled: isAdmin });
  const eligibleTotal = eligibleCountQuery.data?.total;
  const bulkQuery = useInternQuery("intern.list", { eligible: true, search: debouncedBulkSearch, page: eligiblePage, pageSize: 20 }, { enabled: isAdmin && bulkOpen && eligibleTotal > 0 });
  const listing = listQuery.data || { items: [], total: 0 };
  const summary = summaryQuery.data;
  const eligibleListing = bulkQuery.data || { items: [], total: 0 };
  useEffect(() => { setPage(1); }, [search, query, track, status]);
  useEffect(() => { setEligiblePage(1); }, [bulkSearch]);
  useEffect(() => {
    if (!listQuery.data || page <= 1) return;
    const lastPage = Math.max(1, Math.ceil(listQuery.data.total / pageSize));
    if (page > lastPage) setPage(lastPage);
  }, [listQuery.data, page, pageSize]);
  useEffect(() => {
    if (!bulkQuery.data || eligiblePage <= 1) return;
    const lastPage = Math.max(1, Math.ceil(bulkQuery.data.total / 20));
    if (eligiblePage > lastPage) setEligiblePage(lastPage);
  }, [bulkQuery.data, eligiblePage]);
  const certificates=listing.items, eligible=eligibleListing.items.map(intern=>({...intern,person:intern.application})).filter(intern=>intern.person);
  const selectedEligible=selected;
  const matchingEligible=eligible;
  const filtered=certificates;
  const currentPage=page;
  const rows=certificates;
  const preview=certificates.find(certificate=>certificate.id===previewId) || (createdPreview?.id===previewId ? createdPreview : null);
  const exportCertificates = (items = filtered) => {
    exportCsv(
      "olentra-internship-certificates.csv",
      ["Certificate Number", "Recipient", "Program", "Issued On", "Status"],
      items.map((certificate) => [
        certificate.certificateNumber,
        certificate.recipient,
        certificate.program,
        certificate.issuedOn,
        certificate.status,
      ]),
    );
    notify(
      `${items.length} certificate ${items.length === 1 ? "record" : "records"} from this page exported.`,
    );
  };
  const openBulk = () => {
    setSelected([]);
    setBulkSearch("");
    setGenerationError("");
    setBulkOpen(true);
  };
  const generateSelected = async (event) => {
    if (generating) return;
    const trigger = event?.currentTarget;
    if (!selectedEligible.length)
      return setGenerationError(
        "Select at least one eligible completed intern.",
      );
    setGenerating(true);
    try {
      if (selectedEligible.length > 100) { setGenerationError("Select at most 100 interns at a time."); return; }
      const created = await generateCertificates(
        selectedEligible,
      );
      if (!Array.isArray(created) || !created.length) {
        setGenerationError(
          "These interns already have certificates or are no longer eligible. Review the selection.",
        );
        return;
      }
      burstFrom(trigger, { count: 80 });
      setBulkOpen(false);
      setSelected([]);
      setCreatedPreview(created[0]);
      setPreviewId(created[0].id);
      notify(
        `${created.length} ${created.length === 1 ? "certificate" : "certificates"} generated successfully.`,
      );
    } finally {
      setGenerating(false);
    }
  };
  const allMatchingSelected =
    matchingEligible.length > 0 &&
    matchingEligible.every((intern) => selected.includes(intern.id));
  return (
    <div className={common.page}>
      <PageHeader
        title="Certificates"
        description="Recognize growth. Celebrate every achievement."
      >
        <Button
          variant="secondary"
          onClick={() => exportCertificates()}
          disabled={!filtered.length}
        >
          <Download size={15} /> Export current page
        </Button>
        {isAdmin && <Button onClick={openBulk} disabled={!eligibleCountQuery.data}>
          <Plus size={16} /> Generate Certificates
        </Button>}
      </PageHeader>
      <QueryStatus query={summaryQuery} label="certificate totals" compact/>
      {isAdmin && <QueryStatus query={eligibleCountQuery} label="certificate eligibility" compact/>}
      <StatCards
        items={[
          {
            id: "issued",
            label: "Certificates Issued",
            value: summary?.total ?? "—",
            icon: "trophy",
            tone: "blue",
          },
          ...(isAdmin ? [{
            id: "eligible",
            label: "Ready to Generate",
            value: eligibleTotal ?? "—",
            icon: "check",
            tone: "green",
          }] : []),
          {
            id: "software-engineer",
            label: "Software Engineer Intern",
            value: summary ? summary.counts?.programs?.["software-engineer"] || 0 : "—",
            icon: "users",
            tone: "purple",
          },
        ]}
      />
      <Panel className={styles.certificatesPanel} aria-busy={listQuery.loading || listQuery.refreshing}>
        <div className={common.panelTitle}>
          <h2>
            <span className={styles.titleIcon}>
              <Award size={18} />
            </span>{" "}
            Issued Certificates
          </h2>
          <span className={common.badge}>{listQuery.data ? `${listing.total} total` : "—"}</span>
        </div>
        <div className={common.toolbar}>
          <SearchBox
            value={search}
            onChange={value => { setSearch(value); setPage(1); }}
            placeholder="Search recipient or certificate ID..."
          />
          <div className={common.filters}>
            <FilterMenu>
              <label>
                Internship track
                <select
                  value={track}
                  onChange={(event) => { setTrack(event.target.value); setPage(1); }}
                >
                  <option value="all">All tracks</option>
                  {data.programs.map((program) => (
                    <option value={program.id} key={program.id}>
                      {program.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Certificate status
                <select
                  value={status}
                  onChange={(event) => { setStatus(event.target.value); setPage(1); }}
                >
                  <option value="all">All statuses</option>
                  <option value="Issued">Issued</option>
                </select>
              </label>
              <Button
                variant="ghost"
                onClick={() => {
                  setTrack("all");
                  setStatus("all");
                  setSearch("");
                }}
              >
                Clear filters
              </Button>
            </FilterMenu>
          </div>
        </div>
        <QueryStatus query={listQuery} label="certificates"/>
        <div className={common.tableWrap}>
          <table className={common.table}>
            <thead>
              <tr>
                <th>Recipient</th>
                <th>Program</th>
                <th>Certificate ID</th>
                <th>Issued On</th>
                <th>Status</th>
                <th>
                  <span className={common.srOnly}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((certificate) => (
                <tr key={certificate.id}>
                  <td>
                    <button
                      className={common.personCell}
                      onClick={() => setPreviewId(certificate.id)}
                    >
                      <Avatar
                        person={
                          certificate.application || {
                            name: certificate.recipient,
                          }
                        }
                        size={32}
                      />
                      <span>
                        <strong>{certificate.recipient}</strong>
                        <small>{certificate.applicationId}</small>
                      </span>
                    </button>
                  </td>
                  <td>
                    <TrackBadge
                      programId={certificate.programId}
                      label={certificate.program}
                    />
                  </td>
                  <td>
                    <button
                      className={styles.certificateId}
                      onClick={() => setPreviewId(certificate.id)}
                    >
                      <FileCheck2 size={13} />
                      {certificate.certificateNumber}
                    </button>
                  </td>
                  <td>{formatDate(certificate.issuedOn)}</td>
                  <td>
                    <StatusBadge status={certificate.status} />
                  </td>
                  <td>
                    <RowMenu
                      items={[
                        {
                          label: "Preview certificate",
                          onClick: () => setPreviewId(certificate.id),
                        },
                        {
                          label: "Export certificate details",
                          onClick: () => exportCertificates([certificate]),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {listQuery.data && !rows.length && (
            <EmptyState
              title="No certificates found"
              description="Try another recipient, certificate number, or track."
            />
          )}
        </div>
        {listQuery.data && <Pagination
          page={currentPage}
          pageSize={pageSize}
          total={listing.total}
          onChange={setPage}
        />}
      </Panel>
      <div className={styles.certificateNote}>
        <ShieldCheck size={17} />
        <p>
          Certificates are issued to interns who have completed the program.
          Each certificate has a unique certificate ID.
        </p>
        {isAdmin && <button onClick={openBulk} disabled={!eligibleCountQuery.data}>
          Manage certificates <ArrowRight size={13} />
        </button>}
      </div>
      <StoriesReview isAdmin={isAdmin} />
      <Modal
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        title="Generate certificates"
        description="Select completed interns who have not received a certificate yet."
        className={styles.bulkModal}
      >
        <QueryStatus query={eligibleCountQuery} label="certificate eligibility"/>
        {eligibleCountQuery.data ? eligibleTotal ? (
          <>
            <div className={styles.eligibilityBanner}>
              <ShieldCheck size={20} />
              <span>
                <strong>
                  {eligibleTotal} eligible{" "}
                  {eligibleTotal === 1 ? "intern" : "interns"}
                </strong>
                Completed the program and awaiting a certificate.
              </span>
            </div>
            <SearchBox
              value={bulkSearch}
              onChange={value => { setBulkSearch(value); setEligiblePage(1); }}
              placeholder="Search eligible interns..."
            />
            <label className={styles.selectAll}>
              <input
                type="checkbox"
                checked={allMatchingSelected}
                disabled={!bulkQuery.data || !matchingEligible.length}
                onChange={(event) =>
                  setSelected(
                    event.target.checked
                      ? [
                          ...new Set([
                            ...selected,
                            ...matchingEligible.map((intern) => intern.id),
                          ]),
                        ]
                      : selected.filter(
                          (id) =>
                            !matchingEligible.some(
                              (intern) => intern.id === id,
                            ),
                        ),
                  )
                }
              />{" "}
              Select all interns on this page{" "}
              <span>{selectedEligible.length} selected</span>
            </label>
            <QueryStatus query={bulkQuery} label="eligible interns"/>
            <div className={styles.eligibleList}>
              {matchingEligible.map((intern) => (
                <label key={intern.id} className={styles.pickerPerson}>
                  <input
                    type="checkbox"
                    checked={selected.includes(intern.id)}
                    onChange={(event) =>
                      setSelected(
                        event.target.checked
                          ? [...new Set([...selected, intern.id])]
                          : selected.filter((id) => id !== intern.id),
                      )
                    }
                  />
                  <Avatar person={intern.person} size={33} />
                  <span>
                    <strong>{intern.person.name}</strong>
                    <small>
                      {intern.batch} · {intern.person.program}
                    </small>
                  </span>
                  <StatusBadge status="Completed" />
                </label>
              ))}
              {bulkQuery.data && !matchingEligible.length && (
                <EmptyState
                  title="No matching interns"
                  description="Try a different name, batch, or program."
                />
              )}
            </div>
            {bulkQuery.data && <Pagination page={eligiblePage} pageSize={20} total={eligibleListing.total} onChange={setEligiblePage}/>}
            {generationError && (
              <p role="alert" className={common.error}>
                {generationError}
              </p>
            )}
            <div className={common.formActions}>
              <Button variant="ghost" onClick={() => setBulkOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={generateSelected}
                disabled={!bulkQuery.data || !selectedEligible.length || generating}
              >
                <Award size={15} />{" "}
                {generating
                  ? "Generating..."
                  : `Generate ${selectedEligible.length || ""} ${selectedEligible.length === 1 ? "Certificate" : "Certificates"}`}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.allCertified}>
              <span>
                <Award size={31} />
              </span>
              <h3>Every completed intern is certified</h3>
              <p>
                There are no completed interns waiting for a certificate. Once
                an active intern finishes the program, mark them as Completed in
                Interns. They will appear here automatically.
              </p>
              <Link
                href="/intern/dashboard/interns"
                onClick={() => setBulkOpen(false)}
                className={`${common.button} ${common.secondary}`}
              >
                Go to Interns <ArrowRight size={14} />
              </Link>
            </div>
            <div className={common.formActions}>
              <Button variant="ghost" onClick={() => setBulkOpen(false)}>
                Close
              </Button>
            </div>
          </>
        ) : null}
      </Modal>
      <Modal
        open={Boolean(preview)}
        onOpenChange={(open) => !open && setPreviewId(null)}
        title="Certificate preview"
        description={
          preview
            ? `Certificate issued to ${preview.recipient}.`
            : "View the internship certificate."
        }
        className={styles.certificateModal}
      >
        {preview && (
          <>
            <div className={styles.printControls}>
              <span>
                <ShieldCheck size={15} /> Issued {formatDate(preview.issuedOn)}
              </span>
              <Button onClick={() => window.print()}>
                <Printer size={15} /> Print / Save as PDF
              </Button>
            </div>
            <article
              className={styles.certificateSheet}
              data-certificate-print="true"
            >
              <div className={styles.certificateInner}>
                <div className={styles.certificateBrand}>
                  <CompanyBrand variant="certificate" />
                </div>
                <div className={styles.certificateKicker}>
                  LEARN. BUILD. GROW.
                </div>
                <h2>Certificate of Completion</h2>
                <div className={styles.certificateDivider}>
                  <span />
                  <Award size={19} />
                  <span />
                </div>
                <p className={styles.presentedTo}>
                  THIS CERTIFICATE IS PROUDLY PRESENTED TO
                </p>
                <h3>{preview.recipient}</h3>
                <p className={styles.certificateBody}>
                  For successfully completing the{" "}
                  <strong>{preview.program}</strong> internship program at
                  Olentra Technologies, demonstrating dedication, practical
                  skills, and a commitment to continuous learning.
                </p>
                <div className={styles.certificateSignatures}>
                  <div>
                    <span className={styles.signatureName}>Internship Program Team</span>
                    <span className={styles.signatureRule} />
                    <strong>Issued by</strong>
                    <small>Olentra Technologies</small>
                  </div>
                  <div className={styles.certificateSeal}>
                    <Award size={30} />
                    <strong>
                      OLENTRA
                      <br />
                      TECHNOLOGIES
                    </strong>
                    <span>EXCELLENCE IN LEARNING</span>
                  </div>
                  <div>
                    <span className={styles.signatureDate}>
                      {formatDate(preview.issuedOn)}
                    </span>
                    <span className={styles.signatureRule} />
                    <strong>Date of Issue</strong>
                    <small>Internship Program</small>
                  </div>
                </div>
                <footer>
                  <span>
                    Certificate ID: <strong>{preview.certificateNumber}</strong>
                  </span>
                  <span>Olentra Technologies Pvt. Ltd.</span>
                </footer>
              </div>
            </article>
          </>
        )}
      </Modal>
    </div>
  );
}

export default CertificatesPage;
