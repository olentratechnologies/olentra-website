import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createInitialState, executeCommand } from "../src/lib/admin/model.mjs";
import { selectAnalytics, selectMonitoring, can } from "../src/lib/admin/selectors.mjs";

const parts = ["core", "content", "operations", "governance"].map(domain =>
  JSON.parse(readFileSync(new URL(`../src/data/admin/${domain}.json`, import.meta.url), "utf8"))
);
const operations = parts[2];
const clone = value => structuredClone(value);
function workspace() {
  let state = createInitialState(parts);
  return {
    get state() { return state; },
    run(type, payload) {
      const result = executeCommand(state, type, payload);
      assert.equal(result.ok, true, `${type}: ${result.error || "command failed"}`);
      state = result.state;
      return result.value;
    },
    attempt(type, payload) {
      const result = executeCommand(state, type, payload);
      state = result.state;
      return result;
    },
  };
}
function assertRejectedWithoutChanges(app, type, payload, pattern) {
  const before = app.state;
  const result = app.attempt(type, payload);
  assert.equal(result.ok, false, `${type} should have been rejected`);
  if (pattern) assert.match(result.error, pattern);
  assert.equal(result.state, before, "a rejected transaction must preserve the original state object");
  assert.deepEqual(app.state, before, "a rejected transaction must not leave partial dataset, audit or notification changes");
}
function signIn(app, email) {
  const account = app.state.datasets["auth-accounts"].find(row => row.email === email);
  assert.ok(account, "a fixture account is required");
  const next = app.run("auth.signIn", { email, passwordDigest: account.passwordDigest });
  if (next.requiresMfa) app.run("auth.verify", { code: account.mfaCode });
  assert.equal(app.state.datasets["auth-session"].userId, account.id);
}

test("analytics filters actual dated events and counts distinct visitors", () => {
  const app = workspace();
  const end = Date.parse(app.state.meta.clock);
  const start = new Date(app.state.meta.clock);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - 6);
  const matching = app.state.datasets["admin-visit-events"].filter(event =>
    Date.parse(event.at) >= start.getTime() && Date.parse(event.at) <= end && event.source === "Organic search"
  );
  const result = selectAnalytics(app.state, { range: "Last 7 days", source: "Organic search" });
  assert.equal(result.pageViews, matching.length);
  assert.equal(result.visitors, new Set(matching.map(event => event.visitorId)).size);
  assert.equal(result.enquiries, matching.filter(event => event.enquiry).length);
  assert.ok(result.events.every(event => event.source === "Organic search"));
  assert.equal(result.chart.enquiryValues.reduce((sum, count) => sum + count, 0), result.enquiries);
  const broader = selectAnalytics(app.state, { range: "Last 90 days" });
  assert.ok(broader.pageViews > result.pageViews);
  const regional = selectAnalytics(app.state, { range: "Last 30 days", region: "Europe" });
  assert.ok(regional.events.length && regional.events.every(event => event.region === "Europe"));
});

test("weekly visitor chart has one bucket per day ending today", () => {
  const app = workspace();
  const clock = new Date(app.state.meta.clock);
  const result = selectAnalytics(app.state, { range: "Last 7 days" });
  const format = date => new Intl.DateTimeFormat("en-GB", { month: "short", day: "numeric", timeZone: "UTC" }).format(date);
  const expected = Array.from({ length: 7 }, (_, i) => format(new Date(clock.getTime() - (6 - i) * 86400000)));
  assert.deepEqual(result.chart.labels, expected);
  assert.equal(result.chart.enquiryValues.reduce((sum, count) => sum + count, 0), result.enquiries);
  for (const range of ["Last 30 days", "Last 90 days"]) {
    const { chart } = selectAnalytics(app.state, { range });
    assert.equal(new Set(chart.labels).size, chart.labels.length, range + " labels must be distinct");
  }
});

test("incident recovery changes only its incident and preserves historical failures", () => {
  const app = workspace();
  app.run("incident.update", { id: "page-errors", status: "Investigating" });
  const other = clone(app.state.datasets["admin-incidents"].find(row => row.id === "page-errors"));
  const oldProbes = clone(app.state.datasets["admin-performance-probes"]);
  const historicalFailures = oldProbes.filter(probe => !probe.available).length;
  app.run("incident.update", { id: "contact-delivery", status: "Resolved" });
  const current = app.state.datasets["admin-incidents"].find(row => row.id === "contact-delivery");
  assert.equal(current.status, "Resolved");
  assert.equal(current.acknowledged, true);
  assert.deepEqual(app.state.datasets["admin-incidents"].find(row => row.id === other.id), other);
  assert.deepEqual(app.state.datasets["admin-performance-probes"].slice(0, oldProbes.length), oldProbes);
  assert.equal(app.state.datasets["admin-performance-probes"].length, oldProbes.length + 1);
  assert.equal(app.state.datasets["admin-performance-probes"].filter(probe => !probe.available).length, historicalFailures);
  const health = selectMonitoring(app.state, { range: "Last 7 days" });
  assert.equal(health.serviceRows.find(row => row.id === "contact-form").status, "Operational");
  assert.equal(health.serviceRows.find(row => row.id === "website").status, "Degraded");
  assert.equal(health.unresolvedIncidents.length, 1);
  assert.ok(health.uptime < 100, "recovery must not erase recorded downtime");
  assertRejectedWithoutChanges(app, "incident.update", { id: "not-a-real-incident", status: "Resolved" }, /not be found/i);
});

