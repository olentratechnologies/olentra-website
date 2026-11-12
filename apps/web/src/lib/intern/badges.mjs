/**
 * Intern badges, earned from the portal's `my` object. Pure logic so the
 * dashboard row and the unlock celebrations agree on what has been earned.
 */
export const ON_TIME_STREAK = 3;
export const HIGH_FIVE = 5;

export const ALL_BADGES = [
  { id: "onboarded", title: "Onboarded", icon: "🚀", description: "Your onboarding was approved.", hint: "Finish onboarding and get it approved." },
  { id: "first-submission", title: "First submission", icon: "📤", description: "You submitted your first piece of work.", hint: "Submit work on any task." },
  { id: "first-approval", title: "First approval", icon: "✅", description: "Your first submission was approved.", hint: "Get a submission approved." },
  { id: "high-five", title: "High five", icon: "✋", description: `${HIGH_FIVE} submissions approved.`, hint: `Get ${HIGH_FIVE} submissions approved.` },
  { id: "on-time-streak", title: "On-time streak", icon: "⏱️", description: `${ON_TIME_STREAK} approvals in a row, each submitted by its due date.`, hint: `Get ${ON_TIME_STREAK} approvals in a row, each submitted by the due date.` },
  { id: "certified", title: "Certified", icon: "🎓", description: "Your certificate was issued.", hint: "Complete your internship to earn a certificate." },
];

const time = (value) => {
  const parsed = Date.parse(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : null;
};
/** Calendar day (UTC) as YYYY-MM-DD, or null. */
const day = (value) => {
  const parsed = time(value);
  return parsed === null ? null : new Date(parsed).toISOString().slice(0, 10);
};
const byTime = (key) => (a, b) => (time(a[key]) ?? Infinity) - (time(b[key]) ?? Infinity);
const earliest = (values) => values.filter((value) => time(value) !== null).sort((a, b) => time(a) - time(b))[0] ?? null;

/** Approved submissions in the order they were approved, one per task. */
function approvals(my) {
  const seenTasks = new Set();
  return (my?.submissions || [])
    .filter((submission) => submission?.status === "Approved")
    .sort(byTime("reviewedOn"))
    .filter((submission) => {
      const key = submission.taskId ?? submission.id;
      if (seenTasks.has(key)) return false;
      seenTasks.add(key);
      return true;
    });
}

/** When the on-time streak was reached, or null. A late or undated approval resets it. */
export function onTimeStreakAt(my) {
  const due = new Map((my?.tasks || []).map((task) => [task?.id, task?.dueOn]));
  let run = 0;
  for (const submission of approvals(my)) {
    const submitted = day(submission.submittedOn), dueOn = day(due.get(submission.taskId));
    run = submitted && dueOn && submitted <= dueOn ? run + 1 : 0;
    if (run >= ON_TIME_STREAK) return submission.reviewedOn ?? submission.submittedOn ?? null;
  }
  return null;
}

/** Badges earned so far, in `ALL_BADGES` order, each with `earnedAt` (ISO string or null when unknown). */
export function earnedBadges(my) {
  const earned = new Map();
  const onboarding = my?.onboarding;
  if (onboarding?.status === "Approved") earned.set("onboarded", onboarding.approvedOn ?? null);

  const submissions = (my?.submissions || []).filter((submission) => submission?.id || submission?.taskId);
  if (submissions.length) earned.set("first-submission", earliest(submissions.map((item) => item.submittedOn)));

  const approved = approvals(my);
  if (approved.length) earned.set("first-approval", approved[0].reviewedOn ?? null);
  if (approved.length >= HIGH_FIVE) earned.set("high-five", approved[HIGH_FIVE - 1].reviewedOn ?? null);

  const streak = approved.length >= ON_TIME_STREAK ? onTimeStreakAt(my) : null;
  if (streak !== null) earned.set("on-time-streak", streak);

  const certificates = (my?.certificates || []).filter((certificate) => certificate?.id && certificate.status !== "Revoked");
  if (certificates.length) earned.set("certified", earliest(certificates.map((item) => item.issuedOn)));

  return ALL_BADGES.filter((badge) => earned.has(badge.id)).map(({ id, title, description, icon }) => ({
    id, title, description, icon, earnedAt: earned.get(id),
  }));
}
