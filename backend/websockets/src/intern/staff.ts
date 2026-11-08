import { createHash, randomUUID } from "node:crypto";
import type { ClientSession, Collection, Document, MongoClient } from "mongodb";
import { DomainError, type Principal } from "./domain";

type Row = Document & { _id: string };
type Transact = <T>(key: string, actor: Principal | null, input: unknown, fn: (session: ClientSession) => Promise<T>) => Promise<T>;
type Options = { collection: (name: string) => Collection<Row>; transact: Transact; client: MongoClient };

export const STAFF_PERMISSIONS = [
  { id: "overview.read", label: "View overview and aggregate statistics" },
  { id: "projects.summary", label: "View project summaries" },
  { id: "applications.read", label: "View application records" },
  { id: "applications.review", label: "Add reviewer notes and shortlist applicants" },
  { id: "resumes.read", label: "Download applicant resumes" },
  { id: "interns.read", label: "View basic intern information" },
  { id: "projects.read", label: "View project teams and details" },
  { id: "projects.manage", label: "Create and manage projects" },
  { id: "tasks.read", label: "View project tasks" },
  { id: "tasks.manage", label: "Assign and edit tasks" },
  { id: "submissions.read", label: "View work submissions" },
  { id: "submissions.feedback", label: "Give feedback and request changes" },
  { id: "messages.applicants", label: "Read and send applicant messages" },
  { id: "messages.interns", label: "Read and send active-intern messages" },
  { id: "notifications.read", label: "View relevant notifications" },
  { id: "certificates.read", label: "View issued certificates" },
] as const;
export type StaffPermission = typeof STAFF_PERMISSIONS[number]["id"];
const allowed = new Set<string>(STAFF_PERMISSIONS.map(p => p.id));
const defaults: { id: string; name: string; permissions: readonly StaffPermission[] }[] = [
  { id: "admin", name: "Admin", permissions: [] },
  { id: "manager", name: "Internship manager", permissions: ["overview.read", "projects.summary", "interns.read", "projects.read", "projects.manage", "tasks.read", "tasks.manage", "messages.interns", "notifications.read"] },
  { id: "recruiter", name: "Recruiter", permissions: ["overview.read", "applications.read", "applications.review", "resumes.read", "messages.applicants", "notifications.read"] },
  { id: "mentor", name: "Mentor", permissions: ["overview.read", "projects.summary", "interns.read", "projects.read", "tasks.read", "submissions.read", "submissions.feedback", "messages.interns", "notifications.read"] },
  { id: "viewer", name: "Viewer", permissions: ["overview.read", "projects.summary"] },
];
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const id = (prefix: string) => `${prefix}-${randomUUID()}`;
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const safeAccount = (row: Row) => ({ id: row._id, name: row.name, email: row.email, role: "company", staffRole: row.staffRole ?? null, disabled: row.disabled === true, sessionVersion: row.sessionVersion ?? 1, createdAt: row.createdAt });
const safeRole = (row: Row) => ({ id: row._id, name: row.name, permissions: row._id === "admin" ? [] : row.permissions, builtin: row.builtin === true, version: row.version });
const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const requirePassword = (value: unknown) => { if (typeof value !== "string" || value.length < 12 || value.length > 256) throw new DomainError("INVALID_REQUEST", "Use a password between 12 and 256 characters."); return value; };
const validatePermissions = (value: unknown): string[] => {
  if (!Array.isArray(value) || value.some(item => typeof item !== "string" || !allowed.has(item))) throw new DomainError("INVALID_REQUEST", "Choose permissions from the allowed list. Admin-only powers cannot be assigned to custom roles.");
  const result = [...new Set(value)] as string[];
  const dependencies: Record<string, string[]> = { "applications.review": ["applications.read"], "resumes.read": ["applications.read"], "projects.read": ["projects.summary", "interns.read"], "projects.manage": ["projects.read", "interns.read"], "tasks.read": ["projects.read", "interns.read"], "tasks.manage": ["tasks.read"], "submissions.read": ["tasks.read"], "submissions.feedback": ["submissions.read"], "messages.applicants": ["applications.read"], "messages.interns": ["interns.read"] };
  for (const [permission, prerequisites] of Object.entries(dependencies)) for (const prerequisite of prerequisites) if (result.includes(permission) && !result.includes(prerequisite)) throw new DomainError("INVALID_REQUEST", `${permission} requires ${prerequisite}.`);
  return result;
};

