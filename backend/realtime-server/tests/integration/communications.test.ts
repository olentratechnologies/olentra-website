import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import type { ClientSession } from "mongodb";
import { internshipTestMongoUri } from "./config";
import { connectInternDatabase, createInternshipDomain, DomainError, type Principal } from "./domain";
import { createCommunications } from "./communications";

const uri = internshipTestMongoUri();
if (!uri) throw new Error("Set INTERNSHIP_TEST_MONGODB_URI (or deprecated INTERN_TEST_MONGODB_URI) for the isolated Atlas integration test.");
const prefix = `test_intern_comms_${randomUUID().replaceAll("-", "")}_`;
let connection: Awaited<ReturnType<typeof connectInternDatabase>>;
let domain: ReturnType<typeof createInternshipDomain>;
let communications: ReturnType<typeof createCommunications>;
let transact: <T>(key: string, actor: Principal | null, input: unknown, fn: (session: ClientSession) => Promise<T>) => Promise<T>;
const staff: Principal = { id: "staff", role: "company", staffRole: "admin", name: "Staff", email: "staff@example.test", applicationId: null, sessionVersion: 1 };
const first: Principal = { id: "first", role: "intern", name: "First", email: "first@example.test", applicationId: "first-app", sessionVersion: 1 };
const second: Principal = { id: "second", role: "intern", name: "Second", email: "second@example.test", applicationId: "second-app", sessionVersion: 1 };
beforeAll(async () => {
  connection = await connectInternDatabase(uri!);
  domain = createInternshipDomain({ ...connection, prefix });
  await domain.initialize();
  transact = async <T>(key: string, actor: Principal | null, input: unknown, fn: (session: ClientSession) => Promise<T>) => {
    const session = connection.client.startSession(), commands = domain.collection("comms_test_commands"), id = `${actor?.id}:${key}`;
    let result!: T;
    try {
      await session.withTransaction(async () => {
        const saved = await commands.findOne({ _id: id }, { session });
        if (saved) { result = saved.result as T; return; }
        result = await fn(session);
        await commands.insertOne({ _id: id, input, result }, { session });
      });
      return result;
    } finally { await session.endSession(); }
  };
  communications = createCommunications({ collection: domain.collection, transact });
  await communications.initialize();
  await domain.collection("applications").insertMany([
    { _id: "first-app", email: first.email, status: "Joined", programId: "explorer", appliedOn: "2026-10-02", skills: ["JavaScript"] },
    { _id: "second-app", email: second.email, status: "Joined", programId: "innovator", appliedOn: "2026-10-04", skills: ["JavaScript"] },
  ]);
}, 30000);
afterAll(async () => {
  if (!connection) return;
  for (const { name } of await connection.db.listCollections({}, { nameOnly: true }).toArray()) if (name.startsWith(prefix)) await connection.db.collection(name).drop();
  await connection.client.close();
}, 30000);

test("messages, notifications, announcements and analytics respect role and ownership", async () => {
  const payload = { applicationId: "first-app", subject: "Hello", body: "Welcome to the program." };
  const message = await communications.execute("message.send", payload, staff, "message-one");
  expect((await communications.execute("message.send", payload, staff, "message-one")).id).toBe(message.id);
  expect(await domain.collection("messages").countDocuments()).toBe(1);
  await expect(communications.execute("message.send", payload, second, "message-two")).rejects.toBeInstanceOf(DomainError);
  const own = await communications.snapshot(first), other = await communications.snapshot(second);
  expect(own.messages).toHaveLength(1);
  expect(other.messages).toHaveLength(0);
  expect((await communications.execute("message.list", { applicationId: "first-app", pageSize: 1 }, first, "")).total).toBe(1);
  await expect(communications.execute("message.list", { applicationId: "first-app" }, second, "")).rejects.toBeInstanceOf(DomainError);
  expect(own.notifications).toHaveLength(1);
  const id = own.notifications[0]!.id;
  await communications.execute("notification.markRead", { ids: [id] }, second, "read-other");
  expect((await communications.snapshot(first)).notifications[0]!.unread).toBe(true);
  await communications.execute("notification.markRead", { ids: [id] }, first, "read-own");
  expect((await communications.snapshot(first)).notifications[0]!.unread).toBe(false);
  await communications.execute("announcement.send", { subject: "Explorer", message: "Team update", audience: "explorer" }, staff, "announce-one");
  expect((await communications.snapshot(first)).notifications).toHaveLength(2);
  expect((await communications.snapshot(second)).notifications).toHaveLength(0);
  expect((await communications.execute("notification.list", { pageSize: 1, page: 2 }, first, "")).items).toHaveLength(1);
  expect(await domain.collection("events").findOne({ type: "changed", applicationIds: "first-app" })).toBeTruthy();
  const analytics = await communications.execute("analytics.get", {}, staff, "");
  expect(analytics.totalApplications).toBe(2);
  expect(analytics.byTrack).toEqual({ explorer: 1, innovator: 1 });
  expect(analytics.skills).toEqual([{ name: "JavaScript", count: 2 }]);
  await expect(communications.execute("analytics.get", {}, first, "")).rejects.toBeInstanceOf(DomainError);
}, 30000);

