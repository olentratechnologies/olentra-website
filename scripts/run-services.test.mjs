import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { checkServicePorts, resolveServices } from "./service-preflight.mjs";

const root = path.resolve(import.meta.dirname, "..");
const fixture = fileURLToPath(new URL("./fixtures/service-process.mjs", import.meta.url));
const posix = process.platform !== "win32";
const bunAvailable = spawnSync(posix ? "bun" : "bun.exe", ["--version"], { stdio: "ignore" }).status === 0;

async function listen(port = 0, host = "127.0.0.1") {
  const server = net.createServer(socket => {
    socket.on("error", () => {}); // Port probes disconnect without reading a response.
    socket.end("existing-server");
  });
  server.listen({ port, host });
  await once(server, "listening");
  return server;
}

async function close(server) {
  if (server.listening) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}

async function freePort() {
  const server = await listen();
  const port = server.address().port;
  await close(server);
  return port;
}

async function assertPortFree(port) {
  const server = await listen(port);
  await close(server);
}

async function readListener(port, host = "127.0.0.1") {
  const socket = net.connect({ host, port });
  socket.setTimeout(1000, () => socket.destroy(new Error("Listener connection timed out")));
  let result = "";
  socket.setEncoding("utf8");
  socket.on("data", data => { result += data; });
  await once(socket, "end");
  socket.destroy();
  return result;
}

function service(name, port, options = {}) {
  return {
    name,
    command: process.execPath,
    args: [fixture, "wrapper", JSON.stringify({ port, ...options })],
    cwd: root,
    address: { host: "127.0.0.1", port },
  };
}

async function waitFor(predicate, description, output = () => "") {
  const deadline = Date.now() + 5000;
  while (!predicate()) {
    if (Date.now() >= deadline) assert.fail(`Timed out waiting for ${description}\n${output()}`);
    await delay(20);
  }
}

