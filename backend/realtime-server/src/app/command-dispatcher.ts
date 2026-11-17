import { isCurrentInterviewEmail } from "../modules/interviews/email-delivery";
import { createCommunications } from "../modules/communications/communications.service";
import { createLifecycle } from "../modules/lifecycle/lifecycle.service";
import { createInternshipQueries } from "../modules/queries/query.service";
import { createStaffManagement } from "../modules/staff/staff.service";
import { authorizeStaff, can, isAdmin } from "../modules/access/policy";
import { acceptsCompensationMode, normalizeCompensationMode, type CompensationMode } from "../modules/programs/compensation";
import { normalizeDeadline } from "../modules/programs/deadline";
import { generateOfferLetterPdf } from "../modules/offer-letter/offer-letter-pdf";
import { INTERNSHIP_OPPORTUNITIES, isInternRole, isInternSchedule, normalizeInternshipDuration } from "../modules/programs/opportunities.mjs";
import { MongoClient, type ClientSession, type Db, type Document } from "mongodb";
import type { InternshipRow } from "../infrastructure/database/collections";
import { DomainError } from "../shared/errors";
import { logger } from "../infrastructure/observability/logger";
import type { ApplicantStatusNotice, InternshipHooks, Principal } from "../shared/principal";
import { digest, emailValue as emailOf, id, stringValue as str, token } from "../shared/ids";

export { DomainError } from "../shared/errors";
export type { InternshipHooks, Principal } from "../shared/principal";
export { connectInternDatabase } from "../infrastructure/database/client";
import { createStories } from "../modules/stories/stories.service";
import { createTemplates } from "../modules/templates/templates.service";
import { createViews } from "../modules/views/views.service";
import { createResources } from "../modules/resources/resources.service";
import { createCheckins } from "../modules/checkins/checkins.service";
import { createFeedback } from "../modules/feedback/feedback.service";
import { DEFAULT_RUBRIC, createReviews, type Criterion } from "../modules/reviews/reviews.service";
import { HAS_VIDEO_BACKFILL, applicationSort, hasVideoLink, videoFilter } from "../modules/applications/video-filter";
import { createOutbox, type OutboxRow } from "../modules/outbox/outbox";
import { normalizeSkills } from "../modules/applications/skills";
import { linkedinKey } from "../modules/applications/duplicates";
import { auditDecision } from "../modules/audit/decision-audit";
import { mentorScope } from "../modules/access/mentor-scope";
import { runReminders } from "../modules/reminders/reminders";
import { FINAL_STATUSES, eraseApplicant, expiredApplicationIds } from "../modules/privacy/erase";

