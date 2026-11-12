import test from "node:test";
import assert from "node:assert/strict";
import { dashboardInsights, dashboardQuickActions } from "../src/lib/intern/dashboard-insights.mjs";

const months = (last2, last) => [...Array(10).fill({ explorer: 0, innovator: 0 }), last2, last];

test("insights compute growth, selection rate and the review backlog", () => {
  const insights = dashboardInsights({
    totalApplications: 10,
    statusCounts: { Applied: 3, "Under Review": 1, Shortlisted: 2, Selected: 2, Joined: 1, Rejected: 1 },
    months: months({ explorer: 3, innovator: 1 }, { explorer: 4, innovator: 1 }),
  });
  assert.deepEqual(insights.map((item) => [item.id, item.value]), [["growth", "+25%"], ["selection", "30%"], ["review", "4"]]);
});

test("growth falls back to a count when last month had no applications", () => {
  const [growth] = dashboardInsights({ totalApplications: 6, statusCounts: { Applied: 6 }, months: months({ explorer: 0, innovator: 0 }, { explorer: 5, innovator: 1 }) });
  assert.deepEqual([growth.value, growth.label], ["6", "Applications this month"]);
  const [drop] = dashboardInsights({ totalApplications: 3, statusCounts: {}, months: months({ explorer: 4, innovator: 0 }, { explorer: 1, innovator: 0 }) });
  assert.equal(drop.value, "-75%");
});

test("no analytics means no insights, and an empty program shows a dash", () => {
  assert.deepEqual(dashboardInsights(null), []);
  assert.equal(dashboardInsights({ totalApplications: 0, statusCounts: {}, months: [] })[1].value, "—");
});

test("quick actions follow the staff member's permissions", () => {
  const recruiter = dashboardQuickActions({ isAdmin: false, can: (p) => ["applications.read"].includes(p) });
  assert.deepEqual(recruiter.map((a) => a.id), ["export", "applications"]);
  const admin = dashboardQuickActions({ isAdmin: true, can: () => true });
  assert.deepEqual(admin.map((a) => a.id), ["export", "applications", "interns", "certificates", "notifications"]);
});
