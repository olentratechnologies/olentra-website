import { expect, test } from "bun:test";
import { createLifecycle, internLinks } from "../../src/modules/lifecycle/lifecycle.service";
import { authorizeStaff } from "../../src/modules/access/policy";
import type { Principal } from "../../src/shared/principal";

const admin: Principal = { id: "admin", role: "company", staffRole: "admin", name: "Admin", email: "admin@example.test", applicationId: null, sessionVersion: 1 };
function fixture() {
  let project: any = { _id: "p1", name: "Original project", description: "Original description", program: "Software Engineer Intern", team: ["intern1"], progress: 0, status: "In progress" };
  const writes: any[] = [];
  const session = {};
  const plans = new Map<string, any>();
  const collection = (name: string): any => name === "project_plans" ? {
    collectionName: "intern_project_plans",
    findOne: async (filter: any) => plans.get(filter._id) ?? null,
    insertOne: async (row: any) => { plans.set(row._id, row); },
    updateOne: async (filter: any, update: any) => { plans.set(filter._id, { _id: filter._id, ...plans.get(filter._id), ...update.$set }); },
    deleteOne: async (filter: any, options: any) => { expect(options.session).toBe(session); plans.delete(filter._id); writes.push({ name, filter }); },
  } : ({
    findOne: async (filter: any) => name === "programs" ? (["Software Engineer Intern"].includes(filter.name) ? { name: filter.name } : null) : name === "tasks" ? null : project,
    countDocuments: async (filter: any) => filter.applicationId.$in.length,
    updateMany: async () => {},
    updateOne: async (filter: any, update: any) => {
      const links = [...(project.links || [])];
      if (filter["links.19"] && links.length >= 20) return { modifiedCount: 0 };
      if (update.$push) { project = { ...project, links: [...links, update.$push.links] }; return { modifiedCount: 1 }; }
      if (update.$pull) { project = { ...project, links: links.filter((l: any) => l.id !== update.$pull.links.id) }; return { modifiedCount: 1 }; }
      const index = links.findIndex((l: any) => l.id === filter["links.id"]);
      for (const [key, value] of Object.entries(update.$set || {})) {
        if (key === "links.$") links[index] = value;
        else if (key.startsWith("links.$.access.")) links[index] = { ...links[index], access: { ...links[index].access, [key.slice(15)]: value } };
        else project = { ...project, [key]: value };
      }
      if (filter["links.id"]) project = { ...project, links };
      return { modifiedCount: 1 };
    },
    aggregate: (pipeline: any[]) => ({ toArray: async () => {
      const match = pipeline[0].$match;
      if (!project || match._id !== project._id || (match.team && !project.team.includes(match.team)) || (match.planHidden && project.planHidden === true)) return [];
      return [{ _id: project._id, planHidden: project.planHidden, plan: plans.get(project._id) }];
    } }),
    findOneAndUpdate: async (_filter: any, update: any, options: any) => { expect(options.session).toBe(session); project = { ...project, ...update.$set }; return project; },
    findOneAndDelete: async (_filter: any, options: any) => { expect(options.session).toBe(session); const value = project; project = null; return value; },
    find: () => ({ project: () => ({ toArray: async () => name === "tasks" ? [{ _id: "t1", applicationId: "intern1" }] : [] }) }),
    deleteMany: async (filter: any, options: any) => { expect(options.session).toBe(session); writes.push({ name, filter }); },
    insertOne: async (row: any, options: any) => { expect(options.session).toBe(session); writes.push({ name, row }); },
    insertMany: async () => {},
  });
  const lifecycle = createLifecycle({ collection, transact: async (_key, _actor, _input, fn) => fn(session as any), outbox: { enqueue: async () => {}, enqueueMany: async () => {} } as any });
  return { lifecycle, writes, plans, project: () => project };
}

test("project edits persist all editable fields and allow switching tracks in both directions", async () => {
  const { lifecycle } = fixture();
  for (const program of ["Software Engineer Intern"]) {
    const patch = { name: "Updated project", description: "Updated project description", program, dueOn: "2026-12-20", status: "In review", progress: 55 };
    const result: any = await lifecycle.execute("project.update", { id: "p1", patch }, admin, "edit");
    for (const [key, value] of Object.entries(patch)) expect(result[key]).toEqual(value);
  }
});

test("project edits reject unknown tracks and invalid status", async () => {
  for (const patch of [{ program: "Unknown" }, { status: "invalid" }, { dueOn: "2026-02-30" }]) {
    await expect(fixture().lifecycle.execute("project.update", { id: "p1", patch }, admin, "edit")).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  }
});

