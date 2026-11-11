const KEYS = {
  approvals: "olentra-admin-governance-approvals-v1",
  audit: "olentra-admin-governance-audit-v1",
  connections: "olentra-admin-integrations-v1",
  company: "olentra-admin-company-settings-v1",
  backups: "olentra-admin-backups-v1",
  backup: "olentra-admin-backup-settings-v1",
  restore: "olentra-admin-restore-preview-v1",
  notifications: "olentra-admin-notifications-v1",
  notificationPreferences: "olentra-admin-notification-preferences-v1",
  account: "olentra-admin-account-v1",
  approvalPolicy: "olentra-admin-approval-policy-v1",
};

const SETTINGS_FIELDS = {
  company: ["company", "website", "email", "phone", "description", "language", "timezone", "scope", "dateFormat", "logo"],
  backup: ["retention", "target", "scope", "selected", "review"],
  notificationPreferences: ["inApp", "email", "digest", "critical", "approvals", "content", "system", "quiet", "timezone", "from", "to"],
  account: ["name", "email", "role", "jobTitle", "timezone", "language", "dateFormat", "emailUpdates", "approvalDigest", "reduceMotion"],
  approvalPolicy: ["production", "content", "translations"],
};

const clone = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const emailValid = (value) => typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const configKey = (id) => `olentra-admin-integration-config-${id}-v1`;
const relativeTime = (iso) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
const displayDate = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const approvalKind = (request) => request.kind || (request.type === "Translation" ? "translation" : request.type === "Content" ? "content" : request.type === "Program" ? "program" : /seo/i.test(request.type || "") ? "seo" : "features");
const stableJson = (value) => JSON.stringify(value, (_, item) => isPlainObject(item) ? Object.fromEntries(Object.keys(item).sort().map((key) => [key, item[key]])) : item);
function approvalFingerprint(request) {
  const kind = approvalKind(request);
  const target = kind === "translation" ? { locale: request.target?.locale, contentId: request.target?.contentId } : kind === "features" ? null : { id: request.target?.id };
  let snapshot = kind === "features" ? request.changes : kind === "content" || kind === "program" ? request.target?.model : kind === "seo" ? request.target?.patch : request.target?.fields || request.changes?.fields;
  if (kind === "program" && isPlainObject(snapshot)) snapshot = Object.fromEntries(Object.entries(snapshot).filter(([key]) => !["updatedAt", "publishedAt", "status"].includes(key)));
  return stableJson({ kind, environment: request.environment || "Production", scope: request.scope || "Global", target, snapshot });
}

function validateUrl(ctx, value, label, optional = false) {
  if (optional && !value) return;
  let parsed;
  try { parsed = new URL(value); } catch { ctx.assert(false, `${label} must be a valid https:// URL.`); }
  ctx.assert(parsed?.protocol === "https:", `${label} must use https://.`);
}

function getIntegration(ctx, id, validateConnection = false) {
  const connections = ctx.get(KEYS.connections, {});
  ctx.assert(typeof id === "string" && Object.hasOwn(connections, id), "Integration not found.");
  const config = ctx.get(configKey(id), {});
  if (validateConnection) {
    ctx.assert(typeof config.sender === "string" && config.sender.trim(), "Save a sender or workspace name before connecting.");
    ctx.assert(emailValid(config.email), "Save a valid notification email before connecting.");
    ctx.assert(config.credentialConfigured === true, "Configure a local demo credential before connecting or testing.");
    ctx.assert(["Production", "Staging"].includes(config.environment), "Choose a valid integration environment.");
    validateUrl(ctx, config.webhook, "Webhook URL", true);
  }
  return { connections, config };
}

function notify(ctx, title, body, href, category = "System", severity = "success") {
  ctx.notify({ title, body, description: body, category, severity, href });
}

