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

test("each reviewer keeps one score sheet and the list sorts by the average", async () => {
  const [high, low] = await seed(2, "score");
  await domain.execute("review.save", { applicationId: high!.id, scores: { video: 5, skills: 5, communication: 4 } }, admin, `score-${randomUUID()}`);
  await domain.execute("review.save", { applicationId: high!.id, scores: { video: 3, skills: 3, communication: 3 } }, recruiter, `score-${randomUUID()}`);
  await domain.execute("review.save", { applicationId: high!.id, scores: { video: 5, skills: 5, communication: 5 } }, admin, `score-${randomUUID()}`); // edit, not a new sheet
  await domain.execute("review.save", { applicationId: low!.id, scores: { video: 1 } }, admin, `score-${randomUUID()}`);
  const sheet = await domain.execute("review.list", { applicationId: high!.id }, recruiter) as any;
  expect(sheet.reviews).toHaveLength(2);
  expect(sheet.average).toBe(4);
  expect(sheet.mine.total).toBe(3);
  await expect(domain.execute("review.save", { applicationId: high!.id, scores: { video: 9 } }, admin, `score-${randomUUID()}`)).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  const sorted = await domain.execute("application.list", { search: "score-", sortField: "score", sortDirection: "desc" }, admin) as any;
  expect(sorted.items.map((row: any) => row.id)).toEqual([high!.id, low!.id]);
  expect(sorted.items[0].score).toBe(4);
});

test("applications can be assigned to a reviewer and filtered by assignee", async () => {
  const items = await seed(3, "assign");
  const reviewers = await domain.execute("staff.reviewers", {}, recruiter) as any[];
  expect(reviewers.map(r => r.id)).toEqual(expect.arrayContaining([admin.id, recruiter.id]));
  const result = await domain.execute("application.assign", { applicationIds: items.slice(0, 2).map(i => i.id), assigneeId: recruiter.id }, admin, `assign-${randomUUID()}`) as any;
  expect(result).toMatchObject({ updated: 2, assigneeName: "Recruiter" });
  const mine = await domain.execute("application.list", { search: "assign-", assignee: "me" }, recruiter) as any;
  expect(mine.items.map((row: any) => row.id).sort()).toEqual(items.slice(0, 2).map(i => i.id).sort());
  const open = await domain.execute("application.list", { search: "assign-", assignee: "unassigned" }, recruiter) as any;
  expect(open.items.map((row: any) => row.id)).toEqual([items[2]!.id]);
  await expect(domain.execute("application.assign", { applicationIds: [items[2]!.id], assigneeId: "not-staff" }, admin, `assign-${randomUUID()}`)).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  await domain.execute("application.assign", { applicationIds: [items[0]!.id], assigneeId: null }, admin, `assign-${randomUUID()}`);
  expect((await domain.collection("applications").findOne({ _id: items[0]!.id }))?.assignedTo).toBeUndefined();
  const event = await domain.collection("events").findOne({ type: "application.assigned", assigneeId: recruiter.id });
  expect(event?.assignedBy).toBe(admin.id);
});

test("admins manage message templates; staff who can message can read them", async () => {
  const saved = await domain.execute("template.save", { name: "Interview invite", subject: "Interview for {track}", body: "Hi {firstName}, …" }, admin, `tpl-${randomUUID()}`) as any;
  expect(saved.id).toMatch(/^TPL-/);
  await domain.execute("template.save", { id: saved.id, name: "Interview invite", subject: "Your interview", body: "Hi {firstName}!" }, admin, `tpl-${randomUUID()}`);
  const messenger = { ...recruiter, permissions: ["applications.read", "messages.applicants"] };
  const list = await domain.execute("template.list", {}, messenger) as any[];
  expect(list.find(item => item.id === saved.id)).toMatchObject({ subject: "Your interview", body: "Hi {firstName}!" });
  await expect(domain.execute("template.list", {}, { ...recruiter, permissions: ["applications.read"] })).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(domain.execute("template.save", { name: "x", subject: "y", body: "z" }, messenger, `tpl-${randomUUID()}`)).rejects.toMatchObject({ code: "FORBIDDEN" });
  await domain.execute("template.delete", { id: saved.id }, admin, `tpl-${randomUUID()}`);
  expect((await domain.execute("template.list", {}, admin) as any[]).some(item => item.id === saved.id)).toBe(false);
});

test("saved views belong to one staff member and saving a name again replaces it", async () => {
  const first = await domain.execute("view.save", { name: "Video shortlist", filters: { status: "Shortlisted", video: "with", evil: "x" } }, admin, `view-${randomUUID()}`) as any;
  expect(first.filters).toEqual({ status: "Shortlisted", video: "with" });
  await domain.execute("view.save", { name: "Video shortlist", filters: { status: "Applied" } }, admin, `view-${randomUUID()}`);
  const mine = await domain.execute("view.list", {}, admin) as any[];
  expect(mine.filter(view => view.name === "Video shortlist")).toEqual([{ id: first.id, name: "Video shortlist", filters: { status: "Applied" } }]);
  expect(await domain.execute("view.list", {}, recruiter)).toEqual([]);
  await expect(domain.execute("view.delete", { id: first.id }, recruiter, `view-${randomUUID()}`)).rejects.toMatchObject({ code: "NOT_FOUND" });
  await domain.execute("view.delete", { id: first.id }, admin, `view-${randomUUID()}`);
  expect(await domain.execute("view.list", {}, admin)).toEqual([]);
});
