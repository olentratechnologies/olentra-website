import test from "node:test";
import assert from "node:assert/strict";
import { EMPTY_CANDIDATE_VIEW, activeFilterCount, countBy, viewCandidates } from "../src/lib/intern/candidate-view.mjs";

const rows = [
  { id: "a", name: "Asha Rao", email: "asha@x.test", college: "IIT Delhi", skills: ["React", "Node"], aiScore: 9.6, status: "Applied", aiRecommendation: "Strongly recommended", schedule: "full_time", hasVideo: true, github: "https://github.com/asha", appliedOn: "2026-11-20" },
  { id: "b", name: "Bilal Khan", email: "bilal@x.test", college: "NIT Warangal", skills: ["Python"], aiScore: 9.1, status: "Shortlisted", aiRecommendation: "Recommended", schedule: "part_time", hasVideo: false, github: "", appliedOn: "2026-11-23", bookmarked: true },
  { id: "c", name: "Chitra M", email: "chitra@x.test", college: "IIT Bombay", skills: [], aiScore: 9.1, status: "Applied", aiRecommendation: "Strongly recommended", schedule: "full_time", videoUrl: "https://v.test/1", github: "https://github.com/c", appliedOn: "2026-11-21" },
];
const view = (patch) => ({ ...EMPTY_CANDIDATE_VIEW, ...patch });
const ids = (list) => list.map((row) => row.id);

test("the default view shows everyone, highest score first, name breaking ties", () => {
  assert.deepEqual(ids(viewCandidates(rows, EMPTY_CANDIDATE_VIEW)), ["a", "b", "c"]);
});

test("search matches every word across name, email, college and skills", () => {
  assert.deepEqual(ids(viewCandidates(rows, view({ query: "iit" }))), ["a", "c"]);
  assert.deepEqual(ids(viewCandidates(rows, view({ query: "iit react" }))), ["a"]);
  assert.deepEqual(ids(viewCandidates(rows, view({ query: "PYTHON" }))), ["b"]);
});

test("filters combine", () => {
  assert.deepEqual(ids(viewCandidates(rows, view({ statuses: ["Applied"], recommendations: ["Strongly recommended"], schedule: "full_time" }))), ["a", "c"]);
  assert.deepEqual(ids(viewCandidates(rows, view({ maxScore: "9.5" }))), ["b", "c"]);
  assert.deepEqual(ids(viewCandidates(rows, view({ video: "with" }))), ["a", "c"]);
  assert.deepEqual(ids(viewCandidates(rows, view({ github: "without" }))), ["b"]);
  assert.deepEqual(ids(viewCandidates(rows, view({ bookmarked: true }))), ["b"]);
});

test("show selected or unselected uses who is ticked", () => {
  const chosen = (row) => row.id !== "b";
  assert.deepEqual(ids(viewCandidates(rows, view({ show: "selected" }), chosen)), ["a", "c"]);
  assert.deepEqual(ids(viewCandidates(rows, view({ show: "unselected" }), chosen)), ["b"]);
});

test("sorting options", () => {
  assert.deepEqual(ids(viewCandidates(rows, view({ sort: "score-asc" }))), ["b", "c", "a"]);
  assert.deepEqual(ids(viewCandidates(rows, view({ sort: "name" }))), ["a", "b", "c"]);
  assert.deepEqual(ids(viewCandidates(rows, view({ sort: "newest" }))), ["b", "c", "a"]);
  assert.deepEqual(ids(viewCandidates(rows, view({ sort: "oldest" }))), ["a", "c", "b"]);
});

test("filter counts and value counts", () => {
  assert.equal(activeFilterCount(EMPTY_CANDIDATE_VIEW), 0);
  assert.equal(activeFilterCount(view({ query: "x", sort: "name", statuses: ["Applied"], bookmarked: true })), 2);
  assert.deepEqual(countBy(rows, "status"), { Applied: 2, Shortlisted: 1 });
});
