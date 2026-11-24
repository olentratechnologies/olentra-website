"use client";

import ProjectPlan from "../ProjectPlan";
import { InternProjectLinks, TaskLinks } from "../ProjectLinks";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  ClipboardCheck,
  FileUp,
  Play,
  Send,
  Upload,
} from "lucide-react";
import { useInternship } from "@/components/intern/InternshipProvider";
import { PlanetArtwork } from "../dashboard/DashboardVisuals";
import {
  Button,
  EmptyState,
  ErrorMessage,
  Heading,
  Loading,
  Modal,
  Notice,
  Panel,
  Progress,
  Skills,
  Status,
  WorkGate,
  formatDate,
  useAction,
} from "./PortalUI";
import styles from "./portal.module.css";
import { burstFrom } from "@/lib/confetti.mjs";

export function SubmitWorkModal({ task, onClose }) {
  const { commands, notify } = useInternship();
  const [attachment, setAttachment] = useState(null);
  const [uploading, setUploading] = useState(false);
  const action = useAction();
  async function attach(file) {
    if (!file) return;
    action.setError("");
    setUploading(true);
    try {
      const { saveAttachment } = await import("@/lib/intern-attachments.mjs");
      setAttachment(await saveAttachment(file, "submission"));
    } catch (error) {
      action.setError(error?.message || "Your file couldn’t be attached.");
    } finally {
      setUploading(false);
    }
  }
  async function sample() {
    await attach(
      new File(
        [
          `Project deliverable\n\nTask: ${task.title}\n\nSummary\nImplemented the assigned task and reviewed the result against the requirements.\n\nNext steps\nReady for mentor review and feedback.\n`,
        ],
        "sample-project-deliverable.txt",
        { type: "text/plain" },
      ),
    );
  }
  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const trigger = event.nativeEvent?.submitter || event.currentTarget;
    await action.run(
      () =>
        commands.submitWork(task.id, {
          notes: String(form.get("notes") || "").trim(),
          url: String(form.get("url") || "").trim(),
          ...(attachment ? { attachmentId: attachment.id } : {}),
        }),
      () => {
        burstFrom(trigger);
        notify("Your work has been submitted for review.");
        onClose();
      },
    );
  }
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={
        task.status === "Changes requested"
          ? "Submit a revision"
          : "Submit your work"
      }
      description={task.title}
    >
      <form className={styles.form} onSubmit={submit}>
        <ErrorMessage>{action.error}</ErrorMessage>
        <label className={styles.field}>
          What did you build?
          <textarea
            name="notes"
            rows={4}
            maxLength={5000}
            placeholder="Describe your work, the decisions you made, and anything you’d like your mentor to review."
          />
        </label>
        <label className={styles.field}>
          Project / repository link
          <input
            name="url"
            type="url"
            placeholder="https://github.com/yourname/project"
          />
          <small>
            Share an accessible repository, document, or deployed project.
          </small>
        </label>
        <div className={styles.uploadBox}>
          <span>
            <FileUp size={24} />
          </span>
          <strong>{attachment?.name || "Add a supporting file"}</strong>
          <small>Share a document, screenshot, or project deliverable.</small>
          <div className={styles.actions}>
            <label className={styles.fileButton}>
              <Upload size={14} />
              {uploading ? "Attaching…" : "Attach file"}
              <input
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.md,.png,.jpg,.jpeg,.gif,.webp,.zip"
                disabled={uploading || action.busy}
                onChange={(event) => attach(event.target.files?.[0])}
              />
            </label>

            {attachment && (
              <Button variant="ghost" onClick={() => setAttachment(null)}>
                Remove
              </Button>
            )}
          </div>
        </div>
        <Notice>
          Add notes, a work link, or an attachment. Each submission is saved as
          a new version, so earlier work and mentor feedback stay available.
        </Notice>
        <div className={styles.formActions}>
          <Button variant="ghost" disabled={action.busy} onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            busy={action.busy}
            disabled={action.busy || uploading}
          >
            <Send size={14} />
            Submit for review
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ProjectCard({ project, tasks }) {
  const approved = tasks.filter((task) => task.status === "Approved").length;
  const progress = tasks.length ? (approved / tasks.length) * 100 : 0;
  return (
    <article className={styles.projectCard}>
      <Link
        href={`/intern/portal/projects/${project.id}`}
        className={styles.projectArt}
        data-art={project.art || "planet"}
      >
        {project.art === "cube" ? (
          <span className={styles.cubeArt}>◇</span>
        ) : project.art === "orb" ? (
          <span className={styles.orbArt} />
        ) : (
          <PlanetArtwork />
        )}
      </Link>
      <div className={styles.projectCardBody}>
        <div className={styles.projectMeta}>
          <span>{project.program || "Olentra Internship"}</span>
          <Status value={project.status} />
        </div>
        <h2>
          <Link href={`/intern/portal/projects/${project.id}`}>
            {project.name}
          </Link>
        </h2>
        <p>{project.description}</p>
        <div className={styles.projectProgressLabel}>
          <span>
            {approved} of {tasks.length} tasks approved
          </span>
          <strong>{Math.round(progress)}%</strong>
        </div>
        <Progress value={progress} label={`${project.name} task completion`} />
        <div className={styles.projectCardFooter}>
          <span>
            {project.dueOn
              ? `Due ${formatDate(project.dueOn)}`
              : "Build at your own pace"}
          </span>
          <Link href={`/intern/portal/projects/${project.id}`}>
            View project <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function PortalProjects() {
  const { ready, my } = useInternship();
  if (!ready) return <Loading />;
  return (
    <>
      <Heading
        title="My Projects"
        description="Real projects. Meaningful progress. Your ideas in action."
      />
      <WorkGate>
        {(my.projects || []).length ? (
          <div className={styles.projectGrid}>
            {my.projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                tasks={(my.tasks || []).filter(
                  (task) => task.projectId === project.id,
                )}
              />
            ))}
          </div>
        ) : (
          <Panel>
            <EmptyState
              icon={BriefcaseBusiness}
              title="Your first project is on its way"
              description="The Olentra team will assign a project to you soon. We’ll notify you when it’s ready."
            />
          </Panel>
        )}
      </WorkGate>
    </>
  );
}

