"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  BriefcaseBusiness,
  Check,
  CircleCheck,
  Clock3,
  ExternalLink,
  FileText,
  Github,
  GraduationCap,
  Linkedin,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Send,
} from "lucide-react";
import { useDashboard } from "./DashboardProvider";
import { useInternship } from "@/components/intern/InternshipProvider";
import LoadingIndicator from "@olentra/ui/LoadingIndicator";
import { hasStaffPermission } from "./staffAccess";
import {
  downloadAttachment,
  downloadSampleResume,
} from "@/lib/intern-attachments.mjs";
import { ApplicantNextAction, ApplicantWorkflow } from "./CompanyWorkflow";
import StaffAccountControls from "./StaffAccountControls";
import {
  Avatar,
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
];
const PROFILE_TABS = [
  { id: "overview", label: "Overview" },
  { id: "application", label: "Application" },
  { id: "projects", label: "Projects" },
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
  const canResume = hasStaffPermission(account, "resumes.read");
  const canProjects = hasStaffPermission(account, "projects.read");
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const application = (data.applications || []).find((item) => item.id === applicationId);
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

  useEffect(() => {
    setStatus(application?.status || "Applied");
  }, [application?.status, applicationId]);
  useEffect(() => {
    setTab("overview");
    setNote("");
    setContactOpen(false);
    setSubject("Your Olentra internship application");
    setMessage("");
  }, [applicationId]);

  const [linkedProjectPage, setLinkedProjectPage] = useState(1);
  const [projectListing, setProjectListing] = useState({items:[],total:0});
  const [projectError, setProjectError] = useState("");
  useEffect(() => { setLinkedProjectPage(1); }, [applicationId]);
  useEffect(() => {
    if (tab !== "projects") return;
    let active = true;
    commands.listProjects({ applicationId, page: linkedProjectPage, pageSize: 10 }).then(result => {
      if (!active) return;
      if (!result.ok) { setProjectError(result.error); return; }
      setProjectError(""); setProjectListing(result.data);
    });
    return () => { active = false; };
  }, [applicationId, tab, linkedProjectPage, commands, data.projects]);
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
    try {
      if (application.resumeAttachmentId)
        await downloadAttachment(application.resumeAttachmentId);
      else await downloadSampleResume(application);
      notify(`${application.name}’s resume downloaded.`);
    } catch {
      notify("This resume is unavailable in this browser.");
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
      </ul>
    </Panel>
  );

  const applicationDetails = (
    <Panel className={styles.detailsPanel}>
      <h2 className={styles.panelHeading}>Application Details</h2>
      <dl className={styles.detailsList}>
        <div>
          <dt>Track</dt>
          <dd>
            {application.program}{" "}

          </dd>
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
          {canResume && <Button variant="secondary" onClick={downloadResume}>
            <ArrowDownToLine size={15} />
            Download Resume
          </Button>}
          {canMessage && <Button onClick={() => setContactOpen(true)}>
            <Mail size={15} />
            Contact
          </Button>}
        </div>
      </div>
      <header className={styles.profileHeader}>
        <Avatar person={application} size={90} />
        <div className={styles.profileIdentity}>
          <h1>
            {application.name}

          </h1>
          <p>
            {application.program}
            <span>·</span>
            {application.college || "Internship applicant"}
          </p>
          <div className={styles.profileMeta}>
            <TrackBadge programId={application.programId} />
            <StatusBadge status={application.status} />
          </div>
        </div>
      </header>
      <div className={styles.profileTabs}>
        <Tabs
          items={PROFILE_TABS.filter(item => item.id !== "projects" || canProjects)}
          value={tab}
          onChange={setTab}
          label="Applicant information"
        />
      </div>

      {tab === "overview" && (
        <>
          <div className={styles.overviewGrid}>
            {personalDetails}
            {applicationDetails}
            {applicationFlow}
          </div>
          {isAdmin && <ApplicantNextAction
            applicationId={applicationId}
            onOpenWorkflow={() => setTab("application")}
          />}
        </>
      )}

      {tab === "overview" && isAdmin && <StaffAccountControls application={application} commands={commands} notify={notify}/>}
      {tab === "overview" && isAdmin && application.accountId && <Panel><h2 className={styles.panelHeading}>Staff-assisted password recovery</h2><p>Verify the applicant’s identity before setting a new password. Existing sessions will be signed out.</p><form className={styles.recoveryForm} onSubmit={async (event) => { event.preventDefault(); setRecoveryBusy(true); const result = await commands.resetPassword(application.accountId, recoveryPassword); setRecoveryBusy(false); if (!result.ok) { notify(result.error); return; } setRecoveryPassword(""); notify("Password reset. Share the new password securely with the applicant."); }}><label className={common.field}>New password<input type="password" minLength={12} maxLength={256} required value={recoveryPassword} onChange={event => setRecoveryPassword(event.target.value)} autoComplete="new-password" /></label><Button type="submit" disabled={recoveryBusy}>{recoveryBusy ? "Saving…" : "Reset password"}</Button></form></Panel>}

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
                {canResume && <Button variant="ghost" onClick={downloadResume}>
                  <ArrowDownToLine size={15} />
                  Resume
                </Button>}
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
              <h2 className={styles.panelHeading}>Review Application</h2>
              <p className={styles.reviewDescription}>
                Keep the application status in sync with your review.
              </p>
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
            {personalDetails}
            {applicationFlow}
          </div>
        </div>
      )}

      {tab === "projects" && (
        <Panel>
          <div className={styles.sectionTitleRow}>
            <h2 className={styles.panelHeading}>Projects & Contributions</h2>
            <span>{projectListing.total} assigned</span>
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
          {projectError && <p role="alert">{projectError}</p>}
          <Pagination page={linkedProjectPage} pageSize={10} total={projectListing.total} onChange={setLinkedProjectPage}/>
        </Panel>
      )}

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
