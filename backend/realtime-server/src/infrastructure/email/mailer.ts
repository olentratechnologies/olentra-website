import { scheduleDisplay, displayDate } from "../../modules/programs/schedule.mjs";
import { emailDefinition, fillEmailTemplate, type AutomatedEmailId, type EmailTemplate } from "../../modules/email-templates/automated-templates";
import { interviewIcs, interviewTimeLabel } from "../../modules/interviews/ics";
import type { SigninEmailTemplateVariant } from "../../modules/email-templates/signin-template-settings";

type SendResult = { ok: boolean; delivered: boolean; id?: string; error?: string };
type ApplicantStatus = "offer-revised" | "offer-revision-accepted" | "offer-revision-declined" | "offer-revision-withdrawn" | "shortlisted" | "selected" | "offer" | "offer-accepted" | "rejected" | "onboarding" | "certificate";

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

export function createInternshipMailer(deliveryToken = EMAIL_DELIVERY_TOKEN, deliveryUrl = EMAIL_SERVER_URL, resolveTemplate?: (id: AutomatedEmailId) => Promise<EmailTemplate>) {
  const escapeHtml = (value: string) =>
    value.replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character]!);
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

  const emailShell = ({
    subject,
    preheader,
    heading,
    content,
  }: {
    subject: string;
    preheader: string;
    eyebrow: string;
    heading: string;
    content: string;
  }) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;color:#14213d;">
  <div style="display:none;font-size:1px;color:#f3f6fb;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${escapeHtml(preheader)}
    &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f3f6fb" style="font-family:Arial,Helvetica,sans-serif;background:#f3f6fb;padding:20px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;width:100%;max-width:640px;background:#ffffff;border:1px solid #e4eaf3;border-radius:2px;">
        <tr><td align="center" bgcolor="#10265f" style="font-family:Arial,Helvetica,sans-serif;padding:20px 24px 0;background-color:#10265f;border-bottom:2px solid #2563eb;">
          <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;margin:0 auto;">
            <tr>
              <td width="52" valign="middle" style="font-family:Arial,Helvetica,sans-serif;width:52px;padding:0 0 16px;">
                <a href="https://www.olentratechnologies.com" style="font-family:Arial,Helvetica,sans-serif;text-decoration:none;"><img src="https://www.olentratechnologies.com/images/branding/Logo/Olentra-Logo-Without-Background.png" width="40" height="40" alt="Olentra Technologies" style="display:block;width:40px;height:40px;border:0;"></a>
              </td>
              <td valign="middle" style="font-family:Arial,Helvetica,sans-serif;padding:0 0 16px;font-size:20px;line-height:1.25;font-weight:700;color:#ffffff;">Olentra Technologies</td>
            </tr>
          </table>
        </td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;padding:20px 24px 16px;text-align:center;">
          <h1 style="font-family:Arial,Helvetica,sans-serif;margin:0;font-size:25px;line-height:1.24;font-weight:700;letter-spacing:-.025em;color:#0f172a;">${escapeHtml(heading)}</h1>
        </td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;padding:0 24px 20px;">${content}</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;padding:0 24px;"><div style="height:1px;background:#e8edf5;font-size:1px;line-height:1px;">&nbsp;</div></td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;padding:16px 24px 18px;background:#ffffff;">
          <p style="font-family:Arial,Helvetica,sans-serif;margin:0 0 5px;font-size:12px;line-height:1.55;font-weight:600;color:#334155;">Olentra Technologies Pvt. Ltd. · Building intelligent systems</p>
          <p style="font-family:Arial,Helvetica,sans-serif;margin:0 0 8px;font-size:11px;line-height:1.55;color:#64748b;">CIN: U72900TG2023PTC176542 · Hyderabad, India · <a href="https://www.olentratechnologies.com" style="font-family:Arial,Helvetica,sans-serif;color:#2563eb;text-decoration:none;">www.olentratechnologies.com</a></p>
          <p style="font-family:Arial,Helvetica,sans-serif;margin:0 0 10px;font-size:11px;line-height:1.55;color:#64748b;">Support: <a href="mailto:support@olentratechnologies.com" style="font-family:Arial,Helvetica,sans-serif;color:#2563eb;text-decoration:none;">support@olentratechnologies.com</a> &nbsp;·&nbsp; <a href="https://www.olentratechnologies.com/careers/intern" style="font-family:Arial,Helvetica,sans-serif;color:#2563eb;text-decoration:none;">Careers</a> &nbsp;·&nbsp; <a href="https://www.olentratechnologies.com/privacy-policy" style="font-family:Arial,Helvetica,sans-serif;color:#2563eb;text-decoration:none;">Privacy Policy</a> &nbsp;·&nbsp; <a href="https://www.olentratechnologies.com/terms-of-service" style="font-family:Arial,Helvetica,sans-serif;color:#2563eb;text-decoration:none;">Terms of Service</a></p>
          <div style="height:1px;background:#e8edf5;font-size:1px;line-height:1px;margin:10px 0;">&nbsp;</div>
          <p style="font-family:Arial,Helvetica,sans-serif;margin:0 0 5px;font-size:11px;line-height:1.55;color:#718096;">Automated message about your internship application or program. Please do not reply directly to this email.</p>
          <p style="font-family:Arial,Helvetica,sans-serif;margin:0;font-size:11px;line-height:1.55;color:#64748b;">Security notice: Olentra will never request fee payments, banking credentials, or your account password via email.</p>
        </td></tr>
      </table>
      <p style="font-family:Arial,Helvetica,sans-serif;margin:16px 0 0;font-size:11px;line-height:1.5;color:#8a96a8;">© 2026 Olentra Technologies Pvt. Ltd. All rights reserved.</p>
    </td></tr>
  </table>
