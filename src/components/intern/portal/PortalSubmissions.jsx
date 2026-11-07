"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Download,
  ExternalLink,
  FileClock,
  FileText,
  Upload,
} from "lucide-react";
import { useInternship } from "@/components/intern/InternshipProvider";
import { SubmitWorkModal } from "./PortalProjects";
import {
  Button,
  EmptyState,
  ErrorMessage,
  Heading,
  Loading,
  Modal,
  Notice,
  Panel,
  Status,
  WorkGate,
  formatDate,
  safeUrl,
  useAction,
} from "./PortalUI";
import styles from "./portal.module.css";

export default function PortalSubmissions() {
  const { ready, my } = useInternship();
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [revision, setRevision] = useState(null);
  const action = useAction();
  if (!ready) return <Loading />;
  const tasks = new Map((my.tasks || []).map((task) => [task.id, task]));
  const projects = new Map(
    (my.projects || []).map((project) => [project.id, project]),
  );
  const submissions = [...(my.submissions || [])].sort(
    (a, b) =>
      String(b.submittedOn).localeCompare(String(a.submittedOn)) ||
      Number(b.version) - Number(a.version),
  );
  const selected =
    submissions.find((submission) => submission.id === selectedId) || null;
  const setSelected = (submission) => setSelectedId(submission?.id || null);
  const filtered = submissions.filter(
    (submission) => filter === "all" || submission.status === filter,
  );
  const active =
    my.application?.status === "Joined" && my.intern?.status === "Active";
  async function download(id) {
    await action.run(async () => {
      const { downloadAttachment } = await import(
        "@/lib/intern-attachments.mjs"
      );
      await downloadAttachment(id);
      return { ok: true };
    });
  }
  const selectedTask = selected ? tasks.get(selected.taskId) : null;

  return (
    <>
      <Heading
        title="My Submissions"
        description="Your work, mentor feedback, and every step forward."
      />
      <WorkGate>
        <Panel>
          <div className={styles.panelHeader}>
            <h2>Submission history</h2>
            <label className={styles.inlineFilter}>
              <span className={styles.srOnly}>Filter submission status</span>
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              >
                <option value="all">All submissions</option>
                <option value="Submitted">Under review</option>
                <option value="Changes requested">Changes requested</option>
                <option value="Approved">Approved</option>
              </select>
            </label>
          </div>
          <ErrorMessage>{action.error}</ErrorMessage>
          {filtered.length ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Version</th>
                    <th>Submitted on</th>
                    <th>Status</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((submission) => {
                    const task = tasks.get(submission.taskId);
                    return (
                      <tr key={submission.id}>
                        <td>
                          <button
                            className={styles.tablePerson}
                            onClick={() => setSelected(submission)}
                          >
                            <span className={styles.taskCheck}>
                              <FileText size={17} />
                            </span>
                            <span>
                              <strong>
                                {task?.title || "Task submission"}
                              </strong>
                              <small>
                                {projects.get(task?.projectId)?.name ||
                                  "Your project"}
                              </small>
                            </span>
                          </button>
                        </td>
                        <td>
                          <span className={styles.versionBadge}>
                            v{submission.version}
                          </span>
                        </td>
                        <td>{formatDate(submission.submittedOn)}</td>
                        <td>
                          <Status
                            value={
                              submission.status === "Submitted"
                                ? "Under review"
                                : submission.status
                            }
                          />
                        </td>
                        <td>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              action.setError("");
                              setSelected(submission);
                            }}
                          >
                            View <ArrowRight size={13} />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={FileClock}
              title={
                filter === "all"
                  ? "Your work will shine here"
                  : "No matching submissions"
              }
              description={
                filter === "all"
                  ? "Start a project task and submit your work when it’s ready for mentor review."
                  : "Try another submission status."
              }
            >
              {filter === "all" && (
                <Link href="/intern/portal/projects" className={styles.button}>
                  Explore my projects <ArrowRight size={14} />
                </Link>
              )}
            </EmptyState>
          )}
        </Panel>
      </WorkGate>
      <Modal
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={selectedTask?.title || "Submission details"}
        description={
          selected
            ? `Version ${selected.version} · Submitted ${formatDate(selected.submittedOn)}`
            : "Review your submitted work and mentor feedback."
        }
      >
        {selected && (
          <>
            <div className={styles.modalToolbar}>
              <Status
                value={
                  selected.status === "Submitted"
                    ? "Under review"
                    : selected.status
                }
              />
              <span>{projects.get(selectedTask?.projectId)?.name}</span>
            </div>
            <ErrorMessage>{action.error}</ErrorMessage>
            <h3 className={styles.subheading}>Your submission notes</h3>
            <p className={styles.submissionNotes}>{selected.notes}</p>
            <div className={styles.actions}>
              {safeUrl(selected.url) && (
                <a
                  className={`${styles.button} ${styles.secondary}`}
                  href={safeUrl(selected.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open project <ExternalLink size={14} />
                </a>
              )}
              {selected.attachmentId && (
                <Button
                  variant="secondary"
                  busy={action.busy}
                  disabled={action.busy}
                  onClick={() => download(selected.attachmentId)}
                >
                  <Download size={14} />
                  Download attachment
                </Button>
              )}
            </div>
            {selected.feedback ? (
              <Notice tone={selected.status === "Approved" ? "green" : "blue"}>
                <div>
                  <strong>Mentor feedback</strong>
                  <p>{selected.feedback}</p>
                  {selected.reviewedOn && (
                    <small>Reviewed {formatDate(selected.reviewedOn)}</small>
                  )}
                </div>
              </Notice>
            ) : (
              <Notice>
                Your mentor will review your work and share feedback here.
              </Notice>
            )}
            {active && selectedTask?.status === "Changes requested" && (
              <div className={styles.formActions}>
                <Button
                  onClick={() => {
                    setRevision(selectedTask);
                    setSelected(null);
                  }}
                >
                  <Upload size={14} />
                  Submit a revision
                </Button>
              </div>
            )}
          </>
        )}
      </Modal>
      {revision && active && (
        <SubmitWorkModal
          key={revision.id}
          task={revision}
          onClose={() => setRevision(null)}
        />
      )}
    </>
  );
}
