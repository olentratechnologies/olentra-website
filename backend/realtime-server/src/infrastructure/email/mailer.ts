import { internshipEnv } from "../../config/env";
import { interviewIcs, interviewTimeLabel } from "../../modules/interviews/ics";
import type { SigninEmailTemplateVariant } from "../../modules/email-templates/signin-template-settings";

type SendResult = { ok: boolean; delivered: boolean; id?: string; error?: string };
type ApplicantStatus = "shortlisted" | "offer" | "rejected" | "onboarding" | "certificate";

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
  magicLinkUrl: string;
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
      const safeMeetingUrl = escapeHtml(meetingUrl);
      const safePortalUrl = escapeHtml(portalUrl);
      const time = interviewTimeLabel(scheduledAt);
      const text = `Hi ${name},\n\nYour interview for ${programName} is scheduled for ${time}.\n\nMeeting link: ${meetingUrl}\n\nOpen your candidate portal: ${portalUrl}\n\nBest regards,\nThe Olentra Team`;
      const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:32px 16px;background:#0c0f17;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#f1f5f9">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#131926;border:1px solid #1e293b;border-radius:16px">
      <tr><td style="padding:28px 32px;border-bottom:1px solid #1e293b"><span style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#60a5fa">Olentra Careers · Internship Portal</span><h1 style="margin:12px 0 0;font-size:22px;color:#fff">Your interview is scheduled</h1></td></tr>
      <tr><td style="padding:28px 32px"><p>Hi <strong>${safeName}</strong>,</p><p>Your interview for ${safeProgram} is scheduled for <strong>${time}</strong>.</p><p><a href="${safeMeetingUrl}">Join your interview</a></p><p><a href="${safePortalUrl}">Open your candidate portal</a></p><p style="font-size:12px;color:#64748b">Olentra Technologies Pvt. Ltd. · This is an automated notification.</p></td></tr>
    </table>
  </td></tr></table>
</body></html>`;
      const invite = interviewId ? [{ filename: "interview.ics", contentType: "text/calendar; charset=utf-8; method=REQUEST", content: interviewIcs({ uid: interviewId, sequence: sequence ?? 0, startsAt: scheduledAt, summary: `Olentra interview · ${programName}`, description: `Your Olentra internship interview for ${programName}. Join: ${meetingUrl}`, url: meetingUrl, method: "REQUEST" }) }] : [];
      return sendEmail(to, subject, html, text, invite);
    },

    async sendInterviewCancelled({ to, name, programName, scheduledAt, meetingUrl, portalUrl, interviewId, sequence, cancelReason }: InterviewScheduledEmailOptions): Promise<SendResult> {
      const subject = `Your ${programName} interview was cancelled`;
      const time = interviewTimeLabel(scheduledAt);
      const reason = cancelReason ? `\n\nReason: ${cancelReason}` : "";
      const text = `Hi ${name},\n\nYour interview for ${programName} on ${time} has been cancelled.${reason}\n\nThe team will be in touch if it's rescheduled. You can check your candidate portal any time: ${portalUrl}\n\nBest regards,\nThe Olentra Team`;
      const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:32px 16px;background:#0c0f17;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#f1f5f9">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#131926;border:1px solid #1e293b;border-radius:16px">
      <tr><td style="padding:28px 32px;border-bottom:1px solid #1e293b"><span style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#60a5fa">Olentra Careers · Internship Portal</span><h1 style="margin:12px 0 0;font-size:22px;color:#fff">Interview cancelled</h1></td></tr>
      <tr><td style="padding:28px 32px"><p>Hi <strong>${escapeHtml(name)}</strong>,</p><p>Your interview for ${escapeHtml(programName)} on <strong>${escapeHtml(time)}</strong> has been cancelled.</p>${cancelReason ? `<p>Reason: ${escapeHtml(cancelReason)}</p>` : ""}<p>The team will be in touch if it's rescheduled.</p><p><a href="${escapeHtml(portalUrl)}">Open your candidate portal</a></p></td></tr>
    </table>
  </td></tr></table>
