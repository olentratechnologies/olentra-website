import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ignoredDirectories = new Set([".git", ".next", ".data", "node_modules", "benchmarks"]);
const textExtensions = new Set([".cjs", ".js", ".jsx", ".mjs", ".md", ".json", ".ts", ".tsx", ".yaml", ".yml"]);

function filesUnder(directory) {
  if (!existsSync(directory)) return [];
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) continue;
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...filesUnder(filename));
    else if (entry.isFile() && textExtensions.has(path.extname(entry.name))) files.push(filename);
  }
  return files;
}

function readText(filename) {
  return readFileSync(filename, "utf8");
}

function appRoutes() {
  const appRoot = path.join(root, "frontend", "src", "app");
  return new Set(
    filesUnder(appRoot)
      .filter((filename) => /(?:^|\/)(?:page|route)\.[^.]+$/.test(filename))
      .map((filename) => {
        const relative = path.relative(appRoot, path.dirname(filename));
        if (!relative) return "/";
        const segments = relative.split(path.sep).map((segment) => {
          if (/^\[\.\.\..+\]$/.test(segment)) return ":param*";
          if (/^\[\[\.\.\..+\]\]$/.test(segment)) return ":param*?";
          if (/^\[.+\]$/.test(segment)) return ":param";
          return segment;
        });
        return "/" + segments.join("/");
      }),
  );
}

test("canonical backend directories are the only service directories", () => {
  for (const service of ["email-server", "realtime-server"]) {
    assert.ok(existsSync(path.join(root, "backend", service)), `${service} is missing`);
  }
  for (const deleted of ["http_server", "websockets", "contact-server", "presence-server", "internship-server"]) {
    assert.equal(existsSync(path.join(root, "backend", deleted)), false, `${deleted} must stay deleted`);
  }
});

test("layered backend structure and operational files are present", () => {
  const required = {
    "email-server": [
      "src/index.ts", "src/app/create-app.ts", "src/config/env.ts", "src/domain/contact/contact.service.ts",
      "src/infrastructure/email/resend.client.ts", "src/interfaces/http/contact.route.ts", "src/interfaces/http/health.route.ts",
      "src/interfaces/http/middleware.ts", "src/observability/logger.ts", "tests/unit", "tests/contract", "scripts/healthcheck.ts", "Dockerfile", ".dockerignore",
    ],
    "realtime-server": [
      "src/index.ts", "src/app/create-service.ts", "src/app/create-server.ts", "src/app/container.ts", "src/app/command-dispatcher.ts", "src/config/env.ts", "src/config/compatibility.ts",
      "src/modules/presence/presence-tracker.ts", "src/interfaces/http/presence-health.route.ts", "src/interfaces/http/presence-stats.route.ts",
      "src/interfaces/websocket/presence-connection.adapter.ts", "src/interfaces/websocket/presence-protocol.ts", "src/interfaces/websocket/presence-topics.ts",
      "src/interfaces/websocket/topic-registry.ts",
      "src/modules/access/policy.ts", "src/modules/auth/auth.service.ts", "src/modules/accounts/account.service.ts", "src/modules/applications/application.service.ts", "src/modules/programs/program.service.ts",
      "src/infrastructure/database/client.ts", "src/infrastructure/database/collections.ts", "src/infrastructure/database/transactions.ts", "src/infrastructure/email/mailer.ts", "src/infrastructure/files/gridfs.store.ts", "src/infrastructure/observability/logger.ts",
      "src/interfaces/http/router.ts", "src/interfaces/http/auth.routes.ts", "src/interfaces/http/files.routes.ts", "src/interfaces/http/health.routes.ts", "src/interfaces/http/cookies.ts", "src/interfaces/http/middleware.ts",
      "src/interfaces/websocket/router.ts", "src/interfaces/websocket/protocol.ts", "src/interfaces/websocket/session.ts", "src/interfaces/websocket/topics.ts", "src/shared/errors.ts", "src/shared/ids.ts", "src/shared/principal.ts",
      "tests/unit", "tests/integration", "tests/contract", "tests/fixtures", "scripts/bootstrap.ts", "scripts/promote-admin.ts", "scripts/bench.ts", "scripts/bench-presence.ts", "scripts/latency-bench.ts", "Dockerfile", ".dockerignore",
    ],
  };
  for (const [service, paths] of Object.entries(required)) {
    for (const relative of paths) assert.ok(existsSync(path.join(root, "backend", service, relative)), `${service}/${relative} is missing`);
  }
});

