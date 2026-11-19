import test from "node:test";
import assert from "node:assert/strict";
import { fillTemplate, templateValues } from "../src/lib/intern/message-templates.mjs";

test("templates fill known placeholders and leave unknown or empty ones visible", () => {
  const values = templateValues({ name: "Asha Rao", program: "Software Engineer Intern" }, null);
  assert.equal(fillTemplate("Hi {firstName}, welcome to {track}!", values), "Hi Asha, welcome to Software Engineer Intern!");
  assert.equal(fillTemplate("Your interview is at {interviewTime}. {unknown}", values), "Your interview is at {interviewTime}. {unknown}");
  assert.equal(fillTemplate("Dear {fullName}", values), "Dear Asha Rao");
});

test("values are inserted as plain text", () => {
  assert.equal(fillTemplate("Hi {firstName}", { firstName: "<b>Ravi</b>" }), "Hi <b>Ravi</b>");
  assert.equal(templateValues({ name: "" }).firstName, "");
});
