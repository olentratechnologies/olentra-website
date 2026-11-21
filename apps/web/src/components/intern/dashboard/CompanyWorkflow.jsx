"use client";
import { useInternHistory } from "@/components/intern/useInternHistory";
import LoadingIndicator from "@olentra/ui/LoadingIndicator";

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
import { completionDate, displayDate, durationLabel, civilToday } from "@/lib/intern/schedule.mjs";
import OfferScheduleRevision from "../OfferScheduleRevision";
import DirectEnrolForm from "./DirectEnrolForm";
import { useInternship } from "@/components/intern/InternshipProvider";
import { downloadAttachment } from "@/lib/intern-attachments.mjs";
import {
  Avatar,
  Button,
  EmptyState,
  Pagination,
  Panel,
  StatusBadge,
  Tabs,
  formatDate,
} from "./DashboardUI";
import styles from "./company-workflow.module.css";
import { hasStaffPermission } from "./staffAccess";
import { burstFrom } from "@/lib/confetti.mjs";
import TemplatePicker from "./TemplatePicker";
import { offerTimeLeft } from "@/lib/intern/offer-deadline.mjs";
import { civilDaysBetween, deadlineDay, decisionDeadline, earliestStartDate, formatDeadline, maxOpenDays, normalizeLeadDays } from "@/lib/intern/offer-policy.mjs";

