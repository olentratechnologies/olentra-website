import { expect, test } from "bun:test";
import { linkedinKey } from "../../src/modules/applications/duplicates";

test("the same LinkedIn profile written different ways gives one key", () => {
  const key = "linkedin.com/in/asha-rao";
  for (const url of ["https://www.linkedin.com/in/asha-rao", "https://linkedin.com/in/Asha-Rao/", "https://in.linkedin.com/in/asha-rao?utm_source=share#about", "http://www.LinkedIn.com/in/asha-rao/details/"]) expect(linkedinKey(url)).toBe(key);
  expect(linkedinKey("https://www.linkedin.com/company/olentra")).toBe("");
  expect(linkedinKey("https://evil-linkedin.com/in/asha-rao")).toBe("");
  expect(linkedinKey("not a url")).toBe("");
  expect(linkedinKey(undefined)).toBe("");
});
