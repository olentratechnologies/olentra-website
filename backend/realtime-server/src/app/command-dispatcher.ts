import { createCommunications } from "../modules/communications/communications.service";
import { createLifecycle } from "../modules/lifecycle/lifecycle.service";
import { createInternshipQueries } from "../modules/queries/query.service";
import { createStaffManagement } from "../modules/staff/staff.service";
import { authorizeStaff, can, isAdmin } from "../modules/access/policy";
import { MongoClient, type ClientSession, type Db, type Document } from "mongodb";
import type { InternshipRow } from "../infrastructure/database/collections";
import { DomainError } from "../shared/errors";
import type { InternshipHooks, Principal } from "../shared/principal";
import { digest, emailValue as emailOf, id, stringValue as str, token } from "../shared/ids";

export { DomainError } from "../shared/errors";
export type { InternshipHooks, Principal } from "../shared/principal";
export { connectInternDatabase } from "../infrastructure/database/client";

type Row = InternshipRow;
const publicAccount = (row: Row): Principal => ({ id: row._id, role: row.role, name: row.name, email: row.email, applicationId: row.applicationId ?? null, sessionVersion: row.sessionVersion ?? 1 });
const publicApplication = (row: Row, staff: boolean) => {
  const { _id, claimHash, claimExpiresAt, communicationFence, ...record } = row;
  if (!staff) { delete record.notes; delete record.internalNotes; }
  return { ...record, id: _id };
};

