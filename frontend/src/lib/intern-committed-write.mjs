// These commands have committed before the WebSocket acknowledgement. Their
// callers either consume the returned record directly or refresh their own
// lists, so they need not block on the larger workspace snapshot.
const backgroundWrites = new Set(["program.configure", "settings.update"]);
const locallyReconciled = backgroundWrites;
export const canRefreshInternWriteInBackground = method => backgroundWrites.has(method);
export const canReconcileInternWrite = method => locallyReconciled.has(method);

export function reconcileInternWrite(snapshot, actor, method, params, result) {
  // Never merge a response into a different or revoked account's workspace.
  if (!actor || snapshot.account?.id !== actor.id || snapshot.account?.sessionVersion !== actor.sessionVersion || snapshot.account?.role !== actor.role) return snapshot;
  const next = { ...snapshot, data: { ...snapshot.data }, my: { ...snapshot.my } };
  if (method === "program.configure") {
    next.data.programs = snapshot.data.programs.map(program => program.id === result.id ? { ...program, ...result, detail: `Fee ₹${result.fee}, stipend ₹${result.stipend}` } : program);
    next.data.settings = { ...snapshot.data.settings, [result.id === "explorer" ? "explorerEnabled" : "innovatorEnabled"]: result.enabled, maxStipend: Math.max(snapshot.data.settings.maxStipend || 0, result.stipend) };
  } else if (method === "settings.update") {
    next.data.settings = { ...snapshot.data.settings, ...params.patch };
  } else return snapshot;
  return next;
}
