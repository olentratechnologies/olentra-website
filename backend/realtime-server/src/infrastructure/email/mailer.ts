import { scheduleDisplay, displayDate } from "../../modules/programs/schedule.mjs";
import { formatDeadline } from "../../modules/programs/offer-policy.mjs";
import { emailDefinition, fillEmailTemplate, type AutomatedEmailId, type EmailTemplate } from "../../modules/email-templates/automated-templates";
import { interviewIcs, interviewTimeLabel } from "../../modules/interviews/ics";
import type { SigninEmailTemplateVariant } from "../../modules/email-templates/signin-template-settings";
import { emailAction, emailMessage, emailParagraph, emailSignOff, escapeEmailHtml as escapeHtml, renderInternshipEmail, renderInternshipTextEmail } from "../../modules/email-templates/internship-email-layout.mjs";

type SendResult = { ok: boolean; delivered: boolean; id?: string; error?: string };
type ApplicantStatus = "offer-reminder" | "offer-revised" | "offer-revision-accepted" | "offer-revision-declined" | "offer-revision-withdrawn" | "shortlisted" | "selected" | "offer" | "offer-accepted" | "rejected" | "onboarding" | "certificate";

interface ApplicantStatusEmailOptions {
  to: string;
  name: string;
  programName: string;
  status: ApplicantStatus;
  portalUrl: string;
  certificateVerifyUrl?: string;
  linkedinShareUrl?: string;
  schedule?: Record<string, any>;
  pdfAttachment?: { filename: string; content: string | Buffer; contentType: string };
}

interface InterviewScheduledEmailOptions {
  to: string;
  name: string;
  programName: string;
  scheduledAt: string;
  meetingUrl: string;
  portalUrl: string;
  /** For the calendar invite: the same id across reschedules, a higher sequence each time. */
  interviewId?: string;
  sequence?: number;
  /** Set when the interview was cancelled. */
  cancelReason?: string;
}

interface ApplicationEmailOptions {
  schedule?: Record<string, any>;
  to: string;
  name: string;
  programName: string;
  applicationId?: string;
  magicLinkUrl?: string;
}

interface MagicLinkEmailOptions {
  to: string;
  name?: string;
  magicLinkUrl: string;
  templateVariant?: SigninEmailTemplateVariant;
}

interface PasswordResetEmailOptions {
  to: string;
  name?: string;
  resetUrl: string;
}

const EMAIL_DELIVERY_TOKEN = process.env.EMAIL_DELIVERY_TOKEN;
const EMAIL_SERVER_URL = process.env.EMAIL_SERVER_URL || "http://127.0.0.1:3001";
const ACCOUNT_SECURITY_NOTICE = "Olentra will never request fee payments, banking credentials, or your account password via email.";

