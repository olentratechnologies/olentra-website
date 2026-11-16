import { afterAll, beforeAll, expect, test } from "bun:test";
import { createHash, randomUUID } from "node:crypto";
import { internshipTestMongoUri } from "./config";
import { connectInternDatabase, createInternshipDomain } from "./domain";
import { OUTBOX_MAX_ATTEMPTS, createOutbox, type OutboxRow } from "../../src/modules/outbox/outbox";

const uri = internshipTestMongoUri();
if (!uri) throw new Error("Set INTERNSHIP_TEST_MONGODB_URI for isolated internship integration tests.");
const prefix = `test_intern_outbox_${randomUUID().replaceAll("-", "")}_`;
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
let connection: Awaited<ReturnType<typeof connectInternDatabase>>;
let domain: ReturnType<typeof createInternshipDomain>;
const sent: Array<{ type: string; to: string }> = [];

beforeAll(async () => {
  connection = await connectInternDatabase(uri!);
  domain = createInternshipDomain({ ...connection, prefix });
  domain.setHooks({
    async sendApplicationConfirmation(to) { sent.push({ type: "confirmation", to }); },
    async sendMagicLink(to) { sent.push({ type: "magic-link", to }); },
  });
  await domain.initialize();
  await domain.collection("programs").updateOne({ _id: "explorer" }, { $set: { enabled: true, fee: 0, stipend: 0 } });
  await domain.collection("settings").updateOne({ _id: "program" }, { $set: { programEnabled: true } });
}, 20000);
afterAll(async () => {
  if (!connection) return;
  const names = await connection.db.listCollections({}, { nameOnly: true }).toArray();
  for (const { name } of names) if (name.startsWith(prefix)) await connection.db.collection(name).drop();
  await connection.client.close();
}, 20000);

async function apply(email: string, key: string) {
  const fileId = `FILE-${randomUUID()}`, fileToken = randomUUID();
  await domain.collection("files").insertOne({ _id: fileId, kind: "resume", status: "ready", accessTokenHash: digest(fileToken) });
  return domain.execute("application.submit", { name: "Outbox Candidate", email, linkedin: "https://www.linkedin.com/in/outbox-candidate", programId: "explorer", roleId: "build", schedule: "part_time", resumeAttachmentId: fileId, resumeAccessToken: fileToken }, null, key);
}
const rowsFor = (to: string) => domain.collection("outbox").find({ "payload.to": to }).toArray();

test("an application queues exactly one confirmation, sent only by the worker", async () => {
  const email = `outbox-${randomUUID()}@example.test`;
  const key = `outbox-apply-${randomUUID().slice(0, 8)}`;
  await apply(email, key);
  await apply(email, key).catch(() => undefined); // an idempotent retry must not queue again
  expect(await rowsFor(email)).toHaveLength(1);
  expect(sent.filter(e => e.to === email)).toHaveLength(0);
  await domain.processOutbox();
  expect(sent.filter(e => e.to === email)).toEqual([{ type: "confirmation", to: email }]);
  expect((await rowsFor(email))[0]).toMatchObject({ status: "sent", attempts: 1 });
  await domain.processOutbox();
  expect(sent.filter(e => e.to === email)).toHaveLength(1);
});

test("a repeat application queues a confirmation for the existing reference, not a sign-in link", async () => {
  const email = `outbox-dup-${randomUUID()}@example.test`;
  await apply(email, `outbox-first-${randomUUID().slice(0, 8)}`);
  await domain.collection("applications").updateOne({ email }, { $set: { status: "Selected" } });
  await expect(apply(email, `outbox-again-${randomUUID().slice(0, 8)}`)).resolves.toMatchObject({ received: true });
  expect(await domain.collection("applications").countDocuments({ email })).toBe(1);
  const rows = await rowsFor(email);
  expect(rows.map(r => r.type)).toEqual(["applicationConfirmation", "applicationConfirmation"]);
  expect(rows.map(r => r.payload.applicationId).every(id => id === rows[0].payload.applicationId)).toBe(true);
  await domain.processOutbox();
  expect(sent.filter(e => e.to === email)).toEqual([
    { type: "confirmation", to: email },
    { type: "confirmation", to: email },
  ]);
});

test("failed sends are retried with backoff and marked failed after the last attempt", async () => {
  let clock = Date.now();
  const outbox = createOutbox(connection.db.collection<OutboxRow>(`${prefix}outbox_retry`), () => clock);
  await outbox.initialize();
  await outbox.enqueue("magicLink", { to: "retry@example.test", name: "R", applicationId: "OL-1" });
  let calls = 0;
  const failing = async () => { calls++; throw new Error("provider down"); };
  for (let attempt = 1; attempt <= OUTBOX_MAX_ATTEMPTS; attempt++) {
    expect(await outbox.process(failing)).toBe(1);
    expect(await outbox.process(failing)).toBe(0); // not due again until the backoff passes
    clock += 60 * 60_000;
  }
  expect(calls).toBe(OUTBOX_MAX_ATTEMPTS);
  const [row] = await connection.db.collection<OutboxRow>(`${prefix}outbox_retry`).find().toArray();
  expect(row).toMatchObject({ status: "failed", attempts: OUTBOX_MAX_ATTEMPTS, lastError: "provider down" });
});

test("a second application with the same LinkedIn profile is flagged on both records", async () => {
  const first = `dup-a-${randomUUID()}@example.test`, second = `dup-b-${randomUUID()}@example.test`;
  const fileFor = async () => { const fileId = `FILE-${randomUUID()}`, fileToken = randomUUID(); await domain.collection("files").insertOne({ _id: fileId, kind: "resume", status: "ready", accessTokenHash: digest(fileToken) }); return { resumeAttachmentId: fileId, resumeAccessToken: fileToken }; };
  await domain.execute("application.submit", { name: "Dup One", email: first, linkedin: "https://www.linkedin.com/in/Same-Person/", programId: "explorer", roleId: "build", schedule: "part_time", ...(await fileFor()) }, null, `dup-one-${randomUUID().slice(0, 8)}`);
  await domain.execute("application.submit", { name: "Dup Two", email: second, linkedin: "https://linkedin.com/in/same-person?utm=x", programId: "explorer", roleId: "build", schedule: "part_time", ...(await fileFor()) }, null, `dup-two-${randomUUID().slice(0, 8)}`);
  const a = await domain.collection("applications").findOne({ email: first }), b = await domain.collection("applications").findOne({ email: second });
  expect(b?.possibleDuplicates).toEqual([a?._id]);
  expect(a?.possibleDuplicates).toEqual([b?._id]);
});
