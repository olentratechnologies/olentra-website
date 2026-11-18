/** Local intake benchmark with synthetic resumes, bot checks and email delivery. */
import { randomBytes, randomUUID } from "node:crypto";
import { connectInternDatabase, createInternshipDomain } from "../src/app/command-dispatcher";
import { createInternshipServer } from "../src/app/create-service";
import type { createInternshipMailer } from "../src/infrastructure/email/mailer";

const uri = process.env.INTERNSHIP_TEST_MONGODB_URI;
if (!uri || !/^mongodb:\/\/127\.0\.0\.1:\d+\/olentra_test(?:\?|$)/.test(uri)) {
  throw new Error("Use a disposable replica set on loopback and the olentra_test database.");
}
const origin = "http://intake.example.test";
const connection = await connectInternDatabase(uri);
const prefix = "bench_intake_" + randomUUID().slice(0, 8) + "_";
const domain = createInternshipDomain({ ...connection, prefix });
const sockets = new Set<WebSocket>();
const originalFetch = globalThis.fetch;
const redeemed = new Set<string>();
const secret = "isolated-intake-benchmark-signing-secret";
let server: Awaited<ReturnType<typeof createInternshipServer>> | undefined;
let delivered = 0;
const latestTotal = new Map<WebSocket, number>();
const mailer = {
  async sendApplicationConfirmation() { delivered++; return { ok: true, delivered: true }; },
} as unknown as ReturnType<typeof createInternshipMailer>;

function percentile(values: number[], proportion = .95) {
  const sorted = values.toSorted((a, b) => a - b);
  return Math.round(sorted[Math.ceil(sorted.length * proportion) - 1] ?? 0);
}

async function connect(base: string, onEvent?: (message: any, ws: WebSocket) => void) {
  const ws = new WebSocket(base.replace("http", "ws") + "/ws/intern", { headers: { origin } });
  sockets.add(ws);
  ws.addEventListener("close", () => sockets.delete(ws), { once: true });
  const pending = new Map<string, { resolve: (value: any) => void; reject: (reason: unknown) => void }>();
  ws.onmessage = (event) => {
    const reply = JSON.parse(String(event.data));
    if (reply.type === "event") onEvent?.(reply, ws);
    const request = pending.get(reply.id);
    if (!request) return;
    pending.delete(reply.id);
    if (reply.ok) request.resolve(reply.data);
    else request.reject(new Error(reply.error?.code || "RPC failed"));
  };
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Socket connection timed out")), 10000);
    ws.onopen = () => { clearTimeout(timer); resolve(); };
    ws.onerror = () => { clearTimeout(timer); reject(new Error("Socket connection failed")); };
  });
  return {
    ws,
    call(method: string, params = {}, write = false) {
      const id = randomUUID();
      return new Promise<any>((resolve, reject) => {
        const timer = setTimeout(() => { pending.delete(id); reject(new Error("RPC timed out")); }, 15000);
        pending.set(id, {
          resolve: (x) => { clearTimeout(timer); resolve(x); },
          reject: (x) => { clearTimeout(timer); reject(x); },
        });
        ws.send(JSON.stringify({ type: "request", method, params, id, ...(write && { idempotencyKey: id.replaceAll("-", "") }) }));
      });
    },
  };
}

async function post(url: string, headers: Record<string, string>, body?: Uint8Array<ArrayBuffer>) {
  const response = await fetch(url, { method: "POST", headers: { origin, ...headers }, body, signal: AbortSignal.timeout(15000) });
  const result = await response.json() as any;
  if (!response.ok || !result.ok) throw new Error(result.error?.code || String(response.status));
  return result.data;
}

