import { Elysia } from 'elysia';
import { createContactHandler, MAX_BODY } from './contact';

const contact = createContactHandler({
  apiKey: process.env.RESEND_API_KEY,
  sender: process.env.CONTACT_SENDER_EMAIL,
  receiver: process.env.CONTACT_RECEIVER_EMAIL,
  token: process.env.CONTACT_BACKEND_TOKEN,
});

const app = new Elysia()
  .get('/health', () => ({ ok: true }))
  .post('/api/contact', ({ request }) => contact(request), { parse: 'none' });

// Vercel detects the default Elysia export and serves its routes as Functions.
export default app;

// Preserve the local Bun server for development and standalone hosting.
if (import.meta.main) {
  app.listen({ port: Number(process.env.PORT || 3001), hostname: process.env.HOST || '127.0.0.1', maxRequestBodySize: MAX_BODY });
  console.log(`Contact backend listening on port ${process.env.PORT || 3001}`);
}
