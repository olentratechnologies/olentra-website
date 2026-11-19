import { CUSTOM_EMAIL_GREETING } from "../../../../backend/realtime-server/src/modules/templates/custom-email-greeting.mjs";
import { emailAction, emailParagraph, emailSignOff, renderInternshipEmail } from "../../../../backend/realtime-server/src/modules/email-templates/internship-email-layout.mjs";
export { normalizeCustomEmailName, renderCustomEmailGreeting } from "../../../../backend/realtime-server/src/modules/templates/custom-email-greeting.mjs";
export { renderInternshipTextEmail } from "../../../../backend/realtime-server/src/modules/email-templates/internship-email-layout.mjs";

// Email content supplied by the user for the Custom email dashboard.
export const LINKEDIN_FOLLOWUP_TEMPLATE = Object.freeze({
  id: "linkedin-application-follow-up",
  name: "LinkedIn applicant follow-up",
  subject: "Thank you for applying — Software Engineer Intern | Olentra Technologies",
  format: "html",
  body: renderInternshipEmail({
    title: "Olentra Technologies — Internship Application",
    content: `
          ${emailParagraph(CUSTOM_EMAIL_GREETING)}
          ${emailParagraph("Thank you for your interest in the <strong>Software Engineer Intern</strong> opportunity at <strong>Olentra Technologies</strong> and for submitting your application through LinkedIn.")}
          <p style="margin:0 0 24px;font-size:16px;line-height:26px;">To help us review your profile, please complete your application through our official internship portal.</p>
          ${emailAction("Complete Your Application", "https://www.olentratechnologies.com/careers/intern")}
          ${emailParagraph("We appreciate your interest in joining our team and look forward to reviewing your application.")}
          ${emailSignOff("Recruitment Team")}
    `.trim(),
  }),
});
