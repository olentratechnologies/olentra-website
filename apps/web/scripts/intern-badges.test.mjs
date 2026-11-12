import test from "node:test";
import assert from "node:assert/strict";
import { ALL_BADGES, earnedBadges, onTimeStreakAt } from "../src/lib/intern/badges.mjs";

const ids = (my) => earnedBadges(my).map((badge) => badge.id);
const at = (my, id) => earnedBadges(my).find((badge) => badge.id === id)?.earnedAt;

/** Task T<n> due on Nov <n>; its approved submission sent `lateDays` after the due date. */
const task = (n) => ({ id: `T${n}`, title: `Task ${n}`, dueOn: `2026-11-${String(n + 10).padStart(2, "0")}` });
const approved = (n, { lateDays = 0, reviewDay = n + 11 } = {}) => ({
  id: `S${n}`, taskId: `T${n}`, status: "Approved",
  submittedOn: `2026-11-${String(n + 10 + lateDays).padStart(2, "0")}T18:30:00.000Z`,
  reviewedOn: `2026-11-${String(reviewDay).padStart(2, "0")}T09:00:00.000Z`,
});

test("every badge is catalogued with a title, icon, description and hint", () => {
  assert.deepEqual(ALL_BADGES.map((badge) => badge.id), ["onboarded", "first-submission", "first-approval", "high-five", "on-time-streak", "certified"]);
  for (const badge of ALL_BADGES) for (const field of ["title", "icon", "description", "hint"]) assert.ok(badge[field], `${badge.id}.${field}`);
});

test("an empty or missing portal earns nothing", () => {
  assert.deepEqual(earnedBadges(undefined), []);
  assert.deepEqual(earnedBadges({}), []);
  assert.deepEqual(earnedBadges({ onboarding: { status: "Submitted" }, submissions: [], certificates: [] }), []);
});

test("onboarded needs approved onboarding", () => {
  const my = { onboarding: { status: "Approved", approvedOn: "2026-11-02T10:00:00Z" } };
  assert.deepEqual(ids(my), ["onboarded"]);
  assert.equal(at(my, "onboarded"), "2026-11-02T10:00:00Z");
});

test("first submission counts any status and uses the earliest one", () => {
  const my = { submissions: [
    { id: "S2", taskId: "T1", status: "Submitted", submittedOn: "2026-11-05T10:00:00Z" },
    { id: "S1", taskId: "T1", status: "Changes requested", submittedOn: "2026-11-03T10:00:00Z" },
  ] };
  assert.deepEqual(ids(my), ["first-submission"]);
  assert.equal(at(my, "first-submission"), "2026-11-03T10:00:00Z");
});

test("first approval uses the earliest review, not list order", () => {
  const my = { tasks: [task(1), task(2)], submissions: [approved(2, { reviewDay: 20 }), approved(1, { reviewDay: 15 })] };
  assert.ok(ids(my).includes("first-approval"));
  assert.equal(at(my, "first-approval"), "2026-11-15T09:00:00.000Z");
});

test("high five needs five approved tasks and is dated by the fifth", () => {
  const tasks = [1, 2, 3, 4, 5].map(task);
  const four = { tasks, submissions: [1, 2, 3, 4].map((n) => approved(n)) };
  assert.ok(!ids(four).includes("high-five"));
  const five = { tasks, submissions: [...four.submissions, approved(5), { id: "S9", taskId: "T5", status: "Submitted" }] };
  assert.ok(ids(five).includes("high-five"));
  assert.equal(at(five, "high-five"), approved(5).reviewedOn);
});

test("re-approving the same task does not count twice", () => {
  const repeat = [1, 2, 3, 4].map((n) => ({ ...approved(1, { reviewDay: 12 + n }), id: `S1-${n}` }));
  const my = { tasks: [task(1)], submissions: [...repeat, approved(1)] };
  assert.ok(!ids(my).includes("high-five"));
  assert.ok(!ids(my).includes("on-time-streak"));
});

