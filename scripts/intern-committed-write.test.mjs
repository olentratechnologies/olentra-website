import test from "node:test";
import assert from "node:assert/strict";
import { canRefreshInternWriteInBackground, reconcileInternWrite } from "../src/lib/intern-committed-write.mjs";

const admin = { id: "admin", role: "company", sessionVersion: 2 };
const original = { account: admin, data: { programs: [{ id: "explorer", fee: 0, stipend: 0, enabled: false }], settings: { programEnabled: false, explorerEnabled: false, maxStipend: 0 } }, my: {} };

test("confirmed track and general settings update immediately without altering the old snapshot", () => {
  const result = { id: "explorer", fee: 100, stipend: 200, enabled: true };
  const updated = reconcileInternWrite(original, admin, "program.configure", {}, result);
  assert.deepEqual(updated.data.programs[0], { ...result, detail: "Fee ₹100, stipend ₹200" });
  assert.equal(updated.data.settings.explorerEnabled, true);
  assert.equal(updated.data.settings.maxStipend, 200);
  assert.equal(original.data.programs[0].enabled, false);
  const general = reconcileInternWrite(updated, admin, "settings.update", { patch: { programEnabled: true } }, true);
  assert.equal(general.data.settings.programEnabled, true);
  assert.equal(canRefreshInternWriteInBackground("program.configure"), true);
  assert.equal(canRefreshInternWriteInBackground("settings.update"), true);
  assert.equal(canRefreshInternWriteInBackground("offer.send"), false);
});

test("a response from an older account or session never changes the current workspace", () => {
  const other = { ...original, account: { id: "other", role: "company", sessionVersion: 2 } };
  const revoked = { ...original, account: { ...admin, sessionVersion: 3 } };
  assert.equal(reconcileInternWrite(other, admin, "settings.update", { patch: { programEnabled: true } }, true), other);
  assert.equal(reconcileInternWrite(revoked, admin, "settings.update", { patch: { programEnabled: true } }, true), revoked);
});
