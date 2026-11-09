# Admin dashboard data and workflows

The company dashboard under `/dashboard` combines two data systems. Website visibility controls use a persistent server-side JSON file and update the public website immediately. The remaining dashboard workflows use JSON fixtures and a shared browser store: approvals can publish local content revisions, applications can create interns, and task reviews can unlock local completion and certificate issuance.

## Run the dashboard

```sh
npm run dev
```

Open `/dashboard`. The initial fixture starts with an authenticated owner session. Use **Sign out** or open `/dashboard/login` to exercise the demo sign-in flow.

| Role | Demo email |
| --- | --- |
| Owner | `owner@example.com` |
| Administrator | `admin@example.com` |
| Editor | `editor@example.com` |
| Recruiter | `recruiter@example.com` |
| Analyst | `analyst@example.com` |

All seeded accounts use `OlentraDemo2026!`. The verification code is `123456`; the password reset code is `654321`. A recovery code follows `<UPPERCASE ACCOUNT ID>-RECOVERY-2026`, for example `OWNER-RECOVERY-2026`.

These are public demo credentials. Account verification, trusted-device handling, session timeout and password changes run against local JSON. Password inputs are hashed with Web Crypto before command dispatch; the JSON contains demo digests. This is a frontend demonstration, not production authentication.

## Immediate website controls

`/dashboard/website-controls` is the authoritative on/off interface for the website. A successful switch updates the selected environment immediately. There is no review step, publish button or scheduled override for these live switches.

- **Production** controls public routes, homepage sections, navigation, calls to action and internship intake.
- **Staging** is a separate preview configuration. Changing it does not change the public Production website.
- The public internship page is **`/careers/intern`**. Turning **Internships** off hides that public program and closes new intake. **Applications** independently closes new application and registration controls while the program can remain visible.
- **Existing intern portal** is independent of public internship visibility. Existing users can retain `/intern/portal/**` access while the public page and applications are off.
- Shared internship login/reset routes and the private company internship dashboard remain available for account and company access. **Maintenance** blocks public pages while preserving designated private routes; portal access still follows its own switch.

The legacy public URL `/intern` permanently redirects (`308`) to `/careers/intern` while the feature is enabled, preserving query parameters. When internships are disabled, both public URLs return `404`. Registration, login, password reset, private company dashboards and existing intern portals retain their `/intern/...` routes.

The committed seed is `frontend/src/data/site-features.json` (schema version `1`). On the first successful change, the server writes `.data/site-features.json`, which is gitignored. `OLENTRA_FEATURE_STORE_PATH` can point to a different persistent file location. The live state contains a revision and separate Production/Staging environments.

```text
site-features.json seed → persistent runtime JSON file
                                  ↓
                         API + server-sent events
                                  ↓
                    dashboard / public site provider
                                  ↓
                     route, link and section gates
```

Relevant implementation:

| Source | Purpose |
| --- | --- |
| `frontend/src/lib/server/site-features.mjs` | Validates, reads and atomically updates the persistent server JSON state. |
| `frontend/src/lib/server/site-feature-auth.mjs` | Authorizes live-control sessions and signs their cookie. |
| `frontend/src/app/api/site-features/route.js` | `GET` reads shared state; authenticated same-origin `PUT` changes one switch. |
| `frontend/src/app/api/site-features/session/route.js` | Establishes and clears a live-control session. |
| `frontend/src/app/api/site-features/stream/route.js` | Streams revision updates through SSE with a filesystem polling check. |
| `frontend/src/lib/site-features-client.js` | Shares the live snapshot between client components, reconnects SSE and refreshes through a polling fallback. |
| `frontend/src/components/site-features.jsx` | Supplies `useSiteFeatures()`, `<Feature>` and the open-page route gate. |
| `frontend/src/lib/site-feature-rules.mjs` | Maps routes to flags and derives effective availability. |
| `frontend/src/proxy.js` | Returns `404` for disabled routes and `503` for public maintenance requests. |
| `frontend/src/app/sitemap.js` | Excludes disabled public routes from the dynamically generated sitemap. |

Already open pages receive SSE updates and remove disabled sections and links. New route requests are checked by the proxy. Internship form and registration handlers also check current availability before creating new records.

### Live-control authentication and deployment

Browser-local demo account data does not authorize server writes by itself. The live-control API requires a signed, HTTP-only `olentra_site_controls` cookie established through `/api/site-features/session`; writes also require the same origin.

In development, an automatic local demo session is available on loopback URLs when no live-control password is configured. Production disables automatic demo authorization by default, including on a loopback hostname. A local production preview can explicitly set `OLENTRA_FEATURE_ALLOW_LOCAL_DEMO=true` while binding the server to a loopback address. Setting it to `false` disables the shortcut in every mode. Public deployed hosts require configured live-control credentials.

