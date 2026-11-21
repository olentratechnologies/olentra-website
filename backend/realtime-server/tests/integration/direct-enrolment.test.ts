import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { internshipTestMongoUri } from "./config";
import { connectInternDatabase, createInternshipDomain } from "./domain";
import { civilToday } from "../../src/modules/programs/schedule.mjs";
import { addCivilDays } from "../../src/modules/programs/offer-policy.mjs";

const uri = internshipTestMongoUri();
if (!uri) throw new Error("Set INTERNSHIP_TEST_MONGODB_URI for isolated internship integration tests.");
const prefix = `test_direct_${randomUUID().replaceAll("-", "")}_`, req = () => randomUUID();
let connection: any, domain: any;
const admin: any = { id: "direct-admin", role: "company", staffRole: "admin", name: "Admin", email: "direct-admin@example.test", applicationId: null, sessionVersion: 1 };
const recruiter: any = { id: "direct-recruiter", role: "company", staffRole: "recruiter", name: "Recruiter", email: "direct-recruiter@example.test", applicationId: null, sessionVersion: 1 };
const intern = (applicationId: string): any => ({ id: `intern-${applicationId}`, role: "intern", name: "Student", email: `${applicationId}@example.test`, applicationId, sessionVersion: 1 });
async function applicant(applicationId: string, status: string) {
  await domain.collection("applications").insertOne({ _id: applicationId, name: "Student", email: `${applicationId.toLowerCase()}@example.test`, status, programId: "software-engineer", program: "Software Engineer Intern", schedule: "part_time", version: 1, history: [] });
}
async function enrol(applicationId: string, startOn = civilToday(), actor = admin) {
  const preview = await domain.execute("offer.preview", { applicationId, startOn, direct: true }, admin, "");
  return domain.execute("offer.enrollDirect", { ...preview, stipend: 100, message: "Welcome aboard", agreementNote: "Agreed in person at the campus drive" }, actor, req());
}

beforeAll(async () => {
  connection = await connectInternDatabase(uri!);
  domain = createInternshipDomain({ ...connection, prefix });
  await domain.initialize();
  await domain.collection("accounts").insertMany([{ _id: admin.id, ...admin }, { _id: recruiter.id, ...recruiter }]);
  await domain.collection("programs").updateOne({ _id: "software-engineer" }, { $set: { stipend: 1000 } });
  await domain.execute("settings.update", { patch: { durationSpec: { quantity: 1, unit: "months" }, onboardingDocuments: [{ id: "id-proof", label: "ID proof", required: true }] } }, admin, req());
}, 30000);
afterAll(async () => {
  if (!connection) return;
  for (const { name } of await connection.db.listCollections({}, { nameOnly: true }).toArray()) if (name.startsWith(prefix)) await connection.db.collection(name).drop();
  await connection.client.close();
}, 30000);

test("an admin enrols a shortlisted applicant who agreed in person, starting today", async () => {
  await applicant("OL-DIRECT-1", "Shortlisted");
  const preview = await domain.execute("offer.preview", { applicationId: "OL-DIRECT-1", startOn: civilToday(), direct: true }, admin, "");
  expect(preview).toMatchObject({ direct: true, expiresOn: null });
  await expect(enrol("OL-DIRECT-1", civilToday(), recruiter)).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(domain.execute("offer.enrollDirect", { ...preview, stipend: 100, agreementNote: "" }, admin, req())).rejects.toMatchObject({ code: "INVALID_REQUEST" });

  const result = await enrol("OL-DIRECT-1");
  expect(result).toMatchObject({ status: "Accepted", route: "direct", agreementNote: "Agreed in person at the campus drive", expiresOn: null });
  const application = await domain.collection("applications").findOne({ _id: "OL-DIRECT-1" });
  expect(application.status).toBe("Joined");
  expect(application.statusChangedOn).toBeTruthy();
  expect(application.history.map((entry: any) => entry.title)).toEqual(["Internship offer accepted in person", "Joined directly"]);
  expect(await domain.collection("interns").findOne({ applicationId: "OL-DIRECT-1" })).toMatchObject({ status: "Active", route: "direct", startOn: civilToday() });
  expect(await domain.collection("offer_versions").findOne({ applicationId: "OL-DIRECT-1" })).toMatchObject({ decision: "Accepted", acceptedBy: admin.id });
  expect(await domain.collection("staff_audit").countDocuments({ action: "application.enrolledDirectly", targetId: "OL-DIRECT-1" })).toBe(1);
  expect(await domain.collection("outbox").findOne({ type: "applicantStatus", "payload.applicationId": "OL-DIRECT-1", "payload.status": "direct-enrolled" })).toBeTruthy();
  // Enrolling twice is refused.
  await expect(enrol("OL-DIRECT-1")).rejects.toMatchObject({ code: "CONFLICT" });
}, 30000);

test("direct enrolment can't backdate, and replaces an open offer", async () => {
  await applicant("OL-DIRECT-2", "Selected");
  await expect(enrol("OL-DIRECT-2", addCivilDays(civilToday(), -1))).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  const startOn = addCivilDays(civilToday(), 20);
  const sentPreview = await domain.execute("offer.preview", { applicationId: "OL-DIRECT-2", startOn, expiresInDays: 3 }, admin, "");
  await domain.execute("offer.send", { ...sentPreview, stipend: 100, expiresInDays: 3 }, admin, req());
  const result = await enrol("OL-DIRECT-2", startOn);
  expect(result).toMatchObject({ status: "Accepted", currentVersion: 2, route: "direct" });
  expect((await domain.collection("offer_versions").findOne({ applicationId: "OL-DIRECT-2", version: 1 })).decision).toBe("Superseded");
  await expect(enrol("OL-DIRECT-3-missing")).rejects.toMatchObject({ code: "NOT_FOUND" });
  await applicant("OL-DIRECT-4", "Rejected");
  await expect(enrol("OL-DIRECT-4")).rejects.toMatchObject({ code: "CONFLICT" });
}, 30000);

test("a direct intern uploads documents after joining and staff mark onboarding complete", async () => {
  await applicant("OL-DIRECT-5", "Applied");
  await enrol("OL-DIRECT-5");
  await expect(domain.execute("onboarding.approve", { applicationId: "OL-DIRECT-5" }, admin, req())).rejects.toThrow(/ID proof/);
  await domain.collection("files").insertOne({ _id: "direct-file", status: "ready", ownerApplicationId: "OL-DIRECT-5", name: "id.pdf" });
  await domain.execute("onboarding.document", { applicationId: "OL-DIRECT-5", docId: "id-proof", attachmentId: "direct-file" }, intern("OL-DIRECT-5"), req());
  await domain.execute("onboarding.reviewDocument", { applicationId: "OL-DIRECT-5", docId: "id-proof", decision: "Approved" }, admin, req());
  const completed = await domain.execute("onboarding.approve", { applicationId: "OL-DIRECT-5" }, admin, req());
  expect(completed.status).toBe("Approved");
  expect(await domain.collection("interns").countDocuments({ applicationId: "OL-DIRECT-5" })).toBe(1);
}, 30000);
