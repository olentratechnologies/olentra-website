export type ContactConfig = {
  apiKey?: string;
  sender?: string;
  receiver?: string;
  token?: string;
};

export type ContactFields = {
  name: string;
  email: string;
  phone: string;
  budget: string;
  message: string;
};

export type ResendAttachment = {
  filename: string;
  content: string;
};

export type ResendEmail = {
  from?: string;
  to: string[];
  reply_to: string;
  subject: string;
  text: string;
  attachments?: ResendAttachment[];
};
