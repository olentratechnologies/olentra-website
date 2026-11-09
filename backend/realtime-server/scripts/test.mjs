import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";

function run(paths) {
  const result = spawnSync("bun", ["test", ...paths], { stdio: "inherit" });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

const presenceIntegration = "tests/integration/presence-realtime.test.ts";
const unitStatus = run(["tests/unit", "tests/contract", presenceIntegration]);
if (unitStatus !== 0) process.exit(unitStatus);

if (!process.env.INTERNSHIP_TEST_MONGODB_URI && !process.env.INTERN_TEST_MONGODB_URI) {
  console.warn("[internship:test] skipped integration: set INTERNSHIP_TEST_MONGODB_URI to an isolated MongoDB test database.");
  process.exit(0);
}

const internshipIntegration = readdirSync("tests/integration")
  .filter(filename => filename.endsWith(".test.ts") && `tests/integration/${filename}` !== presenceIntegration)
  .map(filename => `tests/integration/${filename}`);
process.exit(run(internshipIntegration));
