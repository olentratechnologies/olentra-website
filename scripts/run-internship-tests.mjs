import { spawnSync } from "node:child_process";

const isolatedUri = process.env.INTERNSHIP_TEST_MONGODB_URI || process.env.INTERN_TEST_MONGODB_URI;

if (!isolatedUri) {
  console.warn(
    "[internship:test] cannot verify integration: set INTERNSHIP_TEST_MONGODB_URI to an isolated MongoDB test database before running integration tests.",
  );
  process.exit(1);
}

const result = spawnSync(
  "bun",
  ["run", "--cwd", "backend/realtime-server", "test"],
  { stdio: "inherit" },
);

if (result.error) throw result.error;
process.exit(result.status ?? 1);
