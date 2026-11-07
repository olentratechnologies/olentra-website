"use client";

import { useEffect, useMemo, useState } from "react";
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

export function CertificatesPage() {
  const { data, query, notify, generateCertificates } = useDashboard();
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
  const people = useMemo(
    () => new Map(data.applications.map((person) => [person.id, person])),
    [data.applications],
  );
  const certificates = data.certificates || [];
  const issuedInternIds = useMemo(
    () => new Set(certificates.map((certificate) => certificate.internId)),
    [certificates],
  );
  const eligible = useMemo(
    () =>
      data.interns
        .filter(
          (intern) =>
            intern.status === "Completed" &&
            !issuedInternIds.has(intern.id) &&
            !(data.tasks || []).some(
              (task) =>
                task.applicationId === intern.applicationId &&
                task.required &&
                task.status !== "Approved",
            ),
        )
        .map((intern) => ({
          ...intern,
          person: people.get(intern.applicationId),
        }))
        .filter((intern) => intern.person),
    [data.interns, data.tasks, issuedInternIds, people],
  );
  const selectedEligible = eligible.filter((intern) =>
    selected.includes(intern.id),
  );
  const matchingEligible = eligible.filter((intern) =>
    `${intern.person.name} ${intern.person.program} ${intern.batch}`
      .toLowerCase()
      .includes(bulkSearch.trim().toLowerCase()),
  );
  const filtered = certificates.filter((certificate) => {
    const haystack =
      `${certificate.recipient} ${certificate.certificateNumber} ${certificate.program} ${certificate.id}`.toLowerCase();
    return (
      (!query || haystack.includes(query.toLowerCase())) &&
      (!search || haystack.includes(search.toLowerCase())) &&
      (track === "all" || certificate.programId === track) &&
      (status === "all" || certificate.status === status)
    );
  });
  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / pageSize)),
  );
  const rows = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const preview = certificates.find(
    (certificate) => certificate.id === previewId,
  );
  useEffect(() => {
    setPage(1);
  }, [search, query, track, status]);
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
      `${items.length} certificate ${items.length === 1 ? "record" : "records"} exported.`,
    );
  };
  const openBulk = () => {
    setSelected([]);
    setBulkSearch("");
    setGenerationError("");
    setBulkOpen(true);
  };
  const generateSelected = async () => {
    if (generating) return;
    if (!selectedEligible.length)
      return setGenerationError(
        "Select at least one eligible completed intern.",
      );
    setGenerating(true);
    try {
      const created = await generateCertificates(
        selectedEligible.map((intern) => intern.id),
      );
      if (!Array.isArray(created) || !created.length) {
        setGenerationError(
          "These interns already have certificates or are no longer eligible. Review the selection.",
        );
        return;
      }
      setBulkOpen(false);
      setSelected([]);
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
          <Download size={15} /> Export Records
        </Button>
        <Button onClick={openBulk}>
          <Plus size={16} /> Generate Certificates
        </Button>
      </PageHeader>
      <StatCards
        items={[
          {
            id: "issued",
            label: "Certificates Issued",
            value: certificates.length,
            icon: "trophy",
            tone: "blue",
          },
          {
            id: "eligible",
            label: "Ready to Generate",
            value: eligible.length,
            icon: "check",
            tone: "green",
          },
          {
            id: "explorer",
            label: "Tech Explorer",
            value: certificates.filter(
              (certificate) => certificate.programId === "explorer",
            ).length,
            icon: "users",
            tone: "purple",
          },
          {
            id: "innovator",
            label: "Tech Innovator",
            value: certificates.filter(
              (certificate) => certificate.programId === "innovator",
            ).length,
            icon: "trophy",
            tone: "orange",
          },
        ]}
      />
      <Panel className={styles.certificatesPanel}>
        <div className={common.panelTitle}>
          <h2>
            <span className={styles.titleIcon}>
              <Award size={18} />
            </span>{" "}
            Issued Certificates
          </h2>
          <span className={common.badge}>{certificates.length} total</span>
        </div>
        <div className={common.toolbar}>
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search recipient or certificate ID..."
          />
          <div className={common.filters}>
            <FilterMenu>
              <label>
                Internship track
                <select
                  value={track}
                  onChange={(event) => setTrack(event.target.value)}
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
                  onChange={(event) => setStatus(event.target.value)}
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
                          people.get(certificate.applicationId) || {
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
          {!rows.length && (
            <EmptyState
              title="No certificates found"
              description="Try another recipient, certificate number, or track."
            />
          )}
        </div>
        <Pagination
          page={currentPage}
          pageSize={pageSize}
          total={filtered.length}
          onChange={setPage}
        />
      </Panel>
      <div className={styles.certificateNote}>
        <ShieldCheck size={17} />
        <p>
          Certificates are issued to interns who have completed the program.
          Each certificate has a unique certificate ID.
        </p>
        <button onClick={openBulk}>
          Manage certificates <ArrowRight size={13} />
        </button>
      </div>
      <Modal
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        title="Generate certificates"
        description="Select completed interns who have not received a certificate yet."
        className={styles.bulkModal}
      >
        {eligible.length ? (
          <>
            <div className={styles.eligibilityBanner}>
              <ShieldCheck size={20} />
              <span>
                <strong>
                  {eligible.length} eligible{" "}
                  {eligible.length === 1 ? "intern" : "interns"}
                </strong>
                Completed the program and awaiting a certificate.
              </span>
            </div>
            <SearchBox
              value={bulkSearch}
              onChange={setBulkSearch}
              placeholder="Search eligible interns..."
            />
            <label className={styles.selectAll}>
              <input
                type="checkbox"
                checked={allMatchingSelected}
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
              Select all matching interns{" "}
              <span>{selectedEligible.length} selected</span>
            </label>
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
              {!matchingEligible.length && (
                <EmptyState
                  title="No matching interns"
                  description="Try a different name, batch, or program."
                />
              )}
            </div>
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
                disabled={!selectedEligible.length || generating}
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
        )}
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
                    <span className={styles.signatureName}>Manideep Bethi</span>
                    <span className={styles.signatureRule} />
                    <strong>Program Director</strong>
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