| Environment variable | Purpose |
| --- | --- |
| `OLENTRA_FEATURE_ADMIN_PASSWORD` | Required deployed control password, at least 12 characters. |
| `OLENTRA_FEATURE_ADMIN_EMAIL` | Authorized email; defaults to `owner@example.com`. |
| `OLENTRA_FEATURE_ADMIN_MFA_CODE` | Optional additional verification code for live controls. |
| `OLENTRA_FEATURE_SESSION_SECRET` | Stable secret used to sign control-session cookies. |
| `OLENTRA_FEATURE_SITE_ORIGIN` | Optional canonical origin for same-origin checks, for example `https://company.example` without a path or trailing slash. |
| `OLENTRA_FEATURE_ALLOW_LOCAL_DEMO` | Development permits loopback demo authorization by default. Production requires an explicit `true` for a local loopback preview; `false` disables the shortcut in every mode. |
| `OLENTRA_FEATURE_STORE_PATH` | Optional path to the durable server-side state file. |

The current persistence targets a persistent Node deployment with one shared filesystem path. Mount a durable volume for the runtime JSON file. A container or host with ephemeral storage loses its runtime settings when that storage is replaced. Separate replicas with separate files do not provide a shared fleet-wide database; distributed database storage is not implemented here.

## Browser-local fixture files

| File | Contents |
| --- | --- |
| `frontend/src/data/admin/core.json` | Environment-specific feature flags, navigation, feature rules and schedules, demo accounts and authentication defaults. |
| `frontend/src/data/admin/content.json` | Website content and revisions, media, programs, applications, interns, projects, tasks, certificates and enquiries. |
| `frontend/src/data/admin/operations.json` | Visit events, performance probes, incidents, alert rules, SEO, locales, translations, team members and role permissions. |
| `frontend/src/data/admin/governance.json` | Approvals, audit history, integrations, shared security policy and sessions, company/account preferences, backups and notifications. |

Each domain file has this structure:

```json
{
  "datasets": {
    "exact-dataset-key": []
  },
  "templates": {
    "dynamic-key-prefix-": {}
  },
  "reference": {}
}
```

`datasets` supplies mutable records and settings. `templates` supplies defaults for dynamic records such as a page editor, program or integration configuration. `reference` contains labels, catalogs and other fixture information.

`frontend/src/lib/admin/data-source.js` combines the files through `createInitialState()` in `model.mjs`. Changing a fixture file changes the initial scenario. An existing browser scenario remains until it is reset.

## Shared browser store

The data flow is:

```text
JSON fixtures → initial database → browser store → page hooks and selectors
                                      ↑
                                workflow commands
```

The implementation is split across:

- `frontend/src/lib/admin/data-store.js`: hydration, persistence, command dispatch, export/import/reset and tab synchronization.
- `frontend/src/components/admin/data-hooks.jsx`: `useDatabase()` and `useDataset()` subscriptions. The existing `useLocalState()` UI helper uses the shared dataset system.
- `frontend/src/components/admin/store.jsx`: the dashboard provider, current account, permissions, environment, region and action helpers.
- `frontend/src/lib/admin/model.mjs`: transactions, authentication, feature/navigation commands, snapshot validation and reconciliation.
- `frontend/src/lib/admin/content-commands.mjs`, `operations-commands.mjs` and `governance-commands.mjs`: domain validation and workflow transitions.
- `frontend/src/lib/admin/selectors.mjs`: derived traffic, availability, progress, permissions, effective feature states and overview counts.

Records and counters use canonical datasets. For example, `olentra-admin-governance-approvals-v1` drives both the approval queue and pending count; `olentra-admin-notifications-v1` drives the inbox and unread badge. Security and team pages share `olentra-admin-security-policy-v1` and `olentra-admin-security-sessions-v1`.

## Workflow commands

The provider exposes:

```js
const result = command("approval.decide", {
  id: "CHG-024",
  decision: "approve"
});

if (!result.ok) {
  // Display result.error; do not report success.
}
```

The model validates permissions and payloads, applies nested commands within one transaction, reconciles related records, and returns `{ ok, error, value, state }`. The browser API returns the command outcome and persistence status. A thrown validation error discards the transaction. Handled authentication failures can intentionally update verification attempts or expire a session.

