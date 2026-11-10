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
import { stopExistingServices } from "./service-restart.mjs";

const posix = process.platform !== "win32";
const bunAvailable = spawnSync(posix ? "bun" : "bun.exe", ["--version"], { stdio: "ignore" }).status === 0;
const lockFixture = fileURLToPath(new URL("./fixtures/startup-lock-process.mjs", import.meta.url));

async function workspace(t, { cleanup = true } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "olentra-restart-"));
  if (cleanup) t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "frontend/node_modules/.bin"), { recursive: true });
  await mkdir(path.join(root, "backend/email-server/src"), { recursive: true });
  await mkdir(path.join(root, "scripts"), { recursive: true });
  return root;
}

async function waitFor(predicate, description, output = () => "") {
  const deadline = Date.now() + 7000;
  while (!predicate()) {
    if (Date.now() >= deadline) assert.fail(`Timed out waiting for ${description}\n${output()}`);
    await delay(25);
  }
}

function childProcess(t, command, args, { cwd, detached = false, env = process.env } = {}) {
  const child = spawn(command, args, { cwd, detached, env, stdio: ["ignore", "pipe", "pipe", "ipc"] });
  let output = "";
  let result;
  const messages = [];
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", data => { output += data; });
  child.stderr.on("data", data => { output += data; });
  child.on("message", message => { messages.push(message); });
  child.once("error", error => { result = { error }; });
  child.once("exit", (code, signal) => { result = { code, signal }; });
  t.after(async () => {
    try { if (child.pid) process.kill(detached && posix ? -child.pid : child.pid, "SIGKILL"); }
    catch (error) { if (error.code !== "ESRCH") throw error; }
    if (child.connected) child.disconnect();
    child.stdout.destroy();
    child.stderr.destroy();
  });
  return {
    child,
    output: () => output,
    messages,
    get exited() { return result !== undefined; },
    async ready() {
      await waitFor(() => /READY (\d+) (\d+)/.test(output), "fixture listener", () => output);
      return Number(output.match(/READY (\d+) (\d+)/)[2]);
    },
    async finished() {
      await waitFor(() => result, "fixture exit", () => output);
      assert.ifError(result.error);
      return result;
    },
  };
}

async function nodeListener(t, root, { detached = false, stubborn = false, port = 0, server = true } = {}) {
  const executable = path.join(root, server ? "frontend/node_modules/.bin/next" : "frontend/unrelated.cjs");
  await writeFile(executable, `
    const net = require("node:net");
    const listener = net.createServer(socket => { socket.on("error", () => {}); socket.end("alive"); });
    listener.listen({ host: "127.0.0.1", port: ${port} }, () => console.log("READY", process.pid, listener.address().port));
    for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(signal, () => {
      if (!${stubborn}) listener.close(() => process.exit(0));
    });
  `);
  const args = server ? [executable, "dev", "--port", String(port)] : [executable];
  const run = childProcess(t, process.execPath, args, { cwd: path.join(root, "frontend"), detached });
  run.port = await run.ready();
  return run;
}

async function readListener(port) {
  const socket = net.connect({ host: "127.0.0.1", port });
  socket.setTimeout(1000, () => socket.destroy(new Error("Listener timed out")));
  socket.setEncoding("utf8");
  let response = "";
  socket.on("data", data => { response += data; });
  await once(socket, "end");
  socket.destroy();
  return response;
}

test("same-checkout Next server is stopped and its port can be reused", { skip: !posix, timeout: 15000 }, async t => {
  const root = await workspace(t);
  const old = await nodeListener(t, root, { detached: true });
  await stopExistingServices({ root, shutdownTimeout: 350 });
  await old.finished();
  const fresh = await nodeListener(t, root, { port: old.port });
  assert.equal(await readListener(fresh.port), "alive");
});

test("standalone service cleanup preserves its shared process group and non-server peers", { skip: !posix, timeout: 15000 }, async t => {
  const root = await workspace(t);
  const own = await nodeListener(t, root);
  const unrelated = await nodeListener(t, root, { server: false });
  await stopExistingServices({ root, shutdownTimeout: 350 });
  await own.finished();
  assert.equal(unrelated.exited, false);
  assert.equal(await readListener(unrelated.port), "alive");
});

