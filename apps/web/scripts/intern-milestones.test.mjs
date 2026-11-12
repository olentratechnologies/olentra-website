import test from "node:test";
import assert from "node:assert/strict";
import { currentMilestones, pendingCelebrations, readSeen, writeSeen, FIRST_RUN_WINDOW_MS } from "../src/lib/intern/milestones.mjs";

const now = Date.parse("2026-11-12T12:00:00Z");
const recent = "2026-11-11T09:00:00Z", old = "2026-09-01T09:00:00Z";
const notBadge = (item) => item.kind !== "badge";
const my = {
  application: { id: "OL1" },
  offer: { id: "OFFER1", status: "Sent", sentOn: recent },
  onboarding: { applicationId: "OL1", status: "Approved", approvedOn: recent },
  certificates: [{ id: "CERT1", issuedOn: "2026-11-12", program: "Tech Explorer" }],
  tasks: [{ id: "T1", title: "Landing page" }],
  submissions: [
    { id: "S1", taskId: "T1", status: "Approved", reviewedOn: recent },
    { id: "S2", taskId: "T1", status: "Changes requested", reviewedOn: recent },
  ],
};

test("milestones cover offers, onboarding, certificates and approved work only", () => {
  const keys = currentMilestones(my).filter(notBadge).map((item) => item.key);
  assert.deepEqual(keys.sort(), ["certificate:CERT1", "offer-received:OFFER1", "onboarding-approved:OL1", "submission-approved:S1"]);
  const approved = currentMilestones(my).find((item) => item.kind === "submission-approved");
  assert.equal(approved.tier, "medium");
  assert.equal(approved.taskTitle, "Landing page");
});

test("an accepted offer is no longer an offer-received milestone", () => {
  const keys = currentMilestones({ ...my, offer: { ...my.offer, status: "Accepted" } }).filter(notBadge).map((item) => item.key);
  assert.ok(!keys.includes("offer-received:OFFER1"));
});

test("pending celebrations skip seen keys and order by importance", () => {
  const pending = pendingCelebrations(currentMilestones(my).filter(notBadge), new Set(["onboarding-approved:OL1"]), now);
  assert.deepEqual(pending.map((item) => item.kind), ["certificate", "offer-received", "submission-approved"]);
});

test("first run only celebrates milestones from the last week", () => {
  const mixed = { ...my, offer: { ...my.offer, sentOn: old }, certificates: [], submissions: [] };
  const pending = pendingCelebrations(currentMilestones(mixed).filter(notBadge), null, now);
  assert.deepEqual(pending.map((item) => item.kind), ["onboarding-approved"]);
  const edge = pendingCelebrations([{ key: "x", priority: 1, at: now - FIRST_RUN_WINDOW_MS - 1 }], null, now);
  assert.equal(edge.length, 0);
});

test("seen keys round-trip through storage and survive broken storage", () => {
  const store = new Map();
  const storage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
  assert.equal(readSeen(storage, "ACC1"), null);
  assert.equal(writeSeen(storage, "ACC1", new Set(["a", "b"])), true);
  assert.deepEqual([...readSeen(storage, "ACC1")], ["a", "b"]);
  const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
  assert.equal(readSeen(broken, "ACC1"), null);
  assert.equal(writeSeen(broken, "ACC1", new Set(["a"])), false);
});

test("earned badges become medium badge:<id> milestones dated by when they were earned", () => {
  const badges = currentMilestones(my).filter((item) => item.kind === "badge");
  assert.deepEqual(badges.map((item) => item.key), ["badge:onboarded", "badge:first-submission", "badge:first-approval", "badge:certified"]);
  for (const item of badges) assert.equal(item.tier, "medium");
  const certified = badges.find((item) => item.badgeId === "certified");
  assert.equal(certified.title, "Certified");
  assert.ok(certified.icon);
  assert.equal(certified.at, Date.parse("2026-11-12"));
});

test("a badge celebrates once: seen keys skip it and new badges still show", () => {
  const before = { ...my, submissions: [] };
  const seen = new Set(currentMilestones(before).map((item) => item.key));
  assert.equal(pendingCelebrations(currentMilestones(before), seen, now).length, 0);
  const withSubmission = { ...before, submissions: [{ id: "S3", taskId: "T1", status: "Submitted", submittedOn: recent }] };
  const unlocked = pendingCelebrations(currentMilestones(withSubmission), seen, now);
  assert.deepEqual(unlocked.map((item) => item.key), ["badge:first-submission"]);
});

test("first run only celebrates badges earned in the last week", () => {
  const longAgo = { onboarding: { applicationId: "OL1", status: "Approved", approvedOn: old }, certificates: [{ id: "CERT1", issuedOn: recent }] };
  const pending = pendingCelebrations(currentMilestones(longAgo), null, now).filter((item) => item.kind === "badge");
  assert.deepEqual(pending.map((item) => item.key), ["badge:certified"]);
});
