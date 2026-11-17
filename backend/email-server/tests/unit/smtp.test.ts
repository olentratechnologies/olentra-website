import { expect, test } from "bun:test";
import { createSmtpSender } from "../../src/infrastructure/email/smtp.client";
import { readContactEnvironment } from "../../src/config/env";

test("SMTP is the only provider transport; sender, reply-to and attachment bytes are controlled", async () => {
  let options: any, message: any;
  const config = { smtpUser: "olentra@gmail.com", smtpPass: "app-password", sender: "Olentra <olentra@gmail.com>" };
  const send = createSmtpSender(config, ((input: any) => { options = input; return { sendMail: async (input: any) => { message = input; return { messageId: "smtp-123", accepted: ["intern@example.test"], rejected: [] }; } }; }) as any);
  expect(await send({ to: ["intern@example.test"], subject: "Interview", text: "Details", html: "<p>Details</p>", replyTo: "reply@example.test", attachments: [{ filename: "interview.ics", content: Buffer.from("METHOD:CANCEL").toString("base64"), contentType: "text/calendar; method=CANCEL" }] })).toEqual({ id: "smtp-123" });
  expect(options).toMatchObject({ host: "smtp.gmail.com", port: 465, secure: true, requireTLS: true, auth: { user: config.smtpUser, pass: config.smtpPass }, disableFileAccess: true, disableUrlAccess: true });
  expect(message.from).toBe(config.sender); expect(message.replyTo).toBe("reply@example.test");
  expect(message.attachments[0].content.toString()).toBe("METHOD:CANCEL");
  expect(message.attachments[0].contentType).toBe("text/calendar; method=CANCEL");
});

test("missing SMTP configuration and rejected recipients cannot acknowledge delivery", async () => {
  const mail = { to: ["intern@example.test"], subject: "Hi", text: "Hi" };
  await expect(createSmtpSender({})(mail)).rejects.toThrow("not configured");
  const send = createSmtpSender({ smtpUser: "x", smtpPass: "x", sender: "x" }, (() => ({ sendMail: async () => ({ messageId: "id", accepted: [], rejected: ["intern@example.test"] }) })) as any);
  await expect(send(mail)).rejects.toThrow("did not accept");
});

test("environment validates SMTP security and requires secrets only in email-server", () => {
  expect(readContactEnvironment({ SMTP_USER: "x@gmail.com", SMTP_PASS: "abcd efgh ijkl mnop" })).toMatchObject({ smtpHost: "smtp.gmail.com", smtpPort: 465, smtpSecure: true, smtpPass: "abcdefghijklmnop", sender: "x@gmail.com" });
  expect(readContactEnvironment({ SMTP_PORT: "587" }).smtpSecure).toBe(false);
  expect(() => readContactEnvironment({ SMTP_PORT: "587", SMTP_SECURE: "true" })).toThrow();
  expect(() => readContactEnvironment({ NODE_ENV: "production" })).toThrow("SMTP_USER");
});
