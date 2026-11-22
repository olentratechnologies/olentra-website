import { expect, test } from "bun:test";
import { createApplicationRoutes, MAX_APPLICATION_BODY_BYTES } from "../../src/interfaces/http/applications.routes";
import { statusFor } from "../../src/interfaces/http/router";
import { DomainError } from "../../src/shared/errors";

const sendJson = (body: unknown, _origin: string | null, status = 200) => Response.json(body, { status });
const post = (body: string, headers: Record<string, string> = {}) => new Request("http://localhost/intern/applications", { method: "POST", body, headers: { "content-type": "application/json", "idempotency-key": "a".repeat(32), ...headers } });

test("a valid application runs the same submit as the WebSocket, with its key and email limit", async () => {
  const calls: any[] = [], limits: any[] = [];
  const routes = createApplicationRoutes({
    execute: async (method, params, actor, key) => { calls.push({ method, params, actor, key }); return { received: true, applicationId: "OL-1" }; },
    limiter: { consume: async (...args: any[]) => { limits.push(args); } },
    sendJson,
  });
  const response = await routes.submit(post(JSON.stringify({ email: "candidate@example.test", name: "Candidate" })), "https://www.olentratechnologies.com");
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true, data: { received: true, applicationId: "OL-1" } });
  expect(calls).toEqual([{ method: "application.submit", params: { email: "candidate@example.test", name: "Candidate" }, actor: null, key: "a".repeat(32) }]);
  expect(limits).toEqual([["apply", null, "candidate@example.test"]]);
});

test("bad requests are refused before the database is touched", async () => {
  let executed = 0;
  const routes = createApplicationRoutes({ execute: async () => { executed++; return {}; }, sendJson });
  const refused = async (request: Request) => { const error = await routes.submit(request, null).catch(caught => caught); expect(error).toBeInstanceOf(DomainError); return error as DomainError; };
  expect((await refused(post("{not json"))).code).toBe("INVALID_REQUEST");
  expect((await refused(post("[]"))).code).toBe("INVALID_REQUEST");
  expect((await refused(post("{}", { "idempotency-key": "" }))).code).toBe("INVALID_REQUEST");
  expect((await refused(post("{}", { "content-type": "text/plain" }))).code).toBe("INVALID_REQUEST");
  expect((await refused(post(JSON.stringify({ email: "x@example.test", bio: "x".repeat(MAX_APPLICATION_BODY_BYTES) })))).code).toBe("INVALID_REQUEST");
  expect(executed).toBe(0);
});

test("submit errors keep their meaning over HTTP", async () => {
  const routes = createApplicationRoutes({ execute: async () => { throw new DomainError("ALREADY_APPLIED", "An application already exists for this email address."); }, sendJson });
  const error = await routes.submit(post(JSON.stringify({ email: "dupe@example.test" })), null).catch(caught => caught);
  expect(statusFor(error)).toBe(409);
  expect(statusFor(new DomainError("RATE_LIMITED", "Slow down."))).toBe(429);
  expect(statusFor(new DomainError("CLOSED", "Closed."))).toBe(409);
});
