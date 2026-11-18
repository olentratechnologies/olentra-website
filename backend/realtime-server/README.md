# Realtime Server (backend/realtime-server)

- **Canonical port**: `3003`
- **Runtime**: Bun with one native `Bun.serve` composition root
- **Storage**: In-memory presence plus MongoDB Atlas/GridFS for internship modules

## Boundary

This independently deployable service hosts two isolated protocols in one
process:

- Presence: HTTP /health and /stats; WebSocket /ws and / with role=visitor,
  role=dashboard, visitorId, snapshots, legacy ping messages, and the
  metrics:presence topic.
- Internship: HTTP /intern/health, /intern/auth/*, and /intern/files*;
  authenticated JSON-RPC WebSocket /ws/intern for candidate and staff
  operations.

Presence binds immediately at startup. MongoDB initialization is asynchronous
with bounded retries. While MongoDB is unavailable, presence remains healthy,
while internship endpoints return a controlled SERVICE_UNAVAILABLE response.

## HTTP endpoints

| Method | Path | Description |
| :--- | :--- | :--- |
| GET | /health | Presence/process health |
| GET | /stats | Presence counters and runtime statistics |
| GET | /intern/health | Internship readiness |
| POST | /intern/auth/login | Password sign-in |
| POST | /intern/auth/magic-link | Request passwordless sign-in |
| POST | /intern/auth/verify-magic-link | Verify magic-link token |
| POST | /intern/auth/request-password-reset | Request password reset |
| POST | /intern/auth/reset-password | Apply password reset token |
| POST | /intern/auth/refresh | Rotate refresh token |
| POST | /intern/auth/logout | Revoke session and clear cookie |
| GET | /intern/auth/session | Verify bearer session against the database |
| POST | /intern/auth/change-password | Change password and revoke all sessions |
| POST | /intern/files | Upload a resume or work attachment |
| GET | /intern/files/:id | Download an authorized GridFS file |

## WebSocket boundaries

/ws and / accept presence connections. Visitor connections use
?role=visitor&visitorId=<id>; dashboard connections use ?role=dashboard.
The browser opens this connection from the global frontend layout.

/ws/intern accepts only the internship JSON-RPC protocol. The client must
authenticate with the existing auth.authenticate method before protected
operations. Existing method names, response envelopes, events, topics, cookie
behavior, authorization, and MongoDB collection names are unchanged.

## Environment variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| REALTIME_PORT | 3003 | Canonical listener port |
| REALTIME_HOST | 0.0.0.0 | Listener address |
| REALTIME_ALLOWED_ORIGINS | localhost origins | CORS/WebSocket origins for internship routes |
| REALTIME_TRUST_PROXY | false | Trust forwarded client-IP headers only behind a controlled reverse proxy that overwrites them |
| PRESENCE_BROADCAST_INTERVAL_MS | 100 | Presence snapshot coalescing interval |
| PRESENCE_LOG | false | Presence transport error logging |
| INTERNSHIP_MONGODB_URI | optional at process start | Runtime MongoDB connection string |
| INTERNSHIP_JWT_SECRET | auto-generated in development | Production signing secret, at least 32 bytes |
| EMAIL_SERVER_URL | http://127.0.0.1:3001 | Central email delivery service |
| EMAIL_DELIVERY_TOKEN | — | Shared server-to-server token; matches email-server |
| INTERNSHIP_SITE_ORIGIN | http://localhost:3000 | Frontend origin for intake checks and links |
| INTERNSHIP_WORKSPACE_ORIGIN | http://localhost:3002 | Company workspace origin for staff reset links |

INTERNSHIP_PORT, INTERNSHIP_HOST, INTERNSHIP_ALLOWED_ORIGINS, generic PORT,
HOST, ALLOWED_ORIGINS, and INTERN_* names remain deprecated fallbacks for one
compatibility cycle. MONGODB_URI and MONGODB remain deprecated database
aliases. Canonical names take precedence and deprecated usage emits a warning.
See .env.example.

Integration tests and benchmarks require the explicitly isolated
INTERNSHIP_TEST_MONGODB_URI; the deprecated INTERN_TEST_MONGODB_URI alias is
supported. Test commands never fall back to the runtime database.

## Run commands

    bun install
    bun run dev
    bun run start
    bun run test
    bun run typecheck
    bun run healthcheck
    bun run bench
    bun run bench:presence
    bun run bench:latency
    bun run bootstrap
    bun run promote-admin
    bun run admin-access -- list

From the repository root, realtime:* is canonical. presence:*, internship:*,
and intern:* remain compatibility aliases for one release cycle.

## Layered structure

    src/index.ts                         stable process entrypoint
    src/app/                             unified composition and internship container
    src/config/                          realtime and internship environment loaders
    src/modules/presence/                transport-independent presence tracker
    src/modules/                         internship domain modules
    src/infrastructure/                  MongoDB, GridFS, mailer, redacted logger
    src/interfaces/http/                 presence and internship HTTP adapters
    src/interfaces/websocket/            typed presence/internship transports
    src/shared/                          errors, IDs, principals
    tests/unit/                          isolated service/config tests
    tests/integration/                   MongoDB and live transport tests
    tests/contract/                      HTTP/WebSocket/JSON-RPC compatibility tests
    scripts/                             startup health, bootstrap, and benchmarks

Compatibility barrels under src/ only re-export canonical modules; they do not
duplicate behavior.

## Shared dashboard accounts and recovery

Both dashboards authenticate staff through `/intern/auth/*`. Staff admins receive
workspace Owner access; other roles need `workspace.administrator`,
`workspace.editor`, `workspace.recruiter` or `workspace.analyst`. Assign these
through the internship dashboard's Staff & roles page. Only admins and
`workspace.administrator` can change live website switches.

Login throttling stores hashed email/IP keys in MongoDB with TTL cleanup. Reset
links carry the account session version and are consumed atomically with the
password change. Staff reset/change passwords require 12 characters; intern
passwords require 8. Password changes revoke all account sessions.

From the repository root, use `npm run internship:admin -- create --email EMAIL
--name "Admin Name"` to email a set-password link. `reset --email EMAIL` restores
admin access and emails a new link; `--print-link` provides an operator recovery
path when email is unavailable. `list` shows staff accounts and whether a
password is set. `delete --email EMAIL --yes` permanently removes a staff
account, its credentials and sessions, while protecting the last active admin.
Use the same database, signing secret and workspace origin as the service.
See [workspace recovery](../../apps/admin/README.md#locked-out-recovery).

## OCI direct file uploads

See [deployment and API guide](../../docs/oci-file-storage.md) and [implementation plan](../../docs/plans/oci-uploads.md). Uploads remain on GridFS until `INTERNSHIP_FILE_STORAGE=oci` is configured with private buckets, workload IAM and ClamAV.
