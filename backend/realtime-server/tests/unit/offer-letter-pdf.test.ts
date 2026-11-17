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
  expect(text.includes("OLENTRA TECHNOLOGIES")).toBe(true);
  expect(text.includes("INTERNSHIP OFFER & APPOINTMENT LETTER")).toBe(true);
  expect(text.includes("Alex Kumar")).toBe(true);
  expect(text.includes("Tech Explorer")).toBe(true);
  expect(text.includes("National Institute of Technology")).toBe(true);
});