test("frontend workspace owns the Next.js application and root source directories are empty", () => {
  for (const relative of [
    "README.md",
    "src/app",
    "src/components",
    "src/data",
    "src/lib",
    "public",
    "scripts",
    "package.json",
    "package-lock.json",
    ".npmrc",
    ".env.example",
    "next.config.js",
    "postcss.config.js",
    "tailwind.config.js",
    "jsconfig.json",
    "components.json",
  ]) assert.ok(existsSync(path.join(root, "frontend", relative)), `frontend/${relative} is missing`);
  for (const relative of ["src", "public", "next.config.js", "postcss.config.js", "tailwind.config.js", "jsconfig.json", "components.json", ".env.example"]) {
    assert.equal(existsSync(path.join(root, relative)), false, `${relative} must stay inside frontend/`);
  }
  const rootPackage = JSON.parse(readText(path.join(root, "package.json")));
  const frontendPackage = JSON.parse(readText(path.join(root, "frontend/package.json")));
  assert.equal(Object.keys(rootPackage.dependencies || {}).length, 0, "root package must not own frontend dependencies");
  assert.equal(Object.keys(rootPackage.devDependencies || {}).length, 0, "root package must not own frontend dev dependencies");
  assert.equal(frontendPackage.dependencies.next, "^16.4.5", "frontend package must own the patched Next.js version");
});

test("service documentation only names commands implemented by its package", () => {
  for (const service of ["email-server", "realtime-server"]) {
    const directory = path.join(root, "backend", service);
    const scripts = JSON.parse(readText(path.join(directory, "package.json"))).scripts;
    const documentation = readText(path.join(directory, "README.md"));
    for (const match of documentation.matchAll(/bun run ([A-Za-z0-9:_-]+)/g)) {
      assert.equal(typeof scripts[match[1]], "string", `${service}: bun run ${match[1]} is missing`);
    }
  }
});

test("backend executable code uses canonical locations and environment names", () => {
  const executableFiles = ["backend/email-server", "backend/realtime-server", "scripts", "frontend/scripts"]
    .flatMap(relative => filesUnder(path.join(root, relative)))
    .filter(filename => /\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(filename))
    .filter(filename => !filename.endsWith("scripts/naming-and-routes.test.mjs"));
  const stale = ["backend/http_server", "backend/websockets", "src/intern/", "src/presence.test.ts", "src/contact.test.ts"];
  const references = [];
  for (const filename of executableFiles) {
    const text = readText(filename);
    for (const value of stale) if (text.includes(value)) references.push(`${path.relative(root, filename)}: ${value}`);
  }
  assert.deepEqual(references, []);
  const environment = readText(path.join(root, "backend/realtime-server/src/config/env.ts"));
  for (const name of ["REALTIME_PORT", "REALTIME_HOST", "REALTIME_ALLOWED_ORIGINS", "INTERNSHIP_MONGODB_URI", "INTERNSHIP_TEST_MONGODB_URI", "INTERNSHIP_PORT", "INTERN_PORT", "INTERN_TEST_MONGODB_URI"]) assert.match(environment, new RegExp(name));
});

test("internal data modules and dynamic route parameters use canonical names", () => {
  for (const filename of ["olentra-ai-studio.js", "products-data.js", "service-pages.js"]) {
    assert.ok(existsSync(path.join(root, "frontend", "src", "data", filename)), `${filename} is missing`);
  }
  for (const deleted of ["olentra_ai_studio.js", "products_data.js", "service_pages.js"]) {
    assert.equal(existsSync(path.join(root, "frontend", "src", "data", deleted)), false, `${deleted} must stay deleted`);
  }

  assert.ok(existsSync(path.join(root, "frontend/src/app/intern/dashboard/applications/[applicationId]")));
  assert.ok(existsSync(path.join(root, "frontend/src/app/intern/portal/projects/[projectId]")));
  assert.equal(existsSync(path.join(root, "frontend/src/app/intern/dashboard/applications/[id]")), false);
  assert.equal(existsSync(path.join(root, "frontend/src/app/intern/portal/projects/[id]")), false);
});

