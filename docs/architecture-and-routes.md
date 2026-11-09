# Architecture & Routes

Single source of truth for backend services, frontend routes, and environment variables.

---

## Backend Services

Two independent, dedicated servers. Each has its own directory, `package.json`, dependencies, `.env`, and README.

```
backend/
├── email-server/        Port 3001 — Contact email HTTP REST (Elysia + Resend)
└── realtime-server/     Port 3003 — Presence + internship WebSocket/HTTP (Bun native)
```

### 1. Email Server (`backend/email-server` → `:3001`)

- **What**: Receives contact enquiries from the website form and sends them via Resend.
- **Protocol**: HTTP REST only.
- **Storage**: None (stateless; all state lives in Resend's delivery log).
- **Key endpoint**: `POST /api/contact`
- **Called by**: Next.js server-side route `/api/contact/route.js` (never exposed to the browser).

### 2. Realtime Server (`backend/realtime-server` → `:3003`)

- **What**: One Bun process for global visitor presence and the full internship platform.
- **Presence protocol**: WebSocket `/ws` and `/`, plus HTTP `/health` and `/stats`.
  - `?role=visitor&visitorId=<id>` — browser connection from every frontend route.
  - `?role=dashboard` — live-count dashboard subscriber.
  - Preserves legacy `ping`, JSON ping, `get_presence`, snapshots, and
    `metrics:presence`.
- **Internship protocol**: WebSocket `/ws/intern` for authenticated JSON-RPC,
  HTTP `/intern/auth/*` and `/intern/files*`, and readiness `/intern/health`.
- **Storage**: Presence is in-memory; internship uses MongoDB Atlas replica-set
  transactions and GridFS. MongoDB initialization is asynchronous and does not
  prevent presence from binding.
- **Frontend consumers**:
  - [`VisitorTracker`](../frontend/src/components/realtime/VisitorTracker.jsx)
    opens the anonymous presence socket globally.
  - [`LiveUserPill` / `LiveUsersStat`](../frontend/src/components/admin/live-user-count.jsx)
    subscribes to dashboard snapshots.
  - Candidate pages use `/intern/portal/*`; staff uses `/intern/dashboard/*`.

---

## Frontend Route Tree

```
/                              Public marketing homepage
/services                      Services listing
/services/[slug]               Service detail page
/products                      Products listing
/products/dailysupply          DailySupply product page (established slug)
/products/olenbot              OlenBot product page
/products/olentra-ai-studio    Olentra AI Studio page
/blogs                         Blog listing
/blogs/[slug]                  Blog post
/about                         About page
/careers/intern                ← PUBLIC MARKETING & APPLICATION INTAKE
                                 Calls realtime-server (:3003) to check if
                                 applications are open (feature-gated).
/contact-preview               Contact preview
/accessibility                 Accessibility statement
/privacy-policy                Privacy policy
/terms-of-service              Terms of service
/cookie-policy                 Cookie policy
/security                      Security policy
/robots.txt                    Generated crawler policy
/sitemap.xml                   Generated public sitemap
/manifest.webmanifest         Generated web app manifest

/intern                        Permanent redirect alias to /careers/intern
/intern/login                  Internship auth — login (password or magic link)
/intern/register               Internship auth — new applicant registration
/intern/verify                 Internship auth — verify magic link token
/intern/reset-password         Internship auth — reset password via token

/intern/portal                 ← CANDIDATE PORTAL (authenticated)
/intern/portal/application       Application submission status
/intern/portal/onboarding        Onboarding form & checklist
/intern/portal/profile           Candidate profile
/intern/portal/projects          Assigned projects
/intern/portal/projects/[projectId]  Project detail & task list
/intern/portal/submissions       Work submission history
/intern/portal/certificates      Earned certificates

/intern/dashboard              ← COMPANY STAFF DASHBOARD (authenticated, MongoDB live)
/intern/dashboard/analytics      Analytics overview
/intern/dashboard/applications   All candidate applications
/intern/dashboard/applications/[applicationId]  Application detail & review
/intern/dashboard/interns        Active intern management
/intern/dashboard/projects       Project & task management
/intern/dashboard/certificates   Certificate issuance
/intern/dashboard/settings       Program configuration, track settings
/intern/dashboard/staff          Staff accounts & RBAC roles

/dashboard                     ← COMPANY WORKSPACE / WEBSITE CONTROLS
                                 NOTE: This is a separate system from /intern/dashboard.
                                 Data comes from local JSON fixtures (browser-side demo)
                                 for most sections, EXCEPT website-controls which
                                 write to a real server-side JSON file via Next.js API routes.
/dashboard/analytics           Website analytics (fixture data)
/dashboard/careers             Career applications viewer (fixture data, read-only demo)
/dashboard/enquiries           Contact enquiry inbox (fixture data)
/dashboard/website-controls    ← LIVE feature switches (writes to .data/site-features.json)
/dashboard/approvals           Content approval workflow (fixture data)
/dashboard/content             Website content management (fixture data)
/dashboard/team                Team management (fixture data)
/dashboard/settings            Company settings (fixture data)
/dashboard/monitoring          System monitoring (fixture data)
/dashboard/account             Account settings
/dashboard/analytics/seo       SEO analytics
/dashboard/approvals/[changeId] Approval detail
/dashboard/audit               Audit log
/dashboard/careers/applications Fixture applications
/dashboard/careers/applications/[applicationId] Fixture application detail
/dashboard/careers/certificates Fixture certificate view
/dashboard/careers/interns     Fixture intern list
/dashboard/careers/interns/[internId] Fixture intern detail
/dashboard/careers/programs/[programId]/edit Fixture program editor
/dashboard/careers/projects/[projectId]/tasks/[taskId] Fixture task detail
/dashboard/content/media       Media management
/dashboard/content/pages/[pageId]/edit Page editor
/dashboard/enquiries/[enquiryId] Enquiry detail
/dashboard/integrations        Integration settings
/dashboard/integrations/[integrationId] Integration detail
/dashboard/localization        Localization management
/dashboard/localization/[locale]/[contentId] Localized content editor
/dashboard/login               Company workspace login
/dashboard/monitoring/alert-rules Monitoring alert rules
/dashboard/monitoring/incidents/[incidentId] Incident detail
/dashboard/notifications       Notifications
/dashboard/settings/backups    Backup settings
/dashboard/settings/company    Company profile settings
/dashboard/settings/security   Security settings
/dashboard/team/roles/[roleId] Role editor
/dashboard/verify              Company workspace verification
/dashboard/website-controls/features/[featureId] Feature detail
/dashboard/website-controls/navigation Navigation controls
```

> [!NOTE]
> `/dashboard/careers` and `/intern/dashboard` are **completely different systems**:
> - `/dashboard/careers` is a static fixture demo inside the company workspace, showing mock applicant data stored in browser memory.
> - `/intern/dashboard` is the **live** MongoDB-backed internship staff portal, with real RBAC, real candidate data, and real-time WebSocket updates.

---

## Environment Variables (`frontend/.env.local` and service-local `.env` files)

The frontend template is [`frontend/.env.example`](../frontend/.env.example).
Each Bun service keeps its own `.env.example` beside its local runtime `.env`.

```bash
# backend/email-server  (port 3001)
CONTACT_BACKEND_URL=http://127.0.0.1:3001
CONTACT_BACKEND_TOKEN=<shared secret>
CONTACT_SITE_ORIGIN=http://localhost:3000

# backend/realtime-server  (canonical port 3003)
NEXT_PUBLIC_REALTIME_WS_URL=ws://127.0.0.1:3003/ws
NEXT_PUBLIC_INTERNSHIP_BACKEND_URL=http://localhost:3003
```

`NEXT_PUBLIC_INTERN_BACKEND_URL` remains the deprecated HTTP fallback. The
canonical realtime WebSocket variable is `NEXT_PUBLIC_REALTIME_WS_URL`.
Deprecated use emits a warning. Server-side realtime settings use the
`REALTIME_*` and `INTERNSHIP_*` names in
[`backend/realtime-server/.env.example`](../backend/realtime-server/.env.example).

The internship service's canonical server and operations variables are:

```bash
REALTIME_PORT=3003
REALTIME_HOST=0.0.0.0
REALTIME_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
PRESENCE_BROADCAST_INTERVAL_MS=100
PRESENCE_LOG=false
INTERNSHIP_MONGODB_URI=<runtime database>
INTERNSHIP_JWT_SECRET=<production secret>
INTERNSHIP_SENDER_EMAIL=<verified sender>
INTERNSHIP_SITE_ORIGIN=http://localhost:3000
INTERNSHIP_TEST_MONGODB_URI=<isolated test database>
INTERNSHIP_TEST_STAFF_EMAIL=staff@example.test
INTERNSHIP_TEST_STAFF_PASSWORD=<test password>
INTERNSHIP_INITIAL_ADMIN_EMAIL=staff@example.test
INTERNSHIP_BENCH_SAMPLES=8
```

`INTERNSHIP_PORT`, `INTERNSHIP_HOST`, `INTERNSHIP_ALLOWED_ORIGINS`, generic
`PORT`, `HOST`, `ALLOWED_ORIGINS`, `MONGODB_URI`, `MONGODB`, and the previous
`INTERN_*` variables remain deprecated fallbacks for one compatibility cycle.
The integration and benchmark commands use only the explicitly isolated test
URI; they never fall back to the runtime database.

---

## Running All Servers (Local Development)

Open four terminal tabs:

```sh
# Tab 1 — Next.js Frontend
npm run dev

# Tab 2 — Contact Form Backend
npm run email:dev

# Tab 3 — Unified Realtime Backend
npm run realtime:dev
```

**Health checks**:
```sh
curl http://127.0.0.1:3001/health        # {"ok":true}
curl http://127.0.0.1:3003/health        # {"status":"healthy",...}
curl http://127.0.0.1:3003/stats         # presence counters
curl http://127.0.0.1:3003/intern/health # {"ok":true} or controlled 503 while Mongo initializes
curl http://localhost:3000/health        # Next.js health
```

The other Next.js operational checks are `/health/live`, `/health/ready`,
`/health/errors`, `/health/simple`, and `/health/stats`. The realtime server's
presence HTTP routes are `/health` and `/stats`; its WebSocket endpoints are
`/ws?role=visitor&visitorId=<id>` or `/ws?role=dashboard`. Internship uses
`/ws/intern` for authenticated JSON-RPC.

## HTTP and API route inventory

| Service | Method | Path | Purpose |
| :--- | :--- | :--- | :--- |
| Next.js | `POST` | `/api/contact` | Authenticated proxy to the contact server |
| Next.js | `GET`/`PUT` | `/api/site-features` | Read or update live website feature switches |
| Next.js | `GET`/`POST`/`DELETE` | `/api/site-features/session` | Website-controls session lifecycle |
| Next.js | `GET` | `/api/site-features/stream` | Server-sent feature updates |
| Contact | `GET` | `/health` | Contact service liveness |
| Contact | `POST` | `/api/contact` | Send a contact enquiry through Resend |
| Realtime | `GET` | `/health` | Presence/process health |
| Realtime | `GET` | `/stats` | Presence counters and runtime stats |
| Realtime | WebSocket | `/ws` or `/` | Presence visitor/dashboard protocol |
| Realtime | WebSocket | `/ws/intern` | Authenticated internship JSON-RPC |
| Realtime | `GET` | `/intern/health` | Internship module readiness |
| Realtime | `POST` | `/intern/auth/login` | Password sign-in |
| Realtime | `POST` | `/intern/auth/magic-link` | Request magic-link sign-in |
| Realtime | `POST` | `/intern/auth/verify-magic-link` | Verify magic-link token |
| Realtime | `POST` | `/intern/auth/request-password-reset` | Request password reset |
| Realtime | `POST` | `/intern/auth/reset-password` | Apply password reset |
| Realtime | `POST` | `/intern/auth/refresh` | Rotate refresh token |
| Realtime | `POST` | `/intern/auth/logout` | Revoke session |
| Realtime | `POST` | `/intern/files` | Upload a resume or work attachment |
| Realtime | `GET` | `/intern/files/:id` | Download an authorized file |

Internship portal and staff operations are JSON-RPC methods over `/ws/intern`;
this cleanup does not rename methods, event topics, or the WebSocket path.

---

## Test Commands

```sh
npm run email:test       # Bun tests for email-server
npm run presence:test    # Presence client and backend tests
npm run internship:test  # Isolated internship integration tests; skips without a test URI
npm run realtime:typecheck # Unified realtime TypeScript check
npm run test:admin       # Company dashboard regression tests
npm run test:naming      # Repository naming, route, and documentation consistency
npm run test:all         # Run the configured repository test suite
```

`intern:*` remains an alias family for the canonical `internship:*` scripts.
The internship integration suite runs only when
`INTERNSHIP_TEST_MONGODB_URI` is explicitly configured for an isolated test
database.