test("deletion removes only the project's tasks and their submissions and records an audit event", async () => {
  const { lifecycle, writes } = fixture();
  expect(lifecycle.supports("project.delete")).toBe(true);
  const result = await lifecycle.execute("project.delete", { id: "p1" }, admin, "delete");
  expect(result).toEqual({ id: "p1", affectedApplications: ["intern1"] });
  expect(writes).toContainEqual({ name: "tasks", filter: { projectId: "p1" } });
  expect(writes).toContainEqual({ name: "submissions", filter: { taskId: { $in: ["t1"] } } });
  expect(writes.find(w => w.name === "staff_audit").row.action).toBe("project.deleted");
  expect(writes.find(w => w.name === "events").row.type).toBe("project.delete");
  await expect(lifecycle.execute("project.delete", { id: "p1" }, admin, "again")).rejects.toMatchObject({ code: "NOT_FOUND" });
});

test("deletion requires project management permissions and rejects interns", async () => {
  expect(() => authorizeStaff("project.delete", {}, { ...admin, staffRole: "recruiter", permissions: ["projects.read"] })).toThrow();
  expect(() => authorizeStaff("project.delete", {}, { ...admin, staffRole: "recruiter", permissions: ["projects.read", "projects.manage"] })).not.toThrow();
  await expect(fixture().lifecycle.execute("project.delete", { id: "p1" }, { ...admin, role: "intern" }, "delete")).rejects.toMatchObject({ code: "FORBIDDEN" });
});

const intern = (applicationId: string): Principal => ({ ...admin, id: applicationId, role: "intern", staffRole: undefined as any, applicationId });

test("project plans save with revision checks and survive description edits", async () => {
  const { lifecycle, project } = fixture();
  const markdown = "# Plan\n\n- Phase 1\n  - nested **item**\n";
  expect(await lifecycle.execute("project.plan.get", { projectId: "p1" }, admin, "get")).toEqual({ markdown: "", revision: 0, visibleToInterns: true });
  expect(await lifecycle.execute("project.plan.save", { projectId: "p1", markdown, revision: 0 }, admin, "save1")).toMatchObject({ revision: 1 });
  expect(project().hasPlan).toBe(true);
  await expect(lifecycle.execute("project.plan.save", { projectId: "p1", markdown: "stale", revision: 0 }, admin, "save2")).rejects.toMatchObject({ code: "CONFLICT" });
  await lifecycle.execute("project.update", { id: "p1", patch: { description: "A shorter summary" } }, admin, "edit");
  expect(await lifecycle.execute("project.plan.get", { projectId: "p1" }, admin, "get")).toEqual({ markdown, revision: 1, visibleToInterns: true });
  expect(project().hasPlan).toBe(true);
  await expect(lifecycle.execute("project.plan.save", { projectId: "p1", markdown: "x".repeat(100_001), revision: 1 }, admin, "big")).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  expect(await lifecycle.execute("project.plan.save", { projectId: "p1", markdown: "x".repeat(100_000), revision: 1 }, admin, "max")).toMatchObject({ revision: 2 });
});

test("project plans are readable only by full-access staff and the project's interns", async () => {
  const { lifecycle } = fixture();
  await lifecycle.execute("project.plan.save", { projectId: "p1", markdown: "# Plan", revision: 0 }, admin, "save");
  expect(await lifecycle.execute("project.plan.get", { projectId: "p1" }, intern("intern1"), "get")).toMatchObject({ markdown: "# Plan" });
  await expect(lifecycle.execute("project.plan.get", { projectId: "p1" }, intern("intern2"), "get")).rejects.toMatchObject({ code: "NOT_FOUND" });
  await expect(lifecycle.execute("project.plan.save", { projectId: "p1", markdown: "x", revision: 1 }, intern("intern1"), "save")).rejects.toMatchObject({ code: "FORBIDDEN" });
  const summaryOnly = { ...admin, staffRole: "viewer", permissions: ["overview.read", "projects.summary"] };
  expect(() => authorizeStaff("project.plan.get", { projectId: "p1" }, summaryOnly)).toThrow();
  await expect(lifecycle.execute("project.plan.get", { projectId: "p1" }, summaryOnly as any, "get")).rejects.toMatchObject({ code: "FORBIDDEN" });
  const reader = { ...admin, staffRole: "mentor", permissions: ["projects.summary", "projects.read", "interns.read"] };
  expect(() => authorizeStaff("project.plan.get", { projectId: "p1" }, reader)).not.toThrow();
  expect(() => authorizeStaff("project.plan.save", { projectId: "p1" }, reader)).toThrow();
});

