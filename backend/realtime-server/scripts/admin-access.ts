/**
 * Admin account access for both dashboards (internship and company workspace).
 *
 *   npm run internship:admin -- list
 *   npm run internship:admin -- create --email you@company.com --name "Your Name"
 *   npm run internship:admin -- reset  --email you@company.com
 *   npm run internship:admin -- delete --email old@company.com --yes
 *
 * `create` and `reset` email a one-time set-password link; add --print-link to
 * also print it here when email is unavailable. This is the break-glass path:
 * it needs the database connection string, so only operators can run it.
 */
import { internshipMongoUri, readRealtimeEnvironment } from "../src/config/env";
import { loadJwtSecret } from "../src/config/jwt-secret";
import { connectInternDatabase, createInternshipDomain } from "../src/app/command-dispatcher";
import { createInternshipAuth } from "../src/modules/auth/auth.service";
import { createInternshipMailer } from "../src/infrastructure/email/mailer";
import { emailValue } from "../src/shared/ids";
import { createAdminAccess } from "../src/modules/staff/admin-access";

const [command, ...rest] = process.argv.slice(2);
const flags = new Map<string, string | true>();
for (let index = 0; index < rest.length; index++) {
  const item = rest[index]!;
  if (!item.startsWith("--")) continue;
  const next = rest[index + 1];
  if (next !== undefined && !next.startsWith("--")) { flags.set(item.slice(2), next); index++; }
  else flags.set(item.slice(2), true);
}
const option = (name: string) => typeof flags.get(name) === "string" ? String(flags.get(name)) : "";
const usage = "Usage: npm run internship:admin -- <list | create --email E [--name N] | reset --email E | delete --email E --yes> [--print-link]";

function fail(message: string): never {
  console.error(`[admin-access] ${message}`);
  process.exit(1);
}

if (!["list", "create", "reset", "delete"].includes(command || "")) fail(usage);
const uri = internshipMongoUri();
if (!uri) fail("Set INTERNSHIP_MONGODB_URI in backend/realtime-server/.env (or the environment).");
const email = emailValue(option("email"));
if (command !== "list" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("Provide a valid --email.");

const connection = await connectInternDatabase(uri);
try {
  const domain = createInternshipDomain(connection);
  await domain.initialize();
  const access = createAdminAccess(domain);

  async function sendLink(account: { _id: string; email: string; name?: string; sessionVersion?: number }, purpose: "set" | "reset") {
    const environment = readRealtimeEnvironment();
    const auth = createInternshipAuth(domain, await loadJwtSecret(environment.jwtSecret));
    const token = await auth.generatePasswordResetToken(account.email, account._id, Number(account.sessionVersion) || 1);
    const workspace = (process.env.INTERNSHIP_WORKSPACE_ORIGIN || "http://localhost:3002").replace(/\/$/, "");
    const link = `${workspace}/dashboard/reset-password?token=${token}`;
    const result = await createInternshipMailer().sendPasswordResetLink({ to: account.email, name: account.name, resetUrl: link });
    if (result.ok && result.delivered) console.info(`[admin-access] Emailed a ${purpose === "set" ? "set-password" : "password reset"} link to ${account.email}. It works once and expires in 1 hour.`);
    else console.warn(`[admin-access] The email was not delivered${result.error ? `: ${result.error}` : ""}. Rerun with --print-link to get the link here.`);
    if (flags.has("print-link")) console.info(`[admin-access] One-time link (valid 1 hour):\n${link}`);
  }

  if (command === "list") {
    const staff = await access.list();
    console.info(`[admin-access] ${staff.length} staff account(s):`);
    for (const row of staff) console.info(`  ${String(row.email).padEnd(40)} role=${String(row.staffRole ?? "none").padEnd(12)} ${row.disabled ? "disabled" : "active"}${row.hasPassword ? "" : "  (no password set yet)"}`);
  }

  if (command === "create") {
    const account = await access.create(email, option("name") || "Administrator");
    console.info(`[admin-access] Created admin ${email}. No password is set until the link is used.`);
    await sendLink(account, "set");
  }

  if (command === "reset") {
    const updated = await access.reset(email);
    console.info(`[admin-access] ${email} is an active admin again; existing sessions were signed out.`);
    await sendLink(updated as any, "reset");
  }

  if (command === "delete") {
    if (!flags.has("yes")) throw new Error("Deleting an account cannot be undone. Rerun with --yes to confirm.");
    await access.delete(email);
    console.info(`[admin-access] Deleted staff account ${email} with its password and sessions.`);
  }
} catch (error: any) {
  console.error(`[admin-access] ${error?.message || error}`);
  process.exitCode = 1;
} finally {
  await connection.client.close();
}
