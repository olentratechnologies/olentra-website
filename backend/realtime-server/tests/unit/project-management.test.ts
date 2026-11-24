import { expect, test } from "bun:test";
import { createLifecycle } from "../../src/modules/lifecycle/lifecycle.service";
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
    findOne: async (filter: any) => name === "programs" ? (["Software Engineer Intern"].includes(filter.name) ? { name: filter.name } : null) : project,
    updateOne: async (_filter: any, update: any) => { project = { ...project, ...update.$set }; },
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
