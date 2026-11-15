# Internship module

The dedicated internship service uses MongoDB and WebSockets for applications,
accounts, offers, onboarding, work, certificates, messages and notifications.
Its routes are `/careers/intern`, `/intern/portal` and `/intern/dashboard`.
The company workspace at `/dashboard` is separate; visitor presence is another
protocol hosted by the same `realtime-server` process.
Previously saved browser demo data is left in place and is not imported.

## Local setup

Install the repository dependencies and the Bun dependencies in
`backend/realtime-server`. Configure `INTERNSHIP_MONGODB_URI` in
`backend/realtime-server/.env` with a MongoDB Atlas replica-set connection string and
database name. The database user needs permission to create indexes, use
transactions, open change streams and store GridFS files. Do not commit this file.
The sample settings are in `backend/realtime-server/.env.example`.

```sh
npm install
cd backend/realtime-server && bun install && cd ../..
npm run dev
# In another terminal:
npm run realtime:start
```

The unified realtime service defaults to `0.0.0.0:3003`. Set
`NEXT_PUBLIC_INTERNSHIP_BACKEND_URL` in the website's local environment if it
runs elsewhere. `INTERNSHIP_MONGODB_URI` must point to the service's MongoDB
database. `REALTIME_ALLOWED_ORIGINS` must list the website's exact browser
origins; `INTERNSHIP_SITE_ORIGIN` is the website origin used to check whether
applications are enabled. Restart the relevant process after changing
environment settings. For production configure a shared, random
`INTERNSHIP_JWT_SECRET` of at least 32 bytes and use HTTPS. On a local
development machine, an absent secret is generated in the ignored
`backend/realtime-server/.data/intern-jwt-secret` file.

The previous `NEXT_PUBLIC_INTERN_BACKEND_URL` and `INTERN_*` names remain
deprecated fallbacks for one compatibility cycle. Canonical names take
precedence, and using a deprecated name emits a clear warning.

The public catalog is shared with the website from
`backend/realtime-server/src/modules/programs/opportunities.mjs` and included as
`opportunities` in public and authenticated snapshots. New `application.submit`
commands require `roleId` (`build`, `automate`, or `grow`) and `schedule`
(`part_time` or `full_time`) separately from `programId`. The service stamps
`workMode: "remote"` and the configured duration; client values cannot override
these terms. Administrators can edit the duration as free text in General
settings, up to 120 characters. New applications keep the duration that was
active when they applied, while historical applications retain their original
data and display “Not provided” for missing choices. The choices appear in the
live internship dashboard, candidate portal and application CSV exports.

The service initializes only the two named programs and keeps them closed with
no fees or stipends configured. Staff must set the real amounts and enable the
tracks in `/intern/dashboard/settings` before applicants can submit. Website
feature switches must also allow internships and applications. No demo accounts
or applications are automatically added.

To explicitly create the first test internship admin, run the following from the project
root, entering a test email and password when prompted. Choose a password with
at least 12 characters; the command stores an Argon2id hash and does not print
the password. Use a test address that does not belong to a real person.

```sh
read "INTERNSHIP_TEST_STAFF_EMAIL?Test staff email: "
read -s "INTERNSHIP_TEST_STAFF_PASSWORD?Test staff password: "
export INTERNSHIP_TEST_STAFF_EMAIL INTERNSHIP_TEST_STAFF_PASSWORD
npm run internship:bootstrap
unset INTERNSHIP_TEST_STAFF_EMAIL INTERNSHIP_TEST_STAFF_PASSWORD
```

The bootstrap command is for an empty staff setup. When upgrading an existing
staff account instead, set `INTERNSHIP_INITIAL_ADMIN_EMAIL` to that account's
exact email and run `npm run internship:promote-admin`. Only that account is promoted;
other legacy staff accounts remain unassigned. The command does not change its
password. Once an admin exists, they manage staff from **Staff & Roles** in the
internship dashboard.

Admin has all internship permissions. The starter non-admin roles are manager,
recruiter, mentor, and viewer. Viewers see aggregate statistics and project
summaries without applicant profiles or private messages. An admin can adjust
limited permissions or create custom roles; final decisions and staff
management remain admin-only. Some permissions require related read access;
the role editor selects these dependencies automatically. Each person has one
staff role. Changing a role, disabling an account, resetting its password, or
editing its role's permissions signs affected staff out. Staff changes are
recorded in the internship audit log, and the last active admin cannot be
disabled or demoted.

These `read` commands use the default macOS zsh shell. Applicants receive a
single-use email link after applying; opening it verifies ownership of the
email and provisions their candidate account. They can set a password from the
portal and request sign-in or password-reset links from the login page.
Application confirmation emails use a transactional outbox with retries.
Configure `RESEND_API_KEY` and the verified sender for delivery. Missing email
configuration returns a delivery failure in production, allowing the outbox to
retry; development-only offline emails are logged. An admin can also create an
account or reset an intern's password after verifying their identity; resetting
the password invalidates existing sessions.

