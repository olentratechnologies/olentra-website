import { expect, test } from "bun:test";
import { generateOfferLetterPdf } from "../../src/modules/offer-letter/offer-letter-pdf";

test("generateOfferLetterPdf produces valid %PDF-1.4 binary with correct letterhead and terms", () => {
  const pdf = generateOfferLetterPdf({
    name: "Alex Kumar",
    email: "alex@example.test",
    college: "National Institute of Technology",
    program: "Tech Explorer",
    roleTitle: "AI Full Stack Engineering Intern",
    startOn: "2026-12-01T00:00:00.000Z",
    endOn: "2026-12-31T00:00:00.000Z",
    stipend: 5000,
    stipendPeriod: "month",
    applicationId: "OL-90f2b987-3dde-4867-9c31-883bcdd497a0",
    issueDate: "November 17, 2026",
  });

  expect(pdf).toBeInstanceOf(Buffer);
  expect(pdf.length).toBeGreaterThan(1000);
  const text = pdf.toString("utf-8");
  expect(text.startsWith("%PDF-1.4")).toBe(true);
  expect(text.includes("%%EOF")).toBe(true);
  expect(text.includes("xref")).toBe(true);
  expect(text.includes("trailer")).toBe(true);
  expect(text.includes("Olentra Technologies")).toBe(true);
  expect(text.includes("Internship Offer Letter")).toBe(true);
  expect(text.includes("Alex Kumar")).toBe(true);
  expect(text.includes("Tech Explorer")).toBe(true);
  expect(text.includes("National Institute of Technology")).toBe(true);
});


test("browser download and emailed PDF have identical layouts and format ISO issue dates", async () => {
  const { buildOfferLetterPdfBytes } = await import("../../../../apps/web/src/lib/intern/offer-letter-pdf.js");
  const details = { name: "Chinachin", email: "candidate@example.test", program: "Tech Explorer", applicationId: "OL-123", issueDate: "2026-11-17T12:34:31.191Z" };
  const pdf = generateOfferLetterPdf(details);
  expect(pdf.equals(Buffer.from(buildOfferLetterPdfBytes(details)))).toBe(true);
  expect(pdf.toString()).toContain("17 Nov 2026");
  expect(pdf.toString()).not.toContain("12:34:31");
  expect(pdf.toString()).not.toContain("APPOINTMENT LETTER");
  expect(pdf.toString()).toContain("support@olentratechnologies.com");
  expect(pdf.toString()).not.toContain("careers@olentratechnologies.com");
  expect(pdf.toString()).toContain("/Count 1");
});

test("long recipient and offer fields wrap onto additional pages rather than clipping", () => {
  const pdf = generateOfferLetterPdf({ name: "Alex ".repeat(24), email: "candidate@example.test", college: "University ".repeat(40), program: "Engineering ".repeat(30), roleTitle: "Research ".repeat(30), applicationId: "OL-123", issueDate: "2026-11-17" }).toString();
  expect(pdf).not.toContain("/Count 1 ");
  const match = pdf.match(/startxref\n(\d+)/);
  expect(match).not.toBeNull();
  expect(pdf.slice(Number(match![1]), Number(match![1]) + 4)).toBe("xref");
});
