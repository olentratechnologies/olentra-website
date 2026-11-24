/**
 * Who a project link is for. A link without `members` is for every intern on
 * the team; with `members`, only those interns see it (and, for repositories,
 * get GitHub access). Staff-only links are for no intern.
 */
export function linkIsFor(link: any, applicationId: string) {
  if (!link || link.visibleToInterns === false) return false;
  return !Array.isArray(link.members) || link.members.includes(applicationId);
}

/**
 * Links after interns leave a project: their access records go, and a link limited
 * to interns who all left becomes staff-only rather than open to the whole team.
 */
export function linksWithout(links: any[], removed: string[]) {
  return links.map((link: any) => {
    const next = { ...link, access: Object.fromEntries(Object.entries(link.access || {}).filter(([id]) => !removed.includes(id))) };
    if (Array.isArray(link.members)) {
      next.members = link.members.filter((id: string) => !removed.includes(id));
      if (!next.members.length) { delete next.members; next.visibleToInterns = false; }
    }
    return next;
  });
}
