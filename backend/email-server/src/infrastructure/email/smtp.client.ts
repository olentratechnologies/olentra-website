import nodemailer from "nodemailer";

export type EmailAttachment = { filename: string; content: string; contentType?: string };
export type EmailMessage = { to: string[]; subject: string; text: string; html?: string; replyTo?: string; attachments?: EmailAttachment[] };
export type EmailSender = (message: EmailMessage) => Promise<{ id: string }>;
export type SmtpConfig = { smtpHost?: string; smtpPort?: number; smtpSecure?: boolean; smtpUser?: string; smtpPass?: string; sender?: string };
export class EmailNotConfigured extends Error {}

/** The only outbound provider connection in the application. Credentials never leave email-server. */
export function createSmtpSender(config: SmtpConfig, createTransport = nodemailer.createTransport): EmailSender {
  let transport: ReturnType<typeof nodemailer.createTransport> | undefined;
  return async message => {
    if (!config.smtpUser || !config.smtpPass || !config.sender) throw new EmailNotConfigured("Email delivery is not configured.");
    transport ||= createTransport({
      host: config.smtpHost || "smtp.gmail.com", port: config.smtpPort ?? 465, secure: config.smtpSecure ?? true, requireTLS: true,
      auth: { user: config.smtpUser, pass: config.smtpPass },
      connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000,
      disableFileAccess: true, disableUrlAccess: true,
    });
    const result = await transport.sendMail({
      from: config.sender, to: message.to, subject: message.subject, text: message.text,
      ...(message.html ? { html: message.html } : {}), ...(message.replyTo ? { replyTo: message.replyTo } : {}),
      attachments: (message.attachments || []).map(file => ({ filename: file.filename, content: Buffer.from(file.content, "base64"), contentType: file.contentType })),
      disableFileAccess: true, disableUrlAccess: true,
    });
    if (!result.messageId || !result.accepted?.length || result.rejected?.length) throw new Error("SMTP did not accept the email recipient.");
    return { id: result.messageId };
  };
}

/** Setup/readiness check; authenticates with Google without sending a message. */
export async function verifySmtp(config: SmtpConfig) {
  if (!config.smtpUser || !config.smtpPass || !config.sender) throw new EmailNotConfigured("Email delivery is not configured.");
  const transport = nodemailer.createTransport({ host: config.smtpHost || "smtp.gmail.com", port: config.smtpPort ?? 465, secure: config.smtpSecure ?? true, requireTLS: true, auth: { user: config.smtpUser, pass: config.smtpPass }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000 });
  try { await transport.verify(); } finally { transport.close(); }
}
