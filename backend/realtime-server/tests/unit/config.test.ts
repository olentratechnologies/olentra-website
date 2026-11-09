import { afterEach, expect, test } from "bun:test";
import { internshipEnv } from "./config";
import { readInternshipEnvironment, readRealtimeEnvironment } from "../../src/config/env";

const canonical = "OLENTRA_CONFIG_TEST_CANONICAL";
const legacy = "OLENTRA_CONFIG_TEST_LEGACY";

afterEach(() => {
  delete process.env[canonical];
  delete process.env[legacy];
});

test("canonical internship configuration takes precedence over the legacy name", () => {
  process.env[canonical] = "canonical-value";
  process.env[legacy] = "legacy-value";
  expect(internshipEnv(canonical, legacy)).toBe("canonical-value");
});

test("legacy internship configuration remains supported with a migration warning", () => {
  let warning = "";
  const originalWarn = console.warn;
  console.warn = message => { warning = String(message); };
  try {
    process.env[legacy] = "legacy-value";
    expect(internshipEnv(canonical, legacy)).toBe("legacy-value");
  } finally {
    console.warn = originalWarn;
  }
  expect(warning).toContain(`${legacy} is deprecated`);
  expect(warning).toContain(`use ${canonical}`);
});

test("typed internship environment loading keeps canonical values ahead of aliases", () => {
  const environment = readInternshipEnvironment({
    NODE_ENV: "test",
    INTERNSHIP_PORT: "3013",
    PORT: "3999",
    INTERNSHIP_MONGODB_URI: "mongodb://canonical",
    MONGODB_URI: "mongodb://legacy",
    INTERNSHIP_ALLOWED_ORIGINS: "https://olentra.example",
    INTERNSHIP_SITE_ORIGIN: "https://olentra.example",
  });
  expect(environment.port).toBe(3013);
  expect(environment.mongodbUri).toBe("mongodb://canonical");
  expect(environment.allowedOrigins).toEqual(["https://olentra.example"]);
});

test("typed realtime environment uses the unified names and keeps internship settings optional", () => {
  const environment = readRealtimeEnvironment({
    NODE_ENV: "test",
    REALTIME_PORT: "3013",
    INTERNSHIP_PORT: "3999",
    REALTIME_HOST: "127.0.0.1",
    REALTIME_ALLOWED_ORIGINS: "https://olentra.example",
    PRESENCE_BROADCAST_INTERVAL_MS: "250",
    PRESENCE_LOG: "true",
  });
  expect(environment).toMatchObject({
    port: 3013,
    host: "127.0.0.1",
    allowedOrigins: ["https://olentra.example"],
    presenceBroadcastIntervalMs: 250,
    presenceLog: true,
    mongodbUri: undefined,
  });
});
