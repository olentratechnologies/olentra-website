export function hasStaffPermission(account, permission) {
  return account?.role === "company" && (account.staffRole === "admin" || (Array.isArray(account.permissions) && account.permissions.includes(permission)));
}
export function canOpenInternSection(account, section) {
  const can = permission => hasStaffPermission(account, permission);
  switch (section) {
    case "dashboard": case "analytics": return can("overview.read");
    case "applications": return can("applications.read");
    case "interns": return can("interns.read");
    case "projects": return can("projects.read") || can("projects.summary");
    case "certificates": return can("certificates.read");
    case "settings": case "staff": return account?.staffRole === "admin";
    default: return false;
  }
}
