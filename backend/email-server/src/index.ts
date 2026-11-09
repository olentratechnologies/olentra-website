/// <reference path="./types/runtime.d.ts" />

import { Elysia } from "elysia";
import { createContactApp } from "./app/create-app";
import { readContactEnvironment } from "./config/env";
import { logger } from "./observability/logger";

const environment = readContactEnvironment();
// Keep the Elysia import in the recognized Vercel entrypoint. Vercel's
// zero-config Elysia runtime detects the framework from this file.
const app = createContactApp(environment);
if (!(app instanceof Elysia)) {
  throw new TypeError("Contact application must be an Elysia instance.");
}

// Vercel detects the default Elysia export and serves its routes as Functions.
export default app;

// Preserve the local Bun server for development and standalone hosting.
if (import.meta.main) {
  const listener = app.listen({ port: environment.port, hostname: environment.host, maxRequestBodySize: 6 * 1024 * 1024 });
  logger.info("Contact server listening", { port: listener.server?.port || environment.port, host: environment.host });
  let stopping: Promise<void> | undefined;
  for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => {
    stopping ||= Promise.resolve(app.stop()).then(() => logger.info("Contact server stopped", { signal }));
  });
}
