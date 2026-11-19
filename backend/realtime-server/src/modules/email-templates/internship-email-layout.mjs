const SITE = "https://www.olentratechnologies.com";
const LOGO = `${SITE}/images/branding/Logo/Olentra-Logo-Without-Background.png`;
const BRAND_COLORS = ["#1478e8", "#00b9d7", "#20c66b", "#f3d51b", "#ff8b17", "#ed2939"];

export function escapeEmailHtml(value) {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

/** Shared frame for the dashboard previews and internship email delivery. Content slots take HTML. */
export function renderInternshipEmail({ title, heading, content, preheader = "", footerDetails = "" }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeEmailHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f5f8;font-family:Arial,Helvetica,sans-serif;color:#172033;">
  ${preheader ? `<div aria-hidden="true" style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeEmailHtml(preheader)}${"&zwnj;&nbsp;".repeat(20)}</div>` : ""}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f3f5f8;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
        <!-- Brand header -->
        <tr>
          <td align="center" bgcolor="#101827" style="background-color:#101827;padding:26px 30px;text-align:center;">
            <a href="${SITE}/" target="_blank" style="text-decoration:none;">
              <img src="${LOGO}" width="66" alt="Olentra Technologies logo" style="display:block;width:66px;height:auto;max-width:66px;margin:0 auto 12px;border:0;">
            </a>
            <div style="font-size:23px;line-height:30px;font-weight:700;letter-spacing:.2px;color:#ffffff;">Olentra Technologies</div>
            <div style="font-size:11px;line-height:18px;letter-spacing:2px;text-transform:uppercase;color:#c7d2e0;margin-top:5px;">Engineering • Innovation • Opportunity</div>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:22px;">
              <tr>
                ${BRAND_COLORS.map(color => `<td width="16.6%" height="4" bgcolor="${color}" style="background-color:${color};font-size:0;line-height:0;">&nbsp;</td>`).join("\n                ")}
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="padding:34px 32px 28px;">
          <h1 style="margin:0 0 18px;font-size:24px;line-height:32px;color:#101827;overflow-wrap:anywhere;">${escapeEmailHtml(heading)}</h1>
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td align="center" bgcolor="#eaf0f6" style="background-color:#eaf0f6;padding:24px 32px 26px;text-align:center;overflow-wrap:anywhere;">
          <p style="margin:0 0 6px;font-size:14px;line-height:21px;font-weight:700;color:#243549;">Olentra Technologies</p>
          <p style="margin:0;font-size:13px;line-height:21px;color:#46596f;">Enterprise product engineering and digital growth</p>
          <p style="margin:4px 0 0;font-size:13px;line-height:21px;">
            <a href="${SITE}/" target="_blank" style="color:#1555a2;text-decoration:underline;">www.olentratechnologies.com</a>
          </p>
          ${footerDetails}
          <p style="margin:14px 0 0;font-size:12px;line-height:19px;color:#536479;">© 2026 Olentra Technologies. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`;
}

export function emailParagraph(html) {
  return `<p style="margin:0 0 16px;font-size:16px;line-height:26px;overflow-wrap:anywhere;">${html}</p>`;
}

export function emailMessage(message) {
  return message.split(/\r?\n[ \t]*\r?\n/).map(paragraph => emailParagraph(escapeEmailHtml(paragraph).replace(/\r?\n/g, "<br>"))).join("\n");
}

export function emailAction(label, url) {
  const href = escapeEmailHtml(url);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 28px;">
            <tr><td align="center" bgcolor="#172033" style="border-radius:6px;">
              <a href="${href}" target="_blank" style="display:inline-block;padding:15px 28px;font-size:16px;line-height:20px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:6px;">${escapeEmailHtml(label)}&nbsp; →</a>
            </td></tr>
          </table>
          <p style="margin:0 0 16px;font-size:14px;line-height:24px;color:#526075;">If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${href}" target="_blank" style="color:#1555a2;word-break:break-all;">${href}</a>
          </p>`;
}

export function emailSignOff(team) {
  return `<p style="margin:24px 0 0;font-size:15px;line-height:23px;color:#475569;">
            Best regards,<br>
            <strong style="font-weight:600;color:#334155;">${escapeEmailHtml(team)}</strong><br>
            <span style="color:#526075;">Olentra Technologies</span>
          </p>`;
}

/** Saved messages keep a plain text version and share the same HTML layout as the built-in template. */
export function renderInternshipTextEmail(subject, body) {
  return renderInternshipEmail({ title: subject, heading: subject, content: emailMessage(body) });
}
