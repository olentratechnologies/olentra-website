import type { Outbox } from "../outbox/outbox";
import { randomUUID } from "node:crypto";
import type { ClientSession, Collection, Document } from "mongodb";
import { DomainError } from "../../shared/errors";
import type { Principal } from "../../shared/principal";
import { can, isAdmin } from "../access/policy";

type Row = Document & { _id: string };
type Tx = <T>(key: string, actor: Principal | null, input: unknown, fn: (session: ClientSession) => Promise<T>) => Promise<T>;
const text = (v: unknown) => typeof v === "string" ? v.trim() : "";
const newId = (p: string) => `${p}-${randomUUID()}`;
import { auditDecision } from "../audit/decision-audit";
import { mentorScope } from "../access/mentor-scope";
import { missingDocuments, type ChecklistItem } from "../onboarding/documents";
/** The moment an offer stops accepting answers: `days` after `fromIso`. */
export const offerDeadline = (fromIso: string, days: number) => new Date(new Date(fromIso).getTime() + days * 86_400_000).toISOString();
/** Offers without a deadline (sent before expiry existed) never expire. */
export const isOfferExpired = (offer: Record<string, unknown>, nowIso: string) => typeof offer.expiresOn === "string" && offer.expiresOn < nowIso;
const plain = (row: Row) => { const { _id, ...data } = row; return { ...data, id: _id }; };
const required = (value: unknown, label: string, max = 500) => { const v = text(value); if (!v || v.length > max) throw new DomainError("INVALID_REQUEST", `Enter a valid ${label}.`); return v; };
const own = (actor: Principal | null, app: string) => { if (actor?.role !== "intern" || actor.applicationId !== app) throw new DomainError("FORBIDDEN", "This record belongs to another account."); };
const staff = (actor: Principal | null) => { if (actor?.role !== "company") throw new DomainError("FORBIDDEN", "Company access is required."); };
const day = () => new Date().toISOString().slice(0, 10);
const validDate = (v: unknown) => { const value = text(v), parsed = new Date(value); return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value; };
const validUrl = (value: unknown) => { const v = text(value); if (v) { try { if (!["https:", "http:"].includes(new URL(v).protocol)) throw 0; } catch { throw new DomainError("INVALID_REQUEST", "Use an http or https link."); } } return v; };

