import { randomUUID } from "node:crypto";
import type { ClientSession, Collection, Document } from "mongodb";
import { DomainError } from "../../shared/errors";
import type { Principal } from "../../shared/principal";
import { can } from "../access/policy";

type Row = Document & { _id: string };
type Tx = <T>(key: string, actor: Principal | null, input: unknown, fn: (session: ClientSession) => Promise<T>) => Promise<T>;
export type Criterion = { id: string; label: string; weight: number };

export const MAX_SCORE = 5;
export const DEFAULT_RUBRIC: Criterion[] = [
  { id: "video", label: "Intro video", weight: 1 },
  { id: "skills", label: "Skills & experience", weight: 1 },
  { id: "communication", label: "Communication", weight: 1 },
];
const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const round1 = (value: number) => Math.round(value * 10) / 10;

/** Checks an admin's rubric: 1–8 criteria, short labels, weights 1–5. */
export function validateRubric(value: unknown): Criterion[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 8) throw new DomainError("INVALID_REQUEST", "Use between 1 and 8 scoring criteria.");
  const seen = new Set<string>();
  return value.map((entry: any, index) => {
    const label = text(entry?.label).slice(0, 40), weight = Number(entry?.weight ?? 1);
    if (!label) throw new DomainError("INVALID_REQUEST", "Give every criterion a name.");
    if (!Number.isInteger(weight) || weight < 1 || weight > 5) throw new DomainError("INVALID_REQUEST", "Criterion weights must be whole numbers from 1 to 5.");
    const id = (text(entry?.id) || label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `criterion-${index + 1}`).slice(0, 40);
    if (seen.has(id)) throw new DomainError("INVALID_REQUEST", "Each criterion needs a different name.");
    seen.add(id);
    return { id, label, weight };
  });
}

/**
 * One reviewer's weighted score on the 0–5 scale, from the criteria they
 * scored. Returns null when they scored nothing.
 */
export function weightedScore(rubric: Criterion[], scores: Record<string, unknown>) {
  let total = 0, weights = 0;
  for (const criterion of rubric) {
    const value = scores?.[criterion.id];
    if (typeof value !== "number") continue;
    total += value * criterion.weight; weights += criterion.weight;
  }
  return weights ? round1(total / weights) : null;
}

/** Average of every reviewer's weighted score (0–5), or null with no reviews. */
export function averageScore(totals: (number | null)[]) {
  const values = totals.filter((value): value is number => typeof value === "number");
  return values.length ? round1(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
}

/**
 * Structured application reviews. Each staff reviewer keeps one editable
 * score sheet per application; the application stores the average so the
 * list can sort by it.
 */
export function createReviews({ collection, transact }: { collection: (name: string) => Collection<Row>; transact: Tx }) {
  const reviews = collection("reviews"), applications = collection("applications"), settings = collection("settings"), events = collection("events");
  const methods = new Set(["review.list", "review.save"]);
  const rubricNow = async (session?: ClientSession) => {
    const config = await settings.findOne({ _id: "program" }, { projection: { rubric: 1 }, ...(session ? { session } : {}) });
    return Array.isArray(config?.rubric) && config.rubric.length ? config.rubric as Criterion[] : DEFAULT_RUBRIC;
  };
  const staffWith = (actor: Principal | null, permission: string) => {
    if (actor?.role !== "company" || !can(actor, permission)) throw new DomainError("FORBIDDEN", "Your role cannot review applications.");
    return actor;
  };
  const sheet = (row: Row) => ({ reviewerId: row.reviewerId, reviewerName: row.reviewerName, scores: row.scores || {}, comment: row.comment || "", total: row.total ?? null, updatedOn: row.updatedOn });

  async function initialize() {
    await Promise.all([reviews.createIndex({ applicationId: 1, reviewerId: 1 }, { unique: true }), applications.createIndex({ score: -1, _id: -1 })]);
  }

  async function execute(method: string, params: Record<string, any>, actor: Principal | null, key: string) {
    const applicationId = text(params.applicationId);
    if (!applicationId) throw new DomainError("INVALID_REQUEST", "Choose an application.");
    if (method === "review.list") {
      const staff = staffWith(actor, "applications.read");
      const [rubric, rows] = await Promise.all([rubricNow(), reviews.find({ applicationId }).sort({ updatedOn: -1 }).toArray()]);
      const sheets = rows.map(sheet);
      return { rubric, reviews: sheets, average: averageScore(sheets.map(entry => entry.total)), mine: sheets.find(entry => entry.reviewerId === staff.id) || null };
    }
    // review.save
    const staff = staffWith(actor, "applications.review");
    const comment = text(params.comment).slice(0, 2000);
    return transact(key, staff, { method, params }, async session => {
      const rubric = await rubricNow(session);
      const scores: Record<string, number> = {};
      for (const criterion of rubric) {
        const value = params.scores?.[criterion.id];
        if (value === undefined || value === null || value === "") continue;
        const number = Number(value);
        if (!Number.isInteger(number) || number < 0 || number > MAX_SCORE) throw new DomainError("INVALID_REQUEST", `Scores are whole numbers from 0 to ${MAX_SCORE}.`);
        scores[criterion.id] = number;
      }
      if (!Object.keys(scores).length) throw new DomainError("INVALID_REQUEST", "Score at least one criterion.");
      if (!(await applications.findOne({ _id: applicationId }, { session, projection: { _id: 1 } }))) throw new DomainError("NOT_FOUND", "Application not found.");
      const total = weightedScore(rubric, scores), now = new Date().toISOString();
      await reviews.updateOne(
        { applicationId, reviewerId: staff.id },
        { $set: { scores, comment, total, reviewerName: staff.name, updatedOn: now }, $setOnInsert: { _id: `REV-${randomUUID()}`, applicationId, reviewerId: staff.id, createdOn: now } },
        { session, upsert: true },
      );
      const totals = (await reviews.find({ applicationId }, { session, projection: { total: 1 } }).toArray()).map(row => row.total as number | null);
      const average = averageScore(totals);
      await applications.updateOne({ _id: applicationId }, { $set: { score: average, scoreCount: totals.length } }, { session });
      await events.insertOne({ _id: `EVT-${randomUUID()}`, type: "application.reviewed", applicationIds: [applicationId], createdAt: new Date() }, { session });
      return { total, average, scoreCount: totals.length };
    });
  }

  return { initialize, supports: (method: string) => methods.has(method), execute, rubricNow };
}