</body>
</html>`;
  const emailButton = (label: string, href: string, background = "#2563eb") => `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;margin:16px 0 6px;">
      <tr>
        <td bgcolor="${background}" style="font-family:Arial,Helvetica,sans-serif;border-radius:4px;background:${background};">
          <a href="${escapeHtml(href)}" style="font-family:Arial,Helvetica,sans-serif;display:inline-block;padding:11px 20px;border:1px solid ${background};border-radius:4px;color:#ffffff;text-decoration:none;font-size:14px;line-height:1.2;font-weight:700;letter-spacing:-0.01em;">${escapeHtml(label)} &rarr;</a>
        </td>
      </tr>
    </table>
    <p style="font-family:Arial,Helvetica,sans-serif;margin:4px 0 16px;font-size:11px;line-height:1.5;color:#8a96a8;word-break:break-all;">If the button doesn&#39;t work, copy and paste this link into your browser:<br><a href="${escapeHtml(href)}" style="font-family:Arial,Helvetica,sans-serif;color:#2563eb;text-decoration:underline;">${escapeHtml(href)}</a></p>
  `;
  const emailPanel = (content: string, tone: "blue" | "neutral" | "green" = "neutral") => {
    const palette = {
      blue: { background: "#f2f7ff", border: "#dce9ff", accent: "#2563eb" },
      neutral: { background: "#f8fafc", border: "#e2e8f0", accent: "#2563eb" },
      green: { background: "#f0faf5", border: "#d4f0e0", accent: "#16a34a" },
    }[tone];
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;margin:16px 0;border-top:1px solid ${palette.border};border-bottom:1px solid ${palette.border};"><tr><td style="font-family:Arial,Helvetica,sans-serif;padding:12px 0;color:${palette.accent};">${content}</td></tr></table>`;
  };

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
      ...scheduleDisplay(options.schedule),
    });
    if (resolved.greeting === "Hello,") {
      body = body.replace(/^(Hi\s+[^\n,]+,|Hello,)/, "Hello,");
    }
    const details: string[] = [], buttons: { label: string; url: string }[] = [];
    const attachments: Attachment[] = [];
    if(!id.startsWith("interview-") && id!=="signin") {
      const schedule=options.schedule;
      if(schedule?.startOn && schedule?.endOn) {
        details.push(`Offer version: ${schedule.version||schedule.currentVersion||1}`);
        if(schedule.historical)details.push("This message records an earlier offer version. Your current accepted terms are available in Certificates & Documents.");
        details.push(`Duration: ${schedule.durationLabel||scheduleDisplay(schedule).duration}`, `Start date: ${displayDate(schedule.startOn)}`, `Completion date: ${displayDate(schedule.endOn)}`, `Work arrangement: ${schedule.workMode||"Remote"}${schedule.schedule?` · ${schedule.schedule}`:""}`);
        if(["offer","offer-revised"].includes(id)&&schedule.expiresOn)details.push(`Decision deadline: ${new Date(schedule.expiresOn).toLocaleString("en-GB",{timeZone:"Asia/Kolkata",dateStyle:"long",timeStyle:"short"})} IST (separate from the internship completion date)`);
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
            <td style="font-family:Arial,Helvetica,sans-serif;padding:2px 0 10px;">
              <span style="display:block;font-size:11px;line-height:1.4;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;margin-bottom:6px;">Application Reference</span>
              <span style="display:inline-block;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:13px;line-height:1.4;font-weight:600;color:#0f172a;background:#eef2f6;border:1px solid #dce4ee;padding:6px 10px;border-radius:4px;letter-spacing:-0.01em;overflow-wrap:anywhere;word-break:break-all;">${escapeHtml(refId)}</span>
            </td>
          </tr>
          <tr>
            <td style="font-family:Arial,Helvetica,sans-serif;padding:12px 0;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;table-layout:fixed;">
                <tr>
                  <td width="28%" valign="top" style="font-family:Arial,Helvetica,sans-serif;padding:0 12px 10px 0;font-size:13px;line-height:1.5;color:#475569;">Review timeline</td>
                  <td valign="top" style="font-family:Arial,Helvetica,sans-serif;padding:0 0 10px;font-size:13px;line-height:1.5;font-weight:700;color:#2563eb;">Review within 3–5 business days</td>
                </tr>
                <tr>
                  <td valign="top" style="font-family:Arial,Helvetica,sans-serif;padding:10px 12px 0 0;border-top:1px solid #e2e8f0;font-size:13px;line-height:1.5;color:#475569;">Next step</td>
                  <td valign="top" style="font-family:Arial,Helvetica,sans-serif;padding:10px 0 0;border-top:1px solid #e2e8f0;font-size:13px;line-height:1.5;color:#334155;">No portal account or action is required at this stage.</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <p style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;">Duration: ${escapeHtml(options.schedule?.durationLabel||"As described in the program")}. Start date to be confirmed in your offer.</p>
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
    if (["offer", "offer-accepted", "onboarding", "certificate", "offer-revised", "offer-revision-accepted", "offer-revision-declined", "offer-revision-withdrawn"].includes(id)) buttons.push({ label: "Open candidate portal", url: options.portalUrl });
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
    const panelContent = customPanelHtml
      ? customPanelHtml
      : details.length
        ? emailPanel(
            details.map(item => `<p style="font-family:Arial,Helvetica,sans-serif;margin:4px 0;font-size:14px;line-height:1.65;color:#1e293b;">${escapeHtml(item)}</p>`).join(""),
            ["selected", "offer-accepted", "certificate"].includes(id) ? "green" : "neutral"
          )
        : "";

    const content = `<p style="font-family:Arial,Helvetica,sans-serif;margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;white-space:pre-wrap;">${escapeHtml(body)}</p>`
      + panelContent
      + buttons.filter(button => button.url).map(button => emailButton(button.label, button.url)).join("");
    const html = emailShell({ subject, preheader: body.slice(0, 180), eyebrow: "Olentra Careers · Internship program", heading: definition.name, content });
    const text = [body, ...details, ...buttons.filter(button => button.url).map(button => `${button.label}: ${button.url}`), "The Olentra Team"].join("\n\n");
    return { subject, html, text, attachments };
  }
  async function automated(id: AutomatedEmailId, options: Record<string, any>) {
    const rendered = renderAutomated(id, options, await resolveTemplate?.(id));
    return sendEmail(options.to, rendered.subject, rendered.html, rendered.text, rendered.attachments);
  }

  return {
    renderAutomated,
    async sendInterviewScheduled(options: InterviewScheduledEmailOptions): Promise<SendResult> { return automated("interview-scheduled", options); },
    async sendInterviewCancelled(options: InterviewScheduledEmailOptions): Promise<SendResult> { return automated("interview-cancelled", options); },
    async sendInterviewReminder(options: InterviewScheduledEmailOptions): Promise<SendResult> { return automated("interview-reminder", options); },

    /** A plain reminder or digest: a heading, an intro, a short list and one button. */
    async sendNotice({ to, subject, heading, intro, items, ctaLabel, ctaUrl }: { to: string; subject: string; heading: string; intro: string; items: string[]; ctaLabel: string; ctaUrl: string }): Promise<SendResult> {
      const text = `${intro}\n\n${items.map(item => `- ${item}`).join("\n")}\n\n${ctaLabel}: ${ctaUrl}\n\nThe Olentra Team`;
      const content = `
        <p style="font-family:Arial,Helvetica,sans-serif;margin:0;font-size:15px;line-height:1.65;color:#43536e;">${escapeHtml(intro)}</p>
        ${emailPanel(`<ul style="margin:0;padding:0 0 0 19px;font-size:14px;line-height:1.8;color:#43536e;">${items.map(item => `<li style="padding:2px 0;">${escapeHtml(item)}</li>`).join("")}</ul>`, "neutral")}
        ${emailButton(ctaLabel, ctaUrl)}
      `;
      const html = emailShell({ subject, preheader: intro, eyebrow: "Olentra Careers · Internship program", heading, content });
      return sendEmail(to, subject, html, text);
    },

    async sendApplicantStatus(options: ApplicantStatusEmailOptions): Promise<SendResult> {
      if (options.status !== "rejected") return automated(options.status, options);
      const subject = `Update on your Olentra internship application (${options.programName})`;
      const body = `Hi ${options.name},\n\nThank you for taking the time to apply to Olentra Technologies and sharing your background with us. After careful consideration, we are unable to offer you an internship position for this cohort. We received a tremendous number of outstanding applications and had to make difficult decisions. We truly appreciate your interest in Olentra, wish you continued success in your learning and career, and warmly invite you to stay connected with us on LinkedIn and re-apply in future cohorts.`;
      const html = emailShell({ subject, preheader: subject, eyebrow: "Olentra Careers · Internship program", heading: "Application Status Update", content: `<p style="font-family:Arial,Helvetica,sans-serif;margin:0;font-size:15px;white-space:pre-wrap;line-height:1.6;">${escapeHtml(body)}</p>` });
      return sendEmail(options.to, subject, html, body);
    },
    async sendApplicationConfirmation(options: ApplicationEmailOptions): Promise<SendResult> { return automated("application-received", options); },
    async sendMagicLink(options: MagicLinkEmailOptions): Promise<SendResult> { return automated("signin", options); },

    async sendPasswordResetLink({ to, name = "there", resetUrl }: PasswordResetEmailOptions): Promise<SendResult> {
      const subject = "Reset your Olentra Internship Account Password";
      const text = `Hi ${name},\n\nWe received a request to reset the password for your Olentra Internship account.\n\nClick the link below to set a new password:\n\n${resetUrl}\n\nThis secure link is valid for 1 hour and can be used once.\n\nIf you did not request this password reset, you can safely ignore this email; your password will remain unchanged.\n\nBest regards,\nThe Olentra Team`;

      const safeName = escapeHtml(String(name));
      const content = `
        <p style="font-family:Arial,Helvetica,sans-serif;margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">Hi <strong>${safeName}</strong>,</p>
        <p style="font-family:Arial,Helvetica,sans-serif;margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">We received a request to reset the password for your Olentra Internship account. Click the button below to choose a new password:</p>
        ${emailButton("Reset My Password", resetUrl)}
        ${emailPanel("<p style=\"margin:0;font-size:13px;line-height:1.6;color:#475569;\"><strong>Security note:</strong> This single-use link is valid for 1 hour. If you did not request a password reset, you can safely ignore this email; your password will remain unchanged.</p>", "blue")}
      `;
      const html = emailShell({
        subject,
        preheader: "Reset your Olentra Internship account password. This secure link is valid for 1 hour.",
        eyebrow: "Olentra Careers · Password Recovery",
        heading: "Reset your Account Password",
        content,
      });

      return sendEmail(to, subject, html, text);
    },
  };
}