test("on-time streak: three on-time approvals in a row", () => {
  const my = { tasks: [1, 2, 3].map(task), submissions: [1, 2, 3].map((n) => approved(n)) };
  assert.ok(ids(my).includes("on-time-streak"));
  assert.equal(at(my, "on-time-streak"), approved(3).reviewedOn);
});

test("on-time streak: submitting on the due date itself is on time", () => {
  const my = { tasks: [1, 2, 3].map(task), submissions: [1, 2, 3].map((n) => approved(n, { lateDays: 0 })) };
  assert.equal(my.submissions[0].submittedOn.slice(0, 10), my.tasks[0].dueOn);
  assert.ok(onTimeStreakAt(my));
});

test("on-time streak: a late approval in the middle resets the run", () => {
  const tasks = [1, 2, 3, 4].map(task);
  const broken = { tasks, submissions: [approved(1), approved(2), approved(3, { lateDays: 1 }), approved(4)] };
  assert.equal(onTimeStreakAt(broken), null);
  const recovered = { tasks: [...tasks, task(5), task(6)], submissions: [...broken.submissions, approved(5), approved(6)] };
  assert.equal(onTimeStreakAt(recovered), approved(6).reviewedOn);
});

test("on-time streak: order follows approval time, not submission list order", () => {
  // Approved in order 1 (on time), 3 (late), 2 (on time), 4 (on time): no three in a row.
  const my = { tasks: [1, 2, 3, 4].map(task), submissions: [
    approved(1, { reviewDay: 12 }), approved(2, { reviewDay: 20 }), approved(3, { lateDays: 2, reviewDay: 15 }), approved(4, { reviewDay: 22 }),
  ] };
  assert.equal(onTimeStreakAt(my), null);
});

test("on-time streak: non-approved submissions neither count nor break it", () => {
  const my = { tasks: [1, 2, 3, 4].map(task), submissions: [
    approved(1), { id: "SX", taskId: "T4", status: "Changes requested", submittedOn: "2026-12-30T00:00:00Z" }, approved(2), approved(3),
  ] };
  assert.ok(onTimeStreakAt(my));
});

test("on-time streak: a missing task or due date breaks the run", () => {
  const noDue = { tasks: [task(1), { id: "T2", title: "No date" }, task(3)], submissions: [1, 2, 3].map((n) => approved(n)) };
  assert.equal(onTimeStreakAt(noDue), null);
  const missingTask = { tasks: [task(1), task(3)], submissions: [1, 2, 3].map((n) => approved(n)) };
  assert.equal(onTimeStreakAt(missingTask), null);
});

test("on-time streak stays earned after a later late approval", () => {
  const my = { tasks: [1, 2, 3, 4].map(task), submissions: [approved(1), approved(2), approved(3), approved(4, { lateDays: 3 })] };
  assert.equal(onTimeStreakAt(my), approved(3).reviewedOn);
});

test("certified needs an issued, non-revoked certificate", () => {
  assert.deepEqual(ids({ certificates: [{ id: "C1", issuedOn: "2026-11-10" }] }), ["certified"]);
  assert.deepEqual(ids({ certificates: [{ id: "C1", issuedOn: "2026-11-10", status: "Revoked" }] }), []);
  assert.equal(at({ certificates: [{ id: "C2", issuedOn: "2026-11-11" }, { id: "C1", issuedOn: "2026-11-10" }] }, "certified"), "2026-11-10");
});

test("badges come back in catalogue order with only public fields", () => {
  const my = {
    onboarding: { status: "Approved", approvedOn: "2026-11-01" },
    certificates: [{ id: "C1", issuedOn: "2026-11-30" }],
    tasks: [1, 2, 3, 4, 5].map(task),
    submissions: [1, 2, 3, 4, 5].map((n) => approved(n)),
  };
  assert.deepEqual(ids(my), ALL_BADGES.map((badge) => badge.id));
  assert.deepEqual(Object.keys(earnedBadges(my)[0]).sort(), ["description", "earnedAt", "icon", "id", "title"]);
});
