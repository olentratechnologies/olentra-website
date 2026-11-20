/**
 * Offer deadline policy, shared by server and browser.
 *
 * An offer closes at 11:59 PM IST on a fixed day, and it must close at least
 * `leadDays` days before the internship starts, so every acceptance lands
 * before day one with time left for onboarding.
 */
import { civilToday, displayDate, validCivilDate } from './schedule.mjs';

export const DEFAULT_ONBOARDING_LEAD_DAYS = 3;
export const MAX_OPEN_DAYS = 30;
export const MAX_LEAD_DAYS = 30;

export function normalizeLeadDays(value) {
  const days = Number(value);
  return Number.isInteger(days) && days >= 0 && days <= MAX_LEAD_DAYS ? days : DEFAULT_ONBOARDING_LEAD_DAYS;
}

export function addCivilDays(civil, days) {
  const date = new Date(`${civil}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Whole days from civil date `from` to civil date `to`. */
export function civilDaysBetween(from, to) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
}

/** The IST calendar day an instant falls on. */
export function deadlineDay(deadlineIso) {
  return civilToday(new Date(deadlineIso));
}

/** 11:59:59 PM IST on the given civil day, as an ISO instant. */
export function endOfDayIst(civil) {
  return new Date(Date.parse(`${civil}T23:59:59.000+05:30`)).toISOString();
}

/** The deadline for an offer sent at `nowIso` and open for `days` days. */
export function decisionDeadline(nowIso, days) {
  return endOfDayIst(addCivilDays(civilToday(new Date(nowIso)), days));
}

/** The earliest start date an offer closing at `deadlineIso` allows. */
export function earliestStartFor(deadlineIso, leadDays) {
  return addCivilDays(deadlineDay(deadlineIso), normalizeLeadDays(leadDays));
}

/** The earliest start date for an offer sent today and open for at least one day. */
export function earliestStartDate(today, leadDays) {
  return addCivilDays(today, 1 + normalizeLeadDays(leadDays));
}

/** The longest "open for" window (in days) a start date allows; 0 if none. */
export function maxOpenDays(startOn, today, leadDays) {
  if (!validCivilDate(startOn) || !validCivilDate(today)) return 0;
  return Math.max(0, Math.min(MAX_OPEN_DAYS, civilDaysBetween(today, startOn) - normalizeLeadDays(leadDays)));
}

/** Why an offer window breaks the policy, or null when it is fine. */
export function offerWindowProblem({ startOn, deadlineIso, leadDays }) {
  const lead = normalizeLeadDays(leadDays);
  const earliest = earliestStartFor(deadlineIso, lead);
  if (startOn >= earliest) return null;
  const latestDay = addCivilDays(startOn, -lead);
  const gap = lead === 1 ? "1 day" : `${lead} days`;
  return latestDay < civilToday()
    ? `This start date is too soon. Offers must close ${gap} before the internship starts, so choose a start date on or after ${displayDate(earliestStartDate(civilToday(), lead))}.`
    : `The decision deadline must be at least ${gap} before the start date. For a start on ${displayDate(startOn)}, the offer must close by ${formatDeadline(endOfDayIst(latestDay))}.`;
}

/** "Friday, 19 December 2026, 11:59 PM IST" */
export function formatDeadline(deadlineIso) {
  const value = Date.parse(deadlineIso || "");
  if (!Number.isFinite(value)) return "";
  const text = new Date(value).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  return `${text.replace(/ at /, ', ').replace(/\b(am|pm)\b/, (match) => match.toUpperCase())} IST`;
}
