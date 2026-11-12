import { expect, test } from "bun:test";
import { HAS_VIDEO_BACKFILL, applicationSort, hasVideoLink, videoFilter } from "../../src/modules/applications/video-filter";

test("hasVideoLink only counts non-empty strings", () => {
  expect(hasVideoLink("https://youtu.be/aqz-KE-bpKQ")).toBe(true);
  for (const value of ["", "   ", null, undefined, 42]) expect(hasVideoLink(value)).toBe(false);
});

test("video filter narrows to applicants with or without an intro video", () => {
  expect(videoFilter("with")).toEqual({ hasVideo: true });
  expect(videoFilter("without")).toEqual({ hasVideo: { $ne: true } });
  for (const value of ["all", undefined, "", { $ne: null }]) expect(videoFilter(value)).toEqual({});
});

test("videos first sorts by hasVideo and keeps the chosen order as the tiebreaker", () => {
  expect(Object.entries(applicationSort("appliedOn", -1, true))).toEqual([["hasVideo", -1], ["appliedOn", -1], ["_id", -1]]);
  expect(Object.entries(applicationSort("name", 1, "true"))).toEqual([["hasVideo", -1], ["name", 1], ["_id", 1]]);
  expect(applicationSort("appliedOn", -1, false)).toEqual({ appliedOn: -1, _id: -1 });
  expect(applicationSort("appliedOn", -1, "yes")).toEqual({ appliedOn: -1, _id: -1 });
});

test("backfill only touches older rows that have a video link", () => {
  expect(HAS_VIDEO_BACKFILL.filter).toEqual({ hasVideo: { $exists: false }, videoUrl: { $type: "string", $nin: [""] } });
});
