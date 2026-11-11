import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { internshipTestMongoUri } from "./config";
import { connectInternDatabase, createInternshipDomain } from "./domain";
import { createAdminAccess } from "../../src/modules/staff/admin-access";

const uri = internshipTestMongoUri();
if (!uri) throw new Error("Set INTERNSHIP_TEST_MONGODB_URI for isolated account-access integration tests.");
const prefix = `test_admin_access_${randomUUID().replaceAll("-", "")}_`;
let connection: Awaited<ReturnType<typeof connectInternDatabase>>;
let domain: ReturnType<typeof createInternshipDomain>;
let access: ReturnType<typeof createAdminAccess>;

beforeAll(async () => {
  connection = await connectInternDatabase(uri!);
  domain = createInternshipDomain({ ...connection, prefix });
  await domain.initialize();
  access = createAdminAccess(domain);
}, 30000);
afterAll(async () => {
  if (!connection) return;
  for (const { name } of await connection.db.listCollections({}, { nameOnly: true }).toArray()) if (name.startsWith(prefix)) await connection.db.collection(name).drop();
  await connection.client.close();
}, 30000);

test("operator recovery restores admin access and deletes the actual credentials without touching interns", async () => {
  const survivor = await access.create("survivor@example.test", "Survivor");
  const target = await access.create("target@example.test", "Target");
  await domain.selfResetPassword(target._id, "InitialStaffPassword2026!", 1);
  expect((await access.list()).find(row => row._id === target._id)?.hasPassword).toBe(true);
  await domain.collection("accounts").updateOne({ _id: target._id }, { $set: { disabled: true, staffRole: "viewer" } });
  await domain.collection("sessions").insertOne({ _id: "target-session", userId: target._id, revoked: false });
  const restored = await access.reset("target@example.test");
  expect(restored.staffRole).toBe("admin");
  expect(restored.disabled).toBe(false);
  expect(restored.sessionVersion).toBe(3);
  expect((await domain.collection("sessions").findOne({ _id: "target-session" }))?.revoked).toBe(true);
  await domain.collection("accounts").insertOne({ _id: "intern", email: "intern@example.test", role: "intern" });
  await expect(access.delete("intern@example.test")).rejects.toMatchObject({ code: "FORBIDDEN" });
  await access.delete("target@example.test");
  expect(await domain.collection("test_credentials").countDocuments({ userId: target._id })).toBe(0);
  expect(await domain.collection("sessions").countDocuments({ userId: target._id })).toBe(0);
  expect(await domain.collection("accounts").findOne({ _id: target._id })).toBeNull();
  expect(await domain.collection("accounts").findOne({ _id: "intern" })).toBeDefined();
  expect(await domain.collection("accounts").findOne({ _id: survivor._id })).toBeDefined();
  await expect(access.delete("survivor@example.test")).rejects.toMatchObject({ code: "CONFLICT" });
});

test("concurrent operator deletions preserve one active admin", async () => {
  await access.create("other@example.test", "Other");
  const results = await Promise.allSettled([access.delete("survivor@example.test"), access.delete("other@example.test")]);
  expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
  expect(results.filter(result => result.status === "rejected")).toHaveLength(1);
  expect(await domain.collection("accounts").countDocuments({ role: "company", staffRole: "admin", disabled: { $ne: true } })).toBe(1);
});

test("a second admin can reset a new staff account before it has credentials", async () => {
  const adminRow = await domain.collection("accounts").findOne({ role: "company", staffRole: "admin" });
  const actor = await domain.account(adminRow!._id);
  const empty = await access.create("empty@example.test", "Empty");
  await domain.execute("staff.resetPassword", { id: empty._id, password: "OtherAdminReset2026!" }, actor, randomUUID());
  expect((await domain.login(empty.email, "OtherAdminReset2026!"))?.id).toBe(empty._id);
});
