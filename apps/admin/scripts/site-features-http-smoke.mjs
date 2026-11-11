import { readFile, mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FEATURE_IDS, ENVIRONMENTS } from "@olentra/site-features/rules";
import { FEATURE_SESSION_COOKIE } from "@olentra/site-features/server/auth";

const root = fileURLToPath(new URL("../", import.meta.url));
const workspaceRoot = path.resolve(root, "..");
const base = new URL(process.env.OLENTRA_SMOKE_BASE_URL || "http://127.0.0.1:3000");
const timeoutMs = 30000;
const checks = [];
let cookie = "", original = null, current = null, stream = null, verifiedFlags = 0, sessionAttempts = 0;
function record(name, status, expected, extra = {}) {
  const row = { name, status, expected, ok: status === expected, ...extra };
  checks.push(row);
  process.stdout.write(`${row.ok ? "PASS" : "FAIL"} ${name}: ${status} (expected ${expected})\n`);
  return row.ok;
}
async function request(route, { method = "GET", body, authorized = false, origin, timeout = timeoutMs } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (origin !== undefined) headers.Origin = origin;
  if (authorized && cookie) headers.Cookie = cookie;
  const response = await fetch(new URL(route, base), { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(timeout), redirect: "manual" });
  const text = await response.text();
  let value = null;
  try { value = JSON.parse(text); } catch {}
  return { response, status: response.status, value, text };
}
async function snapshot() {
  const result = await request("/api/site-features");
  if (result.status !== 200 || !ENVIRONMENTS.every(environment => FEATURE_IDS.every(id => typeof result.value?.environments?.[environment]?.[id] === "boolean"))) throw new Error("Shared feature snapshot is unavailable or invalid.");
  current = result.value;
  return result.value;
}
async function authenticate() {
  const result = await request("/api/site-features/session", { method: "POST", origin: base.origin, body: { localDemo: true } });
  record("local-session-" + (++sessionAttempts), result.status, 200);
  if (result.status !== 200) throw new Error("Local feature-control session could not be established.");
  const cookies = result.response.headers.getSetCookie?.() || [result.response.headers.get("set-cookie") || ""];
  const header = cookies.find(value => value.startsWith(FEATURE_SESSION_COOKIE + "="));
  if (!header) throw new Error("The feature-control session cookie is missing.");
  cookie = header.split(";", 1)[0];
}
async function setFlag(environment, feature, enabled, { force = false, restoring = false } = {}) {
  if (!FEATURE_IDS.includes(feature) || !ENVIRONMENTS.includes(environment)) throw new Error("Unknown feature mutation was refused.");
  if (!force && current?.environments?.[environment]?.[feature] === enabled) return current;
  if (!cookie) await authenticate();
  let result = await request("/api/site-features", { method: "PUT", origin: base.origin, authorized: true, body: { environment, feature, enabled } });
  if (result.status === 401) { await authenticate(); result = await request("/api/site-features", { method: "PUT", origin: base.origin, authorized: true, body: { environment, feature, enabled } }); }
  record((restoring ? "restore" : "authorized-put") + ":" + environment + ":" + feature, result.status, 200);
  if (result.status !== 200 || result.value?.environments?.[environment]?.[feature] !== enabled) throw new Error("An authorized feature update did not complete.");
  current = result.value;
  return result.value;
}
async function expectRoute(route, expected, phase) {
  try { const result = await request(route); record(phase + ":" + route, result.status, expected); }
  catch { record(phase + ":" + route, 0, expected); }
}
async function checkRoutes(routes, expected, phase) {
  let index = 0;
  await Promise.all(Array.from({ length: Math.min(3, routes.length) }, async () => { while (index < routes.length) await expectRoute(routes[index++], expected, phase); }));
}
async function knownRoutes() {
  const services = await readFile(path.join(root, "src/data/service-pages.js"), "utf8");
  const blogs = await readFile(path.join(root, "src/data/blogs.js"), "utf8");
  const products = await readFile(path.join(root, "src/data/products-data.js"), "utf8");
  const serviceSlug = services.match(/\bslug:\s*["']([^"']+)["']/)?.[1];
  const blogSlug = blogs.match(/\bslug:\s*["']([^"']+)["']/)?.[1];
  const productPaths = [...products.matchAll(/\bhref:\s*["'](\/products\/[^"']+)["']/g)].map(match => match[1]);
  const product = productPaths.find(route => route.endsWith("/olenbot")) || productPaths[0];
  if (!serviceSlug || !blogSlug || !product) throw new Error("A source route registry could not be read.");
  await access(path.join(root, "src/app", product, "page.jsx"));
  await access(path.join(root, "src/app/careers/intern/page.jsx"));
  return { service: "/services/" + serviceSlug, product, blog: "/blogs/" + blogSlug, internship: "/careers/intern" };
}
async function expectLegacyRedirect(destination) {
  for (const query of ["", "?source=legacy&campaign=global%20internship&tag=one&tag=two"]) {
    const result = await request("/intern" + query);
    record(query ? "legacy-query-redirect" : "legacy-redirect", result.status, 308);
    let target;
    try { target = new URL(result.response.headers.get("location"), base); } catch {}
    const expectedEntries = [...new URLSearchParams(query).entries()].map(entry => JSON.stringify(entry)).sort();
    const actualEntries = target ? [...target.searchParams.entries()].map(entry => JSON.stringify(entry)).sort() : null;
    const preserved = target?.origin === base.origin && target?.pathname === destination && JSON.stringify(actualEntries) === JSON.stringify(expectedEntries);
    record(query ? "legacy-query-destination-preserved" : "legacy-destination", preserved ? 200 : 0, 200);
  }
}
async function expectSitemap(internship, enabled) {
  const phase = enabled ? "enabled-sitemap" : "disabled-sitemap";
  const result = await request("/sitemap.xml");
  record(phase, result.status, 200);
  const routes = [...result.text.matchAll(/<loc>([^<]+)<\/loc>/g)].flatMap(match => {
    try { return [new URL(match[1].replaceAll("&amp;", "&")).pathname.replace(/\/+$/, "") || "/"]; } catch { return []; }
  });
  record(phase + ":canonical-internship", routes.includes(internship) === enabled ? 200 : 0, 200);
  record(phase + ":legacy-excluded", !routes.includes("/intern") ? 200 : 0, 200);
  record(phase + ":unrelated-pages-preserved", routes.includes("/about") ? 200 : 0, 200);
}
async function openStream() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(new URL("/api/site-features/stream", base), { headers: { Accept: "text/event-stream" }, signal: controller.signal });
    record("sse-connect", response.status, 200);
    if (response.status !== 200 || !response.body) throw new Error("The feature event stream is unavailable.");
    return { controller, timer, reader: response.body.getReader(), decoder: new TextDecoder(), buffer: "" };
  } catch (error) { clearTimeout(timer); controller.abort(); throw error; }
}
async function expectRevision(connection, revision) {
  try {
    while (true) {
      const { done, value } = await connection.reader.read();
      if (done) break;
      connection.buffer += connection.decoder.decode(value, { stream: true }).replaceAll("\r\n", "\n");
      let boundary;
      while ((boundary = connection.buffer.indexOf("\n\n")) >= 0) {
        const frame = connection.buffer.slice(0, boundary);
        connection.buffer = connection.buffer.slice(boundary + 2);
        const data = frame.split("\n").filter(line => line.startsWith("data:")).map(line => line.slice(5).trim()).join("\n");
        if (!data) continue;
        let event; try { event = JSON.parse(data); } catch { continue; }
        if (event.revision === revision) { record("sse-revision-update", 200, 200); return; }
      }
    }
    record("sse-revision-update", 0, 200);
  } catch { record("sse-revision-update", 0, 200); }
  finally { clearTimeout(connection.timer); connection.controller.abort(); await connection.reader.cancel().catch(() => {}); }
}
async function restore() {
  if (!original) return;
  for (let pass = 0; pass < 3; pass++) {
    try { await snapshot(); } catch { current = null; }
    let failures = 0;
    for (const environment of ENVIRONMENTS) for (const feature of FEATURE_IDS) {
      try { await setFlag(environment, feature, original[environment][feature], { restoring: true }); }
      catch { failures += 1; }
    }
    try {
      const restored = await snapshot();
      verifiedFlags = ENVIRONMENTS.reduce((sum, environment) => sum + FEATURE_IDS.filter(feature => restored.environments[environment][feature] === original[environment][feature]).length, 0);
      if (verifiedFlags === FEATURE_IDS.length * ENVIRONMENTS.length) return;
    } catch { failures += 1; }
    if (!failures && pass === 2) break;
  }
}

