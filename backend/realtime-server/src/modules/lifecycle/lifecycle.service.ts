import { randomUUID } from "node:crypto";
import type { ClientSession, Collection, Document } from "mongodb";
import { DomainError } from "../../shared/errors";
import type { Principal } from "../../shared/principal";
import { can, isAdmin } from "../access/policy";

type Row = Document & { _id: string };
type Tx = <T>(key: string, actor: Principal | null, input: unknown, fn: (session: ClientSession) => Promise<T>) => Promise<T>;
const text = (v: unknown) => typeof v === "string" ? v.trim() : "";
const newId = (p: string) => `${p}-${randomUUID()}`;
const plain = (row: Row) => { const { _id, ...data } = row; return { ...data, id: _id }; };
const required = (value: unknown, label: string, max = 500) => { const v = text(value); if (!v || v.length > max) throw new DomainError("INVALID_REQUEST", `Enter a valid ${label}.`); return v; };
const own = (actor: Principal | null, app: string) => { if (actor?.role !== "intern" || actor.applicationId !== app) throw new DomainError("FORBIDDEN", "This record belongs to another account."); };
const staff = (actor: Principal | null) => { if (actor?.role !== "company") throw new DomainError("FORBIDDEN", "Company access is required."); };
const day = () => new Date().toISOString().slice(0, 10);
const validDate = (v: unknown) => { const value = text(v), parsed = new Date(value); return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value; };
const validUrl = (value: unknown) => { const v = text(value); if (v) { try { if (!["https:", "http:"].includes(new URL(v).protocol)) throw 0; } catch { throw new DomainError("INVALID_REQUEST", "Use an http or https link."); } } return v; };

