import { internshipEnv } from "../../config/env";
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

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SENDER_EMAIL = internshipEnv("INTERNSHIP_SENDER_EMAIL", "INTERN_SENDER_EMAIL") || "Olentra Careers <website@olentratechnologies.com>";

export function createInternshipMailer(apiKey = RESEND_API_KEY, sender = SENDER_EMAIL) {
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
    if (!apiKey) {
      if (process.env.NODE_ENV === "production") return { ok: false, delivered: false, error: "Email delivery is not configured." };
      console.info(`[mailer:offline] Email to ${to} (Subject: ${subject}):\n${text}`);
      return { ok: true, delivered: false };
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10_000),
        body: JSON.stringify({
          from: sender,
          to: [to],
          subject,
          html,
          text,
          ...(attachments.length ? { attachments: attachments.map(file => ({ filename: file.filename, content: Buffer.from(file.content).toString("base64"), content_type: file.contentType })) } : {}),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.warn(`[mailer] Resend API error (${response.status}):`, errorText);
        return { ok: false, delivered: false, error: errorText };
      }

      const data = await response.json() as { id?: string };
      return { ok: true, delivered: true, id: data.id };
    } catch (error: any) {
      console.warn(`[mailer] Failed to send email to ${to}:`, error?.message || error);
      return { ok: false, delivered: false, error: error?.message || "Email delivery failed" };
    }
  }

  return {
    async sendInterviewScheduled({
      to,
      name,
      programName,
      scheduledAt,
      meetingUrl,
      portalUrl,
      interviewId,
      sequence,
    }: InterviewScheduledEmailOptions): Promise<SendResult> {
      const subject = `Interview scheduled for your ${programName} application`;
      const safeName = escapeHtml(name);
      const safeProgram = escapeHtml(programName);
      const safePortalUrl = escapeHtml(portalUrl);
      const time = interviewTimeLabel(scheduledAt);
      const text = `Hi ${name},\n\nYour interview for ${programName} is scheduled for ${time}.\n\nMeeting link: ${meetingUrl}\n\nOpen your candidate portal: ${portalUrl}\n\nBest regards,\nThe Olentra Team`;
      const details = emailPanel(`
        <p style="margin:0 0 5px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#52627a;">Interview details</p>
        <p style="margin:0;font-size:16px;line-height:1.5;font-weight:700;color:#14213d;">${escapeHtml(time)}</p>
        <p style="margin:7px 0 0;font-size:13px;line-height:1.5;color:#52627a;">${safeProgram} internship interview</p>
      `, "blue");
      const content = `
        <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#43536e;">Hi <strong style="color:#14213d;">${safeName}</strong>, your interview has been scheduled. We look forward to learning more about you.</p>
        ${details}
        ${emailButton("Join your interview", meetingUrl)}
        <p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:#66758b;">Need the rest of your application details? <a href="${safePortalUrl}" style="color:#2563eb;font-weight:600;text-decoration:underline;">Open your candidate portal</a>.</p>
        <p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:#718096;">A calendar invitation is attached. Add it to your calendar so you have the meeting time and link handy.</p>
      `;
      const html = emailShell({ subject, preheader: `Your ${programName} interview is scheduled for ${time}.`, eyebrow: "Internship admissions · Interview", heading: "Your interview is scheduled", content });
      const invite = interviewId ? [{ filename: "interview.ics", contentType: "text/calendar; charset=utf-8; method=REQUEST", content: interviewIcs({ uid: interviewId, sequence: sequence ?? 0, startsAt: scheduledAt, summary: `Olentra interview · ${programName}`, description: `Your Olentra internship interview for ${programName}. Join: ${meetingUrl}`, url: meetingUrl, method: "REQUEST" }) }] : [];
      return sendEmail(to, subject, html, text, invite);
    },

    async sendInterviewCancelled({ to, name, programName, scheduledAt, meetingUrl, portalUrl, interviewId, sequence, cancelReason }: InterviewScheduledEmailOptions): Promise<SendResult> {
      const subject = `Your ${programName} interview was cancelled`;
      const time = interviewTimeLabel(scheduledAt);
      const reason = cancelReason ? `\n\nReason: ${cancelReason}` : "";
      const text = `Hi ${name},\n\nYour interview for ${programName} on ${time} has been cancelled.${reason}\n\nThe team will be in touch if it's rescheduled. You can check your candidate portal any time: ${portalUrl}\n\nBest regards,\nThe Olentra Team`;
      const reasonPanel = cancelReason
        ? emailPanel(`<p style="margin:0 0 5px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#52627a;">Note from the team</p><p style="margin:0;font-size:14px;line-height:1.65;color:#43536e;">${escapeHtml(cancelReason)}</p>`)
        : "";
      const content = `
        <p style="margin:0;font-size:15px;line-height:1.65;color:#43536e;">Hi <strong style="color:#14213d;">${escapeHtml(name)}</strong>, your interview for <strong style="color:#14213d;">${escapeHtml(programName)}</strong> scheduled for <strong style="color:#14213d;">${escapeHtml(time)}</strong> has been cancelled.</p>
        ${reasonPanel}
        <p style="margin:20px 0 0;font-size:14px;line-height:1.65;color:#52627a;">The team will be in touch if it is rescheduled. You can check your application details at any time in your candidate portal.</p>
        ${emailButton("Open candidate portal", portalUrl, "#344563")}
      `;
      const html = emailShell({ subject, preheader: `Your ${programName} interview on ${time} has been cancelled.`, eyebrow: "Internship admissions · Interview update", heading: "Interview update", content });
      const cancellation = interviewId ? [{ filename: "interview.ics", contentType: "text/calendar; charset=utf-8; method=CANCEL", content: interviewIcs({ uid: interviewId, sequence: sequence ?? 1, startsAt: scheduledAt, summary: `Olentra interview · ${programName}`, description: "This interview was cancelled.", url: meetingUrl, method: "CANCEL" }) }] : [];
      return sendEmail(to, subject, html, text, cancellation);
    },

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

    async sendApplicantStatus({
      to,
      name,
      programName,
      status,
      portalUrl,
      certificateVerifyUrl,
      linkedinShareUrl,
    }: ApplicantStatusEmailOptions): Promise<SendResult> {
      const messages: Record<ApplicantStatus, { subject: string; heading: string; body: string }> = {
        shortlisted: {
          subject: "You’ve been shortlisted at Olentra",
          heading: "You’ve been shortlisted at Olentra",
          body: `Your application to ${programName} has successfully moved to our shortlist. Our team will review the next round of details and will keep you updated in your candidate portal.`,
        },
        selected: {
          subject: `Congratulations! Welcome to the Olentra Internship Program (${programName}) 🎉`,
          heading: "Congratulations! You’re In!",
          body: `We are thrilled to let you know that you have been selected for the ${programName} internship at Olentra Technologies! We were thoroughly impressed by your background, project experience, and technical potential.`,
        },
        offer: {
          subject: `Your Olentra internship offer: ${programName}`,
          heading: "Your internship offer is ready",
          body: `The Olentra team has sent you an offer for ${programName}. Review the details and respond in your candidate portal.`,
        },
        rejected: {
          subject: `Update on your Olentra internship application (${programName})`,
          heading: "Application Status Update",
          body: `Thank you for taking the time to apply to Olentra Technologies and sharing your background with us. After careful consideration, we are unable to offer you an internship position for this cohort. We received a tremendous number of outstanding applications and had to make difficult decisions. We truly appreciate your interest in Olentra, wish you continued success in your learning and career, and warmly invite you to stay connected with us on LinkedIn and re-apply in future cohorts.`,
        },
        onboarding: {
          subject: `Your ${programName} onboarding is approved`,
          heading: "Your onboarding is approved",
          body: `Your onboarding for ${programName} has been approved. Open your candidate portal to get started.`,
        },
        certificate: {
          subject: `Your Olentra internship certificate is ready`,
          heading: "Your certificate is ready",
          body: `Your ${programName} internship certificate has been issued. Verify it or share it on LinkedIn using the links below.`,
        },
      };
      const message = messages[status];
      const safeName = escapeHtml(name);
      const safeProgram = escapeHtml(programName);
      const safePortalUrl = escapeHtml(portalUrl);
      const certificateLink = certificateVerifyUrl
        ? `<p style="margin:18px 0 0;font-size:14px;line-height:1.6;"><a href="${escapeHtml(certificateVerifyUrl)}" style="color:#2563eb;font-weight:700;text-decoration:underline;">Verify your certificate</a></p>`
        : "";
      const linkedinLink = linkedinShareUrl && status === "certificate"
        ? `<p style="margin:10px 0 0;font-size:14px;line-height:1.6;"><a href="${escapeHtml(linkedinShareUrl)}" style="color:#0a66c2;font-weight:700;text-decoration:underline;">Share your certificate on LinkedIn</a></p>`
        : "";
      const linkedinAnnouncement = linkedinShareUrl && status === "selected"
        ? emailPanel(`
            <p style="margin:0 0 5px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#0a66c2;">Share your achievement</p>
            <p style="margin:0 0 8px;font-size:16px;line-height:1.4;font-weight:700;color:#14213d;">Tell your network the good news</p>
            <p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#52627a;">Celebrate this milestone with your professional community.</p>
            ${emailButton("Share on LinkedIn", linkedinShareUrl, "#0a66c2")}
          `, "blue")
        : "";
      const textLinks = [
        certificateVerifyUrl ? `Verify your certificate: ${certificateVerifyUrl}` : "",
        linkedinShareUrl ? `Share on LinkedIn: ${linkedinShareUrl}` : "",
      ].filter(Boolean).join("\n");
      const ctaButton = status !== "rejected"
        ? emailButton(status === "selected" ? "Activate your internship portal" : "Open candidate portal", portalUrl)
        : "";
      const text = `Hi ${name},\n\n${message.body}${status !== "rejected" ? `\n\nOpen your portal: ${portalUrl}` : ""}${textLinks ? `\n\n${textLinks}` : ""}\n\nBest regards,\nThe Olentra Team`;
      const statusBadge = status === "selected" || status === "certificate"
        ? emailPanel(`<p style="margin:0;font-size:13px;line-height:1.55;font-weight:600;color:${status === "selected" ? "#1d4ed8" : "#16804a"};">${status === "selected" ? "Selection confirmed" : "Certificate issued"} <span style="font-weight:400;color:#52627a;">· ${safeProgram}</span></p>`, status === "selected" ? "blue" : "green")
        : "";
      const content = `
        <p style="margin:0;font-size:15px;line-height:1.7;color:#43536e;">Hi <strong style="color:#14213d;">${safeName}</strong>,</p>
        <p style="margin:14px 0 0;font-size:15px;line-height:1.7;color:#43536e;">${escapeHtml(message.body)}</p>
        ${statusBadge}
        ${linkedinAnnouncement}
        ${certificateLink}${linkedinLink}
        ${ctaButton}
        ${status !== "rejected" ? `<p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:#8a96a8;">Program: ${safeProgram}</p>` : ""}
      `;
      const html = emailShell({
        subject: message.subject,
        preheader: message.body,
        eyebrow: status === "certificate" ? "Internship program · Achievement" : "Olentra Careers · Internship program",
        heading: message.heading,
        content,
      });
      return sendEmail(to, message.subject, html, text);
    },

    async sendApplicationConfirmation({ to, name, programName, applicationId, magicLinkUrl }: ApplicationEmailOptions): Promise<SendResult> {
      const refPart = applicationId ? ` (Ref: ${applicationId})` : "";
      const subject = `Application Received: ${programName}${refPart}`;
      const safe = {
        name: escapeHtml(String(name)),
        programName: escapeHtml(String(programName)),
        applicationId: escapeHtml(String(applicationId || "Received")),
      };
      const text = `Hi ${name},\n\nThank you for applying to the Olentra Internship Program (${programName}).\n\nWe have received your application and resume. Your unique Reference ID is: ${applicationId || "Pending"}\n\nOur admissions and engineering team reviews applications carefully on a rolling basis. You can expect to hear back with an update within 3 to 5 business days.\n\nNo portal account or password has been created yet. If your profile is selected, you will receive an official congratulations email containing secure access to your internship portal.${magicLinkUrl ? `\n\nUse this secure sign-in link if you need to continue: ${magicLinkUrl}` : ""}\n\nBest regards,\nThe Olentra Admissions Team\nOlentra Technologies Pvt. Ltd.`;
      const cta = magicLinkUrl
        ? emailButton("Open your secure portal link", magicLinkUrl)
        : "";
      const reference = emailPanel(`
        <p style="margin:0 0 7px;font-size:11px;font-weight:700;letter-spacing:.11em;text-transform:uppercase;color:#52627a;">Application reference</p>
        <p style="margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:21px;line-height:1.4;font-weight:700;letter-spacing:.04em;color:#14213d;">${safe.applicationId}</p>
        <p style="margin:7px 0 0;font-size:12px;line-height:1.5;color:#718096;">Keep this ID for future communication about your application.</p>
      `, "blue");
      const timeline = emailPanel(`
        <p style="margin:0 0 5px;font-size:13px;font-weight:700;color:#14213d;">What happens next</p>
        <p style="margin:0;font-size:13px;line-height:1.65;color:#52627a;">Our admissions team reviews applications on a rolling basis. You can expect to hear from us within <strong>3 to 5 business days</strong>. No portal account or action is required at this stage.</p>
      `, "neutral");
      const content = `
        <p style="margin:0;font-size:15px;line-height:1.7;color:#43536e;">Hi <strong style="color:#14213d;">${safe.name}</strong>, thank you for applying to the <strong style="color:#14213d;">${safe.programName}</strong> track at Olentra Technologies. We’ve safely received your submission.</p>
        ${reference}
        ${timeline}
        ${cta}
      `;
      const html = emailShell({
        subject,
        preheader: `We received your ${programName} application. Your reference ID is ${applicationId || "pending"}.`,
        eyebrow: "Olentra Careers · Internship admissions",
        heading: "Application received",
        content,
      });

      return sendEmail(to, subject, html, text);
    },

    async sendMagicLink({ to, name = "there", magicLinkUrl, templateVariant = "professional" }: MagicLinkEmailOptions): Promise<SendResult> {
      const themes = {
        professional: {
          subject: "Your Olentra Candidate Portal Sign-In Link",
          background: "#f2f5fb",
          accent: "#1877f2",
          heading: "Your next step is one click away.",
          intro: "Use your secure link to open your Olentra candidate portal and follow your application.",
          panel: "#f5f8ff",
          panelBorder: "#e1e9f8",
          cardBorder: "#dfe6f0",
          radius: "14px",
          padding: "36px 16px",
        },
        warm: {
          subject: "Your requested Olentra sign-in link",
          background: "#fbf7f2",
          accent: "#98633b",
          heading: "Welcome back.",
          intro: "We’re glad you’re continuing your journey with Olentra. Use the secure link below to return to your candidate portal.",
          panel: "#fcf8f3",
          panelBorder: "#eee2d5",
          cardBorder: "#e9ded2",
          radius: "18px",
          padding: "40px 18px",
        },
        minimal: {
          subject: "Sign-in link for your Olentra account",
          background: "#ffffff",
          accent: "#145ddd",
          heading: "Sign in to your portal",
          intro: "Your requested secure access link is ready.",
          panel: "#ffffff",
          panelBorder: "#e8edf5",
          cardBorder: "#e8edf5",
          radius: "4px",
          padding: "28px 16px",
        },
      } satisfies Record<SigninEmailTemplateVariant, {
        subject: string;
        background: string;
        accent: string;
        heading: string;
        intro: string;
        panel: string;
        panelBorder: string;
        cardBorder: string;
        radius: string;
        padding: string;
      }>;
      const theme = themes[templateVariant];
      const subject = theme.subject;
      const text = `Hi ${name},\n\n${theme.intro}\n\n${magicLinkUrl}\n\nThis single-use link expires in 24 hours.\n\nIf you did not request this link, you can safely ignore this email.\n\nBest regards,\nThe Olentra Team`;

      const safe = {
        name: escapeHtml(String(name)),
        magicLinkUrl: escapeHtml(String(magicLinkUrl)),
        subject: escapeHtml(String(subject)),
        heading: escapeHtml(theme.heading),
        intro: escapeHtml(theme.intro),
        background: theme.background,
        accent: theme.accent,
        panel: theme.panel,
        panelBorder: theme.panelBorder,
        cardBorder: theme.cardBorder,
        radius: theme.radius,
        padding: theme.padding,
      };
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safe.subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${safe.background}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #17243d;">
  <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">Your secure sign-in link for the Olentra Candidate Portal is ready.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${safe.background}" style="background-color: ${safe.background}; padding: ${safe.padding};">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 600px; background-color: #ffffff; border: 1px solid ${safe.cardBorder}; border-radius: ${safe.radius}; overflow: hidden;">
          <tr>
            <td style="padding: 26px 32px 22px; text-align: left; background-color: #ffffff;">
              <img src="https://www.olentratechnologies.com/images/branding/Logo/Olentra-Logo-Without-Background.png" width="190" alt="Olentra Technologies" style="display: block; width: 190px; max-width: 100%; height: auto; border: 0;">
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px;"><div style="height: 1px; background-color: #e8edf5; font-size: 1px; line-height: 1px;">&nbsp;</div></td>
          </tr>
          <tr>
            <td style="padding: 30px 32px 32px;">
              <p style="margin: 0 0 10px; font-size: 11px; line-height: 1.4; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: ${safe.accent};">Candidate portal · Secure sign-in</p>
              <h1 style="margin: 0; font-size: 26px; line-height: 1.25; font-weight: 700; letter-spacing: -0.02em; color: #17243d;">${safe.heading}</h1>
              <p style="margin: 22px 0 0; font-size: 15px; line-height: 1.65; color: #43536e;">Hi <strong style="color: #17243d;">${safe.name}</strong>,<br><br>${safe.intro}</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${safe.panel}" style="margin-top: 24px; background-color: ${safe.panel}; border: 1px solid ${safe.panelBorder}; border-radius: 12px;">
                <tr>
                  <td align="center" style="padding: 22px 16px;">
                    <a href="${safe.magicLinkUrl}" style="display: inline-block; padding: 14px 24px; border-radius: 8px; background-color: ${safe.accent}; color: #ffffff; text-decoration: none; font-size: 14px; line-height: 1.3; font-weight: 700;">Open candidate portal &rarr;</a>
                    <p style="margin: 13px 0 0; font-size: 12px; line-height: 1.5; color: #65748c;">Single-use link · Expires in 24 hours</p>
                  </td>
                </tr>
              </table>
              <p style="margin: 22px 0 0; font-size: 12px; line-height: 1.6; color: #64748b;">Button not working? <a href="${safe.magicLinkUrl}" style="color: ${safe.accent}; font-weight: 600; text-decoration: underline;">Use this secure sign-in link</a>.</p>
              <p style="margin: 22px 0 0; padding-top: 18px; border-top: 1px solid #e8edf5; font-size: 12px; line-height: 1.65; color: #718096;">If you didn’t request this link, you can safely ignore this email.<br><br>Olentra Technologies · Building intelligent systems</p>
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
