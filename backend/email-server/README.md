# Central email-server

This is the application's only outbound email delivery service. It uses Google SMTP
with an App Password, for both contact enquiries and internship emails. Realtime
owns internship templates, secure link generation and its MongoDB outbox; it calls
this service to deliver already-rendered messages.

| Endpoint | Purpose | Authentication |
| --- | --- | --- |
| `GET /health` | Process liveness; does not prove SMTP readiness | None |
| `POST /api/contact` | Existing multipart contact enquiry, fixed receiver, reply-to and optional resume/brief | `CONTACT_BACKEND_TOKEN` |
| `POST /api/email/verify` | SMTP connection and authentication check without sending email | `EMAIL_DELIVERY_TOKEN` |
| `POST /api/email` | Internal JSON email delivery from realtime | `EMAIL_DELIVERY_TOKEN` |

## Configuration

Copy `.env.example` to `.env` and set:

```dotenv
PORT=3001
HOST=127.0.0.1
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-google-mailbox@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=Olentra <your-google-mailbox@gmail.com>
CONTACT_RECEIVER_EMAIL=contact@olentratechnologies.com
CONTACT_BACKEND_TOKEN=secret-shared-with-website
EMAIL_DELIVERY_TOKEN=different-secret-shared-with-realtime
```

`SMTP_FROM` is optional and defaults to `SMTP_USER`. Use that Google mailbox or an
authorized sender alias. For port 587, set `SMTP_SECURE=false`; STARTTLS remains
required. TLS certificate verification stays enabled. Google credentials are held
only by this service; never put them in a `NEXT_PUBLIC_*` variable or source control.
The App Password can be pasted with or without the spaces Google displays.

In realtime-server, configure:

```dotenv
EMAIL_SERVER_URL=http://127.0.0.1:3001
EMAIL_DELIVERY_TOKEN=different-secret-shared-with-realtime
```

The website continues using `CONTACT_BACKEND_URL` and `CONTACT_BACKEND_TOKEN`.
Localhost calls its local email-server. The live realtime backend must point to the
live email-server; use loopback on the same host or authenticated HTTPS across hosts.

## Internal email contract

Send JSON to `/api/email`, with `Authorization: Bearer <EMAIL_DELIVERY_TOKEN>`:

```json
{
  "to": ["intern@example.com"],
  "subject": "Your application",
  "text": "Plain-text content",
  "html": "<p>HTML content</p>",
  "attachments": [
    { "filename": "interview.ics", "content": "base64-encoded-bytes", "contentType": "text/calendar; method=REQUEST" }
  ]
}
```

One recipient is accepted per request. `html`, `replyTo` and `attachments` are optional.
The server controls From; caller-provided envelope overrides are ignored. Attachment
contents are base64, with a combined decoded size of at most 5 MB and an 8 MB JSON
request limit. File paths and remote attachment URLs are not accepted.

Successful SMTP recipient acceptance returns `201 {"success":true,"id":"message-id"}`.
Authentication failures return 401, invalid data 400/415, oversized requests 413,
missing configuration 503 and delivery failures 502. Message IDs represent SMTP
acceptance, not proof of inbox placement. SMTP credentials, content and activation
links are excluded from delivery logs. The service doesn't create another queue;
realtime's outbox handles retries. A lost acknowledgement can still cause duplicate
email on retry.

## Run and verify

```sh
bun install
bun run dev
bun run typecheck
bun test
bun run build
bun scripts/verify-smtp.ts
```

The verification command checks the SMTP connection and authentication without
sending email. Tests use injected senders and never deliver real messages.
Missing credentials never produce a fake successful delivery, including localhost.

Deploy email-server and configure SMTP first, then deploy realtime and the website.
Update all realtime workers connected to the shared database so an older worker
cannot claim new email jobs. Configure the live server environment separately;
local `.env` changes do not update a deployed service.