function requestApproval(payload, ctx) {
  ctx.assert(isPlainObject(payload), "Provide a change request.");
  ctx.assert(typeof payload.title === "string" && payload.title.trim(), "A change title is required.");
  const kind = approvalKind(payload);
  ctx.assert(["features", "content", "translation", "seo", "program"].includes(kind), "Unsupported change type.");
  if (kind === "features") {
    ctx.assert(isPlainObject(payload.changes) && Object.keys(payload.changes).length > 0, "Provide feature values to review.");
    const current = ctx.get(`features:${payload.environment || "Production"}`, {});
    for (const [key, value] of Object.entries(payload.changes)) ctx.assert(Object.hasOwn(current, key) && typeof value === "boolean", `Invalid feature value: ${key}.`);
  } else if (kind === "content" || kind === "seo" || kind === "program") ctx.assert(typeof payload.target?.id === "string" && payload.target.id.trim(), kind === "seo" ? "An SEO page is required." : kind === "program" ? "An internship program is required." : "A content record is required.");
  else ctx.assert(typeof payload.target?.locale === "string" && typeof payload.target?.contentId === "string", "A locale and content record are required.");
  const requests = ctx.get(KEYS.approvals, []);
  const fingerprint = approvalFingerprint({ ...payload, kind });
  ctx.assert(!requests.some((item) => item.status === "pending" && approvalFingerprint(item) === fingerprint), "This change is already awaiting review.");
  const id = payload.id || ctx.id("CHG");
  ctx.assert(!requests.some((item) => item.id === id), "A change request with this ID already exists.");
  const request = {
    ...clone(payload), id, kind, title: payload.title.trim(), type: payload.type || (kind === "features" ? "Feature change" : kind === "content" ? "Content" : kind === "program" ? "Program" : kind === "seo" ? "SEO metadata" : "Translation"),
    status: "pending", actor: payload.actor || "Owner", submitted: "Just now", requestedAt: ctx.now,
    scope: payload.scope || "Global", impact: payload.impact || (kind === "features" ? "High impact" : "Standard"),
    reason: payload.reason || "Submitted for review.", environment: payload.environment || "Production",
  };
  if (kind === "features" && !request.previous) request.previous = clone(ctx.get(`published-features:${request.environment}`, {}));
  ctx.set(KEYS.approvals, [request, ...requests]);
  ctx.audit("Requested approval", "Approvals & Audit Log", { resource: request.title, approval: id, before: null, after: request });
  notify(ctx, `${request.title} needs approval`, request.reason, `/dashboard/approvals/${id}`, "Approvals", "info");
  return { value: request };
}

