/**
 * Runs `task(item)` for every item with limited concurrency and reports which
 * succeeded and which failed. `task` resolves to `{ ok, error }`; thrown errors
 * count as failures. Order of `succeeded`/`failed` follows the input order.
 */
export async function runBulk(items, task, concurrency = 4) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      try {
        const result = await task(items[index]);
        results[index] = result?.ok ? { ok: true } : { ok: false, error: typeof result?.error === "string" ? result.error : result?.error?.message || "Not updated." };
      } catch (error) {
        results[index] = { ok: false, error: error?.message || "Not updated." };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, worker));
  return {
    succeeded: items.filter((_, index) => results[index]?.ok),
    failed: items.flatMap((item, index) => (results[index]?.ok ? [] : [{ item, error: results[index]?.error }])),
  };
}

/** Statuses a reviewer may set in bulk; final decisions (reject) stay admin-only, mirroring the server. */
export function bulkActionsFor({ isAdmin }) {
  return [
    { status: "Under Review", label: "Move to under review" },
    { status: "Shortlisted", label: "Shortlist" },
    ...(isAdmin ? [{ status: "Rejected", label: "Reject", danger: true }] : []),
  ];
}

/** Whether a reviewer may change this application's status at all (server rule mirror). */
export function canBulkUpdate(application, { isAdmin }) {
  if (!application || application.status === "Joined") return false;
  return isAdmin || ["Applied", "Under Review", "Shortlisted"].includes(application.status);
}
