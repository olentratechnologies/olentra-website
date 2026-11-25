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

/**
 * Selecting walks an application through review and shortlisting first, so
 * the timeline shows every step; the applicant gets one "selected" email.
 */
export const SELECT_PATH = ["Under Review", "Shortlisted", "Selected"];

/** Statuses an application can be selected from in bulk. */
export const SELECTABLE_FROM = ["Applied", "Under Review", "Shortlisted"];

/** Statuses a reviewer may set in bulk; final decisions (select, reject) stay admin-only, mirroring the server. */
export function bulkActionsFor({ isAdmin }) {
  return [
    { status: "Under Review", label: "Move to under review", confirm: true },
    { status: "Shortlisted", label: "Shortlist", confirm: true },
    ...(isAdmin ? [
      { status: "Selected", label: "Select", path: SELECT_PATH, confirm: true },
      { status: "Rejected", label: "Reject", danger: true, confirm: true },
    ] : []),
  ];
}

/** Whether an application can be bulk-selected by AI score: still in review and already scored. */
export function eligibleForSelection(application) {
  return Boolean(application) && SELECTABLE_FROM.includes(application.status) && typeof application.aiScore === "number" && Number.isFinite(application.aiScore);
}

/** Parses the minimum AI score typed into a form: a number from 0 to 10, or null. */
export function parseMinScore(value) {
  if (value === "" || value == null) return null;
  const score = Number(value);
  return Number.isFinite(score) && score >= 0 && score <= 10 ? score : null;
}

/** Whether a reviewer may change this application's status at all (server rule mirror). */
export function canBulkUpdate(application, { isAdmin }) {
  if (!application || application.status === "Joined") return false;
  return isAdmin || ["Applied", "Under Review", "Shortlisted"].includes(application.status);
}

/**
 * Sends rows to a bulk endpoint in chunks (one request per chunk instead of
 * one per row). `send(chunk)` resolves to `{ ok, data: [{ id, ok, error }] }`.
 * A failed request marks its whole chunk as failed. Same result shape as runBulk.
 */
export async function runBulkRequests(items, send, chunkSize = 25) {
  const outcome = new Map();
  for (let start = 0; start < items.length; start += chunkSize) {
    const chunk = items.slice(start, start + chunkSize);
    let response;
    try { response = await send(chunk); } catch (error) { response = { ok: false, error }; }
    const rows = response?.ok && Array.isArray(response.data) ? response.data : null;
    const requestError = typeof response?.error === "string" ? response.error : response?.error?.message || "Not updated.";
    for (const item of chunk) {
      const row = rows?.find((result) => result.id === item.id);
      outcome.set(item.id, row ? (row.ok ? { ok: true } : { ok: false, error: row.error || "Not updated." }) : { ok: false, error: requestError });
    }
  }
  return {
    succeeded: items.filter((item) => outcome.get(item.id)?.ok),
    failed: items.flatMap((item) => (outcome.get(item.id)?.ok ? [] : [{ item, error: outcome.get(item.id)?.error }])),
  };
}

/** Whether a formal offer can be sent in bulk: the applicant is Selected and has no offer open yet. */
export function eligibleForOffer(application) {
  return Boolean(application) && application.status === "Selected" && !application.offerReminder;
}

/** The phrase an admin types to confirm sending `count` offers. */
export const offerConfirmPhrase = (count) => `OFFER ${count}`;

/** Whether the typed text confirms sending `count` offers (case and outer spaces don't matter). */
export function confirmsOffers(typed, count) {
  return count > 0 && String(typed || "").trim().toUpperCase() === offerConfirmPhrase(count);
}