test("alerts validate inputs and support shared create, update and delete", () => {
  const app = workspace();
  const before = app.state.datasets["admin-alert-rules"].length;
  assertRejectedWithoutChanges(app, "alert.save", { rule: { ...clone(operations.reference.newAlertRule), name: "" } }, /name and condition/i);
  const created = app.run("alert.save", { rule: { ...clone(operations.reference.newAlertRule), name: "Operations integration test alert" } });
  assert.equal(app.state.datasets["admin-alert-rules"].length, before + 1);
  app.run("alert.save", { rule: { ...created, enabled: false, severity: "Low" } });
  assert.equal(app.state.datasets["admin-alert-rules"].find(row => row.id === created.id).enabled, false);
  assert.equal(app.state.datasets["admin-alert-rules"].find(row => row.id === created.id).severity, "Low");
  app.run("alert.delete", { id: created.id });
  assert.equal(app.state.datasets["admin-alert-rules"].length, before);
  assert.equal(app.state.datasets["admin-alert-rules"].some(row => row.id === created.id), false);
});

test("redirect cycle validation rolls back atomically and valid redirects resolve broken links", () => {
  const app = workspace();
  assertRejectedWithoutChanges(app, "seo.redirect.save", { redirect: { from: "/services", to: "/old-services", type: "301" } }, /loop/i);
  assertRejectedWithoutChanges(app, "seo.redirect.save", { redirect: { from: "/same", to: "/same", type: "301" } }, /different/i);
  const broken = app.state.datasets["admin-seo-broken"].find(row => row.id === "b1");
  const before = app.state.datasets["admin-seo-broken"].length;
  const redirect = app.run("seo.redirect.save", { redirect: { from: broken.target, to: "/about", type: "301" } });
  assert.equal(app.state.datasets["admin-seo-broken"].length, before - 1);
  assert.ok(app.state.datasets["admin-seo-redirects"].some(row => row.id === redirect.id));
  app.run("seo.redirect.delete", { id: redirect.id });
  assert.equal(app.state.datasets["admin-seo-redirects"].some(row => row.id === redirect.id), false);
});

test("translation review creates a real approval and publication updates locale coverage", () => {
  const app = workspace();
  const before = clone(app.state.datasets["admin-locales"].find(row => row.id === "fr"));
  const original = app.state.datasets["admin-translation-fr-homepage"];
  const fields = { ...original.fields, title: original.fields.title + " · Updated" };
  app.run("translation.save", { locale: "fr", contentId: "homepage", fields, status: "In review" });
  const reviewCoverage = app.state.datasets["admin-locales"].find(row => row.id === "fr");
  assert.equal(reviewCoverage.published, before.published - 1);
  assert.equal(reviewCoverage.review, before.review + 1);
  const request = app.state.datasets["olentra-admin-governance-approvals-v1"][0];
  assert.equal(request.kind, "translation");
  assert.deepEqual(request.target.fields, fields);
  app.run("approval.decide", { id: request.id, decision: "approve" });
  assert.deepEqual(app.state.datasets["admin-translation-fr-homepage"].fields, fields);
  assert.equal(app.state.datasets["admin-translation-fr-homepage"].status, "Published");
  const publishedCoverage = app.state.datasets["admin-locales"].find(row => row.id === "fr");
  assert.equal(publishedCoverage.published, before.published);
  assert.equal(publishedCoverage.review, before.review);
  assertRejectedWithoutChanges(app, "translation.save", { locale: "fr", contentId: "homepage", fields, status: "Published" }, /approval/i);
  assertRejectedWithoutChanges(app, "translation.save", { locale: "unknown", contentId: "homepage", fields, status: "Draft" }, /not configured/i);
});

