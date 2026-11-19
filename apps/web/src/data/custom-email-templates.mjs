import { CUSTOM_EMAIL_GREETING } from "../../../../backend/realtime-server/src/modules/templates/custom-email-greeting.mjs";
export { normalizeCustomEmailName, renderCustomEmailGreeting } from "../../../../backend/realtime-server/src/modules/templates/custom-email-greeting.mjs";

// Email content supplied by the user for the Custom email dashboard.
export const LINKEDIN_FOLLOWUP_TEMPLATE = Object.freeze({
  id: "linkedin-application-follow-up",
  name: "LinkedIn applicant follow-up",
  subject: "Thank you for applying — Software Engineer Intern | Olentra Technologies",
  format: "html",
  body: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Olentra Technologies — Internship Application</title>
</head>
<body style="margin:0;padding:0;background:#f3f5f8;font-family:Arial,Helvetica,sans-serif;color:#172033;">
  <!-- Subject: Thank you for applying — Software Engineer Intern | Olentra Technologies -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f3f5f8;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
        <!-- Brand header -->
        <tr>
          <td align="center" bgcolor="#101827" style="background-color:#101827;padding:26px 30px;text-align:center;">
            <a href="https://www.olentratechnologies.com/" target="_blank" style="text-decoration:none;">
              <img src="https://www.olentratechnologies.com/images/branding/Logo/Olentra-Logo-Without-Background.png" width="66" alt="Olentra Technologies logo" style="display:block;width:66px;height:auto;max-width:66px;margin:0 auto 12px;border:0;">
            </a>
            <div style="font-size:23px;line-height:30px;font-weight:700;letter-spacing:.2px;color:#ffffff;">Olentra Technologies</div>
            <div style="font-size:11px;line-height:18px;letter-spacing:2px;text-transform:uppercase;color:#c7d2e0;margin-top:5px;">Engineering • Innovation • Opportunity</div>
            <!-- Brand spectrum accent -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:22px;">
              <tr>
                <td width="16.6%" height="4" style="background:#1478e8;font-size:0;line-height:0;">&nbsp;</td>
                <td width="16.6%" style="background:#00b9d7;font-size:0;line-height:0;">&nbsp;</td>
                <td width="16.6%" style="background:#20c66b;font-size:0;line-height:0;">&nbsp;</td>
                <td width="16.6%" style="background:#f3d51b;font-size:0;line-height:0;">&nbsp;</td>
                <td width="16.6%" style="background:#ff8b17;font-size:0;line-height:0;">&nbsp;</td>
                <td width="16.6%" style="background:#ed2939;font-size:0;line-height:0;">&nbsp;</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="padding:34px 32px 28px;">
          <h1 style="margin:0 0 18px;font-size:24px;line-height:32px;color:#101827;">Thank you for applying!</h1>
          <p style="margin:0 0 16px;font-size:16px;line-height:26px;">${CUSTOM_EMAIL_GREETING}</p>
          <p style="margin:0 0 16px;font-size:16px;line-height:26px;">Thank you for your interest in the <strong>Software Engineer Intern</strong> opportunity at <strong>Olentra Technologies</strong> and for submitting your application through LinkedIn.</p>
          <p style="margin:0 0 24px;font-size:16px;line-height:26px;">To help us review your profile, please complete your application through our official internship portal.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 28px;">
            <tr><td align="center" bgcolor="#172033" style="border-radius:6px;">
              <a href="https://www.olentratechnologies.com/careers/intern" target="_blank" style="display:inline-block;padding:15px 28px;font-size:16px;line-height:20px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:6px;">Complete Your Application&nbsp; →</a>
            </td></tr>
          </table>
          <p style="margin:0 0 16px;font-size:14px;line-height:24px;color:#526075;">If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="https://www.olentratechnologies.com/careers/intern" target="_blank" style="color:#1478e8;word-break:break-word;">https://www.olentratechnologies.com/careers/intern</a>
          </p>
          <p style="margin:0 0 16px;font-size:16px;line-height:26px;">We appreciate your interest in joining our team and look forward to reviewing your application.</p>
          <p style="margin:24px 0 0;font-size:15px;line-height:23px;color:#475569;">
            Best regards,<br>
            <strong style="font-weight:600;color:#334155;">Recruitment Team</strong><br>
            <span style="color:#526075;">Olentra Technologies</span>
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td align="center" bgcolor="#eaf0f6" style="background-color:#eaf0f6;padding:24px 32px 26px;text-align:center;">
          <p style="margin:0 0 6px;font-size:14px;line-height:21px;font-weight:700;color:#243549;">Olentra Technologies</p>
          <p style="margin:0;font-size:13px;line-height:21px;color:#46596f;">Enterprise product engineering and digital growth</p>
          <p style="margin:4px 0 0;font-size:13px;line-height:21px;">
            <a href="https://www.olentratechnologies.com/" target="_blank" style="color:#1555a2;text-decoration:underline;">www.olentratechnologies.com</a>
          </p>
          <p style="margin:14px 0 0;font-size:12px;line-height:19px;color:#536479;">© 2026 Olentra Technologies. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`,
});