## Workflow

1. The applicant submits their track, role, schedule and resume, opens the
   confirmation email's sign-in link, and follows their status in the portal.
2. An admin selects the applicant and sends an offer. The applicant accepts it and
   submits their onboarding details. An admin approves onboarding, making them an
   active intern.
3. Staff assign the intern to a project and create tasks. The intern submits
   work; authorized staff can request changes, and an admin approves the latest version.
4. An admin completes the internship after required tasks are approved and issues
   the certificate. The certificate is created once and appears in the portal.
5. Each side can use in-app messages and notifications. Configured email
   delivery sends sign-in links and workflow notices; unrelated third-party
   integrations remain unavailable.

Staff review real applications at `/intern/dashboard`. The separate company
workspace's `/dashboard/careers` sample screens do not manage these records;
its “Open live internship dashboard” action links to the real workflow.

Production website feature controls use the realtime service's shared store
when a backend URL is configured. Development defaults to the shared local
file; an explicit `OLENTRA_FEATURE_STORE_PATH` override is preserved.

Attachments are streamed through the internship service's small HTTP file
endpoints to GridFS. Internship commands use WebSockets. Session-cookie
endpoints support sign-in and refresh; the separate HTTP business-request
fallback is not implemented yet.

Sign-in, refresh, and logout use HTTP endpoints on the internship service. A
successful sign-in returns a short-lived access token and sets an HttpOnly
refresh cookie; the browser authenticates its WebSocket using the access token.
Internship actions and updates then use that WebSocket.

Temporary database failures are reported as service unavailability rather than
invalid credentials. If a refresh response is lost, the same browser request
can safely recover the rotated credential for 60 seconds; a lost response that
cannot be retried within that window may require another sign-in. The browser
limits each HTTP authentication request to 15 seconds; the service permits 30
seconds of HTTP idle time. These limits prevent indefinite waits or premature
connection resets; they cannot make an unavailable network or database fast.
If logout cannot reach the service, the browser prevents silent session
restoration and retries revocation before the next explicit login in that tab.
Until that retry succeeds, the server-side session may remain valid until it
expires.
Some browsers copy session storage when a tab is duplicated. Two tabs that
inherit the same session context can conflict if they refresh concurrently;
until per-tab coordination is added, use independently opened tabs for separate
test accounts. A refresh-token replay conflict requires signing in again.
On supported MongoDB 8 deployments, the service verifies transactional bulk
write support before batching settings changes; otherwise it uses the existing
sequential transaction path.

## Verification

```sh
npm run internship:test
npm run presence:test
npm run internship:bench
npm run internship:bench:latency
npm run test:naming
npm run build
```

Internship integration tests and benchmarks require the explicitly isolated
`INTERNSHIP_TEST_MONGODB_URI` (the previous `INTERN_TEST_MONGODB_URI` remains a
deprecated fallback). They create unique, prefixed test collections and remove
only those collections; they never fall back to the runtime database URI. Use
a dedicated test database and do not run them against production data. The
`internship:test` command fails when that isolated URI is absent. The realtime
deployment workflow provisions a disposable replica set and must pass the full
integration suite before deployment. Tests use mocked or offline email delivery.
The benchmark creates synthetic applications and reports latency and process RSS;
it is a small baseline, not an enterprise capacity guarantee. The latency
benchmark uses a separate isolated database prefix and a local ephemeral
service to measure sign-in, WebSocket authentication, snapshot load, and
settings saves. It runs eight sequential samples by default; set
`INTERNSHIP_BENCH_SAMPLES` (2–50) to choose another sample count. Each run
removes only its own collections. Run it without competing Atlas tests for more
meaningful measurements.

On the development machine on 2026-11-08, a cold Atlas run took 4,024 ms for
the 50 reads, with p50 113 ms and p95 2,020 ms; the benchmark process RSS went
from 34 MiB to 42 MiB. This includes database network and connection-pool warmup
and is not a WebSocket end-to-end latency or multi-region load test. Measure
again in the intended deployment region before deciding on capacity.

Application, message and notification histories use paginated queries. Staff
directory queries also page interns, projects, tasks, submissions and
certificates; the intern portal still uses bounded per-account snapshots (500
projects and certificates, 1,000 tasks and submissions). Analytics share a
two-second cache and are invalidated by relevant database changes. At larger
scale, measure the joins and aggregation queries and consider denormalized
search indexes and incrementally maintained analytics. Announcements currently
enumerate recipients within one transaction; a durable fan-out queue or scoped
audience topics are needed before sending to very large audiences.

The browser keeps a command's retry key in memory after an ambiguous network
failure, including a manual retry of the same action. Reloading the tab clears
that retry cache; persisted retries across browser restarts are not implemented.
