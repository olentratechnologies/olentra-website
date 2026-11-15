import { DomainError } from "../../shared/errors";

/** Latest a deadline may be set: about two years ahead keeps typos (year 2205) out. */
const MAX_AHEAD_MS = 2 * 366 * 24 * 60 * 60 * 1000;

/** A stored deadline as an ISO timestamp, or null when none (or an unreadable value) is saved. */
export function normalizeDeadline(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

/**
 * Validates a deadline sent from settings: null clears it, otherwise it must
 * be a real future timestamp within two years. Returns the ISO form to store.
 */
export function parseDeadlinePatch(value: unknown, now = Date.now()): string | null {
  if (value === null || value === "") return null;
  const deadline = normalizeDeadline(value);
  if (!deadline) throw new DomainError("INVALID_REQUEST", "Enter a valid application deadline.");
  const time = Date.parse(deadline);
  if (time <= now) throw new DomainError("INVALID_REQUEST", "Choose an application deadline in the future.");
  if (time - now > MAX_AHEAD_MS) throw new DomainError("INVALID_REQUEST", "Choose an application deadline within the next two years.");
  return deadline;
}
