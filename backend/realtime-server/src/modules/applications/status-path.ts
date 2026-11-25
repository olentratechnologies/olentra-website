import { DomainError } from "../../shared/errors";

/** Statuses staff may set on an application by hand (Joined and Withdrawn come from other flows). */
export const SETTABLE_STATUSES = ["Applied", "Under Review", "Shortlisted", "Selected", "Rejected", "Declined"] as const;

/**
 * Validates a multi-step status change such as
 * ["Under Review", "Shortlisted", "Selected"]. The last step is the final
 * status; when a plain `status` is also given it must match that last step.
 */
export function statusPath(raw: unknown, status = ""): string[] {
  const path = Array.isArray(raw) ? raw.map(step => typeof step === "string" ? step.trim() : "") : [];
  const valid = path.length > 0 && path.length <= 4
    && path.every(step => (SETTABLE_STATUSES as readonly string[]).includes(step))
    && new Set(path).size === path.length
    && (!status || status === path[path.length - 1]);
  if (!valid) throw new DomainError("INVALID_REQUEST", "Choose a valid sequence of application statuses.");
  return path;
}
