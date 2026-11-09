import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import type { ClientSession } from "mongodb";
import { internshipTestMongoUri } from "./config";
import { connectInternDatabase, createInternshipDomain, DomainError, type Principal } from "./domain";
import { createStaffManagement } from "./staff";

const uri = internshipTestMongoUri();
if (!uri) throw new Error("Set INTERNSHIP_TEST_MONGODB_URI (or deprecated INTERN_TEST_MONGODB_URI) for isolated internship tests.");
const prefix = `test_staff_${randomUUID().replaceAll("-", "")}_`;
let connection: Awaited<ReturnType<typeof connectInternDatabase>>;
let domain: ReturnType<typeof createInternshipDomain>;
let staff: ReturnType<typeof createStaffManagement>;
const key = () => randomUUID().replaceAll("-", "");
const asPrincipal = (id: string, role = "admin", version = 1) => ({ id, role: "company", staffRole: role, name: "Test Admin", email: id + "@example.test", applicationId: null, sessionVersion: version }) as Principal;
let admin: Principal;

beforeAll(async () => {
  connection = await connectInternDatabase(uri!);
  domain = createInternshipDomain({ ...connection, prefix });
  const transact = async <T>(requestKey: string, actor: Principal | null, input: unknown, fn: (session: ClientSession) => Promise<T>): Promise<T> => {
    const session = connection.client.startSession(), commands = domain.collection("test_commands"), commandId = `${actor?.id || "anon"}:${requestKey}`, fingerprint = JSON.stringify(input);
    try {
      let result!: T;
      await session.withTransaction(async () => {
        const old = await commands.findOne({ _id: commandId }, { session });
        if (old) { if (old.fingerprint !== fingerprint) throw new DomainError("CONFLICT", "Different request."); result = old.result as T; return; }
        result = await fn(session);
        await commands.insertOne({ _id: commandId, fingerprint, result }, { session });
      });
      return result;
    } finally { await session.endSession(); }
  };
  staff = createStaffManagement({ collection: domain.collection, client: connection.client, transact });
  await staff.initialize();
  await domain.collection("accounts").createIndex({ email: 1 }, { unique: true });
  await domain.collection("test_credentials").createIndex({ userId: 1 }, { unique: true });
  await domain.collection("accounts").insertMany([
    { _id: "admin", role: "company", name: "Test Admin", email: "admin@example.test" },
    { _id: "legacy", role: "company", name: "Legacy", email: "legacy@example.test", sessionVersion: 1 },
  ]);
  await staff.bootstrapFirstAdmin("admin@example.test");
  admin = asPrincipal("admin", "admin", 2);
}, 30000);
afterAll(async () => {
  if (!connection) return;
  for (const { name } of await connection.db.listCollections({}, { nameOnly: true }).toArray()) if (name.startsWith(prefix)) await connection.db.collection(name).drop();
  await connection.client.close();
}, 30000);

test("migration promotes only the explicitly selected staff account", async () => {
  expect((await domain.collection("accounts").findOne({ _id: "admin" }))?.staffRole).toBe("admin");
  expect((await domain.collection("accounts").findOne({ _id: "admin" }))?.sessionVersion).toBe(2);
  expect((await domain.collection("accounts").findOne({ _id: "legacy" }))?.staffRole).toBeUndefined();
  await expect(staff.bootstrapFirstAdmin("legacy@example.test")).rejects.toBeInstanceOf(DomainError);
  const result = await staff.execute("role.list", {}, admin);
  expect(result.roles.map((row: any) => row.id).sort()).toEqual(["admin", "manager", "mentor", "recruiter", "viewer"]);
  await expect(staff.execute("role.list", {}, asPrincipal("legacy", "viewer"))).rejects.toBeInstanceOf(DomainError);
});

