/**
 * Minimal iCalendar (RFC 5545) invite for one interview. A cancellation uses
 * the same UID with a higher SEQUENCE, so calendars update the event in place.
 */
const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
/** Escapes text values: backslash, comma, semicolon and newlines. */
export const icsText = (value: string) => value.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
/** Folds lines longer than 75 octets, as the format requires. */
function fold(line: string) {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  for (const character of line) {
    if (new TextEncoder().encode(current + character).length > (parts.length ? 74 : 75)) { parts.push(current); current = ""; }
    current += character;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function interviewIcs({ uid, sequence, startsAt, minutes = 45, summary, description, url, method, now = new Date().toISOString() }: {
  uid: string; sequence: number; startsAt: string; minutes?: number; summary: string; description: string; url: string; method: "REQUEST" | "CANCEL"; now?: string;
}) {
  const end = new Date(new Date(startsAt).getTime() + minutes * 60_000).toISOString();
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Olentra Technologies//Internships//EN", "CALSCALE:GREGORIAN", `METHOD:${method}`,
    "BEGIN:VEVENT",
    `UID:${uid}@olentratechnologies.com`, `SEQUENCE:${sequence}`, `DTSTAMP:${stamp(now)}`, `DTSTART:${stamp(startsAt)}`, `DTEND:${stamp(end)}`,
    `SUMMARY:${icsText(summary)}`, `DESCRIPTION:${icsText(description)}`, `LOCATION:${icsText(url)}`, `URL:${url.replace(/[\r\n]/g, "")}`,
    `STATUS:${method === "CANCEL" ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT", "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** "12 Nov 2026, 3:30 pm IST (10:00 UTC)" — India time first, with UTC for anyone elsewhere. */
export function interviewTimeLabel(iso: string) {
  const date = new Date(iso);
  const ist = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
  return `${ist} IST (${date.toISOString().slice(11, 16)} UTC)`;
}