try {
  if (FEATURE_IDS.length !== 8 || ENVIRONMENTS.length !== 2) throw new Error("The known feature registry changed; review the smoke test before mutating it.");
  const routes = await knownRoutes();
  const initial = await snapshot();
  original = Object.fromEntries(ENVIRONMENTS.map(environment => [environment, Object.fromEntries(FEATURE_IDS.map(feature => [feature, initial.environments[environment][feature]]))]));
  record("shared-snapshot", 200, 200);
  const harmless = { environment: "Production", feature: "services", enabled: original.Production.services };
  const unauthenticated = await request("/api/site-features", { method: "PUT", origin: base.origin, body: harmless });
  record("unauthenticated-write", unauthenticated.status, 401);
  const crossOrigin = await request("/api/site-features", { method: "PUT", origin: "https://example.invalid", body: harmless });
  record("cross-origin-write", crossOrigin.status, 403);
  await authenticate();
  for (const [feature, enabled] of Object.entries({ maintenance: false, services: true, products: true, blog: true, internships: true, applications: true, portal: true })) await setFlag("Production", feature, enabled);
  await checkRoutes(["/services", routes.service, "/products", routes.product, "/blogs", routes.blog, routes.internship, "/intern/register", "/intern/portal"], 200, "enabled");

  await expectLegacyRedirect(routes.internship);
  await expectSitemap(routes.internship, true);

  stream = await openStream();
  const update = await setFlag("Production", "services", false);
  await expectRevision(stream, update.revision); stream = null;
  await checkRoutes(["/services", routes.service], 404, "services-off");
  await setFlag("Production", "products", false);
  await checkRoutes(["/products", routes.product], 404, "products-off");
  await setFlag("Production", "blog", false);
  await checkRoutes(["/blogs", routes.blog], 404, "blog-off");
  await setFlag("Production", "internships", false);
  await checkRoutes([routes.internship, "/intern", "/intern/register"], 404, "internships-off");
  await expectSitemap(routes.internship, false);
  await setFlag("Production", "portal", false);
  await expectRoute("/intern/portal", 404, "portal-off");
  await checkRoutes(["/intern/login", "/intern/dashboard", "/dashboard"], 200, "admin-access-preserved");

  await setFlag("Production", "services", true);
  await setFlag("Staging", "services", false, { force: true });
  await setFlag("Staging", "maintenance", true, { force: true });
  await checkRoutes(["/", "/services", routes.service], 200, "staging-isolation");
  await setFlag("Production", "maintenance", true);
  await checkRoutes(["/", "/about", routes.service, routes.internship], 503, "maintenance-public");
  await checkRoutes(["/dashboard", "/dashboard/website-controls", "/intern/login", "/intern/dashboard"], 200, "maintenance-admin");
  await checkRoutes(["/api/site-features", "/api/site-features/session"], 200, "maintenance-api");
} catch {
  record("smoke-execution", 0, 200);
} finally {
  if (stream) { clearTimeout(stream.timer); stream.controller.abort(); await stream.reader.cancel().catch(() => {}); }
  await restore();
  const expectedFlags = original ? FEATURE_IDS.length * ENVIRONMENTS.length : 0;
  record("original-flags-restored", verifiedFlags, expectedFlags || FEATURE_IDS.length * ENVIRONMENTS.length);
  const report = { counts: { checks: checks.length, passed: checks.filter(row => row.ok).length, failed: checks.filter(row => !row.ok).length, originalFlags: expectedFlags, restoredFlags: verifiedFlags }, statuses: checks };
  const destination = path.join(workspaceRoot, "designs/admin-dashboard-v1/qa/immediate-features-http.json");
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, JSON.stringify(report, null, 2) + "\n");
  process.stdout.write(`SUMMARY ${report.counts.passed}/${report.counts.checks} passed; ${verifiedFlags}/${expectedFlags} original flags restored.\n`);
  if (report.counts.failed || verifiedFlags !== expectedFlags) process.exitCode = 1;
}
