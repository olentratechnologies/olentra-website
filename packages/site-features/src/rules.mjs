export const FEATURE_IDS = ["services", "products", "internships", "blog", "assistant", "maintenance", "applications", "portal"];
export const ENVIRONMENTS = ["Production", "Staging"];

/**
 * Page sections and their subsections, each with its own on/off switch.
 * A subsection shows only when its section does; `requires` ties a section
 * to a feature switch (e.g. the homepage Products section follows Products).
 * New switches default to visible, so older saved settings keep working.
 */
export const SECTION_CATALOG = [
  { page: "Homepage", id: "home.hero", label: "Hero", children: [
    { id: "home.hero.video", label: "Background video" },
    { id: "home.hero.highlights", label: "Highlight chips" },
  ] },
  { page: "Homepage", id: "home.mission", label: "Mission & about", children: [
    { id: "home.mission.pillars", label: "Operating pillars" },
    { id: "home.mission.showcase", label: "Visual system showcase" },
  ] },
  { page: "Homepage", id: "home.process", label: "Creative process" },
  { page: "Homepage", id: "home.engagement", label: "How we engage (steps)" },
  { page: "Homepage", id: "home.services", label: "Services", requires: "services" },
  { page: "Homepage", id: "home.stats", label: "Impact stats" },
  { page: "Homepage", id: "home.products", label: "Products", requires: "products" },
  { page: "Homepage", id: "home.projects", label: "Latest projects" },
  { page: "Homepage", id: "home.blogs", label: "Blog & insights", requires: "blog" },
  { page: "Homepage", id: "home.testimonials", label: "Testimonials" },
  { page: "Homepage", id: "home.globe", label: "Global presence" },
  { page: "Homepage", id: "home.contact", label: "Contact form" },
  { page: "About", id: "about.hero", label: "Hero" },
  { page: "About", id: "about.vision", label: "Shared vision" },
  { page: "About", id: "about.thinking", label: "How we think" },
  { page: "About", id: "about.belief", label: "Our belief" },
  { page: "About", id: "about.future", label: "Future direction" },
  { page: "About", id: "about.closing", label: "Closing call to action" },
  { page: "Services page", id: "servicesPage.hero", label: "Page header", requires: "services" },
  { page: "Services page", id: "servicesPage.list", label: "Services list", requires: "services" },
  { page: "Products page", id: "productsPage.hero", label: "Page header", requires: "products" },
  { page: "Products page", id: "productsPage.list", label: "Products list", requires: "products" },
  { page: "Blog page", id: "blogPage.hero", label: "Page header", requires: "blog" },
  { page: "Blog page", id: "blogPage.list", label: "Articles list", requires: "blog" },
  { page: "Careers (internships)", id: "careers.hero", label: "Hero", requires: "internships" },
  { page: "Careers (internships)", id: "careers.tracks", label: "Internship tracks", requires: "internships" },
  { page: "Careers (internships)", id: "careers.insights", label: "Live internship insights", requires: "internships" },
  { page: "Careers (internships)", id: "careers.stories", label: "Success stories", requires: "internships" },
  { page: "Careers (internships)", id: "careers.why", label: "Why choose Olentra", requires: "internships" },
  { page: "Every page", id: "footer", label: "Footer", children: [
    { id: "footer.services", label: "Services column", requires: "services" },
    { id: "footer.links", label: "Quick links column" },
    { id: "footer.contact", label: "Contact column" },
  ] },
];
const SECTION_ENTRIES = SECTION_CATALOG.flatMap(section => [{ ...section, parent: null }, ...(section.children || []).map(child => ({ ...child, page: section.page, parent: section.id }))]);
export const SECTION_IDS = SECTION_ENTRIES.map(entry => entry.id);
export const SWITCH_IDS = [...FEATURE_IDS, ...SECTION_IDS];
const FEATURE_DEFAULTS = { services: true, products: true, internships: true, blog: true, assistant: false, maintenance: false, applications: true, portal: true };

/** A readable name for any switch, for messages and the audit log. */
export function switchLabel(id) {
  const entry = SECTION_ENTRIES.find(item => item.id === id);
  if (!entry) return id;
  const parent = entry.parent && SECTION_ENTRIES.find(item => item.id === entry.parent);
  return `${entry.page} · ${parent ? parent.label + " › " : ""}${entry.label}`;
}

/** Every known switch as a boolean: saved values kept, missing ones defaulted, unknown ones dropped. */
export function normalizeFlags(raw = {}) {
  const flags = {};
  for (const id of SWITCH_IDS) flags[id] = typeof raw?.[id] === "boolean" ? raw[id] : (FEATURE_DEFAULTS[id] ?? true);
  return flags;
}

export function effectiveSiteFeatures(raw) {
  const flags = normalizeFlags(raw);
  if (!flags.internships) flags.applications = false;
  if (flags.maintenance) for (const id of ["services", "products", "internships", "blog", "assistant", "applications"]) flags[id] = false;
  // Sections first, then subsections, so each child sees its parent's final state.
  for (const entry of SECTION_ENTRIES) {
    let visible = flags[entry.id] && !flags.maintenance;
    if (entry.requires) visible = visible && flags[entry.requires];
    if (entry.parent) visible = visible && flags[entry.parent];
    flags[entry.id] = visible;
  }
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
