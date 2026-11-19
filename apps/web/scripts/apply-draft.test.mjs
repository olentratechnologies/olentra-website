import test from "node:test";
import assert from "node:assert/strict";
import { APPLY_DRAFT_KEY, clearApplyDraft, readApplyDraft, writeApplyDraft } from "../src/lib/intern/apply-draft.mjs";

const memory = () => { const map = new Map(); return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v), removeItem: (k) => map.delete(k), map }; };

test("drafts save, restore, expire after two weeks and clear on submit", () => {
  const storage = memory(), now = Date.parse("2026-11-01T00:00:00Z");
  writeApplyDraft({ fullName: "Asha", email: "asha@example.test", track: "explorer", extra: "ignored" }, storage, now);
  assert.deepEqual(readApplyDraft(storage, now + 1000), { savedAt: now, fullName: "Asha", email: "asha@example.test", track: "explorer" });
  assert.equal(readApplyDraft(storage, now + 15 * 86_400_000), null);
  clearApplyDraft(storage);
  assert.equal(storage.map.has(APPLY_DRAFT_KEY), false);
});

test("an empty form leaves nothing behind, and broken storage is ignored", () => {
  const storage = memory();
  writeApplyDraft({ fullName: "", track: "explorer" }, storage);
  assert.equal(storage.map.size, 0);
  const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); }, removeItem: () => {} };
  assert.equal(readApplyDraft(broken), null);
  assert.doesNotThrow(() => writeApplyDraft({ fullName: "x" }, broken));
});

test("role and schedule choices survive reload; old and unknown choices stay unselected", () => {
  const storage = memory();
  writeApplyDraft({ roleId: "build", schedule: "full_time" }, storage);
  assert.equal(readApplyDraft(storage).roleId, "build");
  assert.equal(readApplyDraft(storage).schedule, "full_time");
  storage.setItem(APPLY_DRAFT_KEY, JSON.stringify({ fullName: "Asha", savedAt: Date.now(), roleId: "admin", schedule: "hybrid" }));
  assert.equal(readApplyDraft(storage).roleId, undefined);
  assert.equal(readApplyDraft(storage).schedule, undefined);
});
