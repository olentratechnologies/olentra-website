import { describe, expect, test } from "bun:test";
import { normalizeDeadline, parseDeadlinePatch } from "../../src/modules/programs/deadline";

const now = Date.parse("2026-11-15T00:00:00Z");

describe("application deadline", () => {
  test("clears with null or an empty string", () => {
    expect(parseDeadlinePatch(null, now)).toBeNull();
    expect(parseDeadlinePatch("", now)).toBeNull();
  });
  test("stores a future date as a UTC ISO timestamp", () => {
    expect(parseDeadlinePatch("2026-11-30T23:59:00+05:30", now)).toBe("2026-11-30T18:29:00.000Z");
  });
  test("rejects past, far-future and unreadable values", () => {
    expect(() => parseDeadlinePatch("2026-11-14T00:00:00Z", now)).toThrow("in the future");
    expect(() => parseDeadlinePatch("2030-01-01T00:00:00Z", now)).toThrow("two years");
    expect(() => parseDeadlinePatch("soon", now)).toThrow("valid application deadline");
    expect(() => parseDeadlinePatch(42, now)).toThrow("valid application deadline");
  });
  test("reads stored values defensively", () => {
    expect(normalizeDeadline(undefined)).toBeNull();
    expect(normalizeDeadline("garbage")).toBeNull();
    expect(normalizeDeadline("2026-12-01T00:00:00Z")).toBe("2026-12-01T00:00:00.000Z");
  });
});
