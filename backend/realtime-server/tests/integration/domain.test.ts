import { afterAll, beforeAll, expect, test } from "bun:test";
import { createHash, randomUUID } from "node:crypto";
import { internshipTestMongoUri } from "./config";
import { connectInternDatabase, createInternshipDomain, DomainError, type Principal } from "./domain";

const uri = internshipTestMongoUri();
if (!uri) throw new Error("Set INTERNSHIP_TEST_MONGODB_URI (or deprecated INTERN_TEST_MONGODB_URI) for the isolated Atlas integration test.");
const prefix = `test_intern_${randomUUID().replaceAll("-", "")}_`;
let connection: Awaited<ReturnType<typeof connectInternDatabase>>;
let domain: ReturnType<typeof createInternshipDomain>;
const staff: Principal = { id: "staff-test", role: "company", staffRole: "admin", name: "Test Staff", email: "staff@example.test", applicationId: null, sessionVersion: 1 };
const digest = (s: string) => createHash("sha256").update(s).digest("hex");

beforeAll(async () => {
  connection = await connectInternDatabase(uri!);
  domain = createInternshipDomain({ ...connection, prefix });
  await domain.initialize();
  await domain.collection("accounts").insertOne({ _id: staff.id, role: staff.role, staffRole: "admin", name: staff.name, email: staff.email, sessionVersion: 1 });
}, 20000);
afterAll(async () => {
  if (!connection) return;
  const names = await connection.db.listCollections({}, { nameOnly: true }).toArray();
  for (const { name } of names) if (name.startsWith(prefix)) await connection.db.collection(name).drop();
  await connection.client.close();
}, 20000);

test("clean database initializes only closed named programs", async () => {
  const data = await domain.publicData();
  expect(data.programs.map(p => p.id)).toEqual(["software-engineer"]);
  expect(data.settings.programEnabled).toBe(false);
  expect(data.settings.compensationMode).toBe("both");
  expect(await domain.collection("applications").countDocuments()).toBe(0);
});

test("persisted compensation selection controls new applications without changing tracks or existing records", async () => {
  const originalProgram = await domain.collection("programs").findOne({ _id: "software-engineer" });
  const originalSettings = await domain.collection("settings").findOne({ _id: "program" });
  const existingApplication = { _id: "compensation-existing", email: "existing-compensation@example.test", name: "Existing Intern", programId: "software-engineer", program: "Software Engineer Intern", status: "Joined", appliedOn: "2026-10-01", version: 1 };
  await domain.collection("applications").insertOne(existingApplication);
  try {
    await domain.execute("program.configure", { programId: "software-engineer", fee: 250, stipend: 0, enabled: true }, staff, "compensation-track-free");
    await domain.execute("settings.update", { patch: { programEnabled: true } }, staff, "compensation-enable-test");
    const cases = [
      { mode: "free", stipend: 0, accepts: true },
      { mode: "free", stipend: 1000, accepts: false },
      { mode: "paid", stipend: 0, accepts: false },
      { mode: "paid", stipend: 1000, accepts: true },
      { mode: "both", stipend: 0, accepts: true },
      { mode: "both", stipend: 1000, accepts: true },
    ] as const;
    for (const [index, { mode, stipend, accepts }] of cases.entries()) {
      await domain.execute("program.configure", { programId: "software-engineer", fee: 250, stipend, enabled: true }, staff, `compensation-track-${index}`);
      await domain.execute("settings.update", { patch: { compensationMode: mode } }, staff, `compensation-mode-${index}`);
      expect((await domain.publicData()).settings.compensationMode).toBe(mode);
      expect((await createInternshipDomain({ ...connection, prefix }).publicData()).settings.compensationMode).toBe(mode);
      expect(await domain.collection("programs").findOne({ _id: "software-engineer" })).toMatchObject({ fee: 250, stipend, enabled: true });
      expect(await domain.collection("applications").findOne({ _id: existingApplication._id })).toEqual(existingApplication);
      const fileId = `compensation-file-${index}`, fileToken = `compensation-token-${index}`;
      await domain.collection("files").insertOne({ _id: fileId, kind: "resume", status: "ready", accessTokenHash: digest(fileToken) });
      const request = domain.execute("application.submit", { name: "Compensation Candidate", email: `compensation-${index}@example.test`, linkedin: "https://www.linkedin.com/in/test-candidate", programId: "software-engineer", schedule: "part_time", resumeAttachmentId: fileId, resumeAccessToken: fileToken }, null, `compensation-apply-${index}`);
      if (accepts) {
        expect(await request).toMatchObject({ received: true });
        expect((await domain.collection("applications").findOne({ email: `compensation-${index}@example.test` }))?.programId).toBe("software-engineer");
      }
      else await expect(request).rejects.toMatchObject({ code: "CLOSED" });
    }
  } finally {
    await domain.collection("applications").deleteMany({ email: { $regex: "^compensation-[0-9]+@example\\.test$" } });
    await domain.collection("applications").deleteOne({ _id: existingApplication._id });
    if (originalProgram) await domain.collection("programs").replaceOne({ _id: "software-engineer" }, originalProgram);
    if (originalSettings) await domain.collection("settings").replaceOne({ _id: "program" }, originalSettings);
    domain.invalidatePublicData();
  }
}, 30000);