export function createInternshipMailer(deliveryToken = EMAIL_DELIVERY_TOKEN, deliveryUrl = EMAIL_SERVER_URL, resolveTemplate?: (id: AutomatedEmailId) => Promise<EmailTemplate>) {
  function resolveCandidateGreeting(rawName: string | undefined): { greeting: string; firstName: string; fullName: string } {
    const trimmed = String(rawName || "").trim();
    const lower = trimmed.toLowerCase();
    const isHandle =
      !trimmed ||
      lower === "there" ||
      lower === "unknown" ||
      lower === "applicant" ||
      lower === "candidate" ||
      (trimmed.includes("@") && !trimmed.includes("<")) ||
      (!trimmed.includes("<") && !trimmed.includes(">") && (!/\s/.test(trimmed) && /\d/.test(trimmed))) ||
      (!trimmed.includes("<") && !trimmed.includes(">") && (trimmed.match(/\d/g) || []).length >= (trimmed.match(/[a-zA-Z]/g) || []).length && /\d/.test(trimmed));

    if (isHandle) {
      return { greeting: "Hello,", firstName: "there", fullName: trimmed || "there" };
    }
    if (trimmed.includes("<") || trimmed.includes(">")) {
      return { greeting: `Hi ${trimmed},`, firstName: trimmed.split(/\s+/)[0] || trimmed, fullName: trimmed };
    }
    const cleanWord = (w: string) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1) : w);
    const words = trimmed.split(/\s+/).filter(Boolean);
    const firstName = cleanWord(words[0] || "there");
    const fullName = words.map(cleanWord).join(" ");
    return { greeting: `Hi ${firstName},`, firstName, fullName };
  }

  const emailPanel = (content: string) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
      <tr><td bgcolor="#eaf0f6" style="padding:12px 16px;background-color:#eaf0f6;border-radius:6px;color:#243549;">${content}</td></tr>
    </table>`;

  type Attachment = { filename: string; content: string | Buffer; contentType: string };
  async function sendEmail(to: string, subject: string, html: string, text: string, attachments: Attachment[] = []): Promise<SendResult> {
    if (!deliveryToken) return { ok: false, delivered: false, error: "Central email delivery is not configured." };
    try {
      const response = await fetch(`${deliveryUrl.replace(/\/$/, "")}/api/email`, {
        method: "POST", headers: { Authorization: `Bearer ${deliveryToken}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(45_000),
        body: JSON.stringify({ to: [to], subject, html, text, ...(attachments.length ? { attachments: attachments.map(file => ({ filename: file.filename, content: Buffer.from(file.content).toString("base64"), contentType: file.contentType })) } : {}) }),
      });
      if (!response.ok) { await response.body?.cancel().catch(() => {}); return { ok: false, delivered: false, error: `Central email delivery failed (${response.status}).` }; }
      const result = await response.json() as { success?: boolean; id?: string };
      if (!result.success || !result.id) return { ok: false, delivered: false, error: "Central email delivery was not acknowledged." };
      return { ok: true, delivered: true, id: result.id };
    } catch {
      return { ok: false, delivered: false, error: "Central email delivery is unavailable." };
    }
  }

  function plainTextFromHtml(html: string) {
    return html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(script|style|head)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
      .replace(/<(br|\/p|\/div|\/tr|\/h[1-6]|\/li)\b[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&#(\d+);/g, (_match, value: string) => {
        const code = Number(value);
        return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : " ";
      })
      .replace(/&#x([\da-f]+);/gi, (_match, value: string) => {
        const code = Number.parseInt(value, 16);
        return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : " ";
      })
      .replace(/[ \t]+/g, " ")
      .replace(/ *\n */g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function renderAutomated(id: AutomatedEmailId, options: Record<string, any>, template: EmailTemplate = emailDefinition(id)) {
    const definition = emailDefinition(id);
    const resolved = resolveCandidateGreeting(options.name);
    const time = options.scheduledAt ? interviewTimeLabel(options.scheduledAt) : "";
    let { subject, body } = fillEmailTemplate(template, {
      firstName: resolved.firstName,
      fullName: resolved.fullName,
      program: String(options.programName || ""),
      referenceId: String(options.applicationId || "pending"),
      interviewTime: time,
      decisionDeadline: formatDeadline(options.schedule?.expiresOn) || "the deadline shown in your candidate portal",
      ...scheduleDisplay(options.schedule),
    });
    if (resolved.greeting === "Hello,") {
      body = body.replace(/^(Hi\s+[^\n,]+,|Hello,)/, "Hello,");
    }
    const details: string[] = [], buttons: { label: string; url: string }[] = [];
    const attachments: Attachment[] = [];
    if(id !== "application-received" && !id.startsWith("interview-") && id!=="signin") {
      const schedule=options.schedule;
      if(schedule?.startOn && schedule?.endOn) {
        if(schedule.historical)details.push("This message records an earlier offer version. Your current accepted terms are available in Certificates & Documents.");
        details.push(`Duration: ${schedule.durationLabel||scheduleDisplay(schedule).duration}`, `Start date: ${displayDate(schedule.startOn)}`, `Completion date: ${displayDate(schedule.endOn)}`, `Work arrangement: ${schedule.workMode||"Remote"}${schedule.schedule?` · ${schedule.schedule}`:""}`);
        if(["offer","offer-revised","offer-reminder"].includes(id)&&schedule.expiresOn) {
          if(id==="offer"&&schedule.extendedOn)details.push("Your decision deadline has been extended.");
          details.push(`Respond by: ${formatDeadline(schedule.expiresOn)}`,"Need more time? Write to intern.support@olentratechnologies.com before the deadline.");
        }
        if(schedule.reason)details.push(`Revision reason: ${schedule.reason}`);
      } else if(["application-received","shortlisted","selected"].includes(id)) details.push(`Duration: ${schedule?.durationLabel||"As described in the program"}`,"Start date to be confirmed in your offer.");
    }
    let customPanelHtml: string | null = null;

    if (id === "application-received") {
      const refId = String(options.applicationId || "pending");
      details.push(
        `Application reference: ${refId}`,
        "Review estimate: 3–5 business days. No portal account or action is required at this stage."
      );
      customPanelHtml = `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;margin:2px 0;">
          <tr>
            <td style="font-family:Arial,Helvetica,sans-serif;padding:2px 0 12px;">
              <h2 style="margin:0 0 12px;font-size:18px;line-height:26px;color:#172033;">Application Details</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;border-collapse:collapse;border:1px solid #dce4ee;">
                <tr>
                  <td width="38%" style="padding:10px 12px;border-bottom:1px solid #dce4ee;background:#f8fafc;font-size:13px;line-height:20px;font-weight:700;color:#334155;">Position</td>
                  <td style="padding:10px 12px;border-bottom:1px solid #dce4ee;font-size:13px;line-height:20px;color:#334155;">${escapeHtml(String(options.programName || ""))}</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;border-bottom:1px solid #dce4ee;background:#f8fafc;font-size:13px;line-height:20px;font-weight:700;color:#334155;">Application Reference</td>
                  <td style="padding:10px 12px;border-bottom:1px solid #dce4ee;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:13px;line-height:20px;font-weight:600;color:#0f172a;overflow-wrap:anywhere;word-break:break-all;">${escapeHtml(refId)}</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;border-bottom:1px solid #dce4ee;background:#f8fafc;font-size:13px;line-height:20px;font-weight:700;color:#334155;">Application Status</td>
                  <td style="padding:10px 12px;border-bottom:1px solid #dce4ee;font-size:13px;line-height:20px;color:#334155;">Received</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;background:#f8fafc;font-size:13px;line-height:20px;font-weight:700;color:#334155;">Expected Review Timeline</td>
                  <td style="padding:10px 12px;font-size:13px;line-height:20px;color:#334155;">3–5 business days</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="font-family:Arial,Helvetica,sans-serif;padding:12px 0 18px;">
              <h2 style="margin:0 0 10px;font-size:18px;line-height:26px;color:#172033;">Internship Information</h2>
              <ul style="margin:0;padding:0 0 0 20px;font-size:14px;line-height:24px;color:#334155;">
                <li>Duration: ${escapeHtml(options.schedule?.durationLabel || "1 calendar month")}</li>
                <li>Start Date: To be confirmed in the official offer letter.</li>
              </ul>
            </td>
          </tr>
          <tr>
            <td style="font-family:Arial,Helvetica,sans-serif;padding:2px 0 4px;">
              <h2 style="margin:0 0 10px;font-size:18px;line-height:26px;color:#172033;">What Happens Next?</h2>
              <p style="margin:0 0 10px;font-size:15px;line-height:24px;color:#334155;">No portal registration or additional action is required from your side at this stage. Please keep an eye on your registered email address for further updates from our team.</p>
              <p style="margin:0;font-size:15px;line-height:24px;color:#334155;">Thank you for considering Olentra Technologies as part of your professional journey.</p>
            </td>
          </tr>
        </table>
      `.trim();
    }
    if (id.startsWith("interview-")) {
      details.push(`When: ${time}`);
      if (options.cancelReason) details.push(`Reason: ${options.cancelReason}`);
      if (id !== "interview-cancelled") buttons.push({ label: "Join your interview", url: options.meetingUrl });
      if (options.portalUrl) buttons.push({ label: "Open candidate portal", url: options.portalUrl });
      if (options.interviewId && id !== "interview-reminder") {
        const method = id === "interview-cancelled" ? "CANCEL" : "REQUEST";
        attachments.push({ filename: "interview.ics", contentType: `text/calendar; charset=utf-8; method=${method}`, content: interviewIcs({ uid: options.interviewId, sequence: options.sequence ?? 0, startsAt: options.scheduledAt, summary: `Olentra interview · ${options.programName}`, description: method === "CANCEL" ? "This interview was cancelled." : `Join: ${options.meetingUrl}`, url: options.meetingUrl, method }) });
      }
    }
    if (id === "selected") {
      buttons.push({ label: "Activate your internship portal", url: options.portalUrl });
      details.push("Single-use link · Expires in 24 hours. If it expires, request a new sign-in link.");
    }
    if (["offer", "offer-reminder", "offer-accepted", "onboarding", "certificate", "offer-revised", "offer-revision-accepted", "offer-revision-declined", "offer-revision-withdrawn"].includes(id)) buttons.push({ label: "Open candidate portal", url: options.portalUrl });
    if (id === "offer-accepted" && options.linkedinShareUrl) {
      buttons.push({ label: "Share on LinkedIn (optional)", url: options.linkedinShareUrl });
    }
    if (["offer-accepted","offer-revision-accepted"].includes(id) && options.pdfAttachment) {
      attachments.push(options.pdfAttachment);
    }
    if (id === "certificate") {
      if (options.certificateVerifyUrl) buttons.push({ label: "Verify your certificate", url: options.certificateVerifyUrl });
      if (options.linkedinShareUrl) buttons.push({ label: "Share your certificate on LinkedIn", url: options.linkedinShareUrl });
    }
    if (id === "signin") {
      buttons.push({ label: "Open candidate portal", url: options.magicLinkUrl });
      details.push("Single-use link · Expires in 24 hours", "This single-use link expires in 24 hours. If you didn’t request this link, you can safely ignore this email.");
    }
    if (id === "signin" || id === "selected") details.push(ACCOUNT_SECURITY_NOTICE);
    const panelContent = customPanelHtml || (details.length
      ? emailPanel(details.map(item => `<p style="margin:4px 0;font-size:14px;line-height:22px;overflow-wrap:anywhere;">${escapeHtml(item)}</p>`).join(""))
      : "");
    const actions = buttons.filter(button => button.url);
    const signoffTeam = id === "application-received" ? "Talent Acquisition Team" : "The Olentra Team";
    const content = emailMessage(body)
      + panelContent
      + actions.map(button => emailAction(button.label, button.url)).join("")
      + (template.body === definition.body ? emailSignOff(signoffTeam) : "");
    const html = renderInternshipEmail({ title: subject, preheader: body.slice(0, 180), content });
    const text = id === "application-received"
      ? [
          body,
          "Application Details",
          `Position: ${options.programName || ""}`,
          `Application Reference: ${String(options.applicationId || "pending")}`,
          "Application Status: Received",
          "Expected Review Timeline: 3–5 business days",
          "Internship Information",
          `- Duration: ${options.schedule?.durationLabel || "1 calendar month"}`,
          "- Start Date: To be confirmed in the official offer letter.",
          "What Happens Next?",
          "No portal registration or additional action is required from your side at this stage. Please keep an eye on your registered email address for further updates from our team.",
          "Thank you for considering Olentra Technologies as part of your professional journey.",
          `Best regards,\n${signoffTeam}\nOlentra Technologies`,
        ].join("\n\n")
      : [body, ...details, ...actions.map(button => `${button.label}: ${button.url}`), "The Olentra Team"].join("\n\n");
    return { subject, html, text, attachments };
  }
  async function automated(id: AutomatedEmailId, options: Record<string, any>) {
    const rendered = renderAutomated(id, options, await resolveTemplate?.(id));
    return sendEmail(options.to, rendered.subject, rendered.html, rendered.text, rendered.attachments);
  }

  return {
    renderAutomated,
    /** Sends a stored custom template to one recipient; bulk campaigns call this once per address. */
    async sendCustomEmail({ to, subject, body, format }: { to: string; subject: string; body: string; format: "html" | "text" }): Promise<SendResult> {
      const html = format === "html"
        ? body
        : renderInternshipTextEmail(subject, body);
      const text = format === "html" ? plainTextFromHtml(body) : body;
      return sendEmail(to, subject, html, text || body.replace(/<[^>]*>/g, " ").trim() || subject);
    },
    async sendInterviewScheduled(options: InterviewScheduledEmailOptions): Promise<SendResult> { return automated("interview-scheduled", options); },
    async sendInterviewCancelled(options: InterviewScheduledEmailOptions): Promise<SendResult> { return automated("interview-cancelled", options); },
    async sendInterviewReminder(options: InterviewScheduledEmailOptions): Promise<SendResult> { return automated("interview-reminder", options); },

    /** A reminder or digest with an intro, a short list and one button. */
    async sendNotice({ to, subject, intro, items, ctaLabel, ctaUrl }: { to: string; subject: string; intro: string; items: string[]; ctaLabel: string; ctaUrl: string }): Promise<SendResult> {
      const text = `${intro}\n\n${items.map(item => `- ${item}`).join("\n")}\n\n${ctaLabel}: ${ctaUrl}\n\nThe Olentra Team`;
      const content = `
        ${emailMessage(intro)}
        ${emailPanel(`<ul style="margin:0;padding:0 0 0 19px;font-size:14px;line-height:22px;">${items.map(item => `<li style="padding:2px 0;">${escapeHtml(item)}</li>`).join("")}</ul>`)}
        ${emailAction(ctaLabel, ctaUrl)}
        ${emailSignOff("The Olentra Team")}
      `;
      const html = renderInternshipEmail({ title: subject, preheader: intro, content });
      return sendEmail(to, subject, html, text);
    },

    async sendApplicantStatus(options: ApplicantStatusEmailOptions): Promise<SendResult> {
      if (options.status !== "rejected") return automated(options.status, options);
      const subject = `Update on your Olentra internship application (${options.programName})`;
      const body = `Hi ${options.name},\n\nThank you for taking the time to apply to Olentra Technologies and sharing your background with us. After careful consideration, we are unable to offer you an internship position for this cohort. We received a tremendous number of outstanding applications and had to make difficult decisions. We truly appreciate your interest in Olentra, wish you continued success in your learning and career, and warmly invite you to stay connected with us on LinkedIn and re-apply in future cohorts.`;
      const html = renderInternshipEmail({ title: subject, preheader: subject, content: emailMessage(body) });
      return sendEmail(options.to, subject, html, body);
    },
    async sendApplicationConfirmation(options: ApplicationEmailOptions): Promise<SendResult> { return automated("application-received", options); },
    async sendMagicLink(options: MagicLinkEmailOptions): Promise<SendResult> { return automated("signin", options); },

    async sendPasswordResetLink({ to, name = "there", resetUrl }: PasswordResetEmailOptions): Promise<SendResult> {
      const subject = "Reset your Olentra Internship Account Password";
      const text = `Hi ${name},\n\nWe received a request to reset the password for your Olentra Internship account.\n\nClick the link below to set a new password:\n\n${resetUrl}\n\nThis secure link is valid for 1 hour and can be used once.\n\nIf you did not request this password reset, you can safely ignore this email; your password will remain unchanged.\n\n${ACCOUNT_SECURITY_NOTICE}\n\nBest regards,\nThe Olentra Team`;

      const safeName = escapeHtml(String(name));
      const content = `
        ${emailParagraph(`Hi <strong>${safeName}</strong>,`)}
        ${emailParagraph("We received a request to reset the password for your Olentra Internship account. Click the button below to choose a new password:")}
        ${emailAction("Reset My Password", resetUrl)}
        ${emailPanel(`<p style="margin:0;font-size:14px;line-height:22px;"><strong>Security note:</strong> This single-use link is valid for 1 hour. If you did not request a password reset, you can safely ignore this email; your password will remain unchanged.</p><p style="margin:8px 0 0;font-size:14px;line-height:22px;">${ACCOUNT_SECURITY_NOTICE}</p>`)}
        ${emailSignOff("The Olentra Team")}
      `;
      const html = renderInternshipEmail({
        title: subject,
        preheader: "Reset your Olentra Internship account password. This secure link is valid for 1 hour.",
        content,
      });

      return sendEmail(to, subject, html, text);
    },
  };
}
