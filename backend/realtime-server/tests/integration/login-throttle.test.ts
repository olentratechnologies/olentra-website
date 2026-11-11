import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import type { Collection } from "mongodb";
import { internshipTestMongoUri } from "./config";
import { connectInternDatabase } from "./domain";
import { createLoginThrottle, mongoAttemptStore } from "../../src/modules/auth/login-throttle";

const uri = internshipTestMongoUri();
if (!uri) throw new Error("Set INTERNSHIP_TEST_MONGODB_URI for isolated throttle integration tests.");
const name = `test_login_throttle_${randomUUID().replaceAll("-", "")}`;
let connection: Awaited<ReturnType<typeof connectInternDatabase>>;
let collection: Collection<any>;
beforeAll(async () => {
  connection = await connectInternDatabase(uri!);
  collection = connection.db.collection(name);
  await mongoAttemptStore(collection).initialize();
}, 30000);
afterAll(async () => {
  if (!connection) return;
  await collection.drop();
  await connection.client.close();
}, 30000);

test("separate service instances atomically cap a concurrent burst and release denied partial admissions", async () => {
  const instances = Array.from({ length: 3 }, () => createLoginThrottle({ store: mongoAttemptStore(collection), perAccountAndIp: 4, perAccount: 100, perIp: 100 }));
  const results = await Promise.allSettled(Array.from({ length: 40 }, (_, index) => instances[index % instances.length]!.reserve("burst@example.test", "192.0.2.1")));
  const admitted = results.filter(result => result.status === "fulfilled");
  expect(admitted).toHaveLength(4);
  expect(results.filter(result => result.status === "rejected" && result.reason.code === "RATE_LIMITED")).toHaveLength(36);
  for (const row of await collection.find({}).toArray()) expect(row.attempts).toHaveLength(4);
  // Reservations themselves store only hashes and random IDs, never the address.
  const saved = JSON.stringify(await collection.find({}).toArray());
  expect(saved).not.toContain("burst@example.test");
  expect(saved).not.toContain("192.0.2.1");
  for (const result of admitted) if (result.status === "fulfilled") await instances[0]!.recordSuccess(result.value);
  for (const row of await collection.find({}).toArray()) expect(row.attempts).toHaveLength(0);
}, 30000);

test("Mongo success cleanup preserves pending checks and expired reservations no longer count", async () => {
  await collection.deleteMany({});
  let now = Date.now();
  const throttle = createLoginThrottle({ store: mongoAttemptStore(collection), perAccountAndIp: 2, now: () => now });
  const pending = await throttle.reserve("pending@example.test", "192.0.2.2");
  await throttle.recordFailure(await throttle.reserve("pending@example.test", "192.0.2.2"));
  await expect(throttle.reserve("pending@example.test", "192.0.2.2")).rejects.toMatchObject({ code: "RATE_LIMITED" });
  now += 15 * 60_000 + 1;
  const successor = await throttle.reserve("pending@example.test", "192.0.2.2");
  await throttle.recordSuccess(pending);
  // A late completion for the expired attempt cannot remove a newer pending one.
  const pair = await collection.findOne({ _id: successor.pair });
  expect(pair.attempts.map((attempt: any) => attempt.id)).toEqual([successor.id]);
}, 30000);
