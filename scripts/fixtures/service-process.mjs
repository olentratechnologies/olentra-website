import { spawn } from "node:child_process";
import net from "node:net";
import { fileURLToPath } from "node:url";

const [mode, serialized] = process.argv.slice(2);
const options = JSON.parse(serialized);
const report = value => console.log(`@@fixture:${JSON.stringify(value)}`);

if (mode === "supervisor") {
  const { runServices } = await import("../run-services.mjs");
  try {
    process.exitCode = await runServices(options.services, { shutdownTimeout: options.shutdownTimeout });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
} else if (mode === "wrapper") {
  report({ kind: "wrapper", pid: process.pid });
  const listener = spawn(process.execPath, [fileURLToPath(import.meta.url), "listener", serialized], {
    stdio: ["ignore", "inherit", "inherit", "ipc"],
  });
  listener.on("message", () => {
    if (options.exitWrapper) process.exit(3);
  });
  listener.once("error", error => { throw error; });
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.on(signal, () => process.exit(0));
  }
} else if (mode === "listener") {
  const server = net.createServer(socket => {
    socket.on("error", () => {});
    socket.end("fixture-alive");
  });
  server.listen({ host: "127.0.0.1", port: options.port }, () => {
    report({ kind: "listening", pid: process.pid, port: server.address().port });
    process.send?.("ready");
  });
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.on(signal, () => {
      if (!options.ignoreSignals) server.close(() => process.exit(0));
    });
  }
} else {
  throw new Error(`Unknown fixture mode: ${mode}`);
}
