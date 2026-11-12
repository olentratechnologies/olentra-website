/**
 * Intern milestones that staff trigger and the intern discovers later (offer
 * received, onboarding approved, work approved, certificate issued, badges
 * unlocked). Pure logic,
 * so the portal can decide what to celebrate exactly once per account.
 */
import { earnedBadges } from "./badges.mjs";

export const FIRST_RUN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
export const SEEN_STORAGE_PREFIX = "olentra_celebrated_v1:";
export const WELCOME_FLAG = "olentra_celebrate_welcome_v1";

const time = (value) => {
  const parsed = Date.parse(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : null;
};

/** `tier: "big"` gets the full-page overlay; `"medium"` gets a burst + toast. Higher priority shows first. */
export function currentMilestones(my) {
  const items = [];
  const offer = my?.offer;
  if (offer?.id && offer.status === "Sent")
    items.push({ key: `offer-received:${offer.id}`, kind: "offer-received", tier: "big", priority: 1, at: time(offer.sentOn) });
  const onboarding = my?.onboarding;
  const applicationId = onboarding?.applicationId || my?.application?.id;
  if (applicationId && onboarding?.status === "Approved")
    items.push({ key: `onboarding-approved:${applicationId}`, kind: "onboarding-approved", tier: "big", priority: 2, at: time(onboarding.approvedOn) });
  for (const certificate of my?.certificates || [])
    if (certificate?.id)
      items.push({ key: `certificate:${certificate.id}`, kind: "certificate", tier: "big", priority: 3, at: time(certificate.issuedOn), certificateId: certificate.id, program: certificate.program });
  const tasks = new Map((my?.tasks || []).map((task) => [task.id, task]));
  for (const submission of my?.submissions || [])
    if (submission?.id && submission.status === "Approved")
      items.push({ key: `submission-approved:${submission.id}`, kind: "submission-approved", tier: "medium", priority: 0, at: time(submission.reviewedOn), taskTitle: tasks.get(submission.taskId)?.title || "" });
  for (const badge of earnedBadges(my))
    items.push({ key: `badge:${badge.id}`, kind: "badge", tier: "medium", priority: 0, at: time(badge.earnedAt), badgeId: badge.id, title: badge.title, icon: badge.icon });
  return items;
}

/**
 * Milestones not celebrated yet, most important first. `seen` is a Set of keys,
 * or null when this browser has no record — then only recent milestones count,
 * so long-standing interns are not flooded after this feature ships.
 */
export function pendingCelebrations(milestones, seen, now = Date.now()) {
  return milestones
    .filter((item) => (seen ? !seen.has(item.key) : item.at !== null && now - item.at <= FIRST_RUN_WINDOW_MS))
    .sort((a, b) => b.priority - a.priority || (b.at ?? 0) - (a.at ?? 0));
}

export function readSeen(storage, accountId) {
  try {
    const raw = storage?.getItem(SEEN_STORAGE_PREFIX + accountId);
    if (raw == null) return null;
    const list = JSON.parse(raw);
    return new Set(Array.isArray(list) ? list.filter((key) => typeof key === "string") : []);
  } catch {
    return null;
  }
}

export function writeSeen(storage, accountId, seen) {
  try {
    storage?.setItem(SEEN_STORAGE_PREFIX + accountId, JSON.stringify([...seen].slice(-500)));
    return true;
  } catch {
    return false;
  }
}
