import type { Collection } from "mongodb";
import type { InternshipRow } from "../../infrastructure/database/collections";
import { acceptsCompensationMode } from "../programs/compensation";
import { isInternRole } from "../programs/opportunities.mjs";

type Row = InternshipRow;

export type PublicInsights = {
  /** Tracks currently enabled in program settings; every number below is limited to these. */
  tracks: { id: string; name: string }[];
  totals: { applied: number; reviewed: number; shortlisted: number; selected: number; onboarded: number; certified: number; projects: number };
  byTrack: Record<string, number>;
  byRole: Record<string, number>;
  thisMonth: number;
  lastMonth: number;
  months: { label: string; month: string; explorer: number; innovator: number }[];
  topSkills: { name: string; count: number }[];
  recent: { track: string; at: string; name: string }[];
  viewers: number;
  updatedAt: string;
};

/** Skills are free text; hide entries only one applicant used so the feed cannot single anyone out. */
export const MIN_SKILL_APPLICANTS = 2;
const REVIEWED = ["Under Review", "Shortlisted", "Selected", "Joined"];
const SHORTLISTED = ["Shortlisted", "Selected", "Joined"];
const SELECTED = ["Selected", "Joined"];

const minute = (value: unknown) => {
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCSeconds(0, 0);
  return date.toISOString();
};

/**
 * Public feeds never carry a full applicant name or contact detail. Keep the
 * first name (capped) and the last initial so the activity reads like a person
 * without identifying them; the safety story is enforced by tests.
 */
