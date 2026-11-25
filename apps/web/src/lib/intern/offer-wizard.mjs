import { earliestStartDate } from "./offer-policy.mjs";

/**
 * The three ways to give an internship, for the bulk offer wizard. They match
 * the single-applicant flows on the applicant page exactly.
 */
export const OFFER_KINDS = [
  {
    id: "formal",
    title: "Formal offer",
    summary: "Students accept or decline in their portal within the response window, which closes before the start date.",
    email: "“Your Olentra internship offer” email. The offer letter PDF follows when they accept.",
  },
  {
    id: "instant",
    title: "Instant offer",
    summary: "Students activate their portal from the email and must accept by the end of the start day. Accepting makes them an intern straight away.",
    email: "Instant offer email with a one-time portal link. The offer letter PDF follows when they accept.",
  },
  {
    id: "direct",
    title: "Direct enrolment",
    summary: "For students who already agreed (in person or on a call). They become active interns now, with no decision step.",
    email: "Welcome email with portal access and the offer letter PDF attached.",
  },
];

export const offerKind = (id) => OFFER_KINDS.find((kind) => kind.id === id) || OFFER_KINDS[0];

/** Earliest start date allowed for each kind (YYYY-MM-DD). */
export function earliestStartFor(kind, today, leadDays) {
  return kind === "formal" ? earliestStartDate(today, leadDays) : today;
}

/** What the admin types to confirm: OFFER 12, or ENROL 12 for direct enrolment. */
export function confirmPhraseFor(kind, count) {
  return `${kind === "direct" ? "ENROL" : "OFFER"} ${count}`;
}

export function confirmsPhrase(kind, typed, count) {
  return count > 0 && String(typed || "").trim().toUpperCase() === confirmPhraseFor(kind, count);
}

/** The first problem with the terms, or "" when they're ready for review. */
export function termsProblem({ kind, startOn, stipend, maxStipend, message, agreementNote, today, leadDays }) {
  if (!startOn) return "Choose a start date.";
  const earliest = earliestStartFor(kind, today, leadDays);
  if (startOn < earliest) {
    return kind === "formal"
      ? `Formal offers must close ${leadDays} days before the internship starts, so choose ${earliest} or later.`
      : "Choose today or a later start date.";
  }
  const amount = Number(stipend);
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > Number(maxStipend || 0)) return `Enter a stipend from ₹0 to ₹${Number(maxStipend || 0).toLocaleString("en-IN")}.`;
  if (!String(message || "").trim()) return "Write a welcome message.";
  if (String(message).length > 2000) return "Keep the welcome message under 2,000 characters.";
  if (kind === "direct" && String(agreementNote || "").trim().length < 5) return "Record how and when the students agreed to the internship.";
  return "";
}

/** Params for the one server preview that checks the schedule for the whole batch. */
export function previewParams(kind, applicationId, startOn, expiresInDays) {
  if (kind === "instant") return { applicationId, startOn, route: "instant" };
  if (kind === "direct") return { applicationId, startOn, direct: true };
  return { applicationId, startOn, expiresInDays: Number(expiresInDays) };
}

/**
 * The terms sent for every applicant. The preview was made for one applicant,
 * so its applicationId is dropped: each request names its own applicant.
 */
export function offerTerms(kind, preview, { stipend, message, expiresInDays, agreementNote }) {
  const { applicationId: _previewApplicant, ...schedule } = preview || {};
  const common = { stipend: Number(stipend), message: String(message || "").trim() };
  if (kind === "instant") return { ...schedule, ...common, route: "instant" };
  if (kind === "direct") return { ...schedule, ...common, agreementNote: String(agreementNote || "").trim() };
  return { startOn: schedule.startOn, endOn: schedule.endOn, configRevision: schedule.configRevision, expiresInDays: Number(expiresInDays), ...common };
}