const OPEN_FOR_OPTIONS = [1, 2, 3, 5, 7, 10, 14, 30];
const EXTEND_OPTIONS = [1, 2, 3, 5, 7, 10, 14, 30];
import OnboardingDocumentsReview from "./OnboardingDocumentsReview";

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
  const isAdmin = account?.staffRole === "admin";
  const application = data.applications.find(
    (item) => item.id === applicationId,
  );
  const canMessage = hasStaffPermission(account, application?.status === "Joined" ? "messages.interns" : "messages.applicants");
  const offer = latest(data.offers, applicationId);
  const onboarding = latest(data.onboarding, applicationId);
  const [tab, setTab] = useState(isAdmin ? "offer" : "messages");
  const [busy, setBusy] = useState(false);
  const [offerForm, setOfferForm] = useState({
    startOn: "",
    endOn: "",
    stipend: 0,
    expiresInDays: 7,
    message:
      "We’re excited to welcome you to the Olentra internship program. Review your offer and take the next step in your journey.",
  });
  const [offerPreview, setOfferPreview] = useState(null);
  // Two ways to give an internship: send an offer the student accepts online, or enrol directly.
  const [route, setRoute] = useState("offer");
  const [extendDays, setExtendDays] = useState("");
  // Offers must close a lead time before day one (program setting, default 3 days).
  const leadDays = normalizeLeadDays(data.settings.onboardingLeadDays);
  const today = civilToday();
  const earliestStart = earliestStartDate(today, leadDays);
  const longestWindow = offerForm.startOn ? maxOpenDays(offerForm.startOn, today, leadDays) : 30;
  const startTooSoon = Boolean(offerForm.startOn) && offerForm.startOn < earliestStart;
  useEffect(() => {
    // Keep "Open for" inside what the chosen start date allows.
    if (!offerForm.startOn || longestWindow < 1 || offerForm.expiresInDays <= longestWindow) return;
    const fallback = [...OPEN_FOR_OPTIONS].reverse().find(days => days <= longestWindow) || 1;
    setOfferForm(previous => ({ ...previous, expiresInDays: fallback }));
  }, [offerForm.startOn, offerForm.expiresInDays, longestWindow]);
  const [durationException,setDurationException]=useState(false);
  const [exceptionQuantity,setExceptionQuantity]=useState(1),[exceptionUnit,setExceptionUnit]=useState("months"),[exceptionReason,setExceptionReason]=useState("");
  useEffect(()=>{
    setOfferPreview(null);
    setOfferForm(previous=>{let endOn="";try{endOn=completionDate(previous.startOn,durationException?{quantity:Number(exceptionQuantity),unit:exceptionUnit}:data.settings.durationSpec||data.settings.duration);}catch{}return {...previous,endOn};});
  },[offerForm.startOn,offerForm.expiresInDays,data.settings.durationSpec,data.settings.duration,data.settings.scheduleRevision,durationException,exceptionQuantity,exceptionUnit,exceptionReason]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  useEffect(() => {
    setTab(isAdmin ? "offer" : "messages");
    setOfferPreview(null);
    setDurationException(false);setExceptionReason("");
    setOfferForm(previous=>({...previous,startOn:"",endOn:""}));
    setSubject("");
    setBody("");
  }, [applicationId, isAdmin]);
  useEffect(() => {
    setOfferForm((previous) => ({
      ...previous,
      stipend: data.programs.find((program) => program.id === application?.programId)?.stipend ?? 0,
    }));
  }, [applicationId, application?.programId, data.programs]);
  const history = useInternHistory("messages", { applicationId, enabled: canMessage && tab === "messages", revision: data.messages });
  const messages = [...history.items].sort((first, second) => new Date(first.createdOn) - new Date(second.createdOn));
  if (!application || account?.role !== "company") return null;
  const canOffer =
    isAdmin && application.status === "Selected" &&
    !["Sent", "Accepted"].includes(offer?.status);
  const canEnrollDirect =
    isAdmin && ["Applied", "Under Review", "Shortlisted", "Selected"].includes(application.status) &&
    offer?.status !== "Accepted";
  // An instant offer is a new offer, so it needs no offer already open.
  const canInstantOffer = canEnrollDirect && offer?.status !== "Sent";
  // Interns enrolled directly are already active; staff sign off their documents afterwards.
  const joinedPendingOnboarding =
    isAdmin && application.status === "Joined" && offer?.status === "Accepted" &&
    onboarding?.status !== "Approved";
  const canApprove =
    (isAdmin && offer?.status === "Accepted" &&
    onboarding?.status === "Submitted" &&
    application.status === "Selected") || joinedPendingOnboarding;

  async function sendOffer(event) {
    event.preventDefault();
    const trigger = event.nativeEvent?.submitter || event.currentTarget;
    if (busy || !canOffer) return;
    if (offerForm.endOn < offerForm.startOn) {
      notify("The internship end date must follow its start date.");
      return;
    }
    if (startTooSoon) {
      notify(`Choose a start date on or after ${displayDate(earliestStart)}, so the offer can close ${leadDays} days before the internship starts.`);
      return;
    }
    setBusy(true);
    try {
      if(!offerPreview) {
        const preview=await commands.previewOffer({applicationId,startOn:offerForm.startOn,expiresInDays:Number(offerForm.expiresInDays),...(durationException?{durationOverride:{quantity:Number(exceptionQuantity),unit:exceptionUnit},reason:exceptionReason}:{})});
        if(!preview.ok){notify(preview.error);return;}
        setOfferPreview(preview.data);return;
      }
      const sent = await perform(
        () =>
          commands.sendOffer(applicationId, {
            ...offerForm,
            configRevision: offerPreview.configRevision,
            ...(durationException?{durationOverride:{quantity:Number(exceptionQuantity),unit:exceptionUnit},reason:exceptionReason}:{}),
            stipend: Number(offerForm.stipend),
            expiresInDays: Number(offerForm.expiresInDays),
            message: offerForm.message.trim(),
          }),
        notify,
        "Offer sent to the applicant’s portal.",
      );
      if (sent) burstFrom(trigger, { count: 60 });
    } finally {
      setBusy(false);
    }
  }
  async function approve(event) {
    if (busy || !canApprove) return;
    const trigger = event?.currentTarget;
    setBusy(true);
    try {
      const approved = await perform(
        () => commands.approveOnboarding(applicationId),
        notify,
        joinedPendingOnboarding ? "Onboarding marked complete." : "Onboarding approved. The applicant is now an active intern.",
      );
      if (approved) burstFrom(trigger, { count: 60 });
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
          ...(isAdmin ? [{ id: "offer", label: "Offer" }, { id: "onboarding", label: "Onboarding" }] : []),
          ...(canMessage ? [{ id: "messages", label: "Messages", count: messages.length }] : []),
        ]}
        value={tab}
        onChange={setTab}
        label="Applicant workflow"
      />
      {isAdmin && tab === "offer" && (
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
                {offer.status === "Sent" && offer.expiresOn && <div>
                  <dt>Respond by</dt>
                  <dd>{formatDeadline(offer.expiresOn)} · {offerTimeLeft(offer.expiresOn)?.label}</dd>
                </div>}
              </dl>
              {isAdmin && offer.status === "Sent" && offer.route !== "instant" && (() => {
                // New deadlines count from today and must still close the lead time before the start date.
                const longest = maxOpenDays(offer.startOn, today, leadDays);
                const current = offer.expiresOn ? civilDaysBetween(today, deadlineDay(offer.expiresOn)) : 0;
                const choices = EXTEND_OPTIONS.filter(days => days > current && days <= longest);
                if (!choices.length) return <p className={styles.hint}>The deadline can’t move later without eating into the {leadDays}-day onboarding lead time. Use Revise schedule to move the start date instead.</p>;
                const chosen = choices.includes(Number(extendDays)) ? Number(extendDays) : choices[choices.length - 1];
                return <div className={styles.formActions}>
                  <label>New deadline
                    <select value={chosen} onChange={event => setExtendDays(event.target.value)}>
                      {choices.map(days => <option key={days} value={days}>{formatDeadline(decisionDeadline(new Date().toISOString(), days))}</option>)}
                    </select>
                  </label>
                  <Button variant="secondary" disabled={busy} onClick={async () => { setBusy(true); try { await perform(() => commands.extendOffer(applicationId, chosen), notify, "Deadline extended. The applicant has been emailed."); } finally { setBusy(false); } }}>Extend deadline</Button>
                </div>;
              })()}
              {offer.route === "instant" && offer.status === "Sent" && <p className={styles.hint}>Instant offer · open until the end of the start date. To give more time, use Revise schedule to move the start date.</p>}
              {offer.route === "direct" && <p className={styles.hint}>Accepted in person{offer.agreementNote ? ` · ${offer.agreementNote}` : ""}{offer.acceptedByName ? ` · recorded by ${offer.acceptedByName}` : ""}</p>}
              {offer.message && <p>{offer.message}</p>}
              {(offer.respondedOn || offer.decidedOn) && (
                <small>
                  Response received{" "}
                  {timestamp(offer.respondedOn || offer.decidedOn)}
                </small>
              )}
            </div>
          )}
          {offer && isAdmin && <OfferScheduleRevision application={application} offer={offer} admin />}
          {canEnrollDirect && (
            <fieldset className={styles.routeChooser}>
              <legend>How is this internship being given?</legend>
              <label data-selected={route === "offer"}>
                <input type="radio" name="internship-route" value="offer" checked={route === "offer"} onChange={() => setRoute("offer")} />
                <span><strong>Send offer</strong><small>The student accepts online before a deadline that closes {leadDays} days before the start date. Use this for normal hiring.</small></span>
              </label>
              {canInstantOffer && <label data-selected={route === "instant"}>
                <input type="radio" name="internship-route" value="instant" checked={route === "instant"} onChange={() => setRoute("instant")} />
                <span><strong>Instant offer</strong><small>You pick the start date. The student activates their portal now and accepts or declines by the end of that day. Accepting makes them an intern straight away.</small></span>
              </label>}
              <label data-selected={route === "direct"}>
                <input type="radio" name="internship-route" value="direct" checked={route === "direct"} onChange={() => setRoute("direct")} />
                <span><strong>Enrol directly</strong><small>The student has already agreed (in person or on a call). They become an intern immediately and get portal access and their offer letter by email.</small></span>
              </label>
            </fieldset>
          )}
          {canInstantOffer && route === "instant" ? (
            <DirectEnrolForm
              mode="instant"
              application={application}
              settings={data.settings}
              maxStipend={data.programs.find((program) => program.id === application?.programId)?.stipend ?? 0}
              commands={commands}
              notify={notify}
            />
          ) : canEnrollDirect && route === "direct" ? (
            <DirectEnrolForm
              application={application}
              settings={data.settings}
              maxStipend={data.programs.find((program) => program.id === application?.programId)?.stipend ?? 0}
              commands={commands}
              notify={notify}
            />
          ) : canOffer ? (
            <form className={styles.form} onSubmit={sendOffer}>
              <div className={styles.formGrid}>
                <label>
                  Start date
                  <input
                    min={earliestStart}
                    required
                    type="date"
                    aria-invalid={startTooSoon || undefined}
                    aria-describedby="offer-deadline-hint"
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
                    readOnly
                    aria-describedby="calculated-offer-dates"
                  />
                </label>
                <label className={styles.fullWidth}>
                  Monthly stipend (₹)
                  <input
                    required
                    type="number"
                    min="0"
                    max={data.programs.find((program) => program.id === application?.programId)?.stipend ?? 0}
                    value={offerForm.stipend}
                    onChange={(event) =>
                      setOfferForm({
                        ...offerForm,
                        stipend: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Open for
                  <select value={offerForm.expiresInDays} aria-describedby="offer-deadline-hint" onChange={(event) => setOfferForm({ ...offerForm, expiresInDays: Number(event.target.value) })}>
                    {OPEN_FOR_OPTIONS.map((days) => <option key={days} value={days} disabled={Boolean(offerForm.startOn) && days > longestWindow}>{days === 1 ? "1 day" : `${days} days`}</option>)}
                  </select>
                </label>
                <p id="offer-deadline-hint" className={`${styles.fullWidth} ${styles.hint}`} role={startTooSoon ? "alert" : undefined}>
                  {startTooSoon
                    ? `This start date is too soon. Offers must close ${leadDays} days before the internship starts, so choose ${displayDate(earliestStart)} or later.`
                    : `Applicant must respond by ${formatDeadline(decisionDeadline(new Date().toISOString(), Number(offerForm.expiresInDays)))}${offerForm.startOn ? `, at least ${leadDays} days before the start date.` : "."} Longer windows need a later start date.`}
                </p>
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
              <label><input type="checkbox" checked={durationException} onChange={event=>setDurationException(event.target.checked)}/>Use a duration exception for this student</label>
              {durationException&&<div className={styles.formGrid}><label>Duration quantity<input type="number" min="1" step="1" required value={exceptionQuantity} onChange={event=>setExceptionQuantity(event.target.value)}/></label><label>Unit<select value={exceptionUnit} onChange={event=>setExceptionUnit(event.target.value)}><option value="months">Calendar months</option><option value="weeks">Weeks</option><option value="days">Days</option></select></label><label>Reason for exception<textarea required value={exceptionReason} onChange={event=>setExceptionReason(event.target.value)}/></label></div>}
              <p id="calculated-offer-dates">Duration: {durationLabel(data.settings.durationSpec||data.settings.duration)}. Completion is calculated from the program settings.</p>
              {offerPreview && <div role="status"><strong>Confirm the schedule before sending</strong><p>{offerPreview.durationLabel} · {displayDate(offerPreview.startOn)} to {displayDate(offerPreview.endOn)}</p><p>Application originally recorded: {application.duration || "Not recorded"}. This offer uses the current configured duration.</p>{offerPreview.expiresOn && <p>Respond by {formatDeadline(offerPreview.expiresOn)}.</p>}</div>}
              <div className={styles.formActions}>
                <Button type="submit" disabled={busy || startTooSoon}>
                  <Send size={15} />
                  {busy ? "Preparing…" : offerPreview ? "Confirm and send offer" : "Review offer schedule"}
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
                    : canEnrollDirect
                      ? "To send an offer, first mark this applicant Selected in the application review. Or choose Enrol directly if they’ve already agreed."
                      : "Select this applicant in the application review to prepare an internship offer."}
            </p>
          )}
        </div>
      )}
      {isAdmin && tab === "onboarding" && (
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
          <OnboardingDocumentsReview applicationId={applicationId} checklist={data.settings?.onboardingDocuments} documents={onboarding?.documents} locked={onboarding?.status === "Approved"} commands={commands} notify={notify} />
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
                : joinedPendingOnboarding
                  ? "Mark onboarding complete"
                  : application.status === "Joined"
                    ? "Enrollment approved"
                    : "Approve onboarding"}
            </Button>
          </div>
        </div>
      )}
      {canMessage && tab === "messages" && (
        <div className={styles.tabBody}>
          {history.error && <p role="alert">{history.error}</p>}
          {history.loading && <LoadingIndicator label="Loading messages…" compact={messages.length > 0} />}
          {history.hasMore && <Button variant="secondary" onClick={history.loadMore} disabled={history.loading}>Load older messages</Button>}
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
            ) : !history.loading && !history.error ? (
              <div className={styles.smallEmpty}>
                <MessageSquare size={25} />
                <p>
                  Start a conversation with {application.name.split(" ")[0]}.
                </p>
              </div>
            ) : null}
          </div>
          <form className={styles.form} onSubmit={sendMessage}>
            <TemplatePicker application={application} interview={data.interviews?.find((item) => item.applicationId === applicationId)} onPick={(nextSubject, nextBody) => { setSubject(nextSubject); setBody(nextBody); }} />
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
  history,
  loadMore,
}) {
  const { account } = useInternship();
  const isAdmin = account?.staffRole === "admin";
  const canFeedback = hasStaffPermission(account, "submissions.feedback");
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
    const decision = event.nativeEvent.submitter?.value || (isAdmin ? "Approved" : "Changes requested");
    if (decision === "Changes requested" && !feedback.trim()) {
      notify("Add feedback so the intern knows what to improve.");
      return;
    }
    const trigger = event.nativeEvent.submitter || event.currentTarget;
    if (await onReview(submission.id, { decision, feedback: feedback.trim() })) {
      setFeedback("");
      if (decision === "Approved") burstFrom(trigger, { count: 50 });
    }
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
      {submission.status === "Submitted" && (isAdmin || canFeedback) && (
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
            {canFeedback && <Button
              variant="secondary"
              name="decision"
              value="Changes requested"
              type="submit"
              disabled={busy}
            >
              Request changes
            </Button>}
            {isAdmin && <Button
              name="decision"
              value="Approved"
              type="submit"
              disabled={busy}
            >
              <Check size={15} />
              Approve submission
            </Button>}
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
              {safeUrl(version.url) && <a href={safeUrl(version.url)} target="_blank" rel="noreferrer">Open submission</a>}
              {version.attachmentId && <Button variant="ghost" onClick={async () => { try { await downloadAttachment(version.attachmentId); } catch { notify("This attachment could not be downloaded."); } }}>Download attachment</Button>}
            </div>
          ))}
        </details>
      )}
      {history?.loading && <LoadingIndicator label="Loading older submissions…" compact />}
      {history?.total > submissions.length && <Button variant="secondary" disabled={history.loading} onClick={loadMore}>Load older versions</Button>}
    </article>
  );
}

