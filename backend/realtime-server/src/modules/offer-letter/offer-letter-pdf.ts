export type OfferLetterDetails = {
  name: string;
  email: string;
  college?: string;
  program: string;
  roleTitle?: string;
  startOn?: string;
  endOn?: string;
  stipend?: number;
  stipendPeriod?: string;
  applicationId: string;
  issueDate?: string;
};

function escapePdf(text: string | undefined | null): string {
  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, " "); // WinAnsi safe ascii
}

function formatDateDisplay(iso: string | undefined): string {
  if (!iso) return "As scheduled";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

export function generateOfferLetterPdf(details: OfferLetterDetails): Buffer {
  const {
    name,
    email,
    college,
    program,
    roleTitle = "AI Full Stack Engineering Intern",
    startOn,
    endOn,
    stipend = 0,
    stipendPeriod = "month",
    applicationId,
    issueDate = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
  } = details;

  const lines: string[] = [];

  // Accent top bar
  lines.push("0.145 0.388 0.921 rg"); // Olentra Blue #2563eb
  lines.push("0 836 595.28 6 re f");

  // Letterhead Brand
  lines.push("BT");
  lines.push("/F2 20 Tf 0.078 0.129 0.239 rg");
  lines.push("50 785 Td (OLENTRA TECHNOLOGIES) Tj");
  lines.push("ET");

  lines.push("BT");
  lines.push("/F1 8.5 Tf 0.4 0.45 0.55 rg");
  lines.push("50 770 Td (Olentra Technologies Pvt. Ltd. | CIN: U72900TG2023PTC176542 | Hyderabad, India | www.olentratechnologies.com) Tj");
  lines.push("ET");

  // Divider
  lines.push("0.85 0.88 0.92 RG 1 w");
  lines.push("50 755 m 545.28 755 l S");

  // Ref & Date
  lines.push("BT");
  lines.push("/F2 9 Tf 0.2 0.25 0.35 rg");
  lines.push(`50 735 Td (Ref No: OL-OFR-${escapePdf(applicationId.slice(0, 14))}) Tj`);
  lines.push("ET");

  lines.push("BT");
  lines.push("/F1 9 Tf 0.4 0.45 0.55 rg");
  lines.push(`380 735 Td (Date of Issue: ${escapePdf(issueDate)}) Tj`);
  lines.push("ET");

  // Recipient block
  lines.push("BT");
  lines.push("/F2 10 Tf 0.1 0.15 0.25 rg");
  lines.push("50 705 Td (To,) Tj");
  lines.push(`0 -14 Td (${escapePdf(name)}) Tj`);
  lines.push("/F1 9 Tf 0.35 0.4 0.5 rg");
  lines.push(`0 -13 Td (Email: ${escapePdf(email)}) Tj`);
  if (college) {
    lines.push(`0 -12 Td (Academic Institution: ${escapePdf(college)}) Tj`);
  }
  lines.push(`0 -12 Td (Application Ref ID: ${escapePdf(applicationId)}) Tj`);
  lines.push("ET");

  // Document Title Banner
  const titleY = college ? 625 : 637;
  lines.push(`0.94 0.96 0.99 rg 50 ${titleY - 8} 495.28 26 re f`);
  lines.push(`0.85 0.9 0.97 RG 1 w 50 ${titleY - 8} 495.28 26 re S`);
  lines.push("BT");
  lines.push("/F2 12 Tf 0.145 0.388 0.921 rg");
  lines.push(`60 ${titleY} Td (INTERNSHIP OFFER & APPOINTMENT LETTER) Tj`);
  lines.push("ET");

  // Opening Paragraph
  let y = titleY - 32;
  lines.push("BT");
  lines.push("/F2 10 Tf 0.1 0.15 0.25 rg");
  lines.push(`50 ${y} Td (Dear ${escapePdf(name)},) Tj`);
  lines.push("ET");

  y -= 16;
  lines.push("BT");
  lines.push("/F1 9.5 Tf 0.25 0.3 0.4 rg");
  lines.push(`50 ${y} Td (We are pleased to extend this formal offer of appointment for an internship at Olentra Technologies Pvt. Ltd.) Tj`);
  y -= 13;
  lines.push(`50 ${y} Td (Following the review of your application, you have been selected for the following appointment terms:) Tj`);
  lines.push("ET");

  // Appointment Terms Box
  y -= 22;
  const boxTop = y;
  const boxHeight = 100;
  lines.push(`0.97 0.98 1 rg 50 ${boxTop - boxHeight} 495.28 ${boxHeight} re f`);
  lines.push(`0.85 0.88 0.95 RG 1 w 50 ${boxTop - boxHeight} 495.28 ${boxHeight} re S`);
  lines.push(`0.145 0.388 0.921 rg 50 ${boxTop - boxHeight} 4 ${boxHeight} re f`); // Blue vertical indicator

  let termY = boxTop - 18;
  const terms: [string, string][] = [
    ["Program Track", program],
    ["Internship Role", roleTitle || "Engineering Intern"],
    ["Commencement Date", formatDateDisplay(startOn)],
    ["Completion Date", formatDateDisplay(endOn)],
    ["Work Mode", "100% Remote / Virtual"],
    ["Stipend / Honorarium", Number(stipend) > 0 ? `INR ${Number(stipend).toLocaleString("en-IN")} / ${stipendPeriod || "month"}` : "Academic / Performance-based"],
  ];

  for (let i = 0; i < terms.length; i += 2) {
    const [l1, v1] = terms[i]!;
    const [l2, v2] = terms[i + 1] || [];
    lines.push("BT");
    lines.push("/F1 8.5 Tf 0.45 0.5 0.6 rg");
    lines.push(`65 ${termY} Td (${escapePdf(l1)}:) Tj`);
    lines.push("/F2 8.5 Tf 0.1 0.15 0.25 rg");
    lines.push(`165 ${termY} Td (${escapePdf(v1)}) Tj`);
    if (l2 && v2) {
      lines.push("/F1 8.5 Tf 0.45 0.5 0.6 rg");
      lines.push(`315 ${termY} Td (${escapePdf(l2)}:) Tj`);
      lines.push("/F2 8.5 Tf 0.1 0.15 0.25 rg");
      lines.push(`415 ${termY} Td (${escapePdf(v2)}) Tj`);
    }
    lines.push("ET");
    termY -= 20;
  }

  // Institutional Authorization & Terms Clauses
  y = boxTop - boxHeight - 25;
  lines.push("BT");
  lines.push("/F2 10 Tf 0.1 0.15 0.25 rg");
  lines.push(`50 ${y} Td (Terms of Engagement & Academic Authorization:) Tj`);
  lines.push("ET");

  const clauses: [string, string][] = [
    [
      "1. Academic & College Validity: ",
      "This document serves as formal confirmation of internship appointment for submission to university authorities, heads of department, and college training cells for NOC, attendance authorization, and academic credits.",
    ],
    [
      "2. Mentorship & Deliverables: ",
      "You will be assigned to project tracks and work under the direction of engineering leads. Regular milestones and check-ins will be coordinated via the Olentra candidate portal.",
    ],
    [
      "3. Intellectual Property & Non-Disclosure: ",
      "All architectures, software source code, models, and technical documentation developed during your internship remain the sole intellectual property of Olentra Technologies Pvt. Ltd.",
    ],
    [
      "4. Verified Certificate of Completion: ",
      "Upon successful completion of the internship milestones and task evaluation, an official Certificate of Completion with public verification credential ID will be issued.",
    ],
  ];

  y -= 14;
  for (const [clauseTitle, desc] of clauses) {
    lines.push("BT");
    lines.push("/F2 8.5 Tf 0.15 0.2 0.3 rg");
    lines.push(`50 ${y} Td (${escapePdf(clauseTitle)}) Tj`);
    lines.push("/F1 8.5 Tf 0.3 0.35 0.45 rg");

    const words = desc.split(" ");
    let curLine = "";
    let isFirst = true;
    for (const w of words) {
      if ((curLine + " " + w).length > 82) {
        if (isFirst) {
          lines.push(`0 0 Td (${escapePdf(curLine)}) Tj`);
          isFirst = false;
        } else {
          y -= 11;
          lines.push(`ET\nBT\n/F1 8.5 Tf 0.3 0.35 0.45 rg\n65 ${y} Td (${escapePdf(curLine)}) Tj`);
        }
        curLine = w;
      } else {
        curLine = curLine ? curLine + " " + w : w;
      }
    }
    if (curLine) {
      if (isFirst) {
        lines.push(`0 0 Td (${escapePdf(curLine)}) Tj`);
      } else {
        y -= 11;
        lines.push(`ET\nBT\n/F1 8.5 Tf 0.3 0.35 0.45 rg\n65 ${y} Td (${escapePdf(curLine)}) Tj`);
      }
    }
    lines.push("ET");
    y -= 14;
  }

  // Signatory Block
  y -= 12;
  lines.push("BT");
  lines.push("/F1 9 Tf 0.3 0.35 0.45 rg");
  lines.push(`50 ${y} Td (Sincerely,) Tj`);
  lines.push("/F2 9.5 Tf 0.1 0.15 0.25 rg");
  lines.push(`0 -14 Td (For Olentra Technologies Pvt. Ltd.) Tj`);
  lines.push("/F1 8.5 Tf 0.4 0.45 0.55 rg");
  lines.push(`0 -13 Td (Authorized Signatory - Admissions & Academic Relations) Tj`);
  lines.push(`0 -11 Td (careers@olentratechnologies.com | www.olentratechnologies.com) Tj`);
  lines.push("ET");

  // Footer Note
  lines.push("0.85 0.88 0.92 RG 0.5 w");
  lines.push("50 45 m 545.28 45 l S");
  lines.push("BT");
  lines.push("/F1 7.5 Tf 0.5 0.55 0.65 rg");
  lines.push("50 32 Td (This is an official computer-generated document issued by Olentra Technologies Pvt. Ltd. Valid for academic and institutional verification.) Tj");
  lines.push("ET");

  const streamContent = lines.join("\n");
  const streamLength = Buffer.byteLength(streamContent, "utf-8");

  const bodyParts = [
    "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n",
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents 7 0 R /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >> >> >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n",
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n",
    "6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>\nendobj\n",
    `7 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
  ];

  const offsets = [0];
  let currentOffset = Buffer.byteLength(bodyParts[0]!, "utf-8");
  for (let i = 1; i <= 7; i++) {
    offsets.push(currentOffset);
    currentOffset += Buffer.byteLength(bodyParts[i]!, "utf-8");
  }

  const startXref = currentOffset;
  let xref = `xref\n0 8\n0000000000 65535 f \n`;
  for (let i = 1; i <= 7; i++) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

  return Buffer.concat([
    Buffer.from(bodyParts.join(""), "utf-8"),
    Buffer.from(xref + trailer, "utf-8"),
  ]);
}
