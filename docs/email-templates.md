# Email templates

Open `/dashboard/email-templates` from **Email Templates** in the company dashboard sidebar or dashboard search. The catalog contains 49 email types and 147 complete preset previews.

Every type has three choices: **Branded Professional**, **Warm & Personal**, and **Minimal Direct**. Branded Professional is the initial default. Previewing a preset does not change the selection; **Use this template** immediately saves one choice for that email type.

The three designs use distinct enterprise formats: a corporate notification with structured record details, a signed letter with a dark Olentra masthead, and a concise executive memo. Each event supplies its department, status, reference, summary, detail fields, next steps, relevant notice, and departmental signature. Previews use the existing Olentra brand mark and company contact details. Mobile preview sizing follows the email canvas width, including when previewing a phone on a desktop.

Selections are saved in this browser. Email delivery is not connected to these selections. They are workspace-wide and do not vary by the environment or region selected in the dashboard header. No emails, test messages, scheduled reminders, or provider requests are triggered by this module.

## Catalog

“To users” means applicants, interns, and enquirers. “To Olentra team” includes internal notifications and staff access messages, including an invitation sent to a prospective team member. It does not represent a connected mailbox.

| Category | To users | To Olentra team |
| --- | --- | --- |
| Enquiries | Acknowledgement, reply, follow-up, resolved | New contact/project enquiry |
| Accounts | Intern registration welcome, sign-in link, password reset, password changed | — |
| Applications | Application received, under review, shortlisted, interview-stage update, selected, rejected, information requested | New application |
| Offers | Offer ready | Offer accepted, offer declined |
| Onboarding | Onboarding approved/welcome | Onboarding submitted |
| Projects and tasks | Project assigned, project updated, task assigned, task updated | — |
| Work reviews | Submission approved, changes requested | Work submitted |
| Internship and certificates | Internship completed, other status changes, certificate issued, certificate revoked | — |
| Conversations | Message from team, program announcement | Applicant/intern reply |
| Team access | — | Invitation, invitation accepted, access changed |
| Approvals | — | Approval requested, approved, rejected, changes requested |
| Monitoring | — | Incident alert, updated, resolved |
| Publishing and backups | — | Publication completed, backup created, backup restored |

Only four catalog events currently have existing email senders: new contact enquiry to Olentra, application confirmation, sign-in link, and password reset. Their existing senders continue to use their current content. The remaining presets cover workflow events whose email delivery is not connected.

Registration and application confirmation are separate events. The interview preset describes a stage change, not an appointment. Follow-up presets do not schedule messages. Other internship status changes share one status-update type, while onboarding approval and completion have dedicated types.

## Preview and selection

Search by event, and filter by category, recipient group, or current email availability. Each type identifies its trigger, recipient, placeholders, and selected preset. Previews use fictional data and provide desktop, mobile, and plain-text views. Action links inside previews are inactive.

Owner and Administrator roles can view and manage templates by default. Other roles require permission through **Team & Access**. A role with view permission alone can preview but cannot change selections.

## Data and recovery

The catalog is application reference data, exposed through `db.reference.governance.emailTemplates`. The shared browser database stores selections in `olentra-admin-email-template-selections-v1`, as a map from a stable email type ID to a variant ID. The command `emailTemplate.select({ typeId, variantId })` validates the relationship and records the selection in the audit log.

The existing `olentra.admin.database.v2` storage includes selections in reloads, cross-tab synchronization, JSON exports/imports, and configuration backups. Resetting fixtures restores default selections. Content-only recovery does not change template choices. Older saved workspaces receive missing template settings and permission entries without replacing existing data or permissions.

If browser storage is unavailable or full, changes remain in memory and the dashboard reports that they were not persisted. Export the workspace JSON to preserve that state.

The catalog supplies text and controlled layout data, not arbitrary executable HTML. This feature has no editor, generator, send action, mailbox connection, or backend delivery API.

## Verification

Run `npm run test:admin` for catalog, command, permissions, migration, storage, and existing dashboard tests. Run `npm run build` for the production frontend build. Browser checks cover discovery, search/filtering, previews, selection persistence, accessibility, and mobile layout.
