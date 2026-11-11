import fixtures from "../../data/admin/operations.json" with { type: "json" };

const ref = fixtures.reference;
const clone = value => structuredClone(value);
const clean = value => String(value ?? "").trim();
const roleId = value => clean(value).toLowerCase().replaceAll(" ", "-");
const isEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const pending = invitation => !invitation.status || invitation.status === "Pending";
const contentIds = ctx => [...new Set([...Object.keys(ref.sourceContent), ...ctx.get("olentra-admin-content-v1", []).map(row => row.id)])];
const translationKey = (locale, contentId) => `admin-translation-${locale}-${contentId}`;
const getRows = (ctx, key) => ctx.get(key, fixtures.datasets[key] || []);
const record = (ctx, key, id) => {
  const row = getRows(ctx, key).find(item => item.id === id);
  ctx.assert(Boolean(row), "The requested record could not be found.");
  return row;
};
const replace = (ctx, key, id, next) => ctx.set(key, getRows(ctx, key).map(row => row.id === id ? next : row));
function log(ctx, action, module, details, href) {
  ctx.audit(action, module, details);
  ctx.notify({ title: action, body: details?.description || "Workspace data was updated.", category: module, severity: "info", href });
}
function coverage(ctx) {
  const ids = contentIds(ctx);
  const locales = getRows(ctx, "admin-locales").map(locale => {
    const translations = ids.map(id => ctx.get(translationKey(locale.id, id), null));
    const published = translations.filter(row => row?.status === "Published").length;
    const review = translations.filter(row => row?.status === "In review").length;
    return { ...locale, published, review, missing: ids.length - published - review };
  });
  ctx.set("admin-locales", locales);
  return locales;
}
function validateTranslation(ctx, locale, contentId, fields) {
  ctx.assert(getRows(ctx, "admin-locales").some(row => row.id === locale), "This locale is not configured.");
  ctx.assert(contentIds(ctx).includes(contentId), "This content page could not be found.");
  ctx.assert(fields && ["title", "summary", "cta"].every(key => typeof fields[key] === "string"), "Enter valid translation fields.");
  ctx.assert(fields.title.length <= 160 && fields.summary.length <= 1000 && fields.cta.length <= 100, "Translation text exceeds the field limits.");
}