test("deleting a project removes its plan", async () => {
  const { lifecycle, writes, plans } = fixture();
  await lifecycle.execute("project.plan.save", { projectId: "p1", markdown: "# Plan", revision: 0 }, admin, "save");
  await lifecycle.execute("project.delete", { id: "p1" }, admin, "delete");
  expect(plans.has("p1")).toBe(false);
  expect(writes).toContainEqual({ name: "project_plans", filter: { _id: "p1" } });
});

test("managers can hide a plan from interns without hiding it from staff", async () => {
  const { lifecycle, project } = fixture();
  await lifecycle.execute("project.plan.save", { projectId: "p1", markdown: "# Plan", revision: 0 }, admin, "save1");
  expect(await lifecycle.execute("project.plan.get", { projectId: "p1" }, admin, "get")).toMatchObject({ visibleToInterns: true });
  await lifecycle.execute("project.plan.save", { projectId: "p1", markdown: "# Plan", revision: 1, visibleToInterns: false }, admin, "save2");
  expect(project().planHidden).toBe(true);
  expect(await lifecycle.execute("project.plan.get", { projectId: "p1" }, admin, "get")).toMatchObject({ markdown: "# Plan", visibleToInterns: false });
  await expect(lifecycle.execute("project.plan.get", { projectId: "p1" }, intern("intern1"), "get")).rejects.toMatchObject({ code: "NOT_FOUND" });
  await lifecycle.execute("project.plan.save", { projectId: "p1", markdown: "# Plan", revision: 2 }, admin, "save3");
  expect(project().planHidden).toBe(true);
  await lifecycle.execute("project.plan.save", { projectId: "p1", markdown: "# Plan", revision: 3, visibleToInterns: true }, admin, "save4");
  const read: any = await lifecycle.execute("project.plan.get", { projectId: "p1" }, intern("intern1"), "get");
  expect(read.markdown).toBe("# Plan");
  expect(read.visibleToInterns).toBeUndefined();
  await expect(lifecycle.execute("project.plan.save", { projectId: "p1", markdown: "# Plan", revision: 4, visibleToInterns: "no" }, admin, "bad")).rejects.toMatchObject({ code: "INVALID_REQUEST" });
});

const repo = { kind: "repository", label: "API repository", url: "https://github.com/olentra/api", note: "main branch" };

test("managers add, edit and delete project links", async () => {
  const { lifecycle, project, writes } = fixture();
  const added: any = await lifecycle.execute("project.link.save", { projectId: "p1", link: repo }, admin, "add");
  expect(added.link).toMatchObject({ ...repo, visibleToInterns: true, access: {} });
  expect(added.link.id).toMatch(/^LNK-/);
  expect(added.affectedApplications).toEqual(["intern1"]);
  await lifecycle.execute("project.link.access", { projectId: "p1", linkId: added.link.id, applicationId: "intern1", status: "granted" }, admin, "grant");
  const edited: any = await lifecycle.execute("project.link.save", { projectId: "p1", link: { ...repo, id: added.link.id, label: "Backend repo" } }, admin, "edit");
  expect(edited.link.label).toBe("Backend repo");
  expect(edited.link.access.intern1.status).toBe("granted");
  expect(project().links).toHaveLength(1);
  await lifecycle.execute("project.link.delete", { projectId: "p1", linkId: added.link.id }, admin, "delete");
  expect(project().links).toEqual([]);
  expect(writes.filter(w => w.name === "staff_audit").map(w => w.row.action)).toEqual(["project.link.added", "project.link.access", "project.link.updated", "project.link.deleted"]);
  await expect(lifecycle.execute("project.link.save", { projectId: "p1", link: { ...repo, id: added.link.id } }, admin, "stale")).rejects.toMatchObject({ code: "NOT_FOUND" });
});