test("different checkout servers and unrelated listeners remain running", { skip: !posix, timeout: 15000 }, async t => {
  const root = await workspace(t);
  const foreignRoot = await workspace(t);
  const own = await nodeListener(t, root, { detached: true });
  const foreign = await nodeListener(t, foreignRoot, { detached: true });
  const unrelated = await nodeListener(t, root, { server: false, detached: true });
  await stopExistingServices({ root, shutdownTimeout: 350 });
  await own.finished();
  assert.equal(await readListener(foreign.port), "alive");
  assert.equal(await readListener(unrelated.port), "alive");
});

test("explicitly excluded identities are preserved", { skip: !posix, timeout: 15000 }, async t => {
  const root = await workspace(t);
  const own = await nodeListener(t, root, { detached: true });
  await stopExistingServices({ root, shutdownTimeout: 350, excludePids: [own.child.pid] });
  assert.equal(own.exited, false);
  assert.equal(await readListener(own.port), "alive");
});

test("restart discovery preserves its own ancestor even when that ancestor looks like Next", { skip: !posix, timeout: 15000 }, async t => {
  const root = await workspace(t);
  const worker = path.join(root, "scripts/ancestor-stop.mjs");
  await writeFile(worker, `
    import { stopExistingServices } from ${JSON.stringify(new URL("./service-restart.mjs", import.meta.url).href)};
    await stopExistingServices({ root: ${JSON.stringify(root)}, shutdownTimeout: 150 });
    process.send("preserved");
    process.disconnect();
  `);
  const executable = path.join(root, "frontend/node_modules/.bin/next");
  await writeFile(executable, `
    const { spawn } = require("node:child_process");
    const net = require("node:net");
    const listener = net.createServer(socket => { socket.on("error", () => {}); socket.end("alive"); });
    listener.listen({ host: "127.0.0.1", port: 0 }, () => {
      console.log("READY", process.pid, listener.address().port);
      const worker = spawn(process.execPath, [${JSON.stringify(worker)}], { stdio: ["ignore", "inherit", "inherit", "ipc"] });
      worker.on("message", () => console.log("ANCESTOR_PRESERVED"));
    });
    process.on("SIGTERM", () => listener.close(() => process.exit(0)));
  `);
  const own = childProcess(t, process.execPath, [executable, "dev"], { cwd: path.join(root, "frontend"), detached: true });
  const port = await own.ready();
  await waitFor(() => /ANCESTOR_PRESERVED/.test(own.output()), "ancestor exclusion", own.output);
  assert.equal(await readListener(port), "alive");
});

test("stubborn verified service processes are force-stopped", { skip: !posix, timeout: 15000 }, async t => {
  const root = await workspace(t);
  const own = await nodeListener(t, root, { detached: true, stubborn: true });
  await stopExistingServices({ root, shutdownTimeout: 150 });
  assert.equal((await own.finished()).signal, "SIGKILL");
});

test("Bun watch backend is stopped before its port is reused", { skip: !posix || !bunAvailable, timeout: 15000 }, async t => {
  const root = await workspace(t);
  const cwd = path.join(root, "backend/email-server");
  await writeFile(path.join(cwd, "src/index.ts"), `
    const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch() { return new Response("alive"); } });
    console.log("READY", process.pid, server.port);
    process.on("SIGTERM", () => { server.stop(true); process.exit(0); });
  `);
  const own = childProcess(t, "bun", ["--watch", "src/index.ts"], { cwd, detached: true });
  const port = await own.ready();
  await stopExistingServices({ root, shutdownTimeout: 350 });
  await own.finished();
  const fresh = await nodeListener(t, root, { port });
  assert.equal(await readListener(fresh.port), "alive");
});

