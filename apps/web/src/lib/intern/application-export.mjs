import { internScheduleLabel } from "./opportunities.mjs";

export const APPLICATION_EXPORT_COLUMNS = [
  "Application ID",
  "Applicant",
  "Email",
  "Track",
  "Batch",
  "Schedule",
  "College",
  "Applied On",
  "Status",
  "Bookmarked",
  "AI Score",
  "AI Recommendation",
  "Intro video",
  "LinkedIn",
  "Has video",
];

export function applicationExportRow(application) {
  return [
    application.id,
    application.name,
    application.email,
    application.program,
    application.batch || "",
    internScheduleLabel(application.schedule),
    application.college || "",
    application.appliedOn,
    application.status,
    application.bookmarked ? "Yes" : "",
    typeof application.aiScore === "number" ? application.aiScore.toFixed(1) : "",
    application.aiReviewStatus === "pending" ? "Reviewing" : application.aiRecommendation || "",
    application.videoUrl || "",
    application.linkedin || "",
    application.hasVideo ? "Yes" : "No",
  ];
}

/**
 * Reads every page of a paged list. `fetchPage(page)` resolves to
 * `{ ok, data: { items, total } }`. Stops at `max` rows and says so.
 */
export async function fetchAllPages(fetchPage, { max = 10000 } = {}) {
  const items = [];
  let total = 0;
  for (let page = 1; ; page++) {
    const result = await fetchPage(page);
    if (!result?.ok) throw new Error(typeof result?.error === "string" ? result.error : result?.error?.message || "Couldn't load every application.");
    const rows = result.data?.items || [];
    total = result.data?.total ?? total;
    items.push(...rows);
    if (!rows.length || items.length >= total || items.length >= max) break;
  }
  return { items: items.slice(0, max), total, capped: total > max };
}
