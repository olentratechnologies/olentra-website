import { expect, test } from "bun:test";
import { generateKeyPairSync, createVerify } from "node:crypto";
import { createGithubAccess, MAX_REVOCATIONS_PER_RUN } from "../../src/modules/github/github-access";
import { createGithubApp, parseGithubRepo, readGithubConfig } from "../../src/modules/github/github-app";
import { internLinks } from "../../src/modules/lifecycle/lifecycle.service";

// ---- A small in-memory stand-in for the MongoDB calls the module makes. ----
const get = (doc: any, path: string): any[] => {
  const [head, ...rest] = path.split(".");
  const value = doc?.[head!];
  if (!rest.length) return Array.isArray(value) ? [value, ...value] : [value];
  return (Array.isArray(value) ? value : [value]).flatMap(item => get(item, rest.join(".")));
};
const matches = (doc: any, filter: any): boolean => Object.entries(filter || {}).every(([key, condition]: [string, any]) => {
  const values = get(doc, key);
  if (condition && typeof condition === "object" && !Array.isArray(condition) && !(condition instanceof Date)) {
    if ("$in" in condition) return values.some(v => condition.$in.includes(v));
    if ("$exists" in condition) return values.some(v => v !== undefined) === condition.$exists;
    if ("$ne" in condition) return values.every(v => v !== condition.$ne);
  }
  return values.some(v => v === condition);
});
function setPath(doc: any, path: string, value: any, filters: any[] = []) {
  const parts = path.split(".");
  let target = doc;
  for (const [i, part] of parts.entries()) {
    const last = i === parts.length - 1;
    const filtered = /^\$\[(\w+)\]$/.exec(part);
    if (filtered) {
      const name = filtered[1]!, filter = filters.find(f => Object.keys(f)[0]!.startsWith(`${name}.`));
      const [field, wanted] = Object.entries(filter)[0] as [string, any];
      const items = target.filter((item: any) => item[field.slice(name.length + 1)] === wanted);
      for (const item of items) setPath(item, parts.slice(i + 1).join("."), value, filters);
      return;
    }
    if (last) { if (value === undefined) delete target[part]; else target[part] = value; return; }
    target[part] ??= {};
    target = target[part];
  }
}
function fakeDb() {
  const tables = new Map<string, Map<string, any>>();
  const writes: { name: string; op: string; args: any[] }[] = [];
  const collection = (name: string): any => {
    if (!tables.has(name)) tables.set(name, new Map());
    const rows = tables.get(name)!;
    const find = (filter: any) => [...rows.values()].filter(doc => matches(doc, filter));
    const update = (doc: any, update: any, options: any = {}) => {
      for (const [key, value] of Object.entries(update.$set || {})) setPath(doc, key, structuredClone(value), options.arrayFilters);
      for (const key of Object.keys(update.$unset || {})) setPath(doc, key, undefined);
    };
    return {
      collectionName: name,
      createIndex: async () => {},
      find: (filter: any) => ({ toArray: async () => structuredClone(find(filter)) }),
      findOne: async (filter: any) => structuredClone(find(filter)[0] ?? null),
      insertOne: async (doc: any) => { rows.set(doc._id, structuredClone(doc)); },
      insertMany: async (docs: any[]) => { for (const doc of docs) rows.set(doc._id, structuredClone(doc)); writes.push({ name, op: "insertMany", args: [docs] }); },
      findOneAndDelete: async (filter: any) => { const doc = find(filter)[0]; if (doc) rows.delete(doc._id); return doc ?? null; },
      deleteOne: async (filter: any) => { const doc = find(filter)[0]; if (doc) rows.delete(doc._id); },
      updateOne: async (filter: any, change: any, options: any = {}) => {
        writes.push({ name, op: "updateOne", args: [filter, change, options] });
        let doc = find(filter)[0];
        if (!doc && options.upsert) { doc = { _id: filter._id }; rows.set(doc._id, doc); }
        if (doc) update(doc, change, options);
        return { modifiedCount: doc ? 1 : 0 };
      },
      updateMany: async (filter: any, change: any) => { const docs = find(filter); for (const doc of docs) update(doc, change); return { modifiedCount: docs.length }; },
    };
  };
  return { collection, rows: (name: string) => tables.get(name) ?? new Map(), writes };
}

