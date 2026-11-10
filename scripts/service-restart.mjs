import { execFile } from "node:child_process";
import { realpath } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";

const executeFile = promisify(execFile);
const projectRoot = path.resolve(import.meta.dirname, "..");
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function readProcesses(signal) {
  const { stdout } = await executeFile("ps", ["-axo", "uid=,pid=,ppid=,pgid=,lstart=,stat=,command="], {
    encoding: "utf8", env: { ...process.env, LC_ALL: "C" }, signal, timeout: 5000, maxBuffer: 8 * 1024 * 1024,
  });
  const records = new Map();
  for (const line of stdout.split("\n")) {
    const match = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\S+\s+\S+\s+\d+\s+[\d:]+\s+\d+)\s+(\S+)\s+(.+)$/);
    if (!match) continue;
    const [, uid, pid, ppid, pgid, started, state, command] = match;
    records.set(Number(pid), {
      uid: Number(uid), pid: Number(pid), ppid: Number(ppid), pgid: Number(pgid),
      started: started.replace(/\s+/g, " "), state, command: command.trim(),
    });
  }
  return records;
}

async function readWorkingDirectories(pids, signal) {
  const directories = new Map();
  if (!pids.length) return directories;
  let stdout;
  try {
    ({ stdout } = await executeFile("lsof", ["-a", "-p", pids.join(","), "-d", "cwd", "-Fn"], {
      encoding: "utf8", signal, timeout: 5000, maxBuffer: 1024 * 1024,
    }));
  } catch (error) {
    if (signal?.aborted) throw signal.reason;
    // lsof returns 1 if a PID disappeared or is inaccessible. Missing cwd
    // evidence never grants permission to signal a process.
    stdout = error.stdout || "";
    if (error.code === "ENOENT") {
      console.warn("[all] lsof is unavailable; leaving unverified processes running");
    }
  }
  let pid;
  for (const line of stdout.split("\n")) {
    if (line.startsWith("p")) pid = Number(line.slice(1));
    else if (line.startsWith("n") && pid) directories.set(pid, line.slice(1));
  }
  return directories;
}

function commandKind(record, root, requestedRoot = root) {
  const frontend = path.join(root, "frontend");
  const roots = [...new Set([root, requestedRoot])];
  const executable = "(?:\\S*/)?";
  const nextPaths = [
    ...roots.flatMap(directory => [path.join(directory, "frontend/node_modules/.bin/next"), path.join(directory, "frontend/node_modules/next/dist/bin/next")]),
    "node_modules/.bin/next", "node_modules/next/dist/bin/next", "./node_modules/.bin/next",
  ].map(escape).join("|");
  if (record.cwd === frontend && (
    /^next-server(?:\s|$)/.test(record.command)
    || new RegExp(`^${executable}node (?:${nextPaths}) (?:dev|start)(?:\\s|$)`).test(record.command)
  )) return "frontend";

  for (const name of ["email-server", "realtime-server"]) {
    const directory = path.join(root, "backend", name);
    const entrypoints = ["src/index.ts", "./src/index.ts", `dist/${name}.js`, ...roots.flatMap(base => [path.join(base, "backend", name, "src/index.ts"), path.join(base, "backend", name, `dist/${name}.js`)])]
      .map(escape).join("|");
    if (record.cwd === directory && new RegExp(`^${executable}bun (?:(?:run|--watch|--smol) )*(?:${entrypoints})(?:\\s|$)`).test(record.command)) return name;
    const cwdPaths = [`backend/${name}`, ...roots.map(base => path.join(base, "backend", name))].map(escape).join("|");
    if ((record.cwd === directory || record.cwd === root)
      && new RegExp(`^${executable}bun run --cwd (?:${cwdPaths}) (?:dev|start|start:built)$`).test(record.command)) return name;
    if (record.cwd === directory && new RegExp(`^${executable}bun run (?:dev|start|start:built)$`).test(record.command)) return name;
  }

  if ((record.cwd === root || record.cwd === frontend)
    && /^(?:\S*\/)?npm (?:--prefix frontend )?run (?:dev|start)(?:\s|$)/.test(record.command)) return "wrapper";
  const scripts = [...roots.map(base => path.join(base, "scripts/run-services.mjs")), "scripts/run-services.mjs", "./scripts/run-services.mjs"].map(escape).join("|");
  if (record.cwd === root && new RegExp(`^${executable}node (?:${scripts}) (?:dev|start)$`).test(record.command)) return "supervisor";
  return undefined;
}

async function canonicalCommand(command, root) {
  // ps preserves the launcher's spelling of absolute paths, while lsof and
  // import.meta.dirname can use their canonical spelling (/var vs /private/var
  // on macOS, or a symlink to this checkout). Normalize only known service
  // entrypoints, and keep the original command for later identity checks.
  const executable = "(?:\\S*/)?";
  const patterns = [
    new RegExp(`^(${executable}node )(/.*)(/frontend/node_modules/(?:\\.bin/next|next/dist/bin/next) (?:dev|start)(?:\\s.*)?)$`),
    new RegExp(`^(${executable}node )(/.*)(/scripts/run-services\\.mjs (?:dev|start))$`),
    new RegExp(`^(${executable}bun (?:(?:run|--watch|--smol) )*)(/.*)(/backend/(?:email-server|realtime-server)/(?:src/index\\.ts|dist/(?:email-server|realtime-server)\\.js)(?:\\s.*)?)$`),
    new RegExp(`^(${executable}bun run --cwd )(/.*)(/backend/(?:email-server|realtime-server) (?:dev|start|start:built))$`),
  ];
  for (const pattern of patterns) {
    const match = command.match(pattern);
    if (!match) continue;
    try {
      if (await realpath(match[2]) === root) return `${match[1]}${root}${match[3]}`;
    } catch {
      // An unresolvable prefix supplies no ownership evidence.
    }
  }
  return command;
}

