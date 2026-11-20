import { afterAll, beforeAll, expect, test } from "bun:test";
import { createHash, randomUUID } from "node:crypto";
import { internshipTestMongoUri } from "./config";
import { connectInternDatabase, createInternshipDomain, type Principal } from "./domain";

const uri = internshipTestMongoUri();
if (!uri) throw new Error("Set INTERNSHIP_TEST_MONGODB_URI (or deprecated INTERN_TEST_MONGODB_URI) for the isolated Atlas integration test.");
const prefix = `test_intern_batch_${randomUUID().replaceAll("-", "")}_`;
let connection: Awaited<ReturnType<typeof connectInternDatabase>>;
let domain: ReturnType<typeof createInternshipDomain>;
const staff: Principal = { id: "staff-batch", role: "company", staffRole: "admin", name: "Staff", email: "staff-batch@example.test", applicationId: null, sessionVersion: 1 };
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
const base = { programId: "software-engineer", program: "Software Engineer Intern" };

beforeAll(async () => {
  connection = await connectInternDatabase(uri!);
  domain = createInternshipDomain({ ...connection, prefix });
  // Records that existed before batches were introduced.
  await domain.collection("applications").insertMany([
    { _id: "old-1", email: "old-1@example.test", name: "Old One", ...base, status: "Applied", appliedOn: "2026-11-01" },
    { _id: "old-2", email: "old-2@example.test", name: "Old Two", ...base, status: "Joined", appliedOn: "2026-11-02", batch: "" },
    { _id: "kept", email: "kept@example.test", name: "Kept", ...base, status: "Applied", appliedOn: "2026-11-03", batch: "Pilot" },
    // Filed under the batch's earlier name.
    { _id: "renamed", email: "renamed@example.test", name: "Renamed", ...base, status: "Joined", appliedOn: "2026-11-04", batch: "Batch 2026-1" },
  ]);
  await domain.collection("interns").insertMany([
    { _id: "intern-old", applicationId: "old-2", status: "Active", batch: "" },
    { _id: "intern-kept", applicationId: "kept", status: "Active", batch: "Pilot" },
    { _id: "intern-renamed", applicationId: "renamed", status: "Active", batch: "Batch 2026-1" },
  ]);
  await domain.collection("settings").insertOne({ _id: "program", defaultBatch: "Batch 2026-1" });
  await domain.collection("staff_views").insertOne({ _id: "view-renamed", ownerId: staff.id, name: "Current intake", filters: { batch: "Batch 2026-1", status: "Applied" } });
  await domain.initialize();
  await domain.collection("accounts").insertOne({ _id: staff.id, role: staff.role, staffRole: "admin", name: staff.name, email: staff.email, sessionVersion: 1 });
}, 30000);
afterAll(async () => {
  if (!connection) return;
  for (const { name } of await connection.db.listCollections({}, { nameOnly: true }).toArray()) if (name.startsWith(prefix)) await connection.db.collection(name).drop();
  await connection.client.close();
}, 30000);

test("startup renames Batch 2026-1, files earlier records under Batch 1 and leaves other batches alone", async () => {
  expect((await domain.collection("settings").findOne({ _id: "program" }))?.defaultBatch).toBe("Batch 1");
  expect((await domain.collection("applications").findOne({ _id: "old-1" }))?.batch).toBe("Batch 1");
  expect((await domain.collection("applications").findOne({ _id: "old-2" }))?.batch).toBe("Batch 1");
  expect((await domain.collection("applications").findOne({ _id: "kept" }))?.batch).toBe("Pilot");
  expect((await domain.collection("interns").findOne({ _id: "intern-old" }))?.batch).toBe("Batch 1");
  expect((await domain.collection("interns").findOne({ _id: "intern-kept" }))?.batch).toBe("Pilot");
  expect((await domain.collection("applications").findOne({ _id: "renamed" }))?.batch).toBe("Batch 1");
  expect((await domain.collection("interns").findOne({ _id: "intern-renamed" }))?.batch).toBe("Batch 1");
  expect((await domain.collection("staff_views").findOne({ _id: "view-renamed" }))?.filters).toEqual({ batch: "Batch 1", status: "Applied" });
  // Running it again changes nothing.
  await domain.initialize();
  expect((await domain.collection("applications").findOne({ _id: "kept" }))?.batch).toBe("Pilot");
}, 30000);

test("new applications join the current batch, which staff can filter by and applicants never see", async () => {
  await domain.execute("program.configure", { programId: "software-engineer", fee: 0, stipend: 0, enabled: true }, staff, "batch-track-program-0001");
  await domain.execute("settings.update", { patch: { programEnabled: true } }, staff, "batch-enable-program-0001");
  await domain.collection("files").insertOne({ _id: "batch-file", kind: "resume", status: "ready", accessTokenHash: digest("batch-token") });
  const { applicationId } = await domain.execute("application.submit", { name: "New Applicant", email: "new-batch@example.test", linkedin: "https://www.linkedin.com/in/new-batch", programId: "software-engineer", schedule: "part_time", resumeAttachmentId: "batch-file", resumeAccessToken: "batch-token" }, null, "batch-apply-0001");
  expect((await domain.collection("applications").findOne({ _id: applicationId }))?.batch).toBe("Batch 1");

  const all = await domain.execute("application.list", { facets: true }, staff);
  expect(all.batches).toEqual(["Batch 1", "Pilot"]);
  const current = await domain.execute("application.list", { batch: "Batch 1", facets: true }, staff);
  expect(current.total).toBe(4);
  expect(current.items.every((row: any) => row.batch === "Batch 1")).toBe(true);
  expect((await domain.execute("application.get", { id: applicationId }, staff)).batch).toBe("Batch 1");

  const applicant: Principal = { id: "applicant-batch", role: "intern", name: "New Applicant", email: "new-batch@example.test", applicationId, sessionVersion: 1 };
  expect((await domain.execute("application.get", { id: applicationId }, applicant)).batch).toBeUndefined();
}, 30000);

test("an intern keeps the batch they applied in even after the next batch opens", async () => {
  await domain.collection("applications").insertOne({ _id: "late", email: "late@example.test", name: "Late Joiner", ...base, status: "Selected", appliedOn: "2026-11-10", batch: "Batch 1", version: 1, history: [] });
  await domain.collection("offers").insertOne({ _id: "offer-late", applicationId: "late", status: "Accepted", startOn: "2026-12-01", endOn: "2027-02-28", currentVersion: 1 });
  await domain.collection("onboarding").insertOne({ _id: "onboarding-late", applicationId: "late", status: "Submitted", documents: {} });
  await domain.execute("settings.update", { patch: { defaultBatch: "Batch 2" } }, staff, "batch-next-default-0001");
  const intern = await domain.execute("onboarding.approve", { applicationId: "late" }, staff, "batch-approve-late");
  expect(intern.batch).toBe("Batch 1");
}, 30000);
