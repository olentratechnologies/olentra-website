const warnedLegacyVariables = new Set<string>();

export type RealtimeEnvironment = {
  port: number;
  host: string;
  allowedOrigins: string[];
  presenceBroadcastIntervalMs: number;
  presenceLog: boolean;
  siteOrigin: string;
  mongodbUri?: string;
  jwtSecret?: string;
};

export type InternshipEnvironment = RealtimeEnvironment & {
  mongodbUri: string;
};

function readEnvironmentValue(
  source: NodeJS.ProcessEnv,
  canonical: string,
  deprecated: string[],
): string | undefined {
  const value = source[canonical];
  if (value) return value;

  for (const name of deprecated) {
    const previous = source[name];
    if (!previous) continue;
    if (!warnedLegacyVariables.has(name)) {
      warnedLegacyVariables.add(name);
      console.warn(`[deprecated-env] ${name} is deprecated; use ${canonical}.`);
    }
    return previous;
  }
  return undefined;
}

/**
 * Reads an internship-scoped variable using its canonical name first.
 * This generic helper is retained for scripts and application compatibility.
 */
export function internshipEnv(canonical: string, legacy: string, ...additionalLegacy: string[]): string | undefined {
  return readEnvironmentValue(process.env, canonical, [legacy, ...additionalLegacy]);
}

function integerValue(value: string | undefined, variable: string, fallback: number, minimum: number, maximum: number): number {
  const port = Number(value || fallback);
  if (!Number.isInteger(port) || port < minimum || port > maximum) throw new Error(`${variable} must be an integer from ${minimum} to ${maximum}.`);
  return port;
}

function portValue(value: string | undefined, variable: string, fallback: number): number {
  return integerValue(value, variable, fallback, 0, 65535);
}

function booleanValue(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  return /^(1|true|yes|on)$/i.test(value.trim());
}

/**
 * Loads the unified realtime process configuration. MongoDB is optional here
 * so presence can bind and remain available while internship initialization
 * retries in the background.
 */
export function readRealtimeEnvironment(env: NodeJS.ProcessEnv = process.env): RealtimeEnvironment {
  const value = (canonical: string, ...deprecated: string[]) => readEnvironmentValue(env, canonical, deprecated);
  const port = portValue(value("REALTIME_PORT", "INTERNSHIP_PORT", "INTERN_PORT", "PORT"), "REALTIME_PORT", 3003);
  const origins = (value("REALTIME_ALLOWED_ORIGINS", "INTERNSHIP_ALLOWED_ORIGINS", "INTERN_ALLOWED_ORIGINS", "ALLOWED_ORIGINS") || "http://localhost:3000,http://127.0.0.1:3000")
    .split(",").map(item => item.trim()).filter(Boolean);
  const mongodbUri = value("INTERNSHIP_MONGODB_URI", "MONGODB_URI", "MONGODB");
  const jwtSecret = value("INTERNSHIP_JWT_SECRET", "INTERN_JWT_SECRET");
  if (env.NODE_ENV === "production" && mongodbUri && !jwtSecret) throw new Error("Set INTERNSHIP_JWT_SECRET to at least 32 random bytes in production.");

  return {
    port,
    host: value("REALTIME_HOST", "INTERNSHIP_HOST", "INTERN_HOST", "HOST") || "0.0.0.0",
    allowedOrigins: origins,
    presenceBroadcastIntervalMs: integerValue(value("PRESENCE_BROADCAST_INTERVAL_MS"), "PRESENCE_BROADCAST_INTERVAL_MS", 100, 1, 600000),
    presenceLog: booleanValue(value("PRESENCE_LOG"), false),
    siteOrigin: value("INTERNSHIP_SITE_ORIGIN", "INTERN_SITE_ORIGIN", "SITE_ORIGIN") || "http://localhost:3000",
    mongodbUri,
    jwtSecret,
  };
}

/** Returns the strict configuration used by legacy internship-only commands. */
export function readInternshipEnvironment(env: NodeJS.ProcessEnv = process.env): InternshipEnvironment {
  const environment = readRealtimeEnvironment(env);
  if (!environment.mongodbUri) throw new Error("Set INTERNSHIP_MONGODB_URI in the realtime-server environment.");
  if (env.NODE_ENV === "production" && !environment.jwtSecret) throw new Error("Set INTERNSHIP_JWT_SECRET to at least 32 random bytes in production.");
  return { ...environment, mongodbUri: environment.mongodbUri };
}

/** Returns the runtime database URI using the service-scoped name first. */
export function internshipMongoUri(): string | undefined {
  return internshipEnv("INTERNSHIP_MONGODB_URI", "MONGODB_URI", "MONGODB");
}

/**
 * Integration tests and benchmarks must opt into an explicitly isolated URI.
 * They intentionally never fall back to the runtime database settings.
 */
export function internshipTestMongoUri(): string | undefined {
  return internshipEnv("INTERNSHIP_TEST_MONGODB_URI", "INTERN_TEST_MONGODB_URI");
}
