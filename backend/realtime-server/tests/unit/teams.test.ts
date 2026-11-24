import { expect, test } from "bun:test";
import { createTeams } from "../../src/modules/teams/teams.service";
import { authorizeStaff } from "../../src/modules/access/policy";

// ---- Minimal in-memory MongoDB for the calls the team service makes. ----
const get = (doc: any, path: string): any[] => {
  const [head, ...rest] = path.split(".");
  const value = doc?.[head!];
  if (!rest.length) return Array.isArray(value) ? [value, ...value] : [value];
  if (/^\d+$/.test(rest[0]!) && Array.isArray(value)) return [value[Number(rest[0])]];
  return (Array.isArray(value) ? value : [value]).flatMap(item => get(item, rest.join(".")));
};
const test1 = (values: any[], condition: any): boolean => {
  if (condition && typeof condition === "object" && !Array.isArray(condition)) {
    if ("$in" in condition) return values.some(v => condition.$in.includes(v));
    if ("$ne" in condition) return values.every(v => v !== condition.$ne);
    if ("$exists" in condition) return values.some(v => v !== undefined) === condition.$exists;
    if ("$regex" in condition) { const re = new RegExp(condition.$regex, condition.$options); return values.some(v => typeof v === "string" && re.test(v)); }
  }
  return values.some(v => v === condition);
};
const matches = (doc: any, filter: any = {}): boolean => Object.entries(filter).every(([key, condition]: [string, any]) =>
  key === "$or" ? condition.some((part: any) => matches(doc, part)) : test1(get(doc, key), condition));
const setPath = (doc: any, path: string, value: any) => {
  const parts = path.split("."); let target = doc;
  for (const part of parts.slice(0, -1)) target = target[part] ??= {};
  if (value === undefined) delete target[parts.at(-1)!]; else target[parts.at(-1)!] = value;
};
function memoryDb() {
  const tables = new Map<string, Map<string, any>>();
  const table = (name: string) => { if (!tables.has(name)) tables.set(name, new Map()); return tables.get(name)!; };
  const cursor = (rows: any[]) => {
    let list = rows;
    const api: any = {
      sort: (spec: any) => { const [[key, dir]] = Object.entries(spec) as any; list = [...list].sort((a, b) => String(a[key] ?? "").localeCompare(String(b[key] ?? "")) * dir); return api; },
      skip: (n: number) => { list = list.slice(n); return api; },
      limit: (n: number) => { list = list.slice(0, n); return api; },
      project: () => api,
      toArray: async () => structuredClone(list),
    };
    return api;
  };
  const apply = (doc: any, update: any) => {
    for (const [key, value] of Object.entries(update.$set || {})) setPath(doc, key, structuredClone(value));
    for (const key of Object.keys(update.$unset || {})) setPath(doc, key, undefined);
    for (const [key, value] of Object.entries(update.$inc || {})) setPath(doc, key, (get(doc, key)[0] || 0) + (value as number));
    for (const [key, value] of Object.entries(update.$addToSet || {}) as [string, any][]) {
      const list = doc[key] ??= []; for (const item of value?.$each ?? [value]) if (!list.includes(item)) list.push(item);
    }
    for (const [key, value] of Object.entries(update.$pull || {}) as [string, any][]) doc[key] = (doc[key] || []).filter((item: any) => value?.$in ? !value.$in.includes(item) : item !== value);
  };
  const collection = (name: string): any => {
    const rows = table(name), find = (filter: any) => [...rows.values()].filter(doc => matches(doc, filter));
    return {
      createIndex: async () => {},
      find: (filter: any) => cursor(find(filter)),
      findOne: async (filter: any) => structuredClone(find(filter)[0] ?? null),
      countDocuments: async (filter: any) => find(filter).length,
      insertOne: async (doc: any) => { if (rows.has(doc._id)) throw Object.assign(new Error("duplicate"), { code: 11000 }); rows.set(doc._id, structuredClone(doc)); },
      insertMany: async (docs: any[]) => { for (const doc of docs) if (rows.has(doc._id)) throw Object.assign(new Error("duplicate"), { code: 11000 }); for (const doc of docs) rows.set(doc._id, structuredClone(doc)); },
      updateOne: async (filter: any, update: any, options: any = {}) => { let doc = find(filter)[0]; if (!doc && options.upsert) { doc = { _id: filter._id }; rows.set(doc._id, doc); } if (doc) apply(doc, update); return { modifiedCount: doc ? 1 : 0 }; },
      updateMany: async (filter: any, update: any) => { const docs = find(filter); docs.forEach(doc => apply(doc, update)); return { modifiedCount: docs.length }; },
      deleteMany: async (filter: any) => { for (const doc of find(filter)) rows.delete(doc._id); },
      aggregate: (pipeline: any[]) => {
        let list = [...rows.values()];
        for (const stage of pipeline) {
          if (stage.$match) list = list.filter(doc => matches(doc, stage.$match));
          if (stage.$group) {
            const groups = new Map<any, any>(), field = String(stage.$group._id).slice(1);
            for (const doc of list) {
              const key = doc[field] ?? null, group = groups.get(key) ?? { _id: key };
              for (const [out, spec] of Object.entries(stage.$group) as [string, any][]) {
                if (out === "_id") continue;
                if (spec.$sum) group[out] = (group[out] || 0) + spec.$sum;
                if (spec.$push) (group[out] ??= []).push(doc[String(spec.$push).slice(1)]);
              }
              groups.set(key, group);
            }
            list = [...groups.values()];
          }
        }
        return { toArray: async () => structuredClone(list) };
      },
    };
  };
  return { collection, rows: (name: string) => table(name) };
}

