/**
 * Who a project link is for. A link without `members` is for every intern on
 * the team; with `members`, only those interns see it (and, for repositories,
 * get GitHub access). Staff-only links are for no intern.
 */
export function linkIsFor(link: any, applicationId: string) {
  if (!link || link.visibleToInterns === false) return false;
  return !Array.isArray(link.members) || link.members.includes(applicationId);
}