export function handleOperationsCommand(type, payload = {}, ctx) {
  switch (type) {
    case "incident.update": {
      const incidents = getRows(ctx, "admin-incidents");
      const current = incidents.find(row => row.id === payload.id || row.aliases?.includes(payload.id));
      ctx.assert(current, "This incident could not be found.");
      ctx.assert(payload.status !== undefined || payload.acknowledged !== undefined || payload.message !== undefined, "No incident changes were supplied.");
      if (payload.status !== undefined) ctx.assert(["Investigating", "Monitoring", "Resolved"].includes(payload.status), "Choose a valid incident status.");
      if (payload.message !== undefined) ctx.assert(clean(payload.message), "Enter an incident update before saving.");
      if (payload.acknowledged !== undefined) ctx.assert(typeof payload.acknowledged === "boolean", "Acknowledgement must be enabled or disabled.");
      ctx.assert(payload.message !== undefined || (payload.status !== undefined && payload.status !== current.status) || (payload.acknowledged !== undefined && payload.acknowledged !== current.acknowledged), "This incident already has the requested state.");
      const next = { ...current, status: payload.status || current.status, acknowledged: payload.acknowledged ?? current.acknowledged, updatedAt: ctx.now, ...(payload.notificationTeam ? { notificationTeam: clean(payload.notificationTeam) } : {}) };
      const event = { id: ctx.id("incident-event"), at: ctx.now, title: payload.message ? "Internal update · Operations" : payload.status === "Resolved" ? "Incident resolved" : "Incident acknowledged", description: clean(payload.message) || (payload.status === "Resolved" ? "Operations marked the incident as resolved." : "Operations acknowledged the incident.") };
      next.updates = [...(current.updates || []), event];
      if (next.status === "Resolved") {
        next.resolvedAt = ctx.now;
        next.acknowledged = true;
        const probes = getRows(ctx, "admin-performance-probes");
        const healthy = probes.filter(row => row.serviceId === current.serviceId && row.available && row.responseMs < 5000).sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0];
        if (healthy) ctx.set("admin-performance-probes", [...probes, { ...healthy, id: ctx.id("probe"), at: ctx.now, serviceId: current.serviceId, region: current.region, available: true, error: undefined }]);
      }
      replace(ctx, "admin-incidents", current.id, next);
      log(ctx, next.status === "Resolved" ? "Incident resolved" : "Incident updated", "Monitoring", { id: current.id, description: current.title, before: current.status, after: next.status }, `/dashboard/monitoring/incidents/${current.id}`);
      return { value: next };
    }
    case "alert.save": {
      const rule = clone(payload.rule || {});
      ctx.assert(clean(rule.name) && clean(rule.condition), "Enter an alert name and condition.");
      ctx.assert(["Critical", "High", "Medium", "Low"].includes(rule.severity), "Choose a valid severity.");
      ctx.assert(typeof rule.enabled === "boolean" && typeof rule.recovery === "boolean", "Choose valid notification settings.");
      ctx.assert(clean(rule.metric) && clean(rule.team) && clean(rule.window), "Complete all alert settings.");
      rule.serviceId ||= ref.newAlertRule.serviceId;
      ctx.assert(ref.services.some(service => service.id === rule.serviceId), "Choose a monitored service.");
      const rows = getRows(ctx, "admin-alert-rules");
      ctx.assert(!rows.some(row => row.id !== rule.id && row.name.toLowerCase() === clean(rule.name).toLowerCase()), "An alert with this name already exists.");
      if (rule.id) record(ctx, "admin-alert-rules", rule.id);
      rule.id ||= ctx.id("alert");
      rule.name = clean(rule.name);
      rule.updatedAt = ctx.now;
      ctx.set("admin-alert-rules", rows.some(row => row.id === rule.id) ? rows.map(row => row.id === rule.id ? rule : row) : [...rows, rule]);
      log(ctx, "Alert rule saved", "Monitoring", { id: rule.id, description: rule.name, before: rows.find(row => row.id === rule.id) || null, after: rule }, "/dashboard/monitoring/alert-rules");
      return { value: rule };
    }
    case "alert.delete": {
      const row = record(ctx, "admin-alert-rules", payload.id);
      ctx.set("admin-alert-rules", getRows(ctx, "admin-alert-rules").filter(item => item.id !== payload.id));
      log(ctx, "Alert rule deleted", "Monitoring", { id: row.id, description: row.name }, "/dashboard/monitoring/alert-rules");
      return { value: row.id };
    }
    case "seo.save": {
      const current = record(ctx, "admin-seo-pages", payload.id);
      const next = { ...current, ...clone(payload.patch || {}), id: current.id, status: payload.patch?.status || "Draft", updatedAt: ctx.now };
      const comparable = row => Object.fromEntries(["title", "description", "canonical", "index"].map(key => [key, row[key]]));
      ctx.assert(["Draft", "In review"].includes(next.status), "Save metadata as a draft or submit it for review. Publication requires approval.");
      if (next.status === "In review") ctx.assert(current.status !== "In review" || JSON.stringify(comparable(current)) !== JSON.stringify(comparable(next)), "This metadata is already awaiting review.");
      ctx.assert(clean(next.title) && next.title.length <= 80, "Enter a meta title of 80 characters or fewer.");
      ctx.assert(typeof next.description === "string" && next.description.length <= 160, "Meta descriptions must contain 160 characters or fewer.");
      ctx.assert(typeof next.index === "boolean", "Choose a valid indexing setting.");
      ctx.assert(/^https?:\/\/[^\s]+$/.test(next.canonical), "Enter a valid canonical URL.");
      replace(ctx, "admin-seo-pages", current.id, next);
      if (next.status === "In review") ctx.command("approval.request", { kind: "seo", title: `Publish metadata for ${current.page}`, type: "SEO metadata", scope: "Global", actor: "Editor", reason: "Search metadata ready for review.", target: { id: current.id, patch: comparable(next) } });
      log(ctx, "SEO metadata saved", "SEO", { id: current.id, description: current.page, before: current, after: next }, "/dashboard/analytics/seo");
      return { value: next };
    }
    case "seo.publish": {
      const current = record(ctx, "admin-seo-pages", payload.id);
      ctx.assert(current.status === "In review", "This metadata is not awaiting publication approval.");
      if (payload.patch) for (const key of ["title", "description", "canonical", "index"]) ctx.assert(current[key] === payload.patch[key], "This metadata changed after review was requested. Submit it for review again.");
      const next = { ...current, status: "Published", publishedAt: ctx.now };
      replace(ctx, "admin-seo-pages", current.id, next);
      const published = getRows(ctx, "admin-seo-published");
      ctx.set("admin-seo-published", published.some(row => row.id === current.id) ? published.map(row => row.id === current.id ? next : row) : [...published, next]);
      log(ctx, "SEO metadata published", "SEO", { id: current.id, description: current.page, before: current, after: next }, "/dashboard/analytics/seo");
      return { value: next };
    }
    case "seo.redirect.save": {
      const rows = getRows(ctx, "admin-seo-redirects");
      const next = clone(payload.redirect || {});
      ctx.assert(/^\/[^\s]*$/.test(next.from) && /^\/[^\s]*$/.test(next.to), "Redirect paths must begin with / and contain no spaces.");
      ctx.assert(next.from !== next.to, "The source and destination must be different.");
      ctx.assert(["301", "302"].includes(String(next.type)), "Choose a 301 or 302 redirect.");
      ctx.assert(!rows.some(row => row.id !== next.id && row.from === next.from), "A redirect for this source already exists.");
      let target = next.to;
      const visited = new Set([next.from]);
      while (target) { ctx.assert(!visited.has(target), "This redirect would create a loop."); visited.add(target); target = rows.find(row => row.id !== next.id && row.from === target)?.to; }
      if (next.id) record(ctx, "admin-seo-redirects", next.id);
      next.id ||= ctx.id("redirect"); next.type = String(next.type); next.hits ??= 0;
      ctx.set("admin-seo-redirects", rows.some(row => row.id === next.id) ? rows.map(row => row.id === next.id ? next : row) : [...rows, next]);
      ctx.set("admin-seo-broken", getRows(ctx, "admin-seo-broken").filter(row => row.target !== next.from));
      log(ctx, "Redirect saved", "SEO", { id: next.id, description: `${next.from} → ${next.to}` }, "/dashboard/analytics/seo");
      return { value: next };
    }
    case "seo.redirect.delete":
    case "seo.link.resolve": {
      const key = type === "seo.redirect.delete" ? "admin-seo-redirects" : "admin-seo-broken";
      const row = record(ctx, key, payload.id);
      ctx.set(key, getRows(ctx, key).filter(item => item.id !== payload.id));
      log(ctx, type === "seo.redirect.delete" ? "Redirect removed" : "Broken link reviewed", "SEO", { id: row.id, description: row.from || row.target }, "/dashboard/analytics/seo");
      return { value: row.id };
    }
    case "seo.sitemap.generate": {
      ctx.set("admin-sitemap-generated", ctx.now);
      log(ctx, "Sitemap regenerated", "SEO", { description: "Indexed pages were added to the sitemap preview." }, "/dashboard/analytics/seo");
      return { value: ctx.now };
    }
    case "locale.save": {
      const locale = clone(payload.locale || {});
      ctx.assert(/^[a-z]{2}(?:-[A-Z]{2})?$/.test(locale.id || "") && clean(locale.name), "Enter a valid locale code and language name.");
      const rows = getRows(ctx, "admin-locales");
      const existing = rows.find(row => row.id === locale.id);
      const next = { ...ref.newLocale, ...existing, ...locale, code: locale.id.toUpperCase() };
      let updated = existing ? rows.map(row => row.id === locale.id ? next : row) : [...rows, next];
      if (next.default) updated = updated.map(row => ({ ...row, default: row.id === next.id }));
      ctx.set("admin-locales", updated);
      for (const id of contentIds(ctx)) if (!ctx.get(translationKey(next.id, id), null)) ctx.set(translationKey(next.id, id), clone(fixtures.templates["admin-translation-"]));
      coverage(ctx);
      log(ctx, "Locale saved", "Localization", { id: next.id, description: next.name, before: existing || null, after: next }, "/dashboard/localization");
      return { value: next };
    }
    case "locale.recalculate": return { value: coverage(ctx) };
    case "regional.save": {
      const settings = clone(payload.settings || {});
      ctx.assert(["Global", ...ref.regions].includes(settings.region), "Choose a valid region.");
      ctx.assert(getRows(ctx, "admin-locales").some(row => row.name === settings.language), "Choose a configured default language.");
      try { new Intl.DateTimeFormat("en", { timeZone: settings.timezone }); } catch { ctx.assert(false, "Choose a valid publishing timezone."); }
      ctx.assert(typeof settings.fallback === "boolean" && typeof settings.selector === "boolean", "Choose valid regional visibility settings.");
      const visibility = clone(payload.visibility || getRows(ctx, "admin-regional-visibility"));
      ctx.assert(visibility.every(row => ["Americas", "Europe", "Asia Pacific"].every(region => typeof row[region] === "boolean")), "Choose visibility for every region.");
      ctx.set("admin-regional-settings", settings); ctx.set("admin-regional-visibility", visibility);
      log(ctx, "Regional settings saved", "Localization", { description: settings.region }, "/dashboard/localization");
      return { value: settings };
    }
    case "translation.save":
    case "translation.publish": {
      const { locale, contentId } = payload;
      const key = translationKey(locale, contentId);
      const current = ctx.get(key, clone(fixtures.templates["admin-translation-"]));
      const fields = clone(payload.fields || current.fields);
      validateTranslation(ctx, locale, contentId, fields);
      const status = type === "translation.publish" ? "Published" : payload.status || "Draft";
      ctx.assert(["Draft", "In review", "Published"].includes(status), "Choose a valid translation status.");
      if (type === "translation.save") ctx.assert(status !== "Published", "Translation publication requires approval.");
      if (status !== "Draft") ctx.assert(Object.values(fields).every(value => clean(value)), "Complete all translation fields before requesting publication.");
      if (type === "translation.publish") ctx.assert(current.status === "In review", "This translation is not awaiting publication approval.");
      if (type === "translation.publish" && payload.fields) ctx.assert(JSON.stringify(current.fields) === JSON.stringify(payload.fields), "This translation changed after review was requested. Submit it for review again.");
      if (status === "In review") ctx.assert(current.status !== "In review" || JSON.stringify(current.fields) !== JSON.stringify(fields), "This translation is already awaiting review.");
      const publishedFields = type === "translation.publish" ? clone(fields) : current.publishedFields || (current.status === "Published" ? clone(current.fields) : undefined);
      const next = { ...current, fields, status, publishedFields, updatedAt: ctx.now, ...(payload.fallback !== undefined ? { fallback: payload.fallback } : {}) };
      ctx.set(key, next); coverage(ctx);
      if (status === "In review") ctx.command("approval.request", { kind: "translation", title: `Publish ${locale} ${contentId} translation`, type: "Translation", scope: locale, actor: "Editor", reason: "Translation ready for review.", target: { locale, contentId, fields }, changes: { fields } });
      log(ctx, status === "Published" ? "Translation published" : "Translation saved", "Localization", { locale, contentId, description: `${locale} · ${contentId} · ${status}`, before: current, after: next }, `/dashboard/localization/${locale}/${contentId}`);
      return { value: next };
    }
    case "role.save": {
      const id = roleId(payload.roleId);
      ctx.assert(ref.roles.some(name => roleId(name) === id), "This role could not be found.");
      const permissions = clone(payload.permissions || []);
      ctx.assert(permissions.length === ref.permissionModules.length && new Set(permissions.map(row => row.name)).size === permissions.length, "Supply permissions for every module exactly once.");
      for (const row of permissions) { ctx.assert(ref.permissionModules.includes(row.name), "Unknown permission module."); for (const key of ["view", "edit", "publish", "manage"]) ctx.assert(typeof row[key] === "boolean", "Permission values must be true or false."); ctx.assert(row.view || !(row.edit || row.publish || row.manage), "Editing, publishing and management require view access."); ctx.assert(!row.publish || row.edit, "Publishing requires edit access."); if (row.name === "Applications") row.publish = false; row.id = row.name; }
      const previous = ctx.get("admin-role-permissions-" + id, null);
      ctx.set("admin-role-permissions-" + id, permissions);
      ctx.set("admin-role-reviews", { ...ctx.get("admin-role-reviews", {}), [id]: { reviewedBy: ctx.actor || "System", reviewedAt: ctx.now } });
      const count = permissions.filter(row => row.view).length;
      log(ctx, "Role permissions saved", "Team", { id, description: `${id} · ${count} accessible modules`, before: previous, after: permissions }, `/dashboard/team/roles/${id}`);
      return { value: permissions };
    }
    default: return false;
  }
}
