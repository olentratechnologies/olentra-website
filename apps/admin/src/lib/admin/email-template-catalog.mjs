/** Email preview content. Live delivery settings are managed by the backend. */
export const EMAIL_TEMPLATE_SELECTION_KEY = "olentra-admin-email-template-selections-v1";

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

export const EMAIL_TEMPLATE_PRESETS = deepFreeze([
  { id: "professional", label: "Branded Professional", description: "The corporate standard: a clear hierarchy, structured records and an accountable next step." },
  { id: "warm", label: "Warm & Personal", description: "A signature communication with a personal introduction and thoughtful guidance." },
  { id: "minimal", label: "Minimal Direct", description: "An executive brief with essential context, concise details and one clear action." },
]);

const SAMPLE_VALUES = {
  recipientName: "Alex Morgan",
  candidateName: "Sam Taylor",
  senderName: "Jordan Lee",
  companyName: "Northstar Studio",
  email: "sam.taylor@example.com",
  enquiryId: "ENQ-1042",
  enquirySubject: "A new customer portal",
  enquiryMessage: "We are planning a customer portal and would like to discuss the scope and next steps.",
  replyMessage: "Thank you for sharing your requirements. We can review the scope together and outline a practical next step.",
  resolutionSummary: "The requested project information has been shared and the enquiry is now closed.",
  programName: "Innovator Internship",
  applicationId: "APP-2048",
  requestedInformation: "Please share a link to your portfolio and confirm your preferred start month.",
  decisionNote: "We are moving forward with candidates whose current experience more closely matches this intake.",
  offerSummary: "An internship with the product engineering team, subject to the terms in your offer.",
  onboardingSummary: "Your profile, availability and onboarding documents are ready for review.",
  projectName: "Community Portal",
  projectSummary: "Help build a clear, accessible experience for community members.",
  changeSummary: "The project brief now includes an accessibility review before handover.",
  taskName: "Review the onboarding flow",
  taskInstructions: "Review the current journey and document three improvements with supporting examples.",
  dueDate: "20 November 2026",
  submissionSummary: "A review document and three annotated screens have been submitted.",
  reviewFeedback: "The updated flow is clear and the accessibility notes address the review criteria.",
  changesRequested: "Please add keyboard-navigation notes and update the empty-state example.",
  completionDate: "30 November 2026",
  internshipStatus: "Dropped",
  statusNote: "Your coordinator has marked this internship as dropped. Contact the team if you need clarification or would like to discuss the next steps.",
  certificateId: "CERT-3072",
  revocationReason: "The certificate details require correction. Please contact your coordinator for the next steps.",
  messageSubject: "Feedback on your project outline",
  messageBody: "Your outline is ready for the next review. Please check the notes in your conversation.",
  announcementTitle: "November program update",
  announcementBody: "The updated program guide is available in your portal. Please review the submission checklist before your next handover.",
  roleName: "Recruiter",
  accessSummary: "Recruitment records are available for review; publishing and company settings remain restricted.",
  requestTitle: "Updated internship program page",
  requesterName: "Jamie Chen",
  reviewerName: "Casey Rivera",
  approvalReason: "Please review the revised program description before it is published.",
  reviewNote: "The revised description matches the approved program details.",
  rejectionNote: "The proposed dates need to be confirmed before this change can be approved.",
  revisionNote: "Please clarify the eligibility requirements and resubmit the proposal.",
  incidentTitle: "Contact form delivery delay",
  incidentSeverity: "High",
  incidentSummary: "Contact submissions are taking longer than expected to reach the team inbox.",
  incidentUpdate: "The delivery provider is recovering. The operations team is checking queued submissions.",
  incidentResolution: "Delivery has recovered and the affected submissions have been reviewed.",
  publishedTitle: "Innovator Internship program page",
  publishedKind: "Program content",
  backupName: "Workspace snapshot — 10 November",
  restoreScope: "Configuration only",
  actionUrl: "https://workspace.example.com/dashboard",
};

const LIVE_EMAIL_TYPES = new Set(["enquiry.received", "application.received", "account.signin-link", "account.password-reset"]);
const TOKEN_PATTERN = /\{\{([a-zA-Z][a-zA-Z0-9]*)\}\}/g;

const DEPARTMENTS = {
  enquiry: ["Client Relations", "Client experience", "Enquiry reference", "{{enquiryId}}"],
  account: ["Identity & Access", "Account services", "Account", "{{email}}"],
  application: ["Talent Acquisition", "Candidate experience", "Application reference", "{{applicationId}}"],
  offer: ["Talent Acquisition", "Recruitment operations", "Application reference", "{{applicationId}}"],
  onboarding: ["People Operations", "Internship onboarding", "Application reference", "{{applicationId}}"],
  project: ["Program Delivery", "Project coordination", "Project", "{{projectName}}"],
  task: ["Program Delivery", "Project coordination", "Project", "{{projectName}}"],
  submission: ["Program Delivery", "Work review", "Project", "{{projectName}}"],
  internship: ["People Operations", "Internship coordination", "Program", "{{programName}}"],
  certificate: ["People Operations", "Credentials & completion", "Certificate reference", "{{certificateId}}"],
  message: ["Program Communications", "Candidate & intern support", "Application reference", "{{applicationId}}"],
  announcement: ["Program Communications", "Program coordination", "Program", "{{programName}}"],
  team: ["Workspace Administration", "Team access", "Workspace", "Olentra company workspace"],
  approval: ["Governance", "Change review", "Change request", "{{requestTitle}}"],
  incident: ["Service Operations", "Incident response", "Incident", "{{incidentTitle}}"],
  publishing: ["Content Operations", "Publication management", "Publication", "{{publishedTitle}}"],
  backup: ["Workspace Administration", "Data & recovery", "Snapshot", "{{backupName}}"],
};