test("canonical internship scripts and compatibility aliases are present", () => {
  const scripts = JSON.parse(readText(path.join(root, "package.json"))).scripts;
  for (const name of [
    "realtime:dev",
    "realtime:start",
    "realtime:test",
    "realtime:typecheck",
    "realtime:bench",
    "internship:dev",
    "internship:start",
    "internship:test",
    "internship:bench",
    "internship:bench:latency",
    "internship:bootstrap",
    "internship:promote-admin",
  ]) assert.equal(typeof scripts[name], "string", `${name} is missing`);
  for (const suffix of ["dev", "start", "test", "bench", "bench:latency", "bootstrap", "promote-admin"]) {
    assert.equal(scripts[`intern:${suffix}`], `npm run internship:${suffix}`);
  }
});

test("canonical email service scripts and contact compatibility aliases are present", () => {
  const scripts = JSON.parse(readText(path.join(root, "package.json"))).scripts;
  for (const name of ["email:dev", "email:start", "email:test", "email:typecheck"]) {
    assert.equal(typeof scripts[name], "string", `${name} is missing`);
  }
  assert.equal(scripts["contact:dev"], "npm run email:dev");
  assert.equal(scripts["contact:start"], "npm run email:start");
  assert.equal(scripts["contact:test"], "npm run email:test");
});

test("every documented npm run command exists", () => {
  const packageScripts = JSON.parse(readText(path.join(root, "package.json"))).scripts;
  const documentation = [path.join(root, "README.md"), ...filesUnder(path.join(root, "docs")), ...filesUnder(path.join(root, ".github"))]
    .filter((filename) => /\.md$|\.ya?ml$/.test(filename));
  const missing = [];
  for (const filename of documentation) {
    for (const match of readText(filename).matchAll(/npm run ([A-Za-z0-9:_-]+)/g)) {
      if (!packageScripts[match[1]]) missing.push(`${path.relative(root, filename)}: npm run ${match[1]}`);
    }
  }
  assert.deepEqual(missing, []);
});

test("deleted service paths and old internal filenames are not referenced", () => {
  const scanRoots = ["frontend", "backend", "scripts", "docs", ".github", "README.md", "package.json"];
  const files = scanRoots.flatMap((relative) => {
    const filename = path.join(root, relative);
    return statSync(filename).isDirectory() ? filesUnder(filename) : [filename];
  }).filter((filename) => !filename.endsWith("scripts/naming-and-routes.test.mjs"));
  const stale = [
    "backend/http_server",
    "backend/websockets",
    "backend/presence-server",
    "backend/internship-server",
    "deploy-websocket",
    "frontend-next",
    "olentra_ai_studio",
    "products_data",
    "service_pages",
    "node --test scripts/admin-core.test.mjs",
    "node --test scripts/admin-content.test.mjs",
    "node --test scripts/admin-operations.test.mjs",
    "node --test scripts/admin-governance.test.mjs",
    "node --test frontend/scripts/presence-client.test.mjs",
  ];
  const references = [];
  for (const filename of files) {
    const text = readText(filename);
    for (const value of stale) if (text.includes(value)) references.push(`${path.relative(root, filename)}: ${value}`);
  }
  assert.deepEqual(references, []);
});

