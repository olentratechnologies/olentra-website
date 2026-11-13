import { expect, test } from "bun:test";
import { validateResource } from "../../src/modules/resources/resources.service";

test("resources need a title and a web link, and keep only known tracks", () => {
  expect(validateResource({ title: " Intro to React ", url: "https://react.dev/learn", type: "course", minutes: 90, programIds: ["explorer", "bogus", "explorer"] }))
    .toEqual({ title: "Intro to React", url: "https://react.dev/learn", type: "course", minutes: 90, programIds: ["explorer"] });
  expect(() => validateResource({ title: "x", url: "javascript:alert(1)" })).toThrow();
  expect(() => validateResource({ title: "", url: "https://a.test" })).toThrow();
  expect(() => validateResource({ title: "x", url: "https://a.test", type: "podcast" })).toThrow();
  expect(validateResource({ title: "x", url: "https://a.test" }).programIds).toEqual([]);
});
