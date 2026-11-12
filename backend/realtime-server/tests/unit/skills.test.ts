import { expect, test } from "bun:test";
import { normalizeSkills } from "../../src/modules/applications/skills";

test("skills are trimmed, de-duplicated ignoring case and capped", () => {
  expect(normalizeSkills([" React ", "react", "Node.js", "", "  "])).toEqual(["React", "Node.js"]);
  expect(normalizeSkills("Python, SQL ,python")).toEqual(["Python", "SQL"]);
  expect(normalizeSkills(Array.from({ length: 15 }, (_, i) => `Skill ${i}`))).toHaveLength(10);
  expect(normalizeSkills(["x".repeat(50)])[0]).toHaveLength(32);
  expect(normalizeSkills(["Go\u0000\nLang"])).toEqual(["GoLang"]);
  expect(normalizeSkills(undefined)).toEqual([]);
  expect(normalizeSkills([42, { a: 1 }, "Rust"])).toEqual(["Rust"]);
});
