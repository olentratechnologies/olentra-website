import { expect, test } from "bun:test";
import { summarizeFeedback } from "../../src/modules/feedback/feedback.service";

test("feedback summary averages ratings and the share who'd recommend", () => {
  expect(summarizeFeedback([{ programRating: 5, mentorRating: 4, recommend: true }, { programRating: 4, mentorRating: 3, recommend: false }, { programRating: 4, mentorRating: 5, recommend: true }]))
    .toEqual({ count: 3, program: 4.3, mentor: 4, recommendPercent: 67 });
  expect(summarizeFeedback([])).toEqual({ count: 0, program: null, mentor: null, recommendPercent: null });
});
