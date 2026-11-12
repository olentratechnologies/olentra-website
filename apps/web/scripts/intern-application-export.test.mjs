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
    program: "Tech Explorer",
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
});
