// Maps a verified staff account from the realtime server to a company
// workspace access level. Staff admins own the workspace; other staff get the
// highest workspace.* permission their role grants, or no access at all.
export const WORKSPACE_LEVELS = [
  ["workspace.administrator", "Administrator"],
  ["workspace.editor", "Editor"],
  ["workspace.recruiter", "Recruiter"],
  ["workspace.analyst", "Analyst"],
];

export function workspaceRole(account) {
  if (!account || account.role !== "company" || !account.staffRole) return null;
  if (account.staffRole === "admin") return "Owner";
  const permissions = Array.isArray(account.permissions) ? account.permissions : [];
  return WORKSPACE_LEVELS.find(([permission]) => permissions.includes(permission))?.[1] || null;
}

/** Only these levels may change live website switches; the server enforces the same rule. */
export const canControlWebsite = account => ["Owner", "Administrator"].includes(workspaceRole(account));
