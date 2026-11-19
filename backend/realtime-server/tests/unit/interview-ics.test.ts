import { expect, test } from "bun:test";
import { interviewIcs, interviewTimeLabel } from "../../src/modules/interviews/ics";

const base = { uid: "INTV-1", sequence: 0, startsAt: "2026-12-01T10:00:00.000Z", summary: "Olentra interview, Software Engineer Intern", description: "Hi Asha; see you, soon\nBring questions", url: "https://meet.example.test/abc", now: "2026-11-12T09:00:00.000Z" };

test("an invite has the event times in UTC, a stable UID and escaped text", () => {
  const ics = interviewIcs({ ...base, method: "REQUEST" });
  expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
  for (const line of ["METHOD:REQUEST", "UID:INTV-1@olentratechnologies.com", "SEQUENCE:0", "DTSTART:20261201T100000Z", "DTEND:20261201T104500Z", "STATUS:CONFIRMED", "SUMMARY:Olentra interview\\, Software Engineer Intern"]) expect(ics).toContain(line);
  expect(ics).toContain("DESCRIPTION:Hi Asha\; see you\\, soon\\nBring questions");
  expect(ics.split("\r\n").every(line => new TextEncoder().encode(line).length <= 75)).toBe(true);
});

test("a cancellation reuses the UID with a higher sequence", () => {
  const ics = interviewIcs({ ...base, sequence: 2, method: "CANCEL" });
  expect(ics).toContain("METHOD:CANCEL");
  expect(ics).toContain("SEQUENCE:2");
  expect(ics).toContain("STATUS:CANCELLED");
});

test("email times read in India time with UTC alongside", () => {
  expect(interviewTimeLabel("2026-12-01T10:00:00.000Z")).toMatch(/^1 Dec 2026(,| at) 3:30\s?pm IST \(10:00 UTC\)$/i);
});
