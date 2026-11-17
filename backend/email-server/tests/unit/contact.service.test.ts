import { describe, expect, test } from 'bun:test';
import type { EmailSender } from '../../src/infrastructure/email/smtp.client';
import { createContactHandler } from '../../src/domain/contact/contact.service';

const config = { sender: 'website@example.com', receiver: 'contact@example.com', token: 'test-secret' };
function request(overrides: Record<string, string> = {}, attachment?: File) {
  const body = new FormData();
  for (const [key, value] of Object.entries({ name: 'A Visitor', email: 'visitor@example.com', phone: '+91 9876543210', budget: 'Still Evaluating', message: 'Please help us build a company website.', ...overrides })) body.set(key, value);
  if (attachment) body.set('attachment', attachment);
  return new Request('http://localhost/api/contact', { method: 'POST', body, headers: { authorization: 'Bearer test-secret' } });
}
function mockSend(fn: (input: any, init: any) => Promise<Response>): EmailSender { return async message => { const response = await fn(undefined, { body: JSON.stringify(message) }); if (!response.ok) throw new Error("Delivery failed"); return await response.json() as { id: string }; }; }
describe('contact delivery', () => {
  test('sends details, reply-to and actual attachment bytes to fixed recipient', async () => {
    let payload: any;
    const handler = createContactHandler(config, mockSend(async (_, init) => {
      payload = JSON.parse(init.body);
      return Response.json({ id: 'email-123' });
    }));
    const response = await handler(request({}, new File(['%PDF-test'], 'brief.pdf')));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ success: true, id: 'email-123' });
    expect(payload.to).toEqual(['contact@example.com']);
    expect(payload.replyTo).toBe('visitor@example.com');
    expect(payload.text).toContain('Budget: Still Evaluating');
    expect(Buffer.from(payload.attachments[0].content, 'base64').toString()).toBe('%PDF-test');
  });
  test('rejects invalid fields and unsupported files before sending', async () => {
    const handler = createContactHandler(config, mockSend(async () => { throw new Error('Must not send'); }));
    expect((await handler(request({ email: 'invalid' }))).status).toBe(400);
    expect((await handler(request({ budget: 'fake' }))).status).toBe(400);
    expect((await handler(request({ message: 'short' }))).status).toBe(400);
    expect((await handler(request({}, new File(['code'], 'script.exe')))).status).toBe(400);
  });
  test('rejects oversized files', async () => {
    const handler = createContactHandler(config);
    expect((await handler(request({}, new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.pdf')))).status).toBe(413);
  });
  test('never returns success for missing config or provider failure', async () => {
    expect((await createContactHandler({ token: config.token })(request())).status).toBe(503);
    expect((await createContactHandler(config, mockSend(async () => Response.json({}, { status: 429 })))(request())).status).toBe(502);
    expect((await createContactHandler(config, mockSend(async () => { throw new Error('Timeout'); }))(request())).status).toBe(502);
  });
  test('rejects unauthenticated requests', async () => {
    expect((await createContactHandler(config)(new Request('http://localhost/api/contact', { method: 'POST' }))).status).toBe(401);
  });
  test('limits bursts before sending more messages', async () => {
    let sends = 0;
    const handler = createContactHandler(config, mockSend(async () => { sends++; return Response.json({ id: 'test' }); }));
    for (let i = 0; i < 5; i++) expect((await handler(request())).status).toBe(201);
    expect((await handler(request())).status).toBe(429);
    expect(sends).toBe(5);
  });
});
