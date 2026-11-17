import { timingSafeEqual } from 'node:crypto';
import { createSmtpSender, EmailNotConfigured, type EmailSender } from "../../infrastructure/email/smtp.client";
import type { ContactConfig } from './types';
import { MAX_BODY, jsonError, UNAUTHORIZED, readAttachment, readContactFields, validateContactFields } from './validation';

export { MAX_BODY } from './validation';
export type { ContactConfig } from './types';

export function createContactHandler(config: ContactConfig, send: EmailSender = createSmtpSender(config)) {
  // Pre-calculate token buffer once for fast constant-time verification.
  const expectedToken = config.token ? Buffer.from(`Bearer ${config.token}`) : null;

  // Single-process rolling limits; shared storage is needed when horizontally scaling.
  let attempts: number[] = [];
  let daily: number[] = [];
  return async (request: Request): Promise<Response> => {
    const authHeader = request.headers.get('authorization') || '';
    const supplied = Buffer.from(authHeader);
    if (!expectedToken || supplied.length !== expectedToken.length ||
      !timingSafeEqual(supplied, expectedToken)) return UNAUTHORIZED.clone();
    if (!config.sender || !config.receiver) return jsonError(503, 'Contact email is not configured. Please email us directly.');
    if (!request.headers.get('content-type')?.startsWith('multipart/form-data')) return jsonError(415, 'Expected a contact form.');

    const now = Date.now();
    const oneMinAgo = now - 60_000;
    const oneDayAgo = now - 86_400_000;
    if (attempts.length && attempts[0] <= oneMinAgo) {
      const idx = attempts.findIndex(t => t > oneMinAgo);
      if (idx > 0) attempts.splice(0, idx);
      else if (idx === -1) attempts.length = 0;
    }
    if (daily.length && daily[0] <= oneDayAgo) {
      const idx = daily.findIndex(t => t > oneDayAgo);
      if (idx > 0) daily.splice(0, idx);
      else if (idx === -1) daily.length = 0;
    }
    if (attempts.length >= 5 || daily.length >= 90) return jsonError(429, 'Too many requests. Please try again later or email us directly.');
    attempts.push(now);

    // Fast-path size check when Content-Length is provided
    const contentLength = request.headers.get('content-length');
    if (contentLength && Number(contentLength) > MAX_BODY) {
      return jsonError(413, 'Attachment must be 5 MB or smaller.');
    }

    try {
      if (!request.body) return jsonError(400, 'Missing form.');
      let form: FormData;
      if (contentLength && Number(contentLength) <= MAX_BODY) {
        // Native C++ multipart parsing directly from stream
        form = await request.formData();
      } else {
        const reader = request.body.getReader();
        const chunks: Uint8Array[] = [];
        let size = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > MAX_BODY) { await reader.cancel(); return jsonError(413, 'Attachment must be 5 MB or smaller.'); }
          chunks.push(value);
        }
        form = await new Response(Buffer.concat(chunks), { headers: { 'content-type': request.headers.get('content-type')! } }).formData();
      }

      const fields = readContactFields(form);
      const validationError = validateContactFields(fields);
      if (validationError) return jsonError(400, validationError);
      const parsedAttachment = await readAttachment(form);
      if (parsedAttachment.error) return jsonError(parsedAttachment.error.includes('Attachment') ? 413 : 400, parsedAttachment.error);
      const attachments = parsedAttachment.attachment ? [parsedAttachment.attachment] : [];
      // Reserve before the asynchronous send so concurrent requests cannot exceed the cap.
      daily.push(now);
      const result = await send({
        to: [config.receiver],
        replyTo: fields.email,
        subject: `New Olentra project enquiry from ${fields.name}`,
        text: `Name: ${fields.name}\nEmail: ${fields.email}\nPhone: ${fields.phone}\nBudget: ${fields.budget}\n\nProject details:\n${fields.message}`,
        ...(attachments.length ? { attachments } : {}),
      });
      if (!result.id) return jsonError(502, 'Unable to confirm your enquiry. Please email us directly.');
      return Response.json({ success: true, id: result.id }, { status: 201 });
    } catch (error) {
      if (error instanceof EmailNotConfigured) return jsonError(503, "Email delivery is not configured.");
      return jsonError(502, 'Unable to send your enquiry. Please try again later or email us directly.');
    }
  };
}
