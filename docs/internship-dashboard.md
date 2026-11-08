# Internship module

The dedicated internship service uses MongoDB and WebSockets for applications,
accounts, offers, onboarding, work, certificates, messages and notifications.
Its routes are `/careers/intern`, `/intern/portal` and `/intern/dashboard`.
The company workspace at `/dashboard` and visitor-count server are separate.
Previously saved browser demo data is left in place and is not imported.

## Local setup

Install the repository dependencies and the Bun dependencies in
`backend/websockets`. Configure `MONGODB_URI` (or the existing `MONGODB`) in
`backend/websockets/.env` with a MongoDB Atlas replica-set connection string and
database name. The database user needs permission to create indexes, use
transactions, open change streams and store GridFS files. Do not commit this file.
The sample settings are in `backend/websockets/.env.example`.

```sh
npm install
cd backend/websockets && bun install && cd ../..
npm run dev
# In another terminal:
npm run intern:start
```

The service defaults to `127.0.0.1:3003`. Set
`NEXT_PUBLIC_INTERN_BACKEND_URL` in the website's local environment if it runs
elsewhere. `INTERN_ALLOWED_ORIGINS` must list the website's exact browser origins;
`INTERN_SITE_ORIGIN` is the website origin used to check whether applications
are enabled. Restart the relevant process after changing environment settings.
For production configure a shared, random `INTERN_JWT_SECRET` of at least 32 bytes
and use HTTPS. On a local development machine, an absent secret is generated in
the ignored `backend/websockets/.data/intern-jwt-secret` file.

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
read "INTERN_TEST_STAFF_EMAIL?Test staff email: "
read -s "INTERN_TEST_STAFF_PASSWORD?Test staff password: "
export INTERN_TEST_STAFF_EMAIL INTERN_TEST_STAFF_PASSWORD
npm run intern:bootstrap
unset INTERN_TEST_STAFF_EMAIL INTERN_TEST_STAFF_PASSWORD
```

The bootstrap command is for an empty staff setup. When upgrading an existing
staff account instead, set `INTERN_INITIAL_ADMIN_EMAIL` to that account's exact
email and run `npm run intern:promote-admin`. Only that account is promoted;
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

These `read` commands use the default macOS zsh shell. Create a test intern by
submitting a new test application and registering in the same browser tab. The
claim is short-lived and can be used only once. If the claim is lost or expires,
an admin can explicitly create an account for that applicant from the applicant's
page after verifying their identity. There is no OTP or external email delivery.
For a forgotten intern password, an admin can set a new password from the
applicant's page; this invalidates that account's existing sessions. Staff-set
passwords do not expire automatically and there is no self-service password
change yet, so staff must reset them when a replacement is needed.

## Workflow

1. The applicant submits the application and resume, creates an account, and
   follows their status in the intern portal.
2. An admin selects the applicant and sends an offer. The applicant accepts it and
   submits their onboarding details. An admin approves onboarding, making them an
   active intern.
3. Staff assign the intern to a project and create tasks. The intern submits
   work; authorized staff can request changes, and an admin approves the latest version.
4. An admin completes the internship after required tasks are approved and issues
   the certificate. The certificate is created once and appears in the portal.
5. Each side can use in-app messages and notifications. External delivery and
   third-party integrations are not configured.

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
npm run test:intern
npm run test:presence
npm run bench:intern
npm run bench:intern:latency
npm run build
```

Internship tests and the benchmark use `INTERN_TEST_MONGODB_URI` if provided,
otherwise the configured `MONGODB_URI` or `MONGODB`. They create unique,
prefixed test collections and remove only those collections. Use a dedicated
test database when possible. The benchmark creates 1,000 synthetic applications
and performs 50 paginated reads with 10 concurrent workers; it reports latency
and process RSS. It is a small baseline, not an enterprise capacity guarantee.
The latency benchmark uses a separate isolated database prefix and a local
ephemeral service to measure sign-in, WebSocket authentication, snapshot load,
and track and program settings saves. It runs eight sequential samples by
default; set `INTERN_BENCH_SAMPLES` (2–50) to choose another sample count. Each
run removes only its own collections. Run it without competing Atlas tests for
more meaningful measurements.

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
