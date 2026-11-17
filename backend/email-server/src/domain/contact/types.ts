import type { SmtpConfig } from "../../infrastructure/email/smtp.client";
export type ContactConfig = SmtpConfig & { receiver?: string; token?: string };

export type ContactFields = {
  name: string;
  email: string;
  phone: string;
  budget: string;
  message: string;
};

export type EmailAttachment = { filename: string; content: string };
