import test from "node:test";
import assert from "node:assert/strict";
import { GET, PUT } from "../src/app/api/email-templates/signin-link/route.js";

const admin = { id: "staff-1", role: "company", staffRole: "admin", email: "admin@example.test" };
const request = ({ method = "GET", origin, body, token = "staff-token" } = {}) => new Request("http://localhost:3002/api/email-templates/signin-link", {
  method,
  headers: {
    ...(origin ? { Origin: origin } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(body ? { "Content-Type": "application/json" } : {}),
  },
  ...(body ? { body: JSON.stringify(body) } : {}),
});

function mockBackend(t, account, selected = "professional") {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).endsWith("/intern/auth/session")) return Response.json({ ok: true, data: { account } });
    const variantId = options.method === "PUT" ? JSON.parse(options.body).variantId : selected;
    return Response.json({ ok: true, data: { variantId } });
  });
  return calls;
}

test("sign-in template selection reads and writes through the authenticated workspace backend", async t => {
  const previous = process.env.INTERNSHIP_BACKEND_URL;
  process.env.INTERNSHIP_BACKEND_URL = "https://realtime.example.test";
  t.after(() => previous === undefined ? delete process.env.INTERNSHIP_BACKEND_URL : process.env.INTERNSHIP_BACKEND_URL = previous);
  const calls = mockBackend(t, admin, "warm");

  const getResponse = await GET(request());
  assert.equal(getResponse.status, 200);
  assert.deepEqual(await getResponse.json(), { variantId: "warm" });

  const putResponse = await PUT(request({ method: "PUT", origin: "http://localhost:3002", body: { variantId: "minimal" } }));
  assert.equal(putResponse.status, 200);
  assert.deepEqual(await putResponse.json(), { variantId: "minimal" });
  assert.equal(calls.filter(call => call.url.endsWith("/intern/email-template-selection")).length, 2);
  assert.ok(calls.every(call => call.options.headers.Authorization === "Bearer staff-token"));
});

test("non-administrators and cross-origin updates cannot change the live template", async t => {
  const previous = process.env.INTERNSHIP_BACKEND_URL;
  process.env.INTERNSHIP_BACKEND_URL = "https://realtime.example.test";
  t.after(() => previous === undefined ? delete process.env.INTERNSHIP_BACKEND_URL : process.env.INTERNSHIP_BACKEND_URL = previous);
  const recruiter = { ...admin, staffRole: "recruiter", permissions: ["workspace.recruiter"] };
  const calls = mockBackend(t, recruiter);

  const deniedRole = await PUT(request({ method: "PUT", origin: "http://localhost:3002", body: { variantId: "warm" } }));
  assert.equal(deniedRole.status, 403);
  const deniedOrigin = await PUT(request({ method: "PUT", origin: "https://foreign.example", body: { variantId: "warm" } }));
  assert.equal(deniedOrigin.status, 403);
  assert.equal(calls.filter(call => call.url.endsWith("/intern/email-template-selection")).length, 0);
});