export function createLifecycle({ collection, transact }: { collection: (name: string) => Collection<Row>; transact: Tx }) {
  const applications = collection("applications"), accounts = collection("accounts"), programs = collection("programs"), settings = collection("settings"), files = collection("files");
  const events = collection("events"), notifications = collection("notifications"), activity = collection("activity"), offers = collection("offers"), onboarding = collection("onboarding"), interns = collection("interns"), projects = collection("projects"), tasks = collection("tasks"), submissions = collection("submissions"), certificates = collection("certificates");
  const names = new Set(["offer.send", "offer.accept", "offer.decline", "onboarding.save", "onboarding.submit", "onboarding.approve", "profile.update", "project.create", "project.update", "task.create", "task.update", "task.start", "submission.create", "submission.review", "intern.update", "certificate.generate"]);
  async function initialize() {
    await Promise.all([
      offers.createIndex({ applicationId: 1 }, { unique: true }),
      onboarding.createIndex({ applicationId: 1 }, { unique: true }),
      interns.createIndex({ applicationId: 1 }, { unique: true }),
      tasks.createIndex({ applicationId: 1, status: 1, required: 1 }),
      tasks.createIndex({ projectId: 1, applicationId: 1 }),
      submissions.createIndex({ taskId: 1, version: 1 }, { unique: true }),
      submissions.createIndex({ submittedOn: -1 }),
      submissions.createIndex({ applicationId: 1, submittedOn: -1 }),
      certificates.createIndex({ internId: 1 }, { unique: true }),
      certificates.createIndex({ applicationId: 1 }),
      projects.createIndex({ team: 1 }),
    ]);
  }
  async function active(applicationId: string, session: ClientSession) {
    const intern = await interns.findOne({ applicationId, status: "Active" }, { session });
    if (!intern) throw new DomainError("CONFLICT", "An active internship is required.");
    return intern;
  }
  async function touch(intern: Row, session: ClientSession) { await interns.updateOne({ _id: intern._id, status: "Active" }, { $inc: { revision: 1 } }, { session }); }
  async function validateTeam(team: unknown, session: ClientSession) {
    if (!Array.isArray(team) || team.length > 100 || team.some(v => typeof v !== "string" || !v)) throw new DomainError("INVALID_REQUEST", "Choose a valid project team.");
    const ids = [...new Set(team as string[])];
    for (const app of ids) { const record = await active(app, session); await touch(record, session); }
    return ids;
  }
  async function execute(method: string, p: Record<string, any>, actor: Principal | null, key: string) {
    return transact(key, actor, { method, params: p }, async session => {
      const result = await (async () => {
      const opts = { session }, now = new Date().toISOString();
      if (method === "offer.send") {
        staff(actor); const applicationId = required(p.applicationId, "application");
        const app = await applications.findOne({ _id: applicationId, status: "Selected" }, opts);
        if (!app) throw new DomainError("CONFLICT", "Select this applicant before sending an offer.");
        if (!validDate(p.startOn) || !validDate(p.endOn) || p.endOn < p.startOn) throw new DomainError("INVALID_REQUEST", "Choose a valid start and end date.");
        const program = await programs.findOne({ _id: app.programId }, opts); const stipend = Number(p.stipend);
        if (!program || program.stipend == null || !Number.isSafeInteger(stipend) || stipend < 0 || stipend > program.stipend) throw new DomainError("INVALID_REQUEST", "The stipend must be within the configured program limit.");
        const old = await offers.findOne({ applicationId }, opts); if (old?.status === "Accepted") throw new DomainError("CONFLICT", "The offer was already accepted.");
        const offer: Row = { _id: old?._id || newId("OFFER"), applicationId, status: "Sent", startOn: p.startOn, endOn: p.endOn, stipend, message: text(p.message).slice(0, 2000), sentOn: now };
        await offers.replaceOne({ applicationId }, offer, { ...opts, upsert: true }); await applications.updateOne({ _id: applicationId, status: "Selected" }, { $inc: { version: 1 }, $push: { history: { id: newId("HST"), title: "Offer sent", detail: "Your offer is ready for review.", date: now } } as any }, opts); return plain(offer);
      }
      if (method === "offer.accept" || method === "offer.decline") {
        const applicationId = required(p.applicationId, "application"); own(actor, applicationId);
        const app = await applications.findOne({ _id: applicationId, status: "Selected" }, opts); if (!app) throw new DomainError("CONFLICT", "This offer is no longer awaiting a decision.");
        const offer = await offers.findOneAndUpdate({ applicationId, status: "Sent" }, { $set: { status: method === "offer.accept" ? "Accepted" : "Declined", decidedOn: now, reason: text(p.reason).slice(0, 2000) } }, { ...opts, returnDocument: "after" });
        if (!offer) throw new DomainError("CONFLICT", "This offer is no longer awaiting a decision.");
        await applications.updateOne({ _id: applicationId, status: "Selected" }, { ...(method === "offer.decline" ? { $set: { status: "Declined" } } : {}), $inc: { version: 1 }, $push: { history: { id: newId("HST"), title: method === "offer.accept" ? "Offer accepted" : "Offer declined", detail: method === "offer.accept" ? "Onboarding is now available." : "Offer declined.", date: now } } as any }, opts);
        return plain(offer);
      }
      if (method === "onboarding.save" || method === "onboarding.submit") {
        const applicationId = required(p.applicationId, "application"); own(actor, applicationId);
        const app = await applications.findOne({ _id: applicationId, status: "Selected" }, opts); const offer = await offers.findOne({ applicationId, status: "Accepted" }, opts); const old = await onboarding.findOne({ applicationId }, opts);
        if (!app || !offer || ["Submitted", "Approved"].includes(old?.status)) throw new DomainError("CONFLICT", "Accept your offer before completing onboarding.");
        const details = method === "onboarding.save" && p.details && typeof p.details === "object" ? p.details : {};
        const data: Row = { _id: old?._id || newId("ONB"), applicationId, phone: text(details.phone ?? old?.phone ?? app.phone).slice(0, 100), college: text(details.college ?? old?.college ?? app.college).slice(0, 200), location: text(details.location ?? old?.location ?? app.location).slice(0, 200), skills: Array.isArray(details.skills) ? details.skills.map(text).filter(Boolean).slice(0, 50) : old?.skills ?? app.skills ?? [], resumeAttachmentId: text(details.resumeAttachmentId ?? old?.resumeAttachmentId ?? app.resumeAttachmentId), acknowledged: details.acknowledged === undefined ? !!old?.acknowledged : details.acknowledged === true, status: method === "onboarding.submit" ? "Submitted" : "Draft" };
        if (data.resumeAttachmentId !== app.resumeAttachmentId) { const file = await files.findOne({ _id: data.resumeAttachmentId, kind: "resume", status: "ready", ownerApplicationId: applicationId }, opts); if (!file) throw new DomainError("FORBIDDEN", "Resume does not belong to this account."); await files.updateOne({ _id: data.resumeAttachmentId }, { $set: { applicationId } }, opts); }
        if (method === "onboarding.submit" && (!data.phone || !data.college || !data.location || !data.resumeAttachmentId || !data.acknowledged)) throw new DomainError("INVALID_REQUEST", "Complete your profile, resume, and program acknowledgment before submitting.");
        if (method === "onboarding.submit") data.submittedOn = now;
        await onboarding.replaceOne({ applicationId }, data, { ...opts, upsert: true });
        await applications.updateOne({ _id: applicationId }, { $set: { phone: data.phone, college: data.college, location: data.location, skills: data.skills, resumeAttachmentId: data.resumeAttachmentId }, $inc: { version: 1 }, ...(method === "onboarding.submit" ? { $push: { history: { id: newId("HST"), title: "Onboarding submitted", detail: "The company team will review your onboarding details.", date: now } } as any } : {}) }, opts);
        return plain(data);
      }
      if (method === "onboarding.approve") {
        staff(actor); const applicationId = required(p.applicationId, "application");
        const app = await applications.findOne({ _id: applicationId, status: "Selected" }, opts); const offer = await offers.findOne({ applicationId, status: "Accepted" }, opts);
        if (!app || !offer) throw new DomainError("CONFLICT", "Only selected applicants with an accepted offer can be onboarded.");
        const updated = await onboarding.findOneAndUpdate({ applicationId, status: "Submitted" }, { $set: { status: "Approved", approvedOn: now } }, { ...opts, returnDocument: "after" }); if (!updated) throw new DomainError("CONFLICT", "The applicant must submit onboarding before approval.");
        await applications.updateOne({ _id: applicationId, status: "Selected" }, { $set: { status: "Joined" }, $inc: { version: 1 }, $push: { history: { id: newId("HST"), title: "Intern onboarded", detail: "Onboarding approved. Your internship workspace is ready.", date: now } } as any }, opts);
        const config = await settings.findOne({ _id: "program" }, opts);
        const intern: Row = { _id: newId("INT"), applicationId, batch: config?.defaultBatch || "", joinedOn: day(), status: "Active", projectIds: [], revision: 1 };
        await interns.insertOne(intern, opts); return plain(intern);
      }
      if (method === "profile.update") {
        if (!actor?.applicationId) throw new DomainError("FORBIDDEN", "Intern access is required."); own(actor, actor.applicationId);
        const app = await applications.findOne({ _id: actor.applicationId }, opts); if (!app) throw new DomainError("NOT_FOUND", "Application not found.");
        const patch: Record<string, any> = {}; for (const name of ["name", "phone", "college", "location", "bio"]) if (p[name] !== undefined) patch[name] = text(p[name]).slice(0, 1000);
        if (patch.name !== undefined && patch.name.length < 2) throw new DomainError("INVALID_REQUEST", "Enter your full name.");
        for (const name of ["github", "linkedin"]) if (p[name] !== undefined) patch[name] = validUrl(p[name]);
        if (p.skills !== undefined) { if (!Array.isArray(p.skills)) throw new DomainError("INVALID_REQUEST", "Choose valid skills."); patch.skills = p.skills.map(text).filter(Boolean).slice(0, 50); }
        if (p.resumeAttachmentId && p.resumeAttachmentId !== app.resumeAttachmentId) { const file = await files.findOne({ _id: p.resumeAttachmentId, kind: "resume", status: "ready", ownerApplicationId: actor.applicationId }, opts); if (!file) throw new DomainError("FORBIDDEN", "Resume does not belong to this account."); patch.resumeAttachmentId = p.resumeAttachmentId; await files.updateOne({ _id: file._id }, { $set: { applicationId: actor.applicationId } }, opts); }
        await applications.updateOne({ _id: actor.applicationId }, { $set: patch, $inc: { version: 1 } }, opts); if (patch.name) await accounts.updateOne({ _id: actor.id }, { $set: { name: patch.name } }, opts);
        return { applicationId: actor.applicationId };
      }
      if (method === "project.create") {
        staff(actor); const input = p.project || {}; const team = await validateTeam(input.team || [], session); const name = required(input.name, "project name", 200), description = required(input.description, "project description", 5000);
        if (input.dueOn && !validDate(input.dueOn)) throw new DomainError("INVALID_REQUEST", "Choose a valid due date.");
        const project: Row = { _id: newId("PRJ"), name, description, team, dueOn: input.dueOn || day(), createdOn: day(), art: "planet", progress: 0, status: "In progress", program: text(input.program) };
        await projects.insertOne(project, opts); return plain(project);
      }
      if (method === "project.update") {
        staff(actor); const project = await projects.findOne({ _id: required(p.id, "project") }, opts); if (!project) throw new DomainError("NOT_FOUND", "Project not found.");
        const input = p.patch || {}, patch: Record<string, any> = {};
        for (const name of ["name", "description", "status", "program", "dueOn"]) if (input[name] !== undefined) patch[name] = required(input[name], name, 5000);
        if (patch.dueOn && !validDate(patch.dueOn)) throw new DomainError("INVALID_REQUEST", "Choose a valid due date.");
        if (input.progress !== undefined) { const n = Number(input.progress); if (!Number.isFinite(n) || n < 0 || n > 100) throw new DomainError("INVALID_REQUEST", "Progress must be between 0 and 100."); patch.progress = n; }
        if (input.team !== undefined) { patch.team = await validateTeam(input.team, session); for (const removed of (project.team || []).filter((v: string) => !patch.team.includes(v))) if (await tasks.findOne({ projectId: project._id, applicationId: removed, status: { $ne: "Approved" } }, opts)) throw new DomainError("CONFLICT", "Finish this intern's tasks before removing them from the project."); }
        const result = await projects.findOneAndUpdate({ _id: project._id }, { $set: patch }, { ...opts, returnDocument: "after" }); return { ...plain(result!), affectedApplications: [...new Set([...(project.team || []), ...(result?.team || [])])] };
      }
      if (method === "task.create") {
        staff(actor); const projectId = required(p.projectId, "project"), applicationId = required(p.applicationId, "intern"); const project = await projects.findOne({ _id: projectId, team: applicationId }, opts); if (!project) throw new DomainError("CONFLICT", "Choose an intern on this project team."); const intern = await active(applicationId, session); await touch(intern, session); await projects.updateOne({ _id: projectId, team: applicationId }, { $inc: { revision: 1 } }, opts);
        const title = required(p.title, "task title", 200), description = required(p.description, "task description", 5000); if (!validDate(p.dueOn)) throw new DomainError("INVALID_REQUEST", "Choose a valid task due date.");
        const task: Row = { _id: newId("TASK"), projectId, applicationId, title, description, dueOn: p.dueOn, required: !!p.required, status: "Todo", createdOn: now, submissionVersion: 0 };
        await tasks.insertOne(task, opts); return plain(task);
      }
      if (method === "task.update") {
        staff(actor); const task = await tasks.findOne({ _id: required(p.id, "task") }, opts); if (!task) throw new DomainError("NOT_FOUND", "Task not found."); const intern = await active(task.applicationId, session); await touch(intern, session);
        const input = p.patch || {}, patch: Record<string, any> = {}; if (input.applicationId && input.applicationId !== task.applicationId) throw new DomainError("INVALID_REQUEST", "Create a new task to change the assignee.");
        for (const name of ["title", "description", "dueOn"]) if (input[name] !== undefined) patch[name] = required(input[name], name, 5000);
        if (patch.dueOn && !validDate(patch.dueOn)) throw new DomainError("INVALID_REQUEST", "Choose a valid task due date."); if (input.required !== undefined) patch.required = !!input.required;
        const result = await tasks.findOneAndUpdate({ _id: task._id }, { $set: patch }, { ...opts, returnDocument: "after" }); return plain(result!);
      }
      if (method === "task.start" || method === "submission.create") {
        const taskId = required(p.taskId, "task"), task = await tasks.findOne({ _id: taskId }, opts); if (!task) throw new DomainError("NOT_FOUND", "Task not found."); own(actor, task.applicationId); const intern = await active(task.applicationId, session); await touch(intern, session);
        if (!(await projects.findOne({ _id: task.projectId, team: task.applicationId }, opts))) throw new DomainError("FORBIDDEN", "You are no longer assigned to this project.");
        if (["Under review", "Approved"].includes(task.status)) throw new DomainError("CONFLICT", "This task is already submitted or approved.");
        if (method === "task.start") { await tasks.updateOne({ _id: taskId }, { $set: { status: "In progress" } }, opts); return { id: taskId, applicationId: task.applicationId }; }
        const notes = text(p.notes).slice(0, 10000), url = validUrl(p.url), attachmentId = text(p.attachmentId); if (!notes && !url && !attachmentId) throw new DomainError("INVALID_REQUEST", "Add submission notes, a work link, or an attachment.");
        if (attachmentId && !(await files.findOne({ _id: attachmentId, kind: "work", status: "ready", ownerApplicationId: task.applicationId }, opts))) throw new DomainError("FORBIDDEN", "Attachment does not belong to this account.");
        const version = (task.submissionVersion || 0) + 1; const submission: Row = { _id: newId("SUB"), taskId, applicationId: task.applicationId, version, notes, url, attachmentId: attachmentId || null, submittedOn: now, status: "Submitted", feedback: "", reviewedOn: null };
        await tasks.updateOne({ _id: taskId }, { $set: { status: "Under review", submissionVersion: version } }, opts); await submissions.insertOne(submission, opts); return plain(submission);
      }
      if (method === "submission.review") {
        staff(actor); const submission = await submissions.findOne({ _id: required(p.id, "submission"), status: "Submitted" }, opts); if (!submission) throw new DomainError("CONFLICT", "This submission has already been reviewed.");
        const task = await tasks.findOne({ _id: submission.taskId, submissionVersion: submission.version, status: "Under review" }, opts); if (!task) throw new DomainError("CONFLICT", "Review the latest submission version.");
        const intern = await active(submission.applicationId, session); await touch(intern, session); if (!["Approved", "Changes requested"].includes(p.decision)) throw new DomainError("INVALID_REQUEST", "Choose a review decision."); const feedback = text(p.feedback).slice(0, 10000); if (p.decision === "Changes requested" && !feedback) throw new DomainError("INVALID_REQUEST", "Explain the requested changes.");
        const updated = await submissions.findOneAndUpdate({ _id: submission._id, status: "Submitted" }, { $set: { status: p.decision, feedback, reviewedOn: now, reviewerAccountId: actor!.id } }, { ...opts, returnDocument: "after" });
        await tasks.updateOne({ _id: task._id }, { $set: { status: p.decision } }, opts); return plain(updated!);
      }
      if (method === "intern.update") {
        staff(actor); const intern = await interns.findOne({ _id: required(p.id, "intern") }, opts); if (!intern) throw new DomainError("NOT_FOUND", "Intern not found.");
        const patch = p.patch || {}, next = patch.status || intern.status; if (!["Active", "Completed", "Dropped"].includes(next) || (intern.status === "Completed" && next !== "Completed")) throw new DomainError("CONFLICT", "This internship status cannot be changed.");
        if (next === "Completed" && !["Active", "Completed"].includes(intern.status)) throw new DomainError("CONFLICT", "Only active internships can be completed.");
        if (next === "Completed" && await tasks.findOne({ applicationId: intern.applicationId, required: true, status: { $ne: "Approved" } }, opts)) throw new DomainError("CONFLICT", "Approve every required task before completing this internship.");
        const updated = await interns.findOneAndUpdate({ _id: intern._id }, { $set: { status: next, ...(patch.batch !== undefined ? { batch: text(patch.batch).slice(0, 100) } : {}), ...(next === "Completed" ? { completedOn: intern.completedOn || day() } : {}) }, $inc: { revision: 1 } }, { ...opts, returnDocument: "after" }); return plain(updated!);
      }
      if (method === "certificate.generate") {
        staff(actor); if (!Array.isArray(p.internIds) || p.internIds.length > 100) throw new DomainError("INVALID_REQUEST", "Choose up to 100 interns."); const generated: any[] = [];
        for (const internId of [...new Set(p.internIds)] as string[]) {
          const intern = await interns.findOne({ _id: internId, status: "Completed" }, opts); if (!intern) throw new DomainError("CONFLICT", "Only completed internships can receive certificates.");
          if (await tasks.findOne({ applicationId: intern.applicationId, required: true, status: { $ne: "Approved" } }, opts)) throw new DomainError("CONFLICT", "Required work must be approved before issuing a certificate.");
          const existing = await certificates.findOne({ internId }, opts); if (existing) { generated.push(plain(existing)); continue; }
          const app = await applications.findOne({ _id: intern.applicationId }, opts); if (!app) throw new DomainError("NOT_FOUND", "Application not found.");
          const certificate: Row = { _id: newId("CERT"), certificateNumber: newId("OLENTRA"), internId, applicationId: intern.applicationId, recipient: app.name, program: app.program, programId: app.programId, issuedOn: day(), status: "Issued" };
          await certificates.insertOne(certificate, opts); generated.push(plain(certificate));
        }
        return generated;
      }
      throw new DomainError("NOT_IMPLEMENTED", "This action is not available.");
      })();
      const rows = Array.isArray(result) ? result : [result];
      const applicationIds = [...new Set(rows.flatMap((row: any) => [row.applicationId, ...(row.team || []), ...(row.affectedApplications || [])]).filter(Boolean))];
      if (actor?.applicationId && !applicationIds.includes(actor.applicationId)) applicationIds.push(actor.applicationId);
      const labels: Record<string, string> = { "offer.send": "Your internship offer is ready", "offer.accept": "Internship offer accepted", "offer.decline": "Internship offer declined", "onboarding.submit": "Onboarding ready for approval", "onboarding.approve": "Your onboarding was approved", "project.create": "You joined a project", "project.update": "Your project was updated", "task.create": "A new task is ready", "task.update": "Your task was updated", "submission.create": "Work ready to review", "submission.review": "Your work was reviewed", "intern.update": "Internship status updated", "certificate.generate": "Your certificate is ready" };
      const label = labels[method];
      if (label && actor) {
        for (const applicationId of applicationIds) await notifications.insertOne({ _id: newId("NTF"), recipientRole: actor.role === "company" ? "intern" : "company", applicationId, title: label, body: label, href: actor.role === "company" ? "/intern/portal" : `/intern/dashboard/applications/${applicationId}`, createdOn: new Date().toISOString() }, { session });
        await activity.insertOne({ _id: newId("ACT"), title: label, detail: label, applicationId: applicationIds.length === 1 ? applicationIds[0] : null, icon: "briefcase", tone: "blue", occurredOn: new Date().toISOString() }, { session });
      }
      await events.insertOne({ _id: newId("EVT"), type: method, applicationIds, createdAt: new Date() }, { session });
      return result;
    });
  }
  async function snapshot(actor: Principal | null) {
    const empty = { interns: [], offers: [], onboarding: [], projects: [], tasks: [], submissions: [], certificates: [] };
    if (!actor) return empty;
    const intern = actor.role === "intern";
    const filter = intern ? { applicationId: actor.applicationId } : {};
    const projectFilter = intern ? { team: actor.applicationId } : {};
    const read = (permission: string) => intern || can(actor, permission);
    const projectDetails = read("projects.read");
    const projectSummary = !projectDetails && can(actor, "projects.summary");
    // Avoid querying data this role cannot receive. For summary-only viewers,
    // MongoDB returns only the public project summary fields.
    const [i, o, on, p, t, s, c] = await Promise.all([
      read("interns.read") ? interns.find(filter).limit(500).toArray() : Promise.resolve([]),
      intern || isAdmin(actor) ? offers.find(filter).limit(500).toArray() : Promise.resolve([]),
      intern || isAdmin(actor) ? onboarding.find(filter).limit(500).toArray() : Promise.resolve([]),
      projectDetails || projectSummary ? projects.find(projectFilter, projectSummary ? { projection: { _id: 1, name: 1, status: 1, progress: 1, dueOn: 1, program: 1 } } : {}).limit(500).toArray() : Promise.resolve([]),
      read("tasks.read") ? tasks.find(filter).limit(1000).toArray() : Promise.resolve([]),
      read("submissions.read") ? submissions.find(filter).sort({ submittedOn: -1 }).limit(1000).toArray() : Promise.resolve([]),
      read("certificates.read") ? certificates.find(filter).limit(500).toArray() : Promise.resolve([]),
    ]);
    const projectRows: any[] = p.map(row => intern ? { ...plain(row), memberCount: (row.team || []).length, team: [actor.applicationId] } : plain(row));
    const projectIdsByApplication = new Map<string, string[]>();
    for (const project of projectRows) for (const applicationId of new Set<string>(project.team || [])) {
      const ids = projectIdsByApplication.get(applicationId) || []; ids.push(project.id); projectIdsByApplication.set(applicationId, ids);
    }
    return { interns: i.map(row => ({ ...plain(row), projectIds: projectIdsByApplication.get(row.applicationId) || [] })), offers: o.map(plain), onboarding: on.map(plain), projects: projectRows, tasks: t.map(plain), submissions: s.map(plain), certificates: c.map(plain) };
  }
  return { initialize, supports: (method: string) => names.has(method), execute, snapshot };
}