// ---- A fake GitHub that records what it was asked to do. ----
function fakeGithub({ installed = ["olentra/api"], collaborators = [] as string[] } = {}) {
  const members = new Set(collaborators), invites = new Map<number, string>();
  const calls: string[] = [];
  let next = 100;
  const key = (owner: string, repo: string, login: string) => `${owner}/${repo}:${login.toLowerCase()}`;
  return {
    calls, members, invites,
    accept(owner: string, repo: string, login: string) { members.add(key(owner, repo, login)); },
    app: {
      config: { slug: "olentra-intern-access" } as any,
      resetCache() {},
      installed: async (owner: string, repo: string) => installed.includes(`${owner}/${repo}`),
      isCollaborator: async (owner: string, repo: string, login: string) => members.has(key(owner, repo, login)),
      invite: async (owner: string, repo: string, login: string) => { calls.push(`invite ${owner}/${repo} ${login}`); const id = next++; invites.set(id, key(owner, repo, login)); return id; },
      cancelInvite: async (owner: string, repo: string, id: number) => { calls.push(`cancel ${owner}/${repo} ${id}`); invites.delete(id); },
      removeCollaborator: async (owner: string, repo: string, login: string) => { calls.push(`remove ${owner}/${repo} ${login}`); members.delete(key(owner, repo, login)); },
      authorizeUrl: (state: string) => `https://github.com/login/oauth/authorize?state=${state}`,
      verifyUser: async (code: string) => code === "good" ? { id: 42, login: "asha-dev" } : code === "other" ? { id: 7, login: "dev-p" } : Promise.reject(new Error("bad")),
    } as any,
  };
}

const intern = (applicationId: string) => ({ id: `acct-${applicationId}`, role: "intern" as const, name: "Intern", email: "i@example.test", applicationId, sessionVersion: 1 });
const manager = { id: "m1", role: "company" as const, staffRole: "manager", permissions: ["projects.read", "projects.manage"], name: "M", email: "m@example.test", applicationId: null, sessionVersion: 1 };

function setup({ github = fakeGithub(), team = ["a1"], repoUrl = "https://github.com/Olentra/API" } = {}) {
  const db = fakeDb();
  let clock = Date.parse("2026-11-24T10:00:00Z");
  const logs: string[] = [];
  const access = createGithubAccess({ collection: db.collection, github: github.app, now: () => clock, logger: { warn: m => logs.push(m), error: m => logs.push(m) } });
  const projects = db.collection("projects"), applications = db.collection("applications"), interns = db.collection("interns");
  void projects.insertOne({ _id: "p1", name: "Orchestrator", team, links: [{ id: "LNK-1", kind: "repository", label: "API", url: repoUrl, access: {} }, { id: "LNK-2", kind: "docs", label: "Docs", url: "https://docs.test" }] });
  for (const id of ["a1", "a2"]) {
    void applications.insertOne({ _id: id, name: id });
    void interns.insertOne({ _id: `INT-${id}`, applicationId: id, status: "Active" });
  }
  const connect = (id: string, login: string, githubId: number) => applications.updateOne({ _id: id }, { $set: { githubAccount: { id: githubId, login } } });
  return { db, access, github, logs, connect, advance: (ms: number) => { clock += ms; }, project: () => db.rows("projects").get("p1") };
}

test("parses only github.com repository URLs", () => {
  expect(parseGithubRepo("https://github.com/Olentra/API.git")).toEqual({ owner: "olentra", repo: "api" });
  expect(parseGithubRepo("https://github.com/olentra/api/tree/dev")).toEqual({ owner: "olentra", repo: "api" });
  for (const url of ["http://github.com/a/b", "https://gitlab.com/a/b", "https://github.com/a", "https://evil.com/github.com/a/b", "not a url", null]) expect(parseGithubRepo(url)).toBeNull();
});

test("the feature stays off until every GitHub setting is present", () => {
  expect(readGithubConfig({ GITHUB_APP_ID: "1" } as any)).toBeNull();
  const config = readGithubConfig({ GITHUB_APP_ID: "1", GITHUB_APP_SLUG: "s", GITHUB_APP_CLIENT_ID: "c", GITHUB_APP_CLIENT_SECRET: "x", GITHUB_APP_PRIVATE_KEY: "line1\\nline2", INTERNSHIP_SITE_ORIGIN: "https://www.olentratechnologies.com/" } as any);
  expect(config).toMatchObject({ privateKey: "line1\nline2", callbackUrl: "https://www.olentratechnologies.com/intern/portal/github/callback" });
});

