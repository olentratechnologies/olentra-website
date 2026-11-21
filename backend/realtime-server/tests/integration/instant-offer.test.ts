import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { internshipTestMongoUri } from "./config";
import { connectInternDatabase, createInternshipDomain } from "./domain";
import { civilToday } from "../../src/modules/programs/schedule.mjs";
import { addCivilDays, endOfDayIst } from "../../src/modules/programs/offer-policy.mjs";

const uri = internshipTestMongoUri();
if (!uri) throw new Error("Set INTERNSHIP_TEST_MONGODB_URI for isolated internship integration tests.");
const prefix = `test_instant_${randomUUID().replaceAll("-", "")}_`, req = () => randomUUID();
let connection: any, domain: any;
const admin: any = { id: "instant-admin", role: "company", staffRole: "admin", name: "Admin", email: "instant-admin@example.test", applicationId: null, sessionVersion: 1 };
const student = (applicationId: string): any => ({ id: `intern-${applicationId}`, role: "intern", name: "Student", email: `${applicationId.toLowerCase()}@example.test`, applicationId, sessionVersion: 1 });
async function applicant(applicationId: string, status: string) {
  await domain.collection("applications").insertOne({ _id: applicationId, name: "Student", email: `${applicationId.toLowerCase()}@example.test`, status, programId: "software-engineer", program: "Software Engineer Intern", schedule: "part_time", version: 1, history: [] });
}
async function instant(applicationId: string, startOn = civilToday()) {
  const preview = await domain.execute("offer.preview", { applicationId, startOn, route: "instant" }, admin, "");
  return domain.execute("offer.send", { ...preview, stipend: 100, route: "instant" }, admin, req());
}

beforeAll(async () => {
  connection = await connectInternDatabase(uri!);
  domain = createInternshipDomain({ ...connection, prefix });
  await domain.initialize();
  await domain.collection("accounts").insertOne({ _id: admin.id, ...admin });
  await domain.collection("programs").updateOne({ _id: "software-engineer" }, { $set: { stipend: 1000 } });
  await domain.execute("settings.update", { patch: { durationSpec: { quantity: 1, unit: "months" } } }, admin, req());
}, 30000);
afterAll(async () => {
  if (!connection) return;
  for (const { name } of await connection.db.listCollections({}, { nameOnly: true }).toArray()) if (name.startsWith(prefix)) await connection.db.collection(name).drop();
  await connection.client.close();
}, 30000);

test("an instant offer selects the applicant and stays open until the start day ends", async () => {
  await applicant("OL-INSTANT-1", "Shortlisted");
  const offer = await instant("OL-INSTANT-1");
  expect(offer).toMatchObject({ status: "Sent", route: "instant", expiresOn: endOfDayIst(civilToday()) });
  const application = await domain.collection("applications").findOne({ _id: "OL-INSTANT-1" });
  expect(application.status).toBe("Selected");
  expect(application.history.map((entry: any) => entry.title)).toEqual(["Selected for an instant offer", "Instant offer sent"]);
  expect(await domain.collection("staff_audit").countDocuments({ action: "application.status", targetId: "OL-INSTANT-1" })).toBe(1);
  expect(await domain.collection("outbox").findOne({ type: "applicantStatus", "payload.applicationId": "OL-INSTANT-1", "payload.status": "instant-offer" })).toBeTruthy();
  await expect(domain.execute("offer.extend", { applicationId: "OL-INSTANT-1", days: 3 }, admin, req())).rejects.toThrow(/Instant offers stay open/);

  await domain.execute("offer.accept", { applicationId: "OL-INSTANT-1", version: 1 }, student("OL-INSTANT-1"), req());
  expect((await domain.collection("applications").findOne({ _id: "OL-INSTANT-1" })).status).toBe("Joined");
  expect(await domain.collection("interns").findOne({ applicationId: "OL-INSTANT-1" })).toMatchObject({ status: "Active", route: "instant", startOn: civilToday() });
  expect(await domain.collection("outbox").findOne({ "payload.applicationId": "OL-INSTANT-1", "payload.status": "offer-accepted" })).toBeTruthy();
}, 30000);

test("declining an instant offer leaves no intern, and past start dates are refused", async () => {
  await applicant("OL-INSTANT-2", "Applied");
  await expect(instant("OL-INSTANT-2", addCivilDays(civilToday(), -1))).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  await instant("OL-INSTANT-2", addCivilDays(civilToday(), 1));
  await domain.execute("offer.decline", { applicationId: "OL-INSTANT-2", version: 1 }, student("OL-INSTANT-2"), req());
  expect((await domain.collection("applications").findOne({ _id: "OL-INSTANT-2" })).status).toBe("Declined");
  expect(await domain.collection("interns").countDocuments({ applicationId: "OL-INSTANT-2" })).toBe(0);
  await applicant("OL-INSTANT-3", "Rejected");
  await expect(instant("OL-INSTANT-3")).rejects.toMatchObject({ code: "CONFLICT" });
}, 30000);
