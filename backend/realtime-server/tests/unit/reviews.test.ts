import { expect, test } from "bun:test";
import { DEFAULT_RUBRIC, averageScore, validateRubric, weightedScore } from "../../src/modules/reviews/reviews.service";

test("a reviewer's score is weighted over the criteria they scored", () => {
  const rubric = [{ id: "video", label: "Video", weight: 2 }, { id: "skills", label: "Skills", weight: 1 }];
  expect(weightedScore(rubric, { video: 5, skills: 2 })).toBe(4);
  expect(weightedScore(rubric, { skills: 3 })).toBe(3);
  expect(weightedScore(rubric, {})).toBeNull();
  expect(weightedScore(DEFAULT_RUBRIC, { video: 4, skills: 3, communication: 5 })).toBe(4);
});

test("the application score averages reviewers and ignores empty sheets", () => {
  expect(averageScore([4, 3, null])).toBe(3.5);
  expect(averageScore([])).toBeNull();
});

test("rubric validation keeps ids stable and rejects bad input", () => {
  expect(validateRubric([{ label: "Problem solving", weight: 3 }])).toEqual([{ id: "problem-solving", label: "Problem solving", weight: 3 }]);
  expect(() => validateRubric([])).toThrow();
  expect(() => validateRubric([{ label: "A", weight: 9 }])).toThrow();
  expect(() => validateRubric([{ label: "Same" }, { label: "same" }])).toThrow();
  expect(() => validateRubric(Array.from({ length: 9 }, (_, i) => ({ label: `C${i}` })))).toThrow();
});
