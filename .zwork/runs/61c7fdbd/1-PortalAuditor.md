# PortalAuditor — run 61c7fdbd participant 1

I've read all 30 files and cross-checked each form against the server handlers in `backend/realtime-server/src` (application.submit, offer.accept, onboarding.submit, submission.create, checkin.submit, profile.update, feedback/story services, checkin ISO-week logic). Findings below are limited to what I could point at in code.

## Findings

1. **`apps/web/src/components/intern/portal/PortalApplication.jsx:50`** — The offer deadline is computed once per render (`offerTimeLeft(offer.expiresOn)`) with no timer, so the `Accept offer` gate at :231 and the “N days left to decide” text at :248 never advance while the page is open. Consequence: an intern who leaves the page open past `expiresOn` still sees an enabled Accept button and a stale remaining-time label, and the click is refused with OFFER_EXPIRED — it reads as a broken button rather than a missed deadline.
```js
const timeLeft = offer?.status === "Sent" ? offerTimeLeft(offer.expiresOn) : null;
disabled={action.busy || Boolean(timeLeft?.expired)}
```

2. **`apps/web/src/components/intern/portal/PortalProjects.jsx:158`** — “Submit for review” is disabled only by `action.busy || uploading`, while `notes` (:101) is not required and `url` (:111) may be empty, so a completely blank submission can be sent. Consequence: the server rejects it (`if (!notes && !url && !attachmentId) throw INVALID_REQUEST`), the task stays “In progress”, and the intern gets an error instead of a saved version.
```jsx
type="submit"
busy={action.busy}
disabled={action.busy || uploading}
```

3. **`apps/web/src/components/intern/InternLanding.jsx:196`** — `canApply` requires `connected`, so any WebSocket gap (including the seconds before the first connect, and any drop while filling the form) swaps the entire form for the panel at :1137 whose heading is “Applications are currently closed”. Consequence: visitors on a flaky or blocked socket are told the intake is closed while the body text admits the service is merely unavailable, and anyone mid-form loses the visible form and their chosen resume.
```js
const canApply = Boolean(featuresReady && features.internships && features.applications && connected && data.opportunities && availablePrograms.length && !deadlineClosed);
<h2>Applications are currently closed</h2>
```

4. **`apps/web/src/components/intern/portal/WeeklyCheckin.jsx:23`** — `if (!data) return null` ignores `query.error`, so a failed `checkin.list` removes the whole panel instead of showing the failure. Consequence: the intern sees no weekly check-in section, no error and no retry, and the week passes without the check-in that the portal otherwise prompts for.
```js
const query = useInternQuery("checkin.list", { applicationId });
if (!data) return null;
```

5. **`apps/web/src/components/intern/portal/ExitFeedback.jsx:26`** — `if (!state?.eligible) return null` treats a failed `feedback.mine` load identically to “not eligible”. Consequence: a just-completed intern whose query fails gets no exit-feedback form and no message, and nothing re-runs the query, so the one-time feedback is silently lost.
```js
if (!state?.eligible) return null;
```

6. **`apps/web/src/components/intern/InternLanding.jsx:768`** — The full-name input has `required` and `maxLength={120}` but no `minLength`, and `submitPreview` only rejects an empty trimmed value, so a one-character name passes the client. Consequence: the resume is uploaded first and only then does the server refuse with “Enter your full name and a valid email address.” — an error that points at the email field the applicant filled correctly.
```jsx
name="fullName"
autoComplete="name"
required
```

7. **`apps/web/src/components/intern/Celebration.jsx:33`** — The overlay declares `role="dialog" aria-modal="true"` and focuses the action button, but its effect only binds Escape; there is no Tab trap and the page behind is never made inert (compare the trap in `ApplicationLaunch.jsx:141`). Consequence: on the offer-accepted milestone a keyboard user can Tab out of the dialog and activate controls hidden behind the overlay.
```js
const onKey = (event) => { if (event.key === "Escape") closeRef.current?.(); };
document.addEventListener("keydown", onKey);
```

8. **`apps/web/src/components/intern/InternFaq.jsx:130`** — The deadline answer is recomputed only when the `deadline` prop changes, although it embeds `Date.now()`. Consequence: a visitor who leaves the page open past the cut-off keeps reading “Applications for this intake close on <date>” while the application section above has already switched to the closed state.
```js
useEffect(() => { setDeadlineText(deadlineAnswer(deadline)); }, [deadline]);
```

I checked specifically for the other classes in the brief and found nothing verifiable: no leaked intervals (every `setInterval`/`setTimeout`/listener in these files has a cleanup), no divide-by-zero (`LearningResources`, `Progress`, `TrackDonut`, `ratioFor` all guard), no `Invalid Date`/`NaN` path that is reachable from server-shaped data (`deadlineTime`, `offerTimeLeft`, `CertificateVerify.formatDate` all guard), and the sign-in form keeps the typed email in provider state across failures.

Offer expiry never advancing, empty submission accepted