test("public route invariants and normalized route segments are preserved", () => {
  const routes = appRoutes();
  const expectedRoutes = new Set([
    "/",
    "/about",
    "/accessibility",
    "/api/contact",
    "/api/site-features",
    "/api/site-features/session",
    "/api/site-features/stream",
    "/blogs",
    "/blogs/:param",
    "/careers/intern",
    "/contact-preview",
    "/cookie-policy",
    "/dashboard",
    "/dashboard/account",
    "/dashboard/analytics",
    "/dashboard/analytics/seo",
    "/dashboard/approvals",
    "/dashboard/approvals/:param",
    "/dashboard/audit",
    "/dashboard/careers",
    "/dashboard/careers/applications",
    "/dashboard/careers/applications/:param",
    "/dashboard/careers/certificates",
    "/dashboard/careers/interns",
    "/dashboard/careers/interns/:param",
    "/dashboard/careers/programs/:param/edit",
    "/dashboard/careers/projects/:param/tasks/:param",
    "/dashboard/content",
    "/dashboard/content/media",
    "/dashboard/content/pages/:param/edit",
    "/dashboard/enquiries",
    "/dashboard/enquiries/:param",
    "/dashboard/integrations",
    "/dashboard/integrations/:param",
    "/dashboard/localization",
    "/dashboard/localization/:param/:param",
    "/dashboard/login",
    "/dashboard/monitoring",
    "/dashboard/monitoring/alert-rules",
    "/dashboard/monitoring/incidents/:param",
    "/dashboard/notifications",
    "/dashboard/settings/backups",
    "/dashboard/settings/company",
    "/dashboard/settings/security",
    "/dashboard/team",
    "/dashboard/team/roles/:param",
    "/dashboard/verify",
    "/dashboard/website-controls",
    "/dashboard/website-controls/features/:param",
    "/dashboard/website-controls/navigation",
    "/health",
    "/health/errors",
    "/health/live",
    "/health/ready",
    "/health/simple",
    "/health/stats",
    "/intern",
    "/intern/dashboard",
    "/intern/dashboard/analytics",
    "/intern/dashboard/applications",
    "/intern/dashboard/applications/:param",
    "/intern/dashboard/certificates",
    "/intern/dashboard/interns",
    "/intern/dashboard/projects",
    "/intern/dashboard/settings",
    "/intern/dashboard/staff",
    "/intern/login",
    "/intern/portal",
    "/intern/portal/application",
    "/intern/portal/certificates",
    "/intern/portal/onboarding",
    "/intern/portal/profile",
    "/intern/portal/projects",
    "/intern/portal/projects/:param",
    "/intern/portal/submissions",
    "/intern/register",
    "/intern/reset-password",
    "/intern/verify",
    "/privacy-policy",
    "/products",
    "/products/dailysupply",
    "/products/olenbot",
    "/products/olentra-ai-studio",
    "/security",
    "/services",
    "/services/:param",
    "/terms-of-service",
  ]);
  assert.deepEqual([...routes].sort(), [...expectedRoutes].sort(), "public route manifest changed");
  for (const route of routes) {
    for (const segment of route.split("/").filter(Boolean)) {
      if (segment.startsWith(":")) continue;
      assert.equal(/[A-Z_]/.test(segment), false, `non-canonical public route segment: ${route}`);
    }
  }
  for (const route of [
    "/careers/intern",
    "/intern",
    "/intern/dashboard",
    "/intern/portal",
    "/products/dailysupply",
    "/api/contact",
    "/health",
    "/intern/dashboard/applications/:param",
    "/intern/portal/projects/:param",
  ]) assert.ok(routes.has(route), `${route} is missing from the App Router tree`);
});

test("canonical frontend environment names and compatibility fallbacks are wired", () => {
  const realtime = readText(path.join(root, "frontend/src/lib/realtime.js"));
  const internshipClient = readText(path.join(root, "frontend/src/lib/intern-client.mjs"));
  assert.match(realtime, /NEXT_PUBLIC_REALTIME_WS_URL/);
  assert.doesNotMatch(realtime, /NEXT_PUBLIC_PRESENCE_WS_URL|NEXT_PUBLIC_WS_URL/);
  assert.match(internshipClient, /NEXT_PUBLIC_INTERNSHIP_BACKEND_URL/);
  assert.match(internshipClient, /NEXT_PUBLIC_INTERN_BACKEND_URL/);
  assert.match(internshipClient, /NEXT_PUBLIC_REALTIME_WS_URL/);
  assert.match(internshipClient, /\/ws\/intern/);
  const visitorTracker = readText(path.join(root, "frontend/src/components/realtime/VisitorTracker.jsx"));
  assert.doesNotMatch(visitorTracker, /usePathname|startsWith\("\/dashboard"\)/);
});
