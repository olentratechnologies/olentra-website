import { timingSafeEqual } from 'node:crypto';

export const MAX_BODY = 6 * 1024 * 1024;
const budgets = ['Still Evaluating', 'Less than $5K', '$5K - $15K', '$15K - $35K', 'More than $35K'];
const BUDGET_SET = new Set(budgets);

const CRLF_RE = /[\r\n]/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+0-9()\-.\s]{7,20}$/;
const EXT_RE = /\.(pdf|doc|docx)$/i;
const SANITIZE_RE = /[\r\n/\\]/g;

const json = (status: number, error: string) => Response.json({ error }, { status });
const UNAUTHORIZED = new Response('{"error":"Unauthorized."}', { status: 401, headers: { 'content-type': 'application/json' } });
type Config = { apiKey?: string; sender?: string; receiver?: string; token?: string };

export function createContactHandler(config: Config, send: typeof fetch = fetch) {
  // Pre-calculate token buffer once for fast constant-time verification.
  const expectedToken = config.token ? Buffer.from(`Bearer ${config.token}`) : null;
  const resendHeaders = config.apiKey ? { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' } : null;

  // Single-process rolling limits; shared storage is needed when horizontally scaling.
  let attempts: number[] = [];
  let daily: number[] = [];
  return async (request: Request): Promise<Response> => {
    const authHeader = request.headers.get('authorization') || '';
    const supplied = Buffer.from(authHeader);
    if (!expectedToken || supplied.length !== expectedToken.length ||
      !timingSafeEqual(supplied, expectedToken)) return UNAUTHORIZED.clone();
    if (!config.apiKey || !config.sender || !config.receiver) return json(503, 'Contact email is not configured. Please email us directly.');
    if (!request.headers.get('content-type')?.startsWith('multipart/form-data')) return json(415, 'Expected a contact form.');

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
    if (attempts.length >= 5 || daily.length >= 90) return json(429, 'Too many requests. Please try again later or email us directly.');
    attempts.push(now);

    // Fast-path size check when Content-Length is provided
    const contentLength = request.headers.get('content-length');
    if (contentLength && Number(contentLength) > MAX_BODY) {
      return json(413, 'Attachment must be 5 MB or smaller.');
    }

    try {
      if (!request.body) return json(400, 'Missing form.');
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
          if (size > MAX_BODY) { await reader.cancel(); return json(413, 'Attachment must be 5 MB or smaller.'); }
          chunks.push(value);
        }
        form = await new Response(Buffer.concat(chunks), { headers: { 'content-type': request.headers.get('content-type')! } }).formData();
      }

      const field = (key: string) => typeof form.get(key) === 'string' ? (form.get(key) as string).trim() : '';
      const name = field('name'), email = field('email'), phone = field('phone'), budget = field('budget'), message = field('message');
      if (!name || name.length > 100 || CRLF_RE.test(name)) return json(400, 'Please enter a name of up to 100 characters.');
      if (email.length > 254 || !EMAIL_RE.test(email)) return json(400, 'Please enter a valid email address.');
      if (!PHONE_RE.test(phone)) return json(400, 'Please enter a valid contact number.');
      if (!BUDGET_SET.has(budget)) return json(400, 'Please select a budget range.');
      if (message.length < 20 || message.length > 10000) return json(400, 'Project details must be between 20 and 10,000 characters.');
      const attachment = form.get('attachment');
      const attachments: { filename: string; content: string }[] = [];
      if (attachment instanceof File && attachment.size) {
        if (attachment.size > 5 * 1024 * 1024) return json(413, 'Attachment must be 5 MB or smaller.');
        if (!EXT_RE.test(attachment.name)) return json(400, 'Please attach a PDF, DOC or DOCX file.');
        attachments.push({ filename: attachment.name.replace(SANITIZE_RE, '_').slice(-200), content: Buffer.from(await attachment.arrayBuffer()).toString('base64') });
      }
      // Reserve before the asynchronous send so concurrent requests cannot exceed the cap.
      daily.push(now);
      const response = await send('https://api.resend.com/emails', {
        method: 'POST',
        headers: resendHeaders || { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15_000),
        body: JSON.stringify({
          from: config.sender, to: [config.receiver], reply_to: email,
          subject: `New Olentra project enquiry from ${name}`,
          text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nBudget: ${budget}\n\nProject details:\n${message}`,
          ...(attachments.length ? { attachments } : {}),
        }),
      });
      if (!response.ok) {
        await response.body?.cancel().catch(() => {});
        return json(502, 'Unable to send your enquiry. Please try again later or email us directly.');
      }
      const result = await response.json() as { id?: string };
      if (!result.id) return json(502, 'Unable to confirm your enquiry. Please email us directly.');
      return Response.json({ success: true, id: result.id }, { status: 201 });
    } catch {
      return json(502, 'Unable to send your enquiry. Please try again later or email us directly.');
    }
  };
}