// Every event carries the operational context that makes its email useful.
// This is presentation data, not a claim that the corresponding delivery is live.
const EVENT_PRESENTATION = {
  "enquiry.received": {
    eyebrow: "New business enquiry", status: "Needs review", statusTone: "attention", summary: "A new project conversation has been submitted for your team’s review.",
    details: [["Organisation", "{{companyName}}"], ["Contact", "{{candidateName}}"], ["Email", "{{email}}"], ["Subject", "{{enquirySubject}}"]],
    nextSteps: ["Review the submitted requirements and assign an owner.", "Reply with a relevant next step using enquiry reference {{enquiryId}}."],
  },
  "enquiry.acknowledgement": {
    eyebrow: "Enquiry confirmation", status: "Received", statusTone: "success", summary: "Your requirements are now with the Client Relations team.",
    details: [["Enquiry", "{{enquirySubject}}"], ["Reference", "{{enquiryId}}"], ["Status", "Awaiting team review"]],
    nextSteps: ["Keep your enquiry reference for future correspondence.", "Share any additional context with the Olentra team."],
  },
  "enquiry.reply": {
    eyebrow: "Project correspondence", status: "Response available", statusTone: "info", summary: "A response to your project enquiry is ready for review.",
    details: [["Subject", "{{enquirySubject}}"], ["From", "{{senderName}} · Olentra"], ["Reference", "{{enquiryId}}"]],
    nextSteps: ["Review the response and any requested information.", "Include {{enquiryId}} when continuing the conversation."],
  },
  "enquiry.followup": {
    eyebrow: "Project follow-up", status: "Your input requested", statusTone: "attention", summary: "An update from you will help us confirm the right next step for this enquiry.",
    details: [["Enquiry", "{{enquirySubject}}"], ["Reference", "{{enquiryId}}"], ["Requested action", "Confirm your next step"]],
    nextSteps: ["Let us know whether you would like to continue the discussion.", "Share any changes to scope or timing so we can respond appropriately."],
  },
  "enquiry.resolved": {
    eyebrow: "Enquiry closure", status: "Resolved", statusTone: "neutral", summary: "This enquiry has been closed with a recorded resolution.",
    details: [["Enquiry", "{{enquirySubject}}"], ["Reference", "{{enquiryId}}"], ["Resolution", "{{resolutionSummary}}"]],
    nextSteps: ["Retain the reference if you need to revisit this conversation."],
  },
  "account.registered": {
    eyebrow: "Welcome to Olentra", status: "Account ready", statusTone: "success", summary: "Your candidate workspace is ready. Your application, profile and conversations now have one place to live.",
    details: [["Account holder", "{{recipientName}}"], ["Email", "{{email}}"], ["Workspace", "Candidate portal"], ["Account status", "Registered"]],
    nextSteps: ["Review your profile and contact details.", "Open your application to follow its status and next steps."],
    notice: { title: "Your application journey", body: "Registration and recruitment review are separate steps. Your application status is available in the portal." },
  },
  "account.signin-link": {
    eyebrow: "Account access", status: "Sign-in requested", statusTone: "info", summary: "Use your requested sign-in link to continue to the Olentra candidate portal.",
    details: [["Account", "{{email}}"], ["Destination", "Candidate portal"], ["Request", "Email sign-in link"]],
    nextSteps: ["Open the link from this message to continue to your account."],
    notice: { title: "Keep your access private", body: "This link grants access to your account. Do not forward it. If you did not request it, you can ignore this message." },
  },
  "account.password-reset": {
    eyebrow: "Account security", status: "Action requested", statusTone: "attention", summary: "A request was received to reset the password associated with this account.",
    details: [["Account", "{{email}}"], ["Request", "Password reset"], ["Link validity", "One hour"]],
    nextSteps: ["Choose a new password using your requested reset link."],
    notice: { title: "Did not request this?", body: "Your current password has not changed. Ignore this message if the request was not yours, and keep this reset link private." },
  },
  "account.password-changed": {
    eyebrow: "Security confirmation", status: "Password updated", statusTone: "success", summary: "The password for your Olentra account has been changed.",
    details: [["Account", "{{email}}"], ["Change", "Account password"], ["Result", "Updated successfully"]],
    nextSteps: [],
    notice: { title: "If you did not make this change", body: "Contact the Olentra team and use the password reset process to regain control of your account." },
  },
  "application.received": {
    eyebrow: "Application confirmation", status: "Application received", statusTone: "success", summary: "Your application has entered the recruitment review process.",
    details: [["Applicant", "{{recipientName}}"], ["Program", "{{programName}}"], ["Application", "{{applicationId}}"], ["Current stage", "Applied"]],
    nextSteps: ["Check your application details in the candidate portal.", "Watch for status updates and requests from the recruitment team."],
  },
  "application.new-alert": {
    eyebrow: "Recruitment intake", status: "Ready for review", statusTone: "attention", summary: "A newly submitted application is ready for recruitment review.",
    details: [["Candidate", "{{candidateName}}"], ["Program", "{{programName}}"], ["Application", "{{applicationId}}"], ["Stage", "Applied"]],
    nextSteps: ["Review the candidate’s submission and supporting information.", "Record the appropriate next stage in the application workspace."],
  },
  "application.under-review": {
    eyebrow: "Recruitment update", status: "Under review", statusTone: "info", summary: "The recruitment team is reviewing your application and supporting information.",
    details: [["Program", "{{programName}}"], ["Application", "{{applicationId}}"], ["Current stage", "Under review"]],
    nextSteps: ["Keep your candidate profile and supporting links up to date.", "Review any information requests in your application conversation."],
  },
  "application.shortlisted": {
    eyebrow: "Recruitment update", status: "Shortlisted", statusTone: "success", summary: "Your application has progressed to the shortlist for further consideration.",
    details: [["Program", "{{programName}}"], ["Application", "{{applicationId}}"], ["Current stage", "Shortlisted"]],
    nextSteps: ["Review the next-step guidance in your candidate portal.", "Respond to any information requested by the recruitment team."],
  },
  "application.interview-stage": {
    eyebrow: "Recruitment progression", status: "Interview stage", statusTone: "info", summary: "Your application has moved to the interview stage for the next part of the recruitment process.",
    details: [["Program", "{{programName}}"], ["Application", "{{applicationId}}"], ["Current stage", "Interview"]],
    nextSteps: ["Review your application conversation for instructions from the team."],
    notice: { title: "Interview arrangements", body: "This message confirms a stage change. Scheduling details and any meeting information will be shared separately." },
  },
  "application.selected": {
    eyebrow: "Recruitment decision", status: "Selected", statusTone: "success", summary: "Your application has been selected to move forward in the recruitment process.",
    details: [["Program", "{{programName}}"], ["Application", "{{applicationId}}"], ["Decision", "Selected"]],
    nextSteps: ["Review the decision and any next-step instructions in your portal.", "Check for a separate offer and review its terms before responding."],
  },
  "application.rejected": {
    eyebrow: "Application decision", status: "Not selected", statusTone: "neutral", summary: "The recruitment review for this application is complete.",
    details: [["Program", "{{programName}}"], ["Application", "{{applicationId}}"], ["Decision", "Not selected"]],
    nextSteps: ["Review the decision note in your candidate portal."],
  },
  "application.information-request": {
    eyebrow: "Application action required", status: "Information needed", statusTone: "attention", summary: "Additional information is needed to continue reviewing your application.",
    details: [["Program", "{{programName}}"], ["Application", "{{applicationId}}"], ["Requested information", "{{requestedInformation}}"]],
    nextSteps: ["Prepare the requested information or supporting links.", "Respond in your application conversation so the review can continue."],
  },
  "offer.ready": {
    eyebrow: "Internship offer", status: "Decision requested", statusTone: "success", summary: "Your internship offer is available for review in the candidate portal.",
    details: [["Program", "{{programName}}"], ["Application", "{{applicationId}}"], ["Offer summary", "{{offerSummary}}"]],
    nextSteps: ["Read the complete offer and its terms in your portal.", "Record your acceptance or decline after reviewing the details."],
    notice: { title: "Review the complete offer", body: "This email is a summary. The offer record in your portal contains the terms and next steps to review before making a decision." },
  },
  "offer.accepted": {
    eyebrow: "Offer decision received", status: "Accepted", statusTone: "success", summary: "A candidate has accepted the internship offer and is ready for onboarding follow-up.",
    details: [["Candidate", "{{candidateName}}"], ["Program", "{{programName}}"], ["Application", "{{applicationId}}"], ["Decision", "Offer accepted"]],
    nextSteps: ["Review the accepted offer in the application record.", "Coordinate the onboarding requirements before confirming joining."],
  },
  "offer.declined": {
    eyebrow: "Offer decision received", status: "Declined", statusTone: "neutral", summary: "The candidate has recorded a decision to decline this internship offer.",
    details: [["Candidate", "{{candidateName}}"], ["Program", "{{programName}}"], ["Application", "{{applicationId}}"], ["Decision", "Offer declined"]],
    nextSteps: ["Review the candidate’s decision before any follow-up.", "Update recruitment and intake planning as appropriate."],
  },
  "onboarding.submitted": {
    eyebrow: "Onboarding review", status: "Review required", statusTone: "attention", summary: "An onboarding submission is ready for validation by the program team.",
    details: [["Intern", "{{candidateName}}"], ["Program", "{{programName}}"], ["Application", "{{applicationId}}"], ["Submission", "{{onboardingSummary}}"]],
    nextSteps: ["Review the submitted profile and required information.", "Approve onboarding when the requirements are satisfied."],
  },
  "onboarding.approved": {
    eyebrow: "Welcome to your internship", status: "Onboarding approved", statusTone: "success", summary: "Your onboarding is complete. You can now begin your program with Olentra.",
    details: [["Intern", "{{recipientName}}"], ["Program", "{{programName}}"], ["Onboarding", "Approved"], ["Workspace", "Intern portal"]],
    nextSteps: ["Review your assigned projects and program information.", "Follow the first steps shared by your coordinator."],
  },
  "project.assigned": {
    eyebrow: "Project allocation", status: "Assigned", statusTone: "info", summary: "A new project has been added to your program workspace.",
    details: [["Project", "{{projectName}}"], ["Assignee", "{{recipientName}}"], ["Brief", "{{projectSummary}}"]],
    nextSteps: ["Read the project brief and review your responsibilities.", "Check assigned tasks and clarify questions with your coordinator."],
  },
  "project.updated": {
    eyebrow: "Project change notice", status: "Brief updated", statusTone: "info", summary: "Your project record has been updated with new information.",
    details: [["Project", "{{projectName}}"], ["Change summary", "{{changeSummary}}"]],
    nextSteps: ["Review the revised brief before continuing your work.", "Check whether the changes affect your assigned tasks."],
  },
  "task.assigned": {
    eyebrow: "Work assignment", status: "Action required", statusTone: "attention", summary: "A task has been assigned to you within your project.",
    details: [["Task", "{{taskName}}"], ["Project", "{{projectName}}"], ["Due date", "{{dueDate}}"], ["Instructions", "{{taskInstructions}}"]],
    nextSteps: ["Review the instructions and due date in your project.", "Submit your work through the portal when ready for review."],
  },
  "task.updated": {
    eyebrow: "Task change notice", status: "Task updated", statusTone: "info", summary: "Details of an assigned task have changed.",
    details: [["Task", "{{taskName}}"], ["Project", "{{projectName}}"], ["Due date", "{{dueDate}}"], ["Update", "{{changeSummary}}"]],
    nextSteps: ["Review the current instructions before your next submission.", "Confirm any questions about the update with your coordinator."],
  },
  "submission.received": {
    eyebrow: "Work review request", status: "Review pending", statusTone: "attention", summary: "An intern’s work submission is ready for review.",
    details: [["Intern", "{{candidateName}}"], ["Task", "{{taskName}}"], ["Project", "{{projectName}}"], ["Submission", "{{submissionSummary}}"]],
    nextSteps: ["Review the submitted work against the task requirements.", "Record approval or clear guidance for the next revision."],
  },
  "submission.approved": {
    eyebrow: "Work review decision", status: "Approved", statusTone: "success", summary: "Your submitted work has passed its review.",
    details: [["Task", "{{taskName}}"], ["Project", "{{projectName}}"], ["Review result", "Approved"], ["Feedback", "{{reviewFeedback}}"]],
    nextSteps: ["Read the reviewer’s feedback.", "Review your project workspace for the next assigned task."],
  },
  "submission.changes-requested": {
    eyebrow: "Work review feedback", status: "Revision required", statusTone: "attention", summary: "The reviewer has requested revisions before this submission can be approved.",
    details: [["Task", "{{taskName}}"], ["Project", "{{projectName}}"], ["Requested changes", "{{changesRequested}}"]],
    nextSteps: ["Address each requested change in your revised work.", "Resubmit through the portal for another review."],
  },
  "internship.completed": {
    eyebrow: "Program completion", status: "Completed", statusTone: "success", summary: "Your internship completion has been recorded by the program team.",
    details: [["Intern", "{{recipientName}}"], ["Program", "{{programName}}"], ["Completion date", "{{completionDate}}"]],
    nextSteps: ["Review the completion record in your portal.", "Check the certificates section for any issued credential."],
  },
  "internship.status-updated": {
    eyebrow: "Program record update", status: "Status changed", statusTone: "neutral", summary: "Your internship record has a new status.",
    details: [["Program", "{{programName}}"], ["Current status", "{{internshipStatus}}"], ["Coordinator note", "{{statusNote}}"]],
    nextSteps: ["Review the updated record and coordinator guidance.", "Contact your program team if you need clarification."],
  },
  "certificate.issued": {
    eyebrow: "Credential issuance", status: "Issued", statusTone: "success", summary: "Your internship certificate has been issued and is available in your portal.",
    details: [["Recipient", "{{recipientName}}"], ["Program", "{{programName}}"], ["Certificate", "{{certificateId}}"], ["Completion date", "{{completionDate}}"]],
    nextSteps: ["Review the certificate details before downloading or sharing.", "Contact the program team if any information needs correction."],
  },
  "certificate.revoked": {
    eyebrow: "Credential status notice", status: "Revoked", statusTone: "attention", summary: "The previously issued certificate is no longer valid.",
    details: [["Certificate", "{{certificateId}}"], ["Program", "{{programName}}"], ["Reason", "{{revocationReason}}"]],
    nextSteps: ["Stop using or sharing the revoked certificate.", "Contact your program coordinator to discuss the next steps."],
    notice: { title: "Certificate validity", body: "This certificate is no longer valid. Refer to your portal for the current credential status and any replacement issued by the team." },
  },
  "message.from-team": {
    eyebrow: "Portal correspondence", status: "New message", statusTone: "info", summary: "Your Olentra team has added a message to your application conversation.",
    details: [["Subject", "{{messageSubject}}"], ["From", "{{senderName}}"], ["Application", "{{applicationId}}"]],
    nextSteps: ["Open the conversation to read the full context.", "Reply in your portal if the team has requested a response."],
  },
  "message.from-intern": {
    eyebrow: "Conversation update", status: "New reply", statusTone: "info", summary: "An applicant or intern has replied in their portal conversation.",
    details: [["From", "{{candidateName}}"], ["Subject", "{{messageSubject}}"], ["Application", "{{applicationId}}"]],
    nextSteps: ["Read the reply alongside the existing conversation.", "Record a response or the appropriate follow-up."],
  },
  "announcement.program": {
    eyebrow: "Program bulletin", status: "Program update", statusTone: "info", summary: "A new announcement is available for your program audience.",
    details: [["Program", "{{programName}}"], ["Announcement", "{{announcementTitle}}"]],
    nextSteps: ["Read the announcement and note any actions relevant to you.", "Ask your coordinator if you need clarification."],
  },
  "team.invitation": {
    eyebrow: "Workspace invitation", status: "Invitation pending", statusTone: "info", summary: "You have been invited to join the Olentra company workspace.",
    details: [["Invited by", "{{senderName}}"], ["Assigned role", "{{roleName}}"], ["Workspace", "Olentra company workspace"]],
    nextSteps: ["Review the invitation with your workspace administrator.", "Sign in after your invitation and access have been confirmed."],
    notice: { title: "Role-based access", body: "Workspace access follows the permissions assigned to your role. Contact your administrator if those permissions need to change." },
  },
  "team.invitation-accepted": {
    eyebrow: "Team membership", status: "Member joined", statusTone: "success", summary: "A team member has accepted their company workspace invitation.",
    details: [["Team member", "{{candidateName}}"], ["Role", "{{roleName}}"], ["Membership", "Invitation accepted"]],
    nextSteps: ["Review the member’s role and responsibilities.", "Confirm that their assigned permissions match their work."],
  },
  "team.access-updated": {
    eyebrow: "Access change notice", status: "Permissions updated", statusTone: "attention", summary: "Your assigned role or company workspace permissions have changed.",
    details: [["Team member", "{{recipientName}}"], ["Current role", "{{roleName}}"], ["Access summary", "{{accessSummary}}"]],
    nextSteps: ["Review the updated access available in your account.", "Contact an administrator if the change does not match your responsibilities."],
  },
  "approval.requested": {
    eyebrow: "Change governance", status: "Decision required", statusTone: "attention", summary: "A proposed change is awaiting an authorized review decision.",
    details: [["Change", "{{requestTitle}}"], ["Requested by", "{{requesterName}}"], ["Reason", "{{approvalReason}}"]],
    nextSteps: ["Compare the proposal with the currently published version.", "Approve, reject or request revisions with a clear review note."],
  },
  "approval.approved": {
    eyebrow: "Change decision", status: "Approved", statusTone: "success", summary: "The proposed change has received approval from its reviewer.",
    details: [["Change", "{{requestTitle}}"], ["Reviewer", "{{reviewerName}}"], ["Decision note", "{{reviewNote}}"]],
    nextSteps: ["Review the approval record and resulting workflow status."],
  },
  "approval.rejected": {
    eyebrow: "Change decision", status: "Not approved", statusTone: "neutral", summary: "The reviewer has not approved the current proposal.",
    details: [["Change", "{{requestTitle}}"], ["Reviewer", "{{reviewerName}}"], ["Reason", "{{rejectionNote}}"]],
    nextSteps: ["Review the reason before preparing any revised proposal."],
  },
  "approval.changes-requested": {
    eyebrow: "Review feedback", status: "Revisions required", statusTone: "attention", summary: "Revisions are required before the proposed change can be approved.",
    details: [["Change", "{{requestTitle}}"], ["Reviewer", "{{reviewerName}}"], ["Requested revisions", "{{revisionNote}}"]],
    nextSteps: ["Address the reviewer’s requested changes.", "Submit the revised proposal for another review."],
  },
  "incident.alert": {
    eyebrow: "Operational alert", status: "Response required", statusTone: "attention", summary: "An operational incident requires review and ownership.",
    details: [["Incident", "{{incidentTitle}}"], ["Priority", "{{incidentSeverity}}"], ["Impact", "{{incidentSummary}}"]],
    nextSteps: ["Confirm response ownership and review the incident context.", "Record response actions in the incident timeline."],
  },
  "incident.updated": {
    eyebrow: "Incident communication", status: "Response updated", statusTone: "info", summary: "New response information has been recorded for an active incident.",
    details: [["Incident", "{{incidentTitle}}"], ["Priority", "{{incidentSeverity}}"], ["Latest update", "{{incidentUpdate}}"]],
    nextSteps: ["Review the timeline before taking further response actions.", "Coordinate the next step with the incident owner."],
  },
  "incident.resolved": {
    eyebrow: "Incident resolution", status: "Resolved", statusTone: "success", summary: "The incident is resolved and its closing notes are available.",
    details: [["Incident", "{{incidentTitle}}"], ["Status", "Resolved"], ["Resolution", "{{incidentResolution}}"]],
    nextSteps: ["Review the closing notes and any recorded follow-up work."],
  },
  "publishing.completed": {
    eyebrow: "Publication record", status: "Published", statusTone: "success", summary: "The approved change has completed its workspace publication workflow.",
    details: [["Record", "{{publishedTitle}}"], ["Content type", "{{publishedKind}}"], ["Workflow status", "Published"]],
    nextSteps: ["Verify the published version in the workspace.", "Review any remaining follow-up with the content owner."],
  },
  "backup.created": {
    eyebrow: "Recovery snapshot", status: "Snapshot created", statusTone: "success", summary: "A new snapshot is available in the workspace recovery workflow.",
    details: [["Snapshot", "{{backupName}}"], ["Storage", "Current browser"], ["Record", "Workspace backup"]],
    nextSteps: ["Review the snapshot manifest and included scope.", "Export a separate copy if off-device recovery is required."],
    notice: { title: "Recovery coverage", body: "A browser-local snapshot depends on this browser’s storage. Keep a separate exported copy if you need recovery beyond this device." },
  },
  "backup.restored": {
    eyebrow: "Recovery confirmation", status: "Restore complete", statusTone: "success", summary: "The selected snapshot has been restored using the requested scope.",
    details: [["Snapshot", "{{backupName}}"], ["Restored scope", "{{restoreScope}}"], ["Workflow status", "Completed"]],
    nextSteps: ["Review the affected settings and records.", "Confirm that the restored state is suitable before continuing work."],
  },
};

