import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCompensationMode, matchesCompensationMode, isProgramAvailable, resolveProgramSelection, programCompensationLabel } from "../src/lib/intern/program-availability.mjs";

const free = { id: "explorer", enabled: true, fee: 0, stipend: 0 };
const paid = { id: "innovator", enabled: true, fee: 0, stipend: 12000 };
const settings = { programEnabled: true };

test("the selected mode admits only tracks with the matching stipend", () => {
  for (const [compensationMode, expected] of [["free", [true, false]], ["paid", [false, true]], ["both", [true, true]]]) {
    assert.deepEqual([free, paid].map(program => isProgramAvailable(program, { ...settings, compensationMode })), expected);
  }
});

test("legacy and invalid modes preserve both configured track types", () => {
  for (const value of [undefined, null, "", "invalid", 0, {}, []]) {
    assert.equal(normalizeCompensationMode(value), "both");
    assert.equal(isProgramAvailable(free, { ...settings, compensationMode: value }), true);
    assert.equal(isProgramAvailable(paid, { ...settings, compensationMode: value }), true);
  }
});

test("stipend, rather than the separate applicant fee, determines compensation", () => {
  assert.equal(matchesCompensationMode({ ...free, fee: 9000 }, "free"), true);
  assert.equal(matchesCompensationMode(paid, "paid"), true);
  assert.equal(matchesCompensationMode({ ...paid, fee: 5000 }, "free"), false);
});

test("closed and unconfigured tracks never accept new applications", () => {
  assert.equal(isProgramAvailable(free, { ...settings, programEnabled: false }), false);
  assert.equal(isProgramAvailable({ ...paid, enabled: false }, settings), false);
  assert.equal(isProgramAvailable(undefined, settings), false);
  for (const amount of [undefined, null, "0", "12000", -1, 1.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(isProgramAvailable({ ...paid, stipend: amount }, settings), false);
    assert.equal(isProgramAvailable({ ...paid, fee: amount }, settings), false);
  }
});

test("availability checks preserve track terms and present fees separately", () => {
  const original = structuredClone(paid);
  assert.equal(isProgramAvailable(paid, { ...settings, compensationMode: "free" }), false);
  assert.deepEqual(paid, original);
  assert.equal(programCompensationLabel(free), "Unpaid · No stipend");
  assert.equal(programCompensationLabel(paid), "Paid · Stipend ₹12,000/month");
  assert.equal(programCompensationLabel({ stipend: null }), "Stipend to be announced");
});

const availableIdsFor = compensationMode => [free, paid].filter(program => isProgramAvailable(program, { ...settings, compensationMode })).map(program => program.id);

test("initial free-only and paid-only application forms select their sole track", () => {
  assert.equal(resolveProgramSelection("", availableIdsFor("free")), "explorer");
  assert.equal(resolveProgramSelection("", availableIdsFor("paid")), "innovator");
  assert.equal(resolveProgramSelection("", availableIdsFor("both")), "");
});

test("multiple options retain a valid choice and leave a missing or invalid choice empty", () => {
  const ids = availableIdsFor("both");
  assert.equal(resolveProgramSelection("explorer", ids), "explorer");
  assert.equal(resolveProgramSelection("innovator", ids), "innovator");
  assert.equal(resolveProgramSelection("removed-track", ids), "");
  assert.equal(resolveProgramSelection("", ids), "");
  assert.equal(resolveProgramSelection(undefined, ids), "");
});

test("realtime changes between sole tracks replace the unavailable choice", () => {
  let selected = resolveProgramSelection("", availableIdsFor("free"));
  selected = resolveProgramSelection(selected, availableIdsFor("paid"));
  assert.equal(selected, "innovator");
  selected = resolveProgramSelection(selected, availableIdsFor("free"));
  assert.equal(selected, "explorer");
});

test("removing options clears a stale choice when no replacement is automatic", () => {
  assert.equal(resolveProgramSelection("removed-track", ["explorer", "innovator"]), "");
  assert.equal(resolveProgramSelection("explorer", []), "");
  assert.equal(resolveProgramSelection("", []), "");
});

test("both-to-single-to-both transitions retain the currently valid track", () => {
  let selected = resolveProgramSelection("innovator", availableIdsFor("both"));
  selected = resolveProgramSelection(selected, availableIdsFor("free"));
  assert.equal(selected, "explorer");
  selected = resolveProgramSelection(selected, availableIdsFor("both"));
  assert.equal(selected, "explorer");
  selected = resolveProgramSelection(selected, availableIdsFor("paid"));
  assert.equal(selected, "innovator");
  selected = resolveProgramSelection(selected, availableIdsFor("both"));
  assert.equal(selected, "innovator");
});