test("application claim, registration, status and idempotency persist in Atlas", async () => {
  await domain.collection("programs").updateOne({ _id: "software-engineer" }, { $set: { enabled: true, fee: 0, stipend: 0 } });
  await domain.collection("settings").updateOne({ _id: "program" }, { $set: { programEnabled: true } });
  const fileId = "file-test", fileToken = "temporary-file-token";
  await domain.collection("files").insertOne({ _id: fileId, kind: "resume", status: "ready", accessTokenHash: digest(fileToken) });
  const payload = { name: "Test Applicant", email: "applicant@example.test", linkedin: "https://www.linkedin.com/in/test-applicant", programId: "software-engineer", schedule: "part_time", resumeAttachmentId: fileId, resumeAccessToken: fileToken };
  const response = await domain.execute("application.submit", payload, null, "application-test-0001");
  const retry = await domain.execute("application.submit", payload, null, "application-test-0001");
  expect(retry).toEqual(response);
  expect(await domain.collection("applications").countDocuments()).toBe(1);
  // A repeat application with a new key is rejected with ALREADY_APPLIED.
  await expect(domain.execute("application.submit", payload, null, "application-test-0002")).rejects.toMatchObject({ code: "ALREADY_APPLIED" });
  expect(Object.keys(response).sort()).toEqual(["applicationId", "message", "received"]);
  expect(await domain.collection("applications").countDocuments()).toBe(1);
  expect(await domain.collection("outbox").countDocuments({ type: "applicationConfirmation", "payload.to": "applicant@example.test" })).toBe(1);
  expect(await domain.collection("outbox").countDocuments({ type: "magicLink", "payload.to": "applicant@example.test" })).toBe(0);
  const application = { id: String((await domain.collection("applications").findOne({ email: "applicant@example.test" }))!._id) };
  await expect(domain.autoProvisionAccount(application.id, "applicant@example.test")).rejects.toBeInstanceOf(DomainError);
  await domain.execute("application.update", { id: application.id, status: "Under Review", expectedVersion: 1 }, staff, "status-update-test-0001");
  await domain.execute("application.update", { id: application.id, status: "Selected", expectedVersion: 2 }, staff, "status-update-test-0002");
  const linked = await domain.autoProvisionAccount(application.id, "applicant@example.test");
  await domain.changePassword(linked.id, "", "ExamplePassword2026!");
  const registered = (await domain.account(linked.id))!;
  expect(registered.role).toBe("intern");
  expect(await domain.login("applicant@example.test", "ExamplePassword2026!")).toMatchObject({ id: registered.id, role: "intern" });
  expect(await domain.login("applicant@example.test", "incorrect")).toBeNull();
  expect((await domain.collection("test_credentials").findOne({ userId: registered.id }))?.passwordHash).not.toContain("ExamplePassword2026!");
  expect((await domain.execute("application.get", { id: application.id }, registered)).status).toBe("Selected");
  expect((await domain.execute("application.list", {}, staff)).total).toBe(1);
  await expect(domain.execute("application.update", { id: application.id, status: "Selected", expectedVersion: 1 }, staff, "status-update-test-0003")).rejects.toBeInstanceOf(DomainError);
  await expect(domain.execute("application.get", { id: application.id }, { ...registered, applicationId: "different" })).rejects.toBeInstanceOf(DomainError);
  const competing = await Promise.allSettled([
    domain.execute("application.update", { id: application.id, status: "Joined", expectedVersion: 3 }, staff, "status-update-race-0001"),
    domain.execute("application.update", { id: application.id, status: "Declined", expectedVersion: 3 }, staff, "status-update-race-0002"),
  ]);
  expect(competing.filter(result => result.status === "fulfilled")).toHaveLength(1);
  expect(competing.filter(result => result.status === "rejected")).toHaveLength(1);
  expect((await domain.execute("application.get", { id: application.id }, staff)).version).toBe(4);
}, 30000);