function createPresentation(id) {
  const [department, role, label, value] = DEPARTMENTS[id.split(".")[0]];
  const event = EVENT_PRESENTATION[id];
  if (!event) throw new Error(`Missing email presentation for ${id}`);
  return {
    department, ...event,
    reference: { label, value },
    details: event.details.map(([label, value]) => ({ label, value })),
    notice: event.notice || null,
    signature: { team: `Olentra ${department}`, role },
  };
}

/** A tuple contains subject, preheader, heading, and one or more body paragraphs. */
function defineType({ id, title, category, audience, recipient, trigger, action, path, copy, samples = {} }) {
  const presentation = createPresentation(id);
  const variants = copy.map(([subject, preheader, heading, ...body], index) => {
    const preset = EMAIL_TEMPLATE_PRESETS[index];
    return {
      id: `${id}.${preset.id}`, presetId: preset.id, label: preset.label,
      subject, preheader, heading,
      body: [`${index === 0 ? "Dear" : "Hello"} {{recipientName}},`, ...body],
      cta: { label: action, url: "{{actionUrl}}" },
    };
  });
  const variables = [...new Set([...JSON.stringify({ variants, presentation }).matchAll(TOKEN_PATTERN)].map(match => match[1]))].sort();
  const availableSamples = { ...SAMPLE_VALUES, ...(id.startsWith("account.") ? { email: "alex.morgan@example.com" } : {}), actionUrl: `https://workspace.example.com${path}`, ...samples };
  const sampleValues = Object.fromEntries(variables.map(variable => [variable, availableSamples[variable]]));
  return { id, title, category, audience, recipient, trigger, deliveryStatus: LIVE_EMAIL_TYPES.has(id) ? "existing-email" : "not-connected", variables, sampleValues, presentation, variants };
}

