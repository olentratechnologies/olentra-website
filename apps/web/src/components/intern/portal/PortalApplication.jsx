"use client";

import { useState } from "react";
import Link from "next/link";
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

export default function PortalApplication() {
  const { features, ready: featuresReady } = useSiteFeatures();
  const { ready, my, commands, notify } = useInternship();
  const [declining, setDeclining] = useState(false);
  const action = useAction();
  if (!ready) return <Loading />;
  const application = my.application;
  const offer = my.offer;
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
      () => notify("Offer accepted. Your onboarding is ready to complete."),
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
      {offer && (
        <Panel className={styles.offerPanel}>
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
                disabled={action.busy}
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
            </div>
          ) : offer.status === "Accepted" ? (
            <Notice tone="green">
              <span>
                <Check size={17} /> Your offer has been accepted.
              </span>
              <Link href="/intern/portal/onboarding">
                {my.onboarding?.status === "Approved"
                  ? "View onboarding"
                  : "Continue onboarding"}
                <ArrowRight size={14} />
              </Link>
            </Notice>
          ) : (
            <Notice>
              Your decision has been shared with the Olentra team. You can
              contact the team through Messages if you need help.
            </Notice>
          )}
        </Panel>
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
                    <strong>{entry.title}</strong>
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
    </>
  );
}