test("settings cannot open an unconfigured track or enable unavailable integrations", async () => {
  await expect(communications.execute("settings.update", { patch: { compensationMode: "invalid" } }, staff, "settings-invalid-mode")).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  await expect(communications.execute("settings.update", { patch: { compensationMode: null } }, staff, "settings-null-mode")).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  await expect(communications.execute("settings.update", { patch: { explorerEnabled: true } }, staff, "settings-one")).rejects.toBeInstanceOf(DomainError);
  await expect(communications.execute("settings.update", { patch: { emailNotifications: true } }, staff, "settings-two")).rejects.toBeInstanceOf(DomainError);
  await expect(communications.execute("settings.update", { patch: { weeklyDigest: true } }, staff, "settings-digest")).rejects.toBeInstanceOf(DomainError);
  await domain.collection("programs").updateOne({ _id: "explorer" }, { $set: { fee: 0, stipend: 0 } });
  await communications.execute("settings.update", { patch: { explorerEnabled: true, programEnabled: true, defaultBatch: "Autumn" } }, staff, "settings-three");
  expect((await domain.collection("programs").findOne({ _id: "explorer" }))?.enabled).toBe(true);
  expect((await domain.collection("settings").findOne({ _id: "program" }))?.defaultBatch).toBe("Autumn");
  await communications.execute("settings.update", { patch: { defaultBatch: "" } }, staff, "settings-empty-batch");
  expect((await domain.collection("settings").findOne({ _id: "program" }))?.defaultBatch).toBe("");
  for (const mode of ["free", "paid", "both"]) {
    await communications.execute("settings.update", { patch: { compensationMode: mode } }, staff, `settings-mode-${mode}`);
    expect((await domain.collection("settings").findOne({ _id: "program" }))?.compensationMode).toBe(mode);
  }
  await expect(communications.execute("settings.update", { patch: { defaultBatch: "Winter" } }, first, "settings-four")).rejects.toBeInstanceOf(DomainError);
}, 30000);

test("settings validation and a mid-write error roll back every change", async () => {
  await domain.collection("accounts").insertMany([
    { _id: "staff", role: "company", name: "Staff", email: "staff@example.test" },
    { _id: "another-staff", role: "company", name: "Other", email: "duplicate@example.test" },
  ]);
  const beforeProgram = await domain.collection("programs").findOne({ _id: "explorer" });
  const beforeSettings = await domain.collection("settings").findOne({ _id: "program" });
  const beforeActivity = await domain.collection("activity").countDocuments({ title: "Program settings updated" });
  const beforeEvents = await domain.collection("events").countDocuments({ type: "changed", public: true });
  let failure: any;
  try { await communications.execute("settings.update", { patch: { explorerEnabled: false, programEnabled: false, profile: { name: "Staff", email: "duplicate@example.test" } } }, staff, "settings-rollback-duplicate"); }
  catch (error) { failure = error; }
  expect(failure?.code).toBe(11000);
  expect((await domain.collection("programs").findOne({ _id: "explorer" }))?.enabled).toBe(beforeProgram?.enabled);
  expect((await domain.collection("settings").findOne({ _id: "program" }))?.programEnabled).toBe(beforeSettings?.programEnabled);
  expect((await domain.collection("accounts").findOne({ _id: "staff" }))?.email).toBe("staff@example.test");
  expect(await domain.collection("activity").countDocuments({ title: "Program settings updated" })).toBe(beforeActivity);
  expect(await domain.collection("events").countDocuments({ type: "changed", public: true })).toBe(beforeEvents);
  expect(await domain.collection("comms_test_commands").findOne({ _id: "staff:settings-rollback-duplicate" })).toBeNull();
}, 30000);

test("the capability probe commits no activity or marker", async () => {
  const before = await domain.collection("activity").countDocuments();
  const fresh = createCommunications({ collection: domain.collection, transact });
  await fresh.initialize();
  expect(await domain.collection("activity").countDocuments()).toBe(before);
  expect(await domain.collection("activity").countDocuments({ capabilityProbe: true })).toBe(0);
}, 30000);

test("settings writes preserve idempotency and retry real transactional conflicts", async () => {
  const client = connection.client as any, original = client.bulkWrite;
  let calls = 0;
  client.bulkWrite = async function(...args: any[]) {
    calls++;
    if (calls === 1) await domain.collection("settings").updateOne({ _id: "program" }, { $set: { testConflictMarker: "committed separately" } });
    return original.apply(this, args);
  };
  const beforeEvents = await domain.collection("events").countDocuments({ type: "changed", public: true });
  const beforeActivity = await domain.collection("activity").countDocuments({ title: "Program settings updated" });
  try {
    const input = { patch: { programName: "Transactional retry" } };
    await communications.execute("settings.update", input, staff, "settings-transaction-retry");
    await communications.execute("settings.update", input, staff, "settings-transaction-retry");
    const saved = await domain.collection("settings").findOne({ _id: "program" });
    expect(saved?.programName).toBe("Transactional retry");
    if (calls) {
      expect(calls).toBeGreaterThan(1);
      expect(saved?.testConflictMarker).toBe("committed separately");
    }
    expect(await domain.collection("events").countDocuments({ type: "changed", public: true })).toBe(beforeEvents + 1);
    expect(await domain.collection("activity").countDocuments({ title: "Program settings updated" })).toBe(beforeActivity + 1);
  } finally { client.bulkWrite = original; }

}, 30000);

