/** The authorization identity shared by all internship transports and modules. */
export type Principal = {
  id: string;
  role: "company" | "intern";
  name: string;
  email: string;
  applicationId: string | null;
  sessionVersion: number;
  staffRole?: string | null;
  permissions?: string[];
};

/** Side effects owned by the application composition root. */
export type ApplicantStatusNotice = {
  to: string;
  name: string;
  programName: string;
  status: "shortlisted" | "selected" | "offer" | "rejected" | "onboarding" | "certificate";
  certificateNumber?: string;
  roleTitle?: string;
};

export type InterviewScheduledNotice = {
  to: string;
  name: string;
  programName: string;
  scheduledAt: string;
  meetingUrl: string;
  interviewId?: string;
  sequence?: number;
  cancelReason?: string;
};

export type InternshipHooks = {
  sendMagicLink?: (to: string, name: string, applicationId: string) => Promise<unknown>;
  sendApplicationConfirmation?: (to: string, name: string, programName: string, applicationId: string) => Promise<unknown>;
  sendApplicantStatus?: (notice: ApplicantStatusNotice) => Promise<unknown>;
  sendInterviewScheduled?: (notice: InterviewScheduledNotice) => Promise<unknown>;
  sendInterviewReminder?: (notice: InterviewScheduledNotice) => Promise<unknown>;
  sendInterviewCancelled?: (notice: InterviewScheduledNotice) => Promise<unknown>;
  /** A plain reminder or digest email; `ctaPath` is a path on the website. */
  sendNotice?: (notice: { to: string; subject: string; heading: string; intro: string; items: string[]; ctaLabel: string; ctaPath: string }) => Promise<unknown>;
};
