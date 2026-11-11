import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Returns the secret that signs access, magic-link and password-reset tokens.
 * Production must configure INTERNSHIP_JWT_SECRET. Development generates one
 * secret per checkout in .data/ so the server and the admin CLI agree on it.
 */
export async function loadJwtSecret(configured?: string) {
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") throw new Error("Set INTERNSHIP_JWT_SECRET to at least 32 random bytes in production.");
  const directory = path.resolve(".data");
  const file = path.join(directory, "intern-jwt-secret");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  try { await writeFile(file, randomBytes(48).toString("base64url"), { flag: "wx", mode: 0o600 }); }
  catch (error: any) { if (error.code !== "EEXIST") throw error; }
  return (await readFile(file, "utf8")).trim();
}
