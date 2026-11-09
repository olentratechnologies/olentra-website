# Email Server (`backend/email-server`)

- **Port**: `3001`
- **Protocol**: HTTP REST
- **Runtime**: Bun + Elysia
- **External Service**: [Resend](https://resend.com) (transactional email)

## Purpose

Receives contact enquiries forwarded from the Next.js `/api/contact` route and sends them through Resend. The Next.js route never talks to Resend directly — it proxies the multipart form to this private email backend which holds the secret token and API key. The public `/api/contact` route and `CONTACT_*` configuration names remain unchanged because they describe the feature contract.

## Endpoints

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Liveness check → `{"ok":true}` |
| `POST` | `/api/contact` | Accept a contact form submission and send via Resend |

## Setup

1. Copy `.env.example` to `.env` and fill in your values.
2. Install dependencies: `bun install`
3. Start dev server: `bun run dev`

## Environment Variables

| Variable | Description |
| :--- | :--- |
| `PORT` | Listening port (default: `3001`) |
| `HOST` | Listening address (default: `127.0.0.1`) |
| `RESEND_API_KEY` | Resend API key for sending emails |
| `CONTACT_SENDER_EMAIL` | From address (must be on verified domain) |
| `CONTACT_RECEIVER_EMAIL` | Destination inbox for contact enquiries |
| `CONTACT_BACKEND_TOKEN` | Shared secret for Next.js → backend auth |

## Run Commands

```sh
bun install
bun run dev      # development with hot reload on port 3001
bun run start    # production
bun test         # unit tests (mocks Resend, no real emails sent)
```

## Verification

```sh
curl http://127.0.0.1:3001/health
# → {"ok":true}
```

## Layered structure

```text
src/index.ts                         stable Bun/Vercel entrypoint
src/app/create-app.ts                Elysia composition root
src/config/env.ts                    typed process configuration
src/domain/contact/                  validation and delivery orchestration
src/infrastructure/email/            Resend HTTP client
src/interfaces/http/                 route and request boundary
src/observability/logger.ts          structured request logging
tests/unit/                          service behavior tests
tests/contract/                      HTTP route contract tests
scripts/healthcheck.ts               container liveness check
```

The legacy `src/contact.ts` import remains a re-export barrel for one
compatibility cycle. It is not a second implementation.