test("staff can securely create an account for an unclaimed application", async () => {
  await domain.collection("programs").updateOne({ _id: "software-engineer" }, { $set: { enabled: true, fee: 0, stipend: 0 } });
  await domain.collection("settings").updateOne({ _id: "program" }, { $set: { programEnabled: true } });
  const fileToken = "staff-assist-file-token";
  await domain.collection("files").insertOne({ _id: "staff-assist-file", kind: "resume", status: "ready", accessTokenHash: digest(fileToken) });
  await domain.execute("application.submit", { name: "Assisted Applicant", email: "assisted@example.test", linkedin: "https://www.linkedin.com/in/test-candidate", programId: "software-engineer", schedule: "part_time", resumeAttachmentId: "staff-assist-file", resumeAccessToken: fileToken }, null, "application-assisted-0001");
  const app = { id: String((await domain.collection("applications").findOne({ email: "assisted@example.test" }))!._id) };
  const payload = { applicationId: app.id, password: "TemporaryPassword2026!" };
  const retryKey = "create-staff-assisted-0001";
  await expect(domain.execute("account.createForApplication", payload, null, "create-staff-assisted-0002")).rejects.toBeInstanceOf(DomainError);
  const created = await domain.execute("account.createForApplication", payload, staff, retryKey);
  expect(created.role).toBe("intern");
  expect(created.applicationId).toBe(app.id);
  expect((await domain.execute("account.createForApplication", payload, staff, retryKey)).id).toBe(created.id);
  expect((await domain.login("assisted@example.test", payload.password))?.id).toBe(created.id);
  expect((await domain.collection("test_credentials").findOne({ userId: created.id }))?.passwordHash).not.toContain(payload.password);
  expect((await domain.collection("applications").findOne({ _id: app.id }))?.claimHash).toBeUndefined();
  await expect(domain.execute("account.createForApplication", payload, staff, "create-staff-assisted-0003")).rejects.toBeInstanceOf(DomainError);
}, 30000);

test("anonymous visitors and interns only see public program settings; staff see all", async () => {
  const anonymous = await domain.execute("intern.public", {}, null, "public-payload-anon") as any;
  expect(Object.keys(anonymous).sort()).toEqual(["opportunities", "organization", "programs", "settings"]);
  expect(Object.keys(anonymous.settings).sort()).toEqual(["applicationDeadline", "compensationMode", "deadlineExtension", "duration", "programEnabled", "programName"]);
  const internSnapshot = await domain.execute("intern.snapshot", {}, null, "public-payload-snap") as any;
  expect(internSnapshot.data.settings).not.toHaveProperty("rejectionEmails");
  const staffSnapshot = await domain.execute("intern.snapshot", {}, staff, "public-payload-staff") as any;
  expect(staffSnapshot.data.settings).toHaveProperty("rejectionEmails");
  expect(staffSnapshot.data.settings).toHaveProperty("applicationAlerts");
});