function supervise(t, services, shutdownTimeout = 350) {
  const child = spawn(process.execPath, [fixture, "supervisor", JSON.stringify({ services, shutdownTimeout })], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  let result;
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", data => { output += data; });
  child.stderr.on("data", data => { output += data; });
  child.once("error", error => { result = { error }; });
  child.once("exit", (code, signal) => { result = { code, signal }; });
  const records = () => output.split("\n").flatMap(line => {
    if (!line.startsWith("@@fixture:")) return [];
    try { return [JSON.parse(line.slice("@@fixture:".length))]; }
    catch { return []; }
  });
  t.after(async () => {
    if (!result) {
      child.kill("SIGTERM");
      const deadline = Date.now() + 1500;
      while (!result && Date.now() < deadline) await delay(20);
    }
    // These groups were created only by this fixture invocation. Clean up even
    // when an assertion fails halfway through a shutdown regression test.
    for (const record of records()) {
      try { process.kill(posix && record.kind === "wrapper" ? -record.pid : record.pid, "SIGKILL"); }
      catch (error) { if (error.code !== "ESRCH") throw error; }
    }
    if (!result) child.kill("SIGKILL");
    child.stdout.destroy();
    child.stderr.destroy();
  });
  return {
    child,
    output: () => output,
    records,
    async ready(port) {
      await waitFor(() => records().some(record => record.kind === "listening" && record.port === port), `listener on ${port}`, () => output);
    },
    async finished() {
      await waitFor(() => result, "supervisor exit", () => output);
      assert.ifError(result.error);
      return result;
    },
  };
}

for (const occupiedService of ["frontend", "email-server", "realtime-server"]) {
  test(`occupied ${occupiedService} port prevents any launch and preserves the existing listener`, { timeout: 10000 }, async t => {
    const existing = await listen();
    t.after(() => close(existing));
    const port = existing.address().port;
    const services = [service("frontend", 0), service("email-server", 0), service("realtime-server", 0)];
    services.find(item => item.name === occupiedService).address.port = port;
    const run = supervise(t, services);
    assert.equal((await run.finished()).code, 1, run.output());
    assert.match(run.output(), new RegExp(occupiedService));
    assert.match(run.output(), new RegExp(String(port)));
    if (posix) assert.match(run.output(), /lsof/);
    assert.equal(run.records().length, 0, "No service process should have started");
    assert.equal(await readListener(port), "existing-server");
  });
}

test("overlapping configured addresses are rejected and temporary probes are released", async () => {
  const port = await freePort();
  await assert.rejects(checkServicePorts([
    service("frontend", port),
    { ...service("email-server", port), address: { host: "0.0.0.0", port } },
  ]), error => {
    assert.match(error.message, /frontend/);
    assert.match(error.message, /email-server/);
    assert.match(error.message, new RegExp(String(port)));
    return true;
  });
  await assertPortFree(port);
});

for (const [existingHost, desiredHost] of [["127.0.0.1", undefined], ["0.0.0.0", "127.0.0.1"]]) {
  test(`existing ${existingHost} listener blocks an overlapping ${desiredHost || "wildcard"} address`, async t => {
    const existing = await listen(0, existingHost);
    t.after(() => close(existing));
    const port = existing.address().port;
    await assert.rejects(checkServicePorts([
      { ...service("frontend", port), address: { host: desiredHost, port } },
    ]), error => {
      assert.match(error.message, /frontend/);
      assert.match(error.message, new RegExp(String(port)));
      return true;
    });
    assert.equal(await readListener(port), "existing-server");
  });
}

test("successful preflight releases its probes, including ephemeral ports", async () => {
  const port = await freePort();
  await checkServicePorts([service("frontend", port), service("email-server", 0), service("realtime-server", 0)]);
  await assertPortFree(port);
});

async function listenOnIpv6(t) {
  try { return await listen(0, "::1"); }
  catch (error) {
    if (error.code === "EAFNOSUPPORT" || error.code === "EADDRNOTAVAIL") {
      t.skip("IPv6 loopback is unavailable");
      return null;
    }
    throw error;
  }
}

test("an existing IPv6 listener blocks the frontend wildcard address", async t => {
  const existing = await listenOnIpv6(t);
  if (!existing) return;
  t.after(() => close(existing));
  const port = existing.address().port;
  await assert.rejects(checkServicePorts([
    { ...service("frontend", port), address: { port } },
  ]), error => {
    assert.match(error.message, /frontend/);
    assert.match(error.message, new RegExp(String(port)));
    return true;
  });
  assert.equal(await readListener(port, "::1"), "existing-server");
});

test("distinct IPv4 and IPv6 loopback addresses may share a port", async t => {
  const ipv6 = await listenOnIpv6(t);
  if (!ipv6) return;
  const port = ipv6.address().port;
  await close(ipv6);
  await checkServicePorts([
    service("frontend", port),
    { ...service("email-server", port), address: { host: "::1", port } },
  ]);
  await assertPortFree(port);
});

test("invalid later configuration releases earlier preflight reservations", async () => {
  const port = await freePort();
  await assert.rejects(checkServicePorts([
    service("frontend", port),
    { ...service("email-server", 0), address: { host: "127.0.0.1", port: -1 } },
  ]), /email-server.*port/);
  await assertPortFree(port);
});

async function configWorkspace(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "olentra-service-config-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  for (const name of ["email-server", "realtime-server"]) {
    const destination = path.join(directory, "backend", name, "src", "config");
    await mkdir(destination, { recursive: true });
    await copyFile(path.join(root, "backend", name, "src", "config", "env.ts"), path.join(destination, "env.ts"));
  }
  return directory;
}

function cleanEnvironment() {
  return Object.fromEntries(Object.entries(process.env).filter(([key]) => ["PATH", "HOME", "SystemRoot", "USERPROFILE", "TMPDIR"].includes(key)));
}

test("service-local dotenv files and legacy realtime configuration are respected", { skip: !bunAvailable, timeout: 10000 }, async t => {
  const directory = await configWorkspace(t);
  await writeFile(path.join(directory, "backend/email-server/.env"), "PORT=32101\nHOST=127.0.0.1\n");
  await writeFile(path.join(directory, "backend/email-server/.env.local"), "PORT=32102\n");
  await writeFile(path.join(directory, "backend/realtime-server/.env"), "INTERNSHIP_PORT=32103\nINTERNSHIP_HOST=127.0.0.1\n");
  const services = await resolveServices("dev", { root: directory, env: cleanEnvironment() });
  assert.equal(services[0].address.port, 3000);
  assert.equal(services[1].name, "admin");
  assert.equal(services[1].address.port, 3002);
  assert.deepEqual(services[2].address, { host: "127.0.0.1", port: 32102 });
  assert.deepEqual(services[3].address, { host: "127.0.0.1", port: 32103 });
  assert.deepEqual(services[0].args.slice(-3), ["--", "--port", "3000"]);
  assert.deepEqual(services[1].args.slice(-3), ["--", "--port", "3002"]);
});

