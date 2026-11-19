import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCompensationMode, matchesCompensationMode, isProgramAvailable, resolveProgramSelection, programCompensationLabel } from "../src/lib/intern/program-availability.mjs";

const free = { id: "program-a", enabled: true, fee: 0, stipend: 0 };
const paid = { id: "program-b", enabled: true, fee: 0, stipend: 12000 };
const settings = { programEnabled: true };

test("the selected mode admits only programs with the matching stipend", () => {
  for (const [compensationMode, expected] of [["free", [true, false]], ["paid", [false, true]], ["both", [true, true]]]) {
    assert.deepEqual([free, paid].map(program => isProgramAvailable(program, { ...settings, compensationMode })), expected);
  }
});

test("legacy and invalid modes preserve both configured program types", () => {
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

test("closed and unconfigured programs never accept new applications", () => {
  assert.equal(isProgramAvailable(free, { ...settings, programEnabled: false }), false);
  assert.equal(isProgramAvailable({ ...paid, enabled: false }, settings), false);
  assert.equal(isProgramAvailable(undefined, settings), false);
  for (const amount of [undefined, null, "0", "12000", -1, 1.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(isProgramAvailable({ ...paid, stipend: amount }, settings), false);
    assert.equal(isProgramAvailable({ ...paid, fee: amount }, settings), false);
  }
});

test("availability checks preserve program terms and present fees separately", () => {
  const original = structuredClone(paid);
  assert.equal(isProgramAvailable(paid, { ...settings, compensationMode: "free" }), false);
  assert.deepEqual(paid, original);
  assert.equal(programCompensationLabel(free), "Unpaid · No stipend");
  assert.equal(programCompensationLabel(paid), "Paid · Stipend ₹12,000/month");
  assert.equal(programCompensationLabel({ stipend: null }), "Stipend to be announced");
});

const availableIdsFor = compensationMode => [free, paid].filter(program => isProgramAvailable(program, { ...settings, compensationMode })).map(program => program.id);

test("initial free-only and paid-only application forms select their sole program", () => {
  assert.equal(resolveProgramSelection("", availableIdsFor("free")), "program-a");
  assert.equal(resolveProgramSelection("", availableIdsFor("paid")), "program-b");
  assert.equal(resolveProgramSelection("", availableIdsFor("both")), "");
});

test("multiple options retain a valid choice and leave a missing or invalid choice empty", () => {
  const ids = availableIdsFor("both");
  assert.equal(resolveProgramSelection("program-a", ids), "program-a");
  assert.equal(resolveProgramSelection("program-b", ids), "program-b");
  assert.equal(resolveProgramSelection("removed-program", ids), "");
  assert.equal(resolveProgramSelection("", ids), "");
  assert.equal(resolveProgramSelection(undefined, ids), "");
});

test("realtime changes between sole programs replace the unavailable choice", () => {
  let selected = resolveProgramSelection("", availableIdsFor("free"));
  selected = resolveProgramSelection(selected, availableIdsFor("paid"));
  assert.equal(selected, "program-b");
  selected = resolveProgramSelection(selected, availableIdsFor("free"));
  assert.equal(selected, "program-a");
});

test("removing options clears a stale choice when no replacement is automatic", () => {
  assert.equal(resolveProgramSelection("removed-program", ["program-a", "program-b"]), "");
  assert.equal(resolveProgramSelection("program-a", []), "");
  assert.equal(resolveProgramSelection("", []), "");
});

test("both-to-single-to-both transitions retain the currently valid program", () => {
  let selected = resolveProgramSelection("program-b", availableIdsFor("both"));
  selected = resolveProgramSelection(selected, availableIdsFor("free"));
  assert.equal(selected, "program-a");
  selected = resolveProgramSelection(selected, availableIdsFor("both"));
  assert.equal(selected, "program-a");
  selected = resolveProgramSelection(selected, availableIdsFor("paid"));
  assert.equal(selected, "program-b");
  selected = resolveProgramSelection(selected, availableIdsFor("both"));
  assert.equal(selected, "program-b");
});
