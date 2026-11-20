import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { internshipTestMongoUri } from "./config";
import { connectInternDatabase, createInternshipDomain } from "./domain";
import { civilToday } from "../../src/modules/programs/schedule.mjs";
import { addCivilDays, decisionDeadline } from "../../src/modules/programs/offer-policy.mjs";

const uri = internshipTestMongoUri();
if (!uri) throw new Error("Set INTERNSHIP_TEST_MONGODB_URI for isolated internship integration tests.");
const prefix = `test_offer_policy_${randomUUID().replaceAll("-", "")}_`, req = () => randomUUID();
let connection: any, domain: any;
const admin: any = { id: "policy-admin", role: "company", staffRole: "admin", name: "Admin", email: "policy-admin@example.test", applicationId: null, sessionVersion: 1 };
const intern = (applicationId: string): any => ({ id: `intern-${applicationId}`, role: "intern", name: "Student", email: `${applicationId}@example.test`, applicationId, sessionVersion: 1 });
const today = () => civilToday();
const inDays = (days: number) => addCivilDays(today(), days);
async function selected(applicationId: string) {
  await domain.collection("applications").insertOne({ _id: applicationId, name: "Student", email: `${applicationId}@example.test`, status: "Selected", programId: "software-engineer", program: "Software Engineer Intern", schedule: "part_time", version: 1, history: [] });
}
async function send(applicationId: string, startOn: string, expiresInDays: number) {
  const preview = await domain.execute("offer.preview", { applicationId, startOn, expiresInDays }, admin, "");
  return domain.execute("offer.send", { ...preview, stipend: 100, expiresInDays }, admin, req());
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

test("the lead time defaults to 3 days and is a program setting", async () => {
  expect((await domain.publicData()).settings.onboardingLeadDays).toBe(3);
  expect((await domain.collection("settings").findOne({ _id: "program" })).onboardingLeadDays).toBe(3);
  await expect(domain.execute("settings.update", { patch: { onboardingLeadDays: 31 } }, admin, req())).rejects.toMatchObject({ code: "INVALID_REQUEST" });
});

test("an offer must close at least the lead time before the start date", async () => {
  await selected("OL-POLICY-1");
  const startOn = inDays(6);
  // Open for 7 days would run past the start date.
  await expect(domain.execute("offer.preview", { applicationId: "OL-POLICY-1", startOn, expiresInDays: 7 }, admin, "")).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  await expect(domain.execute("offer.preview", { applicationId: "OL-POLICY-1", startOn, expiresInDays: 4 }, admin, "")).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  // Exactly 3 days between the deadline day and the start date is allowed.
  const preview = await domain.execute("offer.preview", { applicationId: "OL-POLICY-1", startOn, expiresInDays: 3 }, admin, "");
  expect(preview).toMatchObject({ leadDays: 3, maxOpenDays: 3 });
  const offer = await send("OL-POLICY-1", startOn, 3);
  expect(offer.expiresOn).toBe(decisionDeadline(offer.sentOn, 3));
  // Extending would push the deadline into the lead time, so staff must revise the schedule instead.
  await expect(domain.execute("offer.extend", { applicationId: "OL-POLICY-1", days: 5 }, admin, req())).rejects.toThrow(/Revise schedule/);
});

test("extensions inside the window are allowed and re-arm the reminder", async () => {
  await selected("OL-POLICY-2");
  await send("OL-POLICY-2", inDays(20), 3);
  await domain.collection("offers").updateOne({ applicationId: "OL-POLICY-2" }, { $set: { reminderSentFor: "x" } });
  const extended = await domain.execute("offer.extend", { applicationId: "OL-POLICY-2", days: 10 }, admin, req());
  expect(extended.expiresOn).toBe(decisionDeadline(extended.extendedOn, 10));
  expect(extended.reminderSentFor).toBeUndefined();
  expect(extended.previousExpiresOn).toBeTruthy();
});

test("nobody accepts or onboards after the start date has passed", async () => {
  await selected("OL-POLICY-3");
  await send("OL-POLICY-3", inDays(20), 3);
  // An offer sent before the policy existed, whose start date has already gone by.
  await domain.collection("offers").updateOne({ applicationId: "OL-POLICY-3" }, { $set: { startOn: inDays(-1) } });
  await expect(domain.execute("offer.accept", { applicationId: "OL-POLICY-3", version: 1 }, intern("OL-POLICY-3"), req())).rejects.toMatchObject({ code: "START_PASSED" });

  await selected("OL-POLICY-4");
  await send("OL-POLICY-4", inDays(20), 3);
  await domain.execute("offer.accept", { applicationId: "OL-POLICY-4", version: 1 }, intern("OL-POLICY-4"), req());
  await domain.collection("onboarding").insertOne({ _id: "onboarding-policy-4", applicationId: "OL-POLICY-4", status: "Submitted", documents: {} });
  await domain.collection("offers").updateOne({ applicationId: "OL-POLICY-4" }, { $set: { startOn: inDays(-1) } });
  await expect(domain.execute("onboarding.approve", { applicationId: "OL-POLICY-4" }, admin, req())).rejects.toThrow(/start date has passed/);
  expect(await domain.collection("interns").countDocuments({ applicationId: "OL-POLICY-4" })).toBe(0);
});

test("a revision that moves the start date follows the same rule", async () => {
  await selected("OL-POLICY-5");
  await send("OL-POLICY-5", inDays(20), 3);
  await domain.execute("offer.accept", { applicationId: "OL-POLICY-5", version: 1 }, intern("OL-POLICY-5"), req());
  await expect(domain.execute("offer.preview", { applicationId: "OL-POLICY-5", startOn: inDays(2), revising: true, expiresInDays: 1 }, admin, "")).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  const revised = await domain.execute("offer.preview", { applicationId: "OL-POLICY-5", startOn: inDays(25), revising: true, expiresInDays: 5 }, admin, "");
  const result = await domain.execute("offer.revise", { ...revised, expiresInDays: 5, reason: "Moved to the next start date" }, admin, req());
  expect(result.pendingRevision.expiresOn).toBe(decisionDeadline(result.pendingRevision.sentOn, 5));
});