test("staff accounts and limited roles use hashes, explicit permissions and revocable sessions", async () => {
  const input = { name: "Recruiter", email: "recruiter@example.test", password: "RecruiterPassword2026!", staffRole: "recruiter" }, requestKey = key();
  const created = await staff.execute("staff.create", input, admin, requestKey);
  expect((await staff.execute("staff.create", input, admin, requestKey)).id).toBe(created.id);
  expect(created.passwordHash).toBeUndefined();
  const secret = await domain.collection("test_credentials").findOne({ userId: created.id });
  expect(secret?.passwordHash).not.toContain(input.password);
  expect(await Bun.password.verify(input.password, secret?.passwordHash)).toBe(true);
  await expect(staff.execute("role.create", { name: "Unsafe", permissions: ["staff.manage"] }, admin, key())).rejects.toBeInstanceOf(DomainError);
  await expect(staff.execute("role.create", { name: "Incomplete", permissions: ["applications.review"] }, admin, key())).rejects.toBeInstanceOf(DomainError);
  await expect(staff.execute("role.create", { name: "Project manager without members", permissions: ["projects.summary", "projects.read", "projects.manage"] }, admin, key())).rejects.toBeInstanceOf(DomainError);
  const custom = await staff.execute("role.create", { name: "Application analyst", permissions: ["overview.read", "applications.read"] }, admin, key());
  expect(custom.permissions).toEqual(["overview.read", "applications.read"]);
  await staff.execute("staff.update", { id: created.id, staffRole: custom.id }, admin, key());
  const assigned = await domain.collection("accounts").findOne({ _id: created.id }); expect(assigned?.sessionVersion).toBe(2);
  await staff.execute("role.update", { id: custom.id, name: custom.name, permissions: ["overview.read"], expectedVersion: custom.version }, admin, key());
  expect((await domain.collection("accounts").findOne({ _id: created.id }))?.sessionVersion).toBe(3);
  await staff.execute("staff.resetPassword", { id: created.id, password: "ReplacementPassword2026!" }, admin, key());
  expect((await domain.collection("accounts").findOne({ _id: created.id }))?.sessionVersion).toBe(4);
  const replacedHash = (await domain.collection("test_credentials").findOne({ userId: created.id }))?.passwordHash;
  expect(await Bun.password.verify("ReplacementPassword2026!", replacedHash)).toBe(true);
  expect(await Bun.password.verify(input.password, replacedHash)).toBe(false);
  const disabled = await staff.execute("staff.update", { id: created.id, disabled: true }, admin, key());
  expect(disabled.disabled).toBe(true); expect(disabled.sessionVersion).toBe(5);
  await expect(staff.execute("staff.update", { id: created.id, disabled: false }, asPrincipal(created.id, "recruiter", 5), key())).rejects.toBeInstanceOf(DomainError);
  const visible = await staff.execute("staff.list", {}, admin);
  expect(JSON.stringify(visible)).not.toContain("passwordHash");
  const audit = await staff.execute("audit.list", {}, admin);
  expect(JSON.stringify(audit)).not.toContain("Password2026");
  expect(JSON.stringify(audit)).not.toContain("passwordHash");
}, 30000);

test("concurrent admin demotions cannot remove the final admin", async () => {
  const second = await staff.execute("staff.create", { name: "Second Admin", email: "second@example.test", password: "SecondPassword2026!", staffRole: "admin" }, admin, key());
  const other = asPrincipal(second.id, "admin", second.sessionVersion);
  const results = await Promise.allSettled([
    staff.execute("staff.update", { id: "admin", staffRole: "viewer" }, admin, key()),
    staff.execute("staff.update", { id: second.id, staffRole: "viewer" }, other, key()),
  ]);
  expect(results.filter(item => item.status === "fulfilled")).toHaveLength(1);
  expect(results.filter(item => item.status === "rejected")).toHaveLength(1);
  expect(await domain.collection("accounts").countDocuments({ role: "company", staffRole: "admin", disabled: { $ne: true } })).toBe(1);
}, 30000);
