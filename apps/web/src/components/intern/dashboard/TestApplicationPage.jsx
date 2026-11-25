"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FlaskConical, Send } from "lucide-react";
import { useDashboard } from "./DashboardProvider";
import { Button, PageHeader, Panel } from "./DashboardUI";
import { INTERN_SCHEDULES } from "@/lib/intern/opportunities.mjs";
import { saveAttachment } from "@/lib/intern-attachments.mjs";
import styles from "./applicant.module.css";
import own from "./TestApplicationPage.module.css";

const errorText = (error, fallback) => (typeof error === "string" ? error : error?.message || fallback);
const isHttpUrl = (value) => { try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; } };
const isLinkedIn = (value) => { try { return isHttpUrl(value) && /(^|\.)linkedin\.com$/i.test(new URL(value).hostname); } catch { return false; } };

/**
 * Admin-only test application. It goes through exactly the same submission as
 * the public form (confirmation email, AI resume review, timeline, notifications),
 * works while public applications are closed, and is marked "Test".
 */
export default function TestApplicationPage() {
  const { data, account, commands } = useDashboard();
  const isAdmin = account?.role === "company" && account?.staffRole === "admin";
  const programs = data?.programs || [];
  const [programId, setProgramId] = useState(() => programs[0]?.id || "");
  const [schedule, setSchedule] = useState(INTERN_SCHEDULES[0].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(null);
  const uploaded = useRef(null); // { file, attachment }: reused if only the submit step needs retrying
  const formRef = useRef(null);

  if (!isAdmin) {
    return (
      <div>
        <PageHeader title="Test application" description="Only admins can submit test applications." />
      </div>
    );
  }

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const input = {
      name: String(form.get("fullName") || "").trim(),
      email: String(form.get("email") || "").trim().toLowerCase(),
      programId: programId || programs[0]?.id || "",
      schedule,
      linkedin: String(form.get("linkedin") || "").trim(),
      github: String(form.get("github") || "").trim(),
      videoUrl: String(form.get("videoUrl") || "").trim(),
    };
    const file = form.get("resume");
    if (input.name.length < 2) return setError("Enter the applicant’s full name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) return setError("Enter a valid email address.");
    if (!input.programId) return setError("Choose an internship track.");
    if (!isLinkedIn(input.linkedin)) return setError("Enter a LinkedIn profile URL (linkedin.com).");
    if (input.github && !isHttpUrl(input.github)) return setError("Enter a valid http or https GitHub or portfolio link.");
    if (input.videoUrl && !isHttpUrl(input.videoUrl)) return setError("Enter a valid http or https video link.");
    if (!(file instanceof File) || !file.size) return setError("Attach a resume (PDF, DOC or DOCX, up to 5 MB).");
    setBusy(true);
    setError("");
    try {
      let attachment = uploaded.current?.file === file ? uploaded.current.attachment : null;
      if (!attachment) {
        attachment = await saveAttachment(file, "resume", { testApplication: true });
        uploaded.current = { file, attachment };
      }
      const result = await commands.submitTestApplication({ ...input, resumeAttachmentId: attachment.id, resumeAccessToken: attachment.accessToken });
      if (!result.ok) { setError(errorText(result.error, "Couldn’t submit the test application.")); return; }
      setSaved({ ...input, applicationId: result.data?.applicationId });
      uploaded.current = null;
      formRef.current?.reset();
    } catch (failure) {
      setError(errorText(failure, "Couldn’t upload the resume. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Test application"
        description="Apply as a test candidate, even while applications are closed. It follows the real flow: confirmation email, AI resume review, timeline and notifications. It is marked Test everywhere."
      >
        <Link href="/intern/dashboard/applications" className={own.back}><ArrowLeft size={15} /> Back to Applications</Link>
      </PageHeader>

      {saved && (
        <Panel className={own.success} role="status">
          <FlaskConical size={18} aria-hidden="true" />
          <div>
            <strong>Test application submitted for {saved.name}</strong>
            <p>The confirmation email is on its way to {saved.email}, and the AI resume review has been queued.</p>
            {saved.applicationId && <Link href={`/intern/dashboard/applications/${saved.applicationId}`}>Open the application ({saved.applicationId})</Link>}
          </div>
        </Panel>
      )}

      <Panel>
        <form ref={formRef} className={`${styles.modalForm} ${own.form}`} onSubmit={submit} noValidate>
          <p className={own.note}>
            Emails go to the address you enter, so use one you can read (for example yourname+test1@gmail.com). Each email can apply once; delete the test application from its page to reuse it.
          </p>
          <div className={own.grid}>
            <label>Full name<input name="fullName" autoComplete="off" required maxLength={120} disabled={busy} /></label>
            <label>Email<input name="email" type="email" autoComplete="off" required disabled={busy} /></label>
            <label>
              Track
              <select value={programId} onChange={(event) => setProgramId(event.target.value)} disabled={busy}>
                {programs.map((program) => <option key={program.id} value={program.id}>{program.name}{program.enabled === false ? " (closed to the public)" : ""}</option>)}
              </select>
            </label>
            <fieldset className={own.radios} disabled={busy}>
              <legend>Schedule</legend>
              {INTERN_SCHEDULES.map((option) => (
                <label key={option.id}><input type="radio" name="schedule" value={option.id} checked={schedule === option.id} onChange={() => setSchedule(option.id)} />{option.label}</label>
              ))}
            </fieldset>
            <label>LinkedIn profile<input name="linkedin" type="url" placeholder="https://www.linkedin.com/in/…" required disabled={busy} /></label>
            <label>GitHub or portfolio (optional)<input name="github" type="url" placeholder="https://github.com/…" disabled={busy} /></label>
            <label>Intro video link (optional)<input name="videoUrl" type="url" placeholder="https://…" disabled={busy} /></label>
            <label>Resume (PDF, DOC or DOCX, up to 5 MB)<input name="resume" type="file" accept=".pdf,.doc,.docx" required disabled={busy} /></label>
          </div>
          {error && <p className={styles.fieldError} role="alert">{error}</p>}
          <div className={styles.modalActions}>
            <Button type="submit" disabled={busy}><Send size={15} />{busy ? "Submitting…" : "Submit test application"}</Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
