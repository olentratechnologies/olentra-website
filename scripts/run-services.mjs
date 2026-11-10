import { spawn } from "node:child_process";
import { realpath } from "node:fs/promises";
import process from "node:process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { checkServicePorts, resolveServices } from "./service-preflight.mjs";
import { stopExistingServices } from "./service-restart.mjs";
import { acquireStartupLock } from "./service-startup-lock.mjs";

const root = path.resolve(import.meta.dirname, "..");

const shutdownSignals = process.platform === "win32"
  ? ["SIGINT", "SIGTERM"]
  : ["SIGINT", "SIGTERM", "SIGHUP"];

// Exporting the supervisor lets tests exercise real process trees on disposable
// ports without starting Next.js or connecting to the application's database.
export async function runServices(services, {
  env = process.env, shutdownTimeout = 10000, onStartupComplete,
} = {}) {
  if (services.length === 0) return 0;
  const records = new Set();
  const startup = new AbortController();
  let stopping = false;
  let launching = true;
  let exitCode = 0;
  let startedCount = 0;
  let shutdownTimer;
  let monitor;
  let forcedAt;
  let finished = false;
  let resolveCompletion;
  const completion = new Promise(resolve => { resolveCompletion = resolve; });

  function groupExists(record) {
    if (process.platform === "win32" || !record.child.pid) return !record.exited;
    try {
      process.kill(-record.child.pid, 0);
      return true;
    } catch (error) {
      if (error.code === "ESRCH") return false;
      // EPERM still means the group exists. A signal failure is reported by
      // signalRecord, and the bounded forced-shutdown path handles it.
      return true;
    }
  }

  function signalRecord(record, signal) {
    try {
      if (process.platform !== "win32" && record.child.pid) {
        try {
          process.kill(-record.child.pid, signal);
          return;
        } catch (error) {
          if (error.code !== "ESRCH") throw error;
        }
      }
      if (!record.exited) record.child.kill(signal);
    } catch (error) {
      exitCode = 1;
      console.error(`[all] could not send ${signal} to ${record.name}: ${error.message}`);
    }
  }

  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(shutdownTimer);
    clearInterval(monitor);
    for (const signal of shutdownSignals) process.off(signal, onSignal);
    resolveCompletion(exitCode);
  }

  function checkCompletion() {
    if (!stopping || launching || finished) return;
    for (const record of records) {
      // A wrapper's exit is not proof that its Next/Bun descendants exited.
      if (record.exited && !groupExists(record)) records.delete(record);
    }
    if (records.size === 0) {
      if (startedCount > 0) console.log("[all] all started services stopped");
      finish();
    } else if (forcedAt !== undefined && Date.now() - forcedAt >= 2000) {
      // SIGKILL cannot be caught, but unreaped zombies (or an OS permission
      // failure) can keep kill(pgid, 0) succeeding. Never hang indefinitely.
      exitCode = 1;
      console.error(`[all] could not confirm shutdown of: ${[...records].map(record =>
        `${record.name} (${process.platform === "win32" ? "PID" : "process group"} ${record.child.pid})`
      ).join(", ")}; inspect these processes before restarting`);
      for (const record of records) record.child.unref();
      finish();
    }
  }

  function forceStop(message) {
    if (finished || forcedAt !== undefined) return;
    clearTimeout(shutdownTimer);
    console.warn(`[all] ${message}; force-stopping remaining services`);
    forcedAt = Date.now();
    for (const record of records) signalRecord(record, "SIGKILL");
    checkCompletion();
  }

  function stopServices(signal = "SIGTERM") {
    if (stopping) return;
    stopping = true;
    startup.abort();
    // These timers stay referenced until whole groups disappear, including
    // descendants whose original wrapper has already exited.
    monitor = setInterval(checkCompletion, 50);
    shutdownTimer = setTimeout(() => forceStop("graceful shutdown timed out"), shutdownTimeout);
    for (const record of records) signalRecord(record, signal);
    checkCompletion();
  }

  function onSignal(signal) {
    if (stopping) {
      forceStop(`received ${signal} again`);
      return;
    }
    console.log(`[all] received ${signal}; stopping services`);
    // Backends handle SIGTERM/SIGINT themselves. Translate a terminal hangup
    // into their graceful shutdown path rather than forwarding SIGHUP.
    stopServices(signal === "SIGHUP" ? "SIGTERM" : signal);
  }

  for (const signal of shutdownSignals) process.on(signal, onSignal);

  try {
    await checkServicePorts(services, { signal: startup.signal });
    for (const service of services) {
      if (stopping) break;
      console.log(`[all] starting ${service.name}`);
      const child = spawn(service.command, service.args, {
        cwd: service.cwd,
        env,
        stdio: "inherit",
        detached: process.platform !== "win32",
      });
      if (child.pid) startedCount++;
      const record = { name: service.name, child, exited: false };
      records.add(record);

      child.on("error", error => {
        if (!child.pid) record.exited = true;
        console.error(`[all] ${service.name} failed: ${error.message}`);
        exitCode = 1;
        stopServices();
        checkCompletion();
      });

      child.once("exit", (code, signal) => {
        record.exited = true;
        if (!stopping) {
          exitCode = code || 1;
          console.error(`[all] ${service.name} stopped${signal ? ` from ${signal}` : ` with exit code ${code}`}`);
          stopServices();
        }
        checkCompletion();
      });
    }
  } catch (error) {
    if (!startup.signal.aborted) {
      console.error(`[all] ${error.message}`);
      exitCode = 1;
    }
    stopServices();
  } finally {
    launching = false;
    try { await onStartupComplete?.(); }
    catch (error) {
      console.error(`[all] could not finish startup: ${error.message}`);
      exitCode = 1;
      stopServices();
    }
    checkCompletion();
  }

  return completion;
}

async function main() {
  const mode = process.argv[2];
  if (mode !== "dev" && mode !== "start") {
    console.error("Usage: node scripts/run-services.mjs <dev|start>");
    return 2;
  }

  const startup = new AbortController();
  let releaseStartupLock;
  const cancelStartup = signal => {
    console.log(`[all] received ${signal}; cancelling startup`);
    startup.abort();
  };
  for (const signal of shutdownSignals) process.on(signal, cancelStartup);
  try {
    const services = await resolveServices(mode, { signal: startup.signal });
    if (mode === "dev" && process.platform !== "win32") {
      releaseStartupLock = await acquireStartupLock(root, { signal: startup.signal });
      await stopExistingServices({ root, signal: startup.signal });
    }
    if (startup.signal.aborted) return 0;
    for (const signal of shutdownSignals) process.off(signal, cancelStartup);
    return await runServices(services, { onStartupComplete: releaseStartupLock });
  } catch (error) {
    if (startup.signal.aborted) return 0;
    console.error(`[all] ${error.message}`);
    return 1;
  } finally {
    for (const signal of shutdownSignals) process.off(signal, cancelStartup);
    await releaseStartupLock?.();
  }
}

const entrypoint = process.argv[1] && await realpath(process.argv[1]).catch(() => null);
if (entrypoint && import.meta.url === pathToFileURL(entrypoint).href) {
  process.exitCode = await main();
}
