import { authorized } from "../interfaces/http/authorization";
import { createSmtpSender, verifySmtp, type EmailSender } from "../infrastructure/email/smtp.client";
import { createEmailHandler } from "../interfaces/http/email.route";
import { Elysia } from "elysia";
import { readContactEnvironment } from "../config/env";
import { createContactRoute } from "../interfaces/http/contact.route";
import { healthResponse } from "../interfaces/http/health.route";

export function createContactApp(environment = readContactEnvironment(), send: EmailSender = createSmtpSender(environment)) {
  const route = createContactRoute(environment, send);
  const email = createEmailHandler(environment.deliveryToken, send);
  return new Elysia()
    .get("/health", () => healthResponse())
    .post("/api/email/verify", async ({ request }) => {
      if (!authorized(request, environment.deliveryToken)) return Response.json({ error: "Unauthorized." }, { status: 401 });
      try { await verifySmtp(environment); return Response.json({ ok: true, provider: "google-smtp" }); }
      catch { return Response.json({ error: "SMTP verification failed." }, { status: 503 }); }
    })
    .post("/api/email", ({ request }) => email(request), { parse: "none" })
    .post("/api/contact", ({ request }) => route.contactWithObservability(request), { parse: "none" });
}