test("unsupported bulk-write capability uses the sequential transaction path", async () => {
  const client = connection.client as any, original = client.bulkWrite;
  let calls = 0;
  client.bulkWrite = async () => { calls++; throw new Error("bulk write unavailable"); };
  try {
    const legacy = createCommunications({ collection: domain.collection, transact });
    await legacy.initialize();
    const probeCalls = calls;
    await legacy.execute("settings.update", { patch: { programName: "Sequential fallback" } }, staff, "settings-sequential-fallback");
    expect(calls).toBe(probeCalls);
    expect((await domain.collection("settings").findOne({ _id: "program" }))?.programName).toBe("Sequential fallback");
  } finally { client.bulkWrite = original; }
}, 30000);

test("full domain retries a settings write conflict without duplicate activity", async () => {
  const admin = await domain.createTestStaff("full-domain-admin@example.test", "FullDomainPassword2026!");
  const client = connection.client as any, original = client.bulkWrite;
  let calls = 0;
  client.bulkWrite = async function(...args: any[]) {
    calls++;
    if (calls === 1) await domain.collection("settings").updateOne({ _id: "program" }, { $set: { fullDomainConflict: true } });
    return original.apply(this, args);
  };
  const beforeEvents = await domain.collection("events").countDocuments({ type: "changed", public: true });
  const beforeActivity = await domain.collection("activity").countDocuments({ title: "Program settings updated" });
  try {
    const input = { patch: { defaultBatch: "Full domain retry" } }, requestKey = "settings-full-domain-retry";
    expect(await domain.execute("settings.update", input, admin, requestKey)).toBe(true);
    expect(await domain.execute("settings.update", input, admin, requestKey)).toBe(true);
    const saved = await domain.collection("settings").findOne({ _id: "program" });
    expect(saved?.defaultBatch).toBe("Full domain retry");
    if (calls) { expect(calls).toBeGreaterThan(1); expect(saved?.fullDomainConflict).toBe(true); }
    expect(await domain.collection("events").countDocuments({ type: "changed", public: true })).toBe(beforeEvents + 1);
    expect(await domain.collection("activity").countDocuments({ title: "Program settings updated" })).toBe(beforeActivity + 1);
  } finally { client.bulkWrite = original; }
  let trackCalls = 0;
  client.bulkWrite = async function(...args: any[]) {
    trackCalls++;
    if (trackCalls === 1) await domain.collection("programs").updateOne({ _id: "innovator" }, { $set: { name: "Concurrent track rename" } });
    return original.apply(this, args);
  };
  try {
    const input = { programId: "innovator", fee: 1234, stipend: 5678, enabled: true }, key = "track-full-domain-retry";
    const before = await domain.collection("events").countDocuments({ type: "program.configure" });
    const result = await domain.execute("program.configure", input, admin, key);
    expect(await domain.execute("program.configure", input, admin, key)).toEqual(result);
    expect(result).toMatchObject({ id: "innovator", fee: 1234, stipend: 5678, enabled: true });
    if (trackCalls) { expect(trackCalls).toBeGreaterThan(1); expect(result.name).toBe("Concurrent track rename"); }
    expect((await domain.collection("programs").findOne({ _id: "innovator" }))?.stipend).toBe(5678);
    expect((await domain.collection("settings").findOne({ _id: "program" }))?.maxStipend).toBeGreaterThanOrEqual(5678);
    expect(await domain.collection("events").countDocuments({ type: "program.configure" })).toBe(before + 1);
  } finally { client.bulkWrite = original; }
}, 30000);


test("analytics cache is shared briefly and invalidation reloads updated records", async () => {
  communications.invalidateAnalytics();
  const [firstRead, concurrentRead] = await Promise.all([
    communications.execute("analytics.get", {}, staff, ""),
    communications.execute("analytics.get", {}, staff, ""),
  ]);
  expect(concurrentRead).toBe(firstRead);
  expect(await communications.execute("analytics.get", {}, staff, "")).toBe(firstRead);
  await domain.collection("applications").insertOne({ _id: "third-app", email: "third@example.test", status: "Applied", programId: "explorer", appliedOn: "2026-10-06", skills: [] });
  communications.invalidateAnalytics();
  const updated = await communications.execute("analytics.get", {}, staff, "");
  expect(updated.totalApplications).toBe(3);
  expect(updated.byTrack.explorer).toBe(2);
}, 30000);
