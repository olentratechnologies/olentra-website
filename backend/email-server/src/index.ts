import { createContactApp } from "./app/create-app";
import { readContactEnvironment } from "./config/env";
import { logger } from "./observability/logger";

const environment = readContactEnvironment();
const app = createContactApp(environment);

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
