import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHmac, randomBytes } from "node:crypto";
import { NextRequest } from "next/server.js";
import { readSiteFeatures, setSiteFeature, publicSiteFeatureState, validateSiteFeatureState, watchSiteFeatures } from "@olentra/site-features/server/store";
import { effectiveSiteFeatures, featureForPath, siteRouteStatus, isFeatureHrefVisible } from "@olentra/site-features/rules";
import { FEATURE_SESSION_COOKIE, localFeatureDemo, featureRequestOrigin, requireSameOrigin, issueFeatureSession, readFeatureSession, verifyFeatureCredentials } from "@olentra/site-features/server/auth";

function environment(t, values) {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

async function temporaryStore(t) {
  const directory = await mkdtemp(path.join(tmpdir(), "olentra-feature-tests-"));
  const file = path.join(directory, "features.json");
  environment(t, { OLENTRA_FEATURE_STORE_PATH: file });
  t.after(() => rm(directory, { recursive: true, force: true }));
  return { directory, file };
}

function request(url = "http://localhost:3000/api/site-features", { token, origin = new URL(url).origin, fetchSite, headers = {} } = {}) {
  const values = new Headers(headers);
  if (origin !== null) values.set("origin", origin);
  if (fetchSite) values.set("sec-fetch-site", fetchSite);
  if (token) values.set("cookie", `${FEATURE_SESSION_COOKIE}=${token}`);
  return new NextRequest(url, { headers: values });
}

const rawFlags = () => ({ services: true, products: true, internships: true, blog: true, assistant: true, maintenance: false, applications: true, portal: true });

test("concurrent atomic updates preserve both changed flags, increment revisions and clean lock files", async (t) => {
  const { directory, file } = await temporaryStore(t);
  const before = await readSiteFeatures();
  const changes = [];
  const unsubscribe = watchSiteFeatures((state) => changes.push(state));
  t.after(unsubscribe);
  const outcomes = await Promise.all([
    setSiteFeature({ environment: "Production", feature: "services", enabled: !before.environments.Production.services }),
    setSiteFeature({ environment: "Production", feature: "products", enabled: !before.environments.Production.products }),
  ]);
  const persisted = await readSiteFeatures();
  assert.equal(persisted.environments.Production.services, !before.environments.Production.services);
  assert.equal(persisted.environments.Production.products, !before.environments.Production.products);
  assert.equal(persisted.revision, before.revision + 2);
  assert.deepEqual(outcomes.map((row) => row.revision).sort((a, b) => a - b), [before.revision + 1, before.revision + 2]);
  assert.deepEqual(changes.map((row) => row.revision), [before.revision + 1, before.revision + 2]);
  assert.deepEqual(JSON.parse(await readFile(file, "utf8")), persisted);
  assert.deepEqual(await readdir(directory), ["features.json"]);
});

test("fresh reads retain persisted state and a no-op does not invent a revision", async (t) => {
  const { file } = await temporaryStore(t);
  const before = await readSiteFeatures();
  const enabled = !before.environments.Production.assistant;
  const result = await setSiteFeature({ feature: "assistant", enabled, actor: "Test administrator" });
  const freshModule = await import(`../src/server/store.mjs?fresh=${randomBytes(6).toString("hex")}`);
  const reloaded = await freshModule.readSiteFeatures();
  assert.equal(reloaded.revision, before.revision + 1);
  assert.equal(reloaded.environments.Production.assistant, enabled);
  assert.equal(reloaded.lastChange.feature, "assistant");
  assert.equal(reloaded.lastChange.actor, "Test administrator");
  assert.ok(Number.isFinite(Date.parse(reloaded.updatedAt)));
  const originalFile = await readFile(file, "utf8");
  const unchanged = await setSiteFeature({ feature: "assistant", enabled });
  assert.equal(unchanged.revision, result.revision);
  assert.equal(await readFile(file, "utf8"), originalFile);
});

test("a cached reader sees switches written by another process", async (t) => {
  await temporaryStore(t);
  // A separate module instance stands in for the website process; this one is the admin app.
  const website = await import(`../src/server/store.mjs?website=${randomBytes(6).toString("hex")}`);
  await setSiteFeature({ feature: "blog", enabled: true });
  const cached = await website.readSiteFeatures();
  assert.equal(cached.environments.Production.blog, true);
  await setSiteFeature({ feature: "blog", enabled: false, actor: "Admin app" });
  const refreshed = await website.readSiteFeatures();
  assert.equal(refreshed.environments.Production.blog, false);
  assert.equal(refreshed.revision, cached.revision + 1);
  assert.equal(refreshed.lastChange.actor, "Admin app");
});

test("invalid feature updates do not alter persisted switches or revision", async (t) => {
  const { file } = await temporaryStore(t);
  const before = await readSiteFeatures();
  await setSiteFeature({ feature: "services", enabled: !before.environments.Production.services });
  const valid = await readSiteFeatures();
  const bytes = await readFile(file, "utf8");
  for (const payload of [
    { environment: "Unknown", feature: "products", enabled: true },
    { environment: "Production", feature: "missing", enabled: true },
    { environment: "Production", feature: "products", enabled: "false" },
    { environment: "Production", feature: "__proto__", enabled: false },
    { environment: "Production", feature: "products", enabled: null },
  ]) await assert.rejects(setSiteFeature(payload), /valid feature|boolean/i);
  assert.deepEqual(await readSiteFeatures(), valid);
  assert.equal(await readFile(file, "utf8"), bytes);
  const malformed = structuredClone(valid);
  malformed.environments.Staging.services = "yes";
  assert.throws(() => validateSiteFeatureState(malformed), /invalid feature/i);
});

test("Production and Staging remain independent and public features reflect only Production", async (t) => {
  await temporaryStore(t);
  const original = await readSiteFeatures();
  await setSiteFeature({ environment: "Production", feature: "services", enabled: false });
  const staged = await setSiteFeature({ environment: "Staging", feature: "products", enabled: false });
  const persisted = await readSiteFeatures();
  assert.equal(persisted.environments.Production.services, false);
  assert.equal(persisted.environments.Production.products, original.environments.Production.products);
  assert.equal(persisted.environments.Staging.services, original.environments.Staging.services);
  assert.equal(persisted.environments.Staging.products, false);
  assert.equal(staged.features.services, false);
  assert.equal(staged.features.products, original.environments.Production.products);
});

test("public representation preserves raw intent while applying internship and maintenance dependencies", async (t) => {
  await temporaryStore(t);
  await setSiteFeature({ feature: "applications", enabled: true });
  const hiddenInternship = await setSiteFeature({ feature: "internships", enabled: false });
  assert.equal(hiddenInternship.environments.Production.applications, true);
  assert.equal(hiddenInternship.features.applications, false);
  assert.equal(hiddenInternship.features.portal, true);
  const raw = await readSiteFeatures();
  assert.equal(Object.hasOwn(raw, "features"), false, "Effective fields are not written into the raw store");
  const presented = publicSiteFeatureState(raw);
  assert.equal(presented.revision, raw.revision);
  assert.deepEqual(presented.environments, raw.environments);
  assert.deepEqual(presented.features, effectiveSiteFeatures(raw.environments.Production));
  const maintenance = await setSiteFeature({ feature: "maintenance", enabled: true });
  for (const name of ["services", "products", "internships", "blog", "assistant", "applications"]) assert.equal(maintenance.features[name], false);
  assert.equal(maintenance.features.portal, true);
});

test("maintenance blocks public routes while preserving dashboard, login, internal assets and enabled intern portal", () => {
  const flags = { ...rawFlags(), maintenance: true };
  for (const path of ["/", "/about", "/services", "/products/dailysupply", "/blogs/story", "/careers/intern", "/intern", "/intern/register"]) {
    assert.equal(siteRouteStatus(path, flags), 503, `${path} is public during maintenance`);
  }
  for (const path of ["/dashboard", "/dashboard/website-controls", "/api/site-features", "/_next/static/example.js", "/health/simple", "/intern/login", "/intern/login?role=intern", "/intern/reset-password", "/intern/dashboard/applications", "/intern/portal", "/intern/portal/projects/example"]) {
    assert.equal(siteRouteStatus(path, flags), 200, `${path} remains reachable during maintenance`);
  }
  assert.equal(siteRouteStatus("/intern/portal/projects/example", { ...flags, portal: false }), 404);
  assert.equal(siteRouteStatus("/dashboarding", flags), 503, "Unrelated names do not inherit dashboard exemptions");
});

test("direct route prefixes cover nested controlled pages without matching unrelated names", () => {
  const flags = { ...rawFlags(), services: false, products: false, blog: false, internships: false };
  for (const [path, feature] of [
    ["/services", "services"], ["/services/cloud-security", "services"], ["/services/cloud-security/deep?view=1#details", "services"],
    ["/products/", "products"], ["/products/dailysupply/pricing", "products"], ["/blogs/story/comments", "blog"],
    ["/careers/intern", "internships"], ["/careers/intern/", "internships"], ["/careers/intern?campaign=summer#apply", "internships"],
    ["/intern", "internships"], ["/intern/register?track=engineering", "applications"],
  ]) {
    assert.equal(featureForPath(path), feature);
    assert.equal(siteRouteStatus(path, flags), 404, `${path} is controlled by its feature`);
  }
  for (const path of ["/services-plus", "/products-old", "/blogsarchive", "/internship", "/intern/portal-extra", "/careers", "/careers-other", "/careers/intern-extra", "/about"]) {
    assert.equal(featureForPath(path), null);
    assert.equal(siteRouteStatus(path, flags), 200, `${path} must not be mistaken for a controlled route`);
  }
  assert.equal(featureForPath("/intern/portal/projects/example"), "portal");
  assert.equal(siteRouteStatus("/intern/portal/projects/example", flags), 200);
  assert.equal(siteRouteStatus("/intern/portal/projects/example", { ...flags, portal: false }), 404);
});

test("the canonical careers internship route handles query, hash and trailing-slash forms without changing private prefixes", () => {
  const enabled = rawFlags(), disabled = { ...enabled, internships: false };
  for (const url of ["/careers/intern", "/careers/intern/", "/careers/intern?source=careers", "/careers/intern#apply", "/careers/intern/?source=careers#apply"]) {
    assert.equal(featureForPath(url), "internships", url);
    assert.equal(siteRouteStatus(url, enabled), 200, url);
    assert.equal(siteRouteStatus(url, disabled), 404, url);
    assert.equal(isFeatureHrefVisible(url, disabled), false, url);
  }
  for (const url of ["/careers", "/careers/", "/careers-other", "/careers/intern-extra"]) {
    assert.equal(featureForPath(url), null, url);
    assert.equal(siteRouteStatus(url, disabled), 200, url);
  }
  assert.equal(featureForPath("/intern"), "internships", "The legacy landing URL remains feature-gated before redirecting.");
  assert.equal(featureForPath("/intern/register"), "applications");
  assert.equal(featureForPath("/intern/portal/projects/example"), "portal");
  for (const url of ["/intern/login", "/intern/reset-password", "/intern/dashboard/applications"]) assert.equal(siteRouteStatus(url, disabled), 200, url);
});

test("navigation visibility hides controlled routes and local homepage feature anchors", () => {
  const flags = { ...rawFlags(), services: false, products: false, blog: false, internships: false };
  for (const href of ["/services", "/services/cloud-security", "/products/dailysupply", "/blogs/story", "/careers/intern", "/intern", "/intern/register", "/#services", "#services", "/#products", "#products"]) {
    assert.equal(isFeatureHrefVisible(href, flags), false, `${href} should disappear when its feature is disabled`);
  }
  for (const href of ["/about", "/#contact", "#contact", "/intern/login", "/intern/portal", "https://example.com/project"]) assert.equal(isFeatureHrefVisible(href, flags), true);
});

test("same-origin enforcement rejects missing, foreign and explicitly cross-site origins", (t) => {
  environment(t, { OLENTRA_FEATURE_SITE_ORIGIN: undefined });
  assert.doesNotThrow(() => requireSameOrigin(request()));
  assert.throws(() => requireSameOrigin(request(undefined, { origin: null })), /dashboard|website/i);
  assert.throws(() => requireSameOrigin(request(undefined, { origin: "https://other.example" })), /dashboard|website/i);
  assert.throws(() => requireSameOrigin(request(undefined, { origin: "http://localhost:3001" })), /dashboard|website/i);
  assert.throws(() => requireSameOrigin(request(undefined, { fetchSite: "cross-site" })), /dashboard|website/i);
});

test("same-origin enforcement uses the real Host and forwarded protocol rather than Next's internal request URL", (t) => {
  environment(t, { OLENTRA_FEATURE_SITE_ORIGIN: undefined });
  const internalUrl = "http://localhost:3000/api/site-features";
  assert.doesNotThrow(() => requireSameOrigin(request(internalUrl, {
    origin: "http://127.0.0.1:3000",
    headers: new Headers({ host: "127.0.0.1:3000", "x-forwarded-proto": "http" }),
  })));
  assert.throws(() => requireSameOrigin(request(internalUrl, {
    origin: "https://evil.example",
    headers: { host: "127.0.0.1:3000", "x-forwarded-proto": "http" },
  })), /dashboard|website/i);
  assert.doesNotThrow(() => requireSameOrigin(request(internalUrl, {
    origin: "https://company.example",
    headers: { host: "company.example", "x-forwarded-proto": "https, http" },
  })));
  assert.throws(() => requireSameOrigin(request(internalUrl, {
    origin: "http://localhost:3000",
    headers: { host: "company.example", "x-forwarded-proto": "https" },
  })), /dashboard|website/i);
});

test("the control origin respects HTTPS forwarding and a configured canonical origin for secure cookie decisions", (t) => {
  environment(t, { OLENTRA_FEATURE_SITE_ORIGIN: undefined });
  const internalUrl = "http://localhost:3000/api/site-features/session";
  const forwarded = request(internalUrl, {
    origin: "https://127.0.0.1:3000",
    headers: { host: "127.0.0.1:3000", "x-forwarded-proto": "https, http" },
  });
  assert.equal(featureRequestOrigin(forwarded), "https://127.0.0.1:3000");
  assert.equal(new URL(featureRequestOrigin(forwarded)).protocol, "https:");
  assert.doesNotThrow(() => requireSameOrigin(forwarded));
  process.env.OLENTRA_FEATURE_SITE_ORIGIN = "https://controls.company.example";
  const canonical = request(internalUrl, {
    origin: "https://controls.company.example",
    headers: { host: "internal-service:3000", "x-forwarded-proto": "http" },
  });
  assert.equal(featureRequestOrigin(canonical), "https://controls.company.example");
  assert.equal(new URL(featureRequestOrigin(canonical)).protocol, "https:");
  assert.doesNotThrow(() => requireSameOrigin(canonical));
  assert.throws(() => requireSameOrigin(request(internalUrl, {
    origin: "http://internal-service:3000",
    headers: { host: "internal-service:3000", "x-forwarded-proto": "http" },
  })), /dashboard|website/i);
});

test("local-demo bootstrap is restricted to local hosts and disabled when configured credentials exist", (t) => {
  environment(t, { NODE_ENV: "development", OLENTRA_FEATURE_ADMIN_PASSWORD: undefined, OLENTRA_FEATURE_ALLOW_LOCAL_DEMO: undefined });
  for (const host of ["localhost", "127.0.0.1", "[::1]"]) assert.equal(localFeatureDemo(request(`http://${host}:3000/api/site-features`)), true);
  assert.equal(localFeatureDemo(request("https://company.example/api/site-features")), false);
  assert.equal(localFeatureDemo(request("https://localhost.attacker.example/api/site-features")), false);
  process.env.OLENTRA_FEATURE_ALLOW_LOCAL_DEMO = "false";
  assert.equal(localFeatureDemo(request()), false);
  delete process.env.OLENTRA_FEATURE_ALLOW_LOCAL_DEMO;
  process.env.OLENTRA_FEATURE_ADMIN_PASSWORD = "AConfiguredTestPassword!";
  assert.equal(localFeatureDemo(request()), false);
});

test("production rejects implicit local-demo bootstrap even when Host is localhost", (t) => {
  environment(t, { NODE_ENV: "production", OLENTRA_FEATURE_ADMIN_PASSWORD: undefined, OLENTRA_FEATURE_ALLOW_LOCAL_DEMO: undefined });
  assert.equal(localFeatureDemo(request(undefined, { headers: { host: "localhost:3000" } })), false);
});

test("production permits an explicitly opted-in local demo on localhost", (t) => {
  environment(t, { NODE_ENV: "production", OLENTRA_FEATURE_ADMIN_PASSWORD: undefined, OLENTRA_FEATURE_ALLOW_LOCAL_DEMO: "true" });
  assert.equal(localFeatureDemo(request(undefined, { headers: { host: "localhost:3000" } })), true);
});

test("explicit local-demo opt-in never permits a remote Host", (t) => {
  environment(t, { NODE_ENV: "production", OLENTRA_FEATURE_ADMIN_PASSWORD: undefined, OLENTRA_FEATURE_ALLOW_LOCAL_DEMO: "true" });
  assert.equal(localFeatureDemo(request(undefined, { headers: { host: "company.example" } })), false);
});

test("explicit local-demo disablement also applies in development", (t) => {
  environment(t, { NODE_ENV: "development", OLENTRA_FEATURE_ADMIN_PASSWORD: undefined, OLENTRA_FEATURE_ALLOW_LOCAL_DEMO: "false" });
  assert.equal(localFeatureDemo(request(undefined, { headers: { host: "localhost:3000" } })), false);
});

test("configured credentials require matching email, password and configured MFA; localDemo input cannot forge them", (t) => {
  const password = randomBytes(24).toString("hex");
  environment(t, { OLENTRA_FEATURE_ADMIN_EMAIL: "admin@company.example", OLENTRA_FEATURE_ADMIN_PASSWORD: password, OLENTRA_FEATURE_ADMIN_MFA_CODE: "713204" });
  assert.equal(verifyFeatureCredentials({ email: "ADMIN@COMPANY.EXAMPLE", password, code: "713204" }), true);
  assert.equal(verifyFeatureCredentials({ email: "attacker@company.example", password, code: "713204" }), false);
  assert.equal(verifyFeatureCredentials({ email: "admin@company.example", password: "wrong", code: "713204", localDemo: true }), false);
  assert.equal(verifyFeatureCredentials({ email: "admin@company.example", password, code: "000000" }), false);
  assert.equal(verifyFeatureCredentials({ email: "admin@company.example", password }), false);
  process.env.OLENTRA_FEATURE_ADMIN_PASSWORD = "short";
  assert.equal(verifyFeatureCredentials({ email: "admin@company.example", password: "short", code: "713204" }), false);
});

test("signed feature cookies reject tampered payloads, bad signatures, expired credentials and remote local-demo reuse", (t) => {
  const secret = randomBytes(48).toString("hex");
  environment(t, { NODE_ENV: "development", OLENTRA_FEATURE_SESSION_SECRET: secret, OLENTRA_FEATURE_ADMIN_EMAIL: "admin@company.example", OLENTRA_FEATURE_ADMIN_PASSWORD: randomBytes(24).toString("hex"), OLENTRA_FEATURE_ADMIN_MFA_CODE: "719283", OLENTRA_FEATURE_ALLOW_LOCAL_DEMO: undefined });
  const token = issueFeatureSession("admin@company.example");
  assert.equal(readFeatureSession(request(undefined, { token })).email, "admin@company.example");
  assert.equal(readFeatureSession(request()), null);
  const [payload, signature] = token.split(".");
  const decoded = JSON.parse(Buffer.from(payload, "base64url"));
  const altered = Buffer.from(JSON.stringify({ ...decoded, email: "attacker@company.example" })).toString("base64url");
  assert.equal(readFeatureSession(request(undefined, { token: `${altered}.${signature}` })), null);
  assert.equal(readFeatureSession(request(undefined, { token: `${payload}.${signature[0] === "a" ? "b" : "a"}${signature.slice(1)}` })), null);
  const expiredPayload = Buffer.from(JSON.stringify({ ...decoded, expiresAt: Date.now() - 1 })).toString("base64url");
  const expiredSignature = createHmac("sha256", secret).update(expiredPayload).digest("base64url");
  assert.equal(readFeatureSession(request(undefined, { token: `${expiredPayload}.${expiredSignature}` })), null);
  const unknownMode = Buffer.from(JSON.stringify({ ...decoded, mode: "unrecognized" })).toString("base64url");
  const unknownModeSignature = createHmac("sha256", secret).update(unknownMode).digest("base64url");
  assert.equal(readFeatureSession(request(undefined, { token: `${unknownMode}.${unknownModeSignature}` })), null);
  delete process.env.OLENTRA_FEATURE_ADMIN_PASSWORD;
  const localToken = issueFeatureSession("Local owner", "local-demo");
  assert.ok(readFeatureSession(request(undefined, { token: localToken })));
  assert.equal(readFeatureSession(request("https://company.example/api/site-features", { token: localToken })), null);
  process.env.OLENTRA_FEATURE_ADMIN_PASSWORD = randomBytes(24).toString("hex");
  assert.equal(readFeatureSession(request(undefined, { token: localToken })), null);
});

test("configured cookies are revoked when credentials are removed, shortened, rotated or changed", (t) => {
  const baseline = {
    OLENTRA_FEATURE_SESSION_SECRET: randomBytes(48).toString("hex"),
    OLENTRA_FEATURE_ADMIN_EMAIL: "admin@company.example",
    OLENTRA_FEATURE_ADMIN_PASSWORD: randomBytes(24).toString("hex"),
    OLENTRA_FEATURE_ADMIN_MFA_CODE: "718204",
  };
  environment(t, baseline);
  const changes = [
    ["password removed", "OLENTRA_FEATURE_ADMIN_PASSWORD", undefined],
    ["password shortened", "OLENTRA_FEATURE_ADMIN_PASSWORD", "short"],
    ["password rotated", "OLENTRA_FEATURE_ADMIN_PASSWORD", randomBytes(24).toString("hex")],
    ["email changed", "OLENTRA_FEATURE_ADMIN_EMAIL", "other-admin@company.example"],
    ["MFA changed", "OLENTRA_FEATURE_ADMIN_MFA_CODE", "604812"],
  ];
  for (const [label, key, value] of changes) {
    for (const [name, original] of Object.entries(baseline)) process.env[name] = original;
    const token = issueFeatureSession(baseline.OLENTRA_FEATURE_ADMIN_EMAIL);
    assert.ok(readFeatureSession(request(undefined, { token })), "The configured cookie starts valid");
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
    assert.equal(readFeatureSession(request(undefined, { token })), null, label);
  }
});
