/** ISO 8601 week id for a date, e.g. "2026-W46" (weeks start on Monday). */
export function isoWeek(date: Date = new Date()) {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const weekday = day.getUTCDay() || 7;
  day.setUTCDate(day.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((day.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${day.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/**
 * Consecutive weeks with a check-in, counting back from this week (or from
 * last week, so a streak isn't broken before this week's is due).
 */
export function checkinStreak(weeks: string[], now: Date = new Date()) {
  const have = new Set(weeks);
  const cursor = new Date(now);
  if (!have.has(isoWeek(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 7);
  let streak = 0;
  while (have.has(isoWeek(cursor))) { streak++; cursor.setUTCDate(cursor.getUTCDate() - 7); }
  return streak;
}
