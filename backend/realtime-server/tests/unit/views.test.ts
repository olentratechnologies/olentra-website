import { expect, test } from "bun:test";
import { cleanFilters } from "../../src/modules/views/views.service";

test("saved views keep only known, short filter values", () => {
  expect(cleanFilters({ status: "Shortlisted", video: "with", videosFirst: true, evil: "$where", skill: "x".repeat(200), search: "  ravi " })).toEqual({ status: "Shortlisted", video: "with", videosFirst: "true", search: "ravi" });
  expect(cleanFilters(null)).toEqual({});
  expect(cleanFilters({ status: { $ne: 1 } })).toEqual({});
});