test("invites a connected team member, then marks access granted once they accept", async () => {
  const { access, github, connect, project, db } = setup();
  expect(await access.reconcile()).toMatchObject({ invited: 0 });
  expect(github.calls).toEqual([]);
  await connect("a1", "asha-dev", 42);
  expect(await access.reconcile()).toMatchObject({ invited: 1 });
  expect(github.calls).toEqual(["invite olentra/api asha-dev"]);
  expect(project().links[0].access.a1).toMatchObject({ status: "invited", source: "github", login: "asha-dev" });
  expect(project().links[0].github).toEqual({ installed: true });
  expect(project().links[1].access).toBeUndefined();

  await access.reconcile();
  expect(github.calls).toHaveLength(1);
  github.accept("olentra", "api", "asha-dev");
  expect(await access.reconcile()).toMatchObject({ granted: 1 });
  expect(project().links[0].access.a1).toMatchObject({ status: "granted", source: "github" });
  const [notice] = [...db.rows("notifications").values()];
  expect(notice).toMatchObject({ applicationId: "a1", title: "Repository access granted" });
  const projectWrites = db.writes.filter(w => w.name === "projects").length;
  await access.reconcile();
  expect(db.writes.filter(w => w.name === "projects").length).toBe(projectWrites);
});

test("interns see invited and granted states, never other interns' access", () => {
  const links = [{ id: "L", kind: "repository", url: "https://github.com/o/r", github: { installed: true }, access: { a1: { status: "invited", source: "github" }, a2: { status: "granted" } } }];
  expect(internLinks(links, "a1")[0]).toMatchObject({ myAccess: "invited", automatic: true });
  expect(internLinks(links, "a2")[0]).toMatchObject({ myAccess: "granted" });
  expect(JSON.stringify(internLinks(links, "a1"))).not.toContain("a2");
});

test("removing an intern from the team, finishing, or disconnecting takes access away", async () => {
  const { access, github, connect, db } = setup({ team: ["a1", "a2"] });
  await connect("a1", "asha-dev", 42); await connect("a2", "dev-p", 7);
  await access.reconcile();
  github.accept("olentra", "api", "asha-dev");
  await access.reconcile();
  await db.collection("projects").updateOne({ _id: "p1" }, { $set: { team: [] } });
  await access.reconcile();
  expect(github.calls).toContain("remove olentra/api asha-dev");
  expect(github.calls.some(call => call.startsWith("cancel olentra/api"))).toBe(true);
  expect(db.rows("github_grants").size).toBe(0);

  const second = setup();
  await second.connect("a1", "asha-dev", 42);
  await second.access.reconcile();
  await second.db.collection("interns").updateOne({ _id: "INT-a1" }, { $set: { status: "Completed" } });
  await second.access.reconcile();
  expect(second.github.calls).toEqual(["invite olentra/api asha-dev", "cancel olentra/api 100"]);
  expect(second.project().links[0].access.a1).toMatchObject({ status: "pending" });
});

test("people who already had access are never removed", async () => {
  const github = fakeGithub({ collaborators: ["olentra/api:asha-dev"] });
  const { access, connect, db } = setup({ github });
  await connect("a1", "asha-dev", 42);
  await access.reconcile();
  expect(github.calls).toEqual([]);
  expect(db.rows("github_grants").get("olentra/api#a1").status).toBe("preexisting");
  await db.collection("projects").updateOne({ _id: "p1" }, { $set: { team: [] } });
  await access.reconcile();
  expect(github.calls).toEqual([]);
  expect(github.members.has("olentra/api:asha-dev")).toBe(true);
});

test("repositories without the app, or not on GitHub, are left to manual tracking", async () => {
  for (const repoUrl of ["https://github.com/someone-else/repo", "https://gitlab.com/olentra/api"]) {
    const { access, github, connect, project } = setup({ repoUrl });
    await connect("a1", "asha-dev", 42);
    await access.reconcile();
    expect(github.calls).toEqual([]);
    expect(project().links[0].access.a1).toBeUndefined();
  }
  const { access, connect, project } = setup({ repoUrl: "https://github.com/someone-else/repo" });
  await connect("a1", "asha-dev", 42);
  await access.reconcile();
  expect(project().links[0].github).toEqual({ installed: false });
});

