import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
const MAX_BODY = 6 * 1024 * 1024;

export async function POST(request) {
  const token = process.env.CONTACT_BACKEND_TOKEN;
  if (!token) return NextResponse.json({ error: 'Contact email is not configured. Please email us directly.' }, { status: 503 });
  // Browsers submit only from this site's origin; the backend is private and authenticated.
  const origin = request.headers.get('origin');
  const allowedOrigin = process.env.CONTACT_SITE_ORIGIN || new URL(request.url).origin;
  if (origin && origin !== allowedOrigin) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.startsWith('multipart/form-data')) return NextResponse.json({ error: 'Expected a contact form.' }, { status: 415 });

  const contentLength = Number(request.headers.get('content-length'));
  if (contentLength && contentLength > MAX_BODY) {
    return NextResponse.json({ error: 'Attachment must be 5 MB or smaller.' }, { status: 413 });
  }

  try {
    const reader = request.body?.getReader();
    if (!reader) return NextResponse.json({ error: 'Missing form.' }, { status: 400 });
    const chunks = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BODY) {
        await reader.cancel();
        return NextResponse.json({ error: 'Attachment must be 5 MB or smaller.' }, { status: 413 });
      }
      chunks.push(value);
    }
    const response = await fetch(new URL('/api/contact', process.env.CONTACT_BACKEND_URL || 'http://127.0.0.1:3001'), {
      method: 'POST',
      headers: { 'Content-Type': contentType, Authorization: `Bearer ${token}` },
      body: Buffer.concat(chunks),
      signal: AbortSignal.timeout(45_000),
      cache: 'no-store',
    });
    const result = await response.json();
    return NextResponse.json(result, { status: response.status });
  } catch {
    return NextResponse.json({ error: 'Unable to send your enquiry. Please try again later or email us directly.' }, { status: 502 });
  }
}
