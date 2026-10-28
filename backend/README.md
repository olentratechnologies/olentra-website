# Olentra contact email backend

Bun + Elysia sends contact enquiries through Resend using native `fetch`. The Next.js `/api/contact` route forwards multipart form submissions to this private backend. There is no email SDK and no automatic paid upgrade.

## Setup

1. Create a Resend Free account and verify `olentratechnologies.com` (or your chosen sending domain) using Resend's DNS instructions. The free plan currently allows 100 emails/day and 3,000/month. Keep the account on Free.
2. Copy `backend/.env.example` to `backend/.env`. Set `RESEND_API_KEY` to a sending API key. Set `CONTACT_SENDER_EMAIL` to an address on the verified domain and confirm `CONTACT_RECEIVER_EMAIL` is the desired inbox.
3. Generate a secret with `openssl rand -hex 32`. Put the same value in `CONTACT_BACKEND_TOKEN` in both `backend/.env` and the website's `.env.local` (use the root `.env.example` as the template). Never put these credentials in a `NEXT_PUBLIC_` variable or commit them.
4. From `backend`, run `bun install`, then `bun run dev` (port 3001). From the repository root, run `npm run dev` (port 3000).
5. Submit the contact form with a test enquiry. Check the recipient inbox and Resend's delivery log. A successful UI response means Resend accepted the email; delivery can still bounce or be filtered.

## Deployment

For Vercel, import this `backend` folder as its own project. `vercel.json` selects Vercel's Bun Functions runtime, and the default Elysia export in `src/index.ts` is served as a function; standalone `bun run start` remains available for local or long-running hosts. Add `RESEND_API_KEY`, `CONTACT_SENDER_EMAIL`, `CONTACT_RECEIVER_EMAIL`, and `CONTACT_BACKEND_TOKEN` as Vercel environment variables for Production (and Preview if needed). Set the same `CONTACT_BACKEND_TOKEN` in the website's server-side environment, plus `CONTACT_BACKEND_URL` to the deployed backend's HTTPS origin and `CONTACT_SITE_ORIGIN` to the exact public website origin, with no trailing slash. Never expose the token or Resend key in a `NEXT_PUBLIC_` variable or commit them.

The backend validates all fields and limits PDF/DOC/DOCX uploads to 5 MB (6 MB total multipart body). Attachments are passed through, not virus-scanned. Name, email, phone, budget and project details are included, with visitor email in Reply-To. Recipients are fixed server-side. Failures preserve the form and never report a stored-only success.

Abuse limits are global: five attempts per minute and 90 send attempts per rolling 24 hours. These deliberately conservative in-memory limits reset on restart and apply per process; for multiple replicas, use a shared rate-limit store and hosting/WAF abuse protection. They do not guarantee remaining provider quota, especially if other apps share the account. Provider errors and timeouts produce a retry/direct-email message; automatic retries are avoided to reduce duplicate sends after ambiguous timeouts.

## Verification

Run `bun test` in `backend`. Tests mock Resend and do not send real emails. They cover accepted delivery, Reply-To, attachment content, validation, upload size, missing config, provider failure, authentication and burst limits.