test("exported ports override dotenv and frontend stays explicit in dev and start modes", { skip: !bunAvailable, timeout: 10000 }, async t => {
  const directory = await configWorkspace(t);
  await writeFile(path.join(directory, "backend/email-server/.env"), "PORT=32101\n");
  await writeFile(path.join(directory, "backend/realtime-server/.env"), "REALTIME_PORT=32103\n");
  const env = { ...cleanEnvironment(), PORT: "32500", ADMIN_PORT: "32502", HOST: "127.0.0.1", REALTIME_PORT: "32503" };
  for (const mode of ["dev", "start"]) {
    const services = await resolveServices(mode, { root: directory, env });
    assert.equal(services[0].address.port, 32500);
    assert.equal(services[1].address.port, 32502);
    assert.equal(services[2].address.port, 32500);
    assert.equal(services[3].address.port, 32503);
    assert.deepEqual(services[0].args.slice(-3), ["--", "--port", "32500"]);
    assert.deepEqual(services[1].args.slice(-3), ["--", "--port", "32502"]);
    assert.ok(services[0].args.includes(mode) && services[0].args.includes("@olentra/web"));
    assert.ok(services[1].args.includes(mode) && services[1].args.includes("@olentra/admin"));
    assert.ok(services[2].args.includes(mode === "dev" ? "dev" : "start:built"));
  }
});

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  test(`${signal} shuts down wrappers and nested listeners`, { skip: !posix, timeout: 10000 }, async t => {
    const port = await freePort();
    const run = supervise(t, [service("frontend", port)]);
    await run.ready(port);
    assert.equal(await readListener(port), "fixture-alive");
    run.child.kill(signal);
    assert.equal((await run.finished()).code, 0, run.output());
    await assertPortFree(port);
  });
}

test("a wrapper exiting first does not hide a descendant that ignores graceful shutdown", { skip: !posix, timeout: 10000 }, async t => {
  const port = await freePort();
  const run = supervise(t, [service("frontend", port, { exitWrapper: true, ignoreSignals: true })]);
  await run.ready(port);
  assert.notEqual((await run.finished()).code, 0, run.output());
  assert.match(run.output(), /force-stopping|SIGKILL/);
  await assertPortFree(port);
});

test("a repeated shutdown signal immediately forces stubborn descendants to stop", { skip: !posix, timeout: 10000 }, async t => {
  const port = await freePort();
  const run = supervise(t, [service("frontend", port, { ignoreSignals: true })], 10000);
  await run.ready(port);
  run.child.kill("SIGTERM");
  await waitFor(() => /stopping services/.test(run.output()), "initial shutdown", run.output);
  run.child.kill("SIGTERM");
  assert.equal((await run.finished()).code, 0, run.output());
  await assertPortFree(port);
});

test("a missing executable fails promptly and cleans up any launched siblings", { timeout: 10000 }, async t => {
  const port = await freePort();
  const missing = { ...service("missing-service", 0), command: path.join(os.tmpdir(), `olentra-no-command-${process.pid}`), args: [] };
  const run = supervise(t, [service("frontend", port), missing]);
  assert.equal((await run.finished()).code, 1, run.output());
  assert.match(run.output(), /missing-service/);
  assert.match(run.output(), /ENOENT|failed to start/);
  await assertPortFree(port);
});

test("repeated start/stop cycles immediately reuse the same port", { skip: !posix, timeout: 15000 }, async t => {
  const port = await freePort();
  for (let attempt = 0; attempt < 3; attempt++) {
    const run = supervise(t, [service("frontend", port)]);
    await run.ready(port);
    run.child.kill("SIGINT");
    assert.equal((await run.finished()).code, 0, run.output());
    await assertPortFree(port);
  }
});
