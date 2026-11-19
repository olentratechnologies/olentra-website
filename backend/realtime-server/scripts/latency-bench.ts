import { randomUUID } from "node:crypto";
import { internshipEnv, internshipTestMongoUri } from "../src/config/env";
import { connectInternDatabase, createInternshipDomain } from "../src/app/command-dispatcher";
import { createInternshipServer } from "../src/app/create-service";

// This benchmark uses its own unique collection prefix and local ephemeral
// listener. It never creates accounts or changes settings in production data.
const uri = internshipTestMongoUri();
if (!uri) throw new Error("Set INTERNSHIP_TEST_MONGODB_URI (or deprecated INTERN_TEST_MONGODB_URI) for the isolated latency benchmark.");
const prefix = `bench_intern_latency_${randomUUID().replaceAll("-", "")}_`;
const samples = Math.max(2, Math.min(50, Number(internshipEnv("INTERNSHIP_BENCH_SAMPLES", "INTERN_BENCH_SAMPLES")) || 8));
const timings: Record<string, number[]> = Object.fromEntries(["login", "socketConnect", "socketAuthenticate", "snapshot", "loginToSnapshot", "configureProgram", "saveSettings"].map(name => [name, []]));
const currentRss = () => Math.round(process.memoryUsage().rss / 1048576 * 10) / 10;
const connection = await connectInternDatabase(uri);
const domain = createInternshipDomain({ ...connection, prefix });
let instance: Awaited<ReturnType<typeof createInternshipServer>> | undefined;
const sockets: WebSocket[] = [];
const rssStart = currentRss();
const started = performance.now();
const password = "IsolatedBenchmarkPassword2026!";
const email = "benchmark-admin@example.test";
const context = "isolatedbenchmarkcontext";
const timed = async <T>(name: string, task: () => Promise<T>): Promise<T> => { const start = performance.now(); const result = await task(); timings[name]!.push(performance.now() - start); return result; };

async function openSocket(base: string) {
  const ws = new WebSocket(base.replace("http:", "ws:") + "/ws/intern"); sockets.push(ws);
  const pending = new Map<string, { resolve: (data: any) => void; reject: (error: Error) => void }>();
  ws.onmessage = event => {
    const frame = JSON.parse(String(event.data));
    if (frame.type !== "response") return;
    const request = pending.get(frame.id); if (!request) return;
    pending.delete(frame.id); frame.ok ? request.resolve(frame.data) : request.reject(new Error(frame.error?.code || "Request failed"));
  };
  await new Promise<void>((resolve, reject) => { ws.onopen = () => resolve(); ws.onerror = () => reject(new Error("Could not connect to benchmark listener.")); });
  const request = (method: string, params: Record<string, unknown> = {}, write = false) => new Promise<any>((resolve, reject) => {
    const id = randomUUID();
    const timer = setTimeout(() => { pending.delete(id); reject(new Error("Benchmark request timed out.")); }, 20000);
    pending.set(id, { resolve: data => { clearTimeout(timer); resolve(data); }, reject: error => { clearTimeout(timer); reject(error); } });
    ws.send(JSON.stringify({ type: "request", id, method, params, ...(write ? { idempotencyKey: randomUUID().replaceAll("-", "") } : {}) }));
  });
  return { ws, request };
}

function stats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = (value: number) => Math.round(sorted[Math.ceil(sorted.length * value) - 1]!);
  return { p50Ms: percentile(0.5), p95Ms: percentile(0.95), minMs: Math.round(sorted[0]!), maxMs: Math.round(sorted[sorted.length - 1]!) };
}

try {
  instance = await createInternshipServer({ domain, secret: "latency-benchmark-secret-at-least-32-bytes", port: 0 });
  const base = `http://127.0.0.1:${instance.server.port}`;
  await domain.createTestStaff(email, password, "Benchmark staff");
  for (let index = 0; index < samples; index++) {
    const journey = performance.now();
    const login = await timed("login", async () => {
      const response = await fetch(base + "/intern/auth/login", { method: "POST", headers: { "content-type": "application/json", "x-intern-context": context }, body: JSON.stringify({ email, password }) });
      const body = await response.json() as any;
      if (!response.ok || !body.ok) throw new Error("Benchmark login failed.");
      return { token: body.data.token as string, cookie: response.headers.get("set-cookie")?.split(";")[0] || "" };
    });
    const socket = await timed("socketConnect", () => openSocket(base));
    await timed("socketAuthenticate", () => socket.request("auth.authenticate", { token: login.token }));
    await timed("snapshot", () => socket.request("intern.snapshot"));
    timings.loginToSnapshot!.push(performance.now() - journey);
    await timed("configureProgram", () => socket.request("program.configure", { programId: "software-engineer", fee: 0, stipend: 0, enabled: false }, true));
    await timed("saveSettings", () => socket.request("settings.update", { patch: { programName: "Latency benchmark" } }, true));
    socket.ws.close();
    const logout = await fetch(base + "/intern/auth/logout", { method: "POST", headers: { "x-intern-context": context, cookie: login.cookie, authorization: `Bearer ${login.token}` } });
    if (!logout.ok) throw new Error("Benchmark session cleanup failed.");
  }
  console.log(JSON.stringify({ workload: { samples, data: "one synthetic staff account, two closed programs, no applications", concurrency: 1, database: "configured MongoDB; isolated collection prefix", transport: "local HTTP and WebSocket with remote MongoDB" }, timing: Object.fromEntries(Object.entries(timings).map(([name, values]) => [name, stats(values)])), elapsedMs: Math.round(performance.now() - started), rssBeforeMiB: rssStart, rssAfterMiB: currentRss() }, null, 2));
} finally {
  for (const socket of sockets) socket.terminate();
  await instance?.stop();
  for (const { name } of await connection.db.listCollections({}, { nameOnly: true }).toArray()) if (name.startsWith(prefix)) await connection.db.collection(name).drop();
  await connection.client.close();
}