test("expired invites are sent again, and staff can resend sooner", async () => {
  const { access, github, connect, advance } = setup();
  await connect("a1", "asha-dev", 42);
  await access.reconcile();
  advance(8 * 86_400_000);
  await access.reconcile();
  expect(github.calls.filter(call => call.startsWith("invite"))).toHaveLength(2);
  await access.execute("github.resend", { projectId: "p1", applicationId: "a1" }, manager);
  await access.reconcile();
  expect(github.calls.filter(call => call.startsWith("invite"))).toHaveLength(3);
  await expect(access.execute("github.resend", { projectId: "p1", applicationId: "a1" }, intern("a1"))).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(access.execute("github.resend", { projectId: "p1", applicationId: "a9" }, manager)).rejects.toMatchObject({ code: "NOT_FOUND" });
});

test("a large unexpected drop in access is not applied", async () => {
  const github = fakeGithub();
  const { access, db, logs } = setup({ github });
  const grants = db.collection("github_grants");
  for (let i = 0; i <= MAX_REVOCATIONS_PER_RUN; i++) await grants.insertOne({ _id: `olentra/api#x${i}`, owner: "olentra", repo: "api", applicationId: `x${i}`, login: `u${i}`, githubUserId: i, status: "granted" });
  await access.reconcile();
  expect(github.calls).toEqual([]);
  expect(db.rows("github_grants").size).toBe(MAX_REVOCATIONS_PER_RUN + 1);
  expect(logs.some(line => line.includes("too many removals"))).toBe(true);
});

test("connecting GitHub verifies the sign-in belongs to this intern", async () => {
  const { access, db } = setup();
  const { url } = await access.execute("github.connectUrl", {}, intern("a1")) as { url: string };
  const state = new URL(url).searchParams.get("state")!;
  await expect(access.execute("github.connect", { code: "good", state }, intern("a2"))).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  // The state is single-use, even after a mismatch.
  await expect(access.execute("github.connect", { code: "good", state }, intern("a1"))).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  const fresh = new URL((await access.execute("github.connectUrl", {}, intern("a1")) as { url: string }).url).searchParams.get("state")!;
  expect(await access.execute("github.connect", { code: "good", state: fresh }, intern("a1"))).toMatchObject({ login: "asha-dev" });
  expect(db.rows("applications").get("a1")).toMatchObject({ githubAccount: { id: 42, login: "asha-dev" }, github: "https://github.com/asha-dev" });

  const other = new URL((await access.execute("github.connectUrl", {}, intern("a2")) as { url: string }).url).searchParams.get("state")!;
  await expect(access.execute("github.connect", { code: "good", state: other }, intern("a2"))).rejects.toMatchObject({ code: "CONFLICT" });
  const bad = new URL((await access.execute("github.connectUrl", {}, intern("a2")) as { url: string }).url).searchParams.get("state")!;
  await expect(access.execute("github.connect", { code: "nope", state: bad }, intern("a2"))).rejects.toMatchObject({ code: "INVALID_REQUEST" });

  await access.execute("github.disconnect", {}, intern("a1"));
  expect(db.rows("applications").get("a1").githubAccount).toBeUndefined();
  await expect(access.execute("github.connectUrl", {}, manager)).rejects.toMatchObject({ code: "FORBIDDEN" });
});

test("connect fails with a clear message when GitHub isn't set up", async () => {
  const db = fakeDb();
  const access = createGithubAccess({ collection: db.collection, github: null });
  expect(access.enabled).toBe(false);
  await expect(access.execute("github.connectUrl", {}, intern("a1"))).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
  await expect(access.execute("github.repositories", {}, manager)).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE", message: expect.stringContaining("Paste the repository link") });
  expect(await access.reconcile()).toEqual({ skipped: true });
});

