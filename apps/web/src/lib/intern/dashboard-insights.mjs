/**
 * Key Insights for the staff dashboard, computed from live analytics
 * (`statusCounts`, `totalApplications`, `months`). Returns [] without data.
 */
export function dashboardInsights(analytics) {
  if (!analytics) return [];
  const counts = analytics.statusCounts || {};
  const total = analytics.totalApplications || 0;
  const months = analytics.months || [];
  const monthTotal = (entry) => (entry ? (entry.explorer || 0) + (entry.innovator || 0) : 0);
  const thisMonth = monthTotal(months.at(-1)), lastMonth = monthTotal(months.at(-2));

  const growth = lastMonth > 0
    ? { value: `${thisMonth >= lastMonth ? "+" : ""}${Math.round(((thisMonth - lastMonth) / lastMonth) * 100)}%`, label: "Change in applications vs last month" }
    : { value: String(thisMonth), label: thisMonth === 1 ? "Application this month" : "Applications this month" };

  const selected = (counts.Selected || 0) + (counts.Joined || 0);
  const awaiting = (counts.Applied || 0) + (counts["Under Review"] || 0);
  return [
    { id: "growth", icon: "rocket", tone: "blue", ...growth },
    { id: "selection", icon: "star", tone: "orange", value: total ? `${Math.round((selected / total) * 100)}%` : "—", label: "Selection rate (selected or joined)" },
    { id: "review", icon: "clock", tone: "purple", value: String(awaiting), label: awaiting === 1 ? "Application awaiting review" : "Applications awaiting review" },
  ];
}

/** Quick actions a staff member can actually use; `can(permission)` mirrors staff access rules. */
export function dashboardQuickActions({ isAdmin, can }) {
  return [
    { id: "export", label: "Export report", icon: "download" },
    ...(can("applications.read") ? [{ id: "applications", label: "Review applications", icon: "clipboard" }] : []),
    ...(can("interns.read") ? [{ id: "interns", label: "Manage interns", icon: "users" }] : []),
    ...(can("certificates.read") ? [{ id: "certificates", label: "Certificates & stories", icon: "certificate" }] : []),
    ...(isAdmin ? [{ id: "notifications", label: "Send announcement", icon: "send" }] : []),
  ];
}
