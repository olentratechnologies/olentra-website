export function hasStaffPermission(account, permission) {
  return account?.role === "company" && (account.staffRole === "admin" || (Array.isArray(account.permissions) && account.permissions.includes(permission)));
}
/** Teams: project permissions also cover teams, so older roles keep working. */
export function canManageTeams(account) {
  return hasStaffPermission(account, "teams.manage") || hasStaffPermission(account, "projects.manage");
}
export function canOpenInternSection(account, section) {
  const can = permission => hasStaffPermission(account, permission);
  switch (section) {
    case "dashboard": case "analytics": return can("overview.read");
    case "applications": return can("applications.read");
    case "interns": return can("interns.read");
    case "projects": return can("projects.read") || can("projects.summary");
    case "teams": return can("teams.read") || can("projects.read");
    case "certificates": return can("certificates.read");
    case "settings": case "staff": case "custom-email": case "offers": return account?.staffRole === "admin";
    default: return false;
  }
}