try {
  process.env.INTERNSHIP_TURNSTILE_SECRET_KEY = "local-synthetic-only";
  globalThis.fetch = Object.assign((input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    if (input !== "https://challenges.cloudflare.com/turnstile/v0/siteverify") return originalFetch(input, init);
    const token = (init?.body as URLSearchParams)?.get("response") || "";
    const success = token.startsWith("benchmark-") && !redeemed.has(token);
    if (success) redeemed.add(token);
    return Promise.resolve(Response.json({ success, hostname: "intake.example.test", action: "resume_upload" }));
  }, originalFetch);
  server = await createInternshipServer({ domain, secret, port: 0, allowedOrigins: [origin], siteOrigin: origin, mailer });
  await domain.collection("programs").updateOne({ _id: "explorer" }, { $set: { enabled: true, fee: 0, stipend: 0 } });
  await domain.collection("settings").updateOne({ _id: "program" }, { $set: { programEnabled: true, compensationMode: "free" } });
  domain.invalidatePublicData();
  const base = "http://127.0.0.1:" + server.server.port;
  const viewerCount = 500;
  for (let start = 0; start < viewerCount; start += 50) {
    await Promise.all(Array.from({ length: 50 }, async () => {
      const viewer = await connect(base, (message, socket) => {
        if (message.event === "intern.insights") latestTotal.set(socket, message.data.totals.applied);
      });
      await viewer.call("insights.subscribe");
    }));
  }

  const resumeHeaders = { "x-file-kind": "resume", "x-file-name": "synthetic.pdf", "content-type": "application/pdf" };
  const fixture = (size: number) => {
    const file = new Uint8Array(randomBytes(size));
    file.set(new TextEncoder().encode("%PDF-1.7\n"));
    return file;
  };
  const normalResume = fixture(512 * 1024);
  const maximumResume = fixture(5 * 1024 * 1024);
  async function expectFailure(request: Promise<unknown>, code: string) {
    try { await request; } catch (error) {
      if (error instanceof Error && error.message === code) return;
      throw error;
    }
    throw new Error("Expected " + code);
  }
  await expectFailure(post(base + "/intern/files", resumeHeaders, normalResume), "FORBIDDEN");
  const testChallenge = { "x-resume-challenge": "benchmark-replay-check" };
  const testGrant = await post(base + "/intern/files/resume-grant", testChallenge);
  await expectFailure(post(base + "/intern/files/resume-grant", testChallenge), "FORBIDDEN");
  const testHeaders = { ...resumeHeaders, "x-resume-grant": testGrant.token };
  for (let attempt = 0; attempt < 3; attempt++) {
    await expectFailure(post(base + "/intern/files", testHeaders, new Uint8Array([0])), "UNSUPPORTED_MEDIA_TYPE");
  }
  await expectFailure(post(base + "/intern/files", testHeaders, normalResume), "RATE_LIMITED");
  console.log(JSON.stringify({ authorizationChecks: ["missing grant blocked", "challenge replay blocked", "fourth upload attempt blocked"] }));

  let totalAccepted = 0;
  for (const [workers, samples, file] of [[1, 20, normalResume], [5, 30, normalResume], [15, 60, normalResume], [5, 20, maximumResume]] as const) {
    const upload: number[] = [], submit: number[] = [], total: number[] = [];
    const failures: Record<string, number> = {};
    const start = performance.now();
    await Promise.all(Array.from({ length: workers }, async (_, worker) => {
      const applicant = await connect(base);
      try {
        for (let i = worker; i < samples; i += workers) {
          try {
            const began = performance.now();
            const id = randomUUID();
            const grant = await post(base + "/intern/files/resume-grant", { "x-resume-challenge": "benchmark-" + id });
            const uploading = performance.now();
            const attachment = await post(base + "/intern/files", { ...resumeHeaders, "x-resume-grant": grant.token }, file);
            const submitting = performance.now();
            upload.push(submitting - uploading);
            await applicant.call("application.submit", {
              name: "Synthetic Applicant", email: id + "@example.test", programId: "explorer", roleId: "build", schedule: "part_time",
              linkedin: "https://linkedin.com/in/" + id, resumeAttachmentId: attachment.id, resumeAccessToken: attachment.accessToken,
            }, true);
            submit.push(performance.now() - submitting);
            total.push(performance.now() - began);
          } catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            failures[reason] = (failures[reason] || 0) + 1;
          }
        }
      } finally { applicant.ws.close(); }
    }));
    const elapsed = performance.now() - start;
    totalAccepted += total.length;
    console.log(JSON.stringify({
      workers, samples, sizeKiB: file.byteLength / 1024, succeeded: total.length, failures, elapsedMs: Math.round(elapsed),
      applicationsPerSecond: Math.round(total.length * 10000 / elapsed) / 10,
      p95Ms: { upload: percentile(upload), submit: percentile(submit), total: percentile(total) },
    }));
  }
  const drainStarted = performance.now();
  while (performance.now() - drainStarted < 12000 && (delivered < totalAccepted || [...latestTotal.values()].filter(value => value === totalAccepted).length < viewerCount)) await Bun.sleep(50);
  console.log(JSON.stringify({
    persisted: await domain.collection("applications").countDocuments(), deliveredToStub: delivered,
    connectedViewers: sockets.size, viewersWithFinalTotal: [...latestTotal.values()].filter(value => value === totalAccepted).length,
    drainAndBroadcastWaitMs: Math.round(performance.now() - drainStarted), processRssMiB: Math.round(process.memoryUsage().rss / 1048576),
  }));
  if (totalAccepted !== 130 || delivered !== totalAccepted || [...latestTotal.values()].filter(value => value === totalAccepted).length !== viewerCount) process.exitCode = 1;
} finally {
  for (const ws of sockets) ws.terminate();
  await server?.stop();
  globalThis.fetch = originalFetch;
  for (const { name } of await connection.db.listCollections({}, { nameOnly: true }).toArray()) {
    if (name.startsWith(prefix)) await connection.db.collection(name).drop();
  }
  await connection.client.close();
}
