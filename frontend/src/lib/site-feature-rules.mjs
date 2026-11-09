export const FEATURE_IDS = ["services", "products", "internships", "blog", "assistant", "maintenance", "applications", "portal"];
export const ENVIRONMENTS = ["Production", "Staging"];

export function effectiveSiteFeatures(raw) {
  const flags = { ...raw };
  if (!flags.internships) flags.applications = false;
  if (flags.maintenance) for (const id of ["services", "products", "internships", "blog", "assistant", "applications"]) flags[id] = false;
  return flags;
}

export function featureForPath(value = "/") {
  const path = value.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  const inPath = prefix => path === prefix || path.startsWith(prefix + "/");
  if (inPath("/services")) return "services";
  if (inPath("/products")) return "products";
  if (inPath("/blogs")) return "blog";
  if (path === "/intern/register") return "applications";
  if (inPath("/intern/portal")) return "portal";
  if (path === "/careers/intern" || path === "/intern") return "internships";
  return null;
}

export function siteRouteStatus(path, raw) {
  const clean = path.split(/[?#]/)[0];
  if (/^\/(dashboard|api|_next|health)(\/|$)/.test(clean) || /^\/intern\/(dashboard|login|reset-password)(\/|$)/.test(clean) || /\.[a-z\d]+$/i.test(clean)) return 200;
  const feature = featureForPath(clean), flags = effectiveSiteFeatures(raw);
  if (feature === "portal") return flags.portal ? 200 : 404;
  if (flags.maintenance) return 503;
  return feature && !flags[feature] ? 404 : 200;
}

export function isFeatureHrefVisible(href, raw) {
  const flags = effectiveSiteFeatures(raw);
  if (href === "/#services" || href === "#services") return Boolean(flags.services);
  if (href === "/#products" || href === "#products") return Boolean(flags.products);
  if (href === "/#blogs" || href === "#blogs") return Boolean(flags.blog);
  if (!href || !href.startsWith("/")) return true;
  const feature = featureForPath(href);
  return !feature || Boolean(flags[feature]);
}
