/** Board columns, in pipeline order. Joined is managed through onboarding, not by dragging. */
export const BOARD_COLUMNS = ["Applied", "Under Review", "Shortlisted", "Selected", "Rejected"];
const REVIEWER_STATUSES = ["Applied", "Under Review", "Shortlisted"];

/** Whether this person may move a card from one status to another (mirrors the server rule). */
export function canMoveCard(from, to, { isAdmin }) {
  if (!from || !to || from === to || from === "Joined" || !BOARD_COLUMNS.includes(to)) return false;
  return isAdmin || (REVIEWER_STATUSES.includes(from) && REVIEWER_STATUSES.includes(to));
}
