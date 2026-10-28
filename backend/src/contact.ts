import { timingSafeEqual } from 'node:crypto';

export const MAX_BODY = 6 * 1024 * 1024;
const budgets = ['Still Evaluating', 'Less than $5K', '$5K - $15K', '$15K - $35K', 'More than $35K'];
const json = (status: number, error: string) => Response.json({ error }, { status });
type Config = { apiKey?: string; sender?: string; receiver?: string; token?: string };

export function createContactHandler(config: Config, send: typeof fetch = fetch) {
  // Single-process rolling limits; shared storage is needed when horizontally scaling.
  let attempts: number[] = [];
  let daily: number[] = [];
  return async (request: Request): Promise<Response> => {
    const supplied = Buffer.from(request.headers.get('authorization') || '');
    const expected = Buffer.from(`Bearer ${config.token}`);
    if (!config.token || supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)) return json(401, 'Unauthorized.');
    if (!config.apiKey || !config.sender || !config.receiver) return json(503, 'Contact email is not configured. Please email us directly.');
    const now = Date.now();
    attempts = attempts.filter(t => t > now - 60_000);
    daily = daily.filter(t => t > now - 86_400_000);
    if (attempts.length >= 5 || daily.length >= 90) return json(429, 'Too many requests. Please try again later or email us directly.');
    attempts.push(now);
    if (!request.headers.get('content-type')?.startsWith('multipart/form-data')) return json(415, 'Expected a contact form.');
    try {
      const reader = request.body?.getReader();
      if (!reader) return json(400, 'Missing form.');
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > MAX_BODY) { await reader.cancel(); return json(413, 'Attachment must be 5 MB or smaller.'); }
        chunks.push(value);
      }
      const form = await new Response(Buffer.concat(chunks), { headers: { 'content-type': request.headers.get('content-type')! } }).formData();
      const field = (key: string) => typeof form.get(key) === 'string' ? (form.get(key) as string).trim() : '';
      const name = field('name'), email = field('email'), phone = field('phone'), budget = field('budget'), message = field('message');
      if (!name || name.length > 100 || /[\r\n]/.test(name)) return json(400, 'Please enter a name of up to 100 characters.');
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, 'Please enter a valid email address.');
      if (!/^[+0-9()\-.\s]{7,20}$/.test(phone)) return json(400, 'Please enter a valid contact number.');
      if (!budgets.includes(budget)) return json(400, 'Please select a budget range.');
      if (message.length < 20 || message.length > 10000) return json(400, 'Project details must be between 20 and 10,000 characters.');
      const attachment = form.get('attachment');
      const attachments: { filename: string; content: string }[] = [];
      if (attachment instanceof File && attachment.size) {
        if (attachment.size > 5 * 1024 * 1024) return json(413, 'Attachment must be 5 MB or smaller.');
        if (!/\.(pdf|doc|docx)$/i.test(attachment.name)) return json(400, 'Please attach a PDF, DOC or DOCX file.');
        attachments.push({ filename: attachment.name.replace(/[\r\n/\\]/g, '_').slice(-200), content: Buffer.from(await attachment.arrayBuffer()).toString('base64') });
      }
      // Reserve before the asynchronous send so concurrent requests cannot exceed the cap.
      daily.push(now);
      const response = await send('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15_000),
        body: JSON.stringify({
          from: config.sender, to: [config.receiver], reply_to: email,
          subject: `New Olentra project enquiry from ${name}`,
          text: [`Name: ${name}`, `Email: ${email}`, `Phone: ${phone}`, `Budget: ${budget}`, '', 'Project details:', message].join('\n'),
          ...(attachments.length ? { attachments } : {}),
        }),
      });
      if (!response.ok) return json(502, 'Unable to send your enquiry. Please try again later or email us directly.');
      const result = await response.json() as { id?: string };
      if (!result.id) return json(502, 'Unable to confirm your enquiry. Please email us directly.');
      return Response.json({ success: true, id: result.id }, { status: 201 });
    } catch {
      return json(502, 'Unable to send your enquiry. Please try again later or email us directly.');
    }
  };
}
