import type { Collection, Document } from "mongodb";
import { mentorScope } from "../access/mentor-scope";
import { DomainError } from "../../shared/errors";
import type { Principal } from "../../shared/principal";
import { can } from "../access/policy";

type Row = Document & { _id: string };
type CollectionOf = (name: string) => Collection<Row>;
const str = (v: unknown) => typeof v === "string" ? v.trim().slice(0, 120) : "";
const escaped = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const number = (v: unknown, fallback: number, max: number) => { const n = Number(v); return Number.isFinite(n) ? Math.max(1, Math.min(max, Math.floor(n))) : fallback; };
const personProjection = { _id: 1, name: 1, email: 1, program: 1, programId: 1, college: 1, schedule: 1, status: 1, initials: 1, avatarColor: 1, appliedOn: 1, accountId: 1 };
const plain = (record: any): any => {
  if (!record || typeof record !== "object") return record;
  if (Array.isArray(record)) return record.map(plain);
  const { _id, issued, outstanding, ...rest } = record;
  return Object.fromEntries(Object.entries({ ...rest, ...(_id !== undefined ? { id: _id } : {}) }).map(([key, value]) => [key, value && typeof value === "object" ? plain(value) : value]));
};

/** Bounded staff queries. All filtering, grouping and pagination happens in MongoDB. */
export function createInternshipQueries(collection: CollectionOf) {
  const names = new Set(["application.workflow", "intern.list", "project.list", "task.list", "submission.list", "certificate.list"]);
  const name = (collectionName: string) => collection(collectionName).collectionName;
  const joinApplication = (localField = "applicationId", as = "application") => [
    { $lookup: { from: name("applications"), localField, foreignField: "_id", pipeline: [{ $project: personProjection }], as } },
    { $unwind: { path: `$${as}`, preserveNullAndEmptyArrays: true } },
  ];
  async function execute(method: string, params: Record<string, any>, actor: Principal | null) {
    if (actor?.role !== "company") throw new DomainError("FORBIDDEN", "Company access is required.");
    if (method === "application.workflow") {
      const applicationId = str(params.applicationId);
      if (!applicationId) throw new DomainError("INVALID_REQUEST", "Choose an application.");
      const application = await collection("applications").findOne({ _id: applicationId }, { projection: { _id: 1 } });
      if (!application) throw new DomainError("NOT_FOUND", "Application not found.");
      const [offer, onboarding, intern] = await Promise.all([
        collection("offers").findOne({ applicationId }), collection("onboarding").findOne({ applicationId }), collection("interns").findOne({ applicationId }),
      ]);
      return { offer: plain(offer), onboarding: plain(onboarding), intern: plain(intern) };
    }
    if (method === "project.list" && !can(actor, "projects.read") && can(actor, "projects.summary")) {
      const page = number(params.page, 1, 100000), pageSize = number(params.pageSize, 20, 100);
      const filter: Document = {};
      const status = str(params.status);
      if (status && status !== "all") filter.status = { $regex: `^${escaped(status)}$`, $options: "i" };
      const program = str(params.programId);
      if (program && program !== "all") {
        const configuredProgram = await collection("programs").findOne({ _id: program }, { projection: { name: 1 } });
        filter.program = configuredProgram?.name || program;
      }
      const searches = [str(params.search), str(params.query)].filter(Boolean);
      if (searches.length) filter.$and = searches.map(search => ({ name: { $regex: escaped(search), $options: "i" } }));
      if (str(params.id)) filter._id = str(params.id);
      const allowedSort = ["name", "status", "program", "dueOn", "createdOn", "progress"];
      const sortField = allowedSort.includes(str(params.sortField)) ? str(params.sortField) : "createdOn", direction = params.sortDirection === "asc" ? 1 : -1;
      const [rows, total, statuses] = await Promise.all([
        collection("projects").find(filter, { projection: { _id: 1, name: 1, status: 1, progress: 1, dueOn: 1, program: 1 } }).sort({ [sortField]: direction, _id: direction }).skip((page - 1) * pageSize).limit(pageSize).toArray(),
        collection("projects").countDocuments(filter),
        collection("projects").aggregate([{ $match: filter }, { $group: { _id: "$status", count: { $sum: 1 } } }]).toArray(),
      ]);
      return { items: rows.map(({ _id, ...row }) => ({ id: _id, ...row })), total, page, pageSize, counts: { statuses: Object.fromEntries(statuses.map((row: any) => [row._id, row.count])), programs: {} }, batches: [] };
    }
    const page = number(params.page, 1, 100000), pageSize = number(params.pageSize, 20, 100), skip = (page - 1) * pageSize;
    const pipeline: Document[] = [], initialFilters: Document[] = [], filters: Document[] = [], statusFilter: Document[] = [];
    // Mentors only see their assigned interns and those interns' work.
    const scope = ["intern.list", "task.list", "submission.list"].includes(method) ? await mentorScope(actor, collection("interns") as any) : null;
    if (scope) initialFilters.push({ applicationId: { $in: scope } });
    let table = "", searchFields: string[] = [], sortFields: Record<string, string> = {}, programField = "programId";
    if (method === "intern.list") {
      table = "interns";
      if (str(params.batch) && params.batch !== "all") initialFilters.push({ batch: str(params.batch) });
      if (params.eligible === true) initialFilters.push({ status: "Completed" });
      if (initialFilters.length) pipeline.push({ $match: { $and: initialFilters } });
      pipeline.push(...joinApplication());
      // Full-time and part-time interns are worked on separately in the dashboard.
      if (params.schedule === "full_time" || params.schedule === "part_time") pipeline.push({ $match: { "application.schedule": params.schedule } });
      pipeline.push({ $lookup: { from: name("projects"), localField: "applicationId", foreignField: "team", pipeline: [{ $project: { _id: 1, name: 1, status: 1, program: 1 } }], as: "projects" } });
      searchFields = ["application.name", "application.email", "application.program", "batch", "status", "projects.name"];
      sortFields = { name: "application.name", email: "application.email", program: "application.program", batch: "batch", project: "projects.name", status: "status", joinedOn: "joinedOn" };
      programField = "application.programId";
      if (params.eligible === true) {
        pipeline.push({ $lookup: { from: name("certificates"), localField: "_id", foreignField: "internId", pipeline: [{ $limit: 1 }, { $project: { _id: 1 } }], as: "issued" } }, { $lookup: { from: name("tasks"), let: { application: "$applicationId" }, pipeline: [{ $match: { required: true, status: { $ne: "Approved" }, $expr: { $eq: ["$applicationId", "$$application"] } } }, { $limit: 1 }, { $project: { _id: 1 } }], as: "outstanding" } });
        filters.push({ "issued.0": { $exists: false }, "outstanding.0": { $exists: false } });
      }
    } else if (method === "project.list") {
      table = "projects";
      if (str(params.availableFor)) initialFilters.push({ team: { $ne: str(params.availableFor) }, "team.99": { $exists: false } });
      if (str(params.applicationId)) initialFilters.push({ team: str(params.applicationId) });
      // One project by id, for the project page.
      if (str(params.id)) initialFilters.push({ _id: str(params.id) });
      if (initialFilters.length) pipeline.push({ $match: { $and: initialFilters } });
      pipeline.push({ $lookup: { from: name("applications"), localField: "team", foreignField: "_id", pipeline: [{ $project: { ...personProjection, github: 1, githubAccount: { login: 1 } } }], as: "members" } }, { $lookup: { from: name("interns"), localField: "team", foreignField: "applicationId", pipeline: [{ $project: { _id: 1, applicationId: 1, status: 1, batch: 1 } }], as: "teamInterns" } });
      searchFields = ["name", "description", "program", "status", "members.name", "members.email"];
      sortFields = { name: "name", status: "status", program: "program", dueOn: "dueOn", createdOn: "createdOn", progress: "progress" };
      programField = "program";
    } else if (method === "task.list") {
      table = "tasks";
      if (str(params.projectId)) initialFilters.push({ projectId: str(params.projectId) });
      if (str(params.applicationId)) initialFilters.push({ applicationId: str(params.applicationId) });
      if (initialFilters.length) pipeline.push({ $match: { $and: initialFilters } });
      pipeline.push(...joinApplication(), { $lookup: { from: name("projects"), localField: "projectId", foreignField: "_id", pipeline: [{ $project: { _id: 1, name: 1, status: 1 } }], as: "project" } }, { $unwind: { path: "$project", preserveNullAndEmptyArrays: true } });
      searchFields = ["title", "description", "application.name", "application.email", "project.name"];
      sortFields = { title: "title", status: "status", dueOn: "dueOn", createdOn: "createdOn", name: "application.name" };
      programField = "application.programId";
    } else if (method === "submission.list") {
      table = "submissions";
      if (str(params.taskId)) initialFilters.push({ taskId: str(params.taskId) });
      if (str(params.applicationId)) initialFilters.push({ applicationId: str(params.applicationId) });
      if (initialFilters.length) pipeline.push({ $match: { $and: initialFilters } });
      pipeline.push(...joinApplication(), { $lookup: { from: name("tasks"), localField: "taskId", foreignField: "_id", pipeline: [{ $project: { _id: 1, title: 1, projectId: 1, status: 1, applicationId: 1 } }], as: "task" } }, { $unwind: { path: "$task", preserveNullAndEmptyArrays: true } });
      searchFields = ["application.name", "application.email", "task.title", "notes", "status"];
      sortFields = { submittedOn: "submittedOn", reviewedOn: "reviewedOn", status: "status", version: "version", name: "application.name" };
      programField = "application.programId";
      if (str(params.projectId)) filters.push({ "task.projectId": str(params.projectId) });
    } else if (method === "certificate.list") {
      table = "certificates";
      pipeline.push(...joinApplication(), { $lookup: { from: name("interns"), localField: "internId", foreignField: "_id", pipeline: [{ $project: { _id: 1, applicationId: 1, status: 1, batch: 1, joinedOn: 1, completedOn: 1 } }], as: "intern" } }, { $unwind: { path: "$intern", preserveNullAndEmptyArrays: true } });
      searchFields = ["recipient", "certificateNumber", "program", "application.email"];
      sortFields = { recipient: "recipient", program: "program", issuedOn: "issuedOn", status: "status", certificateNumber: "certificateNumber" };
    } else throw new DomainError("NOT_IMPLEMENTED", "This query is not available.");
    for (const search of [str(params.search), str(params.query)].filter(Boolean)) filters.push({ $or: searchFields.map(field => ({ [field]: { $regex: escaped(search), $options: "i" } })) });
    const programId = str(params.programId);
    if (programId && programId !== "all") {
      const programValue = method === "project.list"
        ? (await collection("programs").findOne({ _id: programId }, { projection: { name: 1 } }))?.name || programId
        : programId;
      filters.push({ [programField]: programValue });
    }
    const status = str(params.status);
    if (status && status !== "all") statusFilter.push({ status: { $regex: `^${escaped(status)}$`, $options: "i" } });
    if (filters.length) pipeline.push({ $match: { $and: filters } });
    const selected = statusFilter.length ? [{ $match: { $and: statusFilter } }] : [];
    const sortField = sortFields[str(params.sortField)] || (method === "intern.list" ? "application.name" : method === "project.list" ? "createdOn" : method === "task.list" ? "dueOn" : method === "submission.list" ? "submittedOn" : "issuedOn");
    const direction = params.sortDirection === "asc" ? 1 : -1;
    pipeline.push({ $facet: {
      items: [...selected, { $sort: { [sortField]: direction, _id: direction } }, { $skip: skip }, { $limit: pageSize }],
      total: [...selected, { $count: "count" }],
      statuses: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
      programs: [{ $group: { _id: `$${programField}`, count: { $sum: 1 } } }],
      ...(method === "intern.list" ? { batches: [{ $group: { _id: "$batch" } }, { $sort: { _id: 1 } }], schedules: [{ $group: { _id: "$application.schedule", count: { $sum: 1 } } }] } : {}),
    } });
    const [result] = await collection(table).aggregate(pipeline, { allowDiskUse: true }).toArray();
    const items = (result?.items || []).map(plain).map((row: any) => {
      if (method === "intern.list" && !can(actor, "projects.read")) delete row.projects;
      if (method === "certificate.list" && !can(actor, "interns.read")) { delete row.application; delete row.intern; }
      return row;
    });
    return { items, total: result?.total?.[0]?.count || 0, page, pageSize, counts: { statuses: Object.fromEntries((result?.statuses || []).filter((row: any) => row._id != null).map((row: any) => [row._id, row.count])), programs: Object.fromEntries((result?.programs || []).filter((row: any) => row._id != null).map((row: any) => [row._id, row.count])), ...(result?.schedules ? { schedules: Object.fromEntries(result.schedules.filter((row: any) => row._id).map((row: any) => [row._id, row.count])) } : {}) }, batches: (result?.batches || []).map((row: any) => row._id).filter(Boolean) };
  }
  return { supports: (method: string) => names.has(method), execute };
}