export function ProjectWorkflow({ projectId, projectRecord, directoryPeople, activeMemberIds }) {
  const { data, account, commands, notify } = useInternship();
  const canManageTasks = hasStaffPermission(account, "tasks.manage");
  const canReadSubmissions = hasStaffPermission(account, "submissions.read");
  const project = projectRecord || data.projects.find((item) => item.id === projectId);
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
  const [page,setPage] = useState(1), pageSize=10;
  const [listing,setListing] = useState({items:[],total:0,counts:{statuses:{}}});
  const [submissions,setSubmissions] = useState([]);
  const [histories,setHistories] = useState({});
  const [listError,setListError] = useState("");
  const [loadedProjectId, setLoadedProjectId] = useState(null);
  const [listRequest, setListRequest] = useState({ projectId, loading: true });
  const listLoading = listRequest.projectId !== projectId || listRequest.loading;
  const hasListing = loadedProjectId === projectId;
  useEffect(()=>{setPage(1)},[projectId]);
  useEffect(() => {
    let live = true;
    setListRequest({ projectId, loading: true });
    setListError("");
    (async () => {
      try {
        const result = await commands.listTasks({ projectId, page, pageSize });
        if (!live) return;
        if (!result.ok) { setListError(result.error); return; }
        const histories = canReadSubmissions ? await Promise.all(result.data.items.map(task => commands.listSubmissions({ taskId: task.id, page: 1, pageSize: 100, sortField: "version", sortDirection: "desc" }))) : [];
        if (!live) return;
        const failure = histories.find(history => !history.ok);
        if (failure) { setListError(failure.error); return; }
        setListing(result.data);
        setLoadedProjectId(projectId);
        setSubmissions(histories.flatMap(history => history.data.items));
        setHistories(Object.fromEntries(result.data.items.map((task, index) => [task.id, { page: 1, total: histories[index]?.data.total || 0, loading: false }])));
        if (page > 1 && page > Math.max(1, Math.ceil(result.data.total / pageSize))) setPage(Math.max(1, Math.ceil(result.data.total / pageSize)));
      } catch {
        if (live) setListError("Unable to load project tasks. Please try again.");
      } finally {
        if (live) setListRequest({ projectId, loading: false });
      }
    })();
    return () => { live = false; };
  }, [projectId, page, pageSize, commands, data.tasks, data.submissions, canReadSubmissions]);
  const tasks = hasListing ? listing.items : [];
  const people = new Map(data.applications.map(application=>[application.id,application]));
  if(directoryPeople) for(const [id,person] of directoryPeople) people.set(id,person);
  for(const task of tasks) if(task.application) people.set(task.application.id,task.application);
  const activeIds = activeMemberIds || new Set((data.interns || []).filter(intern=>intern.status==="Active").map(intern=>intern.applicationId));
  const assignees = (project?.team || []).filter(id=>activeIds.has(id)).map(id=>people.get(id)).filter(Boolean);
  async function loadOlderVersions(taskId) { const current=histories[taskId]; if(!current || current.loading)return; setHistories(old=>({...old,[taskId]:{...old[taskId],loading:true}}));const result=await commands.listSubmissions({taskId,page:current.page+1,pageSize:100,sortField:"version",sortDirection:"desc"});if(!result.ok){setListError(result.error);setHistories(old=>({...old,[taskId]:{...old[taskId],loading:false}}));return}setSubmissions(old=>{const ids=new Set(old.map(row=>row.id));return [...old,...result.data.items.filter(row=>!ids.has(row.id))]});setHistories(old=>({...old,[taskId]:{page:current.page+1,total:result.data.total,loading:false}}));}
  const submittedTasks = tasks.filter(task=>submissions.some(submission=>submission.taskId===task.id));
  const reviewCount = listing.counts?.statuses?.["Under review"] || 0;
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
        {canManageTasks && <Button
          variant="secondary"
          onClick={() => setCreating((value) => !value)}
          disabled={!assignees.length}
        >
          <Plus size={15} />
          Assign task
        </Button>}
      </div>
      <div className={styles.taskStats}>
        <span>
          <strong>{hasListing ? listing.total : "—"}</strong> assigned
        </span>
        <span>
          <strong>
            {hasListing ? listing.counts?.statuses?.Approved || 0 : "—"}
          </strong>{" "}
          approved
        </span>
        <span>
          <strong>{hasListing ? reviewCount : "—"}</strong> awaiting review
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
          { id: "tasks", label: "Assigned tasks", count: hasListing ? listing.total : undefined },
          ...(canReadSubmissions ? [{ id: "reviews", label: "Submissions on this page", count: hasListing ? submittedTasks.length : undefined }] : []),
        ]}
        value={tab}
        onChange={setTab}
        label="Project workflow"
      />
      {listError && <p role="alert">{listError}</p>}
      {listLoading && <LoadingIndicator label={tab === "tasks" ? "Loading project tasks…" : "Loading submissions…"} compact={tasks.length > 0} />}
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
                    {canManageTasks && <Button
                      variant="ghost"
                      onClick={() =>
                        setEditingTask(editingTask === task.id ? null : task.id)
                      }
                    >
                      Edit task
                    </Button>}
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
          ) : !listLoading && !listError ? (
            <EmptyState
              title="No tasks assigned yet"
              description="Create a task for an active project member to start the submission and review cycle."
            />
          ) : null
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
                history={histories[task.id]}
                loadMore={() => loadOlderVersions(task.id)}
              />
            ))}
          </div>
        ) : !listLoading && !listError ? (
          <EmptyState
            title="No submissions yet"
            description="Work submitted by this project’s interns will appear here for review."
          />
        ) : null}
      </div>
      {hasListing && <Pagination page={page} pageSize={pageSize} total={listing.total} onChange={setPage}/>}
    </section>
  );
}