test("an old supervisor and its recognized service descendants are stopped together", { skip: !posix, timeout: 15000 }, async t => {
  const root = await workspace(t);
  const setup = await nodeListener(t, root);
  setup.child.kill("SIGTERM");
  await setup.finished();
  await writeFile(path.join(root, "frontend/node_modules/.bin/next"), `
    const net = require("node:net");
    const server = net.createServer(socket => socket.destroy());
    server.listen({ host: "127.0.0.1", port: 0 }, () => console.log("READY", process.pid, server.address().port));
    process.once("SIGTERM", () => setTimeout(() => server.close(() => process.exit(0)), 250));
  `);
  const supervisorFile = path.join(root, "scripts/run-services.mjs");
  await writeFile(supervisorFile, `
    import { spawn } from "node:child_process";
    import path from "node:path";
    const cwd = path.resolve("frontend");
    const child = spawn(process.execPath, [path.join(cwd, "node_modules/.bin/next"), "dev"], { cwd, stdio: "inherit" });
    child.once("exit", (code, signal) => {
      console.log("CHILD_EXIT", code, signal);
      process.exit(code ?? 1);
    });
    process.once("SIGTERM", () => child.kill("SIGTERM"));
  `);
  const supervisor = childProcess(t, process.execPath, [supervisorFile, "dev"], { cwd: root, detached: true });
  const port = await supervisor.ready();
  await stopExistingServices({ root, shutdownTimeout: 1500 });
  assert.equal((await supervisor.finished()).code, 0, supervisor.output());
  assert.match(supervisor.output(), /CHILD_EXIT 0 null/);
  const fresh = await nodeListener(t, root, { port });
  assert.equal(await readListener(fresh.port), "alive");
});

test("an idle supervisor without service descendants is preserved", { skip: !posix, timeout: 15000 }, async t => {
  const root = await workspace(t);
  const supervisorFile = path.join(root, "scripts/run-services.mjs");
  await writeFile(supervisorFile, 'console.log("IDLE", process.pid); setInterval(() => {}, 1000);');
  const waiting = childProcess(t, process.execPath, [supervisorFile, "dev"], { cwd: root });
  await waitFor(() => /IDLE/.test(waiting.output()), "idle supervisor", waiting.output);
  const own = await nodeListener(t, root);
  await stopExistingServices({ root, shutdownTimeout: 350 });
  await own.finished();
  assert.equal(waiting.exited, false);
});

