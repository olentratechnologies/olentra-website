import test from "node:test";
import assert from "node:assert/strict";
import { inlineParts, parseTaskDescription } from "../src/lib/intern/task-description.mjs";

test("steps, bullets and paragraphs keep their structure", () => {
  const blocks = parseTaskDescription("Intro line.\n\n1. Read the plan\nOpen the portal.\n\n2. Build it\n- Use a branch\n- Open a PR\n");
  assert.deepEqual(blocks, [
    { type: "paragraph", lines: ["Intro line."] },
    { type: "step", number: 1, text: "Read the plan" },
    { type: "paragraph", lines: ["Open the portal."] },
    { type: "step", number: 2, text: "Build it" },
    { type: "bullets", items: ["Use a branch", "Open a PR"] },
  ]);
});

test("a run of numbered lines is a list, not headings", () => {
  assert.deepEqual(parseTaskDescription("1. One\n2. Two\n3. Three"), [{ type: "numbers", start: 1, items: ["One", "Two", "Three"] }]);
});

test("plain one-paragraph text and old descriptions still read normally", () => {
  assert.deepEqual(parseTaskDescription("Explore tools.\nCompare them."), [{ type: "paragraph", lines: ["Explore tools.", "Compare them."] }]);
  assert.deepEqual(parseTaskDescription(""), []);
  assert.deepEqual(parseTaskDescription("# Goal\nShip it"), [{ type: "heading", text: "Goal" }, { type: "paragraph", lines: ["Ship it"] }]);
});

test("inline bold, code and links are recognised; trailing punctuation stays text", () => {
  assert.deepEqual(inlineParts("Add **.env** to `.gitignore`, see https://example.com/docs."), [
    { type: "text", value: "Add " },
    { type: "bold", value: ".env" },
    { type: "text", value: " to " },
    { type: "code", value: ".gitignore" },
    { type: "text", value: ", see " },
    { type: "link", value: "https://example.com/docs" },
    { type: "text", value: "." },
  ]);
});
