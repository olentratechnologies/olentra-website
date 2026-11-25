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

export type ExtensionUnit = "hours" | "days";
/** What visitors see about an extended application window. */
export type PublicDeadlineExtension = { amount: number; unit: ExtensionUnit; previousDeadline: string | null; deadline: string; reopened: boolean; extendedOn: string };
const UNIT_MS: Record<ExtensionUnit, number> = { hours: 60 * 60 * 1000, days: 24 * 60 * 60 * 1000 };
const UNIT_LIMIT: Record<ExtensionUnit, number> = { hours: 720, days: 60 };

/**
 * Works out a deadline extension. A window that is still open gets the time
 * added to its current deadline. A closed window (deadline passed, or the
 * program switched off) reopens, counted from now, and the program is switched on.
 */
export function planDeadlineExtension(currentDeadline: unknown, amount: unknown, unit: unknown, now = Date.now(), programEnabled = true) {
  const current = normalizeDeadline(currentDeadline);
  if (unit !== "hours" && unit !== "days") throw new DomainError("INVALID_REQUEST", "Extend by hours or days.");
  const count = Number(amount);
  if (!Number.isSafeInteger(count) || count < 1 || count > UNIT_LIMIT[unit]) throw new DomainError("INVALID_REQUEST", `Extend by 1 to ${UNIT_LIMIT[unit]} ${unit}.`);
  if (programEnabled && !current) throw new DomainError("INVALID_REQUEST", "Applications are open with no end date, so there's nothing to extend. Set a deadline in Settings instead.");
  const reopened = !programEnabled || Date.parse(current!) <= now;
  const base = reopened ? now : Date.parse(current!);
  const deadline = new Date(base + count * UNIT_MS[unit]).toISOString();
  if (Date.parse(deadline) - now > MAX_AHEAD_MS) throw new DomainError("INVALID_REQUEST", "Choose an application deadline within the next two years.");
  return { amount: count, unit: unit as ExtensionUnit, previousDeadline: current, deadline, reopened };
}

/** The extension visitors should see: only while it still sets the current deadline. */
export function activeDeadlineExtension(config: any): PublicDeadlineExtension | null {
  const extension = config?.deadlineExtension, deadline = normalizeDeadline(config?.applicationDeadline);
  if (!extension || !deadline || normalizeDeadline(extension.deadline) !== deadline) return null;
  return { amount: Number(extension.amount), unit: extension.unit === "hours" ? "hours" : "days", previousDeadline: normalizeDeadline(extension.previousDeadline), deadline, reopened: Boolean(extension.reopened), extendedOn: String(extension.extendedOn) };
}
