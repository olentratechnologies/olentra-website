import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { internshipTestMongoUri } from "./config";
import { connectInternDatabase, createInternshipDomain } from "./domain";

const uri = internshipTestMongoUri();
if (!uri) throw new Error("Set INTERNSHIP_TEST_MONGODB_URI for isolated internship integration tests.");
const prefix = `test_intern_idx_${randomUUID().replaceAll("-", "")}_`;
let connection: Awaited<ReturnType<typeof connectInternDatabase>>;
let domain: ReturnType<typeof createInternshipDomain>;

beforeAll(async () => {
  connection = await connectInternDatabase(uri!);
  domain = createInternshipDomain({ ...connection, prefix });
  await domain.initialize();
}, 20000);
afterAll(async () => {
  if (!connection) return;
  const names = await connection.db.listCollections({}, { nameOnly: true }).toArray();
  for (const { name } of names) if (name.startsWith(prefix)) await connection.db.collection(name).drop();
  await connection.client.close();
}, 20000);

const usesIndex = (plan: unknown) => JSON.stringify(plan).includes("IXSCAN") && !JSON.stringify(plan).includes("COLLSCAN");

test("public certificate checks look the number up through an index", async () => {
  const plan = await domain.collection("certificates").find({ certificateNumber: { $eq: `OLENTRA-${randomUUID()}`, $type: "string" } }).explain();
  expect(usesIndex(plan)).toBe(true);
});

test("live insights read recent events of one type through an index", async () => {
  const plan = await domain.collection("events").find({ type: "application.created" }).sort({ createdAt: -1, _id: -1 }).limit(50).explain();
  expect(usesIndex(plan)).toBe(true);
});

test("certificate numbers are unique and the unused events index is gone", async () => {
  const number = `OLENTRA-${randomUUID()}`;
  await domain.collection("certificates").insertOne({ _id: `CERT-${randomUUID()}`, internId: `INT-${randomUUID()}`, certificateNumber: number });
  await expect(domain.collection("certificates").insertOne({ _id: `CERT-${randomUUID()}`, internId: `INT-${randomUUID()}`, certificateNumber: number })).rejects.toMatchObject({ code: 11000 });
  const names = (await domain.collection("events").indexes()).map((index) => index.name);
  expect(names).not.toContain("applicationId_1_createdAt_-1");
});

test("the staff snapshot says when it is showing only the newest applications", async () => {
  const admin = { id: "snapshot-admin", role: "company", staffRole: "admin", name: "Admin", email: "snapshot-admin@example.test", applicationId: null, sessionVersion: 1 } as any;
  const snapshot = async () => (await domain.execute("intern.snapshot", {}, admin, "snapshot-truncation")) as any;
  const rows = (count: number, from: number) => Array.from({ length: count }, (_, index) => ({ _id: `OL-trunc-${from + index}`, name: "Row", email: `trunc-${from + index}@example.test`, programId: "software-engineer", status: "Applied", appliedOn: "2026-11-01", version: 1 }));
  await domain.collection("applications").insertMany(rows(100, 0));
  expect((await snapshot()).data.truncated?.applications).toBeUndefined();
  await domain.collection("applications").insertOne(rows(1, 100)[0]!);
  const full = await snapshot();
  expect(full.data.truncated.applications).toBe(true);
  expect(full.data.applications).toHaveLength(100);
});