export const EMAIL_TEMPLATE_CATALOG = deepFreeze([
  defineType({
    id: "enquiry.received", title: "New contact / project enquiry", category: "Enquiries", audience: "team", recipient: "Olentra enquiries team", trigger: "A visitor submits the contact form.", action: "Review enquiry", path: "/dashboard/enquiries/ENQ-1042",
    copy: [
      ["New enquiry: {{enquirySubject}}", "{{candidateName}} from {{companyName}} has contacted Olentra.", "A new enquiry needs your attention", "{{candidateName}} ({{email}}) submitted enquiry {{enquiryId}} on behalf of {{companyName}}.", "{{enquiryMessage}}", "Review the enquiry and assign the next step to the appropriate team member."],
      ["A new conversation with {{companyName}}", "{{candidateName}} would like to discuss {{enquirySubject}}.", "A project enquiry for your review", "{{candidateName}} from {{companyName}} has shared a new idea: {{enquirySubject}}.", "{{enquiryMessage}}", "You can reach them at {{email}}. Open {{enquiryId}} to review the request and plan a helpful reply."],
      ["Enquiry {{enquiryId}} · {{companyName}}", "New request from {{candidateName}}.", "New enquiry", "From: {{candidateName}} · {{email}}", "Topic: {{enquirySubject}}", "{{enquiryMessage}}"],
    ],
  }),
  defineType({
    id: "enquiry.acknowledgement", title: "Enquiry acknowledgement", category: "Enquiries", audience: "users", recipient: "Contact form submitter", trigger: "A contact enquiry is successfully received.", action: "Contact Olentra", path: "/#contact",
    copy: [
      ["We have received your enquiry · {{enquiryId}}", "Thank you for contacting Olentra about {{enquirySubject}}.", "Your enquiry has been received", "Thank you for sharing your enquiry about {{enquirySubject}}. We have recorded it as {{enquiryId}}.", "Our team will review the information you provided and respond with the next steps."],
      ["Thanks for reaching out to Olentra", "Your message about {{enquirySubject}} is with our team.", "Thank you for contacting Olentra", "Thanks for telling us about {{enquirySubject}}. We look forward to learning more about what you have in mind.", "Your reference is {{enquiryId}}. Our team will review your message and get back to you with a useful next step."],
      ["Enquiry received: {{enquiryId}}", "We have your message and will review it.", "Message received", "We received your enquiry about {{enquirySubject}}.", "Reference: {{enquiryId}}. Our team will respond after reviewing your request."],
    ],
  }),
  defineType({
    id: "enquiry.reply", title: "Reply to an enquiry", category: "Enquiries", audience: "users", recipient: "Enquirer", trigger: "An Olentra team member replies to an existing enquiry.", action: "Contact Olentra", path: "/#contact",
    copy: [
      ["Olentra response: {{enquirySubject}}", "{{senderName}} has responded to enquiry {{enquiryId}}.", "A response to your enquiry", "{{senderName}} has reviewed your enquiry about {{enquirySubject}} and shared the following response.", "{{replyMessage}}", "Please refer to {{enquiryId}} when continuing this conversation."],
      ["Let’s talk about {{enquirySubject}}", "A reply from {{senderName}} at Olentra.", "Your project enquiry: our response", "{{senderName}} here from Olentra. Thank you for giving us some background on {{enquirySubject}}.", "{{replyMessage}}", "You can continue the conversation using reference {{enquiryId}}."],
      ["Re: {{enquirySubject}} · {{enquiryId}}", "Your enquiry has a new response.", "Our response", "{{replyMessage}}", "From {{senderName}}, Olentra · {{enquiryId}}"],
    ],
  }),
  defineType({
    id: "enquiry.followup", title: "Enquiry follow-up", category: "Enquiries", audience: "users", recipient: "Enquirer", trigger: "The team follows up on an open enquiry.", action: "Contact Olentra", path: "/#contact",
    copy: [
      ["Following up on {{enquirySubject}}", "We would appreciate an update on enquiry {{enquiryId}}.", "Checking the next step", "We are following up on your enquiry about {{enquirySubject}}.", "Please let us know whether you would like to continue the discussion or if your requirements have changed. Reference: {{enquiryId}}."],
      ["Still thinking about {{enquirySubject}}?", "Let us know how we can help with your next step.", "A quick check-in from Olentra", "We wanted to check in on {{enquirySubject}} and see whether you need anything else from us.", "If the timing or scope has changed, that is fine—just let us know what works for you. Your enquiry reference is {{enquiryId}}."],
      ["Follow-up: {{enquiryId}}", "An update on your enquiry would help us plan the next step.", "Your project enquiry: next steps", "Would you like to continue with {{enquirySubject}}?", "Please share an update or let us know if we can close enquiry {{enquiryId}}."],
    ],
  }),
  defineType({
    id: "enquiry.resolved", title: "Enquiry resolved", category: "Enquiries", audience: "users", recipient: "Enquirer", trigger: "The team marks an enquiry as resolved.", action: "Contact Olentra", path: "/#contact",
    copy: [
      ["Enquiry resolved · {{enquiryId}}", "A closing summary for {{enquirySubject}}.", "Your enquiry has been resolved", "We have marked your enquiry about {{enquirySubject}} as resolved.", "{{resolutionSummary}}", "If you need further assistance, please refer to {{enquiryId}} when contacting us."],
      ["Resolution summary for your enquiry", "A resolution update for {{enquirySubject}}.", "Thank you for the conversation", "We have wrapped up enquiry {{enquiryId}} about {{enquirySubject}}.", "{{resolutionSummary}}", "If something else comes up, you are welcome to get back in touch."],
      ["Closed: {{enquiryId}}", "Your enquiry has been marked resolved.", "Enquiry resolved", "{{enquirySubject}}", "{{resolutionSummary}}"],
    ],
  }),
  defineType({
    id: "account.registered", title: "Intern registration welcome", category: "Accounts", audience: "users", recipient: "Newly registered applicant / intern", trigger: "An applicant completes account registration; this is separate from submitting an application.", action: "Open your portal", path: "/intern/portal",
    copy: [
      ["Welcome to your Olentra account", "Your registration is complete and your portal is ready.", "Your account has been created", "Your Olentra account registration is complete. You can now access your candidate portal to review your profile and application.", "Recruitment updates are shared separately in your application record."],
      ["Welcome to Olentra, {{recipientName}}", "Welcome to your space at Olentra.", "Welcome to your candidate workspace", "Thank you for registering with Olentra. Your candidate workspace brings your profile, application and recruitment conversations together.", "Take a moment to check your profile. Your application status will be shared separately as the review progresses."],
      ["Olentra account ready", "Registration complete. Sign in to view your portal.", "Registration complete", "Your account is ready. Open your portal to review your profile and application status.", "Your application decision is managed separately in the portal."],
    ],
  }),
  defineType({
    id: "account.signin-link", title: "Sign-in link", category: "Accounts", audience: "users", recipient: "Applicant / intern requesting access", trigger: "A candidate requests a secure sign-in link or submits an application for an existing account.", action: "Sign in to your portal", path: "/intern/login?token=preview-only",
    copy: [
      ["Your Olentra Candidate Portal Sign-In Link", "Use this link to access your candidate portal.", "Sign in to Olentra", "A sign-in link was requested for your Olentra account. Use the button below to access your candidate portal.", "Keep this link private. If you did not request it, you can ignore this message."],
      ["Your requested Olentra sign-in link", "Your requested portal sign-in link is ready.", "Welcome back", "You asked for a way to access your Olentra portal. Use the secure sign-in link below to continue.", "This link is just for you. If the request was not yours, there is nothing you need to do."],
      ["Sign-in link for your Olentra account", "Your requested secure sign-in link.", "Your sign-in link", "Use the link below to sign in to your Olentra portal.", "Do not share the link. Ignore this email if you did not request it."],
    ],
  }),
  defineType({
    id: "account.password-reset", title: "Password reset", category: "Accounts", audience: "users", recipient: "Account holder requesting a reset", trigger: "An account holder requests a password reset.", action: "Reset password", path: "/intern/reset-password?token=preview-only",
    copy: [
      ["Reset your Olentra password", "Your password reset link expires in one hour.", "Password reset requested", "We received a request to reset the password for your Olentra account. Use the link below to choose a new password.", "This link expires in one hour. If you did not make this request, ignore this email; your password has not changed."],
      ["Your Olentra password reset request", "Choose a new password using your requested reset link.", "Reset your account password", "If you need a new password, use the reset link below. It will be available for one hour.", "If you did not request this reset, no action is required. Your current password remains unchanged."],
      ["Olentra password reset link", "Valid for one hour.", "Reset your password", "Use this link to set a new password. It expires in one hour.", "If you did not request a reset, ignore this message. Your password has not changed."],
    ],
  }),
  defineType({
    id: "account.password-changed", title: "Password changed", category: "Accounts", audience: "users", recipient: "Account holder", trigger: "An account password is successfully changed.", action: "Review account access", path: "/intern/login",
    copy: [
      ["Your Olentra password was changed", "Confirmation of a password update on your account.", "Password change confirmed", "The password for your Olentra account has been updated successfully.", "If you did not make this change, contact the Olentra team and use the password reset process to secure your account."],
      ["Your account password has been updated", "Your Olentra account password has been updated.", "Your password update is complete", "We are letting you know that your Olentra password has changed. You can use your new password the next time you sign in.", "If this was not you, please contact our team and reset your password as soon as you can."],
      ["Olentra password updated", "A password change was completed.", "Password changed", "Your account password has been changed.", "If you did not authorize this, contact Olentra and reset your password."],
    ],
  }),
  defineType({
    id: "application.received", title: "Application received", category: "Applications", audience: "users", recipient: "Internship applicant", trigger: "A new internship application is submitted successfully.", action: "View your application", path: "/intern/portal/application",
    copy: [
      ["Application received · {{programName}}", "Your Olentra application reference is {{applicationId}}.", "Thank you for your application", "We have received your application for {{programName}}. Your reference is {{applicationId}}.", "Our team will review your submission. You can follow your application status and any requests for information in your candidate portal."],
      ["Thanks for applying to {{programName}}", "Your application is with the Olentra team.", "Your application journey with Olentra", "Thank you for sharing your interest in {{programName}}. We have received application {{applicationId}}.", "We look forward to learning more about you. Visit your portal to keep up with the review and any next steps."],
      ["Received: {{applicationId}}", "Your {{programName}} application has been submitted.", "Application received", "Program: {{programName}}. Reference: {{applicationId}}.", "Track the review and next steps in your candidate portal."],
    ],
  }),
  defineType({
    id: "application.new-alert", title: "New internship application", category: "Applications", audience: "team", recipient: "Olentra recruitment team", trigger: "A candidate submits a new internship application.", action: "Review application", path: "/intern/dashboard/applications/APP-2048",
    copy: [
      ["New application: {{candidateName}} · {{programName}}", "Application {{applicationId}} is ready for review.", "A new candidate has applied", "{{candidateName}} has submitted application {{applicationId}} for {{programName}}.", "Review the candidate profile and supporting information before updating the application stage."],
      ["Meet a new {{programName}} applicant", "{{candidateName}} would like to join the program.", "A new candidate to get to know", "{{candidateName}} has applied to {{programName}}. Their application is ready for your first look.", "Open {{applicationId}} to review their interests and decide what should happen next."],
      ["New applicant · {{applicationId}}", "{{candidateName}} applied to {{programName}}.", "Application awaiting review", "Candidate: {{candidateName}}", "Program: {{programName}} · Reference: {{applicationId}}"],
    ],
  }),
  defineType({
    id: "application.under-review", title: "Application under review", category: "Applications", audience: "users", recipient: "Internship applicant", trigger: "An application moves to Under Review or Screening.", action: "View application status", path: "/intern/portal/application",
    copy: [
      ["Your {{programName}} application is under review", "We are reviewing application {{applicationId}}.", "Application review in progress", "Your application for {{programName}} has moved to the review stage.", "The recruitment team is assessing your submission. We will share any decisions or requests through your application record."],
      ["We’re getting to know your application", "An update on your interest in {{programName}}.", "Your application is being reviewed", "Our team is taking a closer look at your {{programName}} application, {{applicationId}}.", "Thank you for your patience while we review it. Your portal will show any next steps that need your attention."],
      ["Under review: {{applicationId}}", "Your application has entered the review stage.", "Review in progress", "Your {{programName}} application is now under review.", "Check your portal for decisions and information requests."],
    ],
  }),
  defineType({
    id: "application.shortlisted", title: "Application shortlisted", category: "Applications", audience: "users", recipient: "Shortlisted applicant", trigger: "An application is moved to Shortlisted.", action: "Review next steps", path: "/intern/portal/application",
    copy: [
      ["You have been shortlisted for {{programName}}", "An update on application {{applicationId}}.", "Your application has been shortlisted", "Following our initial review, your application for {{programName}} has been shortlisted.", "Please check your candidate portal for the next steps. Shortlisting is a review milestone and does not yet constitute an internship offer."],
      ["A step forward with {{programName}}", "Your application has made the shortlist.", "We’d like to keep the conversation going", "Your {{programName}} application has been shortlisted. We appreciated the opportunity to learn about your interests and experience.", "Open your portal to see what comes next. A final selection or offer will be communicated separately."],
      ["Shortlisted · {{applicationId}}", "Your {{programName}} application has progressed.", "You are shortlisted", "Your application for {{programName}} is shortlisted.", "See your portal for next steps. This is not an internship offer."],
    ],
  }),
  defineType({
    id: "application.interview-stage", title: "Interview-stage update", category: "Applications", audience: "users", recipient: "Applicant moving to the interview stage", trigger: "A dashboard application moves to Interview; no interview is scheduled by this event.", action: "View stage update", path: "/intern/portal/application",
    copy: [
      ["Interview-stage update · {{programName}}", "Application {{applicationId}} has progressed to Interview.", "Your application is at the interview stage", "Your application for {{programName}} has moved to the interview stage.", "This message confirms the stage change only. The recruitment team will share any arrangements separately; no date or meeting is confirmed here."],
      ["The next conversation about {{programName}}", "Your application is moving to the interview stage.", "We’re ready for the next stage", "Your application, {{applicationId}}, is now at the interview stage. We look forward to continuing the conversation.", "This is a stage update. Our team will be in touch separately about any arrangements."],
      ["Interview stage · {{applicationId}}", "Stage updated; arrangements will follow separately.", "Interview stage", "Your {{programName}} application has moved to Interview.", "No meeting is scheduled by this update. Arrangements will be communicated separately."],
    ],
  }),
  defineType({
    id: "application.selected", title: "Application selected", category: "Applications", audience: "users", recipient: "Selected applicant", trigger: "An application is marked Selected.", action: "View selection details", path: "/intern/portal/application",
    copy: [
      ["Selection update for {{programName}}", "Your application {{applicationId}} has been selected.", "You have been selected", "We are pleased to confirm that your application for {{programName}} has been selected.", "Please review the selection details in your portal. Your offer and any required onboarding steps will be shared through the application workflow."],
      ["Good news about your {{programName}} application", "You have been selected for the next step with Olentra.", "We’re pleased to share this news", "Your {{programName}} application has been selected. Thank you for the effort you put into introducing yourself to us.", "Head to your portal for the selection details and keep an eye out for your offer and onboarding steps."],
      ["Selected · {{applicationId}}", "Your {{programName}} application has been selected.", "Application selected", "You have been selected for {{programName}}.", "Review your portal for offer details and required next steps."],
    ],
  }),
  defineType({
    id: "application.rejected", title: "Application not selected", category: "Applications", audience: "users", recipient: "Applicant receiving a rejection decision", trigger: "An application is rejected or receives a declined review decision.", action: "View application decision", path: "/intern/portal/application",
    copy: [
      ["An update on your {{programName}} application", "A decision on application {{applicationId}}.", "Thank you for your interest", "Thank you for applying to {{programName}}. After reviewing your application, we will not be progressing it for this intake.", "{{decisionNote}}", "We appreciate the time you invested in applying to Olentra."],
      ["Thank you for applying to Olentra", "An update on your application to {{programName}}.", "We appreciate the time you shared with us", "Thank you for telling us about your experience and interests. We are sorry that we cannot move forward with your {{programName}} application this time.", "{{decisionNote}}", "We wish you well in your next opportunity."],
      ["Application decision · {{applicationId}}", "We are not progressing your application for this intake.", "Application decision", "Your application for {{programName}} has not been selected.", "{{decisionNote}}", "Thank you for your time and interest."],
    ],
  }),
  defineType({
    id: "application.information-request", title: "Additional information requested", category: "Applications", audience: "users", recipient: "Applicant whose submission needs more information", trigger: "The recruitment team requests information from an applicant.", action: "Respond in your portal", path: "/intern/portal/application",
    copy: [
      ["Information required · {{applicationId}}", "Please provide additional details for your {{programName}} application.", "We need a little more information", "To continue reviewing your application for {{programName}}, please provide the following information.", "{{requestedInformation}}", "Submit your response through the application conversation so the review team can keep it with your record."],
      ["Help us complete your application review", "A small follow-up about {{programName}}.", "A little more detail would help", "We are reviewing your {{programName}} application and would like to understand a few details better.", "{{requestedInformation}}", "You can share your response in the portal. Thank you for helping us complete the picture."],
      ["Action needed: {{applicationId}}", "Additional application information requested.", "Please provide these details", "{{requestedInformation}}", "Add your response to your {{programName}} application conversation."],
    ],
  }),
  defineType({
    id: "offer.ready", title: "Internship offer ready", category: "Offers", audience: "users", recipient: "Selected applicant", trigger: "The team issues an internship offer.", action: "Review your offer", path: "/intern/portal/application",
    copy: [
      ["Your {{programName}} offer is ready", "Review the offer and record your decision in the portal.", "An internship offer from Olentra", "We are pleased to share your offer for {{programName}}.", "{{offerSummary}}", "Please read the complete offer in your portal before accepting or declining. The portal contains the authoritative terms and next steps."],
      ["We’d love to welcome you to {{programName}}", "Your internship offer is waiting in your portal.", "Your offer is here", "We are pleased to offer you an internship with {{programName}} and look forward to the possibility of working together.", "{{offerSummary}}", "Please review the complete offer and record your decision through your candidate portal."],
      ["Offer ready · {{programName}}", "Review and respond in your candidate portal.", "Your internship offer", "{{offerSummary}}", "Read the full terms and accept or decline the offer in your portal."],
    ],
  }),
  defineType({
    id: "offer.accepted", title: "Offer accepted", category: "Offers", audience: "team", recipient: "Recruitment / onboarding team", trigger: "A candidate accepts an internship offer.", action: "Review accepted offer", path: "/intern/dashboard/applications/APP-2048",
    copy: [
      ["Offer accepted: {{candidateName}}", "{{programName}} · application {{applicationId}}.", "A candidate has accepted their offer", "{{candidateName}} has accepted the offer for {{programName}}.", "Review application {{applicationId}} and coordinate the required onboarding steps before confirming joining."],
      ["{{candidateName}} accepted their internship offer", "The {{programName}} offer has been accepted.", "Candidate acceptance confirmed", "{{candidateName}} has accepted the internship offer for {{programName}}.", "Open {{applicationId}} to help them through onboarding and confirm what is needed before they join."],
      ["Accepted offer · {{applicationId}}", "{{candidateName}} accepted {{programName}}.", "Offer accepted", "Candidate: {{candidateName}} · Program: {{programName}}", "Review the application and follow up on onboarding."],
    ],
  }),
  defineType({
    id: "offer.declined", title: "Offer declined", category: "Offers", audience: "team", recipient: "Recruitment team", trigger: "A candidate declines an internship offer.", action: "View candidate decision", path: "/intern/dashboard/applications/APP-2048",
    copy: [
      ["Offer declined: {{candidateName}}", "A candidate decision for {{programName}}.", "An offer has been declined", "{{candidateName}} has declined the internship offer for {{programName}}.", "Review application {{applicationId}} and update any recruitment follow-up or intake planning as appropriate."],
      ["An offer update from {{candidateName}}", "The candidate has chosen not to accept {{programName}}.", "A decision from the candidate", "{{candidateName}} has let us know they will not be accepting the {{programName}} offer.", "Their decision is recorded in {{applicationId}}. Please review it before planning any follow-up."],
      ["Declined offer · {{applicationId}}", "{{candidateName}} declined {{programName}}.", "Offer declined", "Candidate: {{candidateName}} · Program: {{programName}}", "The decision is available in the application record."],
    ],
  }),
  defineType({
    id: "onboarding.submitted", title: "Onboarding submitted", category: "Onboarding", audience: "team", recipient: "Onboarding reviewer", trigger: "An intern submits onboarding details for review.", action: "Review onboarding", path: "/intern/dashboard/applications/APP-2048",
    copy: [
      ["Onboarding ready for review: {{candidateName}}", "New onboarding submission for {{programName}}.", "Onboarding review requested", "{{candidateName}} has submitted their onboarding information for {{programName}}.", "{{onboardingSummary}}", "Review the record before approving the intern to join."],
      ["{{candidateName}} is ready for an onboarding check", "Their {{programName}} onboarding details are with us.", "Help them take the next step", "{{candidateName}} has completed their onboarding submission for {{programName}}.", "{{onboardingSummary}}", "Take a look and confirm whether everything is ready for approval."],
      ["Review onboarding · {{candidateName}}", "Submitted for {{programName}}.", "Onboarding submitted", "{{onboardingSummary}}", "Review {{candidateName}}’s record and approve when requirements are met."],
    ],
  }),
  defineType({
    id: "onboarding.approved", title: "Onboarding approved / welcome", category: "Onboarding", audience: "users", recipient: "Approved intern", trigger: "The team approves onboarding and the candidate joins.", action: "Open your intern portal", path: "/intern/portal",
    copy: [
      ["Onboarding approved · {{programName}}", "Your onboarding review is complete.", "Welcome to your internship", "Your onboarding for {{programName}} has been approved. You are now ready to begin your internship with Olentra.", "Visit your intern portal to review your program information, assigned projects and any first steps from your coordinator."],
      ["Welcome to the team, {{recipientName}}", "You are ready to start your {{programName}} journey.", "We’re glad you’re joining us", "Your onboarding is approved, and we are happy to welcome you to {{programName}}.", "Your portal is your home for projects, tasks and conversations. Open it to see what your coordinator has prepared for you."],
      ["Ready to join · {{programName}}", "Onboarding approved. Your intern portal is ready.", "Onboarding approved", "You have joined {{programName}}.", "Check your intern portal for projects, tasks and next steps."],
    ],
  }),
  defineType({
    id: "project.assigned", title: "Project assigned", category: "Projects and tasks", audience: "users", recipient: "Assigned intern", trigger: "An intern is assigned to a project.", action: "View project", path: "/intern/portal/projects/PRJ-102",
    copy: [
      ["Project assignment: {{projectName}}", "Please review your project brief and assigned work.", "A project has been assigned to you", "You have been assigned to {{projectName}}.", "{{projectSummary}}", "Review the project brief, team responsibilities and related tasks in your portal."],
      ["Project allocation: {{projectName}}", "A new opportunity to contribute at Olentra.", "Your project assignment", "You are now part of {{projectName}}. We look forward to seeing what you bring to the work.", "{{projectSummary}}", "Start with the project brief and reach out to your coordinator if anything needs clarification."],
      ["Assigned: {{projectName}}", "Your project brief is available.", "New project assignment", "{{projectSummary}}", "Open {{projectName}} to review your tasks and responsibilities."],
    ],
  }),
  defineType({
    id: "project.updated", title: "Project updated", category: "Projects and tasks", audience: "users", recipient: "Intern assigned to the project", trigger: "Details of an assigned project are updated.", action: "Review project changes", path: "/intern/portal/projects/PRJ-102",
    copy: [
      ["Project update: {{projectName}}", "Please review the latest project information.", "Your project details have changed", "The team has updated {{projectName}}.", "{{changeSummary}}", "Review the current brief before continuing work so your next submission reflects these changes."],
      ["A new note about {{projectName}}", "Your project brief has an update.", "Keeping you up to date", "We have made an update to {{projectName}} and wanted to make sure you saw it.", "{{changeSummary}}", "Take a look before your next work session and ask your coordinator if you need any context."],
      ["Updated: {{projectName}}", "Check the revised project brief.", "Project update", "{{changeSummary}}", "Review the current project details before continuing."],
    ],
  }),
  defineType({
    id: "task.assigned", title: "Task assigned", category: "Projects and tasks", audience: "users", recipient: "Task assignee", trigger: "A task is assigned to an intern.", action: "Open task", path: "/intern/portal/projects/PRJ-102/tasks/TASK-208",
    copy: [
      ["New task: {{taskName}}", "{{projectName}} · due {{dueDate}}.", "A task has been assigned to you", "You have been assigned {{taskName}} for {{projectName}}.", "{{taskInstructions}}", "The due date is {{dueDate}}. Review the task requirements before preparing your submission."],
      ["Your next step on {{projectName}}", "A new task is ready: {{taskName}}.", "Let’s get started on your next task", "Your new task is {{taskName}}. It is part of {{projectName}}, with a due date of {{dueDate}}.", "{{taskInstructions}}", "Open the task to get the full context and share questions with your coordinator."],
      ["Assigned: {{taskName}}", "Due {{dueDate}} · {{projectName}}.", "New task", "{{taskInstructions}}", "Project: {{projectName}} · Due: {{dueDate}}"],
    ],
  }),
  defineType({
    id: "task.updated", title: "Task updated", category: "Projects and tasks", audience: "users", recipient: "Task assignee", trigger: "An assigned task’s details or due date are changed.", action: "Review task", path: "/intern/portal/projects/PRJ-102/tasks/TASK-208", samples: { changeSummary: "Please include a mobile walkthrough in addition to the desktop review." },
    copy: [
      ["Task update: {{taskName}}", "Review the revised requirements and due date.", "Your task has been updated", "The details for {{taskName}} in {{projectName}} have changed.", "{{changeSummary}}", "The current due date is {{dueDate}}. Refer to the task record for the full requirements."],
      ["A quick update to {{taskName}}", "Here is what has changed on your task.", "A little context before you continue", "There is an update to {{taskName}} in {{projectName}}.", "{{changeSummary}}", "Your task now shows {{dueDate}} as the due date. Please check the record before your next submission."],
      ["Updated: {{taskName}}", "Current due date: {{dueDate}}.", "Task updated", "{{changeSummary}}", "Project: {{projectName}} · Due: {{dueDate}}"],
    ],
  }),
  defineType({
    id: "submission.received", title: "Work submitted for review", category: "Work reviews", audience: "team", recipient: "Task reviewer / coordinator", trigger: "An intern submits work for a task.", action: "Review submission", path: "/intern/dashboard/projects/PRJ-102/tasks/TASK-208",
    copy: [
      ["Submission ready: {{taskName}}", "{{candidateName}} has submitted work for {{projectName}}.", "A submission is awaiting review", "{{candidateName}} has submitted work for {{taskName}} in {{projectName}}.", "{{submissionSummary}}", "Review the deliverables and record either approval or the changes required."],
      ["{{candidateName}} has work to share", "A new submission for {{taskName}} is ready.", "Take a look at their latest work", "{{candidateName}} has sent in their work for {{taskName}}, part of {{projectName}}.", "{{submissionSummary}}", "Your feedback will help them understand what is working and what to improve next."],
      ["Review needed: {{taskName}}", "Submission from {{candidateName}}.", "New submission", "{{submissionSummary}}", "Submitted by {{candidateName}} for {{projectName}}. Review and record your decision."],
    ],
  }),
  defineType({
    id: "submission.approved", title: "Submission approved", category: "Work reviews", audience: "users", recipient: "Intern who submitted the work", trigger: "A reviewer approves an intern’s submission.", action: "View review feedback", path: "/intern/portal/projects/PRJ-102/tasks/TASK-208",
    copy: [
      ["Submission approved: {{taskName}}", "Your work for {{projectName}} has passed review.", "Your submission has been approved", "The reviewer has approved your submission for {{taskName}}.", "{{reviewFeedback}}", "Review the recorded feedback and check your project for the next assigned task."],
      ["Nice work on {{taskName}}", "Your submission has been approved.", "Your effort has paid off", "Your work on {{taskName}} is approved. Thank you for the care you put into your submission.", "{{reviewFeedback}}", "You can find the review in your portal and see what is next on {{projectName}}."],
      ["Approved: {{taskName}}", "Review complete for your submission.", "Submission approved", "{{reviewFeedback}}", "Open the task to review the decision and your next steps."],
    ],
  }),
  defineType({
    id: "submission.changes-requested", title: "Submission changes requested", category: "Work reviews", audience: "users", recipient: "Intern who submitted the work", trigger: "A reviewer returns a submission with requested changes.", action: "Review requested changes", path: "/intern/portal/projects/PRJ-102/tasks/TASK-208",
    copy: [
      ["Changes requested: {{taskName}}", "Please revise your submission using the review feedback.", "Your submission needs revision", "The reviewer has requested changes to your submission for {{taskName}}.", "{{changesRequested}}", "Review all feedback, update your work and submit the revised version through the task record."],
      ["A few next steps for {{taskName}}", "Feedback is ready to help you improve your submission.", "Let’s build on your first submission", "Thank you for sharing your work on {{taskName}}. The reviewer has a few changes for you to work through.", "{{changesRequested}}", "Take a look at the feedback, ask if anything is unclear, and send the updated work when it is ready."],
      ["Revision needed: {{taskName}}", "Check the review before resubmitting.", "Changes requested", "{{changesRequested}}", "Update your submission and resubmit it in the task record."],
    ],
  }),
  defineType({
    id: "internship.completed", title: "Internship completed", category: "Internship and certificates", audience: "users", recipient: "Intern who completed the program", trigger: "An internship is marked Completed after the required work is approved.", action: "View completion details", path: "/intern/portal",
    copy: [
      ["Completion confirmed · {{programName}}", "Your internship completion date is {{completionDate}}.", "Your internship is complete", "We confirm that you have completed {{programName}} as of {{completionDate}}.", "Thank you for your contribution to Olentra. Review your portal for the completion record and any certificate updates."],
      ["Congratulations on completing {{programName}}", "Thank you for the work you shared with Olentra.", "A milestone worth celebrating", "You have completed {{programName}} on {{completionDate}}. We appreciate the effort, learning and ideas you brought to the program.", "Your completion details are in your portal. We wish you the best as you take your next step."],
      ["Completed: {{programName}}", "Completion recorded on {{completionDate}}.", "Internship complete", "You completed {{programName}} on {{completionDate}}.", "View your completion record and certificate updates in the portal."],
    ],
  }),
  defineType({
    id: "internship.status-updated", title: "Internship status changed", category: "Internship and certificates", audience: "users", recipient: "Intern affected by a status change", trigger: "An internship status changes outside onboarding approval or completion.", action: "Review internship status", path: "/intern/portal",
    copy: [
      ["Internship status update · {{programName}}", "Your current status is {{internshipStatus}}.", "Your internship status has changed", "Your status in {{programName}} has been updated to {{internshipStatus}}.", "{{statusNote}}", "Review the record and contact your coordinator if you need clarification."],
      ["An update on your time with {{programName}}", "Please review a change to your internship status.", "Keeping you informed", "Your {{programName}} internship now shows the status {{internshipStatus}}.", "{{statusNote}}", "Your coordinator can help if you have questions about what this means for your next steps."],
      ["Status: {{internshipStatus}} · {{programName}}", "Your internship record has been updated.", "Internship status updated", "{{statusNote}}", "Current status: {{internshipStatus}}. Review your portal for details."],
    ],
  }),
  defineType({
    id: "certificate.issued", title: "Certificate issued", category: "Internship and certificates", audience: "users", recipient: "Eligible intern", trigger: "A completion certificate is issued.", action: "View certificate", path: "/intern/portal/certificates",
    copy: [
      ["Your {{programName}} certificate is ready", "Certificate reference: {{certificateId}}.", "Certificate issued", "Your completion certificate for {{programName}} has been issued with reference {{certificateId}}.", "Open your portal to review the certificate details and access the available certificate document."],
      ["A record of your achievement with Olentra", "Your {{programName}} certificate is ready to view.", "Your certificate is here", "Your work on {{programName}} now has its completion certificate, {{certificateId}}.", "Open your portal to review it. Thank you again for the contribution you made during your internship."],
      ["Certificate ready · {{certificateId}}", "Issued for {{programName}}.", "Your certificate is ready", "Program: {{programName}} · Certificate: {{certificateId}}", "View the certificate and its details in your portal."],
    ],
  }),
  defineType({
    id: "certificate.revoked", title: "Certificate revoked", category: "Internship and certificates", audience: "users", recipient: "Certificate holder", trigger: "An issued certificate is revoked.", action: "Review certificate status", path: "/intern/portal/certificates",
    copy: [
      ["Certificate status update · {{certificateId}}", "Your certificate has been marked revoked.", "Certificate revocation notice", "Certificate {{certificateId}} for {{programName}} has been revoked and should no longer be presented as valid.", "{{revocationReason}}", "Contact your coordinator if you require clarification about this change."],
      ["Please review an update to your certificate", "An important change to certificate {{certificateId}}.", "We need to let you know about a change", "Your {{programName}} certificate, {{certificateId}}, has been marked revoked. Please stop using this version as a valid certificate.", "{{revocationReason}}", "Your coordinator can help you understand the next steps."],
      ["Revoked: {{certificateId}}", "This certificate is no longer valid.", "Certificate revoked", "{{certificateId}} for {{programName}} must no longer be used as a valid certificate.", "{{revocationReason}}"],
    ],
  }),
  defineType({
    id: "message.from-team", title: "Message from Olentra", category: "Conversations", audience: "users", recipient: "Applicant / intern", trigger: "A team member sends an application or internship message.", action: "Open conversation", path: "/intern/portal/application",
    copy: [
      ["Message from Olentra: {{messageSubject}}", "{{senderName}} has shared a message with you.", "A new message from your team", "{{senderName}} has sent you a message about {{messageSubject}}.", "{{messageBody}}", "Open your portal to read the conversation and respond."],
      ["{{senderName}} has a note for you", "A new message about {{messageSubject}}.", "Let’s keep the conversation going", "There is a new message from {{senderName}} waiting in your Olentra portal.", "{{messageBody}}", "You can reply in the conversation whenever you are ready."],
      ["{{messageSubject}} · Olentra", "New message from {{senderName}}.", "New message", "{{messageBody}}", "From {{senderName}}. Reply in your portal."],
    ],
  }),
  defineType({
    id: "message.from-intern", title: "Applicant / intern reply", category: "Conversations", audience: "team", recipient: "Olentra recruitment / internship team", trigger: "An applicant or intern replies in a portal conversation.", action: "Read and reply", path: "/intern/dashboard/applications/APP-2048", samples: { messageBody: "Thank you for the feedback. I have added the requested context and would appreciate your review." },
    copy: [
      ["Reply from {{candidateName}}: {{messageSubject}}", "A new response is available on application {{applicationId}}.", "A candidate has replied", "{{candidateName}} has added a reply to the conversation about {{messageSubject}}.", "{{messageBody}}", "Review the message in application {{applicationId}} and respond if needed."],
      ["{{candidateName}} has an update for us", "The conversation about {{messageSubject}} has a new reply.", "There’s a new note in the conversation", "{{candidateName}} has responded and is ready to continue the conversation.", "{{messageBody}}", "Open {{applicationId}} to read the context and help with the next step."],
      ["New reply · {{candidateName}}", "{{messageSubject}} · {{applicationId}}.", "Candidate reply", "{{messageBody}}", "Read and reply in application {{applicationId}}."],
    ],
  }),
  defineType({
    id: "announcement.program", title: "Program announcement", category: "Conversations", audience: "users", recipient: "Interns in the selected program audience", trigger: "The team publishes an announcement to a program audience.", action: "View program announcement", path: "/intern/portal",
    copy: [
      ["{{programName}}: {{announcementTitle}}", "An announcement from the Olentra program team.", "Program announcement", "The team has shared an update for participants in {{programName}}.", "{{announcementBody}}", "Review the full announcement in your portal and note any actions that apply to you."],
      ["An update for our {{programName}} community", "{{announcementTitle}} is ready to read.", "An update from your program team", "We have a program update to share: {{announcementTitle}}.", "{{announcementBody}}", "Take a look in your portal and reach out to your coordinator if you have questions."],
      ["{{announcementTitle}} · {{programName}}", "A new program announcement.", "Program update", "{{announcementBody}}", "See the announcement in your portal for the full details."],
    ],
  }),
  defineType({
    id: "team.invitation", title: "Team invitation", category: "Team access", audience: "team", recipient: "Invited team member", trigger: "An administrator invites someone to the company workspace.", action: "Open workspace", path: "/dashboard/login",
    copy: [
      ["You are invited to the Olentra workspace", "An invitation to join as {{roleName}}.", "Company workspace invitation", "{{senderName}} has invited you to join the Olentra company workspace with the {{roleName}} role.", "Review the invitation before accepting. Your workspace access will follow the permissions assigned to this role."],
      ["An invitation to the Olentra company workspace", "{{senderName}} has invited you to the team.", "You’re invited", "{{senderName}} would like you to join the Olentra workspace as {{roleName}}.", "Open the invitation to see the details and accept when you are ready. We look forward to working with you."],
      ["Olentra workspace invitation · {{roleName}}", "Invitation from {{senderName}}.", "Join the workspace", "You have been invited by {{senderName}} with the role {{roleName}}.", "Review and accept the invitation to continue."],
    ],
  }),
  defineType({
    id: "team.invitation-accepted", title: "Team invitation accepted", category: "Team access", audience: "team", recipient: "Workspace administrator", trigger: "An invited team member accepts their workspace invitation.", action: "View team member", path: "/dashboard/team",
    copy: [
      ["Workspace invitation accepted: {{candidateName}}", "The new team member has joined as {{roleName}}.", "A team member has accepted their invitation", "{{candidateName}} has accepted the invitation to join the Olentra workspace as {{roleName}}.", "Review the member record and confirm that their assigned access matches their responsibilities."],
      ["{{candidateName}} has joined the workspace", "A new {{roleName}} is ready to get started.", "Welcome your new teammate", "{{candidateName}} accepted the workspace invitation and has joined with the {{roleName}} role.", "Check their member record and help them get familiar with the work they will be doing."],
      ["Invitation accepted · {{candidateName}}", "Joined with role {{roleName}}.", "Team member joined", "{{candidateName}} accepted the Olentra workspace invitation.", "Role: {{roleName}}. Review the member’s assigned access."],
    ],
  }),
  defineType({
    id: "team.access-updated", title: "Team access changed", category: "Team access", audience: "team", recipient: "Affected team member", trigger: "A team member’s role or workspace access is changed.", action: "Review workspace access", path: "/dashboard/account",
    copy: [
      ["Your Olentra workspace access has changed", "An update to your role or permissions.", "Workspace access updated", "An administrator has updated your workspace access. Your assigned role is {{roleName}}.", "{{accessSummary}}", "Contact a workspace administrator if these changes do not match your responsibilities."],
      ["A note about your workspace access", "Please review your updated Olentra permissions.", "Your workspace access has been updated", "Your Olentra workspace access has been updated, with {{roleName}} as your assigned role.", "{{accessSummary}}", "If you need help understanding the change, your workspace administrator can walk you through it."],
      ["Access updated · {{roleName}}", "Your workspace permissions have changed.", "Access changed", "{{accessSummary}}", "Current role: {{roleName}}. Contact an administrator with any questions."],
    ],
  }),
  defineType({
    id: "approval.requested", title: "Approval requested", category: "Approvals", audience: "team", recipient: "Authorized reviewer", trigger: "A workspace change is submitted for approval.", action: "Review change request", path: "/dashboard/approvals/CHG-104",
    copy: [
      ["Approval requested: {{requestTitle}}", "{{requesterName}} has submitted a change for review.", "A change requires your review", "{{requesterName}} has requested approval for {{requestTitle}}.", "{{approvalReason}}", "Compare the proposed change with the current version before approving, rejecting or requesting revisions."],
      ["Review requested: {{requestTitle}}", "A request from {{requesterName}} is ready for your feedback.", "A proposal is ready for your review", "{{requesterName}} has shared {{requestTitle}} for approval.", "{{approvalReason}}", "Take a look at the proposal and leave a clear decision or guidance on what needs to change."],
      ["Review needed: {{requestTitle}}", "Requested by {{requesterName}}.", "Approval needed", "{{approvalReason}}", "Review the proposed change and record your decision."],
    ],
  }),
  defineType({
    id: "approval.approved", title: "Change approved", category: "Approvals", audience: "team", recipient: "Change requester", trigger: "A reviewer approves a pending change.", action: "View approval decision", path: "/dashboard/approvals/CHG-104",
    copy: [
      ["Approved: {{requestTitle}}", "{{reviewerName}} has approved your change request.", "Your change has been approved", "{{reviewerName}} approved the request for {{requestTitle}}.", "{{reviewNote}}", "Open the approval record to review the decision and resulting workflow status."],
      ["Good news for {{requestTitle}}", "Your change request has been approved.", "Your proposal has been approved", "{{reviewerName}} has approved {{requestTitle}}. Thank you for preparing the change for review.", "{{reviewNote}}", "The approval record has the full decision and the latest status."],
      ["Approval complete · {{requestTitle}}", "Approved by {{reviewerName}}.", "Change approved", "{{reviewNote}}", "View the approval record for the resulting status."],
    ],
  }),
  defineType({
    id: "approval.rejected", title: "Change rejected", category: "Approvals", audience: "team", recipient: "Change requester", trigger: "A reviewer rejects a pending change.", action: "Read reviewer decision", path: "/dashboard/approvals/CHG-104",
    copy: [
      ["Change not approved: {{requestTitle}}", "{{reviewerName}} has recorded a rejection decision.", "Your request was not approved", "The request for {{requestTitle}} was rejected by {{reviewerName}}.", "{{rejectionNote}}", "Review the reason before preparing any new proposal."],
      ["Feedback on {{requestTitle}}", "Please review the decision from {{reviewerName}}.", "A decision on your proposal", "{{reviewerName}} has reviewed {{requestTitle}} and cannot approve the current proposal.", "{{rejectionNote}}", "The decision record provides context to help you consider a revised approach."],
      ["Rejected · {{requestTitle}}", "Review the reason before submitting a new proposal.", "Change rejected", "{{rejectionNote}}", "Decision recorded by {{reviewerName}}."],
    ],
  }),
  defineType({
    id: "approval.changes-requested", title: "Approval changes requested", category: "Approvals", audience: "team", recipient: "Change requester", trigger: "A reviewer requests revisions to a pending proposal.", action: "Review requested revisions", path: "/dashboard/approvals/CHG-104",
    copy: [
      ["Revisions required: {{requestTitle}}", "{{reviewerName}} has requested changes before approval.", "Please revise your proposal", "The review of {{requestTitle}} is awaiting revisions requested by {{reviewerName}}.", "{{revisionNote}}", "Update the proposal and submit the revised version for review."],
      ["Review feedback for {{requestTitle}}", "Your reviewer has shared a few changes to work through.", "Revisions requested before approval", "{{reviewerName}} has reviewed {{requestTitle}} and left guidance for the next version.", "{{revisionNote}}", "Once you have addressed the feedback, send the revised proposal back for review."],
      ["Changes needed · {{requestTitle}}", "Revisions requested by {{reviewerName}}.", "Revise and resubmit", "{{revisionNote}}", "Update the proposal and submit it again for approval."],
    ],
  }),
  defineType({
    id: "incident.alert", title: "Incident alert", category: "Monitoring", audience: "team", recipient: "Operations responders", trigger: "A monitored incident is opened or an alert rule is triggered.", action: "Review incident", path: "/dashboard/monitoring/incidents/contact-delivery",
    copy: [
      ["{{incidentSeverity}} priority: {{incidentTitle}}", "An incident requires operational review.", "Incident reported", "An incident has been recorded with {{incidentSeverity}} priority: {{incidentTitle}}.", "{{incidentSummary}}", "Review the incident, confirm ownership and record the response steps."],
      ["Team attention needed: {{incidentTitle}}", "Please review this {{incidentSeverity}} priority incident.", "Operational attention required", "The operations workspace has a new incident that needs attention: {{incidentTitle}}.", "{{incidentSummary}}", "Priority is {{incidentSeverity}}. Open the record to coordinate ownership and the next response."],
      ["[{{incidentSeverity}}] {{incidentTitle}}", "Incident opened; response required.", "Incident alert", "{{incidentSummary}}", "Review ownership and response steps in the incident record."],
    ],
  }),
  defineType({
    id: "incident.updated", title: "Incident updated", category: "Monitoring", audience: "team", recipient: "Operations responders", trigger: "An existing incident receives a status or response update.", action: "View incident update", path: "/dashboard/monitoring/incidents/contact-delivery",
    copy: [
      ["Incident update: {{incidentTitle}}", "New response information is available.", "Incident response update", "The incident record for {{incidentTitle}} has been updated.", "{{incidentUpdate}}", "Review the timeline before taking further action to keep the response coordinated."],
      ["The latest on {{incidentTitle}}", "An update for everyone working on the response.", "Current incident response", "There is new information about {{incidentTitle}}.", "{{incidentUpdate}}", "Check the incident timeline so the team can keep working from the same information."],
      ["Updated · {{incidentTitle}}", "Review the latest response notes.", "Incident updated", "{{incidentUpdate}}", "See the incident record for the current response status."],
    ],
  }),
  defineType({
    id: "incident.resolved", title: "Incident resolved", category: "Monitoring", audience: "team", recipient: "Operations responders", trigger: "An incident is marked Resolved.", action: "View resolution", path: "/dashboard/monitoring/incidents/contact-delivery",
    copy: [
      ["Resolved: {{incidentTitle}}", "The incident has been closed with a recorded resolution.", "Incident resolved", "The incident {{incidentTitle}} has been marked resolved.", "{{incidentResolution}}", "Review the resolution and any follow-up actions recorded in the incident timeline."],
      ["An update: {{incidentTitle}} is resolved", "Thank you to everyone who helped with the response.", "The incident is resolved", "The team has resolved {{incidentTitle}}.", "{{incidentResolution}}", "Please check the closing notes for any follow-up work and learning from the response."],
      ["Resolution confirmed · {{incidentTitle}}", "Review the closing notes and follow-up actions.", "Incident closed", "{{incidentResolution}}", "The incident is marked resolved. See the record for follow-up work."],
    ],
  }),
  defineType({
    id: "publishing.completed", title: "Publication completed", category: "Publishing and backups", audience: "team", recipient: "Content / program owner", trigger: "Approved content, program, SEO or translation changes are published in the workspace workflow.", action: "View published record", path: "/dashboard/content",
    copy: [
      ["Published: {{publishedTitle}}", "The {{publishedKind}} publication workflow is complete.", "Publication completed", "The approved {{publishedKind}} change for {{publishedTitle}} has completed its workspace publication workflow.", "Review the published record to verify the saved version and any remaining follow-up."],
      ["{{publishedTitle}} is ready to review", "Your approved change has completed publication in the workspace.", "Your publication step is complete", "The workspace has published the approved {{publishedKind}} update for {{publishedTitle}}.", "Take a look at the resulting record and share any follow-up with the team."],
      ["Publication complete · {{publishedTitle}}", "Approved {{publishedKind}} change published in the workspace.", "Published in workspace", "{{publishedTitle}} · {{publishedKind}}", "Review the published record and its saved version."],
    ],
  }),
  defineType({
    id: "backup.created", title: "Backup created", category: "Publishing and backups", audience: "team", recipient: "Workspace administrator", trigger: "A workspace backup snapshot is created.", action: "Review backup", path: "/dashboard/settings/backups",
    copy: [
      ["Backup created: {{backupName}}", "A new workspace snapshot is available.", "Workspace backup created", "The backup {{backupName}} has been created in the workspace backup workflow.", "Review its manifest and scope before relying on it for recovery. Browser-local backups do not replace an off-device copy."],
      ["Your workspace snapshot is ready", "{{backupName}} is available to review.", "A new recovery point for your workspace", "The workspace has created {{backupName}}.", "Take a moment to check what the snapshot includes. Keep an exported copy separately if you need recovery beyond this browser."],
      ["Snapshot ready · {{backupName}}", "Review the backup manifest and scope.", "Backup created", "{{backupName}} is available in the workspace.", "Browser-local backup only; export separately for off-device recovery."],
    ],
  }),
  defineType({
    id: "backup.restored", title: "Backup restored", category: "Publishing and backups", audience: "team", recipient: "Workspace administrator", trigger: "A confirmed workspace backup restore completes.", action: "Review restored workspace", path: "/dashboard/settings/backups",
    copy: [
      ["Restore completed: {{backupName}}", "Restored scope: {{restoreScope}}.", "Workspace restore completed", "The workspace has been restored from {{backupName}} using the scope {{restoreScope}}.", "Review the affected settings and records to confirm the restored state meets your expectations."],
      ["Your workspace restore is complete", "{{backupName}} has been restored with your chosen scope.", "Ready to check your restored workspace", "The restore from {{backupName}} is complete. It applied the {{restoreScope}} scope.", "Please review the affected records and settings before continuing your work."],
      ["Restored · {{backupName}}", "Scope: {{restoreScope}}.", "Restore complete", "The workspace was restored from {{backupName}}.", "Scope: {{restoreScope}}. Review the restored records and settings."],
    ],
  }),
]);