type Row = InternshipRow;
const SNAPSHOT_APPLICATIONS = 100;
const alreadyApplied = () => new DomainError("ALREADY_APPLIED", "An application already exists for this email address. Please refer to your original confirmation email. Portal access is available only after selection.");
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
  const outbox = createOutbox(db.collection<OutboxRow>(prefix + "outbox"));
  async function initialize() {
    await Promise.all([
      lifecycle.initialize(),
      stories.initialize(),
      reviews.initialize(),
      templates.initialize(),
      views.initialize(),
      resources.initialize(),
      checkins.initialize(),
      feedback.initialize(),
      outbox.initialize(),
      communications.initialize(),
      staffManagement.initialize(),
      users.createIndex({ email: 1 }, { unique: true }),
      applications.createIndex({ email: 1 }, { unique: true }),
      applications.createIndex({ appliedOn: -1, _id: -1 }),
      applications.createIndex({ programId: 1, status: 1, appliedOn: -1 }),
      credentials.createIndex({ userId: 1 }, { unique: true }),
      commands.createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 * 7 }),
      applications.createIndex({ status: 1, appliedOn: -1, _id: -1 }),
      // Live insights read the newest events of one type.
      events.createIndex({ type: 1, createdAt: -1, _id: -1 }),
      events.createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 * 7 }),
      // Events store `applicationIds` and nothing queries `applicationId`, so this old index only slowed writes.
      events.dropIndex("applicationId_1_createdAt_-1").catch(() => undefined),
    ]);
    await Promise.all([
      programs.updateOne({ _id: "explorer" }, { $setOnInsert: { name: "Tech Explorer", fee: null, stipend: null, enabled: false } }, { upsert: true }),
      programs.updateOne({ _id: "innovator" }, { $setOnInsert: { name: "Tech Innovator", fee: null, stipend: null, enabled: false } }, { upsert: true }),
      settings.updateOne({ _id: "program" }, { $setOnInsert: { programEnabled: false, compensationMode: "both", defaultBatch: "", maxStipend: null } }, { upsert: true }),
      applications.updateMany(HAS_VIDEO_BACKFILL.filter, HAS_VIDEO_BACKFILL.update),
      applications.createIndex({ hasVideo: -1, appliedOn: -1 }),
      backfillDuplicates().catch(error => logger.warn("Duplicate backfill failed", { error })),
      applications.createIndex({ assignedTo: 1, appliedOn: -1 }),
      applications.createIndex({ linkedinKey: 1 }, { partialFilterExpression: { linkedinKey: { $type: "string" } } }),
      // Retention counts from when a final decision was made; older rows start counting today.
      applications.updateMany({ status: { $in: FINAL_STATUSES }, statusChangedOn: { $exists: false } }, { $set: { statusChangedOn: new Date().toISOString() } }),
    ]);
  }
  /** Adds LinkedIn keys to older applications and flags the ones that share a profile. */
  async function backfillDuplicates() {
    const rows = await applications.find({ linkedinKey: { $exists: false }, linkedin: { $type: "string", $ne: "" } }, { projection: { linkedin: 1 }, limit: 5000 }).toArray();
    const writes = rows.map(row => ({ updateOne: { filter: { _id: row._id }, update: { $set: { linkedinKey: linkedinKey(row.linkedin) } } } }));
    if (writes.length) await applications.bulkWrite(writes as any, { ordered: false });
    if (!writes.length) return;
    const groups = await applications.aggregate([{ $match: { linkedinKey: { $type: "string", $ne: "" } } }, { $group: { _id: "$linkedinKey", ids: { $push: "$_id" }, count: { $sum: 1 } } }, { $match: { count: { $gt: 1, $lte: 6 } } }]).toArray();
    for (const group of groups) for (const id of group.ids) await applications.updateOne({ _id: id }, { $set: { possibleDuplicates: group.ids.filter((other: string) => other !== id) } });
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
    opportunities: typeof INTERNSHIP_OPPORTUNITIES;
    organization: { name: string; legalName: string; website: string };
    programs: { id: string; name: string; fee: number | null; stipend: number | null; enabled: boolean }[];
    settings: { programEnabled: boolean; compensationMode: CompensationMode; explorerEnabled: boolean; innovatorEnabled: boolean; maxStipend: number; defaultBatch: string; programName: string; applicationAlerts: boolean; weeklyDigest: boolean; reviewReminder: boolean; rejectionEmails: boolean; retentionDays: number | null; rubric: Criterion[]; onboardingDocuments: { id: string; label: string; required: boolean }[]; emailNotifications: boolean; integrations: Record<string, unknown>; applicationDeadline: string | null; duration: string };
  };
  let cachedPublicData: PublicData | null = null;
  function invalidatePublicData() { cachedPublicData = null; }
  async function fetchPublicData(): Promise<PublicData> {
    const [rows, config] = await Promise.all([programs.find({}).sort({ _id: 1 }).toArray(), settings.findOne({ _id: "program" })]);
    const duration = normalizeInternshipDuration(config?.duration);
    return { opportunities: { ...INTERNSHIP_OPPORTUNITIES, duration }, organization: { name: "Olentra", legalName: "Olentra Technologies Pvt. Ltd.", website: "/" }, programs: rows.map(({ _id, ...row }: any) => ({ id: _id, ...row })), settings: { programEnabled: !!config?.programEnabled, compensationMode: normalizeCompensationMode(config?.compensationMode), explorerEnabled: !!rows.find(r => r._id === "explorer")?.enabled, innovatorEnabled: !!rows.find(r => r._id === "innovator")?.enabled, maxStipend: config?.maxStipend ?? 0, defaultBatch: config?.defaultBatch || "", programName: config?.programName || "Olentra Internship Program", applicationAlerts: config?.applicationAlerts !== false, weeklyDigest: !!config?.weeklyDigest, reviewReminder: !!config?.reviewReminder, rejectionEmails: config?.rejectionEmails === true, retentionDays: typeof config?.retentionDays === "number" ? config.retentionDays : null, rubric: Array.isArray(config?.rubric) && config.rubric.length ? config.rubric : DEFAULT_RUBRIC, onboardingDocuments: Array.isArray(config?.onboardingDocuments) ? config.onboardingDocuments : [], emailNotifications: false, integrations: {}, applicationDeadline: normalizeDeadline(config?.applicationDeadline), duration } };
  }
  /**
   * What anonymous visitors and interns may see: tracks and whether they are
   * open. Staff-only settings (alerts, rejection emails, batches, integrations)
   * reach staff through their snapshot instead.
   */
  async function anonymousData() {
    const { organization, programs: tracks, settings: all, opportunities } = await publicData();
    const { programEnabled, compensationMode, explorerEnabled, innovatorEnabled, programName, applicationDeadline, duration } = all;
    return { organization, programs: tracks, opportunities, settings: { programEnabled, compensationMode, explorerEnabled, innovatorEnabled, programName, applicationDeadline, duration } };
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
        if ((input as any)?.method === "application.submit" && error.keyPattern?.email) throw alreadyApplied();
        throw new DomainError("CONFLICT", "A record with these details already exists.");
      }
      throw error;
    } finally { await session.endSession(); }
  }
  /** Builds and sends one status email; throws when it can't be delivered (the outbox retries). */
  async function deliverApplicantStatus(applicationId: string, status: ApplicantStatusNotice["status"], certificateNumber?: string) {
    if (!activeHooks?.sendApplicantStatus) throw new Error("No email sender is configured.");
    {
      const application = await applications.findOne({ _id: applicationId }, { projection: { email: 1, name: 1, program: 1, college: 1, roleId: 1 } });
      if (!application) throw new Error(`Application ${applicationId} was not found after its status changed.`);
      if (status === "rejected") {
        const preferences = await settings.findOne({ _id: "program" }, { projection: { rejectionEmails: 1 } });
        if (preferences?.rejectionEmails !== true) return;
      }
      let pdfAttachment: { filename: string; content: Buffer; contentType: string } | undefined;
      if (status === "offer-accepted") {
        const offer = await collection("offers").findOne({ applicationId, status: "Accepted" });
        const pdf = generateOfferLetterPdf({
          name: str(application.name),
          email: str(application.email),
          college: str(application.college || ""),
          program: str(application.program),
          roleTitle: str(application.roleId || "AI Full Stack Engineering Intern"),
          startOn: offer?.startOn ? str(offer.startOn) : undefined,
          endOn: offer?.endOn ? str(offer.endOn) : undefined,
          stipend: typeof offer?.stipend === "number" ? offer.stipend : 0,
          stipendPeriod: offer?.stipendPeriod ? str(offer.stipendPeriod) : "month",
          applicationId,
          issueDate: offer?.decidedOn ? new Date(offer.decidedOn).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : undefined,
        });
        pdfAttachment = {
          filename: `Olentra_Offer_Letter_${applicationId.slice(0, 15)}.pdf`,
          content: pdf,
          contentType: "application/pdf",
        };
      }
      await activeHooks.sendApplicantStatus({
        to: str(application.email),
        name: str(application.name),
        programName: str(application.program),
        status,
        ...(certificateNumber ? { certificateNumber } : {}),
        ...(pdfAttachment ? { pdfAttachment } : {}),
      });
    }
  }
  const lifecycle = createLifecycle({ collection, transact, outbox });
  const communications = createCommunications({ collection, transact });
  const queries = createInternshipQueries(collection);
  const stories = createStories({ collection, transact });
  const reviews = createReviews({ collection, transact });
  const templates = createTemplates({ collection, transact });
  const views = createViews({ collection, transact });
  const resources = createResources({ collection, transact });
  const checkins = createCheckins({ collection, transact });
  const feedback = createFeedback({ collection, transact });
  const staffManagement = createStaffManagement({ collection, transact, client });
  async function execute(method: string, params: Record<string, any> = {}, actor: Principal | null = null, key = ""): Promise<any> {
    if (actor?.role === "company") authorizeStaff(method, params, actor);
    if (staffManagement.supports(method)) return staffManagement.execute(method, params, actor, key);
    if (actor?.role === "company" && !isAdmin(actor) && (method === "message.list" || method === "message.send")) {
      const application = await applications.findOne({ _id: str(params.applicationId) }, { projection: { status: 1 } });
      if (!application || !can(actor, application.status === "Joined" ? "messages.interns" : "messages.applicants")) throw new DomainError("FORBIDDEN", "Your role cannot access this conversation.");
      const scope = await mentorScope(actor, collection("interns"));
      if (scope && !scope.includes(str(params.applicationId))) throw new DomainError("FORBIDDEN", "You can only message interns you mentor.");
    }
    if (method === "intern.public") return anonymousData();
    if (method === "application.list") {
      company(actor);
      const page = Math.max(1, Math.min(100000, Number(params.page) || 1)), limit = Math.max(1, Math.min(100, Number(params.pageSize) || 20));
      const filter: Document = {};
      if (params.status && params.status !== "all") filter.status = str(params.status);
      if (params.programId && params.programId !== "all") filter.programId = str(params.programId);
      Object.assign(filter, videoFilter(params.video));
      if (params.assignee === "me") filter.assignedTo = actor!.id;
      else if (params.assignee === "unassigned") filter.assignedTo = { $exists: false };
      const queries = [str(params.search), str(params.query)].filter(Boolean);
      if (queries.length) filter.$and = queries.map(value => { const q = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").slice(0, 120); return { $or: ["name", "email", "college", "program", "status", "_id", "skills"].map(field => ({ [field]: { $regex: q, $options: "i" } })) }; });
      if (params.skill && params.skill !== "all") {
        const skill = str(params.skill).slice(0, 80);
        if (skill) filter.skills = { $regex: skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
      }
      const from = str(params.dateFrom), to = str(params.dateTo);
      if ((from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) || (to && !/^\d{4}-\d{2}-\d{2}$/.test(to)) || (from && to && from > to)) throw new DomainError("INVALID_REQUEST", "Choose a valid application date range.");
      if (from || to) filter.appliedOn = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
      const allowed = ["name", "program", "college", "appliedOn", "status", "score"], sortField = allowed.includes(params.sortField) ? params.sortField : "appliedOn", direction = params.sortDirection === "asc" ? 1 : -1;
      const [rows, total, aggregate] = await Promise.all([
        applications.find(filter).sort(applicationSort(sortField, direction, params.videosFirst)).skip((page - 1) * limit).limit(limit).toArray(), applications.countDocuments(filter),
        // Counts are only computed when asked for; the list itself doesn't need them.
        params.facets !== true ? Promise.resolve(null) : applications.aggregate([{ $match: filter }, { $facet: { statuses: [{ $group: { _id: "$status", count: { $sum: 1 } } }], programs: [{ $group: { _id: "$programId", count: { $sum: 1 } } }], withVideo: [{ $match: { hasVideo: true } }, { $count: "count" }], skills: [{ $unwind: "$skills" }, { $match: { skills: { $type: "string", $ne: "" } } }, { $group: { _id: { $toLower: { $trim: { input: "$skills" } } }, name: { $first: { $trim: { input: "$skills" } } }, count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }, { $limit: 30 }] } }]).toArray(),
      ]);
      if (!aggregate) return { items: rows.map(row => publicApplication(row, true)), total, page, pageSize: limit };
      return { items: rows.map(row => publicApplication(row, true)), total, page, pageSize: limit, counts: { statuses: Object.fromEntries((aggregate[0]?.statuses || []).map((item: any) => [item._id, item.count])), programs: Object.fromEntries((aggregate[0]?.programs || []).map((item: any) => [item._id, item.count])), withVideo: aggregate[0]?.withVideo?.[0]?.count || 0, skills: (aggregate[0]?.skills || []).map((item: any) => ({ name: item.name, count: item.count })) } };
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
      const resourcesPromise = resources.snapshot(actor);
      const hasPasswordPromise = actor ? credentials.countDocuments({ userId: actor.id }, { limit: 1 }).then(count => count > 0) : Promise.resolve(false);
      const [info, lifecycleData, communicationData, applicationItems, ownApplication, basicInternApplications] = await Promise.all([
        actor?.role === "company" ? publicData() : anonymousData(),
        lifecycle.snapshot(actor),
        ownApplicationPromise.then(app => communications.snapshot(actor, app)),
        actor?.role === "company" && can(actor, "applications.read")
          ? applications.find({}).sort({ appliedOn: -1, _id: -1 }).limit(SNAPSHOT_APPLICATIONS + 1).toArray().then(rows => rows.map(row => publicApplication(row, true)))
          : Promise.resolve(null),
        ownApplicationPromise,
        actor?.role === "company" && !isAdmin(actor) && !can(actor, "applications.read") && can(actor, "interns.read")
          ? mentorScope(actor, collection("interns")).then(scope => applications.find({ status: "Joined", ...(scope ? { _id: { $in: scope } } : {}) }, { projection: { _id: 1, name: 1, email: 1, program: 1, programId: 1, initials: 1, avatarColor: 1, status: 1 } }).limit(500).toArray())
          : Promise.resolve([]),
      ]);
      const data: Record<string, any> = { ...info, user: actor, applications: [], accounts: actor ? [actor] : [], interns: [], projects: [], tasks: [], submissions: [], offers: [], onboarding: [], certificates: [], interviews: [], messages: [], notifications: [], resources: [], activity: [], metrics: [] };
      Object.assign(data, lifecycleData, communicationData);
      const learning = await resourcesPromise;
      if (actor?.role === "company") data.resources = learning;
      if (applicationItems) {
        // The dashboard snapshot carries the newest applications only; the
        // Applications page pages through all of them.
        if (applicationItems.length > SNAPSHOT_APPLICATIONS) data.truncated = { ...data.truncated, applications: true };
        data.applications = applicationItems.slice(0, SNAPSHOT_APPLICATIONS);
      }
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
      return { data, my: { application: actor?.role === "intern" ? data.applications[0] || null : null, intern: data.interns[0] || null, offer: data.offers[0] || null, interview: actor?.role === "intern" ? data.interviews[0] || null : null, onboarding: data.onboarding[0] || { applicationId: actor?.applicationId, status: "Not started", acknowledged: false }, projects: data.projects, tasks: data.tasks, submissions: data.submissions, certificates: data.certificates, messages: data.messages, notifications: data.notifications, resources: actor?.role === "intern" ? learning : [], hasPassword: await hasPasswordPromise, documentChecklist: actor?.role === "intern" ? (await publicData()).settings.onboardingDocuments : [] }, account: actor };
    }
    if (method === "application.submit") {
      if (actor) throw new DomainError("FORBIDDEN", "Sign out before submitting an application.");
      const roleId = str(params.roleId), schedule = str(params.schedule);
      if (!isInternRole(roleId) || !isInternSchedule(schedule)) throw new DomainError("INVALID_REQUEST", "Choose an intern role and a part-time or full-time schedule. Refresh this page if these choices are missing.");
      const name = str(params.name), email = emailOf(params.email), programId = str(params.programId), fileId = str(params.resumeAttachmentId), fileToken = str(params.resumeAccessToken);
      if (name.length < 2 || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new DomainError("INVALID_REQUEST", "Enter your full name and a valid email address.");
      if (!fileId || !fileToken) throw new DomainError("INVALID_REQUEST", "Attach a resume before applying.");
      const linkedin = str(params.linkedin), videoUrl = str(params.videoUrl), github = str(params.github);
      const httpUrl = (v: string) => { try { return ["http:", "https:"].includes(new URL(v).protocol); } catch { return false; } };
      if (linkedin.length > 500 || !httpUrl(linkedin) || !/(^|\.)linkedin\.com$/i.test(new URL(linkedin).hostname)) throw new DomainError("INVALID_REQUEST", "Enter your LinkedIn profile URL.");
      if (github && (github.length > 500 || !httpUrl(github))) throw new DomainError("INVALID_REQUEST", "Enter a valid http or https GitHub profile or portfolio link.");
      if (videoUrl && (videoUrl.length > 500 || !httpUrl(videoUrl))) throw new DomainError("INVALID_REQUEST", "Enter a valid http or https video link.");
      // Only a new application receives a confirmation with its reference ID.
      // Sockets and candidate accounts are only provisioned after admin selection.
      const received = (appId?: string) => ({
        received: true,
        message: "Thanks for applying. Check your email for your application reference ID and next steps.",
        applicationId: appId || undefined,
      });
      return transact(key, null, { method, params }, async session => {
        if (!(await intakeOpen())) throw new DomainError("CLOSED", "Internship applications are currently closed.");
        const existing = await applications.findOne({ email }, { session });
        if (existing) throw alreadyApplied();
        const program = await programs.findOne({ _id: programId }, { session });
        const config = await settings.findOne({ _id: "program" }, { session });
        const file = await files.findOne({ _id: fileId, kind: "resume", status: "ready", accessTokenHash: digest(fileToken), applicationId: { $exists: false } }, { session });
        if (!program?.enabled || !config?.programEnabled || program.fee == null || !acceptsCompensationMode(program.stipend, config.compensationMode)) throw new DomainError("CLOSED", "This internship track is not accepting applications.");
        const deadline = normalizeDeadline(config?.applicationDeadline);
        if (deadline && Date.parse(deadline) <= Date.now()) throw new DomainError("CLOSED", "The application deadline for this internship cycle has passed.");
        if (!file) throw new DomainError("INVALID_REQUEST", "Upload your resume before applying.");
        const applicationId = id("OL"), now = new Date();
        const row: Row = { _id: applicationId, name, email, programId, roleId, schedule, workMode: INTERNSHIP_OPPORTUNITIES.workMode, duration: normalizeInternshipDuration(config?.duration), program: program.name, appliedOn: now.toISOString().slice(0, 10), status: "Applied", initials: name.split(/\s+/).slice(0, 2).map(x => x[0]).join(""), avatarColor: "#d9e5fb", college: "", phone: "", location: "", skills: normalizeSkills(params.skills), linkedin, videoUrl, hasVideo: hasVideoLink(videoUrl), github, bio: "", resumeAttachmentId: fileId, history: [{ id: id("HST"), title: "Application received", date: now.toISOString(), detail: `Applied to ${program.name}.` }], notes: [], projectIds: [], source: "Website", version: 1 };
        // Flag likely duplicates: a different email with the same LinkedIn profile.
        const profileKey = linkedinKey(linkedin);
        if (profileKey) {
          row.linkedinKey = profileKey;
          const matches = (await applications.find({ linkedinKey: profileKey }, { session, projection: { _id: 1 }, limit: 5 }).toArray()).map(match => String(match._id));
          if (matches.length) {
            row.possibleDuplicates = matches;
            await applications.updateMany({ _id: { $in: matches } }, { $addToSet: { possibleDuplicates: applicationId } } as any, { session });
          }
        }
        await applications.insertOne(row, { session });
        await files.updateOne({ _id: fileId, applicationId: { $exists: false } }, { $set: { applicationId } }, { session });
        if (config?.applicationAlerts !== false) await collection("notifications").insertOne({ _id: id("NTF"), recipientRole: "company", applicationId, title: "New internship application", body: `${name} applied to ${program.name}.`, href: `/intern/dashboard/applications/${applicationId}`, createdOn: now.toISOString() }, { session });
        await collection("activity").insertOne({ _id: id("ACT"), title: "Application received", detail: `${name} applied to ${program.name}.`, applicationId, icon: "application", tone: "blue", occurredOn: now.toISOString() }, { session });
        await events.insertOne({ _id: id("EVT"), type: "application.created", applicationIds: [applicationId], createdAt: now }, { session });
        // Queued inside the transaction: it is sent only if the application commits.
        await outbox.enqueue("applicationConfirmation", { to: email, name, programName: program.name, applicationId }, session);
        return received(applicationId);
      });
    }
    if (method === "staff.mentors") {
      // Who can be assigned as an intern's mentor (admins assign them).
      company(actor);
      return (await users.find({ role: "company", staffRole: "mentor", disabled: { $ne: true } }, { projection: { name: 1 } }).sort({ name: 1 }).limit(200).toArray()).map(row => ({ id: String(row._id), name: String(row.name || "Mentor") }));
    }
    if (method === "staff.reviewers") {
      // Who an application can be assigned to: active staff who can read applications.
      company(actor);
      const rows = await users.find({ role: "company", disabled: { $ne: true } }, { projection: { name: 1, staffRole: 1 } }).sort({ name: 1 }).limit(500).toArray();
      const reviewers: { id: string; name: string }[] = [];
      for (const row of rows) {
        const role = typeof row.staffRole === "string" ? await staffManagement.resolveRole(row.staffRole) : null;
        if (row.staffRole === "admin" || role?.permissions?.includes("applications.read")) reviewers.push({ id: String(row._id), name: String(row.name || "Staff member") });
      }
      return reviewers;
    }
    if (method === "application.assign") {
      // Assign (or unassign, with null) a reviewer to up to 100 applications.
      company(actor);
      const ids = (Array.isArray(params.applicationIds) ? params.applicationIds : [params.applicationId]).map(str).filter(Boolean);
      const assigneeId = params.assigneeId === null ? null : str(params.assigneeId);
      if (!ids.length || ids.length > 100 || [...new Set(ids)].length !== ids.length) throw new DomainError("INVALID_REQUEST", "Choose up to 100 applications.");
      return transact(key, actor, { method, params }, async session => {
        let assignee: Row | null = null;
        if (assigneeId) {
          assignee = await users.findOne({ _id: assigneeId, role: "company", disabled: { $ne: true } }, { session, projection: { name: 1, staffRole: 1 } });
          const role = assignee && typeof assignee.staffRole === "string" ? await staffManagement.resolveRole(assignee.staffRole) : null;
          if (!assignee || !(assignee.staffRole === "admin" || role?.permissions?.includes("applications.read"))) throw new DomainError("INVALID_REQUEST", "Choose a staff member who can review applications.");
        }
        const result = await applications.updateMany({ _id: { $in: ids } }, assignee
          ? { $set: { assignedTo: assigneeId, assignedToName: String(assignee.name || ""), assignedOn: new Date().toISOString() } }
          : { $unset: { assignedTo: "", assignedToName: "", assignedOn: "" } }, { session });
        await events.insertOne({ _id: id("EVT"), type: "application.assigned", applicationIds: ids, ...(assigneeId ? { assigneeId, assignedBy: actor!.id } : {}), createdAt: new Date() }, { session });
        return { updated: result.modifiedCount, assigneeId, assigneeName: assignee ? String(assignee.name || "") : null };
      });
    }
    if (method === "applicant.erase") {
      // Admin only (not in the staff permission map). The applicant's email
      // must be typed back as confirmation, because this can't be undone.
      company(actor);
      const applicationId = str(params.applicationId), confirmEmail = emailOf(params.confirmEmail);
      const application = await applications.findOne({ _id: applicationId }, { projection: { email: 1 } });
      if (!application) throw new DomainError("NOT_FOUND", "Application not found.");
      if (!confirmEmail || confirmEmail !== emailOf(application.email)) throw new DomainError("INVALID_REQUEST", "Type the applicant's email address to confirm.");
      const removed = await eraseApplicant({ db, client, prefix, applicationId, beforeCommit: (session) => auditDecision(collection("staff_audit"), session, actor, "applicant.erased", applicationId) });
      invalidatePublicData(); communications.invalidateAnalytics();
      await events.insertOne({ _id: id("EVT"), type: "application.updated", applicationIds: [], createdAt: new Date() });
      return { erased: true, removed };
    }
    if (method === "application.bulkUpdate") {
      // One request for many rows. Each row goes through application.update,
      // so permissions, history, emails and version checks are identical;
      // rows succeed or fail independently and report back individually.
      company(actor);
      const status = str(params.status), items = Array.isArray(params.items) ? params.items : [];
      if (!status || !items.length || items.length > 100 || key.length > 120) throw new DomainError("INVALID_REQUEST", "Choose up to 100 applications and a status.");
      const results: { id: string; ok: boolean; version?: number; error?: string }[] = new Array(items.length);
      let next = 0;
      const worker = async () => {
        while (next < items.length) {
          const index = next++, item = items[index], applicationId = str(item?.id);
          try {
            const updated = await execute("application.update", { id: applicationId, status, expectedVersion: item?.expectedVersion }, actor, `${key}-${index}`) as { version?: number };
            results[index] = { id: applicationId, ok: true, version: updated?.version };
          } catch (error) {
            if (!(error instanceof DomainError)) throw error;
            results[index] = { id: applicationId, ok: false, error: error.message };
          }
        }
      };
      // A few rows at a time keeps a large batch well inside the client's request timeout.
      await Promise.all(Array.from({ length: Math.min(4, items.length) }, worker));
      return results;
    }
    if (method === "application.update") {
      company(actor); const applicationId = str(params.id), patch = params.patch || {}, status = str(params.status || patch.status), expectedVersion = Number(params.expectedVersion);
      if ((!status && !Array.isArray(patch.notes)) || (status && !["Applied", "Under Review", "Shortlisted", "Selected", "Rejected", "Declined"].includes(status)) || !Number.isSafeInteger(expectedVersion)) throw new DomainError("INVALID_REQUEST", "Choose a valid change and the current application version.");
      const updated = await transact(key, actor, { method, params }, async session => {
        const now = new Date();
        const existing = await applications.findOne({ _id: applicationId, version: expectedVersion }, { session });
        if (!existing || (status && existing.status === "Joined")) throw new DomainError("CONFLICT", "The application changed or is unavailable. Refresh and try again.");
        if (!isAdmin(actor) && status && !["Applied", "Under Review", "Shortlisted"].includes(existing.status)) throw new DomainError("FORBIDDEN", "Only an admin can change a final application decision.");
        const update: Document = { $inc: { version: 1 } }, values: Document = {};
        if (status) { values.status = status; if (existing.status !== status) values.statusChangedOn = now.toISOString(); update.$push = { history: { id: id("HST"), title: status, detail: `Application moved to ${status.toLowerCase()}.`, date: now.toISOString() } }; }
        if (Array.isArray(patch.notes)) {
          const old = Array.isArray(existing.notes) ? existing.notes : [], proposed = patch.notes;
          if (proposed.length > 200 || proposed.length < old.length || old.some((note: any, i: number) => JSON.stringify(note) !== JSON.stringify(proposed[i]))) throw new DomainError("CONFLICT", "Notes changed. Refresh and try again.");
          const added = proposed.slice(old.length).map((note: any) => { const body = str(note?.text); if (!body || body.length > 3000) throw new DomainError("INVALID_REQUEST", "Enter a note of up to 3,000 characters."); return { id: id("NOTE"), text: body, author: actor!.name, date: now.toISOString() }; });
          values.notes = [...old, ...added];
        }
        update.$set = values;
        const changed = await applications.findOneAndUpdate({ _id: applicationId, version: expectedVersion }, update, { session, returnDocument: "after" });
        if (!changed) throw new DomainError("CONFLICT", "The application changed or is unavailable. Refresh and try again.");
        if (status && existing.status !== status) {
          await auditDecision(collection("staff_audit"), session, actor, "application.status", applicationId, { from: existing.status, to: status });
          const emailStatus = ({ Shortlisted: "shortlisted", Selected: "selected", Rejected: "rejected" } as const)[status as "Shortlisted" | "Selected" | "Rejected"];
          if (emailStatus) await outbox.enqueue("applicantStatus", { applicationId, status: emailStatus }, session);
        }
        if (status) await collection("notifications").insertOne({ _id: id("NTF"), recipientRole: "intern", applicationId, title: "Application status updated", body: `Your application is now ${status}.`, href: "/intern/portal/application", createdOn: now.toISOString() }, { session });
        await events.insertOne({ _id: id("EVT"), type: "application.updated", applicationIds: [applicationId], createdAt: now }, { session });
        return publicApplication(changed, true);
      });
      return updated;
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
    if (stories.supports(method)) return stories.execute(method, params, actor, key);
    if (reviews.supports(method)) return reviews.execute(method, params, actor, key);
    if (templates.supports(method)) return templates.execute(method, params, actor, key);
    if (views.supports(method)) return views.execute(method, params, actor, key);
    if (resources.supports(method)) return resources.execute(method, params, actor, key);
    if (checkins.supports(method)) return checkins.execute(method, params, actor, key);
    if (feedback.supports(method)) return feedback.execute(method, params, actor, key);
    if (method === "certificate.verify") {
      // Public check for a shared certificate link. Numbers are random UUIDs, so they can't be enumerated.
      const number = str(params.number).slice(0, 80);
      if (!/^OLENTRA-[0-9a-f-]{36}$/i.test(number)) return { valid: false };
      const row = await collection("certificates").findOne({ certificateNumber: { $eq: number, $type: "string" } }, { projection: { recipient: 1, program: 1, issuedOn: 1, status: 1 } });
      return row ? { valid: true, certificateNumber: number, recipient: row.recipient, program: row.program, issuedOn: row.issuedOn, status: row.status || "Issued" } : { valid: false };
    }
    if (communications.supports(method)) {
      const res = await communications.execute(method, params, actor, key);
      if (method === "settings.update") invalidatePublicData();
      return res;
    }
    throw new DomainError("NOT_IMPLEMENTED", "This internship action is not available yet.");
  }
  async function autoProvisionAccount(applicationId: string, email: string): Promise<Principal> {
    const normalized = emailOf(email);
    const refused = () => new DomainError("UNAUTHENTICATED", "This sign-in link can't be used for this account. Sign in with your password instead.");
    const app = await applications.findOne({ _id: applicationId });
    if (!app) throw new DomainError("NOT_FOUND", "Application not found.");
    if (emailOf(String(app.email || "")) !== normalized) throw refused();
    if (!["Selected", "Joined"].includes(app.status)) {
      throw new DomainError("FORBIDDEN", "Your application is currently under review. Portal access will be granted upon official acceptance.");
    }
    // Magic links only ever sign in intern accounts. Any other account sharing
    // this email (staff, or a disabled row) must use its own password sign-in.
    const linked = async (): Promise<Principal | null> => {
      const rows = await users.find({ $or: [{ applicationId }, { email: normalized }] }).toArray();
      if (!rows.length) return null;
      const existing = rows.length === 1 ? rows[0] : null;
      if (!existing || existing.role !== "intern" || existing.disabled === true) throw refused();
      if (existing.applicationId && existing.applicationId !== applicationId) throw refused();
      if (!existing.applicationId) {
        await users.updateOne({ _id: existing._id, role: "intern", applicationId: null }, { $set: { applicationId } });
        existing.applicationId = applicationId;
      }
      await applications.updateOne({ _id: applicationId, accountId: { $exists: false } }, { $set: { accountId: existing._id } });
      return (await resolveAccount(existing)) || publicAccount(existing);
    };
    const current = await linked();
    if (current) return current;
    const user: Row = {
      _id: id("ACC"),
      role: "intern",
      name: app.name,
      email: app.email,
      applicationId,
      sessionVersion: 1,
      createdAt: new Date(),
    };
    try {
      await users.insertOne(user);
    } catch (error: any) {
      // Two sign-ins racing on the same link: the unique email index lets one
      // insert win, and the other signs in to the account it created.
      if (error?.code !== 11000) throw error;
      const winner = await linked();
      if (winner) return winner;
      throw error;
    }
    await applications.updateOne(
      { _id: applicationId },
      { $unset: { claimHash: "", claimExpiresAt: "" }, $set: { accountId: user._id } }
    );
    await events.insertOne({ _id: id("EVT"), type: "account.register", applicationIds: [applicationId], createdAt: new Date() });
    return publicAccount(user);
  }
  /**
   * Erases applicants whose final decision is older than the admin's
   * retention setting. Does nothing while the setting is off (the default).
   */
  async function runRetention(limit = 50) {
    const config = await settings.findOne({ _id: "program" }, { projection: { retentionDays: 1 } });
    const days = typeof config?.retentionDays === "number" ? config.retentionDays : null;
    if (!days) return 0;
    const system = { id: "retention-policy", role: "company", staffRole: "admin", name: "Retention policy", email: "", applicationId: null, sessionVersion: 1 } as Principal;
    let erased = 0;
    for (const applicationId of await expiredApplicationIds(applications as any, days, Date.now(), limit)) {
      try {
        await eraseApplicant({ db, client, prefix, applicationId, beforeCommit: session => auditDecision(collection("staff_audit"), session, system, "applicant.erased", applicationId, { reason: "retention", days }) });
        erased++;
      } catch (error) {
        if (!(error instanceof DomainError)) throw error; // e.g. it changed since the query; try again next run
      }
    }
    if (erased) { invalidatePublicData(); communications.invalidateAnalytics(); }
    return erased;
  }
  /** Hourly interview reminders, review reminders and the Monday digest (all via the outbox). */
  async function remind(now = new Date()) { return runReminders({ collection, outbox, transact, now }); }
  /** Sends queued emails through the hooks; a hook that throws is retried later. */
  async function processOutbox(limit = 20) {
    return outbox.process(async row => {
      const { to = "", name = "", programName = "", applicationId = "" } = row.payload;
      if (row.type === "applicationConfirmation") {
        if (!activeHooks?.sendApplicationConfirmation) throw new Error("No email sender is configured.");
        await activeHooks.sendApplicationConfirmation(to, name, programName, applicationId);
      } else if (row.type === "magicLink") {
        if (!activeHooks?.sendMagicLink) throw new Error("No email sender is configured.");
        const application = await applications.findOne({ _id: applicationId });
        if (application && ["Selected", "Joined"].includes(String(application.status))) await activeHooks.sendMagicLink(to, name, applicationId);
      } else if (row.type === "interview" || row.type === "interviewReminder") {
        const p = row.payload;
        const current = await collection("interviews").findOne({ _id: p.interviewId });
        // A newer schedule/cancellation supersedes pending deliveries, including retries.
        if (!isCurrentInterviewEmail(current, p, row.type === "interviewReminder")) return;
        const application = await applications.findOne({ _id: p.applicationId });
        if (!application) return;
        const hook = row.type === "interviewReminder" ? activeHooks?.sendInterviewReminder : p.status === "Cancelled" ? activeHooks?.sendInterviewCancelled : activeHooks?.sendInterviewScheduled;
        if (!hook) throw new Error("No interview email sender is configured.");
        await hook({ to: str(application.email), name: str(application.name), programName: str(application.program), scheduledAt: p.scheduledAt!, meetingUrl: p.meetingUrl!, interviewId: p.interviewId, sequence: Number(p.sequence || 0), cancelReason: p.cancelReason });
      } else if (row.type === "notice") {
        if (!activeHooks?.sendNotice) throw new Error("No email sender is configured.");
        const p = row.payload;
        await activeHooks.sendNotice({ to: p.to || "", subject: p.subject || "", heading: p.heading || "", intro: p.intro || "", items: (p.items || "").split("\n").filter(Boolean), ctaLabel: p.ctaLabel || "", ctaPath: p.ctaPath || "/" });
      } else if (row.type === "applicantStatus") {
        await deliverApplicantStatus(String(row.payload.applicationId), row.payload.status as ApplicantStatusNotice["status"], row.payload.certificateNumber || undefined);
      } else throw new Error(`Unknown outbox type ${String(row.type)}`);
    }, limit);
  }
  async function findApplicationByEmail(email: string): Promise<Row | null> {
    return applications.findOne({ email: emailOf(email) });
  }
  async function findUserByEmail(email: string): Promise<Row | null> {
    return users.findOne({ email: emailOf(email), disabled: { $ne: true } });
  }
  // Staff accounts guard both dashboards, so they need longer passwords than interns.
  const minimumPassword = (role: unknown) => role === "company" ? 12 : 8;
  const versionFilter = (version: number) => version === 1 ? { $or: [{ sessionVersion: 1 }, { sessionVersion: { $exists: false } }] } : { sessionVersion: version };
  async function savePassword(user: Row, passwordHash: string, version: number, type: string) {
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        // The version claim and credential write commit together. Concurrent
        // resets cannot reuse a link or issue sessions against the old password.
        const claimed = await users.updateOne(
          { _id: user._id, disabled: { $ne: true }, ...versionFilter(version) },
          { $set: { sessionVersion: version + 1 } },
          { session }
        );
        if (!claimed.modifiedCount) throw new DomainError("UNAUTHENTICATED", "Your account changed or this password reset link has already been used. Request a new link or sign in again.");
        await credentials.updateOne(
          { userId: user._id },
          { $set: { userId: user._id, passwordHash, updatedAt: new Date() } },
          { upsert: true, session }
        );
        await events.insertOne({ _id: id("EVT"), type, applicationIds: user.applicationId ? [user.applicationId] : [], createdAt: new Date() }, { session });
        if (user.role === "company") await events.insertOne({ _id: id("EVT"), type: "staff.changed", staffAccountIds: [user._id], createdAt: new Date() }, { session });
      });
    } finally { await session.endSession(); }
    return { id: user._id };
  }
  async function selfResetPassword(userId: string, newPassword: string, expectedVersion?: number): Promise<{ id: string }> {
    const password = str(newPassword);
    const user = await users.findOne({ _id: userId, disabled: { $ne: true } });
    if (!user) throw new DomainError("NOT_FOUND", "Account not found.");
    const version = user.sessionVersion ?? 1;
    if (expectedVersion !== undefined && expectedVersion !== version) throw new DomainError("UNAUTHENTICATED", "This password reset link has already been used or has expired. Request a new one.");
    const minimum = minimumPassword(user.role);
    if (password.length < minimum || password.length > 256) {
      throw new DomainError("INVALID_REQUEST", `Password must be at least ${minimum} characters.`);
    }
    const passwordHash = await Bun.password.hash(password, { algorithm: "argon2id" });
    return savePassword(user, passwordHash, version, "account.selfResetPassword");
  }
  async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ id: string }> {
    const nextPassword = str(newPassword);
    const user = await users.findOne({ _id: userId, disabled: { $ne: true } });
    if (!user) throw new DomainError("NOT_FOUND", "Account not found.");
    const minimum = minimumPassword(user.role);
    if (nextPassword.length < minimum || nextPassword.length > 256) {
      throw new DomainError("INVALID_REQUEST", `New password must be at least ${minimum} characters.`);
    }
    const cred = await credentials.findOne({ userId });
    if (cred) {
      const valid = await Bun.password.verify(str(currentPassword), cred.passwordHash);
      if (!valid) throw new DomainError("UNAUTHENTICATED", "Your current password is incorrect.");
    }
    const passwordHash = await Bun.password.hash(nextPassword, { algorithm: "argon2id" });
    return savePassword(user, passwordHash, user.sessionVersion ?? 1, "account.passwordChanged");
  }
  return { readAutomatedEmailTemplate: templates.readAutomated, db, client, prefix, initialize, login, account, createTestStaff, bootstrapFirstAdmin: staffManagement.bootstrapFirstAdmin, execute, publicData, anonymousData, collection, invalidateAnalytics: communications.invalidateAnalytics, invalidatePublicData, resolveRole: staffManagement.resolveRole, resolveRoleSync: staffManagement.resolveRoleSync, setHooks, processOutbox, runRetention, runReminders: remind, autoProvisionAccount, findApplicationByEmail, findUserByEmail, selfResetPassword, changePassword };
}
