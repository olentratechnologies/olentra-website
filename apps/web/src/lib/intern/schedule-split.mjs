/** Full-time and part-time work is kept apart in the admin portal. */
export const SCHEDULE_VIEWS = ["full_time", "part_time"];
export const SCHEDULE_LABELS = { full_time: "Full-time", part_time: "Part-time" };

/** "full_time" | "part_time" | "all" from a URL value, or null when nothing has been chosen yet. */
export function parseScheduleView(value) {
  if (value === "full_time" || value === "part_time" || value === "all") return value;
  return null;
}

/** "Full-time", "Part-time", or "" when unknown. */
export function scheduleLabel(id) {
  return SCHEDULE_LABELS[id] || "";
}

/** Query params for a list call: nothing for "all", otherwise `{ schedule }`. */
export function scheduleParams(view) {
  return view === "full_time" || view === "part_time" ? { schedule: view } : {};
}

/**
 * How a group of applicants reads in a confirmation, e.g. "12 part-time applicants"
 * or, when mixed, "12 applicants (8 full-time, 4 part-time)".
 */
export function describeApplicants(rows, noun = "applicant") {
  const list = Array.isArray(rows) ? rows : [];
  const plural = list.length === 1 ? noun : `${noun}s`;
  const counts = { full_time: 0, part_time: 0, other: 0 };
  for (const row of list) counts[row?.schedule === "full_time" || row?.schedule === "part_time" ? row.schedule : "other"]++;
  const kinds = SCHEDULE_VIEWS.filter((id) => counts[id]);
  if (kinds.length === 1 && !counts.other) return `${list.length} ${scheduleLabel(kinds[0]).toLowerCase()} ${plural}`;
  if (!kinds.length) return `${list.length} ${plural}`;
  const parts = kinds.map((id) => `${counts[id]} ${scheduleLabel(id).toLowerCase()}`);
  if (counts.other) parts.push(`${counts.other} not stated`);
  return `${list.length} ${plural} (${parts.join(", ")})`;
}
