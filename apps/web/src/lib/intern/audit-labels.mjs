/** Plain-language lines for audit log rows. Unknown actions fall back to their raw name. */
const LABELS = {
  "application.status": (detail) => `Moved an application from ${detail?.from || "?"} to ${detail?.to || "?"}`,
  "offer.sent": () => "Sent an internship offer",
  "application.enrolledDirectly": () => "Enrolled an applicant directly",
  "onboarding.approved": () => "Approved onboarding",
  "certificate.issued": (detail) => `Issued certificate ${detail?.certificateNumber || ""}`.trim(),
  "applicant.erased": () => "Erased an applicant's data",
  "staff.create": () => "Created a staff account",
  "staff.update": () => "Updated a staff account",
  "staff.resetPassword": () => "Reset a staff password",
  "role.create": () => "Created a role",
  "role.update": () => "Updated a role",
  "admin.bootstrap": () => "Created the first admin",
  "project.link.added": (detail) => `Added project link ${detail?.label || ""}`.trim(),
  "project.link.updated": (detail) => `Updated project link ${detail?.label || ""}`.trim(),
  "project.link.deleted": (detail) => `Deleted project link ${detail?.label || ""}`.trim(),
  "team.created": (detail) => `Created team ${detail?.names?.[0] || ""}`.trim(),
  "team.createdMany": (detail) => `Created ${detail?.count || ""} teams`.replace("  ", " "),
  "team.membersAdded": (detail) => `Added ${detail?.added?.length || ""} team ${detail?.added?.length === 1 ? "member" : "members"}`,
  "team.memberRemoved": () => "Removed a team member",
  "team.memberMoved": () => "Moved an intern to another team",
  "team.projectAssigned": (detail) => `Assigned a team to ${detail?.name || "a project"}`,
  "team.projectRemoved": (detail) => `Took a team off ${detail?.name || "a project"}`,
  "team.archived": (detail) => `Archived team ${detail?.name || ""}`.trim(),
  "team.restored": (detail) => `Restored team ${detail?.name || ""}`.trim(),
  "team.mentorSet": (detail) => detail?.mentorName ? `Made ${detail.mentorName} a team's mentor` : "Cleared a team's mentor",
  "team.settings": (detail) => `Set the usual team size to ${detail?.size ?? "?"}`,
  "project.link.access": (detail) => detail?.status === "granted" ? "Marked repository access as granted" : "Marked repository access as pending",
};

export function describeAudit(entry) {
  const label = LABELS[entry?.action];
  return label ? label(entry.detail) : entry?.action || entry?.type || "Change";
}

export const AUDIT_FILTERS = [
  { id: "all", label: "All activity" },
  { id: "applications", label: "Application decisions" },
  { id: "staff", label: "Staff & roles" },
];
