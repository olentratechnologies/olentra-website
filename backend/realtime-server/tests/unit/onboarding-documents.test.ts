import { expect, test } from "bun:test";
import { missingDocuments, validateChecklist } from "../../src/modules/onboarding/documents";

test("the checklist keeps stable ids and defaults items to required", () => {
  expect(validateChecklist([{ label: "ID proof" }, { label: "Bank form", required: false }])).toEqual([{ id: "id-proof", label: "ID proof", required: true }, { id: "bank-form", label: "Bank form", required: false }]);
  expect(validateChecklist([])).toEqual([]);
  expect(() => validateChecklist([{ label: "" }])).toThrow();
  expect(() => validateChecklist([{ label: "NDA" }, { label: "nda" }])).toThrow();
});

test("only required documents that aren't approved block onboarding", () => {
  const checklist = [{ id: "id", label: "ID", required: true }, { id: "nda", label: "NDA", required: true }, { id: "bank", label: "Bank", required: false }];
  expect(missingDocuments(checklist, { id: { status: "Approved" } as any, nda: { status: "Submitted" } as any }).map(item => item.id)).toEqual(["nda"]);
  expect(missingDocuments(checklist, { id: { status: "Approved" } as any, nda: { status: "Approved" } as any })).toEqual([]);
  expect(missingDocuments([], undefined)).toEqual([]);
});
