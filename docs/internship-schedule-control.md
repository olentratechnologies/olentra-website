# Internship schedule control

The program duration is a positive quantity plus `months`, `weeks`, or `days`. The existing duration label remains readable for older clients. Unambiguous legacy text can be converted; ranges and descriptions require admin review.

Each student receives an explicitly selected start date. Completion is calculated server-side. Calendar months use a clamped next anniversary minus one day: 24 November–23 December; 31 January 2027–27 February 2027. Days and weeks are inclusive. Civil dates are stored as YYYY-MM-DD; “today” and deadline communications use Asia/Kolkata. Completion never automatically awards a certificate.

## Sending and correcting an offer

1. Settings → choose duration quantity and unit; save.
2. Applicant → choose start date → Review offer schedule.
3. Review calculated duration/start/completion, stipend, and the separate acceptance deadline → Confirm and send.
4. An issued offer's schedule does not change when Settings changes.
5. Revise schedule requires a reason. Review the proposal before sending. A duration exception is available in the revision form.
6. For a pending initial offer, revision replaces the decision target. For an accepted offer, the old terms remain effective until the student accepts the proposed correction. Decline, expiry and withdrawal retain accepted terms. Only one unexpired proposal is allowed.
7. Students review changes in My application. Documents shows current and previous accepted letters. Completed/dropped internships and issued certificates cannot be revised.

Offer versions archive recipient/program/role/schedule/stipend and issue date. Terms are immutable; decision metadata can be added. Notifications and email outbox rows pin the offer snapshot, including its version. Superseded invitations are marked `superseded`, rather than delivered with newer terms. Decision emails and attachments retain their original version. Onboarding approval records enrollment separately from scheduled internship start.

## RPC changes

- `offer.preview({applicationId,startOn,revising?,durationOverride?,reason?})` → server-calculated schedule and configRevision; admin only.
- `offer.send({...preview,stipend,expiresInDays,message})` → versioned offer; admin only, future/current start required. Missing/stale configRevision or independently altered completion dates are rejected.
- `offer.revise({...preview,reason,expiresInDays})` → replacement invitation or pending correction to accepted terms; admin only.
- `offer.accept/offer.decline({applicationId,version,...})` → applicant decision on the reviewed version; old unversioned clients must refresh.
- `offer.revision.accept/decline({applicationId,version})` → owner-only decisions.
- `offer.revision.withdraw({applicationId,version})` → admin withdraws proposal.
- `offer.versions({applicationId})` → immutable terms with decision history; applicant owner or admin only.

All mutations use transactional idempotency keys and retain audit and application history. Program configRevision changes when duration settings change. `offer_versions` has a unique applicationId/version index and participates in applicant erasure and retention.

## Legacy migration and rollout

Run from backend/realtime-server:

```
bun scripts/migrate-offer-schedules.ts
bun scripts/migrate-offer-schedules.ts --apply
```

Dry-run is the default; it reads and reports counts only. Apply parses precise program durations, archives legacy version 1, pins pending legacy offer emails, and adds version/review metadata. It does not change any offer dates or send any messages. Ambiguous durations remain blocked for new offers until an admin configures them.

Deploy backend and frontend together during a low-traffic window: legacy readers tolerate added fields, but old unversioned acceptance requests intentionally fail with a refresh-required conflict. Preserve the approved PDF design. First dry-run and review results, then apply migration. Admins explicitly propose corrections for flagged offers; never mass-rewrite accepted dates.

Check outbox failed/superseded counts and schedule audit entries following rollout. Rollback retains all immutable versions and confirmed dates; do not restore older clients that overwrite offers without version checks.
