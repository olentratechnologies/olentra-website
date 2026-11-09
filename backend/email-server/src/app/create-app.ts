import { Elysia } from "elysia";
import { readContactEnvironment } from "../config/env";
import { createContactRoute } from "../interfaces/http/contact.route";
import { healthResponse } from "../interfaces/http/health.route";

export function createContactApp(environment = readContactEnvironment()) {
  const route = createContactRoute(environment);
  return new Elysia()
    .get("/health", () => healthResponse())
    .post("/api/contact", ({ request }) => route.contactWithObservability(request), { parse: "none" });
}
