# Internship module demo

Run `npm run dev`, then open `http://localhost:3000/intern` or
`http://localhost:3000/intern/login`. This is a UI-only demo: applications,
accounts, reviews, messages, and certificates share browser-local state. No
backend, email delivery, or external account connection is used.

## Demo accounts

All seeded accounts start with the password `OlentraDemo123!`. On the login page,
open **Demo accounts**, choose an account to fill the correct account type and
credentials, then select **Sign In**. The Google and GitHub controls also open a
labelled local demo chooser; they do not connect to external identity services.

| Scenario                                  | Account type | Email                           |
| ----------------------------------------- | ------------ | ------------------------------- |
| Company administrator                     | Company      | `manideep@olentra.com`          |
| Pending applicant — Rahul Verma           | Intern       | `rahul-verma.0003@example.com`  |
| Selected, offer ready — Arjun Sharma      | Intern       | `arjun-sharma.0001@example.com` |
| Active intern — Ananya Singh              | Intern       | `ananya-singh.0006@example.com` |
| Completed, certificate ready — Mira Hegde | Intern       | `mira-hegde.1741@example.com`   |

Password reset displays a local verification code in the UI. The code expires
after 15 minutes and can be used once. Resetting a password increments the account
session version and invalidates its existing sessions. Resetting the entire demo
restores the seeded passwords.

## Routes

| Route                                 | Purpose                                                                       |
| ------------------------------------- | ----------------------------------------------------------------------------- |
| `/intern`                             | Program information and public application form                               |
| `/intern/register`                    | Create an intern account linked to the application just submitted in this tab |
| `/intern/login`                       | Intern/company login and demo account selection                               |
| `/intern/reset-password`              | Local demo password reset                                                     |
| `/intern/dashboard`                   | Company overview                                                              |
| `/intern/dashboard/applications`      | Company application directory and review                                      |
| `/intern/dashboard/applications/[id]` | Applicant profile, internal notes, offer, onboarding approval, and messages   |
| `/intern/dashboard/analytics`         | Program, track, funnel, and skills analytics                                  |
| `/intern/dashboard/interns`           | Active, completed, and dropped intern lifecycle                               |
| `/intern/dashboard/projects`          | Project teams, task assignment, and submission review                         |
| `/intern/dashboard/certificates`      | Certificate generation and previews                                           |
| `/intern/dashboard/settings`          | Program settings, profile, and demo reset                                     |
| `/intern/portal`                      | Intern's own application and work summary                                     |
| `/intern/portal/application`          | Own application timeline and offer decision                                   |
| `/intern/portal/onboarding`           | Profile checklist, resume, acknowledgement, and submission                    |
| `/intern/portal/projects`             | Assigned projects                                                             |
| `/intern/portal/projects/[id]`        | Own tasks and work submission                                                 |
| `/intern/portal/submissions`          | Submission versions and published review feedback                             |
| `/intern/portal/certificates`         | Own issued certificates                                                       |
| `/intern/portal/profile`              | Own profile and resume                                                        |

Protected layouts wait for store/session hydration before mounting their pages.
An absent session goes to login; the wrong account type goes to its own workspace.
The applicant detail route resolves browser-created IDs after hydration, rather
than rejecting IDs missing from the original JSON.

## End-to-end walkthrough

Use separate tabs for company and intern accounts to see updates pass between
them. Both tabs must use the same origin, including hostname and port.

1. While signed out, apply from `/intern` with a new email address, a track, and a
   resume. The success flow saves the application and links to account creation.
   Finish account creation in the same tab; the new account initially has
   application-tracking access.
2. In the company tab, find the applicant in **Applications**. Review their profile
   and set their status to **Selected**. Internal reviewer notes remain private to
   the company.
3. Open the applicant's **Application** tab → **Applicant Workflow** → **Offer**.
   Choose start/end dates, a permitted stipend, and a welcome message; send the
   offer.
4. In the intern tab, open **My Application** and accept the offer. Declining
   instead marks the application **Declined** and keeps onboarding closed.
5. Complete **Onboarding**: phone, college, location, resume, and the program
   acknowledgement. Saving a draft does not submit it. Submitting keeps the
   application **Selected** until the company approves it.
6. In the company applicant workflow, review the submitted checklist and choose
   **Approve onboarding**. This creates an active intern and changes the
   application to **Joined**.
