import { randomUUID } from "node:crypto";
import { MongoClientBulkWriteError, MongoServerError, type ClientBulkWriteModel, type ClientSession, type Collection, type Document } from "mongodb";
import { DomainError } from "../../shared/errors";
import type { Principal } from "../../shared/principal";
import { can, isAdmin } from "../access/policy";
import { isCompensationMode } from "../programs/compensation";

type Row = Document & { _id: string };
type Transact = <T>(key: string, actor: Principal | null, input: unknown, action: (session: ClientSession) => Promise<T>) => Promise<T>;
type Options = { collection: (name: string) => Collection<Row>; transact: Transact };
const str = (value: unknown) => typeof value === "string" ? value.trim() : "";
const makeId = (prefix: string) => `${prefix}-${randomUUID()}`;
const publicRow = ({ _id, ...rest }: Row) => ({ id: _id, ...rest });

/** Communication records, settings and analytics for the dedicated internship service. */
export function createCommunications({ collection, transact }: Options) {
  const applications = collection("applications"), messages = collection("messages"), notifications = collection("notifications"), reads = collection("notification_reads"), activity = collection("activity"), programs = collection("programs"), settings = collection("settings"), users = collection("accounts"), events = collection("events");
  // Multi-namespace bulk writes require MongoDB 8.0 (wire version 25).
  // Choose the path before a transaction begins; never retry an ambiguous
  // bulk-write failure through a second execution path.
  let clientBulkWrite = false;
  const methods = new Set(["message.send", "message.list", "announcement.send", "notification.list", "notification.markRead", "settings.update", "activity.add", "analytics.get"]);
  const signedIn = (actor: Principal | null): Principal => { if (!actor) throw new DomainError("UNAUTHENTICATED", "Sign in to continue."); return actor; };
  const staff = (actor: Principal | null): Principal => { if (actor?.role !== "company") throw new DomainError("FORBIDDEN", "Company access is required."); return actor; };
  async function initialize() {
    await Promise.all([
      messages.createIndex({ applicationId: 1, createdOn: -1 }),
      messages.createIndex({ createdOn: -1, _id: -1 }),
      notifications.createIndex({ recipientRole: 1, applicationId: 1, createdOn: -1 }),
      notifications.createIndex({ recipientRole: 1, audience: 1, createdOn: -1 }),
      reads.createIndex({ accountId: 1, notificationId: 1 }, { unique: true }),
      activity.createIndex({ occurredOn: -1 }),
    ]);
    // An FCV downgrade or unsupported deployment can reject the 8.0 bulk
    // command even when hello reports a compatible binary. Probe the exact
    // transaction capability without matching or committing any documents.
    let probe: ClientSession | undefined;
    clientBulkWrite = false;
    try {
      const hello = await settings.db.admin().command({ hello: 1 });
      if (typeof hello.maxWireVersion === "number" && hello.maxWireVersion >= 25) {
        probe = settings.db.client.startSession();
        probe.startTransaction();
        const result = await settings.db.client.bulkWrite<Record<string, Row>>([
          { namespace: activity.namespace, name: "updateOne", filter: { _id: makeId("PROBE"), $expr: { $eq: [1, 0] } }, update: { $set: { capabilityProbe: true } } },
        ], { ordered: true, session: probe });
        await probe.abortTransaction();
        clientBulkWrite = result.acknowledged && result.matchedCount === 0;
      }
    } catch {
      clientBulkWrite = false;
      if (probe?.inTransaction()) { try { await probe.abortTransaction(); } catch {} }
    } finally { if (probe) { try { await probe.endSession(); } catch {} } }
  }
  async function bulkTransactionWrites(session: ClientSession, writes: ClientBulkWriteModel<Record<string, Row>>[]) {
    if (!clientBulkWrite) throw new Error("Transactional bulk writes are unavailable.");
    try { await settings.db.client.bulkWrite<Record<string, Row>>(writes, { ordered: true, session }); }
    catch (error) {
      // Driver 7 wraps server errors without forwarding their transaction labels.
      if (error instanceof MongoClientBulkWriteError) {
        if (error.cause instanceof MongoServerError) throw error.cause;
        const first = error.writeErrors.values().next().value;
        if (error.writeErrors.size === 1 && first?.code === 11000) throw new MongoServerError({ code: 11000, errmsg: first.message });
      }
      throw error;
    }
  }
  async function addNotice(session: ClientSession, record: Document) {
    await notifications.insertOne({ _id: makeId("NTF"), createdOn: new Date().toISOString(), ...record } as Row, { session });
  }
  async function addActivity(session: ClientSession, title: string, detail: string, applicationId: string | null, icon = "application", tone = "blue") {
    await activity.insertOne({ _id: makeId("ACT"), title, detail, applicationId, icon, tone, occurredOn: new Date().toISOString() }, { session });
  }
  async function changed(session: ClientSession, applicationIds: string[] = [], isPublic = false) {
    await events.insertOne({ _id: makeId("EVT"), type: "changed", applicationIds, public: isPublic, createdAt: new Date() }, { session });
  }
  async function notificationFilter(actor: Principal, knownApplication?: Document | null): Promise<Document> {
    if (actor.role === "company") return { recipientRole: "company" };
    const application = knownApplication !== undefined
      ? knownApplication
      : (actor.applicationId ? await applications.findOne({ _id: actor.applicationId }) : null);
    const alternatives: Document[] = [];
    if (actor.applicationId) alternatives.push({ applicationId: actor.applicationId });
    if (application?.status === "Joined") alternatives.push({ applicationId: null, audience: { $in: ["all-interns", application.programId] } });
    return { recipientRole: "intern", $or: alternatives.length ? alternatives : [{ _id: "no-eligible-notifications" }] };
  }
  // Company notifications and conversations must follow the same applicant
  // versus active-intern boundaries as message requests.
  function staffApplicationScope(actor: Principal): Document | null {
    if (!can(actor, "messages.applicants") && !can(actor, "messages.interns")) return null;
    if (can(actor, "messages.applicants") && can(actor, "messages.interns")) return {};
    return can(actor, "messages.interns") ? { "_application.status": "Joined" } : { "_application.status": { $ne: "Joined" } };
  }
  function staffScopedPipeline(actor: Principal, filter: Document): Document[] {
    const scope = staffApplicationScope(actor);
    if (!scope) return [{ $match: { _id: "__no_access__" } }];
    return [
      { $match: filter },
      { $lookup: { from: applications.collectionName, localField: "applicationId", foreignField: "_id", pipeline: [{ $project: { status: 1 } }], as: "_application" } },
      { $unwind: "$_application" }, { $match: scope }, { $project: { _application: 0 } },
    ];
  }
  async function staffNotificationPage(actor: Principal, offset = 0, limit = 100) {
    if (!can(actor, "notifications.read")) return { items: [], total: 0 };
    const pipeline = staffScopedPipeline(actor, { recipientRole: "company", applicationId: { $type: "string" } });
    pipeline.push({ $facet: { rows: [{ $sort: { createdOn: -1, _id: -1 } }, { $skip: offset }, { $limit: limit }], total: [{ $count: "count" }] } });
    const [result] = await notifications.aggregate(pipeline).toArray();
    const rows = (result?.rows || []) as Row[];
    const readRows = await reads.find({ accountId: actor.id, notificationId: { $in: rows.map(row => row._id) } }).toArray();
    const readIds = new Set(readRows.map(row => row.notificationId));
    return { items: rows.map(row => ({ ...publicRow(row), unread: !readIds.has(row._id) })), total: result?.total?.[0]?.count || 0 };
  }
  async function notificationList(actor: Principal, offset = 0, limit = 100, knownApplication?: Document | null) {
    if (actor.role === "company" && !isAdmin(actor)) return (await staffNotificationPage(actor, offset, limit)).items;
    const rows = await notifications.find(await notificationFilter(actor, knownApplication)).sort({ createdOn: -1, _id: -1 }).skip(offset).limit(limit).toArray();
    const readRows = await reads.find({ accountId: actor.id, notificationId: { $in: rows.map(row => row._id) } }).toArray();
    const readIds = new Set(readRows.map(row => row.notificationId));
    return rows.map(row => ({ ...publicRow(row), unread: !readIds.has(row._id) }));
  }
  async function calculateAnalytics() {
    const now = new Date(), earliestMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1)).toISOString().slice(0, 10);
    const [result] = await applications.aggregate([
      {
        $facet: {
          statuses: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
          tracks: [{ $group: { _id: "$programId", count: { $sum: 1 } } }],
          monthly: [
            { $match: { appliedOn: { $type: "string", $gte: earliestMonth } } },
            { $group: { _id: { month: { $substrBytes: ["$appliedOn", 0, 7] }, program: "$programId" }, count: { $sum: 1 } } },
            { $sort: { "_id.month": 1 } },
          ],
          skills: [
            { $unwind: "$skills" },
            { $group: { _id: "$skills", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 50 },
          ],
        },
      },
    ]).toArray();
    const statuses = (result?.statuses || []) as { _id: string; count: number }[];
    const tracks = (result?.tracks || []) as { _id: string; count: number }[];
    const monthly = (result?.monthly || []) as { _id: { month: string; program: string }; count: number }[];
    const skills = (result?.skills || []) as { _id: string; count: number }[];
    const months = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11 + index, 1));
      const key = date.toISOString().slice(0, 7), matching = monthly.filter(row => row._id.month === key);
      return { label: date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }), month: key, explorer: matching.find(row => row._id.program === "explorer")?.count || 0, innovator: matching.find(row => row._id.program === "innovator")?.count || 0 };
    });
    return { statusCounts: Object.fromEntries(statuses.map(row => [row._id, row.count])), byTrack: Object.fromEntries(tracks.map(row => [row._id, row.count])), totalApplications: statuses.reduce((sum, row) => sum + row.count, 0), months, previousMonths: [], skills: skills.map(row => ({ name: row._id, count: row.count })), views: null };
  }
  // Dashboard snapshots often arrive in bursts after a change. Share one
  // aggregation across concurrent requests, and bound cached staleness.
  type Analytics = Awaited<ReturnType<typeof calculateAnalytics>>;
  let cachedAnalytics: { value: Analytics; expires: number } | null = null;
  let pendingAnalytics: Promise<Analytics> | null = null;
  let analyticsGeneration = 0;
  function invalidateAnalytics() { analyticsGeneration++; cachedAnalytics = null; pendingAnalytics = null; }
  async function analytics(): Promise<Analytics> {
    if (cachedAnalytics && cachedAnalytics.expires > performance.now()) return cachedAnalytics.value;
    if (pendingAnalytics) return pendingAnalytics;
    const generation = analyticsGeneration;
    const pending = calculateAnalytics().then(value => {
      if (generation === analyticsGeneration) cachedAnalytics = { value, expires: performance.now() + 10000 };
      return value;
    });
    pendingAnalytics = pending;
    try { return await pending; }
    finally { if (pendingAnalytics === pending) pendingAnalytics = null; }
  }
  async function snapshot(actor: Principal | null, knownApplication?: Document | null) {
    if (!actor) return { messages: [], notifications: [], activity: [], analytics: null };
    const filter = actor.role === "company" ? {} : { applicationId: actor.applicationId || "no-application" };
    const messageQuery = actor.role === "company" && !isAdmin(actor)
      ? staffApplicationScope(actor) ? messages.aggregate([...staffScopedPipeline(actor, {}), { $sort: { createdOn: -1, _id: -1 } }, { $limit: 100 }]).toArray() : Promise.resolve([])
      : messages.find(filter).sort({ createdOn: -1, _id: -1 }).limit(100).toArray();
    const [messageRows, noticeRows, activityRows, stats] = await Promise.all([
      messageQuery, notificationList(actor, 0, 100, knownApplication),
      isAdmin(actor) ? activity.find({}).sort({ occurredOn: -1, _id: -1 }).limit(100).toArray() : Promise.resolve([]),
      actor.role === "company" && can(actor, "overview.read") ? analytics() : Promise.resolve(null),
    ]);
    return { messages: (messageRows as Row[]).map(publicRow), notifications: noticeRows, activity: activityRows.map(publicRow), analytics: stats };
  }
  async function execute(method: string, params: Record<string, any>, actor: Principal | null, key: string): Promise<any> {
    if (method === "analytics.get") { staff(actor); return analytics(); }
    if (method === "message.list" || method === "notification.list") {
      const account = signedIn(actor);
      const page = Math.max(1, Math.min(100000, Math.floor(Number(params.page) || 1)));
      const pageSize = Math.max(1, Math.min(100, Math.floor(Number(params.pageSize) || 20)));
      if (method === "notification.list") {
        if (account.role === "company" && !isAdmin(account)) return { ...(await staffNotificationPage(account, (page - 1) * pageSize, pageSize)), page, pageSize };
        const filter = await notificationFilter(account);
        const [items, total] = await Promise.all([notificationList(account, (page - 1) * pageSize, pageSize), notifications.countDocuments(filter)]);
        return { items, total, page, pageSize };
      }
      const applicationId = str(params.applicationId);
      if (!applicationId) throw new DomainError("INVALID_REQUEST", "Choose an application.");
      if (account.role === "intern" && account.applicationId !== applicationId) throw new DomainError("FORBIDDEN", "This application belongs to another account.");
      if (account.role === "company" && !isAdmin(account)) {
        const pipeline = staffScopedPipeline(account, { applicationId });
        pipeline.push({ $facet: { rows: [{ $sort: { createdOn: -1, _id: -1 } }, { $skip: (page - 1) * pageSize }, { $limit: pageSize }], total: [{ $count: "count" }] } });
        const [result] = await messages.aggregate(pipeline).toArray();
        return { items: ((result?.rows || []) as Row[]).map(publicRow), total: result?.total?.[0]?.count || 0, page, pageSize };
      }
      const filter = { applicationId };
      const [rows, total] = await Promise.all([messages.find(filter).sort({ createdOn: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).toArray(), messages.countDocuments(filter)]);
      return { items: rows.map(publicRow), total, page, pageSize };
    }
    if (method === "message.send") {
      const sender = signedIn(actor), applicationId = str(params.applicationId), subject = str(params.subject), body = str(params.body);
      if (!applicationId || !subject || subject.length > 140 || !body || body.length > 3000) throw new DomainError("INVALID_REQUEST", "Enter a subject and message of up to 3,000 characters.");
      if (sender.role === "intern" && sender.applicationId !== applicationId) throw new DomainError("FORBIDDEN", "This application belongs to another account.");
      return transact(key, sender, { method, params }, async session => {
        const application = await applications.findOne({ _id: applicationId }, { session });
        if (!application) throw new DomainError("NOT_FOUND", "Application not found.");
        if (sender.role === "company" && !isAdmin(sender) && !can(sender, application.status === "Joined" ? "messages.interns" : "messages.applicants")) throw new DomainError("FORBIDDEN", "Your role cannot access this conversation.");
        if (sender.role === "company" && !isAdmin(sender)) await applications.updateOne({ _id: applicationId, status: application.status }, { $inc: { communicationFence: 1 } }, { session });
        const message: Row = { _id: makeId("MSG"), applicationId, senderAccountId: sender.id, senderRole: sender.role, subject, body, createdOn: new Date().toISOString() };
        await messages.insertOne(message, { session });
        await addNotice(session, { recipientRole: sender.role === "company" ? "intern" : "company", applicationId, title: sender.role === "company" ? "A message from Olentra" : "An intern replied", body: sender.role === "company" ? subject : `${sender.name} · ${subject}`, href: sender.role === "company" ? "/intern/portal/application" : `/intern/dashboard/applications/${applicationId}` });
        await addActivity(session, "Message sent", subject, applicationId);
        await changed(session, [applicationId]);
        return publicRow(message);
      });
    }
    if (method === "announcement.send") {
      const sender = staff(actor), subject = str(params.subject), body = str(params.message), audience = str(params.audience) || "all-interns";
      if (!subject || subject.length > 140 || !body || body.length > 3000 || !["all-interns", "explorer", "innovator"].includes(audience)) throw new DomainError("INVALID_REQUEST", "Enter a valid subject, message and audience.");
      return transact(key, sender, { method, params }, async session => {
        await addNotice(session, { recipientRole: "intern", applicationId: null, audience, title: subject, body, href: "/intern/portal/application" });
        await addActivity(session, "Program announcement", subject, null, "send");
        const query: Document = { status: "Joined" }; if (audience !== "all-interns") query.programId = audience;
        let batch: string[] = [];
        for await (const application of applications.find(query, { session }).project({ _id: 1 })) {
          batch.push(application._id);
          if (batch.length === 500) { await changed(session, batch); batch = []; }
        }
        await changed(session, batch);
        return true;
      });
    }
    if (method === "notification.markRead") {
      const account = signedIn(actor), ids = Array.isArray(params.ids) ? [...new Set<string>(params.ids.filter((id: unknown): id is string => typeof id === "string" && id.length <= 100))] : [];
      if (ids.length > 100) throw new DomainError("INVALID_REQUEST", "At most 100 notifications can be marked at once.");
      const scope = await notificationFilter(account);
      return transact(key, account, { method, params: { ids } }, async session => {
        const permitted = account.role === "company" && !isAdmin(account)
          ? await notifications.aggregate([...staffScopedPipeline(account, { recipientRole: "company", _id: { $in: ids }, applicationId: { $type: "string" } }), { $project: { _id: 1 } }], { session }).toArray()
          : await notifications.find({ ...scope, _id: { $in: ids } }, { session }).project({ _id: 1 }).toArray();
        if (permitted.length) await reads.bulkWrite(permitted.map(notice => ({ updateOne: { filter: { accountId: account.id, notificationId: notice._id }, update: { $setOnInsert: { _id: makeId("READ"), accountId: account.id, notificationId: notice._id, readAt: new Date() } }, upsert: true } })), { session, ordered: false });
        await changed(session, account.applicationId ? [account.applicationId] : []);
        return true;
      });
    }
    if (method === "activity.add") {
      const account = staff(actor), title = str(params.title), detail = str(params.detail), applicationId = str(params.applicationId) || null;
      if (!title || title.length > 140 || detail.length > 3000) throw new DomainError("INVALID_REQUEST", "Enter a valid activity title and details.");
      return transact(key, account, { method, params }, async session => { await addActivity(session, title, detail, applicationId, str(params.icon) || "application", str(params.tone) || "blue"); await changed(session); return true; });
    }
    if (method === "settings.update") {
      const account = staff(actor), patch = params.patch;
      if (!patch || typeof patch !== "object" || Array.isArray(patch)) throw new DomainError("INVALID_REQUEST", "Provide valid settings.");
      const values: Document = {};
      if (patch.compensationMode !== undefined) {
        if (!isCompensationMode(patch.compensationMode)) throw new DomainError("INVALID_REQUEST", "Choose free, paid, or both internship types.");
        values.compensationMode = patch.compensationMode;
      }
      for (const field of ["programName", "defaultBatch"]) if (patch[field] !== undefined) { const value = str(patch[field]); if ((field === "programName" && !value) || value.length > 120) throw new DomainError("INVALID_REQUEST", `Enter a valid ${field}.`); values[field] = value; }
      for (const field of ["programEnabled", "applicationAlerts", "weeklyDigest", "reviewReminder", "rejectionEmails"]) if (patch[field] !== undefined) { if (typeof patch[field] !== "boolean") throw new DomainError("INVALID_REQUEST", `Invalid ${field}.`); values[field] = patch[field]; }
      if (patch.retentionDays !== undefined) {
        // null turns automatic deletion off; otherwise 30 days to 10 years.
        const days = patch.retentionDays === null ? null : Number(patch.retentionDays);
        if (days !== null && (!Number.isSafeInteger(days) || days < 30 || days > 3650)) throw new DomainError("INVALID_REQUEST", "Keep data for between 30 and 3,650 days, or turn automatic deletion off.");
        values.retentionDays = days;
      }
      if (patch.maxStipend !== undefined) { const amount = Number(patch.maxStipend); if (!Number.isSafeInteger(amount) || amount < 0 || amount > 1000000) throw new DomainError("INVALID_REQUEST", "Enter a valid stipend."); values.maxStipend = amount; }
      if (patch.emailNotifications === true || patch.weeklyDigest === true || patch.reviewReminder === true || (patch.integrations && Object.values(patch.integrations).some(Boolean))) throw new DomainError("UNAVAILABLE", "Email, scheduled reminders, and external integrations are not configured.");
      return transact(key, account, { method, params }, async session => {
        const writes: ClientBulkWriteModel<Record<string, Row>>[] = [];
        for (const [field, programId] of [["explorerEnabled", "explorer"], ["innovatorEnabled", "innovator"]] as const) if (patch[field] !== undefined) {
          if (typeof patch[field] !== "boolean") throw new DomainError("INVALID_REQUEST", "Invalid track visibility.");
          const program = await programs.findOne({ _id: programId }, { session });
          if (patch[field] && (program?.fee == null || program?.stipend == null)) throw new DomainError("INVALID_REQUEST", "Set the track fee and stipend before opening applications.");
          writes.push({ namespace: programs.namespace, name: "updateOne", filter: { _id: programId }, update: { $set: { enabled: patch[field] } } });
        }
        if (patch.profile !== undefined) {
          const name = str(patch.profile?.name), email = str(patch.profile?.email ?? account.email).toLowerCase();
          if (!name || name.length > 120) throw new DomainError("INVALID_REQUEST", "Enter a valid administrator name.");
          // The sign-in email can't change here: that would hand the account to
          // an address nobody has proved they own.
          if (email !== String(account.email || "").toLowerCase()) throw new DomainError("INVALID_REQUEST", "The sign-in email can't be changed from settings.");
          writes.push({ namespace: users.namespace, name: "updateOne", filter: { _id: account.id, role: "company" }, update: { $set: { name } } });
        }
        if (clientBulkWrite) {
          writes.push(
            { namespace: settings.namespace, name: "updateOne", filter: { _id: "program" }, update: { $set: values } },
            { namespace: activity.namespace, name: "insertOne", document: { _id: makeId("ACT"), title: "Program settings updated", detail: "Internship settings changed.", applicationId: null, icon: "settings", tone: "blue", occurredOn: new Date().toISOString() } },
            { namespace: events.namespace, name: "insertOne", document: { _id: makeId("EVT"), type: "changed", applicationIds: [], public: true, createdAt: new Date() } },
          );
          await bulkTransactionWrites(session, writes);
        } else {
          const ops: Promise<any>[] = [];
          for (const write of writes) {
            if (write.name === "updateOne" && write.namespace === programs.namespace) ops.push(programs.updateOne(write.filter as any, write.update as any, { session }));
            else if (write.name === "updateOne" && write.namespace === users.namespace) ops.push(users.updateOne(write.filter as any, write.update as any, { session }));
          }
          ops.push(settings.updateOne({ _id: "program" }, { $set: values }, { session }));
          ops.push(addActivity(session, "Program settings updated", "Internship settings changed.", null, "settings"));
          await Promise.all(ops);
          await changed(session, [], true);
        }
        return true;
      });
    }
    throw new DomainError("NOT_IMPLEMENTED", "This internship action is not available yet.");
  }
  return { initialize, supports: (method: string) => methods.has(method), execute, snapshot, invalidateAnalytics, supportsTransactionalBulk: () => clientBulkWrite, bulkTransactionWrites };
}
