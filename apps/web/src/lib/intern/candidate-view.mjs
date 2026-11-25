/**
 * Narrowing and ordering the "Select by AI score" list. Filters only change
 * which candidates are shown; who is ticked is kept separately.
 */
export const EMPTY_CANDIDATE_VIEW = {
  query: "",
  maxScore: "",
  statuses: [],        // empty = any
  recommendations: [], // empty = any
  schedule: "all",     // all | full_time | part_time
  video: "all",        // all | with | without
  github: "all",       // all | with | without
  bookmarked: false,
  show: "all",         // all | selected | unselected
  sort: "score-desc",  // score-desc | score-asc | name | newest | oldest
};

export const CANDIDATE_SORTS = [
  { id: "score-desc", label: "AI score: high to low" },
  { id: "score-asc", label: "AI score: low to high" },
  { id: "name", label: "Name: A to Z" },
  { id: "newest", label: "Applied: newest first" },
  { id: "oldest", label: "Applied: oldest first" },
];

const has = (value) => typeof value === "string" ? value.trim().length > 0 : Boolean(value);
const hasVideo = (row) => row.hasVideo === true || has(row.videoUrl);

/** How many view filters are switched on (search and sort don't count). */
export function activeFilterCount(view) {
  return [
    view.maxScore !== "" && view.maxScore != null,
    view.statuses.length > 0,
    view.recommendations.length > 0,
    view.schedule !== "all",
    view.video !== "all",
    view.github !== "all",
    view.bookmarked,
    view.show !== "all",
  ].filter(Boolean).length;
}

/** The candidates to show for `view`, given who is ticked (`isChosen(row)`). */
export function viewCandidates(rows, view, isChosen = () => true) {
  const terms = String(view.query || "").toLowerCase().split(/\s+/).filter(Boolean);
  const max = view.maxScore === "" || view.maxScore == null ? null : Number(view.maxScore);
  const shown = rows.filter((row) => {
    if (terms.length) {
      const haystack = [row.name, row.email, row.college, ...(Array.isArray(row.skills) ? row.skills : [])].join(" ").toLowerCase();
      if (!terms.every((term) => haystack.includes(term))) return false;
    }
    if (max !== null && Number.isFinite(max) && !(row.aiScore <= max)) return false;
    if (view.statuses.length && !view.statuses.includes(row.status)) return false;
    if (view.recommendations.length && !view.recommendations.includes(row.aiRecommendation)) return false;
    if (view.schedule !== "all" && row.schedule !== view.schedule) return false;
    if (view.video !== "all" && hasVideo(row) !== (view.video === "with")) return false;
    if (view.github !== "all" && has(row.github) !== (view.github === "with")) return false;
    if (view.bookmarked && !row.bookmarked) return false;
    if (view.show === "selected" && !isChosen(row)) return false;
    if (view.show === "unselected" && isChosen(row)) return false;
    return true;
  });
  const byName = (a, b) => String(a.name || "").localeCompare(String(b.name || ""));
  const applied = (row) => String(row.appliedOn || "");
  const order = {
    "score-desc": (a, b) => b.aiScore - a.aiScore || byName(a, b),
    "score-asc": (a, b) => a.aiScore - b.aiScore || byName(a, b),
    name: byName,
    newest: (a, b) => applied(b).localeCompare(applied(a)) || byName(a, b),
    oldest: (a, b) => applied(a).localeCompare(applied(b)) || byName(a, b),
  }[view.sort] || ((a, b) => b.aiScore - a.aiScore || byName(a, b));
  return [...shown].sort(order);
}

/** Counts per value of `field` among `rows`, e.g. how many are "Applied". */
export function countBy(rows, field) {
  const counts = {};
  for (const row of rows) { const key = row[field]; if (key) counts[key] = (counts[key] || 0) + 1; }
  return counts;
}
