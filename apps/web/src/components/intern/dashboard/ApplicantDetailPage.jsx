"use client";

import ProjectPlan from "../ProjectPlan";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CircleCheck,
  Clock3,
  ExternalLink,
  FileText,
  Github,
  GraduationCap,
  Linkedin,
  Video,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  X,
} from "lucide-react";
import { useDashboard } from "./DashboardProvider";
import { useInternship } from "@/components/intern/InternshipProvider";
import { applicationDurationLabel, internScheduleLabel } from "@/lib/intern/opportunities.mjs";
import LoadingIndicator from "@olentra/ui/LoadingIndicator";
import { hasStaffPermission } from "./staffAccess";
import { downloadAttachment } from "@/lib/intern-attachments.mjs";
import { useInternQuery } from "../useInternQuery";
import AssignmentEditor, { AssignExistingProject } from "./AssignmentEditor";
import QueryStatus from "./QueryStatus";
import ResumeViewer from "./ResumeViewer";
import { ApplicantNextAction, ApplicantWorkflow } from "./CompanyWorkflow";
import StaffAccountControls from "./StaffAccountControls";
import EraseApplicantPanel from "./EraseApplicantPanel";
import ApplicantScorePanel from "./ApplicantScorePanel";
import AiReviewPanel from "./AiReviewPanel";
import TemplatePicker from "./TemplatePicker";
import { toEmbed } from "@/lib/intern/video-embed.mjs";
import { useBookmarks } from "./useBookmarks";
import {
  Avatar,
  BookmarkToggle,
  Button,
  EmptyState,
  Modal,
  Pagination,
  Panel,
  StatusBadge,
  Tabs,
  TrackBadge,
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
  "Withdrawn",
];
const PROFILE_TABS = [
  { id: "overview", label: "Overview" },
  { id: "application", label: "Application" },
  { id: "projects", label: "Projects & tasks" },
  { id: "activity", label: "Activity" },
];

function dateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(value.includes("T") ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

function dateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function safeProfileUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export default function ApplicantDetailPage({ applicationId }) {
  const { data, notify, updateApplication, addActivity } = useDashboard();
  const { commands, account, ready } = useInternship();
  const isAdmin = account?.staffRole === "admin";
  const canReview = hasStaffPermission(account, "applications.review");
  // Resumes need the narrower "Download applicant resumes" grant on top of applications.read.
  const canResume = hasStaffPermission(account, "resumes.read");
  const [resumeOpen, setResumeOpen] = useState(false);
  const canTasks = hasStaffPermission(account, "tasks.read");
  const canProjects = hasStaffPermission(account, "projects.read");
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const application = (data.applications || []).find((item) => item.id === applicationId);
  const listedInterview = (data.interviews || []).find((item) => item.applicationId === applicationId) || null;
  const [savedInterview, setSavedInterview] = useState(listedInterview);
  const interview = savedInterview || listedInterview;
  const [interviewTime, setInterviewTime] = useState(dateTimeLocal(interview?.scheduledAt));
  const [meetingUrl, setMeetingUrl] = useState(interview?.meetingUrl || "");
  const canMessage = hasStaffPermission(account, application?.status === "Joined" ? "messages.interns" : "messages.applicants");
  const [loadingRecord, setLoadingRecord] = useState(true);
  const [recordError, setRecordError] = useState("");
  useEffect(() => { let active = true; setLoadingRecord(true); setRecordError(""); commands.getApplication(applicationId).then(result => { if(active) { setRecordError(result.ok ? "" : result.error); setLoadingRecord(false); } }); return () => { active = false; }; }, [commands, applicationId]);
  const [tab, setTab] = useState("overview");
  const [status, setStatus] = useState(application?.status || "Applied");
  const [note, setNote] = useState("");
  const [contactOpen, setContactOpen] = useState(false);
  const [subject, setSubject] = useState("Your Olentra internship application");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const bookmarks = useBookmarks({ commands, notify, onChanged: () => commands.getApplication(applicationId) });

  useEffect(() => {
    setStatus(application?.status || "Applied");
  }, [application?.status, applicationId]);
  useEffect(() => {
    setSavedInterview(listedInterview);
    setInterviewTime(dateTimeLocal(listedInterview?.scheduledAt));
    setMeetingUrl(listedInterview?.meetingUrl || "");
  }, [applicationId, listedInterview?.id, listedInterview?.scheduledAt, listedInterview?.meetingUrl]);
  useEffect(() => {
    setTab("overview");
    setNote("");
    setContactOpen(false);
    setSubject("Your Olentra internship application");
    setMessage("");
  }, [applicationId]);

  const [linkedProjectPage, setLinkedProjectPage] = useState(1);
  const [editor, setEditor] = useState(null);
  const canManageProjects = canProjects && hasStaffPermission(account, "projects.manage");
  const canManageTasks = canTasks && hasStaffPermission(account, "tasks.manage");
  const activeIntern = data.interns?.some(intern => intern.applicationId === applicationId && intern.status === "Active");
  const projectQuery = useInternQuery("project.list", { applicationId, page: linkedProjectPage, pageSize: 10 }, { enabled: tab === "projects" && canProjects });
  const projectListing = projectQuery.data || { items: [], total: 0 };
  useEffect(() => { setLinkedProjectPage(1); setEditor(null); }, [applicationId]);
  useEffect(() => {
    if (projectQuery.data) setLinkedProjectPage(page => Math.min(page, Math.max(1, Math.ceil(projectQuery.data.total / 10))));
  }, [projectQuery.data]);
  const linkedProjects = projectListing.items;
  const history = useMemo(
    () =>
      [...(application?.history || [])].sort(
        (first, second) => new Date(first.date) - new Date(second.date),
      ),
    [application?.history],
  );
  const activities = useMemo(
    () =>
      (data.activity || []).filter((activity) => activity.applicationId === applicationId),
    [data.activity, applicationId],
  );
  const notes = application?.notes || [];

  if (!ready || loadingRecord)
    return (
      <div className={common.page} aria-busy="true">
        <Panel>
          <LoadingIndicator label="Loading application…" />
        </Panel>
      </div>
    );

  if (recordError)
    return <div className={common.page}><Panel><p role="alert">{recordError}</p><Link className={styles.backLink} href="/intern/dashboard/applications">Back to Applications</Link></Panel></div>;

  if (!application)
    return (
      <div className={common.page}>
        <EmptyState
          title="Application not found"
          description="This applicant is no longer available in the internship directory."
        />
        <Link className={styles.backLink} href="/intern/dashboard/applications">
          <ArrowLeft size={15} />
          Back to Applications
        </Link>
      </div>
    );

  async function saveStatus(event) {
    event.preventDefault();
    if (status === application.status) {
      notify("This application status is already up to date.");
      return;
    }
    if (busy) return;
    setBusy("status");
    try {
      if ((await updateApplication(applicationId, { status })) === false) return;
      notify(`${application.name}’s application status updated.`);
    } finally {
      setBusy("");
    }
  }

  async function quickApprove() {
    if (busy || application.status === "Selected" || application.status === "Joined") return;
    setBusy("status");
    try {
      if ((await updateApplication(applicationId, { status: "Selected" })) === false) return;
      setStatus("Selected");
      notify(`${application.name} has been approved! Selection email and portal invite sent.`);
    } finally {
      setBusy("");
    }
  }

  async function quickReject() {
    if (busy || application.status === "Rejected") return;
    setBusy("status");
    try {
      if ((await updateApplication(applicationId, { status: "Rejected" })) === false) return;
      setStatus("Rejected");
      notify(`${application.name}’s application marked as not selected.`);
    } finally {
      setBusy("");
    }
  }

  async function saveInterview(event) {
    event.preventDefault();
    if (!interviewTime || !meetingUrl.trim() || busy) return;
    setBusy("interview");
    try {
      const result = await commands.scheduleInterview(applicationId, {
        scheduledAt: new Date(interviewTime).toISOString(),
        meetingUrl: meetingUrl.trim(),
      });
      if (!result.ok) {
        notify(result.error || "The interview could not be scheduled.");
        return;
      }
      setSavedInterview(result.data);
      notify(`${application.name}’s interview was scheduled.`);
    } finally {
      setBusy("");
    }
  }

  async function cancelInterview() {
    if (busy) return;
    const reason = window.prompt("Cancel this interview? Add a short reason for the applicant (optional).");
    if (reason === null) return;
    setBusy("interview");
    try {
      const result = await commands.cancelInterview(applicationId, reason.trim());
      if (!result.ok) { notify(result.error || "The interview could not be cancelled."); return; }
      setSavedInterview(result.data);
      notify("Interview cancelled. The applicant has been emailed.");
    } finally {
      setBusy("");
    }
  }

  async function saveNote(event) {
    event.preventDefault();
    const text = note.trim();
    if (!text || busy) return;
    setBusy("note");
    try {
      const saved = await updateApplication(applicationId, {
        notes: [
          ...notes,
          {
            id: `note-${Date.now()}`,
            text,
            author: account?.name || data.user?.name || "Admin",
            date: new Date().toISOString(),
          },
        ],
      });
      if (saved === false) return;
      await addActivity({
        title: "Reviewer note added",
        detail: `${data.user?.name || "Admin"} added a note for ${application.name}.`,
        applicationId,
        tone: "purple",
        icon: "application",
      });
      setNote("");
      notify("Reviewer note saved.");
    } finally {
      setBusy("");
    }
  }

  async function downloadResume() {
    if (!application.resumeAttachmentId) {
      notify("No resume is on file for this application.");
      return;
    }
    try {
      await downloadAttachment(application.resumeAttachmentId);
      notify(`${application.name}’s resume downloaded.`);
    } catch (error) {
      notify(error?.message || "This resume could not be downloaded.");
    }
  }

  async function saveContact(event) {
    event.preventDefault();
    if (!subject.trim() || !message.trim() || busy) return;
    setBusy("contact");
    try {
      const result = await commands.sendMessage(applicationId, {
        subject: subject.trim(),
        body: message.trim(),
      });
      if (!result?.ok) {
        notify(result?.error || "The message could not be sent.");
        return;
      }
      setContactOpen(false);
      setMessage("");
      notify("Message sent to this applicant’s portal.");
    } finally {
      setBusy("");
    }
  }

  const personalDetails = (
    <Panel className={styles.personalPanel}>
      <h2 className={styles.panelHeading}>Personal Details</h2>
      <ul className={styles.personalDetails}>
        <li>
          <Mail size={15} />
          <a href={`mailto:${application.email}`}>{application.email}</a>
        </li>
        <li>
          <Phone size={15} />
          {application.phone ? (
            <a href={`tel:${application.phone.replace(/[^+\d]/g, "")}`}>
              {application.phone}
            </a>
          ) : (
            <span>Not provided</span>
          )}
        </li>
        <li>
          <GraduationCap size={16} />
          <span>{application.college || "Not provided"}</span>
        </li>
        <li>
          <MapPin size={15} />
          <span>{application.location || "Not provided"}</span>
        </li>
        <li>
          <Github size={15} />
          {safeProfileUrl(application.github) ? (
            <a
              href={safeProfileUrl(application.github)}
              target="_blank"
              rel="noreferrer"
            >
              GitHub
              <ExternalLink size={11} />
            </a>
          ) : (
            <span>GitHub not provided</span>
          )}
        </li>
        <li>
          <Linkedin size={15} />
          {safeProfileUrl(application.linkedin) ? (
            <a
              href={safeProfileUrl(application.linkedin)}
              target="_blank"
              rel="noreferrer"
            >
              LinkedIn
              <ExternalLink size={11} />
            </a>
          ) : (
            <span>LinkedIn not provided</span>
          )}
        </li>
        <li>
          <Video size={15} />
          {safeProfileUrl(application.videoUrl) ? (
            <a
              href={safeProfileUrl(application.videoUrl)}
              target="_blank"
              rel="noreferrer"
            >
              Intro video
              <ExternalLink size={11} />
            </a>
          ) : (
            <span>Intro video not provided</span>
          )}
        </li>
      </ul>
    </Panel>
  );

  const applicationDetails = (
    <Panel className={styles.detailsPanel}>
      <h2 className={styles.panelHeading}>Application Details</h2>
      <dl className={styles.detailsList}>
        <div><dt>Schedule</dt><dd>{internScheduleLabel(application.schedule)}</dd></div>
        <div><dt>Work mode</dt><dd>{application.workMode === "remote" ? "100% remote" : "Not provided"}</dd></div>
        <div><dt>Duration</dt><dd>{applicationDurationLabel(application)}</dd></div>
        <div>
          <dt>Track</dt>
          <dd>
            {application.program}{" "}

          </dd>
        </div>
        <div>
          <dt>Batch</dt>
          <dd>{application.batch || "—"}</dd>
        </div>
        <div>
          <dt>Applied On</dt>
          <dd>{formatDate(application.appliedOn)}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            <StatusBadge status={application.status} />
          </dd>
        </div>
      </dl>
      <h3 className={styles.skillsHeading}>Skills</h3>
      <div className={styles.skills}>
        {application.skills?.length ? (
          application.skills.map((skill) => <span key={skill}>{skill}</span>)
        ) : (
          <p className={styles.mutedText}>No skills added yet.</p>
        )}
      </div>
    </Panel>
  );

  const applicationFlow = (
    <Panel className={styles.flowPanel}>
      <h2 className={styles.panelHeading}>Application Flow</h2>
      {history.length ? (
        <ol className={styles.flowList}>
          {history.map((event, index) => (
            <li
              key={event.id || `${event.title}-${index}`}
              className={index === history.length - 1 ? styles.currentFlow : ""}
            >
              <span className={styles.flowDot}>
                {index === history.length - 1 ? (
                  <span />
                ) : (
                  <Check size={11} strokeWidth={3} />
                )}
              </span>
              <div>
                <strong>{event.title}</strong>
                <time dateTime={event.date}>{dateTime(event.date)}</time>
                {event.detail && <p>{event.detail}</p>}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className={styles.noHistory}>
          <Clock3 size={20} />
          <p>Application submitted on {formatDate(application.appliedOn)}.</p>
        </div>
      )}
    </Panel>
  );

  return (
    <div className={`${common.page} ${styles.profilePage}`}>
      <div className={styles.profileTopRow}>
        <Link className={styles.backLink} href="/intern/dashboard/applications">
          <ArrowLeft size={15} />
          Back to Applications
        </Link>
        <div className={styles.profileActions}>
          {canResume && <Button variant="secondary" onClick={() => setResumeOpen(true)}>
            <FileText size={15} />
            View Resume
          </Button>}
          {canMessage && <Button onClick={() => setContactOpen(true)}>
            <Mail size={15} />
            Contact
          </Button>}
        </div>
      </div>
      {canResume && <ResumeViewer application={application} open={resumeOpen} onOpenChange={setResumeOpen} />}
      <header className={styles.profileHeader}>
        <Avatar person={application} size={90} />
        <div className={styles.profileIdentity}>
          <h1>
            {application.name}
            <BookmarkToggle
              size={20}
              bookmarked={bookmarks.isBookmarked(application)}
              name={application.name}
              by={application.bookmarkedByName}
              on={application.bookmarkedOn}
              canEdit={canReview}
              busy={bookmarks.isBusy(application)}
              onToggle={(next) => void bookmarks.setBookmarked([application], next)}
            />
          </h1>
          <p>
            {application.program}
            <span>·</span>
            {application.college || "Internship applicant"}
          </p>
          <div className={styles.profileMeta}>
            <TrackBadge programId={application.programId} />
            <StatusBadge status={application.status} />
            {application.bookmarked && bookmarks.isBookmarked(application) && (
              <span className={styles.bookmarkMeta}>
                Bookmarked{application.bookmarkedByName ? ` by ${application.bookmarkedByName}` : ""}
                {application.bookmarkedOn ? ` · ${formatDate(application.bookmarkedOn)}` : ""}
              </span>
            )}
          </div>
        </div>
      </header>
      <div className={styles.profileTabs}>
        <Tabs
          items={PROFILE_TABS.filter(item => item.id !== "projects" || canProjects || canTasks)}
          value={tab}
          onChange={setTab}
          label="Applicant information"
        />
      </div>

      {tab === "overview" && (
        <>
          {application.possibleDuplicates?.length > 0 && <div className={styles.duplicateNote} role="note">
            <strong>Possible duplicate.</strong> Another application uses the same LinkedIn profile:{" "}
            {application.possibleDuplicates.map((otherId, index) => <span key={otherId}>{index ? ", " : ""}<Link href={`/intern/dashboard/applications/${otherId}`}>{otherId}</Link></span>)}
          </div>}
          <div className={styles.overviewGrid}>
            {personalDetails}
            {applicationDetails}
            {applicationFlow}
          </div>
          <IntroVideoPanel url={application.videoUrl} name={application.name} />
          <AiReviewPanel application={application} commands={commands} notify={notify} canReview={canReview} />
          <ApplicantScorePanel applicationId={application.id} assignedTo={application.assignedTo} canReview={canReview} commands={commands} notify={notify} onAssigned={() => void commands.getApplication(application.id)} />
          {isAdmin && <ApplicantNextAction
            applicationId={applicationId}
            onOpenWorkflow={() => setTab("application")}
          />}
        </>
      )}

      {tab === "overview" && isAdmin && <StaffAccountControls application={application} commands={commands} notify={notify}/>}
      {tab === "overview" && isAdmin && application.accountId && <Panel><h2 className={styles.panelHeading}>Staff-assisted password recovery</h2><p>Verify the applicant’s identity before setting a new password. Existing sessions will be signed out.</p><form className={styles.recoveryForm} onSubmit={async (event) => { event.preventDefault(); setRecoveryBusy(true); const result = await commands.resetPassword(application.accountId, recoveryPassword); setRecoveryBusy(false); if (!result.ok) { notify(result.error); return; } setRecoveryPassword(""); notify("Password reset. Share the new password securely with the applicant."); }}><label className={common.field}>New password<input type="password" minLength={12} maxLength={256} required value={recoveryPassword} onChange={event => setRecoveryPassword(event.target.value)} autoComplete="new-password" /></label><Button type="submit" disabled={recoveryBusy}>{recoveryBusy ? "Saving…" : "Reset password"}</Button></form></Panel>}
      {tab === "overview" && isAdmin && <EraseApplicantPanel application={application} commands={commands} notify={notify}/>}

      {tab === "application" && (
        <div className={styles.applicationGrid}>
          <div className={styles.detailColumn}>
            {(isAdmin || canMessage) && <ApplicantWorkflow applicationId={applicationId} />}
            <Panel>
              <h2 className={styles.panelHeading}>
                About {application.name.split(" ")[0]}
              </h2>
              <p className={styles.bio}>
                {application.bio ||
                  application.resumeSummary ||
                  "No profile summary has been provided."}
              </p>
              <div className={styles.applicationSummary}>
                <FileText size={19} />
                <div>
                  <strong>{application.id}</strong>
                  <span>Submitted {formatDate(application.appliedOn)}</span>
                </div>
                {canResume && <div className={styles.resumeActions}>
                  <Button variant="ghost" onClick={() => setResumeOpen(true)}>
                    <FileText size={15} />
                    View resume
                  </Button>
                  <Button variant="ghost" onClick={downloadResume} aria-label={`Download ${application.name}’s resume`}>
                    <ArrowDownToLine size={15} />
                    Download
                  </Button>
                </div>}
              </div>
            </Panel>
            {applicationDetails}
            <Panel>
              <h2 className={styles.panelHeading}>
                Reviewer Notes{" "}
                <span className={styles.noteCount}>{notes.length}</span>
              </h2>
              <div className={styles.noteList}>
                {notes.length ? (
                  [...notes].reverse().map((entry, index) => {
                    const text =
                      typeof entry === "string"
                        ? entry
                        : entry.text || entry.content;
                    return (
                      <article key={entry.id || index} className={styles.note}>
                        <div className={styles.noteHeading}>
                          <span>{entry.author || "Program team"}</span>
                          {entry.date && <time>{dateTime(entry.date)}</time>}
                        </div>
                        <p>{text}</p>
                      </article>
                    );
                  })
                ) : (
                  <p className={styles.mutedText}>
                    Add the first note to share your review with the program
                    team.
                  </p>
                )}
              </div>
              {canReview && <form className={styles.noteForm} onSubmit={saveNote}>
                <label htmlFor="applicant-review-note">
                  Add a reviewer note
                </label>
                <textarea
                  id="applicant-review-note"
                  rows={3}
                  placeholder="Add an observation, interview update, or next step..."
                  value={note}
                  maxLength={2000}
                  onChange={(event) => setNote(event.target.value)}
                  required
                />
                <div>
                  <span>{note.length}/2000</span>
                  <Button
                    type="submit"
                    disabled={!note.trim() || Boolean(busy)}
                  >
                    <MessageSquare size={14} />
                    Save note
                  </Button>
                </div>
              </form>}
            </Panel>
          </div>
          <div className={styles.detailColumn}>
            {canReview && (isAdmin || ["Applied", "Under Review", "Shortlisted"].includes(application.status)) && <Panel>
              <h2 className={styles.panelHeading}>Review & Screen Application</h2>
              <div style={{ margin: "0 0 16px", padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Admissions Funnel Stage</span>
                <div style={{ display: "flex", gap: "6px", alignItems: "center", fontSize: "12px", flexWrap: "wrap" }}>
                  <span style={{ color: application.status === "Applied" ? "#38bdf8" : "#94a3b8", fontWeight: application.status === "Applied" ? 700 : 500 }}>1. Applied</span>
                  <span style={{ color: "#64748b" }}>&rarr;</span>
                  <span style={{ color: ["Under Review", "Shortlisted"].includes(application.status) ? "#38bdf8" : "#94a3b8", fontWeight: ["Under Review", "Shortlisted"].includes(application.status) ? 700 : 500 }}>2. Review</span>
                  <span style={{ color: "#64748b" }}>&rarr;</span>
                  <span style={{ color: application.status === "Selected" ? "#22c55e" : "#94a3b8", fontWeight: application.status === "Selected" ? 700 : 500 }}>3. Accepted & Invited</span>
                  <span style={{ color: "#64748b" }}>&rarr;</span>
                  <span style={{ color: application.status === "Joined" ? "#a855f7" : "#94a3b8", fontWeight: application.status === "Joined" ? 700 : 500 }}>4. Active Intern</span>
                </div>
              </div>
              <p className={styles.reviewDescription}>
                Review candidate background and choose an admissions decision. Approving immediately triggers an Official Selection & Welcome Email with portal credentials and a LinkedIn announcement share card.
              </p>
              {["Applied", "Under Review", "Shortlisted"].includes(application.status) && (
                <div style={{ display: "flex", gap: "8px", margin: "16px 0", flexWrap: "wrap" }}>
                  <Button
                    type="button"
                    onClick={quickApprove}
                    disabled={Boolean(busy)}
                    style={{ background: "#16a34a", color: "#ffffff", borderColor: "#15803d" }}
                  >
                    <Check size={15} />
                    Approve & Invite Candidate
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={quickReject}
                    disabled={Boolean(busy)}
                    style={{ color: "#ef4444" }}
                  >
                    <X size={15} />
                    Decline
                  </Button>
                </div>
              )}
              <form className={styles.statusForm} onSubmit={saveStatus}>
                <label htmlFor="applicant-status">
                  Application status
                  <select
                    id="applicant-status"
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                  >
                    {STATUSES.map((value) => (
                      <option
                        key={value}
                        disabled={
                          (!isAdmin && !["Applied", "Under Review", "Shortlisted"].includes(value) && value !== application.status) || (value === "Joined" &&
                            application.status !== "Joined") ||
                          (application.status === "Joined" &&
                            value !== "Joined")
                        }
                      >
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                {application.status === "Joined" && (
                  <p className={styles.mutedText}>
                    This applicant has joined the program. Manage their active,
                    completed, or dropped status in{" "}
                    <Link href="/intern/dashboard/interns">Interns</Link>.
                  </p>
                )}
                {application.status !== "Joined" && (
                  <p className={styles.mutedText}>
                    Approve the applicant’s submitted onboarding to activate
                    their internship.
                  </p>
                )}
                <Button
                  type="submit"
                  disabled={status === application.status || Boolean(busy)}
                >
                  <Check size={15} />
                  Save status
                </Button>
              </form>
            </Panel>}
            {canReview && application.status === "Shortlisted" && <Panel>
              <h2 className={styles.panelHeading}>Interview scheduling</h2>
              <p className={styles.reviewDescription}>Schedule or update one interview for this shortlisted applicant.</p>
              {interview && interview.status !== "Cancelled" && <p className={styles.interviewCurrent}>Currently scheduled for {dateTime(interview.scheduledAt)} · <a href={interview.meetingUrl} target="_blank" rel="noreferrer">Open meeting link</a> · <button type="button" className={styles.linkButton} onClick={() => void cancelInterview()} disabled={Boolean(busy)}>Cancel interview</button></p>}
              {interview?.status === "Cancelled" && <p className={styles.interviewCurrent}>The interview on {dateTime(interview.scheduledAt)} was cancelled{interview.cancelReason ? `: ${interview.cancelReason}` : "."} Schedule a new time below.</p>}
              <form className={styles.interviewForm} onSubmit={saveInterview}>
                <label>
                  Date and time
                  <input type="datetime-local" value={interviewTime} onChange={(event) => setInterviewTime(event.target.value)} required />
                </label>
                <label>
                  Meeting link
                  <input type="url" value={meetingUrl} onChange={(event) => setMeetingUrl(event.target.value)} placeholder="https://…" maxLength={2000} required />
                </label>
                <Button type="submit" disabled={Boolean(busy) || !interviewTime || !meetingUrl.trim()}>
                  <CalendarDays size={15} />
                  {busy === "interview" ? "Saving…" : interview && interview.status !== "Cancelled" ? "Update interview" : "Schedule interview"}
                </Button>
              </form>
            </Panel>}
            {personalDetails}
            {applicationFlow}
          </div>
        </div>
      )}

      {tab === "projects" && canTasks && <AssignedTasks key={applicationId} applicationId={applicationId} canManage={canManageTasks && activeIntern} onEdit={setEditor} />}

      {tab === "projects" && canProjects && (
        <Panel>
          <div className={styles.sectionTitleRow}>
            <h2 className={styles.panelHeading}>Projects & Contributions</h2>
            <span>{projectListing.total} assigned</span>
            {canManageProjects && activeIntern && <>
              <Button onClick={() => setEditor({ action: "assign" })}>Assign existing project</Button>
              <Button variant="secondary" onClick={() => setEditor({ kind: "project", action: "create" })}>Create project</Button>
            </>}
          </div>
          {linkedProjects.length ? (
            <div className={styles.linkedProjects}>
              {linkedProjects.map((project) => (
                <article className={styles.linkedProject} key={project.id}>
                  <span className={styles.linkedProjectIcon}>
                    <BriefcaseBusiness size={23} />
                  </span>
                  <div className={styles.linkedProjectHeading}>
                    <h3>{project.name}</h3>
                    <StatusBadge status={project.status} />
                  </div>
                  <p>{project.description}</p>
                  <ProjectPlan project={project} canEdit={canManageProjects} />
                  <div className={styles.projectProgressLabel}>
                    <span>Project progress</span>
                    <strong>{project.progress}%</strong>
                  </div>
                  <div
                    className={styles.projectProgress}
                    role="progressbar"
                    aria-label={`${project.name} progress`}
                    aria-valuenow={project.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <span style={{ width: `${project.progress}%` }} />
                  </div>
                  <div className={styles.projectFooter}>
                    <span>{project.team?.length || 0} team members</span>
                    {canManageTasks && activeIntern && <Button onClick={() => setEditor({ kind: "task", action: "create", project })}>Assign task</Button>}
                    {canManageProjects && <>
                      <Button variant="secondary" onClick={() => setEditor({ kind: "project", action: "edit", record: project })}>Edit project</Button>
                      <Button variant="ghost" onClick={() => setEditor({ kind: "project", action: "delete", record: project })}>Delete project</Button>
                    </>}
                    <Link href="/intern/dashboard/projects">
                      View projects
                      <ArrowUpRight size={14} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No projects assigned yet"
              description="Projects will appear here when this applicant joins a project team."
            />
          )}
          <QueryStatus query={projectQuery} label="assigned projects" />
          <Pagination page={linkedProjectPage} pageSize={10} total={projectListing.total} onChange={setLinkedProjectPage}/>
        </Panel>
      )}

      {editor?.action === "assign" && <AssignExistingProject application={application} onClose={() => setEditor(null)} />}
      {editor && editor.action !== "assign" && <AssignmentEditor editor={editor} application={application} onClose={() => setEditor(null)} />}

      {tab === "activity" && (
        <Panel>
          <h2 className={styles.panelHeading}>Applicant Activity</h2>
          {activities.length || history.length ? (
            <ol className={styles.activityTimeline}>
              {[
                ...activities.map((activity) => ({
                  ...activity,
                  _title: activity.title,
                  _detail: activity.detail,
                  _date:
                    activity.occurredOn ||
                    activity.createdAt ||
                    activity.date ||
                    activity.timestamp,
                  _time: activity.time,
                  _source: "activity",
                })),
                ...history.map((event) => ({
                  ...event,
                  _title: event.title,
                  _detail: event.detail,
                  _date: event.date,
                  _source: "history",
                })),
              ]
                .sort(
                  (first, second) =>
                    new Date(second._date || 0) - new Date(first._date || 0),
                )
                .map((event, index) => (
                  <li key={`${event._source}-${event.id || index}`}>
                    <span className={styles.activityDot}>
                      {event._source === "history" ? (
                        <CircleCheck size={15} />
                      ) : (
                        <MessageSquare size={15} />
                      )}
                    </span>
                    <div>
                      <h3>{event._title}</h3>
                      {event._detail && <p>{event._detail}</p>}
                      <time>
                        {event._date
                          ? dateTime(event._date)
                          : event._time || "Just now"}
                      </time>
                    </div>
                  </li>
                ))}
            </ol>
          ) : (
            <EmptyState
              title="No activity yet"
              description="Application updates and composed messages will appear here."
            />
          )}
        </Panel>
      )}

      <Modal
        open={contactOpen}
        onOpenChange={setContactOpen}
        title={`Contact ${application.name.split(" ")[0]}`}
        description="Send a message to this applicant’s internship portal."
      >
        <form className={styles.modalForm} onSubmit={saveContact}>
          <label>
            To
            <input value={application.email} readOnly type="email" />
          </label>
          <TemplatePicker application={application} interview={interview} onPick={(nextSubject, nextBody) => { setSubject(nextSubject); setMessage(nextBody); }} />
          <label>
            Subject
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              maxLength={140}
              required
            />
          </label>
          <label>
            Message
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={5}
              placeholder={`Hi ${application.name.split(" ")[0]},`}
              required
              maxLength={3000}
            />
          </label>
          <div className={styles.modalActions}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setContactOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!subject.trim() || !message.trim() || Boolean(busy)}
            >
              <Send size={15} />
              {busy === "contact" ? "Sending…" : "Send message"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/** Inline player for the applicant's intro video; unknown hosts fall back to a link. */
function IntroVideoPanel({ url, name }) {
  const link = safeProfileUrl(url);
  const embed = toEmbed(url);
  return (
    <Panel className={styles.videoPanel}>
      <div className={styles.videoHeading}>
        <h2 className={styles.panelHeading}>
          <Video size={17} /> Intro video
          {embed && <span className={styles.videoProvider}>{embed.provider}</span>}
        </h2>
        {link && (
          <a href={link} target="_blank" rel="noreferrer" className={styles.videoOpen}>
            Open in new tab <ExternalLink size={12} />
          </a>
        )}
      </div>
      {embed ? (
        <div className={styles.videoFrame}>
          <iframe
            src={embed.embedUrl}
            title={`Intro video from ${name || "the applicant"}`}
            loading="lazy"
            allow="fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
          />
        </div>
      ) : link ? (
        <p className={styles.videoNote}>This link can’t be previewed here. Open it in a new tab to watch.</p>
      ) : (
        <p className={styles.videoNote}>No intro video shared.</p>
      )}
    </Panel>
  );
}

function TaskReminderButton({ taskId }) {
  const { commands, notify } = useInternship();
  const [busy, setBusy] = useState(false);
  async function remind() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await commands.remindTask(taskId);
      notify(result.ok ? "Reminder queued" : result.error || "Could not queue the reminder. Try again.");
    } catch {
      notify("Could not queue the reminder. Try again.");
    } finally {
      setBusy(false);
    }
  }
  return <Button variant="secondary" disabled={busy} onClick={remind}>{busy ? "Queuing…" : "Send reminder"}</Button>;
}

function AssignedTasks({ applicationId, canManage, onEdit }) {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const query = useInternQuery("task.list", { applicationId, page, pageSize, sortField: "dueOn", sortDirection: "asc" });
  const listing = query.data;
  useEffect(() => {
    if (listing) setPage(current => Math.min(current, Math.max(1, Math.ceil(listing.total / pageSize))));
  }, [listing]);
  return (
    <Panel>
      <div className={styles.sectionTitleRow}>
        <h2 className={styles.panelHeading}>Assigned tasks</h2>
        {listing && <span>{listing.total} assigned</span>}
      </div>
      <QueryStatus query={query} label="assigned tasks" />
      {listing?.total === 0 && <EmptyState title="No tasks assigned yet" description="Tasks assigned to this intern will appear here." />}
      {listing?.items.length > 0 && (
        <div className={styles.linkedProjects}>
          {listing.items.map(task => (
            <article className={styles.linkedProject} key={task.id}>
              <div className={styles.linkedProjectHeading}>
                <h3>{task.title}</h3>
                <StatusBadge status={task.status} />
              </div>
              {task.description && <p>{task.description}</p>}
              <div className={styles.projectFooter}>
                {canManage && <>
                  {["Todo", "In progress", "Changes requested"].includes(task.status) && <TaskReminderButton taskId={task.id} />}
                  <Button variant="secondary" onClick={() => onEdit({ kind: "task", action: "edit", record: task })}>Edit task</Button>
                  <Button variant="ghost" onClick={() => onEdit({ kind: "task", action: "delete", record: task })}>Delete task</Button>
                </>}
                {task.project?.name && <span>{task.project.name}</span>}
                {task.dueOn && <span>Due {formatDate(task.dueOn)}</span>}
              </div>
            </article>
          ))}
        </div>
      )}
      {listing && <Pagination page={page} pageSize={pageSize} total={listing.total} onChange={setPage} />}
    </Panel>
  );
}
