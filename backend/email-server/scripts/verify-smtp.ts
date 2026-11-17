import nodemailer from "nodemailer";
import { readContactEnvironment } from "../src/config/env";
const config = readContactEnvironment();
if (!config.smtpUser || !config.smtpPass) {
  console.error("Set SMTP_USER and SMTP_PASS in email-server's environment first."); process.exit(1);
}
const transport = nodemailer.createTransport({ host: config.smtpHost, port: config.smtpPort, secure: config.smtpSecure, requireTLS: true, auth: { user: config.smtpUser, pass: config.smtpPass }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000 });
let failed = false;
try { await transport.verify(); console.log("Google SMTP connection and authentication verified. No email was sent."); }
catch { console.error("SMTP verification failed. Check credentials, Google account policy, and outbound network access."); failed = true; }
finally { transport.close(); }

if (failed) process.exit(1);
