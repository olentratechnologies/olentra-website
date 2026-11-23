import test from "node:test";
import assert from "node:assert/strict";
import {
  APPLICATION_EXPORT_COLUMNS,
  applicationExportRow,
} from "../src/lib/intern/application-export.mjs";

test("application export includes video and LinkedIn review signals", () => {
  assert.deepEqual(
    APPLICATION_EXPORT_COLUMNS.slice(-3),
    ["Intro video", "LinkedIn", "Has video"],
  );
  const row = applicationExportRow({
    id: "OL-1",
    name: "Test Intern",
    email: "intern@example.test",
    program: "Software Engineer Intern",
    schedule: "full_time",
    college: "Test University",
    appliedOn: "2026-01-02",
    status: "Shortlisted",
    videoUrl: "https://example.test/intro",
    linkedin: "https://linkedin.com/in/test-intern",
    hasVideo: true,
  });
  assert.deepEqual(row.slice(-3), [
    "https://example.test/intro",
    "https://linkedin.com/in/test-intern",
    "Yes",
  ]);
  assert.equal(row.length, APPLICATION_EXPORT_COLUMNS.length);
  assert.equal(row[APPLICATION_EXPORT_COLUMNS.indexOf("Schedule")], "Full-time");
  const legacy = applicationExportRow({});
  assert.equal(legacy[APPLICATION_EXPORT_COLUMNS.indexOf("Schedule")], "Not provided");
  assert.equal(APPLICATION_EXPORT_COLUMNS.includes("Intern role"), false);
});

test("fetchAllPages reads every page and stops at the cap", async () => {
  const { fetchAllPages } = await import("../src/lib/intern/application-export.mjs");
  const all = Array.from({ length: 250 }, (_, index) => ({ id: index }));
  const pages = [];
  const page = async (number) => { pages.push(number); return { ok: true, data: { items: all.slice((number - 1) * 100, number * 100), total: all.length } }; };
  const result = await fetchAllPages(page);
  assert.equal(result.items.length, 250);
  assert.deepEqual(pages, [1, 2, 3]);
  assert.equal(result.capped, false);
  const capped = await fetchAllPages(page, { max: 150 });
  assert.equal(capped.items.length, 150);
  assert.equal(capped.capped, true);
  await assert.rejects(fetchAllPages(async () => ({ ok: false, error: "Forbidden" })), /Forbidden/);
});

test("application export records each applicant's batch", () => {
  const column = APPLICATION_EXPORT_COLUMNS.indexOf("Batch");
  assert.equal(APPLICATION_EXPORT_COLUMNS[column - 1], "Track");
  assert.equal(applicationExportRow({ batch: "Batch 1" })[column], "Batch 1");
  assert.equal(applicationExportRow({})[column], "");
});

test("application export marks the team's bookmarked candidates", () => {
  const column = APPLICATION_EXPORT_COLUMNS.indexOf("Bookmarked");
  assert.equal(APPLICATION_EXPORT_COLUMNS[column - 1], "Status");
  assert.equal(applicationExportRow({ bookmarked: true })[column], "Yes");
  assert.equal(applicationExportRow({})[column], "");
});

test("application export includes the AI score and recommendation", () => {
  const score = APPLICATION_EXPORT_COLUMNS.indexOf("AI Score");
  const recommendation = APPLICATION_EXPORT_COLUMNS.indexOf("AI Recommendation");
  assert.equal(recommendation, score + 1);
  const row = applicationExportRow({ aiScore: 7, aiRecommendation: "Recommended", aiReviewStatus: "done" });
  assert.equal(row[score], "7.0");
  assert.equal(row[recommendation], "Recommended");
  assert.equal(applicationExportRow({ aiReviewStatus: "pending" })[recommendation], "Reviewing");
  assert.equal(applicationExportRow({})[score], "");
});