| Workflow | Commands and effects |
| --- | --- |
| Website controls | The live UI writes through the server feature API described above. Legacy `features.*` and navigation commands remain browser-scenario operations; they do not override the live server switches. |
| Approvals | `approval.request`, `approval.decide` operate on browser-local content, program, SEO and translation workflows. Legacy feature requests are local scenario records and do not gate live website visibility. Decisions are `approve`, `reject` and `changes`; rejection and change requests require a note. Identical pending revisions are deduplicated. |
| Content | `content.save` saves a draft or submits a captured revision for review. Approval invokes `content.publish`; `content.restore` restores a saved revision as a draft. `media.update` saves asset metadata. |
| Programs | `program.save` validates dates and capacity. Review creates an approval; `program.publish` publishes the reviewed program snapshot. Global internship visibility and program-level intake remain separate settings. |
| Recruitment | `application.transition/update/note/message/offer`. Stage transitions enforce the recruitment sequence. Joining creates the corresponding onboarding intern record and checks capacity. Messages and offers are local records. |
| Internship delivery | `task.create/submit` validates project membership and records sample submissions; `task.review` records feedback and submission history. `intern.transition` checks onboarding or completion requirements. `certificate.issue/revoke/publish` maintains eligibility and verification state. |
| Enquiries | `enquiry.update/note/reply` manages ownership, status, follow-up, internal notes and local conversation records. |
| Operations | `incident.update`, `alert.save/delete`, SEO metadata/redirect/link commands, `locale.save/recalculate`, `regional.save` and translation commands update the shared operational records. |
| Access | Team invitation/member commands and `role.save` update team and role data. Security settings affect the local authentication policy; `session.revoke` protects the current session. |
| Integrations | `integration.save/connect/test` validates saved local configuration. Missing credential configuration and malformed fields fail validation. Typed service credentials are not retained. |
| Settings | `settings.save` supports company, security, account, backup, notification preferences, SSO and approval policy sections. Account updates synchronize the profile, team member and demo account. |
| History and recovery | `audit.restore` applies an event's saved configuration snapshot. `backup.create/restore` captures and restores local JSON; restoration requires the literal confirmation `RESTORE`. |
| Notifications | `notification.read/readAll/delete` changes the shared inbox and derived unread count. |
| Clock and authentication | `clock.set/tick` evaluates local time-dependent behavior. `auth.*` commands operate the demo sign-in, verification, sign-out, recovery and password flows. |

Approval policies apply to the local dashboard workflows. Live website switch changes take effect immediately and are not delayed, overwritten or activated by these browser approval records or simulation schedules.

Approval review pages show the actual saved proposal and current published snapshot. An item without an earlier publication is labeled **Not published yet**.

## Persistence and the simulation clock

The browser stores the database at localStorage key `olentra.admin.database.v2`. State survives reloads and synchronizes between tabs using the same origin. Use the same hostname and port to keep one scenario; `localhost` and `127.0.0.1` have separate browser storage.

The initial browser fixture clock is `2026-11-08T12:00:00.000Z`. The store advances it with elapsed wall time, including elapsed time between reloads. **Company settings → Data management → Simulation clock** can move it explicitly to exercise browser-local time-dependent behavior. This simulation clock and its legacy feature schedules do not change the authoritative live website switches.

If browser storage is unavailable or full, the dashboard retains the current in-memory state and displays a persistence error. Download a JSON snapshot to preserve that scenario.

## Export, import and reset

Use **Settings & Backups → Company → Data management** with a role that has Settings management permission.

- **Download JSON** exports the complete local database, including metadata, datasets, audit history and demo authentication data.
- **Upload JSON** previews a selected file and requires confirmation before replacement. Validation checks the schema version, required dataset and object shapes, safe JSON properties, unique record IDs and account emails, valid account/session references, feature booleans, and core program/intern/project/certificate relationships. Invalid snapshots leave the current scenario unchanged.
- **Reset fixtures** requires typing `RESET`. It replaces local changes with the original fixture scenario across all modules.

The browser export schema version is `2`. Static reference catalogs and dynamic templates come from the current application code; imported snapshots supply the browser-local datasets and metadata. Browser export/import/reset and backup restore do not replace `.data/site-features.json` or undo live visibility changes. Use Website controls to change the server switches.

Backups are a separate recovery workflow. A backup contains a filtered restorable snapshot rather than a full import file. Recovery supports **Content only**, **Configuration only**, or **Content and configuration**, and preserves excluded authentication, audit, notification, backup and telemetry records. A backup detail/manifest download is not the same format as **Download JSON**; restore it through the backup workflow instead of the full database importer.

## Tests

Run the actual-model integration suites with Node:

```sh
node --test frontend/scripts/admin-core.test.mjs frontend/scripts/admin-content.test.mjs frontend/scripts/admin-operations.test.mjs frontend/scripts/admin-governance.test.mjs
```

The suites use the real fixtures, model and selectors. They cover transitions and derived data, approval publication and rollback, duplicate requests, permissions and demo authentication, configuration validation, backup recovery, notification counts and snapshot validation.

## Frontend boundary

Website feature visibility is server-shared and enforced on this website through the API, SSE, proxy and client gates described above. Other dashboard records and workflow effects remain browser-local. Integration tests validate local configuration without contacting providers. Email delivery, production identity-provider integration, real infrastructure monitoring, content deployment and multi-user business data storage still require connected services. The live-control endpoint updates visibility settings; it does not deploy content, send email or alter an external account.