export function createInternshipDomain({ db, client, prefix = "intern_", intakeOpen = async () => true, hooks }: {
  db: Db; client: MongoClient; prefix?: string; intakeOpen?: () => Promise<boolean>; hooks?: InternshipHooks;
}) {
  let activeHooks = hooks;
  const setHooks = (h: InternshipHooks) => { activeHooks = h; };
  const collection = (name: string) => db.collection<Row>(prefix + name);
  const users = collection("accounts"), credentials = collection("test_credentials"), applications = collection("applications"), programs = collection("programs"), files = collection("files"), commands = collection("commands");
  const settings = collection("settings"), events = collection("events");
  async function initialize() {
    await Promise.all([
      lifecycle.initialize(),
      communications.initialize(),
      staffManagement.initialize(),
      users.createIndex({ email: 1 }, { unique: true }),
      applications.createIndex({ email: 1 }, { unique: true }),
      applications.createIndex({ appliedOn: -1, _id: -1 }),
      applications.createIndex({ programId: 1, status: 1, appliedOn: -1 }),
      credentials.createIndex({ userId: 1 }, { unique: true }),
      commands.createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 * 7 }),
      events.createIndex({ applicationId: 1, createdAt: -1 }),
      events.createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 * 7 }),
    ]);
    await Promise.all([
      programs.updateOne({ _id: "explorer" }, { $setOnInsert: { name: "Tech Explorer", fee: null, stipend: null, enabled: false } }, { upsert: true }),
      programs.updateOne({ _id: "innovator" }, { $setOnInsert: { name: "Tech Innovator", fee: null, stipend: null, enabled: false } }, { upsert: true }),
      settings.updateOne({ _id: "program" }, { $setOnInsert: { programEnabled: false, defaultBatch: "", maxStipend: null } }, { upsert: true }),
    ]);
  }
  async function login(email: string, password: string): Promise<Principal | null> {
    const user = await users.findOne({ email: emailOf(email), disabled: { $ne: true } });
    if (!user) return null;
    // Credentials and role resolution are independent once the account is known.
    const [secret, resolved] = await Promise.all([credentials.findOne({ userId: user._id }), resolveAccount(user)]);
    if (!secret || !(await Bun.password.verify(password, secret.passwordHash))) return null;
    return resolved;
  }
  async function resolveAccount(row: Row): Promise<Principal | null> {
    const account = publicAccount(row);
    if (account.role !== "company") return account;
    if (typeof row.staffRole !== "string") return null;
    const role = await staffManagement.resolveRole(row.staffRole);
    return role ? { ...account, staffRole: role.id, permissions: role.permissions || [] } : null;
  }
  async function account(userId: string): Promise<Principal | null> {
    const row = await users.findOne({ _id: userId, disabled: { $ne: true } });
    return row ? resolveAccount(row) : null;
  }
  async function createTestStaff(email: string, password: string, name = "Internship team") {
    const normalized = emailOf(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || password.length < 12 || password.length > 256) throw new DomainError("INVALID_REQUEST", "Provide a valid email and a password of at least 12 characters.");
    if (await users.findOne({ email: normalized })) throw new DomainError("CONFLICT", "An account already exists for this email.");
    if (await users.findOne({ role: "company", staffRole: "admin", disabled: { $ne: true } })) throw new DomainError("FORBIDDEN", "An admin already exists. Create staff accounts through the internship dashboard.");
    const secret = await Bun.password.hash(password, { algorithm: "argon2id" });
    const user: Row = { _id: id("ACC"), role: "company", name: str(name), email: normalized, applicationId: null, sessionVersion: 1, createdAt: new Date(), testAccount: true };
    const session = client.startSession();
    try { await session.withTransaction(async () => { await users.insertOne(user, { session }); await credentials.insertOne({ _id: user._id, userId: user._id, passwordHash: secret, createdAt: new Date(), testAccount: true }, { session }); }); }
    finally { await session.endSession(); }
    try { await staffManagement.bootstrapFirstAdmin(normalized); }
    catch (error) { const removed = await users.deleteOne({ _id: user._id, staffRole: { $exists: false } }); if (removed.deletedCount) await credentials.deleteOne({ userId: user._id }); throw error; }
    return (await account(user._id))!;
  }
  type PublicData = {
    organization: { name: string; legalName: string; website: string };
    programs: { id: string; name: string; fee: number | null; stipend: number | null; enabled: boolean }[];
    settings: { programEnabled: boolean; explorerEnabled: boolean; innovatorEnabled: boolean; maxStipend: number; defaultBatch: string; programName: string; applicationAlerts: boolean; weeklyDigest: boolean; reviewReminder: boolean; emailNotifications: boolean; integrations: Record<string, unknown> };
  };
  let cachedPublicData: PublicData | null = null;
  function invalidatePublicData() { cachedPublicData = null; }
  async function fetchPublicData(): Promise<PublicData> {
    const [rows, config] = await Promise.all([programs.find({}).sort({ _id: 1 }).toArray(), settings.findOne({ _id: "program" })]);
    return { organization: { name: "Olentra", legalName: "Olentra Technologies Pvt. Ltd.", website: "/" }, programs: rows.map(({ _id, ...row }: any) => ({ id: _id, ...row })), settings: { programEnabled: !!config?.programEnabled, explorerEnabled: !!rows.find(r => r._id === "explorer")?.enabled, innovatorEnabled: !!rows.find(r => r._id === "innovator")?.enabled, maxStipend: config?.maxStipend ?? 0, defaultBatch: config?.defaultBatch || "", programName: config?.programName || "Olentra Internship Program", applicationAlerts: config?.applicationAlerts !== false, weeklyDigest: !!config?.weeklyDigest, reviewReminder: !!config?.reviewReminder, emailNotifications: false, integrations: {} } };
  }
  async function publicData(): Promise<PublicData> {
    if (cachedPublicData) return cachedPublicData;
    cachedPublicData = await fetchPublicData();
    return cachedPublicData;
  }
  const company = (actor: Principal | null) => { if (actor?.role !== "company") throw new DomainError("FORBIDDEN", "Company access is required."); };
  const owner = (actor: Principal | null, applicationId: string) => { if (actor?.role !== "intern" || actor.applicationId !== applicationId) throw new DomainError("FORBIDDEN", "This record belongs to another account."); };
  async function transact<T>(key: string, actor: Principal | null, input: unknown, fn: (session: ClientSession) => Promise<T>): Promise<T> {
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(key)) throw new DomainError("INVALID_REQUEST", "A valid idempotency key is required.");
    const commandId = `${actor?.id || "anonymous"}:${key}`;
    const fingerprint = digest(JSON.stringify(input));
    const session = client.startSession();
    try {
      let result!: T;
      await session.withTransaction(async () => {
        if (actor?.role === "company") {
          // A transactional write fence makes concurrent revocation conflict with
          // an in-flight mutation rather than committing on an old snapshot.
          const fence = await users.updateOne({ _id: actor.id, role: "company", staffRole: actor.staffRole, sessionVersion: actor.sessionVersion, disabled: { $ne: true } }, { $inc: { authorizationFence: 1 } }, { session });
          if (!fence.matchedCount) throw new DomainError("FORBIDDEN", "Your staff access changed. Sign in again.");
        }
        const saved = await commands.findOne({ _id: commandId }, { session });
        if (saved) {
          if (saved.fingerprint !== fingerprint) throw new DomainError("CONFLICT", "This request ID was used for a different operation.");
          result = saved.result as T; return;
        }
        result = await fn(session);
        await commands.insertOne({ _id: commandId, fingerprint, result, createdAt: new Date() }, { session });
      });
      return result;
    } catch (error: any) {
      if (error?.code === 11000) {
        const saved = await commands.findOne({ _id: commandId });
        if (saved && saved.fingerprint === fingerprint) return saved.result as T;
        if (saved) throw new DomainError("CONFLICT", "This request ID was used for a different operation.");
        throw new DomainError("CONFLICT", "A record with these details already exists.");
      }
      throw error;
    } finally { await session.endSession(); }
  }
  const lifecycle = createLifecycle({ collection, transact });
  const communications = createCommunications({ collection, transact });
  const queries = createInternshipQueries(collection);
  const staffManagement = createStaffManagement({ collection, transact, client });
  async function execute(method: string, params: Record<string, any> = {}, actor: Principal | null = null, key = ""): Promise<any> {
    if (actor?.role === "company") authorizeStaff(method, params, actor);
    if (staffManagement.supports(method)) return staffManagement.execute(method, params, actor, key);
    if (actor?.role === "company" && !isAdmin(actor) && (method === "message.list" || method === "message.send")) {
      const application = await applications.findOne({ _id: str(params.applicationId) }, { projection: { status: 1 } });
      if (!application || !can(actor, application.status === "Joined" ? "messages.interns" : "messages.applicants")) throw new DomainError("FORBIDDEN", "Your role cannot access this conversation.");
    }
    if (method === "intern.public") return publicData();
    if (method === "application.list") {
      company(actor);
      const page = Math.max(1, Math.min(100000, Number(params.page) || 1)), limit = Math.max(1, Math.min(100, Number(params.pageSize) || 20));
      const filter: Document = {};
      if (params.status && params.status !== "all") filter.status = str(params.status);
      if (params.programId && params.programId !== "all") filter.programId = str(params.programId);
      const queries = [str(params.search), str(params.query)].filter(Boolean);
      if (queries.length) filter.$and = queries.map(value => { const q = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").slice(0, 120); return { $or: ["name", "email", "college", "program", "status", "_id"].map(field => ({ [field]: { $regex: q, $options: "i" } })) }; });
      const from = str(params.dateFrom), to = str(params.dateTo);
      if ((from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) || (to && !/^\d{4}-\d{2}-\d{2}$/.test(to)) || (from && to && from > to)) throw new DomainError("INVALID_REQUEST", "Choose a valid application date range.");
      if (from || to) filter.appliedOn = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
      const allowed = ["name", "program", "college", "appliedOn", "status"], sortField = allowed.includes(params.sortField) ? params.sortField : "appliedOn", direction = params.sortDirection === "asc" ? 1 : -1;
      const [rows, total, aggregate] = await Promise.all([
        applications.find(filter).sort({ [sortField]: direction, _id: direction }).skip((page - 1) * limit).limit(limit).toArray(), applications.countDocuments(filter),
        applications.aggregate([{ $match: filter }, { $facet: { statuses: [{ $group: { _id: "$status", count: { $sum: 1 } } }], programs: [{ $group: { _id: "$programId", count: { $sum: 1 } } }] } }]).toArray(),
      ]);
      return { items: rows.map(row => publicApplication(row, true)), total, page, pageSize: limit, counts: { statuses: Object.fromEntries((aggregate[0]?.statuses || []).map((item: any) => [item._id, item.count])), programs: Object.fromEntries((aggregate[0]?.programs || []).map((item: any) => [item._id, item.count])) } };
    }
    if (method === "application.get") {
      if (!actor) throw new DomainError("UNAUTHENTICATED", "Sign in to view applications.");
      const applicationId = str(params.id);
      if (actor.role === "intern") owner(actor, applicationId);
      const row = await applications.findOne({ _id: applicationId });
      if (!row) throw new DomainError("NOT_FOUND", "Application not found.");
      return publicApplication(row, actor.role === "company");
    }
    if (method === "program.configure") {
      company(actor);
      const programId = str(params.programId), fee = Number(params.fee), stipend = Number(params.stipend);
      if (!["number", "string"].includes(typeof params.fee) || !["number", "string"].includes(typeof params.stipend) || str(String(params.fee)) === "" || str(String(params.stipend)) === "" || !["explorer", "innovator"].includes(programId) || !Number.isSafeInteger(fee) || fee < 0 || !Number.isSafeInteger(stipend) || stipend < 0 || typeof params.enabled !== "boolean") throw new DomainError("INVALID_REQUEST", "Enter a valid program, fee and stipend.");
      return transact(key, actor, { method, params }, async session => {
        if (communications.supportsTransactionalBulk()) {
          const row = await programs.findOne({ _id: programId }, { session, projection: { name: 1 } });
          if (!row) throw new DomainError("NOT_FOUND", "Program not found.");
          await communications.bulkTransactionWrites(session, [
            { namespace: programs.namespace, name: "updateOne", filter: { _id: programId }, update: { $set: { fee, stipend, enabled: params.enabled } } },
            { namespace: settings.namespace, name: "updateOne", filter: { _id: "program" }, update: { $max: { maxStipend: stipend } } },
            { namespace: events.namespace, name: "insertOne", document: { _id: id("EVT"), type: "program.configure", public: true, applicationIds: [], createdAt: new Date() } },
          ]);
          return { id: row._id, name: row.name, fee, stipend, enabled: params.enabled };
        }
        const row = await programs.findOneAndUpdate({ _id: programId }, { $set: { fee, stipend, enabled: params.enabled } }, { session, returnDocument: "after" });
        if (!row) throw new DomainError("NOT_FOUND", "Program not found.");
        await settings.updateOne({ _id: "program" }, { $max: { maxStipend: stipend } }, { session });
        await events.insertOne({ _id: id("EVT"), type: "program.configure", public: true, applicationIds: [], createdAt: new Date() }, { session });
        invalidatePublicData();
        return { id: row._id, name: row.name, fee: row.fee, stipend: row.stipend, enabled: row.enabled };
      });
    }
    if (method === "intern.snapshot") {
      // These reads have no ordering dependency. Running them together avoids
      // serial Atlas network round trips during login and every workspace reload.
      const ownApplicationPromise = actor?.role === "intern" && actor.applicationId ? applications.findOne({ _id: actor.applicationId }) : Promise.resolve(null);
      const [info, lifecycleData, communicationData, applicationItems, ownApplication, basicInternApplications] = await Promise.all([
        publicData(),
        lifecycle.snapshot(actor),
        ownApplicationPromise.then(app => communications.snapshot(actor, app)),
        actor?.role === "company" && can(actor, "applications.read")
          ? applications.find({}).sort({ appliedOn: -1, _id: -1 }).limit(100).toArray().then(rows => rows.map(row => publicApplication(row, true)))
          : Promise.resolve(null),
        ownApplicationPromise,
        actor?.role === "company" && !isAdmin(actor) && !can(actor, "applications.read") && can(actor, "interns.read")
          ? applications.find({ status: "Joined" }, { projection: { _id: 1, name: 1, email: 1, program: 1, programId: 1, initials: 1, avatarColor: 1, status: 1 } }).limit(500).toArray()
          : Promise.resolve([]),
      ]);
      const data: Record<string, any> = { ...info, user: actor, applications: [], accounts: actor ? [actor] : [], interns: [], projects: [], tasks: [], submissions: [], offers: [], onboarding: [], certificates: [], messages: [], notifications: [], resources: [], activity: [], metrics: [] };
      Object.assign(data, lifecycleData, communicationData);
      if (applicationItems) data.applications = applicationItems;
      if (actor?.role === "company" && !isAdmin(actor)) {
        if (!can(actor, "interns.read")) data.interns = [];
        else if (!can(actor, "projects.read")) data.interns = data.interns.map((intern: any) => ({ ...intern, projectIds: [] }));
        if (!can(actor, "applications.read")) {
          data.applications = basicInternApplications.map(row => publicApplication(row, false));
        }
        if (!can(actor, "projects.read")) data.projects = can(actor, "projects.summary") ? data.projects.map((project: any) => ({ id: project.id, name: project.name, status: project.status, progress: project.progress, dueOn: project.dueOn, program: project.program })) : [];
        if (!can(actor, "tasks.read")) data.tasks = [];
        if (!can(actor, "submissions.read")) data.submissions = [];
        if (!can(actor, "certificates.read")) data.certificates = [];
        data.offers = []; data.onboarding = []; data.activity = [];
        if (!can(actor, "overview.read")) data.analytics = null;
      }
      if (ownApplication) data.applications = [publicApplication(ownApplication, false)];
      return { data, my: { application: actor?.role === "intern" ? data.applications[0] || null : null, intern: data.interns[0] || null, offer: data.offers[0] || null, onboarding: data.onboarding[0] || { applicationId: actor?.applicationId, status: "Not started", acknowledged: false }, projects: data.projects, tasks: data.tasks, submissions: data.submissions, certificates: data.certificates, messages: data.messages, notifications: data.notifications, resources: [] }, account: actor };
    }
    if (method === "application.submit") {
      if (actor) throw new DomainError("FORBIDDEN", "Sign out before submitting an application.");
      const name = str(params.name), email = emailOf(params.email), programId = str(params.programId), fileId = str(params.resumeAttachmentId), fileToken = str(params.resumeAccessToken);
      if (name.length < 2 || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new DomainError("INVALID_REQUEST", "Enter your full name and a valid email address.");
      if (!fileId || !fileToken) throw new DomainError("INVALID_REQUEST", "Attach a resume before applying.");
      return transact(key, null, { method, params }, async session => {
        if (!(await intakeOpen())) throw new DomainError("CLOSED", "Internship applications are currently closed.");
        const existing = await applications.findOne({ email }, { session });
        if (existing) {
          if (activeHooks?.sendMagicLink) {
            void activeHooks.sendMagicLink(existing.email, existing.name, existing._id);
          }
          throw new DomainError("ALREADY_APPLIED", "An application with this email already exists. We have sent a secure sign-in link to your email.");
        }
        const program = await programs.findOne({ _id: programId }, { session });
        const config = await settings.findOne({ _id: "program" }, { session });
        const file = await files.findOne({ _id: fileId, kind: "resume", status: "ready", accessTokenHash: digest(fileToken), applicationId: { $exists: false } }, { session });
        if (!program?.enabled || !config?.programEnabled || program.fee == null || program.stipend == null) throw new DomainError("CLOSED", "This internship track is not accepting applications.");
        if (!file) throw new DomainError("INVALID_REQUEST", "Upload your resume before applying.");
        const applicationId = id("OL"), claimToken = token(), now = new Date();
        const row: Row = { _id: applicationId, name, email, programId, program: program.name, appliedOn: now.toISOString().slice(0, 10), status: "Applied", initials: name.split(/\s+/).slice(0, 2).map(x => x[0]).join(""), avatarColor: "#d9e5fb", college: "", phone: "", location: "", skills: [], linkedin: str(params.linkedin), github: "", bio: "", resumeAttachmentId: fileId, history: [{ id: id("HST"), title: "Application received", date: now.toISOString(), detail: `Applied to ${program.name}.` }], notes: [], projectIds: [], source: "Website", version: 1, claimHash: digest(claimToken), claimExpiresAt: new Date(now.getTime() + 86400000) };
        await applications.insertOne(row, { session });
        await files.updateOne({ _id: fileId, applicationId: { $exists: false } }, { $set: { applicationId } }, { session });
        if (config?.applicationAlerts !== false) await collection("notifications").insertOne({ _id: id("NTF"), recipientRole: "company", applicationId, title: "New internship application", body: `${name} applied to ${program.name}.`, href: `/intern/dashboard/applications/${applicationId}`, createdOn: now.toISOString() }, { session });
        await collection("activity").insertOne({ _id: id("ACT"), title: "Application received", detail: `${name} applied to ${program.name}.`, applicationId, icon: "application", tone: "blue", occurredOn: now.toISOString() }, { session });
        await events.insertOne({ _id: id("EVT"), type: "application.created", applicationIds: [applicationId], createdAt: now }, { session });
        if (activeHooks?.sendApplicationConfirmation) {
          void activeHooks.sendApplicationConfirmation(email, name, program.name, applicationId);
        }
        return { ...publicApplication(row, false), claimToken };
      });
    }
    if (method === "account.register") {
      const applicationId = str(params.applicationId), claimToken = str(params.claimToken), password = str(params.password);
      if (password.length < 8 || password.length > 256) throw new DomainError("INVALID_REQUEST", "Use a password between 8 and 256 characters.");
      const hash = await Bun.password.hash(password, { algorithm: "argon2id" });
      return transact(key, null, { method, params: { applicationId, claimToken, passwordDigest: digest(password) } }, async session => {
        if (!(await intakeOpen())) throw new DomainError("CLOSED", "Internship account registration is currently closed.");
        const app = await applications.findOne({ _id: applicationId, claimHash: digest(claimToken), claimExpiresAt: { $gt: new Date() } }, { session });
        if (!app) throw new DomainError("INVALID_CLAIM", "The application claim is invalid or expired.");
        const user: Row = { _id: id("ACC"), role: "intern", name: app.name, email: app.email, applicationId, sessionVersion: 1, createdAt: new Date() };
        await users.insertOne(user, { session });
        await credentials.insertOne({ _id: user._id, userId: user._id, passwordHash: hash, createdAt: new Date() }, { session });
        await applications.updateOne({ _id: applicationId, claimHash: digest(claimToken) }, { $unset: { claimHash: "", claimExpiresAt: "" }, $set: { accountId: user._id } }, { session });
        await events.insertOne({ _id: id("EVT"), type: "account.register", applicationIds: [applicationId], createdAt: new Date() }, { session });
        return publicAccount(user);
      });
    }
    if (method === "application.update") {
      company(actor); const applicationId = str(params.id), patch = params.patch || {}, status = str(params.status || patch.status), expectedVersion = Number(params.expectedVersion);
      if ((!status && !Array.isArray(patch.notes)) || (status && !["Applied", "Under Review", "Shortlisted", "Selected", "Rejected", "Declined"].includes(status)) || !Number.isSafeInteger(expectedVersion)) throw new DomainError("INVALID_REQUEST", "Choose a valid change and the current application version.");
      return transact(key, actor, { method, params }, async session => {
        const now = new Date();
        const existing = await applications.findOne({ _id: applicationId, version: expectedVersion }, { session });
        if (!existing || (status && existing.status === "Joined")) throw new DomainError("CONFLICT", "The application changed or is unavailable. Refresh and try again.");
        if (!isAdmin(actor) && status && !["Applied", "Under Review", "Shortlisted"].includes(existing.status)) throw new DomainError("FORBIDDEN", "Only an admin can change a final application decision.");
        const update: Document = { $inc: { version: 1 } }, values: Document = {};
        if (status) { values.status = status; update.$push = { history: { id: id("HST"), title: status, detail: `Application moved to ${status.toLowerCase()}.`, date: now.toISOString() } }; }
        if (Array.isArray(patch.notes)) {
          const old = Array.isArray(existing.notes) ? existing.notes : [], proposed = patch.notes;
          if (proposed.length > 200 || proposed.length < old.length || old.some((note: any, i: number) => JSON.stringify(note) !== JSON.stringify(proposed[i]))) throw new DomainError("CONFLICT", "Notes changed. Refresh and try again.");
          const added = proposed.slice(old.length).map((note: any) => { const body = str(note?.text); if (!body || body.length > 3000) throw new DomainError("INVALID_REQUEST", "Enter a note of up to 3,000 characters."); return { id: id("NOTE"), text: body, author: actor!.name, date: now.toISOString() }; });
          values.notes = [...old, ...added];
        }
        update.$set = values;
        const changed = await applications.findOneAndUpdate({ _id: applicationId, version: expectedVersion }, update, { session, returnDocument: "after" });
        if (!changed) throw new DomainError("CONFLICT", "The application changed or is unavailable. Refresh and try again.");
        if (status) await collection("notifications").insertOne({ _id: id("NTF"), recipientRole: "intern", applicationId, title: "Application status updated", body: `Your application is now ${status}.`, href: "/intern/portal/application", createdOn: now.toISOString() }, { session });
        await events.insertOne({ _id: id("EVT"), type: "application.updated", applicationIds: [applicationId], createdAt: now }, { session });
        return publicApplication(changed, true);
      });
    }
    if (method === "account.createForApplication") {
      company(actor);
      const applicationId = str(params.applicationId), password = typeof params.password === "string" ? params.password : "";
      if (!applicationId || password.length < 12 || password.length > 256) throw new DomainError("INVALID_REQUEST", "Choose an application and a password of at least 12 characters.");
      const passwordHash = await Bun.password.hash(password, { algorithm: "argon2id" });
      return transact(key, actor, { method, applicationId, passwordDigest: digest(password) }, async session => {
        const app = await applications.findOne({ _id: applicationId }, { session });
        if (!app) throw new DomainError("NOT_FOUND", "Application not found.");
        if (app.accountId || await users.findOne({ email: app.email }, { session })) throw new DomainError("CONFLICT", "This applicant already has an account.");
        const user: Row = { _id: id("ACC"), role: "intern", name: app.name, email: app.email, applicationId, sessionVersion: 1, createdAt: new Date(), createdByStaff: actor!.id };
        await users.insertOne(user, { session });
        await credentials.insertOne({ _id: user._id, userId: user._id, passwordHash, createdAt: new Date() }, { session });
        await applications.updateOne({ _id: applicationId, accountId: { $exists: false } }, { $unset: { claimHash: "", claimExpiresAt: "" }, $set: { accountId: user._id }, $inc: { version: 1 } }, { session });
        await events.insertOne({ _id: id("EVT"), type: "account.createdByStaff", applicationIds: [applicationId], createdAt: new Date() }, { session });
        return publicAccount(user);
      });
    }
    if (method === "account.resetPassword") {
      company(actor);
      const accountId = str(params.accountId), password = str(params.password);
      if (!accountId || password.length < 12 || password.length > 256) throw new DomainError("INVALID_REQUEST", "Choose an intern and a password of at least 12 characters.");
      const passwordHash = await Bun.password.hash(password, { algorithm: "argon2id" });
      return transact(key, actor, { method, accountId, passwordDigest: digest(password) }, async session => {
        const user = await users.findOneAndUpdate({ _id: accountId, role: "intern" }, { $inc: { sessionVersion: 1 } }, { session, returnDocument: "after" });
        if (!user) throw new DomainError("NOT_FOUND", "Intern account not found.");
        await credentials.updateOne({ userId: accountId }, { $set: { passwordHash, updatedAt: new Date() } }, { session });
        await events.insertOne({ _id: id("EVT"), type: "account.resetPassword", applicationIds: user.applicationId ? [user.applicationId] : [], createdAt: new Date() }, { session });
        return { id: user._id, applicationId: user.applicationId };
      });
    }
    if (method === "account.changePassword") {
      if (!actor?.id) throw new DomainError("UNAUTHENTICATED", "Sign in to change your password.");
      return changePassword(actor.id, str(params.currentPassword), str(params.newPassword));
    }
    if (queries.supports(method)) {
      if (method === "application.workflow" && actor?.role === "company" && !isAdmin(actor)) return { offer: null, onboarding: null, intern: null };
      return queries.execute(method, params, actor);
    }
    if (lifecycle.supports(method)) return lifecycle.execute(method, params, actor, key);
    if (communications.supports(method)) {
      const res = await communications.execute(method, params, actor, key);
      if (method === "settings.update") invalidatePublicData();
      return res;
    }
    throw new DomainError("NOT_IMPLEMENTED", "This internship action is not available yet.");
  }
  async function autoProvisionAccount(applicationId: string, email: string): Promise<Principal> {
    const normalized = emailOf(email);
    const existing = await users.findOne({
      $or: [{ applicationId }, { email: normalized }],
      disabled: { $ne: true },
    });
    if (existing) {
      if (!existing.applicationId) {
        await users.updateOne({ _id: existing._id }, { $set: { applicationId } });
        existing.applicationId = applicationId;
      }
      await applications.updateOne({ _id: applicationId, accountId: { $exists: false } }, { $set: { accountId: existing._id } });
      return (await resolveAccount(existing)) || publicAccount(existing);
    }
    const app = await applications.findOne({ _id: applicationId });
    if (!app) throw new DomainError("NOT_FOUND", "Application not found.");
    const user: Row = {
      _id: id("ACC"),
      role: "intern",
      name: app.name,
      email: app.email,
      applicationId,
      sessionVersion: 1,
      createdAt: new Date(),
    };
    await users.insertOne(user);
    await applications.updateOne(
      { _id: applicationId },
      { $unset: { claimHash: "", claimExpiresAt: "" }, $set: { accountId: user._id } }
    );
    await events.insertOne({ _id: id("EVT"), type: "account.register", applicationIds: [applicationId], createdAt: new Date() });
    return publicAccount(user);
  }
  async function findApplicationByEmail(email: string): Promise<Row | null> {
    return applications.findOne({ email: emailOf(email) });
  }
  async function findUserByEmail(email: string): Promise<Row | null> {
    return users.findOne({ email: emailOf(email), disabled: { $ne: true } });
  }
  async function selfResetPassword(userId: string, newPassword: string): Promise<{ id: string }> {
    const password = str(newPassword);
    if (password.length < 8 || password.length > 256) {
      throw new DomainError("INVALID_REQUEST", "Password must be at least 8 characters.");
    }
    const user = await users.findOne({ _id: userId, disabled: { $ne: true } });
    if (!user) throw new DomainError("NOT_FOUND", "Account not found.");
    const passwordHash = await Bun.password.hash(password, { algorithm: "argon2id" });
    await credentials.updateOne(
      { userId },
      { $set: { userId, passwordHash, updatedAt: new Date() } },
      { upsert: true }
    );
    await users.updateOne({ _id: userId }, { $inc: { sessionVersion: 1 } });
    await events.insertOne({ _id: id("EVT"), type: "account.selfResetPassword", applicationIds: user.applicationId ? [user.applicationId] : [], createdAt: new Date() });
    return { id: user._id };
  }
  async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ id: string }> {
    const nextPassword = str(newPassword);
    if (nextPassword.length < 8 || nextPassword.length > 256) {
      throw new DomainError("INVALID_REQUEST", "New password must be at least 8 characters.");
    }
    const user = await users.findOne({ _id: userId, disabled: { $ne: true } });
    if (!user) throw new DomainError("NOT_FOUND", "Account not found.");
    const cred = await credentials.findOne({ userId });
    if (cred) {
      const valid = await Bun.password.verify(str(currentPassword), cred.passwordHash);
      if (!valid) throw new DomainError("UNAUTHENTICATED", "Your current password is incorrect.");
    }
    const passwordHash = await Bun.password.hash(nextPassword, { algorithm: "argon2id" });
    await credentials.updateOne(
      { userId },
      { $set: { userId, passwordHash, updatedAt: new Date() } },
      { upsert: true }
    );
    await users.updateOne({ _id: userId }, { $inc: { sessionVersion: 1 } });
    await events.insertOne({ _id: id("EVT"), type: "account.passwordChanged", applicationIds: user.applicationId ? [user.applicationId] : [], createdAt: new Date() });
    return { id: user._id };
  }
  return { db, client, prefix, initialize, login, account, createTestStaff, bootstrapFirstAdmin: staffManagement.bootstrapFirstAdmin, execute, publicData, collection, invalidateAnalytics: communications.invalidateAnalytics, invalidatePublicData, resolveRole: staffManagement.resolveRole, resolveRoleSync: staffManagement.resolveRoleSync, setHooks, autoProvisionAccount, findApplicationByEmail, findUserByEmail, selfResetPassword, changePassword };
}
