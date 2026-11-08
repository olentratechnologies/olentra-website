"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ClipboardCheck,
  Download,
  FileUp,
  LockKeyhole,
  Save,
  Upload,
} from "lucide-react";
import { useInternship } from "@/components/intern/InternshipProvider";
import {
  Button,
  EmptyState,
  ErrorMessage,
  Heading,
  Loading,
  Notice,
  Panel,
  Status,
  useAction,
} from "./PortalUI";
import styles from "./portal.module.css";

function OnboardingForm({ application, onboarding }) {
  const { commands, notify } = useInternship();
  const [values, setValues] = useState({
    phone: onboarding?.phone || application.phone || "",
    college: onboarding?.college || application.college || "",
    location: onboarding?.location || application.location || "",
    skills: (onboarding?.skills || application.skills || []).join(", "),
    acknowledged: Boolean(onboarding?.acknowledged),
    resumeAttachmentId:
      onboarding?.resumeAttachmentId || application.resumeAttachmentId || "",
  });
  const [attachmentName, setAttachmentName] = useState(
    values.resumeAttachmentId ? "Your uploaded resume" : "",
  );
  const [uploading, setUploading] = useState(false);
  const action = useAction();
  const locked =
    ["Submitted", "Approved"].includes(onboarding?.status) ||
    application.status === "Joined";
  const reviewedResume =
    onboarding?.status === "Approved" && !values.resumeAttachmentId;
  const payload = () => ({
    ...values,
    skills: [
      ...new Set(
        values.skills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean),
      ),
    ],
  });
  function update(key, value) {
    setValues((previous) => ({ ...previous, [key]: value }));
  }
  async function attach(file) {
    if (!file) return;
    setUploading(true);
    action.setError("");
    try {
      const { saveAttachment } = await import("@/lib/intern-attachments.mjs");
      const attachment = await saveAttachment(file, "resume");
      update("resumeAttachmentId", attachment.id);
      setAttachmentName(attachment.name);
      notify("Resume attached. Save your draft to keep this update.");
    } catch (error) {
      action.setError(
        error?.message || "Your resume couldn’t be attached. Try another file.",
      );
    } finally {
      setUploading(false);
    }
  }
  async function sampleResume() {
    setUploading(true);
    action.setError("");
    try {
      const { makeSampleResume } = await import("@/lib/intern-attachments.mjs");
      await attach(await makeSampleResume());
    } catch (error) {
      action.setError(
        error?.message || "The sample resume couldn’t be created.",
      );
    } finally {
      setUploading(false);
    }
  }
  async function download() {
    await action.run(async () => {
      const { downloadAttachment } = await import(
        "@/lib/intern-attachments.mjs"
      );
      await downloadAttachment(values.resumeAttachmentId);
      return { ok: true };
    });
  }
  async function save() {
    await action.run(
      () => commands.saveOnboarding(application.id, payload()),
      () => notify("Your onboarding draft has been saved."),
    );
  }
  async function submit(event) {
    event.preventDefault();
    await action.run(
      async () => {
        const saved = await commands.saveOnboarding(application.id, payload());
        if (!saved?.ok) return saved;
        return commands.submitOnboarding(application.id);
      },
      () =>
        notify(
          "Onboarding submitted. The Olentra team will review your details.",
        ),
    );
  }
  return (
    <form className={styles.form} onSubmit={submit}>
      <ErrorMessage>{action.error}</ErrorMessage>
      {onboarding?.status === "Submitted" && (
        <Notice>
          <div>
            <strong>Your details are with the team.</strong>
            <p>
              We’ll notify you once onboarding is approved and your project
              workspace is ready.
            </p>
          </div>
        </Notice>
      )}
      {onboarding?.status === "Approved" && (
        <Notice tone="green">
          <span>
            <Check size={18} /> Your onboarding is complete.
          </span>
          <Link href="/intern/portal/projects">
            View my projects <ArrowRight size={14} />
          </Link>
        </Notice>
      )}
      <div className={styles.onboardingGrid}>
        <Panel>
          <div className={styles.panelHeader}>
            <h2>Let’s get to know you</h2>
            <Status value={onboarding?.status || "Not started"} />
          </div>
          <p className={styles.panelDescription}>
            A few details to get your internship off to a smooth start.
          </p>
          <fieldset
            disabled={locked || action.busy || uploading}
            className={styles.fieldset}
          >
            <div className={styles.formGrid}>
              <label className={styles.field}>
                Phone number
                <input
                  required
                  type="tel"
                  autoComplete="tel"
                  value={values.phone}
                  onChange={(event) => update("phone", event.target.value)}
                  placeholder="Your contact number"
                />
              </label>
              <label className={styles.field}>
                College / institution
                <input
                  required
                  value={values.college}
                  onChange={(event) => update("college", event.target.value)}
                  placeholder="College or university"
                />
              </label>
              <label className={`${styles.field} ${styles.fullWidth}`}>
                Location
                <input
                  required
                  autoComplete="address-level2"
                  value={values.location}
                  onChange={(event) => update("location", event.target.value)}
                  placeholder="City, state"
                />
              </label>
              <label className={`${styles.field} ${styles.fullWidth}`}>
                Skills
                <input
                  required
                  value={values.skills}
                  onChange={(event) => update("skills", event.target.value)}
                  placeholder="React, Python, UI/UX Design"
                />
                <small>Separate each skill with a comma.</small>
              </label>
            </div>
          </fieldset>
          <div className={styles.uploadSection}>
            <h3>Resume</h3>
            <p>
              Share a recent resume so your mentors can understand your
              experience.
            </p>
            <div className={styles.uploadBox}>
              <span>
                <FileUp size={26} />
              </span>
              <strong>
                {attachmentName ||
                  (reviewedResume
                    ? "Resume reviewed during onboarding"
                    : "Upload your resume")}
              </strong>
              <small>
                {reviewedResume
                  ? "Recorded with your completed onboarding."
                  : "PDF or Word document · up to 5 MB"}
              </small>
              <div className={styles.actions}>
                {!locked && (
                  <>
                    <label className={styles.fileButton}>
                      <Upload size={14} />
                      {uploading ? "Attaching…" : "Choose file"}
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        disabled={uploading || action.busy}
                        onChange={(event) => attach(event.target.files?.[0])}
                      />
                    </label>

                  </>
                )}
                {values.resumeAttachmentId && (
                  <Button
                    variant="ghost"
                    onClick={download}
                    disabled={action.busy}
                  >
                    <Download size={14} />
                    Download
                  </Button>
                )}
              </div>
            </div>
          </div>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              required
              checked={values.acknowledged}
              disabled={locked || action.busy}
              onChange={(event) => update("acknowledged", event.target.checked)}
            />
            <span>
              I confirm that these details are accurate and agree to follow the
              internship program’s guidelines.
            </span>
          </label>
          {!locked && (
            <div className={styles.formActions}>
              <Button
                variant="secondary"
                onClick={save}
                busy={action.busy}
                disabled={action.busy || uploading}
              >
                <Save size={14} />
                Save draft
              </Button>
              <Button
                type="submit"
                busy={action.busy}
                disabled={action.busy || uploading}
              >
                Submit onboarding <ArrowRight size={14} />
              </Button>
            </div>
          )}
        </Panel>
        <Panel className={styles.checklistPanel}>
          <span className={styles.summaryIcon} data-tone="purple">
            <ClipboardCheck size={25} />
          </span>
          <h2>Your day-one checklist</h2>
          <p>A strong start begins with the basics.</p>
          <ul>
            {[
              { label: "Accept your internship offer", done: true },
              {
                label: "Add your personal details",
                done: Boolean(
                  values.phone && values.college && values.location,
                ),
              },
              {
                label: "Tell us about your skills",
                done: Boolean(values.skills.trim()),
              },
              {
                label: "Attach your resume",
                done: Boolean(values.resumeAttachmentId) || reviewedResume,
              },
              {
                label: "Confirm program guidelines",
                done: values.acknowledged,
              },
              {
                label: "Submit for review",
                done: ["Submitted", "Approved"].includes(onboarding?.status),
              },
            ].map((item) => (
              <li key={item.label} data-done={item.done}>
                <span>{item.done ? <Check size={13} /> : ""}</span>
                {item.label}
              </li>
            ))}
          </ul>
          <small>
            Your projects unlock after the team approves your onboarding.
          </small>
        </Panel>
      </div>
    </form>
  );
}

export default function PortalOnboarding() {
  const { ready, my } = useInternship();
  if (!ready) return <Loading />;
  return (
    <>
      <Heading
        title="Onboarding"
        description="A few simple steps before you start building."
      />
      {my.application &&
      (my.offer?.status === "Accepted" ||
        my.application.status === "Joined") ? (
        <OnboardingForm
          key={my.application.id}
          application={my.application}
          onboarding={my.onboarding}
        />
      ) : (
        <Panel>
          <EmptyState
            icon={LockKeyhole}
            title="Your onboarding opens after you accept your offer"
            description="Check your application for the latest update from the Olentra team."
          >
            <Link href="/intern/portal/application" className={styles.button}>
              View my application <ArrowRight size={15} />
            </Link>
          </EmptyState>
        </Panel>
      )}
    </>
  );
}
