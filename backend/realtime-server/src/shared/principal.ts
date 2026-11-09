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
export type InternshipHooks = {
  sendMagicLink?: (to: string, name: string, applicationId: string) => Promise<unknown>;
  sendApplicationConfirmation?: (to: string, name: string, programName: string, applicationId: string) => Promise<unknown>;
};