const admin = { id: "admin", role: "company" as const, staffRole: "admin", name: "Admin", email: "a@example.test", applicationId: null, sessionVersion: 1 };
const manager = { ...admin, id: "mgr", staffRole: "manager", permissions: ["interns.read", "projects.read", "projects.manage"] };
const viewer = { ...admin, id: "view", staffRole: "mentor-like", permissions: ["interns.read", "projects.read"] };
const intern = { id: "acct", role: "intern" as const, name: "I", email: "i@example.test", applicationId: "A001", sessionVersion: 1 };

function setup(count = 52) {
  const db = memoryDb();
  for (let i = 1; i <= count; i++) {
    const appId = `A${String(i).padStart(3, "0")}`;
    void db.collection("applications").insertOne({ _id: appId, name: `Intern ${String(i).padStart(3, "0")}`, email: `${appId}@example.test`, college: ["IIT", "NIT"][i % 2], program: "Software Engineer Intern", githubAccount: i === 1 ? { login: "first-dev" } : undefined });
    void db.collection("interns").insertOne({ _id: `INT-${appId}`, applicationId: appId, batch: i <= 50 ? "Batch 1" : "Batch 2", status: "Active" });
  }
  void db.collection("projects").insertOne({ _id: "P1", name: "Orchestrator", team: ["A099"], links: [{ id: "L1", kind: "repository", url: "https://github.com/o/r", members: ["A001"], access: { A001: { status: "granted" } } }] });
  const teams = createTeams({ collection: db.collection, transact: async (_key, _actor, _input, fn) => fn({} as any) });
  let n = 0;
  const run = (method: string, params: any = {}, actor: any = admin) => teams.execute(method, params, actor, `k${++n}`);
  return { db, teams, run };
}

test("build teams for a batch: preview, then create exactly what was shown", async () => {
  const { run, db } = setup();
  expect(await run("team.settings")).toEqual({ size: 5, leftover: "smaller" });
  const plan: any = await run("team.plan", { batch: "Batch 1", leftover: "smaller", mix: "random", seed: 9 });
  expect(plan.total).toBe(50);
  expect(plan.teams).toHaveLength(10);
  expect(plan.teams.every((team: any) => team.members.length === 5)).toBe(true);
  const created: any = await run("team.createMany", { batch: "Batch 1", program: "Software Engineer Intern", teams: plan.teams.map((team: any) => ({ name: team.name, members: team.members.map((m: any) => m.id) })) });
  expect(created.created).toBe(10);
  expect(db.rows("team_memberships").size).toBe(50);
  expect((await run("team.unassigned", { batch: "Batch 1" }) as any).total).toBe(0);
  expect((await run("team.batches") as any).batches).toEqual([{ batch: "Batch 1", active: 50, unassigned: 0 }, { batch: "Batch 2", active: 2, unassigned: 2 }]);
  const next: any = await run("team.plan", { batch: "Batch 2", size: 5, leftover: "individual" });
  expect(next.teams).toHaveLength(0);
  expect(next.individuals).toHaveLength(2);
  const list: any = await run("team.list", { batch: "Batch 1" });
  expect(list.total).toBe(10);
  expect(list.counts).toEqual({ Active: 10 });
});

