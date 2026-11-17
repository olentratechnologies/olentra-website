import { emailDefinition, fillEmailTemplate, type AutomatedEmailId, type EmailTemplate } from "../../modules/email-templates/automated-templates";
import { interviewIcs, interviewTimeLabel } from "../../modules/interviews/ics";
import type { SigninEmailTemplateVariant } from "../../modules/email-templates/signin-template-settings";

type SendResult = { ok: boolean; delivered: boolean; id?: string; error?: string };
type ApplicantStatus = "shortlisted" | "selected" | "offer" | "rejected" | "onboarding" | "certificate";

interface ApplicantStatusEmailOptions {
  to: string;
  name: string;
  programName: string;
  status: ApplicantStatus;
  portalUrl: string;
  certificateVerifyUrl?: string;
  linkedinShareUrl?: string;
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
  const emailShell = ({
    subject,
    preheader,
    eyebrow,
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
<body style="margin:0;padding:0;background:#f3f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#14213d;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f3f6fb" style="background:#f3f6fb;padding:36px 14px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:620px;background:#ffffff;border:1px solid #e4eaf3;border-radius:18px;overflow:hidden;">
        <tr><td style="height:5px;background:#2563eb;font-size:1px;line-height:1px;">&nbsp;</td></tr>
        <tr><td style="padding:25px 34px 22px;">
          <img src="https://www.olentratechnologies.com/images/branding/Logo/Olentra-Logo-Without-Background.png" width="158" alt="Olentra Technologies" style="display:block;width:158px;max-width:100%;height:auto;border:0;">
        </td></tr>
        <tr><td style="padding:0 34px;"><div style="height:1px;background:#e8edf5;font-size:1px;line-height:1px;">&nbsp;</div></td></tr>
        <tr><td style="padding:30px 34px 12px;">
          <p style="margin:0 0 11px;font-size:11px;line-height:1.4;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:#2563eb;">${escapeHtml(eyebrow)}</p>
          <h1 style="margin:0;font-size:28px;line-height:1.22;font-weight:700;letter-spacing:-.025em;color:#14213d;">${escapeHtml(heading)}</h1>
        </td></tr>
        <tr><td style="padding:8px 34px 32px;">${content}</td></tr>
        <tr><td style="padding:0 34px;"><div style="height:1px;background:#e8edf5;font-size:1px;line-height:1px;">&nbsp;</div></td></tr>
        <tr><td style="padding:20px 34px 25px;">
          <p style="margin:0;font-size:12px;line-height:1.65;color:#718096;">Olentra Technologies · Building intelligent systems<br>Automated message about your internship application or program. Please do not reply to this email.</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:11px;line-height:1.5;color:#8a96a8;">© Olentra Technologies Pvt. Ltd.</p>
    </td></tr>
  </table>
</body>
</html>`;
  const emailButton = (label: string, href: string, background = "#2563eb") =>
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 8px;"><tr><td bgcolor="${background}" style="border-radius:8px;background:${background};"><a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 22px;border:1px solid ${background};border-radius:8px;color:#ffffff;text-decoration:none;font-size:14px;line-height:1.2;font-weight:700;">${escapeHtml(label)}</a></td></tr></table>`;
  const emailPanel = (content: string, tone: "blue" | "neutral" | "green" = "neutral") => {
    const palette = {
      blue: { background: "#f2f7ff", border: "#dce9ff", accent: "#2563eb" },
      neutral: { background: "#f7f9fc", border: "#e7edf5", accent: "#52627a" },
      green: { background: "#f0faf5", border: "#d4f0e0", accent: "#16804a" },
    }[tone];
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${palette.background}" style="margin:20px 0;background:${palette.background};border:1px solid ${palette.border};border-radius:12px;"><tr><td style="padding:18px 20px;border-left:3px solid ${palette.accent};">${content}</td></tr></table>`;
  };

  type Attachment = { filename: string; content: string; contentType: string };
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
    const name = String(options.name || "there");
    const time = options.scheduledAt ? interviewTimeLabel(options.scheduledAt) : "";
    const { subject, body } = fillEmailTemplate(template, { firstName: name.split(/\s+/)[0] || "there", fullName: name, program: String(options.programName || ""), referenceId: String(options.applicationId || "pending"), interviewTime: time });
    const details: string[] = [], buttons: { label: string; url: string }[] = [];
    const attachments: Attachment[] = [];
    if (id === "application-received") details.push(`Application reference: ${options.applicationId || "pending"}`, "Review estimate: 3–5 business days. No portal account or action is required at this stage.");
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
      if (options.linkedinShareUrl) buttons.push({ label: "Share on LinkedIn", url: options.linkedinShareUrl });
      details.push("Single-use link · Expires in 24 hours. If it expires, request a new sign-in link.");
    }
    if (["offer", "onboarding", "certificate"].includes(id)) buttons.push({ label: "Open candidate portal", url: options.portalUrl });
    if (id === "certificate") {
      if (options.certificateVerifyUrl) buttons.push({ label: "Verify your certificate", url: options.certificateVerifyUrl });
      if (options.linkedinShareUrl) buttons.push({ label: "Share your certificate on LinkedIn", url: options.linkedinShareUrl });
    }
    if (id === "signin") {
      buttons.push({ label: "Open candidate portal", url: options.magicLinkUrl });
      details.push("Single-use link · Expires in 24 hours", "This single-use link expires in 24 hours. If you didn’t request this link, you can safely ignore this email.");
    }
    const content = `<p style="margin:0;font-size:15px;line-height:1.75;color:#43536e;white-space:pre-wrap;">${escapeHtml(body)}</p>`
      + (details.length ? emailPanel(details.map(item => `<p style="margin:5px 0;font-size:14px;line-height:1.65;">${escapeHtml(item)}</p>`).join("")) : "")
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
        <p style="margin:0;font-size:15px;line-height:1.65;color:#43536e;">${escapeHtml(intro)}</p>
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
      const html = emailShell({ subject, preheader: subject, eyebrow: "Olentra Careers · Internship program", heading: "Application Status Update", content: `<p style="white-space:pre-wrap;line-height:1.75;">${escapeHtml(body)}</p>` });
      return sendEmail(options.to, subject, html, body);
    },
    async sendApplicationConfirmation(options: ApplicationEmailOptions): Promise<SendResult> { return automated("application-received", options); },
    async sendMagicLink(options: MagicLinkEmailOptions): Promise<SendResult> { return automated("signin", options); },

