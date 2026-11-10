const dashboardTitles = Object.freeze({
  applications: "Applications", analytics: "Analytics", interns: "Interns",
  projects: "Projects", certificates: "Certificates", settings: "Settings",
  staff: "Staff & Roles",
});
const portalTitles = Object.freeze({
  application: "My Application", onboarding: "Onboarding", projects: "My Projects",
  submissions: "Submissions", certificates: "Certificates", profile: "My Profile",
});

export function workspacePath(value = "/") {
  return value.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
}

export function workspacePageTitle(pathname) {
  const [, area, workspace, page, detail] = workspacePath(pathname).split("/");
  if (area !== "intern") return "Workspace";
  if (workspace === "dashboard") {
    if (page === "applications" && detail) return "Application details";
    return page ? dashboardTitles[page] || "Workspace" : "Dashboard";
  }
  if (workspace === "portal") {
    if (page === "projects" && detail) return "Project details";
    return page ? portalTitles[page] || "Workspace" : "Dashboard";
  }
  return "Workspace";
}

export function pendingWorkspaceDestination(target, pathname, pending) {
  if (!pending || !target) return null;
  const destination = workspacePath(target);
  if (!/^\/intern\/(dashboard|portal)(\/|$)/.test(destination)) return null;
  return destination === workspacePath(pathname) ? null : destination;
}
