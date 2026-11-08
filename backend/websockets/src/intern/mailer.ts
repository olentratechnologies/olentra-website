type SendResult = { ok: boolean; delivered: boolean; id?: string; error?: string };

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
}

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SENDER_EMAIL = process.env.INTERN_SENDER_EMAIL || "Olentra Careers <website@olentratechnologies.com>";

export function createInternshipMailer(apiKey = RESEND_API_KEY, sender = SENDER_EMAIL) {
  async function sendEmail(to: string, subject: string, html: string, text: string): Promise<SendResult> {
    if (!apiKey) {
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
    async sendApplicationConfirmation({ to, name, programName, magicLinkUrl }: ApplicationEmailOptions): Promise<SendResult> {
      const subject = `Your Olentra Internship Application: ${programName}`;
      const text = `Hi ${name},\n\nThank you for applying to the Olentra Internship Program (${programName}).\n\nWe have received your application and resume. You can access your candidate portal to track your progress and follow up with the team using the 1-click link below:\n\n${magicLinkUrl}\n\nThis link is unique to you and expires in 24 hours.\n\nBest regards,\nThe Olentra Team`;

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
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
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #cbd5e1;">Hi <strong>${name}</strong>,</p>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #cbd5e1;">Thank you for applying to the <strong>${programName}</strong> track at Olentra Technologies. Our engineering and recruiting team has received your application and resume.</p>
              
              <div style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; margin: 0 0 28px; text-align: center;">
                <p style="margin: 0 0 16px; font-size: 13px; color: #94a3b8;">Use your personalized 1-click access link to open your candidate portal:</p>
                <a href="${magicLinkUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; text-decoration: none; padding: 13px 28px; font-size: 14px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 12px rgba(37,99,235,0.3);">Access Candidate Portal &rarr;</a>
                <p style="margin: 16px 0 0; font-size: 11px; color: #64748b;">This secure link is valid for 24 hours. You can also set a password inside your portal.</p>
              </div>

              <p style="margin: 0 0 8px; font-size: 13px; color: #94a3b8;">If the button above does not work, copy and paste this link into your browser:</p>
              <p style="margin: 0 0 24px; font-size: 12px; word-break: break-all; color: #60a5fa;">${magicLinkUrl}</p>

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

    async sendMagicLink({ to, name = "there", magicLinkUrl }: MagicLinkEmailOptions): Promise<SendResult> {
      const subject = "Your Olentra Candidate Portal Sign-In Link";
      const text = `Hi ${name},\n\nClick the link below to securely sign in to your Olentra Internship Portal:\n\n${magicLinkUrl}\n\nThis link expires in 24 hours and can be used once.\n\nIf you did not request this link, you can safely ignore this email.\n\nBest regards,\nThe Olentra Team`;

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0c0f17; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0c0f17; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #131926; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <tr>
            <td style="padding: 32px 32px 20px; text-align: left; border-bottom: 1px solid #1e293b; background: linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(15,23,42,0) 100%);">
              <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #60a5fa; display: block; margin-bottom: 8px;">Olentra Careers · Secure Sign-In</span>
              <h1 style="margin: 0; font-size: 22px; font-weight: 600; color: #ffffff;">Sign in to your Candidate Portal</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #cbd5e1;">Hi <strong>${name}</strong>,</p>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #cbd5e1;">We received a request for a 1-click sign-in link to your Olentra Candidate Portal.</p>
              
              <div style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; margin: 0 0 28px; text-align: center;">
                <a href="${magicLinkUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; text-decoration: none; padding: 13px 28px; font-size: 14px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 12px rgba(37,99,235,0.3);">Sign In to Candidate Portal &rarr;</a>
                <p style="margin: 16px 0 0; font-size: 11px; color: #64748b;">This secure link is valid for 24 hours.</p>
              </div>

              <p style="margin: 0 0 8px; font-size: 13px; color: #94a3b8;">Or copy and paste this link into your browser:</p>
              <p style="margin: 0 0 24px; font-size: 12px; word-break: break-all; color: #60a5fa;">${magicLinkUrl}</p>

              <hr style="border: none; border-top: 1px solid #1e293b; margin: 24px 0;" />
              <p style="margin: 0; font-size: 12px; color: #64748b;">If you didn't request this sign-in link, you can safely ignore this email.</p>
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
