/** A saved deadline as epoch milliseconds, or null when none (or an unreadable value) is set. */
export function deadlineTime(value) {
  if (typeof value !== "string" || !value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

export function isDeadlinePassed(value, now = Date.now()) {
  const time = deadlineTime(value);
  return time !== null && time <= now;
}

/** Whole days, hours, minutes and seconds left until `time` (all zero once it has passed). */
export function timeRemaining(time, now = Date.now()) {
  const total = Math.max(0, time - now);
  const seconds = Math.floor(total / 1000);
  return {
    total,
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
  };
}

/** "Sat, 28 Nov 2026 · 11:59 PM GMT+5:30" in the viewer's own time zone. */
export function formatDeadline(time, locale) {
  const date = new Date(time);
  const day = date.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const clock = date.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  return `${day} · ${clock}`;
}

/** The value for an <input type="datetime-local"> showing `iso` in local time. */
export function toLocalInputValue(iso) {
  const time = deadlineTime(iso);
  if (time === null) return "";
  const date = new Date(time);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** An ISO timestamp from a datetime-local value (read as local time), or null when blank/invalid. */
export function fromLocalInputValue(value) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

/** After applications close, the team reviews them; results go out within this many days. */
export const REVIEW_DAYS = 3;

/** When results are due after the deadline at `time`. */
export function resultsBy(time, days = REVIEW_DAYS) {
  return time + days * 86_400_000;
}

/** "Mon, 30 Nov 2026" in the viewer's own time zone. */
export function formatDay(time, locale) {
  return new Date(time).toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}
