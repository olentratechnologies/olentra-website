/**
 * Unfinished apply-form answers, kept in this browser's localStorage only.
 * Nothing here is sent anywhere until the person submits. The resume file
 * can't be stored, so it has to be chosen again.
 */
import { isInternRole, isInternSchedule } from "./opportunities.mjs";

export const APPLY_DRAFT_KEY = "olentra_apply_draft_v1";
export const DRAFT_FIELDS = ["fullName", "email", "linkedin", "github", "videoUrl"];
const MAX_FIELD = 500;
/** Drafts older than this are dropped. */
const MAX_AGE_MS = 14 * 86_400_000;

export function readApplyDraft(storage = globalThis.localStorage, now = Date.now()) {
  try {
    const draft = JSON.parse(storage?.getItem(APPLY_DRAFT_KEY) || "null");
    if (!draft || typeof draft !== "object" || now - Number(draft.savedAt || 0) > MAX_AGE_MS) return null;
    if (draft.roleId !== undefined && !isInternRole(draft.roleId)) delete draft.roleId;
    if (draft.schedule !== undefined && !isInternSchedule(draft.schedule)) delete draft.schedule;
    return draft;
  } catch { return null; }
}

export function writeApplyDraft(values, storage = globalThis.localStorage, now = Date.now()) {
  try {
    const draft = { savedAt: now };
    for (const field of [...DRAFT_FIELDS, "track"]) if (typeof values?.[field] === "string") draft[field] = values[field].slice(0, MAX_FIELD);
    if (isInternRole(values?.roleId)) draft.roleId = values.roleId;
    if (isInternSchedule(values?.schedule)) draft.schedule = values.schedule;
    if ([...DRAFT_FIELDS, "roleId", "schedule"].every((field) => !draft[field])) { storage?.removeItem(APPLY_DRAFT_KEY); return; }
    storage?.setItem(APPLY_DRAFT_KEY, JSON.stringify(draft));
  } catch { /* storage blocked or full: drafts are optional */ }
}

export function clearApplyDraft(storage = globalThis.localStorage) {
  try { storage?.removeItem(APPLY_DRAFT_KEY); } catch { /* storage blocked */ }
}