    async sendPasswordResetLink({ to, name = "there", resetUrl }: PasswordResetEmailOptions): Promise<SendResult> {
      const subject = "Reset your Olentra Internship Account Password";
      const text = `Hi ${name},\n\nWe received a request to reset the password for your Olentra Internship account.\n\nClick the link below to set a new password:\n\n${resetUrl}\n\nThis secure link is valid for 1 hour and can be used once.\n\nIf you did not request this password reset, you can safely ignore this email; your password will remain unchanged.\n\nBest regards,\nThe Olentra Team`;

      const safe = { name: escapeHtml(String(name)), resetUrl: escapeHtml(String(resetUrl)), subject: escapeHtml(String(subject)) };
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safe.subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0c0f17; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0c0f17; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #131926; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <tr>
            <td style="padding: 32px 32px 20px; text-align: left; border-bottom: 1px solid #1e293b; background: linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(15,23,42,0) 100%);">
              <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #60a5fa; display: block; margin-bottom: 8px;">Olentra Careers · Password Recovery</span>
              <h1 style="margin: 0; font-size: 22px; font-weight: 600; color: #ffffff;">Reset your Account Password</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #cbd5e1;">Hi <strong>${safe.name}</strong>,</p>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #cbd5e1;">We received a request to reset the password for your Olentra Internship account. Click the button below to choose a new password:</p>
              
              <div style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; margin: 0 0 28px; text-align: center;">
                <a href="${safe.resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; text-decoration: none; padding: 13px 28px; font-size: 14px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 12px rgba(37,99,235,0.3);">Reset My Password &rarr;</a>
                <p style="margin: 16px 0 0; font-size: 11px; color: #64748b;">This secure link is valid for 1 hour.</p>
              </div>

              <p style="margin: 0 0 8px; font-size: 13px; color: #94a3b8;">Or copy and paste this link into your browser:</p>
              <p style="margin: 0 0 24px; font-size: 12px; word-break: break-all; color: #60a5fa;">${safe.resetUrl}</p>

              <hr style="border: none; border-top: 1px solid #1e293b; margin: 24px 0;" />
              <p style="margin: 0; font-size: 12px; color: #64748b;">If you didn't request a password reset, you can safely ignore this email; your password will remain unchanged.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      return sendEmail(to, subject, html, text);
    },
  };
}
