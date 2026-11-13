import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { internshipTestMongoUri } from "./config";
import { connectInternDatabase, createInternshipDomain } from "./domain";

const uri = internshipTestMongoUri();
if (!uri) throw new Error("Set INTERNSHIP_TEST_MONGODB_URI for isolated internship integration tests.");
const prefix = `test_intern_privacy_${randomUUID().replaceAll("-", "")}_`;
let connection: Awaited<ReturnType<typeof connectInternDatabase>>;
let domain: ReturnType<typeof createInternshipDomain>;
const admin = { id: "privacy-admin", role: "company", staffRole: "admin", name: "Admin", email: "privacy-admin@example.test", applicationId: null, sessionVersion: 1 } as any;
const recruiter = { id: "privacy-recruiter", role: "company", staffRole: "recruiter", name: "Recruiter", email: "privacy-recruiter@example.test", applicationId: null, sessionVersion: 1, permissions: ["applications.read", "applications.review"] } as any;
const key = () => `privacy-${randomUUID()}`;

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

async function applicant(status = "Applied", extra: Record<string, unknown> = {}) {
  const applicationId = `OL-${randomUUID()}`, email = `privacy-${randomUUID()}@example.test`;
  await domain.collection("applications").insertOne({ _id: applicationId, name: "Privacy Person", email, programId: "explorer", program: "Tech Explorer", status, appliedOn: "2026-01-01", history: [], notes: [], version: 1, ...extra });
  const account = await domain.autoProvisionAccount(applicationId, email);
  return { applicationId, email, account };
}

test("an applicant can withdraw before joining, once, and staff are told", async () => {
  const { applicationId, account } = await applicant("Shortlisted");
  const result = await domain.execute("application.withdraw", { applicationId, reason: "Took another offer" }, account, key()) as any;
  expect(result.status).toBe("Withdrawn");
  const row = await domain.collection("applications").findOne({ _id: applicationId });
  expect(row).toMatchObject({ status: "Withdrawn", withdrawalReason: "Took another offer" });
  expect(typeof row?.statusChangedOn).toBe("string");
  expect(await domain.collection("notifications").countDocuments({ applicationId, recipientRole: "company", title: "Application withdrawn" })).toBe(1);
  await expect(domain.execute("application.withdraw", { applicationId }, account, key())).rejects.toMatchObject({ code: "CONFLICT" });
});

test("only the applicant can withdraw their own application", async () => {
  const mine = await applicant(), other = await applicant();
  await expect(domain.execute("application.withdraw", { applicationId: other.applicationId }, mine.account, key())).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(domain.execute("application.withdraw", { applicationId: mine.applicationId }, admin, key())).rejects.toMatchObject({ code: "FORBIDDEN" });
});

test("erasing an applicant removes their data everywhere and audits it without personal details", async () => {
  const { applicationId, email, account } = await applicant("Rejected");
  await domain.collection("messages").insertOne({ _id: `MSG-${randomUUID()}`, applicationId, body: "hello" });
  await domain.collection("projects").insertOne({ _id: `PRJ-${randomUUID()}`, name: "Kept", team: [applicationId, "someone-else"] });
  await expect(domain.execute("applicant.erase", { applicationId, confirmEmail: "wrong@example.test" }, admin, key())).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  await expect(domain.execute("applicant.erase", { applicationId, confirmEmail: email }, recruiter, key())).rejects.toMatchObject({ code: "FORBIDDEN" });
  const result = await domain.execute("applicant.erase", { applicationId, confirmEmail: email.toUpperCase() }, admin, key()) as any;
  expect(result.erased).toBe(true);
  for (const name of ["applications", "accounts", "messages", "notifications", "outbox", "sessions"]) {
    expect(await domain.collection(name).countDocuments({ $or: [{ _id: applicationId }, { applicationId }, { email }, { "payload.to": email }, { userId: account.id }] })).toBe(0);
  }
  expect((await domain.collection("projects").findOne({ name: "Kept" }))?.team).toEqual(["someone-else"]);
  const audit = await domain.collection("staff_audit").findOne({ action: "applicant.erased", targetId: applicationId });
  expect(audit).toBeTruthy();
  expect(JSON.stringify(audit)).not.toContain(email);
});

test("an active intern can't be erased", async () => {
  const { applicationId, email } = await applicant("Joined");
  await domain.collection("interns").insertOne({ _id: `INT-${randomUUID()}`, applicationId, status: "Active" });
  await expect(domain.execute("applicant.erase", { applicationId, confirmEmail: email }, admin, key())).rejects.toMatchObject({ code: "CONFLICT" });
  expect(await domain.collection("applications").countDocuments({ _id: applicationId })).toBe(1);
});

test("retention does nothing while off, then erases only final decisions older than the period", async () => {
  const old = new Date(Date.now() - 400 * 86_400_000).toISOString();
  const expired = await applicant("Rejected", { statusChangedOn: old });
  const recent = await applicant("Rejected", { statusChangedOn: new Date().toISOString() });
  const open = await applicant("Shortlisted", { statusChangedOn: old });
  expect(await domain.runRetention()).toBe(0);
  await expect(domain.execute("settings.update", { patch: { retentionDays: 5 } }, admin, key())).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  await domain.execute("settings.update", { patch: { retentionDays: 365 } }, admin, key());
  expect(await domain.runRetention()).toBeGreaterThanOrEqual(1);
  expect(await domain.collection("applications").countDocuments({ _id: expired.applicationId })).toBe(0);
  expect(await domain.collection("applications").countDocuments({ _id: recent.applicationId })).toBe(1);
  expect(await domain.collection("applications").countDocuments({ _id: open.applicationId })).toBe(1);
  expect(await domain.collection("staff_audit").countDocuments({ action: "applicant.erased", targetId: expired.applicationId, "detail.reason": "retention" })).toBe(1);
  await domain.execute("settings.update", { patch: { retentionDays: null } }, admin, key());
});

test("an expired offer can't be accepted until an admin extends it", async () => {
  await domain.collection("programs").updateOne({ _id: "explorer" }, { $set: { stipend: 1000, fee: 0 } });
  const { applicationId, account } = await applicant("Selected");
  const offer = await domain.execute("offer.send", { applicationId, startOn: "2026-12-01", endOn: "2027-03-01", stipend: 500, expiresInDays: 3 }, admin, key()) as any;
  expect(Date.parse(offer.expiresOn) - Date.parse(offer.sentOn)).toBe(3 * 86_400_000);
  await domain.collection("offers").updateOne({ applicationId }, { $set: { expiresOn: new Date(Date.now() - 60_000).toISOString() } });
  await expect(domain.execute("offer.accept", { applicationId }, account, key())).rejects.toMatchObject({ code: "OFFER_EXPIRED" });
  await expect(domain.execute("offer.extend", { applicationId, days: 5 }, recruiter, key())).rejects.toMatchObject({ code: "FORBIDDEN" });
  const extended = await domain.execute("offer.extend", { applicationId, days: 5 }, admin, key()) as any;
  expect(Date.parse(extended.expiresOn)).toBeGreaterThan(Date.now() + 4 * 86_400_000);
  expect((await domain.execute("offer.accept", { applicationId }, account, key()) as any).status).toBe("Accepted");
});
