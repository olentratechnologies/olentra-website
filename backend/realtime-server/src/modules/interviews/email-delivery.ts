/** Pending messages must still describe the current interview when the worker sends them. */
export function isCurrentInterviewEmail(current: Record<string, any> | null, payload: Record<string, string>, reminder: boolean, now = Date.now()) {
  if (!current || Number(current.sequence || 0) !== Number(payload.sequence || 0) || current.scheduledAt !== payload.scheduledAt) return false;
  if (!reminder) return current.status === payload.status;
  return current.status !== "Cancelled" && new Date(String(current.scheduledAt)).getTime() > now;
}