export function PortalProjectDetail({ projectId }) {
  const { ready, my, commands, notify } = useInternship();
  const [submitting, setSubmitting] = useState(null);
  const action = useAction();
  if (!ready) return <Loading />;
  const project = (my.projects || []).find((item) => item.id === projectId);
  const tasks = (my.tasks || []).filter((task) => task.projectId === projectId);
  const canEdit =
    my.application?.status === "Joined" && my.intern?.status === "Active";
  const approved = tasks.filter((task) => task.status === "Approved").length;
  async function start(task, trigger) {
    await action.run(
      () => commands.startTask(task.id),
      () => {
        burstFrom(trigger, { small: true });
        notify("Task started. Happy building!");
      },
    );
  }

  return (
    <>
      <Link className={styles.backLink} href="/intern/portal/projects">
        <ArrowLeft size={15} />
        Back to my projects
      </Link>
      <WorkGate>
        {!project ? (
          <Panel>
            <EmptyState
              icon={BriefcaseBusiness}
              title="Project unavailable"
              description="This project isn’t available in your workspace."
            >
              <Link href="/intern/portal/projects" className={styles.button}>
                View my projects <ArrowRight size={14} />
              </Link>
            </EmptyState>
          </Panel>
        ) : (
          <>
            <Heading
              title={project.name}
              description={project.program || "Your internship project"}
            >
              <Status value={project.status} />
            </Heading>
            <ErrorMessage>{action.error}</ErrorMessage>
            <div className={styles.projectDetailGrid}>
              <Panel>
                <h2>What we’re building</h2>
                <p className={styles.projectDescription}>
                  {project.description}
                </p>
                <ProjectPlan project={project} />
                <Skills values={project.skills || []} />
                <div className={styles.projectFacts}>
                  <div>
                    <span>Project deadline</span>
                    <strong>{formatDate(project.dueOn)}</strong>
                  </div>
                  <div>
                    <span>Your assigned tasks</span>
                    <strong>{tasks.length}</strong>
                  </div>
                  <div>
                    <span>Approved tasks</span>
                    <strong>{approved}</strong>
                  </div>
                </div>
              </Panel>
              <Panel className={styles.taskProgressCard}>
                <span className={styles.summaryIcon} data-tone="blue">
                  <ClipboardCheck size={24} />
                </span>
                <strong>
                  {tasks.length
                    ? Math.round((approved / tasks.length) * 100)
                    : 0}
                  %
                </strong>
                <span>of your tasks approved</span>
                <Progress
                  value={tasks.length ? (approved / tasks.length) * 100 : 0}
                />
                <p>Small steps. Meaningful progress.</p>
              </Panel>
            </div>
            {project.links?.length > 0 && (
              <Panel className={styles.sectionGap}>
                <InternProjectLinks
                  links={project.links}
                  githubProfile={my.application?.github}
                />
              </Panel>
            )}
            <Panel className={styles.sectionGap}>
              <div className={styles.panelHeader}>
                <h2>My tasks</h2>
                <span className={styles.muted}>{tasks.length} assigned</span>
              </div>
              {tasks.length ? (
                <div className={styles.taskList}>
                  {tasks.map((task) => {
                    const latest = (my.submissions || [])
                      .filter((submission) => submission.taskId === task.id)
                      .sort((a, b) => Number(b.version) - Number(a.version))[0];
                    return (
                      <article className={styles.taskCard} key={task.id}>
                        <div className={styles.taskTop}>
                          <span
                            className={styles.taskCheck}
                            data-done={task.status === "Approved"}
                          >
                            {task.status === "Approved" ? (
                              <Check size={16} />
                            ) : (
                              <ClipboardCheck size={16} />
                            )}
                          </span>
                          <div>
                            <h3>
                              {task.title}
                              {task.required && (
                                <span className={styles.requiredBadge}>
                                  Required
                                </span>
                              )}
                            </h3>
                            <p>{task.description}</p>
                            <TaskLinks links={task.links} />
                          </div>
                          <Status value={task.status} />
                        </div>
                        {latest?.feedback && (
                          <Notice
                            tone={
                              latest.status === "Approved" ? "green" : "blue"
                            }
                          >
                            <div>
                              <strong>
                                Mentor feedback · Version {latest.version}
                              </strong>
                              <p>{latest.feedback}</p>
                            </div>
                          </Notice>
                        )}
                        <div className={styles.taskFooter}>
                          <span>
                            {task.dueOn
                              ? `Due ${formatDate(task.dueOn)}`
                              : "No deadline set"}
                          </span>
                          <div className={styles.actions}>
                            {latest && (
                              <Link
                                href="/intern/portal/submissions"
                                className={styles.textLink}
                              >
                                View submissions <ArrowRight size={13} />
                              </Link>
                            )}
                            {canEdit && task.status === "Todo" && (
                              <Button
                                variant="secondary"
                                busy={action.busy}
                                disabled={action.busy}
                                onClick={(event) => start(task, event.currentTarget)}
                              >
                                <Play size={13} />
                                Start task
                              </Button>
                            )}
                            {canEdit &&
                              ["In progress", "Changes requested"].includes(
                                task.status,
                              ) && (
                                <Button onClick={() => setSubmitting(task)}>
                                  <Upload size={14} />
                                  {task.status === "Changes requested"
                                    ? "Submit revision"
                                    : "Submit work"}
                                </Button>
                              )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={ClipboardCheck}
                  title="No tasks assigned yet"
                  description="Your mentor will add tasks here when the project is ready for you."
                />
              )}
            </Panel>
          </>
        )}
      </WorkGate>
      {submitting && canEdit && (
        <SubmitWorkModal
          key={submitting.id}
          task={submitting}
          onClose={() => setSubmitting(null)}
        />
      )}
    </>
  );
}