test("dev CLI replaces its own running stack using the same ports", { skip: !posix || !bunAvailable, timeout: 30000 }, async t => {
  const root = await workspace(t, { cleanup: false });
  t.after(async () => {
    try { await stopExistingServices({ root, shutdownTimeout: 500 }); }
    finally { await rm(root, { recursive: true, force: true }); }
  });
  for (const name of ["run-services.mjs", "service-preflight.mjs", "service-restart.mjs", "service-startup-lock.mjs"]) {
    await copyFile(path.join(import.meta.dirname, name), path.join(root, "scripts", name));
  }
  const old = await nodeListener(t, root, { detached: true });
  const reservations = [];
  for (let index = 0; index < 2; index++) {
    const server = net.createServer();
    server.listen({ host: "127.0.0.1", port: 0 });
    await once(server, "listening");
    reservations.push(server);
  }
  const [emailPort, realtimePort] = reservations.map(server => server.address().port);
  for (const server of reservations) await new Promise(resolve => server.close(resolve));
  const env = { ...process.env, NODE_ENV: "development", PORT: String(old.port), EMAIL_PORT: String(emailPort), REALTIME_PORT: String(realtimePort) };
  await writeFile(path.join(root, "frontend/package.json"), JSON.stringify({ scripts: { dev: "node node_modules/.bin/next dev" } }));
  await writeFile(path.join(root, "frontend/node_modules/.bin/next"), `
    const net = require("node:net");
    const port = Number(process.argv[process.argv.lastIndexOf("--port") + 1]);
    const server = net.createServer(socket => { socket.on("error", () => {}); socket.end("alive"); });
    server.listen({ host: "127.0.0.1", port }, () => console.log("READY", process.pid, server.address().port));
    for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => server.close(() => process.exit(0)));
  `);
  for (const [name, reader, variable] of [
    ["email-server", "readContactEnvironment", "EMAIL_PORT"],
    ["realtime-server", "readRealtimeEnvironment", "REALTIME_PORT"],
  ]) {
    const directory = path.join(root, "backend", name);
    await mkdir(path.join(directory, "src/config"), { recursive: true });
    await writeFile(path.join(directory, "package.json"), JSON.stringify({ scripts: { dev: "bun --watch src/index.ts" } }));
    await writeFile(path.join(directory, "src/config/env.ts"), `export function ${reader}() { return { host: "127.0.0.1", port: Number(process.env.${variable}) }; }`);
    await writeFile(path.join(directory, "src/index.ts"), `
      const server = Bun.serve({ hostname: "127.0.0.1", port: Number(process.env.${variable}), fetch() { return new Response("alive"); } });
      console.log("READY", process.pid, server.port);
      for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => { server.stop(true); process.exit(0); });
    `);
  }
  const ready = async run => {
    await waitFor(() => {
      assert.equal(run.exited, false, `Temporary stack exited during startup:\n${run.output()}`);
      return [old.port, emailPort, realtimePort].every(port => new RegExp(`READY \\d+ ${port}(?:\\r?\\n|$)`).test(run.output()));
    }, "full temporary stack", run.output);
  };
  const first = childProcess(t, process.execPath, [path.join(root, "scripts/run-services.mjs"), "dev"], { cwd: root, detached: true, env });
  await ready(first);
  await old.finished();
  assert.equal(await readListener(old.port), "alive");
  const second = childProcess(t, process.execPath, [path.join(root, "scripts/run-services.mjs"), "dev"], { cwd: root, detached: true, env });
  await ready(second);
  assert.equal((await first.finished()).code, 0, first.output());
  assert.match(second.output(), /previous services stopped/);
  assert.equal(await readListener(old.port), "alive");
  second.child.kill("SIGTERM");
  assert.equal((await second.finished()).code, 0, second.output());
});

function lockProcess(t, root) {
  return childProcess(t, process.execPath, [lockFixture, root]);
}

test("startup lock serializes two contenders for the same checkout", { skip: !posix, timeout: 15000 }, async t => {
  const root = await workspace(t);
  const first = lockProcess(t, root);
  await waitFor(() => first.messages.includes("locked"), "first lock", first.output);
  const second = lockProcess(t, root);
  await delay(150);
  assert.equal(second.messages.includes("locked"), false);
  first.child.send("release");
  await first.finished();
  await waitFor(() => second.messages.includes("locked"), "second lock", second.output);
  second.child.send("release");
  assert.equal((await second.finished()).code, 0);
});

test("startup lock is released when its owner is killed", { skip: !posix, timeout: 15000 }, async t => {
  const root = await workspace(t);
  const first = lockProcess(t, root);
  await waitFor(() => first.messages.includes("locked"), "first lock", first.output);
  const second = lockProcess(t, root);
  first.child.kill("SIGKILL");
  await first.finished();
  await waitFor(() => second.messages.includes("locked"), "lock after owner death", second.output);
  second.child.send("release");
  assert.equal((await second.finished()).code, 0);
});

test("aborting a lock waiter preserves the holder and permits a later startup", { skip: !posix, timeout: 15000 }, async t => {
  const root = await workspace(t);
  const first = lockProcess(t, root);
  await waitFor(() => first.messages.includes("locked"), "first lock", first.output);
  const waiting = lockProcess(t, root);
  await delay(150);
  waiting.child.send("abort");
  await waiting.finished();
  assert.ok(waiting.messages.includes("aborted"), waiting.output());
  assert.equal(first.exited, false);
  first.child.send("release");
  await first.finished();
  const next = lockProcess(t, root);
  await waitFor(() => next.messages.includes("locked"), "new lock", next.output);
  next.child.send("release");
  assert.equal((await next.finished()).code, 0);
});