7. In company **Projects**, create a project or add the intern to an existing team.
   Save team changes before assigning a task. The project detail's **Tasks &
   Reviews** section assigns tasks only to active members of that project.
8. The intern can start an assigned task and submit notes, a work link,
   or an attachment. Company **Submissions** within that project's workflow shows
   the latest version for review.
9. **Request changes** requires feedback. The intern can read it and submit a new
   version. **Approve submission** approves the latest submitted version while
   retaining earlier versions and their feedback.
10. In company **Interns**, mark the intern **Completed** after every required
    task is approved. Generate their certificate from **Certificates**. It then
    appears in the intern's **My Certificates** page.

The seeded selected, active, and completed accounts let you enter these workflows
without creating a new application. The active intern has sample tasks and a
submission awaiting review; the completed account already has an issued
certificate.

Company **Contact** and **Applicant Workflow → Messages** share the same
conversation with the intern portal's header **Messages** button. Company
announcements and workflow updates create targeted notifications. Read state is
per account. Company notes and unscoped internal activity are excluded from the
intern's projected records.

**Joined** is a terminal application stage. It is reached through onboarding
approval, not the manual application status dropdown. Manage enrollment lifecycle
through **Active**, **Completed**, and **Dropped** on the company Interns page.
Completed internships and their task records are read-only. Only completed interns
with every required task approved and no existing certificate are eligible for issuance.

## Source and data model

| File                                                    | Responsibility                                                                                                                |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `src/data/intern-dashboard.json`                        | Fictional base records: 2,540 applications, 740 interns, three projects, certificates, settings, contributions, and analytics |
| `src/data/intern-workflows.json`                        | Demo accounts, sample offer/tasks/submission, messages, notifications, and shared resources                                   |
| `src/lib/intern/workflow.mjs`                           | Pure state materialization, migration, role/ownership checks, workflow commands, session validation, and intern projections   |
| `src/components/intern/InternshipProvider.jsx`          | One provider for all `/intern` routes; browser storage, sessions, serialized commands, and cross-tab synchronization          |
| `src/components/intern/dashboard/DashboardProvider.jsx` | Compatibility exports for existing company pages; mutators return promises                                                    |
| `src/components/intern/dashboard/CompanyWorkflow.jsx`   | Company offer/onboarding/messages and project task/review panels                                                              |
| `src/lib/intern-attachments.mjs`                        | IndexedDB file storage, validation, downloads, and seeded-profile fallback downloads                                          |

Applications are the shared person reference. Accounts, intern records, project
teams, offers, onboarding, tasks, submissions, messages, and certificates link via
application IDs. Intern and project IDs remain stable. Submission records include
their task ID and version; the latest submitted version determines a task's review
state. Certificate records link both intern and application IDs.

Initial records come from JSON; browser actions write overrides and new records
separately. The browser never modifies source JSON. Company metrics derive their
current totals from the materialized application records; historical chart series
remain fixtures.

To regenerate the deterministic base records:

```sh
node scripts/generate-intern-fixtures.cjs
node scripts/verify-intern-dashboard.cjs
```

## Sessions, storage, and migration

| Storage        | Key/database                                   | Contents                                                               |
| -------------- | ---------------------------------------------- | ---------------------------------------------------------------------- |
| localStorage   | `olentra_intern_workflow_v2`                   | Versioned overrides and newly created workflow records                 |
| sessionStorage | `olentra_intern_session_v2`                    | This tab's account, account version, demo epoch, and eight-hour expiry |
| sessionStorage | `olentra_intern_pending_v2`                    | This tab's new-application claim used by account creation              |
| IndexedDB      | `olentra-intern-files-v2`, store `attachments` | Resume and work attachment blobs plus metadata                         |
| localStorage   | `olentra_intern_admin_v1`                      | Retained migration backup from the earlier company-only demo           |

Sessions survive navigation/reloads in their tab and have a fixed eight-hour
lifetime. Signing out removes the tab session without deleting saved workflow
records. Each tab can sign in as a different account. Store revisions synchronize
through storage events; Web Locks serialize origin-wide writes in supporting
browsers, with a per-provider command queue preserving local action order.

When a v2 store does not exist, the provider imports compatible v1 application,
intern, project, certificate, settings, and activity edits. Existing IDs and
relationships are retained. The old company profile becomes the company account
override. The original v1 key remains untouched. Future reloads use the v2 store.

