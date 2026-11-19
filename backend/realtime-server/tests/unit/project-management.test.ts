import { expect, test } from "bun:test";
import { createLifecycle } from "../../src/modules/lifecycle/lifecycle.service";
import { authorizeStaff } from "../../src/modules/access/policy";
import type { Principal } from "../../src/shared/principal";

const admin: Principal = { id: "admin", role: "company", staffRole: "admin", name: "Admin", email: "admin@example.test", applicationId: null, sessionVersion: 1 };
function fixture() {
  let project: any = { _id: "p1", name: "Original project", description: "Original description", program: "Tech Explorer", team: ["intern1"], progress: 0, status: "In progress" };
  const writes: any[] = [];
  const session = {};
  const collection = (name: string): any => ({
    findOne: async (filter: any) => name === "programs" ? (["Tech Explorer", "Tech Innovator"].includes(filter.name) ? { name: filter.name } : null) : project,
    findOneAndUpdate: async (_filter: any, update: any, options: any) => { expect(options.session).toBe(session); project = { ...project, ...update.$set }; return project; },
    findOneAndDelete: async (_filter: any, options: any) => { expect(options.session).toBe(session); const value = project; project = null; return value; },
    find: () => ({ project: () => ({ toArray: async () => name === "tasks" ? [{ _id: "t1", applicationId: "intern1" }] : [] }) }),
    deleteMany: async (filter: any, options: any) => { expect(options.session).toBe(session); writes.push({ name, filter }); },
    insertOne: async (row: any, options: any) => { expect(options.session).toBe(session); writes.push({ name, row }); },
    insertMany: async () => {},
  });
  const lifecycle = createLifecycle({ collection, transact: async (_key, _actor, _input, fn) => fn(session as any), outbox: { enqueue: async () => {}, enqueueMany: async () => {} } as any });
  return { lifecycle, writes };
}

test("project edits persist all editable fields and allow switching tracks in both directions", async () => {
  const { lifecycle } = fixture();
  for (const program of ["Tech Innovator", "Tech Explorer"]) {
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
