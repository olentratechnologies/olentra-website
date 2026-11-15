import test from "node:test";
import assert from "node:assert/strict";
import { SECTION_IDS, SWITCH_IDS, effectiveSiteFeatures, normalizeFlags, switchLabel } from "../src/rules.mjs";
import { validateSiteFeatureState } from "../src/server/store.mjs";

const legacy = { services: true, products: true, internships: true, blog: true, assistant: false, maintenance: false, applications: true, portal: true };

test("settings saved before sections existed keep working, with every section visible", () => {
  const flags = normalizeFlags(legacy);
  assert.equal(Object.keys(flags).length, SWITCH_IDS.length);
  for (const id of SECTION_IDS) assert.equal(flags[id], true);
  const state = validateSiteFeatureState({ schemaVersion: 1, revision: 4, environments: { Production: { ...legacy, retired: true }, Staging: legacy } });
  assert.equal(state.environments.Production["home.testimonials"], true);
  assert.equal("retired" in state.environments.Production, false);
});

test("a subsection hides with its section, and sections follow their feature and maintenance", () => {
  const off = (overrides) => effectiveSiteFeatures({ ...legacy, ...overrides });
  assert.equal(off({ "home.hero": false })["home.hero.video"], false);
  assert.equal(off({ "home.hero.video": false })["home.hero"], true);
  assert.equal(off({ products: false })["home.products"], false);
  assert.equal(off({ services: false })["footer.services"], false);
  assert.equal(off({ services: false })["footer.links"], true);
  const maintenance = off({ maintenance: true });
  assert.equal(maintenance["home.testimonials"], false);
  assert.equal(maintenance.footer, false);
});

test("switches have readable names for messages and the audit log", () => {
  assert.equal(switchLabel("home.mission.pillars"), "Homepage · Mission & about › Operating pillars");
  assert.equal(switchLabel("footer"), "Every page · Footer");
  assert.equal(switchLabel("services"), "services");
});

test("each product has its own switch that follows Products and hides its page", async () => {
  const { siteRouteStatus, isFeatureHrefVisible } = await import("../src/rules.mjs");
  const off = (overrides) => ({ ...legacy, ...overrides });
  assert.equal(normalizeFlags(legacy)["product.dailysupply"], true);
  assert.equal(effectiveSiteFeatures(off({ "product.dailysupply": false }))["product.dailysupply"], false);
  assert.equal(effectiveSiteFeatures(off({ "product.dailysupply": false }))["product.olenbot"], true);
  assert.equal(effectiveSiteFeatures(off({ products: false }))["product.olenbot"], false);
  assert.equal(siteRouteStatus("/products/dailysupply", off({ "product.dailysupply": false })), 404);
  assert.equal(siteRouteStatus("/products/dailysupply/showcase", off({ "product.dailysupply": false })), 404);
  assert.equal(siteRouteStatus("/products", off({ "product.dailysupply": false })), 200);
  assert.equal(isFeatureHrefVisible("/products/dailysupply", off({ "product.dailysupply": false })), false);
  assert.equal(switchLabel("product.dailysupply"), "Products · Daily Supply");
});