/** Staff accounts, immutable admin powers, editable limited roles and audit. */
export function createStaffManagement({ collection, transact, client }: Options) {
  const accounts = collection("accounts"), credentials = collection("test_credentials"), roles = collection("staff_roles"), guard = collection("settings"), audit = collection("staff_audit"), events = collection("events");
  const methods = new Set(["staff.list", "staff.create", "staff.update", "staff.resetPassword", "role.list", "role.create", "role.update", "audit.list"]);
  const rolesCache = new Map<string, ReturnType<typeof safeRole>>();

  async function refreshRolesCache() {
    const all = await roles.find({}).toArray();
    rolesCache.clear();
    for (const r of all) rolesCache.set(r._id, safeRole(r));
  }

  async function initialize() {
    await Promise.all([roles.createIndex({ nameKey: 1 }, { unique: true }), audit.createIndex({ createdAt: -1, _id: -1 }), accounts.createIndex({ role: 1, staffRole: 1, disabled: 1 })]);
    for (const role of defaults) await roles.updateOne({ _id: role.id }, { $setOnInsert: { name: role.name, nameKey: role.name.toLowerCase(), permissions: role.permissions, builtin: true, version: 1, createdAt: new Date() } }, { upsert: true });
    await guard.updateOne({ _id: "staff_admin_guard" }, { $setOnInsert: { revision: 0 } }, { upsert: true });
    await refreshRolesCache();
  }
  async function resolveRole(roleId: string) {
    if (rolesCache.has(roleId)) return rolesCache.get(roleId)!;
    const role = await roles.findOne({ _id: roleId });
    if (!role) return null;
    const parsed = safeRole(role);
    rolesCache.set(roleId, parsed);
    return parsed;
  }
  function resolveRoleSync(roleId: string) {
    return rolesCache.get(roleId) || null;
  }
  function requireAdmin(actor: Principal | null) {
    if (!actor) throw new DomainError("UNAUTHENTICATED", "Sign in to continue.");
    if (actor.role !== "company" || (actor as Principal & { staffRole?: string }).staffRole !== "admin") throw new DomainError("FORBIDDEN", "Internship admin access is required.");
    return actor;
  }
  async function currentAdmin(actor: Principal, session: ClientSession) {
    if (!await accounts.findOne({ _id: actor.id, role: "company", staffRole: "admin", disabled: { $ne: true }, sessionVersion: actor.sessionVersion }, { session })) throw new DomainError("FORBIDDEN", "Your admin access has changed. Sign in again.");
  }
  async function adminLock(session: ClientSession) {
    await guard.updateOne({ _id: "staff_admin_guard" }, { $inc: { revision: 1 } }, { session });
  }
  async function record(session: ClientSession, actor: Principal, action: string, targetId: string, detail: Document = {}, accountIds: string[] = []) {
    const now = new Date();
    await audit.insertOne({ _id: id("AUD"), action, actorId: actor.id, actorName: actor.name, targetId, detail, createdAt: now }, { session });
    for (let offset = 0; offset < Math.max(1, accountIds.length); offset += 500) await events.insertOne({ _id: id("EVT"), type: "staff.changed", staffAccountIds: accountIds.slice(offset, offset + 500), createdAt: now }, { session });
  }
  /** Explicit one-time migration, called only by an operator with a known address. */
  async function bootstrapFirstAdmin(email: string) {
    const normalized = text(email).toLowerCase();
    if (!validEmail(normalized)) throw new DomainError("INVALID_REQUEST", "Provide the existing internship staff email.");
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        await adminLock(session);
        const row = await accounts.findOne({ email: normalized, role: "company", disabled: { $ne: true } }, { session });
        if (!row) throw new DomainError("NOT_FOUND", "The existing staff account was not found.");
        if (row.staffRole === "admin") return;
        if (await accounts.countDocuments({ role: "company", staffRole: "admin", disabled: { $ne: true } }, { session })) throw new DomainError("CONFLICT", "An internship admin already exists. Use the staff management page instead.");
        if (row.staffRole) throw new DomainError("CONFLICT", "The staff account already has an assigned role.");
        // Legacy records without sessionVersion previously authenticated as v1.
        // Advance them to v2 as well, so a pre-migration token cannot survive.
        await accounts.updateOne({ _id: row._id }, [{ $set: { staffRole: "admin", sessionVersion: { $add: [{ $ifNull: ["$sessionVersion", 1] }, 1] } } }], { session });
        await audit.insertOne({ _id: id("AUD"), action: "admin.bootstrap", actorId: row._id, actorName: row.name, targetId: row._id, detail: {}, createdAt: new Date() }, { session });
        await events.insertOne({ _id: id("EVT"), type: "staff.changed", staffAccountIds: [row._id], createdAt: new Date() }, { session });
      });
    } finally { await session.endSession(); }
  }
  async function execute(method: string, params: Record<string, any>, actor: Principal | null, key = ""): Promise<any> {
    const admin = requireAdmin(actor);
    if (method === "role.list") return { roles: (await roles.find({}).sort({ builtin: -1, name: 1 }).toArray()).map(safeRole), permissions: STAFF_PERMISSIONS };
    if (method === "staff.list") {
      const page = Math.max(1, Math.min(100000, Math.floor(Number(params.page) || 1))), pageSize = Math.max(1, Math.min(100, Math.floor(Number(params.pageSize) || 20)));
      const filter = { role: "company" };
      const [rows, total] = await Promise.all([accounts.find(filter).sort({ name: 1, _id: 1 }).skip((page - 1) * pageSize).limit(pageSize).toArray(), accounts.countDocuments(filter)]);
      return { items: rows.map(safeAccount), total, page, pageSize };
    }
    if (method === "audit.list") {
      const page = Math.max(1, Math.min(100000, Math.floor(Number(params.page) || 1))), pageSize = Math.max(1, Math.min(100, Math.floor(Number(params.pageSize) || 20)));
      const [rows, total] = await Promise.all([audit.find({}).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).toArray(), audit.countDocuments({})]);
      return { items: rows.map(({ _id, ...row }) => ({ id: _id, ...row })), total, page, pageSize };
    }
    if (method === "role.create" || method === "role.update") {
      const roleId = method === "role.create" ? id("ROLE") : text(params.id);
      const name = text(params.name), permissions = validatePermissions(params.permissions);
      if (!name || name.length > 100) throw new DomainError("INVALID_REQUEST", "Enter a role name of up to 100 characters.");
      if (roleId === "admin") throw new DomainError("FORBIDDEN", "The admin role cannot be edited.");
      const expectedVersion = Number(params.expectedVersion);
      if (method === "role.update" && !Number.isSafeInteger(expectedVersion)) throw new DomainError("INVALID_REQUEST", "Refresh the role before editing it.");
      // A generated ID is deliberately excluded from the request fingerprint, so retries remain idempotent.
      return transact(key, admin, { method, params }, async session => {
        await adminLock(session);
        await currentAdmin(admin, session);
        if (method === "role.create") {
          const role: Row = { _id: roleId, name, nameKey: name.toLowerCase(), permissions, builtin: false, version: 1, createdAt: new Date() };
          await roles.insertOne(role, { session });
          rolesCache.set(roleId, safeRole(role));
          await record(session, admin, "role.created", roleId, { name, permissions });
          return safeRole(role);
        }
        const updated = await roles.findOneAndUpdate({ _id: roleId, version: expectedVersion }, { $set: { name, nameKey: name.toLowerCase(), permissions, updatedAt: new Date() }, $inc: { version: 1 } }, { session, returnDocument: "after" });
        if (!updated) throw new DomainError("CONFLICT", "The role changed or no longer exists. Refresh and try again.");
        rolesCache.set(roleId, safeRole(updated));
        const members = await accounts.find({ role: "company", staffRole: roleId }, { session }).project({ _id: 1 }).toArray();
        await accounts.updateMany({ role: "company", staffRole: roleId }, { $inc: { sessionVersion: 1 } }, { session });
        await record(session, admin, "role.updated", roleId, { name, permissions }, members.map(row => row._id));
        return safeRole(updated);
      });
    }
    if (method === "staff.create") {
      const name = text(params.name), email = text(params.email).toLowerCase(), staffRole = text(params.staffRole), password = requirePassword(params.password);
      if (!name || name.length > 120 || email.length > 254 || !validEmail(email)) throw new DomainError("INVALID_REQUEST", "Enter a valid name and email.");
      const passwordHash = await Bun.password.hash(password, { algorithm: "argon2id" });
      return transact(key, admin, { method, name, email, staffRole, passwordDigest: digest(password) }, async session => {
        await adminLock(session);
        await currentAdmin(admin, session);
        if (!await roles.findOne({ _id: staffRole }, { session })) throw new DomainError("INVALID_REQUEST", "Choose an existing staff role.");
        const user: Row = { _id: id("ACC"), role: "company", staffRole, name, email, applicationId: null, sessionVersion: 1, disabled: false, createdAt: new Date() };
        await accounts.insertOne(user, { session });
        await credentials.insertOne({ _id: user._id, userId: user._id, passwordHash, createdAt: new Date() }, { session });
        await record(session, admin, "staff.created", user._id, { name, email, staffRole }, [user._id]);
        return safeAccount(user);
      });
    }
    if (method === "staff.update") {
      const accountId = text(params.id), role = params.staffRole === undefined ? undefined : text(params.staffRole), disabled = params.disabled;
      if (!accountId || (role === undefined && disabled === undefined) || (disabled !== undefined && typeof disabled !== "boolean")) throw new DomainError("INVALID_REQUEST", "Choose a staff account and a valid change.");
      return transact(key, admin, { method, params }, async session => {
        // Every membership update takes the same lock before reading the last-admin state.
        await adminLock(session);
        await currentAdmin(admin, session);
        const user = await accounts.findOne({ _id: accountId, role: "company" }, { session });
        if (!user) throw new DomainError("NOT_FOUND", "Staff account not found.");
        if (role !== undefined && !await roles.findOne({ _id: role }, { session })) throw new DomainError("INVALID_REQUEST", "Choose an existing staff role.");
        const nextRole = role ?? user.staffRole, nextDisabled = disabled ?? (user.disabled === true);
        if (user.staffRole === "admin" && user.disabled !== true && (nextRole !== "admin" || nextDisabled)) {
          if (await accounts.countDocuments({ role: "company", staffRole: "admin", disabled: { $ne: true } }, { session }) <= 1) throw new DomainError("CONFLICT", "At least one active internship admin is required.");
        }
        const changed = await accounts.findOneAndUpdate({ _id: accountId, role: "company" }, { $set: { staffRole: nextRole, disabled: nextDisabled, updatedAt: new Date() }, $inc: { sessionVersion: 1 } }, { session, returnDocument: "after" });
        await record(session, admin, "staff.updated", accountId, { staffRole: nextRole, disabled: nextDisabled }, [accountId]);
        return safeAccount(changed!);
      });
    }
    if (method === "staff.resetPassword") {
      const accountId = text(params.id), password = requirePassword(params.password);
      if (!accountId) throw new DomainError("INVALID_REQUEST", "Choose a staff account.");
      const passwordHash = await Bun.password.hash(password, { algorithm: "argon2id" });
      return transact(key, admin, { method, accountId, passwordDigest: digest(password) }, async session => {
        await adminLock(session);
        await currentAdmin(admin, session);
        const user = await accounts.findOneAndUpdate({ _id: accountId, role: "company" }, { $inc: { sessionVersion: 1 } }, { session, returnDocument: "after" });
        if (!user) throw new DomainError("NOT_FOUND", "Staff account not found.");
        const secret = await credentials.updateOne({ userId: accountId }, { $set: { passwordHash, updatedAt: new Date() } }, { session });
        if (!secret.matchedCount) throw new DomainError("NOT_FOUND", "Staff credentials not found.");
        await record(session, admin, "staff.passwordReset", accountId, {}, [accountId]);
        return { id: accountId };
      });
    }
    throw new DomainError("NOT_IMPLEMENTED", "This internship action is not available yet.");
  }
  return { initialize, supports: (method: string) => methods.has(method), execute, resolveRole, resolveRoleSync, bootstrapFirstAdmin };
}