</body></html>`;
      const cancellation = interviewId ? [{ filename: "interview.ics", contentType: "text/calendar; charset=utf-8; method=CANCEL", content: interviewIcs({ uid: interviewId, sequence: sequence ?? 1, startsAt: scheduledAt, summary: `Olentra interview · ${programName}`, description: "This interview was cancelled.", url: meetingUrl, method: "CANCEL" }) }] : [];
      return sendEmail(to, subject, html, text, cancellation);
    },

    /** A plain reminder or digest: a heading, an intro, a short list and one button. */
    async sendNotice({ to, subject, heading, intro, items, ctaLabel, ctaUrl }: { to: string; subject: string; heading: string; intro: string; items: string[]; ctaLabel: string; ctaUrl: string }): Promise<SendResult> {
      const text = `${intro}\n\n${items.map(item => `- ${item}`).join("\n")}\n\n${ctaLabel}: ${ctaUrl}\n\nThe Olentra Team`;
      const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:32px 16px;background:#0c0f17;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#f1f5f9">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#131926;border:1px solid #1e293b;border-radius:16px">
      <tr><td style="padding:28px 32px;border-bottom:1px solid #1e293b"><span style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#60a5fa">Olentra Careers · Internship Program</span><h1 style="margin:12px 0 0;font-size:22px;color:#fff">${escapeHtml(heading)}</h1></td></tr>
      <tr><td style="padding:28px 32px;color:#cbd5e1;font-size:15px;line-height:1.6"><p>${escapeHtml(intro)}</p><ul style="padding-left:20px">${items.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul><p style="margin-top:24px"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">${escapeHtml(ctaLabel)}</a></p></td></tr>
    </table>
  </td></tr></table>
</body></html>`;
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
          heading: "You’ve been shortlisted",
          body: `Your application to ${programName} has moved to the shortlist. The team will share the next steps through your candidate portal.`,
        },
        offer: {
          subject: `Your Olentra internship offer: ${programName}`,
          heading: "Your internship offer is ready",
          body: `The Olentra team has sent you an offer for ${programName}. Review the details and respond in your candidate portal.`,
        },
        rejected: {
          subject: "An update on your Olentra internship application",
          heading: "An update on your application",
          body: `The team has completed its review of your ${programName} application. Sign in to your candidate portal to see the latest update.`,
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
        ? `<p><a href="${escapeHtml(certificateVerifyUrl)}">Verify your certificate</a></p>`
        : "";
      const linkedinLink = linkedinShareUrl
        ? `<p><a href="${escapeHtml(linkedinShareUrl)}">Share your certificate on LinkedIn</a></p>`
        : "";
      const textLinks = [
        certificateVerifyUrl ? `Verify your certificate: ${certificateVerifyUrl}` : "",
        linkedinShareUrl ? `Share on LinkedIn: ${linkedinShareUrl}` : "",
      ].filter(Boolean).join("\n");
      const text = `Hi ${name},\n\n${message.body}\n\nOpen your candidate portal: ${portalUrl}${textLinks ? `\n\n${textLinks}` : ""}\n\nBest regards,\nThe Olentra Team`;
      const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(message.subject)}</title></head>
<body style="margin:0;padding:32px 16px;background:#0c0f17;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#f1f5f9">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#131926;border:1px solid #1e293b;border-radius:16px">
      <tr><td style="padding:28px 32px;border-bottom:1px solid #1e293b"><span style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#60a5fa">Olentra Careers · Internship Portal</span><h1 style="margin:12px 0 0;font-size:22px;color:#fff">${message.heading}</h1></td></tr>
      <tr><td style="padding:28px 32px"><p>Hi <strong>${safeName}</strong>,</p><p>${escapeHtml(message.body)}</p>${certificateLink}${linkedinLink}<p style="margin-top:24px"><a href="${safePortalUrl}" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#2563eb;color:#fff;text-decoration:none">Open candidate portal</a></p><p style="font-size:12px;color:#94a3b8">Program: ${safeProgram}</p><p style="font-size:12px;color:#64748b">Olentra Technologies Pvt. Ltd. · This is an automated notification.</p></td></tr>
    </table>
  </td></tr></table>
</body></html>`;
      return sendEmail(to, message.subject, html, text);
    },

    async sendApplicationConfirmation({ to, name, programName, magicLinkUrl }: ApplicationEmailOptions): Promise<SendResult> {
      const subject = `Your Olentra Internship Application: ${programName}`;
      const text = `Hi ${name},\n\nThank you for applying to the Olentra Internship Program (${programName}).\n\nWe have received your application and resume. You can access your candidate portal to track your progress and follow up with the team using the 1-click link below:\n\n${magicLinkUrl}\n\nThis link is unique to you and expires in 24 hours.\n\nBest regards,\nThe Olentra Team`;

      const safe = { name: escapeHtml(String(name)), programName: escapeHtml(String(programName)), magicLinkUrl: escapeHtml(String(magicLinkUrl)), subject: escapeHtml(String(subject)) };
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
          <!-- Header Banner -->
          <tr>
            <td style="padding: 32px 32px 20px; text-align: left; border-bottom: 1px solid #1e293b; background: linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(15,23,42,0) 100%);">
              <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #60a5fa; display: block; margin-bottom: 8px;">Olentra Careers · Internship Portal</span>
              <h1 style="margin: 0; font-size: 22px; font-weight: 600; color: #ffffff;">Application Received</h1>
            </td>
          </tr>
          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #cbd5e1;">Hi <strong>${safe.name}</strong>,</p>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #cbd5e1;">Thank you for applying to the <strong>${safe.programName}</strong> track at Olentra Technologies. Our engineering and recruiting team has received your application and resume.</p>
              
              <div style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; margin: 0 0 28px; text-align: center;">
                <p style="margin: 0 0 16px; font-size: 13px; color: #94a3b8;">Use your personalized 1-click access link to open your candidate portal:</p>
                <a href="${safe.magicLinkUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; text-decoration: none; padding: 13px 28px; font-size: 14px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 12px rgba(37,99,235,0.3);">Access Candidate Portal &rarr;</a>
                <p style="margin: 16px 0 0; font-size: 11px; color: #64748b;">This secure link is valid for 24 hours. You can also set a password inside your portal.</p>
              </div>

              <p style="margin: 0 0 8px; font-size: 13px; color: #94a3b8;">If the button above does not work, copy and paste this link into your browser:</p>
              <p style="margin: 0 0 24px; font-size: 12px; word-break: break-all; color: #60a5fa;">${safe.magicLinkUrl}</p>

              <hr style="border: none; border-top: 1px solid #1e293b; margin: 24px 0;" />
              <p style="margin: 0; font-size: 12px; color: #64748b;">Olentra Technologies Pvt. Ltd. &middot; Building intelligent systems &middot; This is an automated notification.</p>
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
