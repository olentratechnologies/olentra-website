import type { SmtpConfig } from "../infrastructure/email/smtp.client";
export type ContactEnvironment = SmtpConfig & { port: number; host: string; receiver?: string; token?: string; deliveryToken?: string };

export function readContactEnvironment(env: NodeJS.ProcessEnv = process.env): ContactEnvironment {
  const port = Number(env.PORT || 3001), smtpPort = Number(env.SMTP_PORT || 465);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("PORT must be an integer from 0 to 65535.");
  if (![465, 587].includes(smtpPort)) throw new Error("SMTP_PORT must be 465 (TLS) or 587 (STARTTLS).");
  if (env.SMTP_SECURE && env.SMTP_SECURE !== String(smtpPort === 465)) throw new Error("SMTP_SECURE must match SMTP_PORT: true for 465, false for 587.");
  const configuration = {
    port, host: env.HOST || "127.0.0.1", smtpHost: env.SMTP_HOST || "smtp.gmail.com", smtpPort, smtpSecure: smtpPort === 465,
    smtpUser: env.SMTP_USER, smtpPass: env.SMTP_PASS?.replace(/\s/g, ""), sender: env.SMTP_FROM || env.SMTP_USER,
    receiver: env.CONTACT_RECEIVER_EMAIL, token: env.CONTACT_BACKEND_TOKEN, deliveryToken: env.EMAIL_DELIVERY_TOKEN,
  };
  if (env.NODE_ENV === "production") {
    const missing = ["SMTP_USER", "SMTP_PASS", "CONTACT_RECEIVER_EMAIL", "CONTACT_BACKEND_TOKEN", "EMAIL_DELIVERY_TOKEN"].filter(name => !env[name]?.trim());
    if (missing.length) throw new Error(`Missing required email-server production configuration: ${missing.join(", ")}.`);
  }
  return configuration;
}