test("project links reject bad URLs, credentials and overflow", async () => {
  const { lifecycle } = fixture();
  for (const link of [{ ...repo, url: "javascript:alert(1)" }, { ...repo, url: "not a url" }, { ...repo, url: "https://user:token@github.com/x" }, { ...repo, label: "" }, { ...repo, kind: "secret" }, { ...repo, note: "x".repeat(501) }, { ...repo, visibleToInterns: "yes" }]) {
    await expect(lifecycle.execute("project.link.save", { projectId: "p1", link }, admin, "bad")).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  }
  for (let i = 0; i < 20; i++) await lifecycle.execute("project.link.save", { projectId: "p1", link: { ...repo, label: `Link ${i}` } }, admin, `add${i}`);
  await expect(lifecycle.execute("project.link.save", { projectId: "p1", link: repo }, admin, "21")).rejects.toMatchObject({ code: "INVALID_REQUEST" });
});

test("repository access is tracked per team member and only for repositories", async () => {
  const { lifecycle, project } = fixture();
  const { link }: any = await lifecycle.execute("project.link.save", { projectId: "p1", link: repo }, admin, "add");
  const { link: docs }: any = await lifecycle.execute("project.link.save", { projectId: "p1", link: { kind: "docs", label: "Docs", url: "https://docs.example.test" } }, admin, "docs");
  await expect(lifecycle.execute("project.link.access", { projectId: "p1", linkId: link.id, applicationId: "intern2", status: "granted" }, admin, "x")).rejects.toMatchObject({ code: "CONFLICT" });
  await expect(lifecycle.execute("project.link.access", { projectId: "p1", linkId: docs.id, applicationId: "intern1", status: "granted" }, admin, "x")).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  await expect(lifecycle.execute("project.link.access", { projectId: "p1", linkId: link.id, applicationId: "intern1", status: "done" }, admin, "x")).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  const result: any = await lifecycle.execute("project.link.access", { projectId: "p1", linkId: link.id, applicationId: "intern1", status: "granted" }, admin, "grant");
  expect(result).toMatchObject({ status: "granted", affectedApplications: ["intern1"] });
  expect(project().links[0].access.intern1).toMatchObject({ status: "granted", updatedBy: "admin" });
});

test("interns see only visible links and their own repository access", () => {
  const links = [
    { id: "LNK-1", kind: "repository", label: "Repo", url: "https://github.com/x", visibleToInterns: true, access: { intern1: { status: "granted" }, intern2: { status: "pending" } } },
    { id: "LNK-2", kind: "board", label: "Admin board", url: "https://board.test", visibleToInterns: false },
    { id: "LNK-3", kind: "docs", label: "Docs", url: "https://docs.test", visibleToInterns: true },
  ];
  expect(internLinks(links, "intern1")).toEqual([
    { id: "LNK-1", kind: "repository", label: "Repo", url: "https://github.com/x", visibleToInterns: true, myAccess: "granted" },
    { id: "LNK-3", kind: "docs", label: "Docs", url: "https://docs.test", visibleToInterns: true },
  ]);
  expect(internLinks(links, "intern2")[0]).toMatchObject({ myAccess: "pending" });
  expect(internLinks(links, "intern3")[0]).toMatchObject({ myAccess: "pending" });
  expect(JSON.stringify(internLinks(links, "intern1"))).not.toContain("intern2");
  expect(internLinks(undefined, "intern1")).toEqual([]);
});

test("only project managers can change links, and interns cannot", async () => {
  const reader = { ...admin, staffRole: "mentor", permissions: ["projects.summary", "projects.read", "interns.read"] };
  const summaryOnly = { ...admin, staffRole: "viewer", permissions: ["projects.summary"] };
  for (const method of ["project.link.save", "project.link.delete", "project.link.access"]) {
    expect(() => authorizeStaff(method, {}, reader)).toThrow();
    expect(() => authorizeStaff(method, {}, summaryOnly)).toThrow();
    expect(() => authorizeStaff(method, {}, { ...admin, staffRole: "manager", permissions: ["projects.read", "projects.manage"] })).not.toThrow();
    await expect(fixture().lifecycle.execute(method, { projectId: "p1", link: repo, linkId: "LNK-x" }, intern("intern1"), "x")).rejects.toMatchObject({ code: "FORBIDDEN" });
  }
});

test("removing an intern from the team clears their repository access", async () => {
  const { lifecycle, project } = fixture();
  const { link }: any = await lifecycle.execute("project.link.save", { projectId: "p1", link: repo }, admin, "add");
  await lifecycle.execute("project.link.access", { projectId: "p1", linkId: link.id, applicationId: "intern1", status: "granted" }, admin, "grant");
  await lifecycle.execute("project.update", { id: "p1", patch: { team: [] } }, admin, "remove");
  expect(project().team).toEqual([]);
  expect(project().links[0].access).toEqual({});
  expect(project().links[0].label).toBe(repo.label);
});