export function publicApplicantName(value: unknown) {
  const parts = String(value ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  const chars = Array.from(parts[0]).slice(0, 32);
  const name = chars[0]?.toUpperCase() + chars.slice(1).join("");
  const initial = parts.length > 1 ? Array.from(parts[parts.length - 1])[0]?.toUpperCase() ?? "" : "";
  return initial ? `${name} ${initial}.` : name;
}

/**
 * Public internship numbers for the careers page. Applicant activity carries a
 * shortened display name (first name plus last initial) but never a full name,
 * email, application ID or free text beyond common skills.
 */
export function createPublicInsights({ collection }: { collection: (name: string) => Collection<Row> }) {
  const programs = collection("programs"), settings = collection("settings"), applications = collection("applications"), events = collection("events"), projects = collection("projects"), certificates = collection("certificates");

  async function calculate(now = new Date()): Promise<Omit<PublicInsights, "viewers">> {
    const firstMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1)).toISOString().slice(0, 10);
    // Mirror the admin Settings page: a track is public only while it is switched on, has a
    // configured fee and matches the selected compensation mode (free / paid / both).
    const [programRows, config] = await Promise.all([programs.find({}).sort({ _id: 1 }).toArray(), settings.findOne({ _id: "program" })]);
    const enabled = programRows
      .filter(row => isTrackEnabled(row, config?.compensationMode))
      .map(row => ({ id: String(row._id), name: typeof row.name === "string" && row.name ? row.name : String(row._id) }));
    const ids = enabled.map(track => track.id), names = enabled.map(track => track.name);
    const [[facets], recentRows, projectCount, certificateCount] = ids.length ? await Promise.all([
      applications.aggregate([
        { $match: { programId: { $in: ids } } },
        {
          $facet: {
            statuses: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
            tracks: [{ $group: { _id: "$programId", count: { $sum: 1 } } }],
            roles: [{ $group: { _id: "$roleId", count: { $sum: 1 } } }],
            monthly: [
              { $match: { appliedOn: { $type: "string", $gte: firstMonth } } },
              { $group: { _id: { month: { $substrBytes: ["$appliedOn", 0, 7] }, program: "$programId" }, count: { $sum: 1 } } },
            ],
            skills: [
              { $project: { skills: { $setUnion: [{ $ifNull: ["$skills", []] }, []] } } },
              { $unwind: "$skills" },
              { $match: { skills: { $type: "string", $ne: "" } } },
              { $group: { _id: { $toLower: { $trim: { input: "$skills" } } }, name: { $first: { $trim: { input: "$skills" } } }, count: { $sum: 1 } } },
              { $match: { count: { $gte: MIN_SKILL_APPLICANTS } } },
              { $sort: { count: -1, _id: 1 } },
              { $limit: 8 },
            ],
          },
        },
      ]).toArray(),
      events.aggregate([
        { $match: { type: "application.created" } },
        { $sort: { createdAt: -1, _id: -1 } },
        { $limit: 50 },
        { $lookup: { from: applications.collectionName, localField: "applicationIds", foreignField: "_id", as: "app", pipeline: [{ $project: { _id: 0, programId: 1, name: 1 } }] } },
        { $project: { _id: 0, createdAt: 1, programId: { $first: "$app.programId" }, name: { $first: "$app.name" } } },
        { $match: { programId: { $in: ids } } },
        { $limit: 8 },
      ]).toArray(),
      projects.countDocuments({ program: { $in: names } }),
      certificates.countDocuments({ programId: { $in: ids } }),
    ]) : [[undefined], [], 0, 0] as const;
    const statuses = Object.fromEntries(((facets?.statuses || []) as { _id: string; count: number }[]).map(row => [row._id, row.count]));
    const sum = (names: string[]) => names.reduce((total, name) => total + (statuses[name] || 0), 0);
    const applied = Object.values(statuses).reduce((total: number, count) => total + Number(count), 0);
    const monthly = (facets?.monthly || []) as { _id: { month: string; program: string }; count: number }[];
    const months = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11 + index, 1));
      const key = date.toISOString().slice(0, 7), rows = monthly.filter(row => row._id.month === key);
      const count = (program: string) => !ids.includes(program) ? 0 : rows.filter(row => row._id.program === program).reduce((total, row) => total + row.count, 0);
      return { label: date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }), month: key, explorer: count("explorer"), innovator: count("innovator") };
    });
    const monthTotal = (entry?: { explorer: number; innovator: number }) => (entry ? entry.explorer + entry.innovator : 0);
    return {
      tracks: enabled,
      totals: { applied, reviewed: sum(REVIEWED), shortlisted: sum(SHORTLISTED), selected: sum(SELECTED), onboarded: statuses.Joined || 0, certified: certificateCount, projects: projectCount },
      byTrack: Object.fromEntries(((facets?.tracks || []) as { _id: unknown; count: number }[]).filter(row => typeof row._id === "string" && ids.includes(row._id)).map(row => [row._id as string, row.count])),
      byRole: Object.fromEntries(((facets?.roles || []) as { _id: unknown; count: number }[]).filter(row => typeof row._id === "string" && isInternRole(row._id)).map(row => [row._id as string, row.count])),
      thisMonth: monthTotal(months[11]),
      lastMonth: monthTotal(months[10]),
      months,
      topSkills: ((facets?.skills || []) as { name: string; count: number }[]).map(row => ({ name: String(row.name).slice(0, 40), count: row.count })),
      recent: recentRows.flatMap(row => { const at = minute(row.createdAt); return at && typeof row.programId === "string" && ids.includes(row.programId) ? [{ track: row.programId, at, name: publicApplicantName(row.name) }] : []; }),
      updatedAt: new Date().toISOString(),
    };
  }

  let cached: Omit<PublicInsights, "viewers"> | null = null;
  let pending: Promise<Omit<PublicInsights, "viewers">> | null = null;
  let generation = 0;
  function invalidate() { generation++; cached = null; pending = null; }
  async function get() {
    if (cached) return cached;
    if (pending) return pending;
    const started = generation;
    const next = calculate().then(value => { if (started === generation) cached = value; return value; });
    pending = next;
    try { return await next; } finally { if (pending === next) pending = null; }
  }
  return { get, invalidate, calculate };
}

/** Same availability rule as the admin Settings page and the careers page track list. */
export function isTrackEnabled(program: Record<string, any> | null | undefined, compensationMode: unknown) {
  const fee = program?.fee;
  return program?.enabled === true && typeof fee === "number" && Number.isSafeInteger(fee) && fee >= 0 && acceptsCompensationMode(program.stipend, compensationMode);
}

/** Event types whose writes can move a public insights number. */
export const affectsInsights = (type: unknown) => type === "program.configure" || /^(application|onboarding|offer|certificate|project|intern)\./.test(String(type));

/** Coalesces bursts into at most one call per interval, always running a trailing call. */
export function throttle(fn: () => void, intervalMs: number) {
  let timer: ReturnType<typeof setTimeout> | null = null, last = 0, queued = false;
  const run = () => { timer = null; queued = false; last = Date.now(); fn(); };
  const schedule = () => {
    if (timer) { queued = true; return; }
    const wait = Math.max(0, last + intervalMs - Date.now());
    timer = setTimeout(run, wait);
    (timer as any).unref?.();
  };
  schedule.cancel = () => { if (timer) clearTimeout(timer); timer = null; queued = false; };
  schedule.pending = () => queued || timer !== null;
  return schedule;
}
