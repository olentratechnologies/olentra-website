"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Celebration from "@/components/intern/Celebration";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ClipboardCheck,
  Download,
  Gift,
  Mail,
  MapPin,
  School,
  Sparkles,
} from "lucide-react";
import { useInternship } from "@/components/intern/InternshipProvider";
import { applicationDurationLabel, internRoleLabel, internScheduleLabel } from "@/lib/intern/opportunities.mjs";
import {
  Button,
  EmptyState,
  ErrorMessage,
  Heading,
  Loading,
  Modal,
  Notice,
  Panel,
  Skills,
  Status,
  formatDate,
  useAction,
} from "./PortalUI";
import styles from "./portal.module.css";
import { useSiteFeatures } from "@olentra/site-features/react";
import { offerTimeLeft } from "@/lib/intern/offer-deadline.mjs";
import { downloadOfferLetterPdf } from "@/lib/intern/offer-letter-pdf";

export default function PortalApplication() {
  const { features, ready: featuresReady } = useSiteFeatures();
  const { ready, my, commands, notify } = useInternship();
  const [declining, setDeclining] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const router = useRouter();
  const action = useAction();
  if (!ready) return <Loading />;
  const application = my.application;
  const offer = my.offer;
  const timeLeft = offer?.status === "Sent" ? offerTimeLeft(offer.expiresOn) : null;
  const interview = my.interview;
  if (!application)
    return (
      <>
        <Heading
          title="My Application"
          description="Your Olentra journey starts with one small step."
        />
        <Panel>
          <EmptyState
            icon={ClipboardCheck}
            title="No application linked"
            description="Your account doesn’t have an internship application yet."
          >
            {featuresReady && features.internships && <Link href="/careers/intern" className={styles.button}>
              Explore the internship program <ArrowRight size={15} />
            </Link>}
          </EmptyState>
        </Panel>
      </>
    );

  async function accept() {
    await action.run(
      () => commands.acceptOffer(application.id),
      () => setCelebrating(true),
    );
  }
  async function decline(event) {
    event.preventDefault();
    const reason = new FormData(event.currentTarget).get("reason");
    await action.run(
      () => commands.declineOffer(application.id, String(reason || "").trim()),
      () => {
        setDeclining(false);
        notify("Your decision has been saved.");
      },
    );
  }
  // Applicants can step back at any point before they join.
  const canWithdraw = ["Applied", "Under Review", "Shortlisted", "Selected"].includes(application.status);
  async function withdraw(event) {
    event.preventDefault();
    const reason = new FormData(event.currentTarget).get("reason");
    await action.run(
      () => commands.withdrawApplication(application.id, String(reason || "").trim()),
      () => {
        setWithdrawing(false);
        notify("Your application has been withdrawn.");
      },
    );
  }
  async function downloadResume() {
    await action.run(async () => {
      const attachments = await import("@/lib/intern-attachments.mjs");
      if (application.resumeAttachmentId)
        await attachments.downloadAttachment(application.resumeAttachmentId);
      else await attachments.downloadSampleResume(application);
      return { ok: true };
    });
  }

  return (
    <>
      <Celebration
        open={celebrating}
        title={`Welcome aboard${application.name ? `, ${application.name.split(/\s+/)[0]}` : ""}!`}
        message={`You’ve accepted your offer for ${application.program || "the Olentra internship"}. You’re officially part of the team — your onboarding checklist is ready.`}
        actionLabel="Start onboarding"
        onAction={() => {
          setCelebrating(false);
          router.push("/intern/portal/onboarding");
        }}
        onClose={() => {
          setCelebrating(false);
          notify("Offer accepted. Your onboarding is ready to complete.");
        }}
      />
      <Heading
        title="My Application"
        description="Every step of your application, in one place."
      >
        <Button
          variant="secondary"
          onClick={downloadResume}
          busy={action.busy}
          disabled={action.busy}
        >
          <Download size={15} />
          My resume
        </Button>
        {canWithdraw && (
          <Button variant="ghost" onClick={() => setWithdrawing(true)} disabled={action.busy}>
            Withdraw application
          </Button>
        )}
      </Heading>
      <ErrorMessage>{action.error}</ErrorMessage>
      <Panel className={styles.applicantHero}>
        <span className={styles.largeAvatar}>
          {application.initials ||
            application.name
              ?.split(" ")
              .slice(0, 2)
              .map((word) => word[0])
              .join("")}
        </span>
        <div>
          <div className={styles.applicantTitle}>
            <h2>{application.name}</h2>
            <Status value={application.status} />
          </div>
          <p>
            {application.program} <span>·</span> {application.college}
          </p>
          <small>
            Application {application.id} · Applied{" "}
            {formatDate(application.appliedOn)}
          </small>
        </div>
      </Panel>
      <Panel>
        <h2>Internship details</h2>
        <div className={styles.offerDetails}>
          <div><span>Intern role</span><strong>{internRoleLabel(application.roleId)}</strong></div>
          <div><span>Schedule</span><strong>{internScheduleLabel(application.schedule)}</strong></div>
          <div><span>Work mode</span><strong>{application.workMode === "remote" ? "100% remote" : "Not provided"}</strong></div>
          <div><span>Duration</span><strong>{applicationDurationLabel(application)}</strong></div>
        </div>
      </Panel>
      {offer && (
        <section id="internship-offer" style={{ scrollMarginTop: 90 }}><Panel className={styles.offerPanel}>
          <div className={styles.panelHeader}>
            <div className={styles.titleWithIcon}>
              <span className={styles.summaryIcon} data-tone="purple">
                <Gift size={24} />
              </span>
              <div>
                <span className={styles.eyebrow}>YOUR NEXT CHAPTER</span>
                <h2>
                  {offer.status === "Sent"
                    ? "You’re invited to build with us."
                    : offer.status === "Accepted"
                      ? "Welcome to your next chapter."
                      : "Your offer decision"}
                </h2>
              </div>
            </div>
            <Status value={offer.status} />
          </div>
          <p className={styles.offerMessage}>
            {offer.message ||
              "We’re excited about what you can bring to Olentra. Review your internship offer below."}
          </p>
          <div className={styles.offerDetails}>
            <div>
              <span>Program</span>
              <strong>{application.program}</strong>
            </div>
            <div>
              <span>Start date</span>
              <strong>{formatDate(offer.startOn)}</strong>
            </div>
            <div>
              <span>End date</span>
              <strong>{formatDate(offer.endOn)}</strong>
            </div>
            <div>
              <span>Stipend</span>
              <strong>
                {Number(offer.stipend) > 0
                  ? `₹${Number(offer.stipend).toLocaleString("en-IN")}${offer.stipendPeriod ? ` / ${offer.stipendPeriod}` : " / month"}`
                  : "No stipend"}
              </strong>
            </div>
          </div>
          {offer.status === "Sent" ? (
            <div className={styles.offerActions}>
              <Button
                busy={action.busy}
                disabled={action.busy || Boolean(timeLeft?.expired)}
                onClick={accept}
              >
                <Check size={15} />
                Accept offer
              </Button>
              <Button
                variant="ghost"
                disabled={action.busy}
                onClick={() => {
                  action.setError("");
                  setDeclining(true);
                }}
              >
                Decline offer
              </Button>
              <small>Accepting opens your onboarding checklist.</small>
              {timeLeft && <small className={timeLeft.urgent || timeLeft.expired ? styles.offerUrgent : ""} role="status">{timeLeft.label}{offer.expiresOn ? ` · until ${new Date(offer.expiresOn).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}` : ""}</small>}
            </div>
          ) : offer.status === "Accepted" ? (
            <Notice tone="green">
              <span>
                <Check size={17} /> Your offer has been accepted.
              </span>
              <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", marginTop: "10px" }}>
                <Button
                  variant="secondary"
                  onClick={() =>
                    downloadOfferLetterPdf({
                      name: application.name,
                      email: application.email,
                      college: application.college,
                      program: application.program,
                      roleTitle: internRoleLabel(application.roleId),
                      startOn: offer.startOn,
                      endOn: offer.endOn,
                      stipend: offer.stipend,
                      stipendPeriod: offer.stipendPeriod,
                      applicationId: application.id,
                      issueDate: offer.decidedOn,
                    })
                  }
                >
                  <Download size={14} /> Download Offer Letter (PDF)
                </Button>
                <Link href="/intern/portal/onboarding">
                  {my.onboarding?.status === "Approved"
                    ? "View onboarding"
                    : "Continue onboarding"}
                  <ArrowRight size={14} />
                </Link>
              </div>
            </Notice>
          ) : (
            <Notice>
              Your decision has been shared with the Olentra team. You can
              contact the team through Messages if you need help.
            </Notice>
          )}
        </Panel></section>
      )}
      {!offer && application.status === "Selected" && (
        <Notice>
          <Sparkles size={22} />
          <div>
            <strong>You’ve been selected!</strong>
            <p>
              Your offer is being prepared. We’ll let you know when it’s ready
              to review.
            </p>
          </div>
        </Notice>
      )}
      <div className={styles.applicationGrid}>
        <Panel>
          <h2>Personal details</h2>
          <dl className={styles.personalDetails}>
            <div>
              <Mail size={16} />
              <dd>{application.email}</dd>
            </div>
            <div>
              <School size={16} />
              <dd>{application.college || "Not provided"}</dd>
            </div>
            <div>
              <MapPin size={16} />
              <dd>{application.location || "Not provided"}</dd>
            </div>
            <div>
              <CalendarDays size={16} />
              <dd>Applied {formatDate(application.appliedOn)}</dd>
            </div>
          </dl>
          <Link href="/intern/portal/profile" className={styles.textLink}>
            Edit my profile <ArrowRight size={14} />
          </Link>
          <h3 className={styles.subheading}>My skills</h3>
          <Skills values={application.skills || []} />
        </Panel>
        {interview?.status === "Cancelled" && <Panel>
          <h2>Interview cancelled</h2>
          <p>Your interview on {new Date(interview.scheduledAt).toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" })} was cancelled{interview.cancelReason ? `: ${interview.cancelReason}` : "."} The team will be in touch if it’s rescheduled.</p>
        </Panel>}
        {interview && interview.status !== "Cancelled" && <Panel>
          <h2>Interview scheduled</h2>
          <p>Your interview is scheduled for {new Date(interview.scheduledAt).toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" })}.</p>
          <a href={interview.meetingUrl} className={styles.textLink} target="_blank" rel="noreferrer">
            Join the interview <ArrowRight size={14} />
          </a>
        </Panel>}
        <Panel>
          <h2>Application timeline</h2>
          <ol className={styles.timeline}>
            {(application.history || []).length ? (
              application.history.map((entry, index) => (
                <li key={entry.id || `${entry.date}-${index}`}>
                  <span className={styles.timelineMarker}>
                    <Check size={13} />
                  </span>
                  <div>
                    <strong>{entry.title === "Offer sent" ? "Offer received" : entry.title}</strong>
                    <time>{formatDate(entry.date || entry.createdOn)}</time>
                    {entry.detail && <p>{entry.detail}</p>}
                  </div>
                </li>
              ))
            ) : (
              <li>
                <span className={styles.timelineMarker}>
                  <Check size={13} />
                </span>
                <div>
                  <strong>Application received</strong>
                  <time>{formatDate(application.appliedOn)}</time>
                  <p>Your application is ready for the Olentra team.</p>
                </div>
              </li>
            )}
          </ol>
        </Panel>
      </div>
      <Modal
        open={declining}
        onOpenChange={setDeclining}
        title="Decline your offer"
        description="Let the Olentra team know your decision. You can include a short reason."
      >
        <form className={styles.form} onSubmit={decline}>
          <ErrorMessage>{action.error}</ErrorMessage>
          <label className={styles.field}>
            Reason
            <textarea
              name="reason"
              rows={4}
              required
              maxLength={1000}
              placeholder="Tell us a little about your decision…"
            />
          </label>
          <div className={styles.formActions}>
            <Button
              variant="ghost"
              onClick={() => setDeclining(false)}
              disabled={action.busy}
            >
              Keep reviewing
            </Button>
            <Button
              type="submit"
              variant="danger"
              busy={action.busy}
              disabled={action.busy}
            >
              Decline offer
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={withdrawing}
        onOpenChange={setWithdrawing}
        title="Withdraw your application"
        description="This tells the Olentra team you no longer want to be considered. It can't be undone; to be considered again, you'd need to contact the team."
      >
        <form className={styles.form} onSubmit={withdraw}>
          <ErrorMessage>{action.error}</ErrorMessage>
          <label className={styles.field}>
            Reason (optional)
            <textarea name="reason" rows={3} maxLength={1000} placeholder="Anything you'd like the team to know…" />
          </label>
          <div className={styles.formActions}>
            <Button variant="ghost" onClick={() => setWithdrawing(false)} disabled={action.busy}>
              Keep my application
            </Button>
            <Button type="submit" variant="danger" busy={action.busy} disabled={action.busy}>
              Withdraw application
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
