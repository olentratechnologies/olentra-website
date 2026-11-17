import { authorized } from "./authorization";
import { EmailNotConfigured, type EmailMessage, type EmailSender } from "../../infrastructure/email/smtp.client";
import { logger } from "../../observability/logger";

const MAX_JSON = 8 * 1024 * 1024;
const email = (value: unknown): value is string => typeof value === "string" && value.length <= 254 && !/[\r\n]/.test(value) && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
function validate(value: any): EmailMessage {
  if (!value || typeof value !== "object" || !Array.isArray(value.to) || value.to.length !== 1 || !email(value.to[0])) throw new Error("Provide one valid recipient.");
  if (typeof value.subject !== "string" || !value.subject.trim() || value.subject.length > 998 || /[\r\n]/.test(value.subject)) throw new Error("Provide a valid subject.");
  if (typeof value.text !== "string" || !value.text.trim() || value.text.length > 512_000 || (value.html !== undefined && (typeof value.html !== "string" || value.html.length > 512_000))) throw new Error("Provide a valid email message.");
  if (value.replyTo !== undefined && !email(value.replyTo)) throw new Error("Provide a valid reply-to address.");
  if (value.attachments !== undefined && (!Array.isArray(value.attachments) || value.attachments.length > 10)) throw new Error("Invalid attachments.");
  let total = 0;
  const attachments = (value.attachments || []).map((file: any) => {
    if (!file || typeof file.filename !== "string" || !file.filename || file.filename.length > 200 || /[\r\n/\\]/.test(file.filename) || typeof file.content !== "string" || (file.content.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(file.content) || Buffer.from(file.content, "base64").toString("base64") !== file.content)) throw new Error("Invalid attachment.");
    if (file.path !== undefined || file.href !== undefined || (file.contentType !== undefined && (typeof file.contentType !== "string" || file.contentType.length > 160 || /[\r\n]/.test(file.contentType)))) throw new Error("Invalid attachment type.");
    total += Buffer.from(file.content, "base64").length;
    if (total > 5 * 1024 * 1024) throw new Error("Attachments must total 5 MB or smaller.");
    return { filename: file.filename, content: file.content, contentType: file.contentType };
  });
  // Explicitly construct the envelope: callers cannot set From, CC, BCC, files or URLs.
  return { to: value.to, subject: value.subject, text: value.text, ...(value.html !== undefined ? { html: value.html } : {}), ...(value.replyTo ? { replyTo: value.replyTo } : {}), attachments };
}

export function createEmailHandler(token: string | undefined, send: EmailSender) {
  return async (request: Request) => {
    if (!authorized(request, token)) return Response.json({ error: "Unauthorized." }, { status: 401 });
    if (!request.headers.get("content-type")?.startsWith("application/json")) return Response.json({ error: "Expected JSON." }, { status: 415 });
    if (Number(request.headers.get("content-length") || 0) > MAX_JSON) return Response.json({ error: "Email is too large." }, { status: 413 });
    let message: EmailMessage;
    try {
      const reader = request.body?.getReader();
      if (!reader) throw new Error("Missing email.");
      const chunks: Uint8Array[] = []; let size = 0;
      for (;;) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.length;
        if (size > MAX_JSON) { await reader.cancel(); return Response.json({ error: "Email is too large." }, { status: 413 }); }
        chunks.push(value);
      }
      message = validate(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    } catch { return Response.json({ error: "Invalid email payload." }, { status: 400 }); }
    try {
      const { id } = await send(message);
      logger.info("Email accepted by SMTP", { messageId: id });
      return Response.json({ success: true, id }, { status: 201 });
    } catch (error) {
      // Never log bodies, activation links, SMTP passwords, or raw provider responses.
      logger.warn("Email delivery failed", { kind: error instanceof EmailNotConfigured ? "configuration" : "smtp" });
      return Response.json({ error: "Email delivery is unavailable." }, { status: error instanceof EmailNotConfigured ? 503 : 502 });
    }
  };
}
