# Backend architecture

The backend has two independently deployable Bun services. They do not share a
runtime package; each service owns its configuration, transport adapters,
tests, scripts, Docker baseline, and deployment boundary.

| Service | Ports | Boundary | Dependencies | Health |
| --- | --- | --- | --- | --- |
| `email-server` | 3001 | Contact enquiry email HTTP API | Resend | `GET /health` |
| `realtime-server` | 3003 | Presence + internship HTTP/WebSocket APIs | In-memory presence, MongoDB replica set/GridFS and optional Resend for internship | `GET /health`, `GET /stats`, `GET /intern/health` |

## Service ownership

- `email-server` validates and rate-limits multipart enquiries, then owns the
  Resend request. The frontend `/api/contact` route is the caller-facing proxy;
  the private backend contract is `POST /api/contact`.
- `realtime-server` is one Bun process with two isolated protocols:
  - Presence uses `/ws` and `/`, `role=visitor`, `role=dashboard`, `visitorId`,
    snapshots, legacy ping messages, and the `metrics:presence` topic.
  - Internship uses `/ws/intern` for authenticated JSON-RPC, `/intern/auth/*`
    and `/intern/files*` for HTTP, and `/intern/health` for its readiness state.
  Presence binds immediately. MongoDB-backed internship modules attach
  asynchronously and retry with bounded backoff; presence remains available if
  MongoDB is unavailable.

The canonical frontend and backend realtime origin is `3003`. Presence and
internship protocols are isolated by WebSocket path within the same process.

## Layering convention

```text
interfaces (HTTP/WebSocket) → app/composition → domain/modules
                                      ↓
                            infrastructure/config/observability
```

The realtime service keeps presence under `src/modules/presence` and internship
capabilities under `src/modules`. Compatibility barrels such as
`src/app/create-server.ts`, `src/presence.ts`, and `src/server.ts` re-export
canonical implementations and contain no duplicate behavior.

Tests are grouped by responsibility under `tests/unit`, `tests/integration`,
and `tests/contract`. Operational commands live in each service's `scripts`
directory.

## Local startup

From the repository root:

```sh
npm run dev:all
```

The individual service commands remain available for isolated development:

```sh
npm run dev
npm run email:dev
npm run realtime:dev
```

For the complete compiled stack, run `npm run build:all` followed by
`npm run start:all` from the repository root. The backend bundles are emitted to
their ignored service-local `dist/` directories.

`npm run contact:dev` remains a compatibility alias for `email:dev`.
`npm run presence:dev` and `npm run internship:dev` remain compatibility aliases
targeting the same unified service. The realtime service starts without
MongoDB; set `INTERNSHIP_MONGODB_URI` to enable internship operations. The
strict internship commands and integration tests require an explicitly
isolated `INTERNSHIP_TEST_MONGODB_URI` and never fall back to the runtime
database.

## Operational routes

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Presence/process liveness |
| `GET` | `/stats` | Presence counters and runtime statistics |
| WebSocket | `/ws` or `/` | Presence visitor/dashboard protocol |
| `GET` | `/intern/health` | Internship module readiness |
| `POST` | `/intern/auth/*` | Internship authentication lifecycle |
| `POST`/`GET` | `/intern/files*` | Authorized GridFS file operations |
| WebSocket | `/ws/intern` | Authenticated internship JSON-RPC |

Each service has a local Dockerfile and `.dockerignore`. These are packaging
and healthcheck baselines only; they do not invent a new cloud target.

The Oracle Cloud workflow is
`.github/workflows/deploy-realtime-server.yml`. It connects over SSH, updates
the `main` checkout, installs the Bun lockfile, builds the service, creates or
updates the `olentra-realtime` systemd unit, restarts the process, and checks
`/health` plus `/intern/health`. The deployment host must have Git, Bun, sudo,
systemd, and curl. Configure the production environment once at
`backend/realtime-server/.env` in the host checkout, or at
`/etc/olentra/realtime-server.env`; the workflow never commits or transmits
those runtime secrets.