export function getEmailTemplateVariant(typeId, variantId) {
  const type = EMAIL_TEMPLATE_CATALOG.find(item => item.id === typeId);
  if (!type) return undefined;
  return variantId === undefined ? type.variants.find(item => item.presetId === "professional") : type.variants.find(item => item.id === variantId);
}

/** Substitution returns plain text; callers must render it as text, never raw HTML. */
export function interpolateEmailText(text, values = {}) {
  return String(text ?? "").replace(TOKEN_PATTERN, (token, key) => Object.hasOwn(values, key) && values[key] != null ? String(values[key]) : token);
}

export function renderEmailTemplate(type, variant, values = type?.sampleValues) {
  if (!type || !variant || !type.variants.some(item => item.id === variant.id)) throw new Error("Choose a variant belonging to this email type.");
  const interpolate = text => interpolateEmailText(text, values);
  const rendered = {
    subject: interpolate(variant.subject), preheader: interpolate(variant.preheader), heading: interpolate(variant.heading),
    body: variant.body.map(interpolate), cta: { label: interpolate(variant.cta.label), url: interpolate(variant.cta.url) },
  };
  const source = type.presentation;
  rendered.presentation = {
    department: interpolate(source.department), eyebrow: interpolate(source.eyebrow),
    status: interpolate(source.status), statusTone: source.statusTone, summary: interpolate(source.summary),
    reference: { label: interpolate(source.reference.label), value: interpolate(source.reference.value) },
    details: source.details.map(item => ({ label: interpolate(item.label), value: interpolate(item.value) })),
    nextSteps: source.nextSteps.map(interpolate),
    notice: source.notice ? { title: interpolate(source.notice.title), body: interpolate(source.notice.body) } : null,
    signature: { team: interpolate(source.signature.team), role: interpolate(source.signature.role) },
  };
  const presentation = rendered.presentation;
  rendered.text = [
    `Subject: ${rendered.subject}`, rendered.preheader,
    presentation.department, presentation.eyebrow, rendered.heading,
    `${presentation.reference.label}: ${presentation.reference.value}`, `Status: ${presentation.status}`,
    presentation.summary, ...rendered.body,
    ...presentation.details.map(item => `${item.label}: ${item.value}`),
    ...(presentation.nextSteps.length ? ["Next steps", ...presentation.nextSteps.map((step, index) => `${index + 1}. ${step}`)] : []),
    ...(presentation.notice ? [presentation.notice.title, presentation.notice.body] : []),
    `${rendered.cta.label}: ${rendered.cta.url}`, presentation.signature.team, presentation.signature.role,
    "Olentra Technologies · Hyderabad, India",
    type.audience === "team" ? "An operational update for your Olentra workspace." : "You received this message in connection with your activity with Olentra.",
    "olentratechnologies.com", "Need assistance? contact@olentratechnologies.com",
  ].join("\n\n");
  return rendered;
}
