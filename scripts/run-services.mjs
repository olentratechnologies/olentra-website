import { spawn } from "node:child_process";
import process from "node:process";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const bun = process.platform === "win32" ? "bun.exe" : "bun";
const mode = process.argv[2];

const services = mode === "dev"
  ? [
      { name: "frontend", command: npm, args: ["--prefix", "frontend", "run", "dev"], cwd: root },
      { name: "email-server", command: bun, args: ["run", "--cwd", "backend/email-server", "dev"], cwd: root },
      { name: "realtime-server", command: bun, args: ["run", "--cwd", "backend/realtime-server", "dev"], cwd: root },
    ]
  : mode === "start"
    ? [
        { name: "frontend", command: npm, args: ["--prefix", "frontend", "run", "start"], cwd: root },
        { name: "email-server", command: bun, args: ["run", "--cwd", "backend/email-server", "start:built"], cwd: root },
        { name: "realtime-server", command: bun, args: ["run", "--cwd", "backend/realtime-server", "start:built"], cwd: root },
      ]
    : null;

if (!services) {
  console.error("Usage: node scripts/run-services.mjs <dev|start>");
  process.exit(2);
}

const children = new Set();
let stopping = false;
let exitCode = 0;
let forcedShutdownTimer;

function stopChild(child, signal) {
  // npm starts Next as a nested process. On POSIX, each detached service gets
  // its own process group so an interrupt stops the wrapper and its server.
  if (process.platform !== "win32" && child.pid) {
    try {
      process.kill(-child.pid, signal);
      return;
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
  }
  child.kill(signal);
}

function stopChildren(signal = "SIGTERM") {
  if (stopping) return;
  stopping = true;
  for (const child of children) stopChild(child, signal);
  // A process manager must not leave an npm/Next wrapper behind forever if a
  // child ignores a graceful signal. The normal path exits well before this.
  forcedShutdownTimer = setTimeout(() => {
    if (children.size === 0) return;
    console.warn("[all] graceful shutdown timed out; force-stopping remaining services");
    for (const child of children) stopChild(child, "SIGKILL");
  }, 10000);
  forcedShutdownTimer.unref();
}

for (const service of services) {
  console.log(`[all] starting ${service.name}`);
  const child = spawn(service.command, service.args, {
    cwd: service.cwd,
    env: process.env,
    stdio: "inherit",
    detached: process.platform !== "win32",
  });
  children.add(child);

  child.once("error", error => {
    console.error(`[all] ${service.name} failed to start: ${error.message}`);
    exitCode = 1;
    stopChildren();
  });

  child.once("exit", (code, signal) => {
    children.delete(child);
    if (stopping || signal === "SIGINT" || signal === "SIGTERM") {
      if (!stopping) stopChildren();
      return;
    }
    exitCode = code ?? 1;
    console.error(`[all] ${service.name} stopped${signal ? ` from ${signal}` : ` with exit code ${exitCode}`}`);
    stopChildren();
  });
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    console.log(`[all] received ${signal}; stopping services`);
    stopChildren(signal);
  });
}

const forceExitTimer = setInterval(() => {
  if (stopping && children.size === 0) {
    if (forcedShutdownTimer) clearTimeout(forcedShutdownTimer);
    clearInterval(forceExitTimer);
    process.exit(exitCode);
  }
}, 50);

forceExitTimer.unref();