function excludedProcesses(records, extra) {
  const excluded = new Set(extra);
  const seen = new Set();
  let pid = process.pid;
  while (pid && !seen.has(pid)) {
    seen.add(pid);
    excluded.add(pid);
    pid = records.get(pid)?.ppid;
  }
  return excluded;
}

function hasDescendant(candidate, selected, records) {
  for (const record of selected) {
    let parent = record.ppid;
    const seen = new Set();
    while (parent && !seen.has(parent)) {
      if (parent === candidate.pid) return true;
      seen.add(parent);
      parent = records.get(parent)?.ppid;
    }
  }
  return false;
}

export async function discoverExistingServices({ root = projectRoot, signal, excludePids = [] } = {}) {
  if (process.platform === "win32") return [];
  signal?.throwIfAborted();
  const requestedRoot = path.resolve(root);
  root = await realpath(root);
  const records = await readProcesses(signal);
  const excluded = excludedProcesses(records, excludePids);
  const candidates = [...records.values()].filter(record => (
    record.uid === process.getuid() && !excluded.has(record.pid) && !record.state.startsWith("Z")
    && /(?:\bnode\b|\bbun\b|\bnpm\b|^next-server\b)/.test(record.command)
  ));
  const directories = await readWorkingDirectories(candidates.map(record => record.pid), signal);
  for (const record of candidates) {
    signal?.throwIfAborted();
    record.cwd = directories.get(record.pid);
    const command = await canonicalCommand(record.command, root);
    record.kind = commandKind({ ...record, command }, root, requestedRoot);
  }
  const selected = candidates.filter(record => record.kind && record.kind !== "wrapper" && record.kind !== "supervisor");
  // A new supervisor waiting for the startup lock has no service descendants.
  // A familiar wrapper command alone is not sufficient evidence to stop it.
  for (const record of candidates) {
    if ((record.kind === "wrapper" || record.kind === "supervisor") && hasDescendant(record, selected, records)) {
      selected.push(record);
    }
  }
  const supervisors = new Set(selected.filter(record => record.kind === "supervisor").map(record => record.pid));
  for (const record of selected) {
    let parent = record.ppid;
    const seen = new Set();
    while (parent && !seen.has(parent)) {
      if (supervisors.has(parent)) {
        record.supervisorPid = parent;
        break;
      }
      seen.add(parent);
      parent = records.get(parent)?.ppid;
    }
  }
  return selected;
}

async function stillVerified(records, signal) {
  if (!records.length) return [];
  const current = await readProcesses(signal);
  const matching = records.filter(previous => {
    const now = current.get(previous.pid);
    return now && !now.state.startsWith("Z") && now.uid === previous.uid
      && now.started === previous.started && now.command === previous.command;
  });
  const directories = await readWorkingDirectories(matching.map(record => record.pid), signal);
  return matching.filter(record => directories.get(record.pid) === record.cwd);
}

async function signalVerified(records, signalName, abortSignal) {
  // Revalidate identity, including cwd, immediately before each signal batch.
  const verified = await stillVerified(records, abortSignal);
  for (const record of verified) {
    abortSignal?.throwIfAborted();
    try { process.kill(record.pid, signalName); }
    catch (error) {
      if (error.code !== "ESRCH") throw new Error(`Could not ${signalName} ${record.kind} PID ${record.pid}: ${error.message}`);
    }
  }
  return verified;
}

async function waitForExit(records, timeout, signal) {
  const deadline = Date.now() + timeout;
  let remaining = records;
  do {
    signal?.throwIfAborted();
    remaining = await stillVerified(remaining, signal);
    if (!remaining.length) return [];
    if (Date.now() >= deadline) return remaining;
    await delay(Math.min(100, deadline - Date.now()), undefined, { signal });
  } while (remaining.length);
  return remaining;
}

export async function stopExistingServices({ root = projectRoot, signal, shutdownTimeout = 10000, excludePids = [] } = {}) {
  if (process.platform === "win32") return;
  const records = await discoverExistingServices({ root, signal, excludePids });
  if (!records.length) return;
  console.log(`[all] stopping previous services for this checkout: ${records.map(record => `${record.kind} PID ${record.pid}`).join(", ")}`);
  // Signal exact PIDs, never a terminal's shared process group. A recognized
  // old supervisor can still perform its own normal owned-group cleanup.
  const supervisors = records.filter(record => record.kind === "supervisor");
  const notified = await signalVerified(supervisors, "SIGTERM", signal);
  const supervised = new Set(notified.map(record => record.pid));
  // The supervisor forwards TERM itself. Sending another TERM to a child with
  // process.once(SIGTERM) could interrupt its first graceful shutdown handler.
  const services = records.filter(record => record.kind !== "supervisor" && !supervised.has(record.supervisorPid));
  await signalVerified(services, "SIGTERM", signal);
  let remaining = await waitForExit(records, shutdownTimeout, signal);
  if (remaining.length) {
    console.warn("[all] previous services did not stop gracefully; force-stopping verified processes");
    await signalVerified(remaining, "SIGKILL", signal);
    remaining = await waitForExit(remaining, 2000, signal);
  }
  signal?.throwIfAborted();
  if (remaining.length) throw new Error(`Previous services are still running (PIDs ${remaining.map(record => record.pid).join(", ")}); refusing to start another stack.`);
  console.log("[all] previous services stopped");
}
