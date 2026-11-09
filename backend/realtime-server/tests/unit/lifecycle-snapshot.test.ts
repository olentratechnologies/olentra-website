import { expect, test } from "bun:test";
import { createLifecycle } from "./lifecycle";
import type { Principal } from "./domain";

const account = (staffRole: string, permissions: string[]): Principal => ({ id: staffRole, role: "company", staffRole, permissions, name: "Staff", email: "staff@example.test", applicationId: null, sessionVersion: 1 });

function fixture() {
  const calls: { name: string; projection?: Record<string, unknown> }[] = [];
  const collection = (name: string) => ({
    find(_filter: unknown, options?: { projection?: Record<string, unknown> }) {
      calls.push({ name, projection: options?.projection });
      const cursor = {
        limit() { return cursor; }, sort() { return cursor; },
        async toArray() {
          if (name !== "projects") return [];
          return options?.projection ? [{ _id: "project", name: "Example", status: "In progress", progress: 50 }] : [{ _id: "project", name: "Example", team: ["intern"], description: "Private detail" }];
        },
      };
      return cursor;
    },
  });
  return { calls, lifecycle: createLifecycle({ collection: collection as any, transact: (async () => { throw new Error("Unexpected write"); }) as any }) };
}

test("summary-only staff do not query private workflow records", async () => {
  const { calls, lifecycle } = fixture();
  const result = await lifecycle.snapshot(account("viewer", ["overview.read", "projects.summary"]));
  expect(calls.map(call => call.name)).toEqual(["projects"]);
  expect(calls[0]?.projection).toEqual({ _id: 1, name: 1, status: 1, progress: 1, dueOn: 1, program: 1 });
  expect(result.projects[0]).toEqual({ id: "project", name: "Example", status: "In progress", progress: 50 });
  expect(result.offers).toEqual([]); expect(result.onboarding).toEqual([]); expect(result.submissions).toEqual([]);
});

test("manager snapshot queries only authorized workflow collections", async () => {
  const { calls, lifecycle } = fixture();
  await lifecycle.snapshot(account("manager", ["interns.read", "projects.read", "tasks.read"]));
  expect(calls.map(call => call.name).sort()).toEqual(["interns", "projects", "tasks"]);
});
