import { execFile } from "node:child_process";
import { lookup } from "node:dns/promises";
import net from "node:net";
import { networkInterfaces } from "node:os";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

const executeFile = promisify(execFile);
const projectRoot = path.resolve(import.meta.dirname, "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const bun = process.platform === "win32" ? "bun.exe" : "bun";

function validateAddress({ host, port }, name) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`${name}: port must be an integer from 0 to 65535.`);
  }
  if (host !== undefined && (typeof host !== "string" || !host.trim())) {
    throw new Error(`${name}: host must be a nonempty string.`);
  }
  return { host, port };
}

async function readBackendAddress(name, reader, { root, env, signal }) {
  // Running Bun in the service directory preserves its dotenv precedence and
  // variable expansion. Import only configuration: never start a real service.
  const source = `
    try {
      const { ${reader} } = await import("./src/config/env.ts");
      const { host, port } = ${reader}();
      console.log(JSON.stringify({ host, port }));
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
  `;
  try {
    const { stdout } = await executeFile(bun, ["-e", source], {
      cwd: path.join(root, "backend", name),
      env,
      signal,
      timeout: 10000,
      maxBuffer: 64 * 1024,
      encoding: "utf8",
    });
    return validateAddress(JSON.parse(stdout), name);
  } catch (error) {
    if (signal?.aborted) throw signal.reason;
    const reason = error.killed ? "configuration check timed out" : error.stderr?.trim() || error.message;
    throw new Error(`${name}: could not read listening address: ${reason}`, { cause: error });
  }
}

export async function resolveServices(mode, { root = projectRoot, env = process.env, signal } = {}) {
  if (mode !== "dev" && mode !== "start") {
    throw new Error("Usage: node scripts/run-services.mjs <dev|start>");
  }
  signal?.throwIfAborted();
  const frontendAddress = validateAddress({ port: Number(env.PORT || 3000) }, "frontend");
  const services = [{
    name: "frontend",
    command: npm,
    args: ["--prefix", "frontend", "run", mode, "--", "--port", String(frontendAddress.port)],
    cwd: root,
    address: frontendAddress,
  }];
  for (const [name, reader] of [
    ["email-server", "readContactEnvironment"],
    ["realtime-server", "readRealtimeEnvironment"],
  ]) {
    const address = await readBackendAddress(name, reader, { root, env, signal });
    services.push({
      name,
      command: bun,
      args: ["run", "--cwd", `backend/${name}`, mode === "dev" ? "dev" : "start:built"],
      cwd: root,
      address,
    });
  }
  return services;
}

function describeAddress({ host, port }) {
  return `${host === undefined ? "all interfaces" : host}:${port}`;
}

function inspectionCommand(port) {
  return process.platform === "win32"
    ? `Get-NetTCPConnection -State Listen -LocalPort ${port}`
    : `lsof -nP -iTCP:${port} -sTCP:LISTEN`;
}

async function connectionAddresses(host) {
  if (host === undefined || host === "0.0.0.0" || host === "::") {
    const addresses = new Set(host === "0.0.0.0" ? ["127.0.0.1"] : ["127.0.0.1", "::1"]);
    for (const [name, interfaces] of Object.entries(networkInterfaces())) {
      for (const entry of interfaces || []) {
        if (host === "0.0.0.0" && entry.family !== "IPv4") continue;
        addresses.add(entry.scopeid && !entry.address.includes("%") ? `${entry.address}%${name}` : entry.address);
      }
    }
    return [...addresses];
  }
  if (net.isIP(host)) return [host];
  return [...new Set((await lookup(host, { all: true })).map(result => result.address))];
}

function acceptsConnections(host, port, signal) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const finish = (error, occupied = false) => {
      signal?.removeEventListener("abort", abort);
      socket.destroy();
      if (error) reject(error);
      else resolve(occupied);
    };
    const abort = () => finish(signal.reason);
    socket.once("connect", () => finish(undefined, true));
    socket.once("error", error => {
      if (["ECONNREFUSED", "ENETUNREACH", "EHOSTUNREACH", "EADDRNOTAVAIL", "EAFNOSUPPORT"].includes(error.code)) {
        finish();
      } else {
        finish(error);
      }
    });
    // Some virtual/link-local interfaces silently drop loopback probes. A
    // timeout supplies no listener evidence; the bind check still follows.
    socket.setTimeout(250, () => finish());
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
    else socket.connect({ host, port });
  });
}

async function assertNoListener(address, signal) {
  if (address.port === 0) return;
  // macOS permits some overlapping wildcard/specific binds. Check connections
  // too, including both localhost families, to prevent split traffic between
  // an old listener and the new service. Earlier reservations also catch
  // overlaps between this invocation's own configured addresses.
  const addresses = await connectionAddresses(address.host);
  signal?.throwIfAborted();
  const results = await Promise.allSettled(addresses.map(host => acceptsConnections(host, address.port, signal)));
  signal?.throwIfAborted();
  if (results.some(result => result.status === "fulfilled" && result.value)) {
    const error = new Error("Address already in use");
    error.code = "EADDRINUSE";
    throw error;
  }
  const failure = results.find(result => result.status === "rejected");
  if (failure) throw failure.reason;
}

function openProbe(address, signal) {
  return new Promise((resolve, reject) => {
    const server = net.createServer(socket => socket.destroy());
    const fail = error => {
      cleanup();
      reject(error);
    };
    const abort = () => {
      server.close(() => fail(signal.reason));
    };
    const cleanup = () => signal?.removeEventListener("abort", abort);
    server.once("error", fail);
    server.once("listening", () => {
      if (signal?.aborted) {
        abort();
        return;
      }
      cleanup();
      resolve(server);
    });
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) {
      abort();
      return;
    }
    try {
      // Native abort handling cancels a pending DNS lookup/listen as well as an
      // already-bound socket; the listening handler also guards a late event.
      server.listen({ ...address, exclusive: true, signal });
    } catch (error) {
      fail(error);
    }
  });
}

export async function checkServicePorts(services, { signal } = {}) {
  const reservations = [];
  const problems = [];
  try {
    for (const service of services) {
      signal?.throwIfAborted();
      const address = validateAddress(service.address, service.name);
      try {
        await assertNoListener(address, signal);
        const server = await openProbe(address, signal);
        reservations.push({ service, server });
      } catch (error) {
        if (signal?.aborted) throw signal.reason;
        if (error.code !== "EADDRINUSE") {
          problems.push(`${service.name}: cannot listen on ${describeAddress(address)} (${error.message}).`);
          continue;
        }
        const samePort = reservations.filter(({ service: previous }) => (
          address.port !== 0 && previous.address.port === address.port
        ));
        let problem = `${service.name}: port ${address.port} is already in use on ${address.host || "all interfaces"}.`;
        if (samePort.length) {
          const otherAddresses = samePort.map(({ service: previous }) => (
            `${previous.name} (${describeAddress(previous.address)})`
          ));
          problem += ` Check for conflicting service addresses with ${otherAddresses.join(", ")}.`;
        }
        problem += `\n  Inspect: ${inspectionCommand(address.port)}`;
        problems.push(problem);
      }
    }
  } finally {
    await Promise.all(reservations.map(({ server }) => new Promise(resolve => server.close(resolve))));
  }
  if (problems.length) {
    throw new Error(`Cannot start services:\n${problems.map(problem => `  ${problem}`).join("\n")}\nStop the existing service explicitly or correct the configured addresses, then retry.`);
  }
}
