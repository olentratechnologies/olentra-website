import test from "node:test";
import assert from "node:assert/strict";
import { describeApplicants, parseScheduleView, scheduleLabel, scheduleParams } from "../src/lib/intern/schedule-split.mjs";

test("the URL choice is full-time, part-time, all, or not chosen yet", () => {
  assert.equal(parseScheduleView("full_time"), "full_time");
  assert.equal(parseScheduleView("part_time"), "part_time");
  assert.equal(parseScheduleView("all"), "all");
  assert.equal(parseScheduleView(null), null);
  assert.equal(parseScheduleView("weekends"), null);
});

test("list params and labels", () => {
  assert.deepEqual(scheduleParams("part_time"), { schedule: "part_time" });
  assert.deepEqual(scheduleParams("all"), {});
  assert.deepEqual(scheduleParams(null), {});
  assert.equal(scheduleLabel("full_time"), "Full-time");
  assert.equal(scheduleLabel("x"), "");
});

test("confirmations name the schedule, and spell out a mix", () => {
  assert.equal(describeApplicants([{ schedule: "part_time" }, { schedule: "part_time" }]), "2 part-time applicants");
  assert.equal(describeApplicants([{ schedule: "full_time" }]), "1 full-time applicant");
  assert.equal(describeApplicants([{ schedule: "full_time" }, { schedule: "part_time" }, { schedule: "part_time" }]), "3 applicants (1 full-time, 2 part-time)");
  assert.equal(describeApplicants([{ schedule: "full_time" }, {}]), "2 applicants (1 full-time, 1 not stated)");
  assert.equal(describeApplicants([{}, {}], "offer"), "2 offers");
});
