import { randomUUID } from "node:crypto";
import { internshipTestMongoUri } from "../src/config/env";
import { connectInternDatabase, createInternshipDomain, type Principal } from "../src/app/command-dispatcher";

// A small, repeatable baseline, not a production capacity claim. All records
// are created in unique collections and removed when the run finishes.
const uri = internshipTestMongoUri();
if (!uri) throw new Error("Set INTERNSHIP_TEST_MONGODB_URI (or deprecated INTERN_TEST_MONGODB_URI) for the isolated benchmark.");
const connection = await connectInternDatabase(uri);
const prefix = `bench_intern_${randomUUID().replaceAll("-", "")}_`;
const domain = createInternshipDomain({ ...connection, prefix });
const staff: Principal = { id: "benchmark-staff", role: "company", staffRole: "admin", name: "Benchmark", email: "benchmark@example.test", applicationId: null, sessionVersion: 1 };
try {
  await domain.initialize();
  await domain.collection("applications").insertMany(Array.from({ length: 1000 }, (_, i) => ({ _id: `bench-${i}`, name: `Applicant ${i}`, email: `benchmark-${i}@example.test`, programId: "software-engineer", status: i % 3 ? "Applied" : "Under Review", appliedOn: "2026-01-01" })));
  const samples: number[] = [], concurrency = 10, requests = 50;
  const memoryBefore = process.memoryUsage().rss;
  const started = performance.now();
  await Promise.all(Array.from({ length: concurrency }, async (_, worker) => {
    for (let n = worker; n < requests; n += concurrency) {
      const before = performance.now();
      await domain.execute("application.list", { page: (n % 5) + 1, pageSize: 20 }, staff);
      samples.push(performance.now() - before);
    }
  }));
  samples.sort((a, b) => a - b);
  const percentile = (n: number) => Math.round(samples[Math.ceil(samples.length * n) - 1]!);
  console.info(JSON.stringify({ records: 1000, requests, concurrency, elapsedMs: Math.round(performance.now() - started), p50Ms: percentile(.5), p95Ms: percentile(.95), rssBeforeMiB: Math.round(memoryBefore / 1048576), rssAfterMiB: Math.round(process.memoryUsage().rss / 1048576) }, null, 2));
} finally {
  for (const { name } of await connection.db.listCollections({}, { nameOnly: true }).toArray()) if (name.startsWith(prefix)) await connection.db.collection(name).drop();
  await connection.client.close();
}
