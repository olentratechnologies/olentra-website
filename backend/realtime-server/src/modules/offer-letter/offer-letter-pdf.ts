import { buildOfferLetterPdfBytes } from "./offer-letter-layout.mjs";

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

export function generateOfferLetterPdf(details: OfferLetterDetails): Buffer {
  return Buffer.from(buildOfferLetterPdfBytes(details));
}