export function handleGovernanceCommand(type, payload = {}, ctx) {
  if (type === "approval.request") return requestApproval(payload, ctx);

  if (type === "approval.decide") {
    const requests = ctx.get(KEYS.approvals, []);
    const id = payload.id === "internships" ? "CHG-024" : payload.id;
    const request = requests.find((item) => item.id === id);
    ctx.assert(request, "Change request not found.");
    ctx.assert(["pending", "changes"].includes(request.status), "This change request has already been decided.");
    ctx.assert(["approve", "reject", "changes"].includes(payload.decision), "Choose approve, reject or changes.");
    if (payload.decision !== "approve") ctx.assert(typeof payload.reason === "string" && payload.reason.trim(), "Add a review note for this decision.");
    if (payload.decision === "approve") {
      const kind = approvalKind(request);
      if (kind === "features") {
        const environment = request.environment || "Production";
        const values = { ...ctx.get(`published-features:${environment}`, {}), ...request.changes };
        ctx.command("features.publish", { values, environment, approvalId: request.id });
      } else if (kind === "content") ctx.command("content.publish", { id: request.target?.id, model: request.target?.model, approvalId: request.id });
      else if (kind === "program") ctx.command("program.publish", { id: request.target?.id, model: request.target?.model, approvalId: request.id });
      else if (kind === "seo") ctx.command("seo.publish", { id: request.target?.id, patch: request.target?.patch, approvalId: request.id });
      else ctx.command("translation.publish", { locale: request.target?.locale, contentId: request.target?.contentId, fields: request.target?.fields || request.changes?.fields, approvalId: request.id });
    }
    const status = payload.decision === "approve" ? "approved" : payload.decision === "reject" ? "rejected" : "changes";
    const next = { ...request, status, decisionNote: payload.reason?.trim() || "", decidedAt: ctx.now };
    ctx.update(KEYS.approvals, (items) => items.map((item) => item.id === id ? next : item));
    ctx.audit(status === "approved" ? "Approved change" : status === "rejected" ? "Rejected change" : "Requested changes", "Approvals & Audit Log", { resource: request.title, approval: id, before: request.status, after: status, reason: next.decisionNote || request.reason });
    notify(ctx, `${request.title}: ${status}`, next.decisionNote || request.reason, `/dashboard/approvals/${id}`, "Approvals", status === "rejected" ? "warning" : "success");
    return { value: next };
  }

  if (type === "audit.restore") {
    const event = ctx.get(KEYS.audit, []).find((item) => item.id === payload.id);
    ctx.assert(event, "Audit event not found.");
    const target = event.restore || event.details?.restore;
    ctx.assert(target && typeof target.key === "string" && Object.hasOwn(target, "before"), "This event does not contain a restorable snapshot.");
    ctx.assert(![KEYS.audit, KEYS.backups, "auth-accounts", "auth-session"].includes(target.key), "This dataset cannot be restored from an audit event.");
    ctx.assert(ctx.get(target.key) !== undefined, "The target dataset no longer exists.");
    const previous = clone(ctx.get(target.key));
    if (target.key.startsWith("published-features:")) ctx.command("features.publish", { environment: target.key.split(":")[1], values: clone(target.before) });
    else if (target.key === KEYS.account) ctx.command("settings.save", { section: "account", values: clone(target.before) });
    else ctx.set(target.key, clone(target.before));
    ctx.audit("Restored previous configuration", "Approvals & Audit Log", { resource: event.resource || event.action, reason: `Restored from ${event.id}`, before: previous, after: target.before, restore: { key: target.key, before: previous, after: clone(target.before) } });
    notify(ctx, "Configuration restored", `Restored the saved JSON state from ${event.id}.`, "/dashboard/audit");
    return { value: { key: target.key, restoredFrom: event.id } };
  }

  if (type === "integration.save") {
    const { config: previous } = getIntegration(ctx, payload.id);
    ctx.assert(isPlainObject(payload.config), "Provide an integration configuration.");
    const allowed = ["sender", "email", "environment", "webhook", "credentialConfigured", "signingSecretConfigured", "subscriptions", "serviceId"];
    const patch = Object.fromEntries(Object.entries(payload.config).filter(([key]) => allowed.includes(key)));
    const config = { ...previous, ...clone(patch), serviceId: payload.id, updatedAt: ctx.now };
    ctx.assert(typeof config.sender === "string" && config.sender.trim(), "Sender or workspace name is required.");
    ctx.assert(emailValid(config.email), "Enter a valid notification email.");
    ctx.assert(["Production", "Staging"].includes(config.environment), "Choose Production or Staging.");
    ctx.assert(typeof config.credentialConfigured === "boolean", "Credential configuration state must be a boolean.");
    ctx.assert(isPlainObject(config.subscriptions) && Object.values(config.subscriptions).every((value) => typeof value === "boolean"), "Event subscription values must be booleans.");
    validateUrl(ctx, config.webhook, "Webhook URL", true);
    ctx.set(configKey(payload.id), config);
    ctx.audit("Updated integration settings", "Integrations", { resource: payload.id, before: previous, after: config, restore: { key: configKey(payload.id), before: previous, after: config } });
    return { value: config };
  }

  if (type === "integration.connect" || type === "integration.test") {
    const { connections, config } = getIntegration(ctx, payload.id, true);
    const next = { ...config, lastTestAt: ctx.now, lastTestStatus: "passed" };
    if (type === "integration.connect") { next.connectedAt = ctx.now; ctx.set(KEYS.connections, { ...connections, [payload.id]: "connected" }); }
    ctx.set(configKey(payload.id), next);
    ctx.audit(type === "integration.connect" ? "Connected local service configuration" : "Validated local service configuration", "Integrations", { resource: payload.id, before: config.lastTestStatus || "not tested", after: "passed", localOnly: true });
    return { value: { id: payload.id, status: "passed", localOnly: true, testedAt: ctx.now, message: "Saved service configuration passed local validation. No remote request was sent." } };
  }

  if (type === "settings.save") {
    const section = payload.section;
    ctx.assert(Object.hasOwn(SETTINGS_FIELDS, section), "Unknown settings section.");
    ctx.assert(isPlainObject(payload.values), "Provide settings values.");
    const allowed = SETTINGS_FIELDS[section];
    ctx.assert(Object.keys(payload.values).every((key) => allowed.includes(key)), "This settings payload contains an unsupported field.");
    const key = KEYS[section], previous = ctx.get(key, {}), next = { ...previous, ...clone(payload.values) };
    if (section === "company") {
      ctx.assert(typeof next.company === "string" && next.company.trim(), "Company name is required.");
      ctx.assert(emailValid(next.email), "Enter a valid company contact email.");
      validateUrl(ctx, next.website, "Company website", true);
      ctx.assert(typeof next.logo === "string" && (!next.logo || /^data:image\/(png|jpeg|webp);base64,/.test(next.logo)), "Choose a PNG, JPG or WebP logo.");
      ctx.assert(!next.logo || next.logo.length < 3 * 1024 * 1024, "Logo is too large for local storage.");
    }
    if (section === "account") {
      // Name, email and access level come from the staff account on the server.
      ctx.assert(next.name === previous.name && next.email === previous.email && next.role === previous.role, "Change your name, email or access level in Internship dashboard → Staff & roles.");
    }
    if (section === "backup") {
      ctx.assert(["7 days", "30 days", "90 days"].includes(next.retention), "Choose a supported backup retention period.");
      ctx.assert(next.target === "Staging", "Local recovery targets the staging dataset.");
      ctx.assert(["Content and configuration", "Content only", "Configuration only"].includes(next.scope), "Choose a valid restore scope.");
      ctx.assert(ctx.get(KEYS.backups, []).some((item) => item.id === next.selected), "Choose an existing backup.");
    }
    if (section === "notificationPreferences") {
      for (const field of ["inApp", "email", "digest", "critical", "approvals", "content", "system", "quiet"]) ctx.assert(typeof next[field] === "boolean", `Notification setting ${field} must be a boolean.`);
      ctx.assert(/^([01]\d|2[0-3]):[0-5]\d$/.test(next.from) && /^([01]\d|2[0-3]):[0-5]\d$/.test(next.to), "Quiet hours must use valid 24-hour times.");
    }
    if (section === "approvalPolicy") for (const value of Object.values(next)) ctx.assert(typeof value === "boolean", "Review policy values must be booleans.");
    ctx.set(key, next);
    if (section === "account") ctx.set("account-profile-" + ctx.get("auth-session", {}).userId, next);
    ctx.audit("Updated settings", section === "account" ? "Team & Access" : "Settings & Backups", { resource: section, before: previous, after: next, restore: { key, before: previous, after: next } });
    return { value: next };
  }

  if (type === "backup.create") {
    const snapshot = ctx.snapshot();
    for (const key of [KEYS.backups, KEYS.audit, "auth-accounts", "auth-session"]) delete snapshot.datasets[key];
    const backup = { id: ctx.id("BKP"), title: `Manual backup · ${displayDate(ctx.now)}`, date: displayDate(ctx.now), time: `${relativeTime(ctx.now)} UTC`, createdAt: ctx.now, scope: "Content + configuration", size: `${Math.max(1, Math.ceil(JSON.stringify(snapshot).length / 1024))} KB`, status: "Verified", snapshot };
    const retentionDays = parseInt(ctx.get(KEYS.backup, {}).retention || "30", 10);
    const cutoff = new Date(ctx.now).getTime() - retentionDays * 86400000;
    ctx.update(KEYS.backups, (items) => [backup, ...items.filter((item) => !item.createdAt || new Date(item.createdAt).getTime() >= cutoff)]);
    ctx.set(KEYS.backup, { ...ctx.get(KEYS.backup, {}), selected: backup.id });
    ctx.audit("Created JSON backup", "Settings & Backups", { resource: backup.title, backupId: backup.id, after: "Verified" });
    notify(ctx, "JSON backup created", `${backup.title} contains a restorable snapshot.`, "/dashboard/settings/backups");
    return { value: backup };
  }

  if (type === "backup.restore") {
    ctx.assert(payload.confirmation === "RESTORE", "Type RESTORE to confirm recovery.");
    const backup = ctx.get(KEYS.backups, []).find((item) => item.id === payload.id);
    ctx.assert(backup, "Backup not found.");
    const snapshot = backup.snapshot || (backup.snapshotRef === "initial" ? ctx.initialSnapshot : null);
    ctx.assert(snapshot?.datasets && isPlainObject(snapshot.datasets), "This backup has no valid JSON snapshot.");
    const settings = ctx.get(KEYS.backup, {}), scope = settings.scope || "Content and configuration";
    ctx.restore(clone(snapshot), scope);
    const result = { backup: backup.title, backupId: backup.id, scope, time: ctx.now };
    ctx.set(KEYS.restore, result);
    ctx.audit("Restored JSON backup", "Settings & Backups", { resource: backup.title, backupId: backup.id, after: "Restored", scope });
    notify(ctx, "Local JSON restored", `${backup.title} was restored for ${scope.toLowerCase()}.`, "/dashboard/settings/backups");
    return { value: result };
  }

  if (type === "notification.read" || type === "notification.delete") {
    const items = ctx.get(KEYS.notifications, []);
    const item = items.find((entry) => entry.id === payload.id);
    ctx.assert(item, "Notification not found.");
    if (type === "notification.delete") ctx.set(KEYS.notifications, items.filter((entry) => entry.id !== payload.id));
    else { ctx.assert(typeof payload.read === "boolean", "Read state must be a boolean."); ctx.set(KEYS.notifications, items.map((entry) => entry.id === payload.id ? { ...entry, read: payload.read } : entry)); }
    return { value: { id: payload.id, read: payload.read, deleted: type === "notification.delete" } };
  }

  if (type === "notification.readAll") {
    const items = ctx.get(KEYS.notifications, []);
    const changed = items.filter((item) => !item.read).length;
    ctx.set(KEYS.notifications, items.map((item) => ({ ...item, read: true })));
    return { value: { changed } };
  }

  return false;
}