test("the GitHub client signs as the app and sends the invite with an installation token", async () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const requests: { url: string; init: RequestInit }[] = [];
  const fetcher = async (url: string, init: RequestInit = {}) => {
    requests.push({ url, init });
    if (url.endsWith("/repos/olentra/api/installation")) return Response.json({ id: 9 });
    if (url.endsWith("/app/installations/9/access_tokens")) return Response.json({ token: "inst-token", expires_at: "2099-01-01T00:00:00Z" }, { status: 201 });
    if (url.includes("/collaborators/asha-dev") && init.method === "PUT") return Response.json({ id: 555 }, { status: 201 });
    return new Response(null, { status: 404 });
  };
  const app = createGithubApp({ appId: "123", slug: "s", clientId: "c", clientSecret: "x", privateKey: privateKey.export({ type: "pkcs1", format: "pem" }).toString(), callbackUrl: "https://site/cb" }, fetcher);
  expect(await app.invite("olentra", "api", "asha-dev")).toBe(555);
  const jwt = String((requests[0]!.init.headers as any).Authorization).replace("Bearer ", "");
  const [header, payload, signature] = jwt.split(".");
  expect(createVerify("RSA-SHA256").update(`${header}.${payload}`).verify(publicKey, Buffer.from(signature!, "base64url"))).toBe(true);
  expect(JSON.parse(Buffer.from(payload!, "base64url").toString())).toMatchObject({ iss: "123" });
  expect((requests[2]!.init.headers as any).Authorization).toBe("Bearer inst-token");
  expect(JSON.parse(String(requests[2]!.init.body))).toEqual({ permission: "push" });
  expect(await app.isCollaborator("olentra", "api", "asha-dev")).toBe(false);
  expect(requests.filter(r => r.url.endsWith("/access_tokens"))).toHaveLength(1);
  expect(await app.installed("someone", "repo")).toBe(false);
});

test("only interns chosen for a repository link are invited", async () => {
  const { access, github, connect, db } = setup({ team: ["a1", "a2"] });
  await db.collection("projects").updateOne({ _id: "p1" }, { $set: { "links.0.members": ["a2"] } });
  await connect("a1", "asha-dev", 42); await connect("a2", "dev-p", 7);
  await access.reconcile();
  expect(github.calls).toEqual(["invite olentra/api dev-p"]);
  await db.collection("projects").updateOne({ _id: "p1" }, { $set: { "links.0.visibleToInterns": false } });
  await access.reconcile();
  expect(github.calls).toEqual(["invite olentra/api dev-p", "cancel olentra/api 100"]);
});

test("staff can list company repositories; results are cached until refreshed", async () => {
  const github = fakeGithub();
  let calls = 0;
  github.app.companyRepositories = async () => { calls++; return [{ fullName: "olentra/api", name: "api", owner: "olentra", url: "https://github.com/olentra/api", private: true, archived: false, description: "API", updatedAt: "2026-11-24T00:00:00Z" }]; };
  const { access } = setup({ github });
  const first: any = await access.execute("github.repositories", {}, manager);
  expect(first.repositories.map((repo: any) => repo.fullName)).toEqual(["olentra/api"]);
  expect(first.installUrl).toContain("/apps/olentra-intern-access/");
  await access.execute("github.repositories", {}, manager);
  expect(calls).toBe(1);
  await access.execute("github.repositories", { refresh: true }, manager);
  expect(calls).toBe(2);
  await expect(access.execute("github.repositories", {}, intern("a1"))).rejects.toMatchObject({ code: "FORBIDDEN" });
  github.app.companyRepositories = async () => { throw new Error("boom"); };
  await expect(access.execute("github.repositories", { refresh: true }, manager)).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
});

test("the repository list only includes the company account's repositories", async () => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const repo = (owner: string, name: string, pushed: string, extra = {}) => ({ full_name: `${owner}/${name}`, name, owner: { login: owner }, html_url: `https://github.com/${owner}/${name}`, private: true, archived: false, description: null, pushed_at: pushed, ...extra });
  const fetcher = async (url: string) => {
    if (url.endsWith("/app")) return Response.json({ owner: { login: "OlentraTech" } });
    if (url.includes("/app/installations?")) return Response.json([{ id: 1, account: { login: "olentratech" } }, { id: 2, account: { login: "stranger" } }]);
    if (url.endsWith("/app/installations/1/access_tokens")) return Response.json({ token: "t1", expires_at: "2099-01-01T00:00:00Z" }, { status: 201 });
    if (url.includes("/installation/repositories")) return Response.json({ repositories: [repo("olentratech", "old", "2026-01-01T00:00:00Z"), repo("olentratech", "new", "2026-11-01T00:00:00Z", { description: "Fresh" })] });
    throw new Error(`unexpected ${url}`);
  };
  const app = createGithubApp({ appId: "1", slug: "s", clientId: "c", clientSecret: "x", privateKey: privateKey.export({ type: "pkcs1", format: "pem" }).toString(), callbackUrl: "https://site/cb" }, fetcher as any);
  const repositories = await app.companyRepositories();
  expect(repositories.map(item => item.fullName)).toEqual(["olentratech/new", "olentratech/old"]);
  expect(repositories[0]).toMatchObject({ url: "https://github.com/olentratech/new", private: true, description: "Fresh" });
  expect(repositories[1]!.description).toBe("");
});