test("an intern can be in only one active team, and only active interns can join", async () => {
  const { run, db } = setup(12);
  await run("team.create", { name: "Orion", batch: "Batch 1", members: ["A001", "A002"] });
  await expect(run("team.create", { name: "Vega", batch: "Batch 1", members: ["A002", "A003"] })).rejects.toMatchObject({ code: "CONFLICT", message: expect.stringContaining("Intern 002 (Orion)") });
  await expect(run("team.create", { name: "orion", batch: "Batch 1", members: ["A004"] })).rejects.toMatchObject({ code: "CONFLICT" });
  await expect(run("team.createMany", { batch: "Batch 1", teams: [{ name: "X", members: ["A005"] }, { name: "Y", members: ["A005"] }] })).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  await db.collection("interns").updateOne({ _id: "INT-A006" }, { $set: { status: "Completed" } });
  await expect(run("team.create", { name: "Lyra", batch: "Batch 1", members: ["A006"] })).rejects.toMatchObject({ code: "CONFLICT", message: expect.stringContaining("Only active interns") });
  await expect(run("team.create", { name: "Big", batch: "Batch 1", members: Array.from({ length: 51 }, (_, i) => `B${i}`) })).rejects.toMatchObject({ code: "INVALID_REQUEST" });
});

test("assigning a project adds the team; removing members only removes who the team added", async () => {
  const { run, db } = setup(12);
  const { ids: [teamId] }: any = await run("team.create", { name: "Orion", batch: "Batch 1", members: ["A001", "A002", "A099"].filter(id => id !== "A099") });
  await run("team.addMembers", { id: teamId, members: ["A003"] });
  await run("team.assignProject", { id: teamId, projectId: "P1" });
  let project = db.rows("projects").get("P1");
  expect(project.team.sort()).toEqual(["A001", "A002", "A003", "A099"]);
  expect(project.teamSources).toEqual({ A001: teamId, A002: teamId, A003: teamId });
  expect(project.teamIds).toEqual([teamId]);
  // Joining later puts them on the team's projects too.
  await run("team.addMembers", { id: teamId, members: ["A004"] });
  expect(db.rows("projects").get("P1").team).toContain("A004");
  // Unfinished work blocks removal, with the task named.
  await db.collection("tasks").insertOne({ _id: "T1", projectId: "P1", applicationId: "A001", title: "API design", status: "In progress" });
  await expect(run("team.removeMember", { id: teamId, applicationId: "A001" })).rejects.toMatchObject({ code: "CONFLICT", message: expect.stringContaining("“API design”") });
  await db.collection("tasks").updateOne({ _id: "T1" }, { $set: { status: "Approved" } });
  await run("team.removeMember", { id: teamId, applicationId: "A001" });
  project = db.rows("projects").get("P1");
  expect(project.team).not.toContain("A001");
  expect(project.links[0].access).toEqual({});
  expect(project.links[0].visibleToInterns).toBe(false);
  expect(db.rows("team_memberships").has("A001")).toBe(false);
  // Someone added to the project directly stays when the team leaves.
  await run("team.unassignProject", { id: teamId, projectId: "P1" });
  expect(db.rows("projects").get("P1").team).toEqual(["A099"]);
  expect(db.rows("teams").get(teamId).projectIds).toEqual([]);
});

