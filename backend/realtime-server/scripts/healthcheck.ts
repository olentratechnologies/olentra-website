import { readRealtimeEnvironment } from "../src/config/env";

const environment = readRealtimeEnvironment();
const host = process.env.HEALTHCHECK_HOST || "127.0.0.1";
const response = await fetch(`http://${host}:${environment.port}/health`).catch(() => null);
if (!response?.ok) process.exit(1);
