import assert from "node:assert/strict";
import test from "node:test";
import { invitationUrl, portalRepositoryAccess, repositoryAccess, safeReturnPath } from "../src/lib/intern/repository-access.mjs";

const repo = (myAccess, extra = {}) => ({ id: "L1", kind: "repository", label: "api", url: "https://github.com/olentra/api", automatic: true, myAccess, ...extra });

test("the intern's next step follows connect → accept → granted", () => {
  assert.equal(repositoryAccess({ links: [{ kind: "docs", url: "https://d.test" }], githubEnabled: true }).stage, "none");
  assert.equal(repositoryAccess({ links: [repo("pending")], githubEnabled: true }).stage, "connect");
  assert.equal(repositoryAccess({ links: [repo("pending")], githubAccount: { login: "asha" }, githubEnabled: true }).stage, "waiting");
  const accept = repositoryAccess({ links: [repo("invited")], githubAccount: { login: "asha" }, githubEnabled: true });
  assert.equal(accept.stage, "accept");
  assert.equal(accept.invite.acceptUrl, "https://github.com/olentra/api/invitations");
  assert.equal(repositoryAccess({ links: [repo("granted")], githubEnabled: true }).stage, "granted");
});

test("without automatic invites, connecting isn't required; the mentor adds the intern", () => {
  assert.equal(repositoryAccess({ links: [repo("pending", { automatic: false })], githubEnabled: true }).stage, "waiting");
  assert.equal(repositoryAccess({ links: [repo("pending")], githubEnabled: false }).stage, "waiting");
});

test("the dashboard shows the most urgent project", () => {
  const projects = [{ name: "A", links: [repo("granted")] }, { name: "B", links: [repo("pending")] }, { name: "C", links: [] }];
  const result = portalRepositoryAccess(projects, null, true);
  assert.equal(result.stage, "connect");
  assert.equal(result.project.name, "B");
  assert.equal(portalRepositoryAccess([], null, true).stage, "none");
});

test("only portal pages are accepted as places to return to after GitHub sign-in", () => {
  assert.equal(safeReturnPath("/intern/portal/projects/PRJ-1"), "/intern/portal/projects/PRJ-1");
  assert.equal(safeReturnPath("/intern/portal/profile#github"), "/intern/portal/profile#github");
  for (const bad of ["https://evil.test/intern/portal", "//evil.test", "/intern/dashboard", "/intern/portal/github/callback", null, ""]) assert.equal(safeReturnPath(bad), "");
  assert.equal(invitationUrl("https://gitlab.com/a/b"), null);
});
