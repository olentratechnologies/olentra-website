import { spawnSync } from "node:child_process";
import process from "node:process";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const bun = process.platform === "win32" ? "bun.exe" : "bun";

const steps = [
  { name: "web", command: npm, args: ["run", "build", "--workspace", "@olentra/web"] },
  { name: "admin", command: npm, args: ["run", "build", "--workspace", "@olentra/admin"] },
  { name: "email-server", command: bun, args: ["run", "--cwd", "backend/email-server", "build"] },
  { name: "realtime-server", command: bun, args: ["run", "--cwd", "backend/realtime-server", "build"] },
];

for (const step of steps) {
  console.log(`[all] building ${step.name}`);
  const result = spawnSync(step.command, step.args, {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) {
    console.error(`[all] ${step.name} build failed: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("[all] web, admin and backend production builds completed");