**Settings → Reset demo data** writes a fresh v2 store with a new epoch, clears
local attachments, and signs out active demo sessions. Other tabs observe the
epoch change and must sign in again. The retained v1 backup is not reimported
because the fresh v2 store remains present.

Resume uploads accept PDF, DOC, and DOCX files up to 5 MB. Work attachments can be
up to 10 MB. Blobs stay in IndexedDB; localStorage stores attachment IDs, never
base64 files or persisted object URLs. Newly uploaded files download in their
original format from the browser where they were saved. Seeded applicants without
an uploaded file download a fictional text profile. Certificates support preview,
HTML download in the intern portal, and printing / Save as PDF through the
browser. Exports contain the current filtered records.

## Verification

```sh
node scripts/verify-intern-dashboard.cjs
node --test scripts/intern-workflow.test.mjs
npm run build
```

The fixture verifier checks exact totals, identity uniqueness, dates, bidirectional
project memberships, contributions, certificate eligibility, analytics, and company
route entry points. The workflow tests cover the complete application-to-certificate
journey, roles and ownership, private-note projection, duplicate protection,
required-work completion gates, seed submission overrides, migration, persistence,
password/session revocation, reset epochs, and malformed collection normalization.

For browser QA, exercise both account types in separate tabs, reload while signed
in, verify an unauthorized direct route, exchange a message, review/resubmit work,
and confirm the intern cannot see company notes. Test password reset and demo
reset across tabs. Use the same localhost origin throughout persistence checks.

## Login reference artwork

The login screen restores `Olentra Futuristic Internship Login Portal.png`:
the campus scene, “Build. Learn. Grow. Together.” headline, four-benefit strip,
and glass login card. The text, role switch, fields, and buttons are HTML.
The background is `public/images/intern/login-campus-unbranded.webp`
(1672 × 941), edited with built-in ImageGen and encoded as WebP. The building
lettering and physical logo have been removed; the page branding remains HTML.
Desktop spacing adapts to viewport height so the login fits shorter displays.

Brand wordmarks reuse the homepage multicolor logo, the full uppercase
**OLENTRA TECHNOLOGIES** name, slate `#334155`, and the homepage blue gradient.
`src/components/intern/CompanyBrand.jsx` shares this identity across authentication,
company/intern navigation, and certificate previews.

The demo chooser remains available through **Explore demo accounts** and the
local Google/GitHub simulation controls. All session and role behavior is unchanged.

Original image-edit prompt:

> Edit target: the attached 1672×941 Olentra login mockup. Make a clean full-bleed website BACKGROUND PLATE from it. Preserve the exact camera, composition, blue colors, photorealistic futuristic glass Olentra office building at the bottom-left, trees, reflective dark blue ground, large glowing blue planetary arc at upper-left, clouds, and luminous orbit trails. Retain the physical Olentra sign on the building facade. Remove ALL overlaid user-interface elements: the upper-left brand and logo, headline, paragraph, benefits panel and its icons/text, footer text, both role tabs, the ENTIRE right frosted glass login card, every input/button/social login element and all text. Seamlessly reconstruct only sky/clouds/blue planet lighting behind the removed elements; preserve placement of the building precisely, spanning the lower left with its roof apex around x815 y512 in the source, and open pale blue sky on the right for our real HTML login panel. No new objects or compositional changes. Return a landscape 16:9 clean photographic scene with no UI and no text except the existing physical building signage.

Building-sign removal prompt (built-in ImageGen):

> Edit image 1, the full 1672x941 blue futuristic office-campus background. Image 2 is ONLY a location reference showing the building sign to remove. Remove the entire illuminated 'Olentra' wordmark and the circular blue-purple logo mounted on the upper glass facade of the building in image1, around x655-785,y570-639. Inpaint that small area with continuous clean blue glass panels, correct panel mullions/grid lines, matching reflections and lighting so it looks like the building never had any sign there. There must be no lettering, no logo, no replacement sign or traces on that facade. Preserve EVERYTHING else exactly: the building geometry and placement, windows, interior lighting, trees, sky, clouds, planet arc, glowing orbital trails, dark reflective ground, camera and colors. This is a precise local sign-removal edit, not a redesign. Keep the original landscape dimensions/composition.
