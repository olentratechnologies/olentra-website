import type { ClientSession, Collection } from "mongodb";
import { DomainError } from "../../shared/errors";
import { id } from "../../shared/ids";
import type { Principal } from "../../shared/principal";
import type { InternshipRow } from "../../infrastructure/database/collections";
import { can } from "../access/policy";
import { mentorScope } from "../access/mentor-scope";
import { auditDecision } from "../audit/decision-audit";
import { linksWithout } from "../lifecycle/link-audience";
import { TEAM_READ_METHODS, TEAM_WRITE_METHODS } from "./team-methods";
import { LEFTOVERS, MIXES, TEAM_SIZE_MAX, TEAM_SIZE_MIN, planTeams, type Leftover, type Mix } from "./team-planner";

type Row = InternshipRow;
type Transact = <T>(key: string, actor: Principal | null, input: unknown, fn: (session: ClientSession) => Promise<T>) => Promise<T>;

const READ = TEAM_READ_METHODS, WRITE = TEAM_WRITE_METHODS;
export const TEAM_METHODS = new Set([...READ, ...WRITE]);

/** Whether a staff member may use a team command. Roles from before teams existed keep working through their project permissions. */
export function canUseTeams(actor: Principal | null, write: boolean) {
  if (actor?.role !== "company") return false;
  return write ? can(actor, "teams.manage") || can(actor, "projects.manage") : can(actor, "teams.read") || can(actor, "projects.read");
}

const PROJECT_TEAM_MAX = 100;
const MAX_TEAMS_PER_REQUEST = 200;
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const validId = (value: unknown) => typeof value === "string" && /^[\w-]{1,80}$/.test(value);
const escaped = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").slice(0, 120);
const nameKey = (value: string) => value.toLowerCase().replace(/\s+/g, " ");

function teamName(value: unknown) {
  const name = text(value).replace(/\s+/g, " ");
  if (!name || name.length > 80) throw new DomainError("INVALID_REQUEST", "Give the team a name of up to 80 characters.");
  return name;
}
function memberList(value: unknown, max = TEAM_SIZE_MAX) {
  if (!Array.isArray(value) || value.some(item => !validId(item))) throw new DomainError("INVALID_REQUEST", "Choose valid interns.");
  const members = [...new Set(value as string[])];
  if (members.length > max) throw new DomainError("INVALID_REQUEST", `A team can have at most ${max} members.`);
  return members;
}

