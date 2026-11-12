import test from "node:test";
import assert from "node:assert/strict";
import { monotoneLinePath } from "../src/lib/intern/monotone-line-path.mjs";

function cubicControls(path) {
  return [...path.matchAll(/C\s+[-\d.]+\s+([-\d.]+),\s+[-\d.]+\s+([-\d.]+),\s+[-\d.]+\s+[-\d.]+/g)]
    .map((match) => [Number(match[1]), Number(match[2])]);
}

test("monotone interpolation keeps controls inside each segment's y range", () => {
  const points = [
    { x: 0, y: 198 },
    { x: 100, y: 12 },
    { x: 200, y: 184 },
    { x: 300, y: 30 },
    { x: 400, y: 198 },
  ];
  const path = monotoneLinePath(points);
  const controls = cubicControls(path);

  assert.equal(controls.length, points.length - 1);
  for (let index = 0; index < controls.length; index += 1) {
    const lower = Math.min(points[index].y, points[index + 1].y);
    const upper = Math.max(points[index].y, points[index + 1].y);
    for (const y of controls[index]) {
      assert.ok(y >= lower && y <= upper, `control y ${y} outside ${lower}..${upper}`);
      assert.ok(y <= 198, `chart curve crossed below the baseline at y=${y}`);
    }
  }
});

test("monotone interpolation handles empty and single-point series", () => {
  assert.equal(monotoneLinePath([]), "");
  assert.equal(monotoneLinePath([{ x: 4, y: 9 }]), "M 4 9");
});
