import test from "node:test";
import assert from "node:assert/strict";
import { csvCell } from "../src/lib/csv-cell.mjs";

test("values that spreadsheets would run as formulas are neutralised", () => {
  for (const lead of ["=", "+", "-", "@", "\t", "\r"]) {
    assert.equal(csvCell(`${lead}HYPERLINK("x")`), `"'${lead}HYPERLINK(""x"")"`);
  }
});

test("ordinary values are quoted with doubled quotes, and empty values stay empty", () => {
  assert.equal(csvCell('Say "hi", Asha'), '"Say ""hi"", Asha"');
  assert.equal(csvCell(null), '""');
  assert.equal(csvCell(42), '"42"');
  assert.equal(csvCell("a=b"), '"a=b"');
});
