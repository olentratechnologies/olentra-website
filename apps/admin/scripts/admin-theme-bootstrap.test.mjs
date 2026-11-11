import test from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { WORKSPACE_THEME_BOOTSTRAP } from "@olentra/ui/theme/workspace-theme-bootstrap.mjs";
import { ADMIN_THEME_KEY } from "@olentra/ui/theme/workspace-theme.mjs";
import { INTERN_THEME_KEY } from "@olentra/ui/theme/intern-theme.mjs";
import { DARK_PRESETS, DARK_PRESET_KEY, DEFAULT_DARK_PRESET } from "@olentra/ui/theme/dark-presets.mjs";

const initialAttributes = () => new Map([
  ["class", "public-dark"],
  ["data-theme", "public-theme"],
  ["data-admin-theme", "untouched-admin"],
  ["data-admin-dark-preset", "untouched-preset"],
  ["data-intern-theme", "untouched-intern"],
  ["data-intern-dark-preset", "untouched-intern-preset"],
]);

function runBootstrap(pathname, saved = {}, storageFailure) {
  const attributes = initialAttributes();
  const reads = [];
  const context = {
    location: { pathname },
    document: {
      documentElement: {
        setAttribute: (name, value) => attributes.set(name, value),
      },
    },
  };
  Object.defineProperty(context, "localStorage", {
    get() {
      if (storageFailure === "access") throw new Error("Storage access denied");
      return {
        getItem(key) {
          reads.push(key);
          if (storageFailure === "read") throw new Error("Storage read denied");
          return saved[key] ?? null;
        },
      };
    },
  });
  runInNewContext(WORKSPACE_THEME_BOOTSTRAP, context);
  return { attributes, reads };
}

const themedRoutes = [
  {
    name: "company workspace",
    paths: ["/dashboard", "/dashboard/", "/dashboard/login", "/dashboard/analytics/seo"],
    key: ADMIN_THEME_KEY,
    attribute: "data-admin-theme",
    presetAttribute: "data-admin-dark-preset",
    opposite: "data-intern-theme",
  },
  {
    name: "internship workspace and account pages",
    paths: [
      "/intern/dashboard", "/intern/dashboard/", "/intern/dashboard/applications/123",
      "/intern/portal", "/intern/portal/projects/123",
      "/intern/register", "/intern/register/",
      "/intern/reset-password", "/intern/reset-password/",
      "/intern/verify", "/intern/verify/",
    ],
    key: INTERN_THEME_KEY,
    attribute: "data-intern-theme",
    presetAttribute: "data-intern-dark-preset",
    opposite: "data-admin-theme",
  },
];

for (const route of themedRoutes) {
  test(`${route.name} restores only its own saved preference`, () => {
    for (const pathname of route.paths) {
      for (const theme of ["light", "dark"]) {
        const saved = {
          [ADMIN_THEME_KEY]: route.key === ADMIN_THEME_KEY ? theme : theme === "dark" ? "light" : "dark",
          [DARK_PRESET_KEY]: "carbon-silver",
          [INTERN_THEME_KEY]: route.key === INTERN_THEME_KEY ? theme : theme === "dark" ? "light" : "dark",
        };
        const { attributes, reads } = runBootstrap(pathname, saved);
        const expected = initialAttributes();
        expected.set(route.attribute, theme);
        expected.set(route.presetAttribute, "carbon-silver");
        assert.deepEqual(attributes, expected, `${pathname}: ${theme}`);
        assert.equal(attributes.get(route.opposite), initialAttributes().get(route.opposite));
        assert.deepEqual(reads, [route.key, DARK_PRESET_KEY]);
      }
    }
  });

  test(`${route.name} defaults to light for missing or invalid preferences`, () => {
    for (const savedValue of [undefined, "", "system", "DARK", 'dark\";alert(1)//']) {
      const saved = savedValue === undefined ? {} : { [route.key]: savedValue };
      const { attributes, reads } = runBootstrap(route.paths[0], saved);
      const expected = initialAttributes();
      expected.set(route.attribute, "light");
      expected.set(route.presetAttribute, DEFAULT_DARK_PRESET);
      assert.deepEqual(attributes, expected);
      assert.deepEqual(reads, [route.key, DARK_PRESET_KEY]);
    }
  });

  test(`${route.name} remains usable when browser storage is blocked`, () => {
    for (const storageFailure of ["access", "read"]) {
      const { attributes } = runBootstrap(route.paths[0], {}, storageFailure);
      const expected = initialAttributes();
      expected.set(route.attribute, "light");
      expected.set(route.presetAttribute, DEFAULT_DARK_PRESET);
      assert.deepEqual(attributes, expected, storageFailure);
    }
  });
}

test("every shared dark design restores only the active workspace attributes", () => {
  for (const { id } of DARK_PRESETS) {
    const saved = { [ADMIN_THEME_KEY]: "dark", [DARK_PRESET_KEY]: id, [INTERN_THEME_KEY]: "light" };
    for (const route of themedRoutes) {
      for (const pathname of route.paths) {
        const { attributes, reads } = runBootstrap(pathname, saved);
        const expected = initialAttributes();
        expected.set(route.attribute, saved[route.key]);
        expected.set(route.presetAttribute, id);
        assert.deepEqual(attributes, expected, `${pathname}: ${id}`);
        assert.deepEqual(reads, [route.key, DARK_PRESET_KEY]);
      }
    }
  }
});

test("public, login, and lookalike routes leave attributes and storage untouched", () => {
  for (const pathname of [
    "/", "/about", "/careers/intern", "/intern", "/intern/login", "/intern/login/",
    "/dashboard-preview", "/dashboards", "/other/dashboard",
    "/intern/dashboard-preview", "/intern/portals", "/intern/register-preview",
    "/intern/register/extra", "/intern/reset-password/extra", "/intern/verify/extra",
  ]) {
    let storageAccesses = 0;
    const attributes = initialAttributes();
    const context = {
      location: { pathname },
      document: { documentElement: { setAttribute: (name, value) => attributes.set(name, value) } },
    };
    Object.defineProperty(context, "localStorage", {
      get() {
        storageAccesses += 1;
        throw new Error("Unrelated routes must not access theme storage");
      },
    });
    runInNewContext(WORKSPACE_THEME_BOOTSTRAP, context);
    assert.deepEqual(attributes, initialAttributes(), pathname);
    assert.equal(storageAccesses, 0, pathname);
  }
});
