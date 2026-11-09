import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { connectInternDatabase, createInternshipDomain } from "./app/command-dispatcher";
import { createRealtimeServer } from "./app/create-service";
import { readRealtimeEnvironment } from "./config/env";
import { logger } from "./infrastructure/observability/logger";

async function jwtSecret(configured?: string) {
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") throw new Error("Set INTERNSHIP_JWT_SECRET to at least 32 random bytes in production.");
  const directory = path.resolve(".data");
  const file = path.join(directory, "intern-jwt-secret");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  try { await writeFile(file, randomBytes(48).toString("base64url"), { flag: "wx", mode: 0o600 }); }
  catch (error: any) { if (error.code !== "EEXIST") throw error; }
  return (await readFile(file, "utf8")).trim();
}

const environment = readRealtimeEnvironment();
const realtime = createRealtimeServer({
  hostname: environment.host,
  port: environment.port,
  allowedOrigins: environment.allowedOrigins,
  presenceBroadcastIntervalMs: environment.presenceBroadcastIntervalMs,
  presenceLog: environment.presenceLog,
});

logger.info("Realtime server listening", {
  url: realtime.server.url.toString(),
  internship: "initializing asynchronously",
});

let connection: Awaited<ReturnType<typeof connectInternDatabase>> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let retryDelay = 1000;
let attachInFlight = false;
let stopped = false;

function scheduleInternshipRetry(delay: number) {
  if (stopped || retryTimer) return;
  retryTimer = setTimeout(() => {
    retryTimer = undefined;
    void initializeInternship();
  }, delay);
  retryTimer.unref?.();
}

async function initializeInternship() {
  if (stopped || attachInFlight) return;
  if (!environment.mongodbUri) {
    logger.warn("Internship modules unavailable; set INTERNSHIP_MONGODB_URI to enable them");
    scheduleInternshipRetry(30000);
    return;
  }

  attachInFlight = true;
  try {
    connection = await connectInternDatabase(environment.mongodbUri);
    const site = environment.siteOrigin;
    const domain = createInternshipDomain({ ...connection, intakeOpen: async () => {
      try {
        const response = await fetch(new URL("/api/site-features", site), { signal: AbortSignal.timeout(3000) });
        const state = await response.json() as { features?: { internships?: boolean; applications?: boolean } };
        return response.ok && state.features?.internships === true && state.features?.applications === true;
      } catch { return false; }
    } });
    await realtime.attachInternship({ domain, secret: await jwtSecret(environment.jwtSecret), siteOrigin: site });
    retryDelay = 1000;
    logger.info("Internship modules attached", { mongodb: "connected" });
  } catch (error) {
    logger.warn("Internship modules unavailable; retrying MongoDB initialization", { error, retryMs: retryDelay });
    await connection?.client.close().catch(() => {});
    connection = null;
    scheduleInternshipRetry(retryDelay);
    retryDelay = Math.min(retryDelay * 2, 30000);
  } finally {
    attachInFlight = false;
  }
}

void initializeInternship();

let shutdown: Promise<void> | undefined;
for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => {
  shutdown ||= (async () => {
    stopped = true;
    if (retryTimer) clearTimeout(retryTimer);
    try {
      await realtime.stop();
      await connection?.client.close();
      logger.info("Realtime server stopped", { signal });
    } catch (error) {
      logger.error("Graceful shutdown failed", { signal, error });
      process.exitCode = 1;
    }
  })();
});
