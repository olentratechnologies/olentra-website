import { createIntakeCheck } from "./modules/programs/intake-cache";
import { connectInternDatabase, createInternshipDomain } from "./app/command-dispatcher";
import { createRealtimeServer } from "./app/create-service";
import { readRealtimeEnvironment } from "./config/env";
import { loadJwtSecret } from "./config/jwt-secret";
import { logger } from "./infrastructure/observability/logger";

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
  let stage = "MongoDB connection";
  try {
    connection = await connectInternDatabase(environment.mongodbUri);
    stage = "internship module setup (including file storage)";
    const site = environment.siteOrigin;
    // Cached so a burst of applications doesn't call the website once per submit.
    const intakeOpen = createIntakeCheck(async () => {
      const response = await fetch(new URL("/api/site-features", site), { signal: AbortSignal.timeout(3000) });
      if (!response.ok) throw new Error(`Site features answered ${response.status}`);
      const state = await response.json() as { features?: { internships?: boolean; applications?: boolean } };
      return state.features?.internships === true && state.features?.applications === true;
    });
    const domain = createInternshipDomain({ ...connection, intakeOpen });
    await realtime.attachInternship({ domain, secret: await loadJwtSecret(environment.jwtSecret), siteOrigin: site });
    retryDelay = 1000;
    logger.info("Internship modules attached", { mongodb: "connected" });
  } catch (error) {
    logger.warn("Internship modules unavailable; retrying initialization", { stage, error, retryMs: retryDelay });
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
