import test from "node:test";
import assert from "node:assert/strict";
import { pendingWorkspaceDestination, workspacePageTitle, workspacePath } from "../src/lib/intern/workspace-navigation.mjs";

test("workspace loading headings match both sidebars and support URL suffixes", () => {
  for (const [path, title] of [
    ["/intern/dashboard", "Dashboard"],
    ["/intern/dashboard/applications", "Applications"],
    ["/intern/dashboard/analytics", "Analytics"],
    ["/intern/dashboard/interns", "Interns"],
    ["/intern/dashboard/projects", "Projects"],
    ["/intern/dashboard/certificates", "Certificates"],
    ["/intern/dashboard/settings", "Settings"],
    ["/intern/dashboard/staff", "Staff & Roles"],
    ["/intern/portal", "Dashboard"],
    ["/intern/portal/application", "My Application"],
    ["/intern/portal/onboarding", "Onboarding"],
    ["/intern/portal/projects", "My Projects"],
    ["/intern/portal/submissions", "Submissions"],
    ["/intern/portal/certificates", "Certificates"],
    ["/intern/portal/profile", "My Profile"],
  ]) {
    assert.equal(workspacePageTitle(path), title, path);
    assert.equal(workspacePageTitle(`${path}/?page=2#content`), title, path);
  }
});

test("record destinations receive useful headings without leaking route identifiers", () => {
  assert.equal(workspacePageTitle("/intern/dashboard/applications/private-record-id"), "Application details");
  assert.equal(workspacePageTitle("/intern/portal/projects/private-project-id"), "Project details");
  for (const path of ["/intern/dashboard/unknown", "/intern/portal/unknown", "/about/dashboard", "/intern/login"]) {
    assert.equal(workspacePageTitle(path), "Workspace");
  }
});

test("a pending destination disappears on completion, cancellation, or a same-route commit", () => {
  const from = "/intern/dashboard";
  const target = "/intern/dashboard/applications";
  assert.equal(pendingWorkspaceDestination(target, from, true), target);
  assert.equal(pendingWorkspaceDestination(target, from, false), null);
  assert.equal(pendingWorkspaceDestination(null, from, true), null);
  assert.equal(pendingWorkspaceDestination(target, target, true), null);
  assert.equal(pendingWorkspaceDestination(`${target}/?page=2`, target, true), null);
  assert.equal(pendingWorkspaceDestination(from, from, true), null);
});

test("rapid navigation previews the latest target while login and external links stay outside the preview", () => {
  const from = "/intern/dashboard";
  const latest = "/intern/dashboard/certificates";
  assert.equal(pendingWorkspaceDestination(latest, from, true), latest);
  assert.equal(pendingWorkspaceDestination(latest, "/intern/dashboard/applications", true), latest);
  assert.equal(pendingWorkspaceDestination(latest, latest, true), null);
  for (const target of ["/intern/login", "/intern/dashboard-preview", "/intern/portals", "/careers/intern", "https://example.com/intern/dashboard"]) {
    assert.equal(pendingWorkspaceDestination(target, from, true), null, target);
  }
  assert.equal(workspacePath("/intern/portal/projects/?sort=recent#tasks"), "/intern/portal/projects");
});