test("moving a member between teams carries them to the new team's projects", async () => {
  const { run, db } = setup(12);
  const { ids: [a] }: any = await run("team.create", { name: "Orion", batch: "Batch 1", members: ["A001", "A002"] });
  const { ids: [b] }: any = await run("team.create", { name: "Vega", batch: "Batch 1", members: ["A003"] });
  await run("team.assignProject", { id: b, projectId: "P1" });
  await run("team.update", { id: a, patch: { leadId: "A002" } });
  await run("team.moveMember", { id: a, toId: b, applicationId: "A002" });
  expect(db.rows("teams").get(a).members).toEqual(["A001"]);
  expect(db.rows("teams").get(a).leadId).toBeNull();
  expect(db.rows("teams").get(b).members).toEqual(["A003", "A002"]);
  expect(db.rows("projects").get("P1").team).toContain("A002");
  expect(db.rows("team_memberships").get("A002").teamId).toBe(b);
  await expect(run("team.update", { id: b, patch: { leadId: "A009" } })).rejects.toMatchObject({ code: "INVALID_REQUEST" });
});

test("archiving frees members; restoring checks they're still free", async () => {
  const { run } = setup(12);
  const { ids: [a] }: any = await run("team.create", { name: "Orion", batch: "Batch 1", members: ["A001"] });
  await run("team.archive", { id: a });
  await expect(run("team.addMembers", { id: a, members: ["A002"] })).rejects.toMatchObject({ code: "CONFLICT" });
  await run("team.create", { name: "Vega", batch: "Batch 1", members: ["A001"] });
  await expect(run("team.restore", { id: a })).rejects.toMatchObject({ code: "CONFLICT" });
  expect((await run("team.list", { status: "Archived" }) as any).total).toBe(1);
});

test("team size and leftover defaults are settings", async () => {
  const { run } = setup(30);
  await run("team.settings.save", { size: 10, leftover: "spread" });
  expect(await run("team.settings")).toEqual({ size: 10, leftover: "spread" });
  expect((await run("team.plan", { batch: "Batch 1" }) as any).teams.map((team: any) => team.members.length)).toEqual([10, 10, 10]);
  await expect(run("team.settings.save", { size: 0, leftover: "spread" })).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  await expect(run("team.settings.save", { size: 51, leftover: "spread" })).rejects.toMatchObject({ code: "INVALID_REQUEST" });
});

test("who may view and manage teams", async () => {
  const { run } = setup(5);
  expect((await run("team.list", {}, viewer) as any).total).toBe(0);
  await expect(run("team.create", { name: "X", batch: "Batch 1", members: [] }, viewer)).rejects.toMatchObject({ code: "FORBIDDEN" });
  await run("team.create", { name: "X", batch: "Batch 1", members: [] }, manager);
  await expect(run("team.list", {}, intern)).rejects.toMatchObject({ code: "FORBIDDEN" });
  expect(() => authorizeStaff("team.create", {}, viewer as any)).toThrow();
  expect(() => authorizeStaff("team.list", {}, viewer as any)).not.toThrow();
  expect(() => authorizeStaff("team.create", {}, manager as any)).not.toThrow();
  expect(() => authorizeStaff("team.list", {}, { ...viewer, permissions: ["overview.read"] } as any)).toThrow();
  expect(() => authorizeStaff("team.create", {}, { ...viewer, permissions: ["interns.read", "teams.read", "teams.manage"] } as any)).not.toThrow();
});

test("an intern sees their own team with names and GitHub usernames, never emails", async () => {
  const { run, teams } = setup(6);
  const { ids: [a] }: any = await run("team.create", { name: "Orion", batch: "Batch 1", members: ["A001", "A002"] });
  await run("team.update", { id: a, patch: { leadId: "A002" } });
  await run("team.assignProject", { id: a, projectId: "P1" });
  const mine: any = await teams.myTeam("A001");
  expect(mine).toMatchObject({ name: "Orion", leadId: "A002", projects: [{ id: "P1", name: "Orchestrator" }] });
  expect(mine.members.find((m: any) => m.id === "A001")).toMatchObject({ isYou: true, githubLogin: "first-dev" });
  expect(mine.members.find((m: any) => m.id === "A002").isLead).toBe(true);
  expect(JSON.stringify(mine)).not.toContain("@example.test");
  expect(await teams.myTeam("A005")).toBeNull();
});