test("SEO review keeps published metadata separate and publishes the approved snapshot", () => {
  const app = workspace();
  const page = app.state.datasets["admin-seo-pages"].find(row => row.id === "services");
  const original = clone(app.state.datasets["admin-seo-published"].find(row => row.id === page.id));
  const title = "Reviewed Enterprise Services | Olentra";
  app.run("seo.save", { id: page.id, patch: { ...page, title, status: "In review" } });
  assert.deepEqual(app.state.datasets["admin-seo-published"].find(row => row.id === page.id), original);
  const request = app.state.datasets["olentra-admin-governance-approvals-v1"][0];
  assert.equal(request.kind, "seo");
  app.run("approval.decide", { id: request.id, decision: "approve" });
  assert.equal(app.state.datasets["admin-seo-pages"].find(row => row.id === page.id).status, "Published");
  assert.equal(app.state.datasets["admin-seo-published"].find(row => row.id === page.id).title, title);
  assertRejectedWithoutChanges(app, "seo.save", { id: page.id, patch: { title, status: "Published" } }, /approval/i);
});

test("editing reviewed metadata invalidates the earlier approval without partial publication", () => {
  const app = workspace();
  const page = app.state.datasets["admin-seo-pages"].find(row => row.id === "about");
  app.run("seo.save", { id: page.id, patch: { title: "First about title", status: "In review" } });
  const request = app.state.datasets["olentra-admin-governance-approvals-v1"][0];
  app.run("seo.save", { id: page.id, patch: { title: "A newer about title", status: "Draft" } });
  assertRejectedWithoutChanges(app, "approval.decide", { id: request.id, decision: "approve" }, /not awaiting|changed after/i);
  assert.equal(app.state.datasets["olentra-admin-governance-approvals-v1"].find(row => row.id === request.id).status, "pending");
});

test("accepted invitations create exactly one member and matching demo auth account", () => {
  const app = workspace();
  const beforeMembers = app.state.datasets["admin-team-members"].length;
  const beforeAccounts = app.state.datasets["auth-accounts"].length;
  const invitation = app.run("team.invite", { email: "new.operations@example.com", name: "Operations Member", role: "Editor" });
  const member = app.run("team.invitation.accept", { id: invitation.id });
  assert.equal(app.state.datasets["admin-team-members"].length, beforeMembers + 1);
  assert.equal(app.state.datasets["auth-accounts"].length, beforeAccounts + 1);
  const account = app.state.datasets["auth-accounts"].find(row => row.id === member.id);
  assert.equal(account.email, member.email);
  assert.equal(account.role, member.role);
  assert.equal(account.enabled, true);
  assert.equal(account.passwordDigest, app.state.reference.core.authDemo.defaultPasswordDigest);
  assert.equal(Object.hasOwn(account, "password"), false);
  assertRejectedWithoutChanges(app, "team.invitation.accept", { id: invitation.id }, /pending/i);
  assertRejectedWithoutChanges(app, "team.invite", { email: invitation.email.toUpperCase(), role: "Editor" }, /already a team member/i);
  signIn(app, member.email);
  assert.equal(app.state.datasets["admin-team-members"].find(row => row.id === member.id).mfa, true);
  assert.equal(app.state.datasets["admin-team-members"].find(row => row.id === member.id).lastActiveAt, app.state.meta.clock);
});

test("role changes propagate to auth accounts and invalid permission dependencies are rejected", () => {
  const app = workspace();
  app.run("team.member.update", { id: "editor-02", patch: { role: "Analyst" } });
  assert.equal(app.state.datasets["auth-accounts"].find(row => row.id === "editor-02").role, "Analyst");
  const permissions = clone(app.state.datasets["admin-role-permissions-recruiter"]);
  permissions.find(row => row.name === "Website Controls").edit = true;
  assertRejectedWithoutChanges(app, "role.save", { roleId: "recruiter", permissions }, /view access/i);
  permissions.find(row => row.name === "Website Controls").view = true;
  app.run("role.save", { roleId: "recruiter", permissions });
  assert.equal(app.state.datasets["admin-role-permissions-recruiter"].find(row => row.name === "Website Controls").edit, true);
  assert.ok(app.state.datasets["admin-team-members"].filter(row => row.role === "Recruiter").every(row => row.access.includes("modules")));
  assert.equal(app.state.datasets["admin-role-reviews"].recruiter.reviewedAt, app.state.meta.clock);
});

test("a limited role cannot publish the website or bypass SEO publication permission", () => {
  const app = workspace();
  signIn(app, "analyst@example.com");
  assert.equal(can(app.state, "Analytics & SEO", "view"), true);
  assert.equal(can(app.state, "Website Controls", "publish"), false);
  const published = clone(app.state.datasets["published-features:Production"]);
  assertRejectedWithoutChanges(app, "features.publish", { environment: "Production", values: app.state.datasets["features:Production"] }, /role cannot/i);
  assertRejectedWithoutChanges(app, "seo.publish", { id: "services" }, /role cannot/i);
  assert.deepEqual(app.state.datasets["published-features:Production"], published);
});