export function createLifecycle({ collection, transact, outbox }: { collection: (name: string) => Collection<Row>; transact: Tx; outbox: Pick<Outbox, "enqueue" | "enqueueMany"> }) {
  const applications = collection("applications"), accounts = collection("accounts"), programs = collection("programs"), settings = collection("settings"), files = collection("files");
  const audit = collection("staff_audit");
  const events = collection("events"), notifications = collection("notifications"), activity = collection("activity"), offers = collection("offers"), onboarding = collection("onboarding"), interns = collection("interns"), projects = collection("projects"), tasks = collection("tasks"), submissions = collection("submissions"), certificates = collection("certificates"), interviews = collection("interviews");
  const names = new Set(["intern.assignMentor", "onboarding.document", "onboarding.reviewDocument", "offer.extend", "application.withdraw", "interview.cancel", "offer.send", "offer.accept", "offer.decline", "onboarding.save", "onboarding.submit", "onboarding.approve", "profile.update", "project.create", "project.update", "task.create", "task.update", "task.start", "submission.create", "submission.review", "intern.update", "certificate.generate", "interview.schedule"]);
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
      // Public certificate checks look a certificate up by its number.
      // Partial, so older rows without a number are skipped. Queries must say `$type: "string"` for MongoDB to use it.
      certificates.createIndex({ certificateNumber: 1 }, { unique: true, partialFilterExpression: { certificateNumber: { $type: "string" } } }),
      interviews.createIndex({ applicationId: 1 }, { unique: true }),
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
    // One read and one write for the whole team, instead of two per member.
    const activeCount = await interns.countDocuments({ applicationId: { $in: ids }, status: "Active" }, { session });
    if (activeCount !== ids.length) throw new DomainError("CONFLICT", "An active internship is required.");
    if (ids.length) await interns.updateMany({ applicationId: { $in: ids }, status: "Active" }, { $inc: { revision: 1 } }, { session });
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
        // Offers expire after a few days (default 7) unless an admin extends them.
        const expiresInDays = p.expiresInDays === undefined ? 7 : Number(p.expiresInDays);
        if (!Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 30) throw new DomainError("INVALID_REQUEST", "Offers can stay open for 1 to 30 days.");
        const offer: Row = { _id: old?._id || newId("OFFER"), applicationId, status: "Sent", startOn: p.startOn, endOn: p.endOn, stipend, message: text(p.message).slice(0, 2000), sentOn: now, expiresOn: offerDeadline(now, expiresInDays) };
        await offers.replaceOne({ applicationId }, offer, { ...opts, upsert: true }); await applications.updateOne({ _id: applicationId, status: "Selected" }, { $inc: { version: 1 }, $push: { history: { id: newId("HST"), title: "Offer sent", detail: "Your offer is ready for review.", date: now } } as any }, opts); return plain(offer);
      }
      if (method === "offer.extend") {
        staff(actor); const applicationId = required(p.applicationId, "application");
        const days = Number(p.days ?? 7);
        if (!Number.isInteger(days) || days < 1 || days > 30) throw new DomainError("INVALID_REQUEST", "Extend by 1 to 30 days.");
        const offer = await offers.findOneAndUpdate({ applicationId, status: "Sent" }, { $set: { expiresOn: offerDeadline(now, days), extendedOn: now } }, { ...opts, returnDocument: "after" });
        if (!offer) throw new DomainError("CONFLICT", "Only an open offer can be extended.");
        await applications.updateOne({ _id: applicationId }, { $push: { history: { id: newId("HST"), title: "Offer extended", detail: `You now have until ${offer.expiresOn.slice(0, 10)} to decide.`, date: now } } as any }, opts);
        return plain(offer);
      }
      if (method === "application.withdraw") {
        // Applicants can step back at any point before they join. An open
        // offer is closed with it; staff are notified through the label below.
        const applicationId = required(p.applicationId, "application"); own(actor, applicationId);
        const withdrawable = ["Applied", "Under Review", "Shortlisted", "Selected"];
        const reason = text(p.reason).slice(0, 1000);
        const updated = await applications.findOneAndUpdate(
          { _id: applicationId, status: { $in: withdrawable } },
          { $set: { status: "Withdrawn", withdrawnOn: now, statusChangedOn: now, ...(reason ? { withdrawalReason: reason } : {}) }, $inc: { version: 1 }, $push: { history: { id: newId("HST"), title: "Application withdrawn", detail: "You withdrew your application.", date: now } } as any },
          { ...opts, returnDocument: "after" },
        );
        if (!updated) throw new DomainError("CONFLICT", "This application can no longer be withdrawn.");
        await offers.updateOne({ applicationId, status: "Sent" }, { $set: { status: "Withdrawn", decidedOn: now } }, opts);
        return { id: applicationId, applicationId, status: "Withdrawn" };
      }
      if (method === "offer.accept" || method === "offer.decline") {
        const applicationId = required(p.applicationId, "application"); own(actor, applicationId);
        const app = await applications.findOne({ _id: applicationId, status: "Selected" }, opts); if (!app) throw new DomainError("CONFLICT", "This offer is no longer awaiting a decision.");
        if (method === "offer.accept") {
          const pending = await offers.findOne({ applicationId, status: "Sent" }, opts);
          if (pending && isOfferExpired(pending, now)) throw new DomainError("OFFER_EXPIRED", "This offer has expired. Contact the Olentra team if you'd still like to join.");
        }
        const offer = await offers.findOneAndUpdate({ applicationId, status: "Sent" }, { $set: { status: method === "offer.accept" ? "Accepted" : "Declined", decidedOn: now, reason: text(p.reason).slice(0, 2000) } }, { ...opts, returnDocument: "after" });
        if (!offer) throw new DomainError("CONFLICT", "This offer is no longer awaiting a decision.");
        await applications.updateOne({ _id: applicationId, status: "Selected" }, { ...(method === "offer.decline" ? { $set: { status: "Declined", statusChangedOn: now } } : {}), $inc: { version: 1 }, $push: { history: { id: newId("HST"), title: method === "offer.accept" ? "Offer accepted" : "Offer declined", detail: method === "offer.accept" ? "Onboarding is now available." : "Offer declined.", date: now } } as any }, opts);
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
        if (old?.documents) data.documents = old.documents; // uploaded checklist documents are managed separately
        await onboarding.replaceOne({ applicationId }, data, { ...opts, upsert: true });
        await applications.updateOne({ _id: applicationId }, { $set: { phone: data.phone, college: data.college, location: data.location, skills: data.skills, resumeAttachmentId: data.resumeAttachmentId }, $inc: { version: 1 }, ...(method === "onboarding.submit" ? { $push: { history: { id: newId("HST"), title: "Onboarding submitted", detail: "The company team will review your onboarding details.", date: now } } as any } : {}) }, opts);
        return plain(data);
      }
      if (method === "intern.assignMentor") {
        // Admin only: link (or unlink, with null) a mentor to an intern.
        staff(actor); const internId = required(p.internId, "intern");
        const mentorId = p.mentorId === null || p.mentorId === "" ? null : required(p.mentorId, "mentor");
        let mentor: Row | null = null;
        if (mentorId) {
          mentor = await accounts.findOne({ _id: mentorId, role: "company", staffRole: "mentor", disabled: { $ne: true } }, { ...opts, projection: { name: 1 } });
          if (!mentor) throw new DomainError("INVALID_REQUEST", "Choose an active staff member with the Mentor role.");
        }
        const updated = await interns.findOneAndUpdate({ _id: internId }, mentor ? { $set: { mentorId, mentorName: String(mentor.name || "") }, $inc: { revision: 1 } } : { $unset: { mentorId: "", mentorName: "" }, $inc: { revision: 1 } }, { ...opts, returnDocument: "after" });
        if (!updated) throw new DomainError("NOT_FOUND", "Intern not found.");
        return plain(updated);
      }
      if (method === "onboarding.document") {
        // An intern uploads one checklist document (again after changes are requested).
        const applicationId = required(p.applicationId, "application"); own(actor, applicationId);
        const docId = required(p.docId, "document", 40), attachmentId = required(p.attachmentId, "file", 120);
        if (!(await offers.findOne({ applicationId, status: "Accepted" }, opts))) throw new DomainError("CONFLICT", "Accept your offer before uploading onboarding documents.");
        const checklist = ((await settings.findOne({ _id: "program" }, opts))?.onboardingDocuments || []) as ChecklistItem[];
        const item = checklist.find(entry => entry.id === docId); if (!item) throw new DomainError("NOT_FOUND", "That document isn't on the checklist.");
        const file = await files.findOne({ _id: attachmentId, status: "ready", ownerApplicationId: applicationId }, opts); if (!file) throw new DomainError("FORBIDDEN", "Upload the file from this account first.");
        const existing = await onboarding.findOne({ applicationId }, opts);
        if (existing?.status === "Approved") throw new DomainError("CONFLICT", "Onboarding is already approved.");
        if (existing?.documents?.[docId]?.status === "Approved") throw new DomainError("CONFLICT", "This document is already approved.");
        const entry = { attachmentId, name: String(file.name || item.label), status: "Submitted", uploadedOn: now };
        const row = await onboarding.findOneAndUpdate({ applicationId }, { $set: { [`documents.${docId}`]: entry }, $setOnInsert: { _id: newId("ONB"), applicationId, status: "Draft", acknowledged: false } }, { ...opts, upsert: true, returnDocument: "after" });
        return plain(row!);
      }
      if (method === "onboarding.reviewDocument") {
        staff(actor); const applicationId = required(p.applicationId, "application"), docId = required(p.docId, "document", 40);
        const decision = p.decision === "Approved" ? "Approved" : p.decision === "Changes requested" ? "Changes requested" : "";
        if (!decision) throw new DomainError("INVALID_REQUEST", "Approve the document or request changes.");
        const note = text(p.note).slice(0, 500);
        if (decision === "Changes requested" && !note) throw new DomainError("INVALID_REQUEST", "Say what needs to change.");
        const row = await onboarding.findOneAndUpdate({ applicationId, [`documents.${docId}`]: { $exists: true }, status: { $ne: "Approved" } }, { $set: { [`documents.${docId}.status`]: decision, [`documents.${docId}.note`]: note, [`documents.${docId}.reviewedOn`]: now } }, { ...opts, returnDocument: "after" });
        if (!row) throw new DomainError("CONFLICT", "That document hasn't been uploaded, or onboarding is already approved.");
        return plain(row);
      }
      if (method === "onboarding.approve") {
        staff(actor); const applicationId = required(p.applicationId, "application");
        const app = await applications.findOne({ _id: applicationId, status: "Selected" }, opts); const offer = await offers.findOne({ applicationId, status: "Accepted" }, opts);
        if (!app || !offer) throw new DomainError("CONFLICT", "Only selected applicants with an accepted offer can be onboarded.");
        const checklist = ((await settings.findOne({ _id: "program" }, { ...opts, projection: { onboardingDocuments: 1 } }))?.onboardingDocuments || []) as ChecklistItem[];
        const pendingRow = await onboarding.findOne({ applicationId }, opts);
        const missing = missingDocuments(checklist, pendingRow?.documents);
        if (missing.length) throw new DomainError("CONFLICT", `Approve these documents first: ${missing.map(item => item.label).join(", ")}.`);
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
        const reviewScope = await mentorScope(actor, interns);
        if (reviewScope && !reviewScope.includes(String(submission.applicationId))) throw new DomainError("FORBIDDEN", "You can only review work from interns you mentor.");
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
        staff(actor); if (!Array.isArray(p.internIds) || p.internIds.length > 100 || p.internIds.some((v: unknown) => typeof v !== "string")) throw new DomainError("INVALID_REQUEST", "Choose up to 100 interns.");
        // A fixed number of queries for the whole batch, whatever its size.
        const internIds = [...new Set(p.internIds)] as string[];
        const completed = new Map((await interns.find({ _id: { $in: internIds }, status: "Completed" }, opts).toArray()).map(row => [row._id, row]));
        if (completed.size !== internIds.length) throw new DomainError("CONFLICT", "Only completed internships can receive certificates.");
        const applicationIds = [...completed.values()].map(row => row.applicationId);
        if (await tasks.findOne({ applicationId: { $in: applicationIds }, required: true, status: { $ne: "Approved" } }, opts)) throw new DomainError("CONFLICT", "Required work must be approved before issuing a certificate.");
        const [existingRows, appRows] = await Promise.all([
          certificates.find({ internId: { $in: internIds } }, opts).toArray(),
          applications.find({ _id: { $in: applicationIds } }, opts).toArray(),
        ]);
        const existing = new Map(existingRows.map(row => [row.internId, row])), apps = new Map(appRows.map(row => [row._id, row]));
        const created: Row[] = [];
        const generated = internIds.map(internId => {
          const prior = existing.get(internId); if (prior) return plain(prior);
          const intern = completed.get(internId)!, app = apps.get(intern.applicationId); if (!app) throw new DomainError("NOT_FOUND", "Application not found.");
          const certificate: Row = { _id: newId("CERT"), certificateNumber: newId("OLENTRA"), internId, applicationId: intern.applicationId, recipient: app.name, program: app.program, programId: app.programId, issuedOn: day(), status: "Issued" };
          created.push(certificate); return plain(certificate);
        });
        if (created.length) await certificates.insertMany(created, opts);
        await outbox.enqueueMany(created.map(certificate => ({ type: "applicantStatus" as const, payload: { applicationId: String(certificate.applicationId), status: "certificate", certificateNumber: String(certificate.certificateNumber) } })), session);
        for (const certificate of created) await auditDecision(audit, session, actor, "certificate.issued", String(certificate.applicationId), { certificateNumber: certificate.certificateNumber });
        return generated;
      }
      if (method === "interview.schedule") {
        staff(actor);
        const applicationId = required(p.applicationId, "application");
        const application = await applications.findOne({ _id: applicationId }, opts);
        if (!application) throw new DomainError("NOT_FOUND", "Application not found.");
        if (application.status !== "Shortlisted") throw new DomainError("CONFLICT", "Only shortlisted applicants can be scheduled for an interview.");
        const scheduledAt = required(p.scheduledAt, "interview date and time", 40);
        const date = new Date(scheduledAt);
        if (Number.isNaN(date.getTime()) || date.toISOString() !== scheduledAt || date.getTime() <= Date.now()) throw new DomainError("INVALID_REQUEST", "Choose a future interview date and time.");
        const meetingUrl = required(validUrl(p.meetingUrl), "meeting link", 2000);
        const previous = await interviews.findOne({ applicationId }, opts);
        const interview = await interviews.findOneAndUpdate(
          { applicationId },
          {
            // The sequence goes up on every change so calendar invites update in place.
            $set: { scheduledAt, meetingUrl, updatedOn: now, status: "Scheduled" },
            $unset: { cancelledOn: "", cancelReason: "", reminderSentOn: "" },
            $inc: { sequence: 1 },
            $setOnInsert: { _id: newId("INTV"), applicationId, createdOn: now },
          },
          { ...opts, upsert: true, returnDocument: "after" },
        );
        if (!interview) throw new DomainError("CONFLICT", "The interview could not be saved.");
        await applications.updateOne(
          { _id: applicationId },
          { $push: { history: { id: newId("HST"), title: previous ? "Interview rescheduled" : "Interview scheduled", detail: `Interview scheduled for ${scheduledAt}.`, date: now } } as any },
          opts,
        );
        return plain(interview);
      }
      if (method === "interview.cancel") {
        staff(actor);
        const applicationId = required(p.applicationId, "application");
        const reason = text(p.reason).slice(0, 500);
        const interview = await interviews.findOneAndUpdate(
          { applicationId, status: { $ne: "Cancelled" } },
          { $set: { status: "Cancelled", cancelledOn: now, updatedOn: now, ...(reason ? { cancelReason: reason } : {}) }, $inc: { sequence: 1 } },
          { ...opts, returnDocument: "after" },
        );
        if (!interview) throw new DomainError("CONFLICT", "There's no scheduled interview to cancel.");
        await applications.updateOne({ _id: applicationId }, { $push: { history: { id: newId("HST"), title: "Interview cancelled", detail: reason ? `Interview cancelled: ${reason}` : "Interview cancelled.", date: now } } as any }, opts);
        return plain(interview);
      }
      throw new DomainError("NOT_IMPLEMENTED", "This action is not available.");
      })();
      if (method === "offer.send" || method === "offer.accept" || method === "onboarding.approve") {
        await outbox.enqueue("applicantStatus", { applicationId: String((result as any).applicationId), status: method === "offer.send" ? "offer" : method === "offer.accept" ? "offer-accepted" : "onboarding" }, session);
      }
      if (method === "interview.schedule" || method === "interview.cancel") {
        const interview = result as Record<string, any>;
        await outbox.enqueue("interview", { applicationId: String(interview.applicationId), interviewId: String(interview.id), scheduledAt: String(interview.scheduledAt), meetingUrl: String(interview.meetingUrl), sequence: String(interview.sequence || 0), status: String(interview.status), cancelReason: String(interview.cancelReason || "") }, session);
      }
      // Decisions are audited in the same transaction as the change itself.
      if (method === "offer.send" && result && !Array.isArray(result)) await auditDecision(audit, session, actor, "offer.sent", String((result as any).applicationId), { startOn: (result as any).startOn, endOn: (result as any).endOn, stipend: (result as any).stipend });
      if (method === "onboarding.approve" && result && !Array.isArray(result)) await auditDecision(audit, session, actor, "onboarding.approved", String((result as any).applicationId));
      const rows = Array.isArray(result) ? result : [result];
      const applicationIds = [...new Set(rows.flatMap((row: any) => [row.applicationId, ...(row.team || []), ...(row.affectedApplications || [])]).filter(Boolean))];
      if (actor?.applicationId && !applicationIds.includes(actor.applicationId)) applicationIds.push(actor.applicationId);
      const labels: Record<string, string> = { "offer.send": "Your internship offer is ready", "application.withdraw": "Application withdrawn", "interview.cancel": "Interview cancelled", "offer.extend": "Your offer deadline was extended", "onboarding.document": "Onboarding document uploaded", "intern.assignMentor": "Your mentor was updated", "onboarding.reviewDocument": "Onboarding document reviewed", "offer.accept": "Internship offer accepted", "offer.decline": "Internship offer declined", "onboarding.submit": "Onboarding ready for approval", "onboarding.approve": "Your onboarding was approved", "project.create": "You joined a project", "project.update": "Your project was updated", "task.create": "A new task is ready", "task.update": "Your task was updated", "submission.create": "Work ready to review", "submission.review": "Your work was reviewed", "intern.update": "Internship status updated", "certificate.generate": "Your certificate is ready", "interview.schedule": "Interview scheduled" };
      const interviewScheduledAt = method === "interview.schedule" && !Array.isArray(result) && "scheduledAt" in result ? text(result.scheduledAt) : "";
      const label = labels[method];
      if (label && actor) {
        if (applicationIds.length) await notifications.insertMany(applicationIds.map((applicationId: string) => ({ _id: newId("NTF"), recipientRole: actor.role === "company" ? "intern" : "company", applicationId, title: label, body: method === "interview.schedule" ? `Your interview is scheduled for ${interviewScheduledAt}. Open your portal for meeting details.` : label, href: actor.role === "company" ? "/intern/portal" : `/intern/dashboard/applications/${applicationId}`, createdOn: new Date().toISOString() })), { session });
        const activityApplications = applicationIds.length
          ? await applications.find({ _id: { $in: applicationIds } }, { session }).project({ name: 1, program: 1 }).toArray()
          : [];
        const activityDetails = activityApplications.map((application) => {
          const name = text(application.name) || "An applicant";
          const program = text(application.program) || "the internship program";
          if (method === "offer.accept") return `${name} accepted the ${program} offer.`;
          if (method === "offer.decline") return `${name} declined the ${program} offer.`;
          if (method === "application.withdraw") return `${name} withdrew from ${program}.`;
          return `${name} · ${program}`;
        });
        const detail = activityDetails.length === 1
          ? activityDetails[0]
          : activityDetails.length > 1
            ? `${activityDetails.length} applicants · ${activityDetails.slice(0, 3).join("; ")}`
            : `${label} activity recorded.`;
        await activity.insertOne({ _id: newId("ACT"), title: label, detail, applicationId: applicationIds.length === 1 ? applicationIds[0] : null, icon: "briefcase", tone: "blue", occurredOn: new Date().toISOString() }, { session });
      }
      await events.insertOne({ _id: newId("EVT"), type: method, applicationIds, createdAt: new Date() }, { session });
      return result;
    });
  }
  async function snapshot(actor: Principal | null) {
    const empty = { interns: [], offers: [], onboarding: [], projects: [], tasks: [], submissions: [], certificates: [], interviews: [] };
    if (!actor) return empty;
    const intern = actor.role === "intern";
    const scope = intern ? null : await mentorScope(actor, interns);
    const filter: Record<string, unknown> = intern ? { applicationId: actor.applicationId } : scope ? { applicationId: { $in: scope } } : {};
    const projectFilter = intern ? { team: actor.applicationId } : {};
    const read = (permission: string) => intern || can(actor, permission);
    const projectDetails = read("projects.read");
    const projectSummary = !projectDetails && can(actor, "projects.summary");
    // Avoid querying data this role cannot receive. For summary-only viewers,
    // MongoDB returns only the public project summary fields.
    const [i0, o0, on0, p0, t0, s0, c0, iv0] = await Promise.all([
      read("interns.read") ? interns.find(filter).limit(501).toArray() : Promise.resolve([]),
      intern || isAdmin(actor) ? offers.find(filter).limit(501).toArray() : Promise.resolve([]),
      intern || isAdmin(actor) ? onboarding.find(filter).limit(501).toArray() : Promise.resolve([]),
      projectDetails || projectSummary ? projects.find(projectFilter, projectSummary ? { projection: { _id: 1, name: 1, status: 1, progress: 1, dueOn: 1, program: 1 } } : {}).limit(501).toArray() : Promise.resolve([]),
      read("tasks.read") ? tasks.find(filter).limit(1001).toArray() : Promise.resolve([]),
      read("submissions.read") ? submissions.find(filter).sort({ submittedOn: -1 }).limit(1001).toArray() : Promise.resolve([]),
      read("certificates.read") ? certificates.find(filter).limit(501).toArray() : Promise.resolve([]),
      intern || can(actor, "applications.read") ? interviews.find(filter).sort({ scheduledAt: 1 }).limit(1001).toArray() : Promise.resolve([]),
    ]);
    // Each list is read one row past its cap, so a full list can say it was cut off.
    const truncated: Record<string, boolean> = {};
    const cap = <T,>(name: string, rows: T[], max: number) => { if (rows.length > max) { truncated[name] = true; return rows.slice(0, max); } return rows; };
    const i = cap("interns", i0, 500), o = cap("offers", o0, 500), on = cap("onboarding", on0, 500), p = cap("projects", p0, 500);
    const t = cap("tasks", t0, 1000), s = cap("submissions", s0, 1000), c = cap("certificates", c0, 500), iv = cap("interviews", iv0, 1000);
    const projectRows: any[] = p.map(row => intern ? { ...plain(row), memberCount: (row.team || []).length, team: [actor.applicationId] } : plain(row));
    const projectIdsByApplication = new Map<string, string[]>();
    for (const project of projectRows) for (const applicationId of new Set<string>(project.team || [])) {
      const ids = projectIdsByApplication.get(applicationId) || []; ids.push(project.id); projectIdsByApplication.set(applicationId, ids);
    }
    return { interns: i.map(row => ({ ...plain(row), projectIds: projectIdsByApplication.get(row.applicationId) || [] })), offers: o.map(plain), onboarding: on.map(plain), projects: projectRows, tasks: t.map(plain), submissions: s.map(plain), certificates: c.map(plain), interviews: iv.map(plain), truncated };
  }
  return { initialize, supports: (method: string) => names.has(method), execute, snapshot };
}
