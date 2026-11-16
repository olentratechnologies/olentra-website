# DashboardAuditor — run 61c7fdbd participant 0

Verified against `backend/realtime-server/src` (policy.ts, command-dispatcher.ts, query.service.ts, lifecycle.service.ts). Findings, most severe first:

1. `apps/web/src/components/intern/dashboard/ProjectsPage.jsx:495` — The card dereferences `project.team` for every project, but `project.list` deliberately omits `team` for staff whose role holds only `projects.summary` (the server's summary branch projects `{_id,name,status,progress,dueOn,program}`). — A role that `staffAccess.canOpenInternSection` explicitly admits gets a render-time `TypeError`, so their Projects page renders nothing at all.
```jsx
<span>{project.team.length} members</span>
```

2. `ProjectsPage.jsx:376` — `saveProject` treats only `false` as failure, but `updateProject` is wired as `legacy("project.update", …, null)`, which returns `null` when the call fails, so the guard never fires. — A rejected save (e.g. a member who was just dropped elsewhere) closes the modal and toasts "Project changes saved." right after the error toast, throwing the edits away.
```jsx
if (saved === false) return;
setDetail(null);
notify("Project changes saved.");
```

3. `ApplicationsPage.jsx:721` — The status `<select>` only disables options for non-admins and for `Joined`; `Withdrawn` (declared at line 58) is never disabled, yet `application.update` rejects anything outside Applied/Under Review/Shortlisted/Selected/Rejected/Declined. — An admin who picks Withdrawn gets "Choose a valid change and the current application version." and the withdrawal is never recorded; the same drifted gate is copied at `ApplicantDetailPage.jsx:632`.
```jsx
(!isAdmin && !["Applied", "Under Review", "Shortlisted"].includes(value) && value !== editingApplication?.status) || (value === "Joined" &&
  editingApplication?.status !== "Joined") ||
```

4. `ApplicantDetailPage.jsx:665` — The whole interview panel, including the only "Cancel interview" control (line 668), renders only while `application.status === "Shortlisted"`, and `scheduleInterview`/`cancelInterview` are called nowhere else in the dashboard. — Once the applicant is moved to Selected or Rejected, the interview and its meeting link stay live with no staff path to cancel or reschedule it.
```jsx
{canReview && application.status === "Shortlisted" && <Panel>
  <h2 className={styles.panelHeading}>Interview scheduling</h2>
```

5. `InternsPage.jsx:353` — "Mark as completed" is offered for every intern whose status is not Completed, including Dropped ones, but `intern.update` only allows Active (or Completed) → Completed. — Admins who use it on a dropped intern get "Only active internships can be completed." and the row silently stays dropped.
```jsx
...(!isAdmin || intern.status === "Completed"
  ? []
  : [{ label: "Mark as completed", onClick: () => changeStatus(intern, "Completed") }]),
```

6. `ApplicantDetailPage.jsx:272` — `saveNote` awaits `addActivity`, and `activity.add` is absent from the staff permission map, so the server applies `requireAdmin` and refuses it for every non-admin reviewer. — A reviewer sees "Your internship staff role does not allow this action." immediately followed by "Reviewer note saved." on each note, and the note never appears in the activity feed.
```jsx
await addActivity({
  title: "Reviewer note added",
```

7. `InternsPage.jsx:369` — "Mark as dropped" calls `changeStatus` straight from the row menu with no confirmation, while this codebase gates lesser actions (saved views, templates, resources) behind `window.confirm` and gates bulk rejection behind a modal. — One mis-click ends an internship, recoverable only by finding the same menu again and guessing "Reactivate".
```jsx
label: "Mark as dropped",
onClick: () => changeStatus(intern, "Dropped"),
danger: true,
```

ProjectsPage.jsx:495 (summary-only roles crash the page), ProjectsPage.jsx:376 (failed project save reports success)