export function createTeams({ collection, transact }: { collection: (name: string) => Collection<Row>; transact: Transact }) {
  const teams = collection("teams"), memberships = collection("team_memberships"), interns = collection("interns");
  const applications = collection("applications"), projects = collection("projects"), tasks = collection("tasks");
  const settings = collection("settings"), events = collection("events"), audit = collection("staff_audit");
  const notifications = collection("notifications"), accounts = collection("accounts");

  async function initialize() {
    await Promise.all([
      teams.createIndex({ status: 1, batch: 1, createdOn: -1 }),
      teams.createIndex({ members: 1 }),
      teams.createIndex({ projectIds: 1 }),
      memberships.createIndex({ teamId: 1 }),
    ]);
  }

  async function readSettings(session?: ClientSession) {
    const row = await settings.findOne({ _id: "teams" }, session ? { session } : {});
    const size = Number(row?.size);
    return {
      size: Number.isInteger(size) && size >= TEAM_SIZE_MIN && size <= TEAM_SIZE_MAX ? size : 5,
      leftover: (LEFTOVERS as string[]).includes(row?.leftover) ? row!.leftover as Leftover : "smaller" as Leftover,
    };
  }

  async function people(ids: string[], session?: ClientSession, staff = true) {
    if (!ids.length) return new Map<string, any>();
    const rows = await applications.find({ _id: { $in: ids } }, { ...(session ? { session } : {}), projection: { name: 1, email: 1, college: 1, program: 1, programId: 1, initials: 1, avatarColor: 1, githubAccount: 1 } }).toArray();
    return new Map(rows.map(row => [row._id, {
      id: row._id, name: String(row.name || "Intern"), initials: row.initials, avatarColor: row.avatarColor,
      githubLogin: row.githubAccount?.login || null,
      ...(staff ? { email: row.email, college: row.college || "", program: row.program || "" } : {}),
    }]));
  }

  async function requireActive(ids: string[], session: ClientSession) {
    if (!ids.length) return;
    const rows = await interns.find({ applicationId: { $in: ids }, status: "Active" }, { session, projection: { applicationId: 1 } }).toArray();
    if (rows.length === ids.length) return;
    const active = new Set(rows.map(row => row.applicationId));
    const names = await people(ids.filter(id => !active.has(id)), session);
    throw new DomainError("CONFLICT", `Only active interns can join a team: ${[...names.values()].map(person => person.name).slice(0, 5).join(", ") || "some of the chosen people aren't active"}.`);
  }

  /** One active team per intern, enforced by a unique key per intern so concurrent requests can't both succeed. */
  async function claim(ids: string[], teamId: string, session: ClientSession) {
    if (!ids.length) return;
    const taken = await memberships.find({ _id: { $in: ids }, teamId: { $ne: teamId } }, { session }).toArray();
    if (taken.length) {
      const [names, owners] = await Promise.all([people(taken.map(row => row._id), session), teams.find({ _id: { $in: taken.map(row => row.teamId) } }, { session, projection: { name: 1 } }).toArray()]);
      const teamNames = new Map(owners.map(row => [row._id, row.name]));
      throw new DomainError("CONFLICT", `Already in another team: ${taken.slice(0, 5).map(row => `${names.get(row._id)?.name || "Intern"} (${teamNames.get(row.teamId) || "a team"})`).join(", ")}.`);
    }
    try {
      await memberships.insertMany(ids.map(applicationId => ({ _id: applicationId, teamId, since: new Date() })), { session });
    } catch (error: any) {
      if (error?.code === 11000) throw new DomainError("CONFLICT", "Someone just added one of these interns to another team. Reload and try again.");
      throw error;
    }
  }
  const release = (ids: string[], teamId: string, session: ClientSession) => ids.length ? memberships.deleteMany({ _id: { $in: ids }, teamId }, { session }) : Promise.resolve();

  /** Adds team members to the team's projects, recording that the team put them there. */
  async function addToProjects(teamId: string, projectIds: string[], members: string[], session: ClientSession) {
    for (const projectId of projectIds) {
      const project = await projects.findOne({ _id: projectId }, { session, projection: { team: 1, name: 1 } });
      if (!project) continue;
      const current = new Set<string>(project.team || []);
      const added = members.filter(member => !current.has(member));
      if (!added.length) continue;
      if (current.size + added.length > PROJECT_TEAM_MAX) throw new DomainError("CONFLICT", `${project.name} can have at most ${PROJECT_TEAM_MAX} members.`);
      await projects.updateOne({ _id: projectId }, { $addToSet: { team: { $each: added } }, $set: Object.fromEntries(added.map(member => [`teamSources.${member}`, teamId])) } as any, { session });
    }
    if (members.length) await interns.updateMany({ applicationId: { $in: members }, status: "Active" }, { $inc: { revision: 1 } }, { session });
  }

  /**
   * Takes members off the team's projects, but only where the team added them; people added to a
   * project directly stay. Unfinished work blocks it, as it does when editing a project team.
   */
  async function removeFromProjects(teamId: string, projectIds: string[], members: string[], session: ClientSession) {
    const plans: { project: Row; removed: string[] }[] = [];
    for (const projectId of projectIds) {
      const project = await projects.findOne({ _id: projectId }, { session, projection: { team: 1, name: 1, links: 1, teamSources: 1 } });
      if (!project) continue;
      const removed = members.filter(member => project.teamSources?.[member] === teamId && (project.team || []).includes(member));
      if (!removed.length) continue;
      const open = await tasks.find({ projectId, applicationId: { $in: removed }, status: { $ne: "Approved" } }, { session, projection: { title: 1, applicationId: 1 } }).limit(5).toArray();
      if (open.length) {
        const names = await people([...new Set(open.map(task => String(task.applicationId)))], session);
        throw new DomainError("CONFLICT", `Unfinished tasks on ${project.name} keep ${[...names.values()].map(person => person.name).join(", ")} on the project: ${open.map(task => `“${task.title}”`).join(", ")}. Approve or delete them first.`);
      }
      plans.push({ project, removed });
    }
    for (const { project, removed } of plans) {
      const set: Record<string, unknown> = {};
      if (Array.isArray(project.links)) set.links = linksWithout(project.links, removed);
      await projects.updateOne({ _id: project._id }, {
        $pull: { team: { $in: removed } },
        ...(Object.keys(set).length ? { $set: set } : {}),
        $unset: Object.fromEntries(removed.map(member => [`teamSources.${member}`, ""])),
      } as any, { session });
    }
    if (members.length) await interns.updateMany({ applicationId: { $in: members }, status: "Active" }, { $inc: { revision: 1 } }, { session });
  }

  async function uniqueName(name: string, batch: string, exceptId: string | null, session: ClientSession) {
    const others = await teams.find({ status: "Active", batch, ...(exceptId ? { _id: { $ne: exceptId } } : {}) }, { session, projection: { nameKey: 1 } }).toArray();
    if (others.some(row => row.nameKey === nameKey(name))) throw new DomainError("CONFLICT", `There's already a team called “${name}” in this batch.`);
  }

  async function activeTeam(teamId: unknown, session: ClientSession) {
    const team = await teams.findOne({ _id: text(teamId) }, { session });
    if (!team) throw new DomainError("NOT_FOUND", "This team no longer exists.");
    if (team.status !== "Active") throw new DomainError("CONFLICT", "Restore this team before changing it.");
    return team;
  }

  async function record(type: string, applicationIds: string[], session: ClientSession) {
    await events.insertOne({ _id: id("EVT"), type, applicationIds: [...new Set(applicationIds)], createdAt: new Date() }, { session });
  }

  /** In-app notices to interns about their team. */
  async function tell(applicationIds: string[], title: string, body: string, href: string, session: ClientSession) {
    const ids = [...new Set(applicationIds)];
    if (!ids.length) return;
    const createdOn = new Date().toISOString();
    await notifications.insertMany(ids.map(applicationId => ({ _id: id("NTF"), recipientRole: "intern", applicationId, title, body, href, createdOn })), { session });
  }

  /** A team's mentor becomes every member's mentor, through the same fields as assigning one intern. */
  async function applyMentor(team: Row, members: string[], session: ClientSession) {
    if (!team.mentorId || !members.length) return;
    await interns.updateMany({ applicationId: { $in: members } }, { $set: { mentorId: team.mentorId, mentorName: team.mentorName || "" }, $inc: { revision: 1 } }, { session });
  }

  /** Approved and total tasks per team, counting team members' tasks on the team's projects. */
  async function progressFor(rows: Row[]) {
    const memberIds = [...new Set(rows.flatMap(row => row.members || []))], projectIds = [...new Set(rows.flatMap(row => row.projectIds || []))];
    const result = new Map<string, { approved: number; total: number }>();
    if (!memberIds.length || !projectIds.length) return result;
    const all = await tasks.find({ projectId: { $in: projectIds }, applicationId: { $in: memberIds } }, { projection: { projectId: 1, applicationId: 1, status: 1 } }).limit(20000).toArray();
    for (const row of rows) {
      const members = new Set(row.members || []), projectSet = new Set(row.projectIds || []);
      const mine = all.filter(task => members.has(task.applicationId) && projectSet.has(task.projectId));
      result.set(row._id, { approved: mine.filter(task => task.status === "Approved").length, total: mine.length });
    }
    return result;
  }

  /** Active interns who aren't in any active team. */
  async function unassigned(filters: { batch?: string; program?: string; search?: string }) {
    const rows = await interns.find({ status: "Active", ...(filters.batch ? { batch: filters.batch } : {}) }, { projection: { applicationId: 1, batch: 1 } }).limit(5000).toArray();
    const ids = rows.map(row => String(row.applicationId));
    const taken = new Set((await memberships.find({ _id: { $in: ids } }, { projection: { _id: 1 } }).toArray()).map(row => row._id));
    const free = ids.filter(applicationId => !taken.has(applicationId));
    const batchOf = new Map(rows.map(row => [String(row.applicationId), row.batch || ""]));
    const query: Record<string, unknown> = { _id: { $in: free } };
    if (filters.program) query.$or = [{ program: filters.program }, { programId: filters.program }];
    if (filters.search) query.name = { $regex: escaped(filters.search), $options: "i" };
    const found = await applications.find(query, { projection: { name: 1, email: 1, college: 1, program: 1, initials: 1, avatarColor: 1, githubAccount: 1 } }).toArray();
    return found
      .map(row => ({ id: row._id, name: String(row.name || "Intern"), email: row.email, college: row.college || "", program: row.program || "", batch: batchOf.get(row._id) || "", initials: row.initials, avatarColor: row.avatarColor, githubLogin: row.githubAccount?.login || null }))
      .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
  }

  async function summaries(rows: Row[]) {
    const memberIds = [...new Set(rows.flatMap(row => row.members || []))];
    const projectIds = [...new Set(rows.flatMap(row => row.projectIds || []))];
    const [names, projectRows, progress] = await Promise.all([
      people(memberIds),
      projectIds.length ? projects.find({ _id: { $in: projectIds } }, { projection: { name: 1, status: 1 } }).toArray() : Promise.resolve([]),
      progressFor(rows),
    ]);
    const projectNames = new Map(projectRows.map(row => [row._id, { id: row._id, name: row.name, status: row.status }]));
    return rows.map(row => ({
      id: row._id, name: row.name, batch: row.batch || "", program: row.program || "", status: row.status, leadId: row.leadId || null,
      memberCount: (row.members || []).length, createdOn: row.createdOn, archivedOn: row.archivedOn || null,
      mentorId: row.mentorId || null, mentorName: row.mentorName || null, progress: progress.get(row._id) || { approved: 0, total: 0 },
      members: (row.members || []).map((memberId: string) => { const person = names.get(memberId); return { id: memberId, name: person?.name || "Intern", initials: person?.initials, avatarColor: person?.avatarColor }; }),
      projects: (row.projectIds || []).map((projectId: string) => projectNames.get(projectId)).filter(Boolean),
    }));
  }

  async function read(method: string, p: Record<string, any>, actor: Principal) {
    if (method === "team.settings") return readSettings();
    const scope = await mentorScope(actor, interns as any);
    if (method === "team.list") {
      const status = p.status === "Archived" ? "Archived" : p.status === "all" ? null : "Active";
      const filter: Record<string, any> = { ...(status ? { status } : {}) };
      if (text(p.batch) && p.batch !== "all") filter.batch = text(p.batch);
      if (text(p.program) && p.program !== "all") filter.program = text(p.program);
      if (p.noProject === true) filter["projectIds.0"] = { $exists: false };
      if (text(p.projectId)) filter.projectIds = text(p.projectId);
      if (scope) filter.members = { $in: scope };
      const search = text(p.search);
      if (search) {
        const matches = await applications.find({ name: { $regex: escaped(search), $options: "i" } }, { projection: { _id: 1 } }).limit(500).toArray();
        filter.$or = [{ name: { $regex: escaped(search), $options: "i" } }, { members: { $in: matches.map(row => row._id) } }];
      }
      const page = Math.max(1, Math.min(10000, Number(p.page) || 1)), pageSize = Math.max(1, Math.min(100, Number(p.pageSize) || 24));
      const [rows, total, counts] = await Promise.all([
        teams.find(filter).sort({ createdOn: -1, nameKey: 1, _id: 1 }).skip((page - 1) * pageSize).limit(pageSize).toArray(),
        teams.countDocuments(filter),
        teams.aggregate([{ $match: { ...(scope ? { members: { $in: scope } } : {}) } }, { $group: { _id: "$status", count: { $sum: 1 } } }]).toArray(),
      ]);
      return { items: await summaries(rows), total, page, pageSize, counts: Object.fromEntries(counts.map((row: any) => [row._id, row.count])) };
    }
    if (method === "team.get") {
      const team = await teams.findOne({ _id: text(p.id) });
      if (!team || (scope && !(team.members || []).some((member: string) => scope.includes(member)))) throw new DomainError("NOT_FOUND", "This team no longer exists.");
      const members: string[] = team.members || [];
      const [summary] = await summaries([team]);
      const [details, internRows, projectRows, openTasks] = await Promise.all([
        people(members),
        interns.find({ applicationId: { $in: members } }, { projection: { applicationId: 1, status: 1, mentorName: 1 } }).toArray(),
        (team.projectIds || []).length ? projects.find({ _id: { $in: team.projectIds } }, { projection: { name: 1, status: 1, dueOn: 1, team: 1, teamSources: 1 } }).toArray() : Promise.resolve([]),
        (team.projectIds || []).length ? tasks.aggregate([{ $match: { projectId: { $in: team.projectIds }, applicationId: { $in: members }, status: { $ne: "Approved" } } }, { $group: { _id: "$applicationId", count: { $sum: 1 } } }]).toArray() : Promise.resolve([]),
      ]);
      const internBy = new Map(internRows.map(row => [row.applicationId, row]));
      const openBy = new Map(openTasks.map((row: any) => [row._id, row.count]));
      return {
        ...summary,
        members: members.map(memberId => ({ ...(details.get(memberId) || { id: memberId, name: "Intern" }), internStatus: internBy.get(memberId)?.status || null, mentorName: internBy.get(memberId)?.mentorName || null, openTasks: openBy.get(memberId) || 0 })),
        projects: projectRows.map(row => ({ id: row._id, name: row.name, status: row.status, dueOn: row.dueOn, missing: members.filter(member => !(row.team || []).includes(member)) })),
      };
    }
    if (method === "team.tasks") {
      const team = await teams.findOne({ _id: text(p.id) }, { projection: { members: 1 } });
      if (!team || (scope && !(team.members || []).some((member: string) => scope.includes(member)))) throw new DomainError("NOT_FOUND", "This team no longer exists.");
      const rows = await tasks.find({ teamId: team._id }, { projection: { title: 1, projectId: 1, applicationId: 1, status: 1, dueOn: 1, required: 1, createdOn: 1, teamTaskId: 1 } }).limit(5000).toArray();
      const [names, projectRows] = await Promise.all([
        people([...new Set(rows.map(row => String(row.applicationId)))], undefined, false),
        projects.find({ _id: { $in: [...new Set(rows.map(row => String(row.projectId)))] } }, { projection: { name: 1 } }).toArray(),
      ]);
      const projectNames = new Map(projectRows.map(row => [row._id, row.name]));
      const groups = new Map<string, any>();
      for (const row of rows) {
        const key = String(row.teamTaskId || row._id);
        const group = groups.get(key) || { teamTaskId: key, title: row.title, projectId: row.projectId, projectName: projectNames.get(row.projectId) || "Project", dueOn: row.dueOn, required: !!row.required, createdOn: row.createdOn, members: [] };
        group.members.push({ taskId: row._id, applicationId: row.applicationId, name: names.get(row.applicationId)?.name || "Intern", status: row.status });
        groups.set(key, group);
      }
      const items = [...groups.values()].map(group => ({ ...group, approved: group.members.filter((m: any) => m.status === "Approved").length, underReview: group.members.filter((m: any) => m.status === "Under review").length, total: group.members.length }));
      return { items: items.sort((a, b) => String(b.createdOn).localeCompare(String(a.createdOn))) };
    }
    if (method === "team.export") {
      const filter: Record<string, any> = {};
      if (p.status === "Active" || p.status === "Archived") filter.status = p.status;
      if (text(p.batch) && p.batch !== "all") filter.batch = text(p.batch);
      if (scope) filter.members = { $in: scope };
      const rows = await teams.find(filter).sort({ batch: 1, nameKey: 1 }).limit(2000).toArray();
      const [names, projectRows] = await Promise.all([
        people([...new Set(rows.flatMap(row => row.members || []))]),
        projects.find({ _id: { $in: [...new Set(rows.flatMap(row => row.projectIds || []))] } }, { projection: { name: 1 } }).toArray(),
      ]);
      const projectNames = new Map(projectRows.map(row => [row._id, row.name]));
      const lines: Record<string, string>[] = [];
      for (const row of rows) {
        const base = { team: row.name, batch: row.batch || "", program: row.program || "", status: row.status, mentor: row.mentorName || "", projects: (row.projectIds || []).map((projectId: string) => projectNames.get(projectId)).filter(Boolean).join("; ") };
        const members: string[] = row.members || [];
        if (!members.length) lines.push({ ...base, member: "", email: "", college: "", github: "", lead: "" });
        for (const member of members) {
          const person = names.get(member);
          lines.push({ ...base, member: person?.name || "Intern", email: person?.email || "", college: person?.college || "", github: person?.githubLogin || "", lead: member === row.leadId ? "Yes" : "" });
        }
      }
      return { rows: lines };
    }
    if (method === "team.unassigned") {
      const all = await unassigned({ batch: text(p.batch) && p.batch !== "all" ? text(p.batch) : undefined, program: text(p.program) && p.program !== "all" ? text(p.program) : undefined, search: text(p.search) || undefined });
      const visible = scope ? all.filter(person => scope.includes(person.id)) : all;
      const page = Math.max(1, Number(p.page) || 1), pageSize = Math.max(1, Math.min(100, Number(p.pageSize) || 20));
      return { items: visible.slice((page - 1) * pageSize, page * pageSize), total: visible.length, page, pageSize };
    }
    if (method === "team.batches") {
      const rows = await interns.aggregate([{ $match: { status: "Active" } }, { $group: { _id: "$batch", ids: { $push: "$applicationId" } } }]).toArray();
      const taken = new Set((await memberships.find({}, { projection: { _id: 1 } }).toArray()).map(row => row._id));
      return { batches: rows.map((row: any) => ({ batch: row._id || "", active: row.ids.length, unassigned: row.ids.filter((member: string) => !taken.has(member)).length })).sort((a, b) => a.batch.localeCompare(b.batch)) };
    }
    if (method === "team.plan") {
      const defaults = await readSettings();
      const size = p.size === undefined ? defaults.size : Number(p.size);
      if (!Number.isInteger(size) || size < TEAM_SIZE_MIN || size > TEAM_SIZE_MAX) throw new DomainError("INVALID_REQUEST", `Choose a team size from ${TEAM_SIZE_MIN} to ${TEAM_SIZE_MAX}.`);
      const leftover = (p.leftover ?? defaults.leftover) as Leftover, mix = (p.mix ?? "random") as Mix;
      if (!LEFTOVERS.includes(leftover) || !MIXES.includes(mix)) throw new DomainError("INVALID_REQUEST", "Choose how to group the interns.");
      const batch = text(p.batch) && p.batch !== "all" ? text(p.batch) : undefined;
      const candidates = await unassigned({ batch, program: text(p.program) && p.program !== "all" ? text(p.program) : undefined });
      const existing = await teams.countDocuments({ status: "Active", ...(batch ? { batch } : {}) });
      const prefix = text(p.prefix).slice(0, 40) || "Team";
      const seed = Number.isInteger(Number(p.seed)) ? Number(p.seed) : 1;
      const plan = planTeams(candidates, { size, leftover, mix, seed, prefix, startAt: existing + 1 });
      const byId = new Map(candidates.map(person => [person.id, person]));
      return { size, leftover, mix, seed, total: candidates.length, teams: plan.teams.map(team => ({ name: team.name, members: team.members.map(member => byId.get(member)) })), individuals: plan.individuals.map(member => byId.get(member)) };
    }
    throw new DomainError("INVALID_REQUEST", "Unknown team action.");
  }

  async function write(method: string, p: Record<string, any>, actor: Principal, key: string) {
    return transact(key, actor, { method, params: p }, async session => {
      const opts = { session }, now = new Date().toISOString();
      if (method === "team.settings.save") {
        const size = Number(p.size), leftover = p.leftover as Leftover;
        if (!Number.isInteger(size) || size < TEAM_SIZE_MIN || size > TEAM_SIZE_MAX) throw new DomainError("INVALID_REQUEST", `Choose a team size from ${TEAM_SIZE_MIN} to ${TEAM_SIZE_MAX}.`);
        if (!LEFTOVERS.includes(leftover)) throw new DomainError("INVALID_REQUEST", "Choose what happens to leftover interns.");
        await settings.updateOne({ _id: "teams" }, { $set: { size, leftover, updatedOn: now } }, { ...opts, upsert: true });
        await auditDecision(audit, session, actor, "team.settings", "teams", { size, leftover });
        return { size, leftover };
      }
      if (method === "team.create" || method === "team.createMany") {
        const batch = text(p.batch).slice(0, 100), program = text(p.program).slice(0, 120);
        const input = method === "team.create" ? [{ name: p.name, members: p.members ?? [] }] : p.teams;
        if (!Array.isArray(input) || !input.length || input.length > MAX_TEAMS_PER_REQUEST) throw new DomainError("INVALID_REQUEST", `Create between 1 and ${MAX_TEAMS_PER_REQUEST} teams at a time.`);
        const planned = input.map((team: any) => ({ name: teamName(team?.name), members: memberList(team?.members ?? []) }));
        if (method === "team.createMany" && planned.some(team => !team.members.length)) throw new DomainError("INVALID_REQUEST", "Every team needs at least one member.");
        const names = new Set<string>(), everyone = new Set<string>();
        for (const team of planned) {
          if (names.has(nameKey(team.name))) throw new DomainError("INVALID_REQUEST", `Two teams are called “${team.name}”. Give each team its own name.`);
          names.add(nameKey(team.name));
          for (const member of team.members) { if (everyone.has(member)) throw new DomainError("INVALID_REQUEST", "Each intern can be in only one team."); everyone.add(member); }
          await uniqueName(team.name, batch, null, session);
        }
        await requireActive([...everyone], session);
        const created = planned.map(team => ({ _id: id("TEAM"), name: team.name, nameKey: nameKey(team.name), batch, program, members: team.members, projectIds: [], leadId: null, status: "Active", createdOn: now, createdBy: actor.id, revision: 1 }));
        for (const team of created) await claim(team.members, team._id, session);
        await teams.insertMany(created, opts);
        await auditDecision(audit, session, actor, created.length === 1 ? "team.created" : "team.createdMany", created.length === 1 ? created[0]!._id : batch || "teams", { count: created.length, names: created.slice(0, 20).map(team => team.name), members: everyone.size });
        await record("team.create", [...everyone], session);
        for (const team of created) await tell(team.members, `You joined team ${team.name}`, team.members.length > 1 ? `You're in ${team.name} with ${team.members.length - 1} ${team.members.length === 2 ? "teammate" : "teammates"}. Meet them on your dashboard.` : `You're in ${team.name}. Your team appears on your dashboard.`, "/intern/portal", session);
        return { created: created.length, ids: created.map(team => team._id) };
      }
      const team = method === "team.restore" ? await teams.findOne({ _id: text(p.id) }, opts) : await activeTeam(p.id, session);
      if (!team) throw new DomainError("NOT_FOUND", "This team no longer exists.");
      const members: string[] = team.members || [], projectIds: string[] = team.projectIds || [];
      if (method === "team.update") {
        const patch = p.patch || {}, set: Record<string, unknown> = { updatedOn: now };
        if (patch.name !== undefined) { const name = teamName(patch.name); await uniqueName(name, team.batch || "", team._id, session); set.name = name; set.nameKey = nameKey(name); }
        if (patch.leadId !== undefined) {
          if (patch.leadId !== null && !members.includes(patch.leadId)) throw new DomainError("INVALID_REQUEST", "The team lead must be a member of the team.");
          set.leadId = patch.leadId;
        }
        await teams.updateOne({ _id: team._id }, { $set: set, $inc: { revision: 1 } }, opts);
        await record("team.update", members, session);
        return { id: team._id };
      }
      if (method === "team.addMembers") {
        const added = memberList(p.members).filter(member => !members.includes(member));
        if (!added.length) throw new DomainError("INVALID_REQUEST", "Choose interns who aren't in this team yet.");
        if (members.length + added.length > TEAM_SIZE_MAX) throw new DomainError("CONFLICT", `A team can have at most ${TEAM_SIZE_MAX} members.`);
        await requireActive(added, session);
        await claim(added, team._id, session);
        await teams.updateOne({ _id: team._id }, { $addToSet: { members: { $each: added } }, $set: { updatedOn: now }, $inc: { revision: 1 } } as any, opts);
        await addToProjects(team._id, projectIds, added, session);
        await applyMentor(team, added, session);
        await tell(added, `You joined team ${team.name}`, `You're now in ${team.name}. Meet your teammates on your dashboard.`, "/intern/portal", session);
        await auditDecision(audit, session, actor, "team.membersAdded", team._id, { added });
        await record("team.addMembers", [...members, ...added], session);
        return { id: team._id, added: added.length };
      }
      if (method === "team.removeMember" || method === "team.moveMember") {
        const member = text(p.applicationId);
        if (!members.includes(member)) throw new DomainError("NOT_FOUND", "This intern isn't in the team.");
        const target = method === "team.moveMember" ? await activeTeam(p.toId, session) : null;
        if (target && target._id === team._id) throw new DomainError("INVALID_REQUEST", "Choose a different team.");
        if (target && (target.members || []).length >= TEAM_SIZE_MAX) throw new DomainError("CONFLICT", `${target.name} already has ${TEAM_SIZE_MAX} members.`);
        await removeFromProjects(team._id, projectIds, [member], session);
        await release([member], team._id, session);
        await teams.updateOne({ _id: team._id }, { $pull: { members: member }, $set: { updatedOn: now, ...(team.leadId === member ? { leadId: null } : {}) }, $inc: { revision: 1 } } as any, opts);
        if (target) {
          await claim([member], target._id, session);
          await teams.updateOne({ _id: target._id }, { $addToSet: { members: member }, $set: { updatedOn: now }, $inc: { revision: 1 } } as any, opts);
          await addToProjects(target._id, target.projectIds || [], [member], session);
          await applyMentor(target, [member], session);
          await tell([member], `You moved to team ${target.name}`, `You're now in ${target.name}. Your team and projects are on your dashboard.`, "/intern/portal", session);
        } else {
          await tell([member], `You're no longer in team ${team.name}`, "You can still see your projects on your dashboard.", "/intern/portal", session);
        }
        await auditDecision(audit, session, actor, target ? "team.memberMoved" : "team.memberRemoved", team._id, { applicationId: member, ...(target ? { toTeamId: target._id } : {}) });
        await record(method, [...members, ...(target?.members || [])], session);
        return { id: team._id, ...(target ? { toId: target._id } : {}) };
      }
      if (method === "team.assignProject" || method === "team.unassignProject") {
        const projectId = text(p.projectId);
        const project = await projects.findOne({ _id: projectId }, { session, projection: { name: 1 } });
        if (!project) throw new DomainError("NOT_FOUND", "This project no longer exists.");
        if (method === "team.assignProject") {
          if (projectIds.includes(projectId)) throw new DomainError("CONFLICT", `${team.name} is already on ${project.name}.`);
          const activeRows = await interns.find({ applicationId: { $in: members }, status: "Active" }, { session, projection: { applicationId: 1 } }).toArray();
          await addToProjects(team._id, [projectId], activeRows.map(row => String(row.applicationId)), session);
          await teams.updateOne({ _id: team._id }, { $addToSet: { projectIds: projectId }, $set: { updatedOn: now }, $inc: { revision: 1 } } as any, opts);
          await projects.updateOne({ _id: projectId }, { $addToSet: { teamIds: team._id } } as any, opts);
          await tell(activeRows.map(row => String(row.applicationId)), "Your team has a new project", `${team.name} is now working on ${project.name}.`, `/intern/portal/projects/${encodeURIComponent(projectId)}`, session);
        } else {
          if (!projectIds.includes(projectId)) throw new DomainError("NOT_FOUND", `${team.name} isn't on ${project.name}.`);
          await removeFromProjects(team._id, [projectId], members, session);
          await teams.updateOne({ _id: team._id }, { $pull: { projectIds: projectId }, $set: { updatedOn: now }, $inc: { revision: 1 } } as any, opts);
          await projects.updateOne({ _id: projectId }, { $pull: { teamIds: team._id } } as any, opts);
        }
        await auditDecision(audit, session, actor, method === "team.assignProject" ? "team.projectAssigned" : "team.projectRemoved", team._id, { projectId, name: project.name });
        await record(method, members, session);
        return { id: team._id, projectId };
      }
      if (method === "team.setMentor") {
        if (actor.staffRole !== "admin") throw new DomainError("FORBIDDEN", "Only an admin can assign mentors.");
        const mentorId = p.mentorId === null || p.mentorId === "" ? null : text(p.mentorId);
        let mentorName = "";
        if (mentorId) {
          const mentor = await accounts.findOne({ _id: mentorId, role: "company", staffRole: "mentor", disabled: { $ne: true } }, { session, projection: { name: 1 } });
          if (!mentor) throw new DomainError("INVALID_REQUEST", "Choose an active staff member with the Mentor role.");
          mentorName = String(mentor.name || "");
          await teams.updateOne({ _id: team._id }, { $set: { mentorId, mentorName, updatedOn: now }, $inc: { revision: 1 } }, opts);
          await applyMentor({ ...team, mentorId, mentorName }, members, session);
        } else {
          // Clearing the team mentor leaves each member's own mentor as it is.
          await teams.updateOne({ _id: team._id }, { $unset: { mentorId: "", mentorName: "" }, $set: { updatedOn: now }, $inc: { revision: 1 } }, opts);
        }
        await auditDecision(audit, session, actor, "team.mentorSet", team._id, { mentorId, mentorName });
        await record(method, members, session);
        return { id: team._id, mentorId, mentorName };
      }
      if (method === "team.archive") {
        // Archiving keeps the team and its projects for the record and frees its members to join another team.
        await release(members, team._id, session);
        await teams.updateOne({ _id: team._id }, { $set: { status: "Archived", archivedOn: now, updatedOn: now }, $inc: { revision: 1 } }, opts);
        await auditDecision(audit, session, actor, "team.archived", team._id, { name: team.name });
        await record(method, members, session);
        return { id: team._id };
      }
      if (method === "team.restore") {
        if (team.status === "Active") throw new DomainError("CONFLICT", "This team is already active.");
        await uniqueName(team.name, team.batch || "", team._id, session);
        await claim(members, team._id, session);
        await teams.updateOne({ _id: team._id }, { $set: { status: "Active", updatedOn: now }, $unset: { archivedOn: "" }, $inc: { revision: 1 } }, opts);
        await auditDecision(audit, session, actor, "team.restored", team._id, { name: team.name });
        await record(method, members, session);
        return { id: team._id };
      }
      throw new DomainError("INVALID_REQUEST", "Unknown team action.");
    });
  }

  async function execute(method: string, p: Record<string, any>, actor: Principal | null, key = "") {
    const writing = WRITE.has(method);
    if (!canUseTeams(actor, writing)) throw new DomainError("FORBIDDEN", writing ? "Your staff role can't manage teams." : "Your staff role can't view teams.");
    return writing ? write(method, p, actor!, key || id("TEAMCMD")) : read(method, p, actor!);
  }

  /** The intern's own active team: names and GitHub usernames only, never contact details. */
  async function myTeam(applicationId: string) {
    const membership = await memberships.findOne({ _id: applicationId });
    if (!membership) return null;
    const team = await teams.findOne({ _id: membership.teamId, status: "Active" });
    if (!team) return null;
    const [names, projectRows] = await Promise.all([
      people(team.members || [], undefined, false),
      (team.projectIds || []).length ? projects.find({ _id: { $in: team.projectIds }, team: applicationId }, { projection: { name: 1 } }).toArray() : Promise.resolve([]),
    ]);
    return {
      id: team._id, name: team.name, batch: team.batch || "", leadId: team.leadId || null, mentorName: team.mentorName || null,
      members: (team.members || []).map((member: string) => ({ ...(names.get(member) || { id: member, name: "Intern" }), isYou: member === applicationId, isLead: member === team.leadId })),
      projects: projectRows.map(row => ({ id: row._id, name: row.name })),
    };
  }

  return { initialize, supports: (method: string) => TEAM_METHODS.has(method), execute, myTeam };
}
