"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Download,
  ExternalLink,
  ListTodo,
  MessageSquare,
  Plus,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useInternship } from "@/components/intern/InternshipProvider";
import { downloadAttachment } from "@/lib/intern-attachments.mjs";
import {
  Avatar,
  Button,
  EmptyState,
  Panel,
  StatusBadge,
  Tabs,
  formatDate,
} from "./DashboardUI";
import styles from "./company-workflow.module.css";

function localDate(days = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function timestamp(value) {
  if (!value || Number.isNaN(Date.parse(value))) return "";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
function safeUrl(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
function latest(records, applicationId) {
  return (records || [])
    .filter((record) => record.applicationId === applicationId)
    .at(-1);
}
async function perform(command, notify, message) {
  try {
    const result = await command();
    if (!result?.ok) {
      notify(
        result?.error ||
          "This action could not be completed. Please try again.",
      );
      return false;
    }
    if (message) notify(message);
    return result;
  } catch {
    notify("This action could not be completed. Please try again.");
    return false;
  }
}

export function ApplicantNextAction({ applicationId, onOpenWorkflow }) {
  const { data } = useInternship();
  const application = data.applications.find(
    (item) => item.id === applicationId,
  );
  if (!application) return null;
  const offer = latest(data.offers, applicationId);
  const onboarding = latest(data.onboarding, applicationId);
  const joined = application.status === "Joined";
  const step = joined
    ? "Intern workspace ready"
    : onboarding?.status === "Submitted"
      ? "Onboarding is ready to review"
      : offer?.status === "Accepted"
        ? "Waiting for onboarding"
        : offer?.status === "Sent"
          ? "Waiting for the applicant’s response"
          : offer?.status === "Declined"
            ? "Offer declined"
            : application.status === "Selected"
              ? "Ready to send an offer"
              : "Review this application";
  const description = joined
    ? "Enrollment is complete. Assign projects and manage their internship from the Interns page."
    : onboarding?.status === "Submitted"
      ? "Review the submitted details and acknowledgements, then approve enrollment."
      : offer?.status === "Accepted"
        ? "The applicant has accepted the offer and can complete onboarding in their portal."
        : offer?.status === "Sent"
          ? "The applicant can review and accept or decline the offer from their portal."
          : application.status === "Selected"
            ? "Share internship dates, stipend, and a welcome message to start onboarding."
            : "Select this applicant when the review is complete to continue with their offer.";
  return (
    <Panel className={`${styles.workflow} ${styles.nextAction}`}>
      <span className={styles.nextActionIcon}>
        <ShieldCheck size={23} />
      </span>
      <div>
        <h2>{step}</h2>
        <p>{description}</p>
      </div>
      {joined ? (
        <Link className={styles.inlineLink} href="/intern/dashboard/interns">
          Manage intern
          <ArrowRight size={14} />
        </Link>
      ) : (
        <Button variant="secondary" onClick={onOpenWorkflow}>
          View workflow
          <ArrowRight size={14} />
        </Button>
      )}
    </Panel>
  );
}

export function ApplicantWorkflow({ applicationId }) {
  const { data, account, commands, notify } = useInternship();
  const application = data.applications.find(
    (item) => item.id === applicationId,
  );
  const offer = latest(data.offers, applicationId);
  const onboarding = latest(data.onboarding, applicationId);
  const [tab, setTab] = useState("offer");
  const [busy, setBusy] = useState(false);
  const [offerForm, setOfferForm] = useState({
    startOn: localDate(7),
    endOn: localDate(97),
    stipend: 0,
    message:
      "We’re excited to welcome you to the Olentra internship program. Review your offer and take the next step in your journey.",
  });
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  useEffect(() => {
    setTab("offer");
    setSubject("");
    setBody("");
  }, [applicationId]);
  useEffect(() => {
    setOfferForm((previous) => ({
      ...previous,
      stipend:
        application?.programId === "innovator"
          ? data.settings?.maxStipend || 20000
          : 0,
    }));
  }, [applicationId, application?.programId, data.settings?.maxStipend]);
  const messages = useMemo(
    () =>
      (data.messages || [])
        .filter((message) => message.applicationId === applicationId)
        .sort(
          (first, second) =>
            new Date(first.createdOn) - new Date(second.createdOn),
        ),
    [data.messages, applicationId],
  );
  if (!application || account?.role !== "company") return null;
  const canOffer =
    application.status === "Selected" &&
    !["Sent", "Accepted"].includes(offer?.status);
  const canApprove =
    offer?.status === "Accepted" &&
    onboarding?.status === "Submitted" &&
    application.status === "Selected";

  async function sendOffer(event) {
    event.preventDefault();
    if (busy || !canOffer) return;
    if (offerForm.endOn < offerForm.startOn) {
      notify("The internship end date must follow its start date.");
      return;
    }
    setBusy(true);
    try {
      await perform(
        () =>
          commands.sendOffer(applicationId, {
            ...offerForm,
            stipend: Number(offerForm.stipend),
            message: offerForm.message.trim(),
          }),
        notify,
        "Offer sent to the applicant’s portal.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function approve() {
    if (busy || !canApprove) return;
    setBusy(true);
    try {
      await perform(
        () => commands.approveOnboarding(applicationId),
        notify,
        "Onboarding approved. The applicant is now an active intern.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function sendMessage(event) {
    event.preventDefault();
    if (busy || !subject.trim() || !body.trim()) return;
    setBusy(true);
    try {
      if (
        await perform(
          () =>
            commands.sendMessage(applicationId, {
              subject: subject.trim(),
              body: body.trim(),
            }),
          notify,
          "Message sent to the applicant’s portal.",
        )
      ) {
        setSubject("");
        setBody("");
      }
    } finally {
      setBusy(false);
    }
  }
  async function download(id) {
    try {
      await downloadAttachment(id);
    } catch {
      notify("This document is unavailable in this browser.");
    }
  }

  return (
    <Panel className={styles.workflow}>
      <div className={styles.heading}>
        <span className={styles.headingIcon}>
          <ClipboardCheck size={20} />
        </span>
        <div>
          <h2>Applicant Workflow</h2>
          <p>From a warm welcome to their first day.</p>
        </div>
      </div>
      <Tabs
        items={[
          { id: "offer", label: "Offer" },
          { id: "onboarding", label: "Onboarding" },
          { id: "messages", label: "Messages", count: messages.length },
        ]}
        value={tab}
        onChange={setTab}
        label="Applicant workflow"
      />
      {tab === "offer" && (
        <div className={styles.tabBody}>
          {offer && (
            <div className={styles.offerSummary}>
              <div className={styles.rowBetween}>
                <strong>Internship offer</strong>
                <StatusBadge status={offer.status} />
              </div>
              <dl>
                <div>
                  <dt>Start date</dt>
                  <dd>{formatDate(offer.startOn)}</dd>
                </div>
                <div>
                  <dt>End date</dt>
                  <dd>{formatDate(offer.endOn)}</dd>
                </div>
                <div>
                  <dt>Monthly stipend</dt>
                  <dd>₹{Number(offer.stipend || 0).toLocaleString("en-IN")}</dd>
                </div>
              </dl>
              {offer.message && <p>{offer.message}</p>}
              {(offer.respondedOn || offer.decidedOn) && (
                <small>
                  Response received{" "}
                  {timestamp(offer.respondedOn || offer.decidedOn)}
                </small>
              )}
            </div>
          )}
          {canOffer ? (
            <form className={styles.form} onSubmit={sendOffer}>
              <div className={styles.formGrid}>
                <label>
                  Start date
                  <input
                    required
                    type="date"
                    value={offerForm.startOn}
                    onChange={(event) =>
                      setOfferForm({
                        ...offerForm,
                        startOn: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  End date
                  <input
                    required
                    type="date"
                    min={offerForm.startOn}
                    value={offerForm.endOn}
                    onChange={(event) =>
                      setOfferForm({ ...offerForm, endOn: event.target.value })
                    }
                  />
                </label>
                <label className={styles.fullWidth}>
                  Monthly stipend (₹)
                  <input
                    required
                    type="number"
                    min="0"
                    max={
                      application.programId === "explorer"
                        ? 0
                        : data.settings?.maxStipend || 20000
                    }
                    readOnly={application.programId === "explorer"}
                    value={offerForm.stipend}
                    onChange={(event) =>
                      setOfferForm({
                        ...offerForm,
                        stipend: event.target.value,
                      })
                    }
                  />
                </label>
                <label className={styles.fullWidth}>
                  Welcome message
                  <textarea
                    rows={4}
                    value={offerForm.message}
                    maxLength={2000}
                    onChange={(event) =>
                      setOfferForm({
                        ...offerForm,
                        message: event.target.value,
                      })
                    }
                    required
                  />
                </label>
              </div>
              <div className={styles.formActions}>
                <Button type="submit" disabled={busy}>
                  <Send size={15} />
                  {busy ? "Sending…" : "Send offer"}
                </Button>
              </div>
            </form>
          ) : (
            <p className={styles.guidance}>
              {application.status === "Joined"
                ? "This intern has completed enrollment."
                : offer?.status === "Sent"
                  ? "The applicant can accept or decline this offer from their portal."
                  : offer?.status === "Accepted"
                    ? "Offer accepted. Continue to Onboarding to review their enrollment details."
                    : "Select this applicant in the application review to prepare an internship offer."}
            </p>
          )}
        </div>
      )}
      {tab === "onboarding" && (
        <div className={styles.tabBody}>
          <div className={styles.rowBetween}>
            <h3>Enrollment checklist</h3>
            <StatusBadge status={onboarding?.status || "Not started"} />
          </div>
          <ul className={styles.checklist}>
            <li data-complete={offer?.status === "Accepted"}>
              <CheckCircle2 size={17} />
              <div>
                <strong>Offer accepted</strong>
                <span>
                  {offer?.status === "Accepted"
                    ? "The internship offer has been accepted."
                    : "The applicant must accept their offer first."}
                </span>
              </div>
            </li>
            <li
              data-complete={["Submitted", "Approved"].includes(
                onboarding?.status,
              )}
            >
              <CheckCircle2 size={17} />
              <div>
                <strong>Onboarding details submitted</strong>
                <span>
                  {onboarding?.submittedOn
                    ? `Submitted ${timestamp(onboarding.submittedOn)}`
                    : "The applicant completes this in their portal."}
                </span>
              </div>
            </li>
            <li data-complete={Boolean(onboarding?.acknowledged)}>
              <CheckCircle2 size={17} />
              <div>
                <strong>Program acknowledgement</strong>
                <span>
                  {onboarding?.acknowledged
                    ? "Program guidelines and responsibilities acknowledged."
                    : "Waiting for the applicant’s acknowledgement."}
                </span>
              </div>
            </li>
            <li
              data-complete={
                onboarding?.status === "Approved" ||
                application.status === "Joined"
              }
            >
              <ShieldCheck size={17} />
              <div>
                <strong>Company approval</strong>
                <span>
                  {application.status === "Joined"
                    ? "Enrollment approved. Intern workspace is active."
                    : "Review the submitted details before approving."}
                </span>
              </div>
            </li>
          </ul>
          {onboarding && (
            <div className={styles.onboardingDetails}>
              <h3>Submitted details</h3>
              <dl>
                <div>
                  <dt>Name</dt>
                  <dd>{onboarding.fullName || application.name}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{application.email}</dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>
                    {onboarding.phone || application.phone || "Not provided"}
                  </dd>
                </div>
                <div>
                  <dt>College</dt>
                  <dd>
                    {onboarding.college ||
                      application.college ||
                      "Not provided"}
                  </dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>
                    {onboarding.location ||
                      application.location ||
                      "Not provided"}
                  </dd>
                </div>
              </dl>
              {(onboarding.documentAttachmentId ||
                onboarding.resumeAttachmentId ||
                application.resumeAttachmentId) && (
                <Button
                  variant="secondary"
                  onClick={() =>
                    download(
                      onboarding.documentAttachmentId ||
                        onboarding.resumeAttachmentId ||
                        application.resumeAttachmentId,
                    )
                  }
                >
                  <Download size={14} />
                  View document
                </Button>
              )}
            </div>
          )}
          <div className={styles.formActions}>
            <Button onClick={approve} disabled={busy || !canApprove}>
              <ShieldCheck size={15} />
              {busy
                ? "Approving…"
                : application.status === "Joined"
                  ? "Enrollment approved"
                  : "Approve onboarding"}
            </Button>
          </div>
        </div>
      )}
      {tab === "messages" && (
        <div className={styles.tabBody}>
          <div className={styles.messageList}>
            {messages.length ? (
              messages.map((message) => {
                const sender = (data.accounts || []).find(
                  (person) => person.id === message.senderAccountId,
                );
                const company = message.senderRole === "company";
                return (
                  <article
                    className={`${styles.message} ${company ? styles.companyMessage : ""}`}
                    key={message.id}
                  >
                    <div className={styles.rowBetween}>
                      <strong>
                        {message.senderAccountId === account.id
                          ? "You"
                          : sender?.name ||
                            (company ? "Olentra team" : application.name)}
                      </strong>
                      <time>{timestamp(message.createdOn)}</time>
                    </div>
                    <h3>{message.subject}</h3>
                    <p>{message.body}</p>
                  </article>
                );
              })
            ) : (
              <div className={styles.smallEmpty}>
                <MessageSquare size={25} />
                <p>
                  Start a conversation with {application.name.split(" ")[0]}.
                </p>
              </div>
            )}
          </div>
          <form className={styles.form} onSubmit={sendMessage}>
            <label>
              Subject
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="A quick update on your Olentra journey"
                required
                maxLength={140}
              />
            </label>
            <label>
              Message
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={4}
                placeholder="Write a message…"
                required
                maxLength={3000}
              />
            </label>
            <div className={styles.formActions}>
              <Button
                type="submit"
                disabled={busy || !subject.trim() || !body.trim()}
              >
                <Send size={15} />
                {busy ? "Sending…" : "Send message"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </Panel>
  );
}

function TaskEditor({ task, onSave, onCancel, busy }) {
  const [form, setForm] = useState({
    title: task.title,
    description: task.description,
    dueOn: task.dueOn,
    required: task.required,
  });
  return (
    <form
      className={styles.editTaskForm}
      onSubmit={(event) => {
        event.preventDefault();
        onSave(form);
      }}
    >
      <label>
        Task title
        <input
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          required
          maxLength={140}
        />
      </label>
      <label>
        Description
        <textarea
          value={form.description}
          onChange={(event) =>
            setForm({ ...form, description: event.target.value })
          }
          required
          rows={3}
          maxLength={3000}
        />
      </label>
      <label>
        Due date
        <input
          type="date"
          value={form.dueOn}
          onChange={(event) => setForm({ ...form, dueOn: event.target.value })}
          required
        />
      </label>
      <label className={styles.checkbox}>
        <input
          type="checkbox"
          checked={form.required}
          onChange={(event) =>
            setForm({ ...form, required: event.target.checked })
          }
        />
        Required for internship completion
      </label>
      <div className={styles.formActions}>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          <Check size={14} />
          Save task
        </Button>
      </div>
    </form>
  );
}

function SubmissionReview({
  task,
  submissions,
  applicant,
  busy,
  onReview,
  notify,
}) {
  const [feedback, setFeedback] = useState("");
  const ordered = [...submissions].sort(
    (first, second) =>
      second.version - first.version ||
      new Date(second.submittedOn) - new Date(first.submittedOn),
  );
  const submission = ordered[0];
  if (!submission) return null;
  async function review(event) {
    event.preventDefault();
    const decision = event.nativeEvent.submitter?.value || "Approved";
    if (decision === "Changes requested" && !feedback.trim()) {
      notify("Add feedback so the intern knows what to improve.");
      return;
    }
    if (await onReview(submission.id, { decision, feedback: feedback.trim() }))
      setFeedback("");
  }
  async function download() {
    try {
      await downloadAttachment(submission.attachmentId);
    } catch {
      notify("This submission attachment is unavailable in this browser.");
    }
  }
  return (
    <article className={styles.reviewCard}>
      <div className={styles.reviewHeading}>
        <Avatar person={applicant} size={33} />
        <div>
          <h3>{task.title}</h3>
          <p>
            {applicant?.name || "Intern"} · Version {submission.version} ·{" "}
            {timestamp(submission.submittedOn)}
          </p>
        </div>
        <StatusBadge status={submission.status} />
      </div>
      {submission.notes && (
        <p className={styles.submissionNotes}>{submission.notes}</p>
      )}
      <div className={styles.submissionLinks}>
        {safeUrl(submission.url) && (
          <a href={safeUrl(submission.url)} target="_blank" rel="noreferrer">
            <ExternalLink size={14} />
            Open submission
          </a>
        )}
        {submission.attachmentId && (
          <Button variant="secondary" onClick={download}>
            <Download size={14} />
            Download attachment
          </Button>
        )}
      </div>
      {submission.feedback && (
        <div className={styles.feedback}>
          <strong>Review feedback</strong>
          <p>{submission.feedback}</p>
          <small>{timestamp(submission.reviewedOn)}</small>
        </div>
      )}
      {submission.status === "Submitted" && (
        <form className={styles.reviewForm} onSubmit={review}>
          <label>
            Feedback
            <textarea
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              rows={3}
              maxLength={3000}
              placeholder="Share what’s working well or what needs another pass…"
            />
          </label>
          <div className={styles.formActions}>
            <Button
              variant="secondary"
              name="decision"
              value="Changes requested"
              type="submit"
              disabled={busy}
            >
              Request changes
            </Button>
            <Button
              name="decision"
              value="Approved"
              type="submit"
              disabled={busy}
            >
              <Check size={15} />
              Approve submission
            </Button>
          </div>
        </form>
      )}
      {ordered.length > 1 && (
        <details className={styles.versionHistory}>
          <summary>Previous submissions ({ordered.length - 1})</summary>
          {ordered.slice(1).map((version) => (
            <div key={version.id}>
              <strong>Version {version.version}</strong>
              <StatusBadge status={version.status} />
              <time>{timestamp(version.submittedOn)}</time>
              <p>{version.notes}</p>
              {version.feedback && <p>Feedback: {version.feedback}</p>}
            </div>
          ))}
        </details>
      )}
    </article>
  );
}

export function ProjectWorkflow({ projectId }) {
  const { data, account, commands, notify } = useInternship();
  const project = data.projects.find((item) => item.id === projectId);
  const [tab, setTab] = useState("tasks");
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form, setForm] = useState({
    applicationId: "",
    title: "",
    description: "",
    dueOn: localDate(7),
    required: true,
  });
  const tasks = (data.tasks || []).filter(
    (task) => task.projectId === projectId,
  );
  const people = new Map(
    data.applications.map((application) => [application.id, application]),
  );
  const activeIds = new Set(
    (data.interns || [])
      .filter((intern) => intern.status === "Active")
      .map((intern) => intern.applicationId),
  );
  const assignees = (project?.team || [])
    .filter((id) => activeIds.has(id))
    .map((id) => people.get(id))
    .filter(Boolean);
  const submissions = data.submissions || [];
  const submittedTasks = tasks.filter((task) =>
    submissions.some((submission) => submission.taskId === task.id),
  );
  const reviewCount = tasks.filter(
    (task) =>
      [...submissions]
        .filter((submission) => submission.taskId === task.id)
        .sort((a, b) => b.version - a.version)[0]?.status === "Submitted",
  ).length;
  if (!project || account?.role !== "company") return null;
  async function createTask(event) {
    event.preventDefault();
    if (
      busy ||
      !form.title.trim() ||
      !form.description.trim() ||
      !form.applicationId
    )
      return;
    setBusy(true);
    try {
      if (
        await perform(
          () =>
            commands.createTask({
              ...form,
              projectId,
              title: form.title.trim(),
              description: form.description.trim(),
            }),
          notify,
          "Task assigned to the intern’s workspace.",
        )
      ) {
        setCreating(false);
        setForm({
          applicationId: "",
          title: "",
          description: "",
          dueOn: localDate(7),
          required: true,
        });
      }
    } finally {
      setBusy(false);
    }
  }
  async function updateTask(patch) {
    if (busy || !editingTask) return;
    setBusy(true);
    try {
      if (
        await perform(
          () =>
            commands.updateTask(editingTask, {
              ...patch,
              title: patch.title.trim(),
              description: patch.description.trim(),
            }),
          notify,
          "Task updated.",
        )
      )
        setEditingTask(null);
    } finally {
      setBusy(false);
    }
  }
  async function reviewSubmission(id, decision) {
    if (busy) return false;
    setBusy(true);
    try {
      return await perform(
        () => commands.reviewSubmission(id, decision),
        notify,
        decision.decision === "Approved"
          ? "Submission approved. The intern has been notified."
          : "Feedback sent. The intern can submit a new version.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.workflow}>
      <div className={styles.heading}>
        <span className={styles.headingIcon}>
          <ListTodo size={21} />
        </span>
        <div>
          <h2>Tasks & Reviews</h2>
          <p>Assign focused work and keep feedback moving.</p>
        </div>
        <Button
          variant="secondary"
          onClick={() => setCreating((value) => !value)}
          disabled={!assignees.length}
        >
          <Plus size={15} />
          Assign task
        </Button>
      </div>
      <div className={styles.taskStats}>
        <span>
          <strong>{tasks.length}</strong> assigned
        </span>
        <span>
          <strong>
            {tasks.filter((task) => task.status === "Approved").length}
          </strong>{" "}
          approved
        </span>
        <span>
          <strong>{reviewCount}</strong> awaiting review
        </span>
      </div>
      {!assignees.length && (
        <p className={styles.guidance}>
          Add an active intern to the project team and save the project before
          assigning tasks.
        </p>
      )}
      {creating && (
        <form className={styles.createTaskForm} onSubmit={createTask}>
          <h3>Assign a new task</h3>
          <div className={styles.formGrid}>
            <label className={styles.fullWidth}>
              Assign to
              <select
                value={form.applicationId}
                onChange={(event) =>
                  setForm({ ...form, applicationId: event.target.value })
                }
                required
              >
                <option value="">Choose an active project member</option>
                {assignees.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.fullWidth}>
              Task title
              <input
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                placeholder="e.g. Build the applications filter"
                required
                minLength={3}
                maxLength={140}
              />
            </label>
            <label className={styles.fullWidth}>
              Description
              <textarea
                rows={3}
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                placeholder="Define the expected outcome and acceptance criteria."
                required
                minLength={10}
                maxLength={3000}
              />
            </label>
            <label>
              Due date
              <input
                type="date"
                value={form.dueOn}
                onChange={(event) =>
                  setForm({ ...form, dueOn: event.target.value })
                }
                required
              />
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={form.required}
                onChange={(event) =>
                  setForm({ ...form, required: event.target.checked })
                }
              />
              Required for completion
            </label>
          </div>
          <div className={styles.formActions}>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              <Plus size={15} />
              {busy ? "Assigning…" : "Assign task"}
            </Button>
          </div>
        </form>
      )}
      <Tabs
        items={[
          { id: "tasks", label: "Assigned tasks", count: tasks.length },
          { id: "reviews", label: "Submissions", count: submittedTasks.length },
        ]}
        value={tab}
        onChange={setTab}
        label="Project workflow"
      />
      <div className={styles.tabBody}>
        {tab === "tasks" ? (
          tasks.length ? (
            <div className={styles.taskList}>
              {tasks.map((task) => (
                <article className={styles.taskCard} key={task.id}>
                  <div className={styles.rowBetween}>
                    <h3>{task.title}</h3>
                    <StatusBadge status={task.status} />
                  </div>
                  <p>{task.description}</p>
                  <div className={styles.taskMeta}>
                    <span>
                      <UserRound size={13} />
                      {people.get(task.applicationId)?.name || "Intern"}
                    </span>
                    <span>
                      <CalendarDays size={13} />
                      Due {formatDate(task.dueOn)}
                    </span>
                    {task.required && (
                      <span className={styles.required}>Required</span>
                    )}
                  </div>
                  <div className={styles.taskActions}>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setEditingTask(editingTask === task.id ? null : task.id)
                      }
                    >
                      Edit task
                    </Button>
                    {submissions.some(
                      (submission) => submission.taskId === task.id,
                    ) && (
                      <Button
                        variant="secondary"
                        onClick={() => setTab("reviews")}
                      >
                        View submission
                        <ArrowRight size={13} />
                      </Button>
                    )}
                  </div>
                  {editingTask === task.id && (
                    <TaskEditor
                      task={task}
                      onSave={updateTask}
                      onCancel={() => setEditingTask(null)}
                      busy={busy}
                    />
                  )}
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No tasks assigned yet"
              description="Create a task for an active project member to start the submission and review cycle."
            />
          )
        ) : submittedTasks.length ? (
          <div className={styles.taskList}>
            {submittedTasks.map((task) => (
              <SubmissionReview
                key={task.id}
                task={task}
                submissions={submissions.filter(
                  (submission) => submission.taskId === task.id,
                )}
                applicant={people.get(task.applicationId)}
                busy={busy}
                onReview={reviewSubmission}
                notify={notify}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No submissions yet"
            description="Work submitted by this project’s interns will appear here for review."
          />
        )}
      </div>
    </section>
  );
}
