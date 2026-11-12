import test from "node:test";
import assert from "node:assert/strict";
import { canMoveCard } from "../src/lib/intern/board.mjs";

test("reviewers move cards only between early stages; admins make final decisions", () => {
  assert.equal(canMoveCard("Applied", "Shortlisted", { isAdmin: false }), true);
  assert.equal(canMoveCard("Shortlisted", "Selected", { isAdmin: false }), false);
  assert.equal(canMoveCard("Shortlisted", "Rejected", { isAdmin: false }), false);
  assert.equal(canMoveCard("Rejected", "Applied", { isAdmin: false }), false);
  assert.equal(canMoveCard("Shortlisted", "Selected", { isAdmin: true }), true);
  assert.equal(canMoveCard("Joined", "Applied", { isAdmin: true }), false);
  assert.equal(canMoveCard("Applied", "Applied", { isAdmin: true }), false);
  assert.equal(canMoveCard("Applied", "Joined", { isAdmin: true }), false);
});
