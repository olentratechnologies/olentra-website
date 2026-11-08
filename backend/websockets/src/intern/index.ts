import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { connectInternDatabase, createInternshipDomain } from "./domain";
import { createInternshipServer } from "./server";

async function jwtSecret() {
  if (process.env.INTERN_JWT_SECRET) return process.env.INTERN_JWT_SECRET;
  if (process.env.NODE_ENV === "production") throw new Error("Set INTERN_JWT_SECRET to at least 32 random bytes in production.");
  const directory = path.resolve(".data"), file = path.join(directory, "intern-jwt-secret");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  try { await writeFile(file, randomBytes(48).toString("base64url"), { flag: "wx", mode: 0o600 }); }
  catch (error: any) { if (error.code !== "EEXIST") throw error; }
  return (await readFile(file, "utf8")).trim();
}
const uri = process.env.MONGODB_URI || process.env.MONGODB;
if (!uri) throw new Error("Set MONGODB_URI or MONGODB in the WebSocket backend environment.");
const connection = await connectInternDatabase(uri);
const site = process.env.INTERN_SITE_ORIGIN || "http://localhost:3000";
const domain = createInternshipDomain({ ...connection, intakeOpen: async () => {
  try {
    const response = await fetch(new URL("/api/site-features", site), { signal: AbortSignal.timeout(3000) });
    const state = await response.json() as { features?: { internships?: boolean; applications?: boolean } };
    return response.ok && state.features?.internships === true && state.features?.applications === true;
  } catch { return false; }
} });
const origins = (process.env.INTERN_ALLOWED_ORIGINS || "http://localhost:3000,http://127.0.0.1:3000").split(",").map(value => value.trim()).filter(Boolean);
const instance = await createInternshipServer({ domain, secret: await jwtSecret(), hostname: process.env.INTERN_HOST || "127.0.0.1", port: Number(process.env.INTERN_PORT || 3003), allowedOrigins: origins, siteOrigin: site });
console.info(`[internship] Listening on ${instance.server.url}`);
for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => { void (async () => { await instance.stop(); await connection.client.close(); })(); });
