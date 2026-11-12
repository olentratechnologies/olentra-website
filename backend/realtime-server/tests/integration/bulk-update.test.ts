import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { internshipTestMongoUri } from "./config";
import { connectInternDatabase, createInternshipDomain } from "./domain";

const uri = internshipTestMongoUri();
if (!uri) throw new Error("Set INTERNSHIP_TEST_MONGODB_URI for isolated internship integration tests.");
const prefix = `test_intern_bulk_${randomUUID().replaceAll("-", "")}_`;
let connection: Awaited<ReturnType<typeof connectInternDatabase>>;
let domain: ReturnType<typeof createInternshipDomain>;
const admin = { id: "bulk-admin", role: "company", staffRole: "admin", name: "Admin", email: "bulk-admin@example.test", applicationId: null, sessionVersion: 1 } as any;
const recruiter = { id: "bulk-recruiter", role: "company", staffRole: "recruiter", name: "Recruiter", email: "bulk-recruiter@example.test", applicationId: null, sessionVersion: 1, permissions: ["applications.read", "applications.review"] } as any;

beforeAll(async () => {
  connection = await connectInternDatabase(uri!);
  domain = createInternshipDomain({ ...connection, prefix });
  await domain.initialize();
  await domain.collection("accounts").insertMany([
    { _id: admin.id, role: "company", staffRole: "admin", name: admin.name, email: admin.email, sessionVersion: 1 },
    { _id: recruiter.id, role: "company", staffRole: "recruiter", name: recruiter.name, email: recruiter.email, sessionVersion: 1 },
  ]);
}, 20000);
afterAll(async () => {
  if (!connection) return;
  const names = await connection.db.listCollections({}, { nameOnly: true }).toArray();
  for (const { name } of names) if (name.startsWith(prefix)) await connection.db.collection(name).drop();
  await connection.client.close();
}, 20000);

const seed = async (count: number, tag: string) => {
  const rows = Array.from({ length: count }, (_, index) => ({ _id: `OL-${tag}-${index}`, name: `Bulk ${index}`, email: `${tag}-${index}@example.test`, programId: "explorer", program: "Tech Explorer", status: "Applied", appliedOn: "2026-11-01", history: [], notes: [], version: 1 }));
  await domain.collection("applications").insertMany(rows);
  return rows.map(row => ({ id: row._id, expectedVersion: 1 }));
};

test("one bulk request updates many rows and reports each one", async () => {
  const items = await seed(50, "many");
  items[7]!.expectedVersion = 99; // stale: someone else changed it
  const results = await domain.execute("application.bulkUpdate", { items, status: "Shortlisted" }, admin, `bulk-${randomUUID()}`) as any[];
  expect(results).toHaveLength(50);
  expect(results.filter(row => row.ok)).toHaveLength(49);
  expect(results[7]).toMatchObject({ id: items[7]!.id, ok: false });
  expect(await domain.collection("applications").countDocuments({ _id: { $regex: /^OL-many-/ }, status: "Shortlisted" })).toBe(49);
});

test("retrying the same bulk request does not apply it twice", async () => {
  const items = await seed(3, "retry");
  const key = `bulk-${randomUUID()}`;
  const first = await domain.execute("application.bulkUpdate", { items, status: "Under Review" }, admin, key) as any[];
  const again = await domain.execute("application.bulkUpdate", { items, status: "Under Review" }, admin, key) as any[];
  expect(again).toEqual(first);
  expect((await domain.collection("applications").findOne({ _id: items[0]!.id }))?.version).toBe(2);
});

test("a recruiter can't make final decisions in bulk", async () => {
  const items = await seed(2, "final");
  await expect(domain.execute("application.bulkUpdate", { items, status: "Rejected" }, recruiter, `bulk-${randomUUID()}`)).rejects.toMatchObject({ code: "FORBIDDEN" });
  expect(await domain.collection("applications").countDocuments({ _id: { $regex: /^OL-final-/ }, status: "Rejected" })).toBe(0);
  const allowed = await domain.execute("application.bulkUpdate", { items, status: "Shortlisted" }, recruiter, `bulk-${randomUUID()}`) as any[];
  expect(allowed.every(row => row.ok)).toBe(true);
});

test("application.list computes filter counts only when asked", async () => {
  await seed(2, "facet");
  const plain = await domain.execute("application.list", { search: "facet-", pageSize: 5 }, admin) as any;
  expect(plain.total).toBe(2);
  expect(plain.counts).toBeUndefined();
  const withCounts = await domain.execute("application.list", { search: "facet-", pageSize: 1, facets: true }, admin) as any;
  expect(withCounts.counts.statuses.Applied).toBe(2);
});

test("status decisions are audited and the audit log filters by area", async () => {
  const [item] = await seed(1, "audit");
  await domain.execute("application.update", { id: item!.id, status: "Shortlisted", expectedVersion: 1 }, admin, `audit-${randomUUID()}`);
  const decisions = await domain.execute("audit.list", { area: "applications", pageSize: 100 }, admin) as any;
  const row = decisions.items.find((entry: any) => entry.targetId === item!.id);
  expect(row).toMatchObject({ action: "application.status", actorId: admin.id, detail: { from: "Applied", to: "Shortlisted" } });
  const staffOnly = await domain.execute("audit.list", { area: "staff", pageSize: 100 }, admin) as any;
  expect(staffOnly.items.some((entry: any) => entry.action.startsWith("application."))).toBe(false);
  await expect(domain.execute("audit.list", {}, recruiter)).rejects.toMatchObject({ code: "FORBIDDEN" });
});
