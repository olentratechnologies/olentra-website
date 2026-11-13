import { randomUUID } from "node:crypto";
import type { ClientSession, Collection, Document } from "mongodb";
import { DomainError } from "../../shared/errors";
import type { Principal } from "../../shared/principal";
import { can, isAdmin } from "../access/policy";

type Row = Document & { _id: string };
type Tx = <T>(key: string, actor: Principal | null, input: unknown, fn: (session: ClientSession) => Promise<T>) => Promise<T>;
const rating = (value: unknown, label: string) => {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 5) throw new DomainError("INVALID_REQUEST", `Rate the ${label} from 1 to 5.`);
  return number;
};

/** Averages for staff: counts, mean ratings (one decimal) and the share who'd recommend. */
export function summarizeFeedback(rows: { programRating: number; mentorRating: number; recommend: boolean }[]) {
  if (!rows.length) return { count: 0, program: null, mentor: null, recommendPercent: null };
  const mean = (values: number[]) => Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
  return {
    count: rows.length,
    program: mean(rows.map(row => row.programRating)),
    mentor: mean(rows.map(row => row.mentorRating)),
    recommendPercent: Math.round((rows.filter(row => row.recommend).length / rows.length) * 100),
  };
}

/**
 * Exit feedback: once an internship is completed, the intern rates the
 * program and their mentor once. Staff with analytics access see averages;
 * only admins see individual comments and who wrote them.
 */
export function createFeedback({ collection, transact }: { collection: (name: string) => Collection<Row>; transact: Tx }) {
  const feedback = collection("feedback"), interns = collection("interns"), applications = collection("applications"), events = collection("events");
  const methods = new Set(["feedback.submit", "feedback.mine", "feedback.summary"]);
  async function initialize() { await feedback.createIndex({ applicationId: 1 }, { unique: true }); }

  async function execute(method: string, params: Record<string, any>, actor: Principal | null, key: string) {
    if (method === "feedback.mine") {
      if (actor?.role !== "intern" || !actor.applicationId) throw new DomainError("FORBIDDEN", "Sign in to your intern account.");
      const [row, intern] = await Promise.all([feedback.findOne({ applicationId: actor.applicationId }), interns.findOne({ applicationId: actor.applicationId }, { projection: { status: 1 } })]);
      return { eligible: intern?.status === "Completed", submitted: Boolean(row), submittedOn: row?.submittedOn ?? null };
    }
    if (method === "feedback.submit") {
      if (actor?.role !== "intern" || !actor.applicationId) throw new DomainError("FORBIDDEN", "Sign in to your intern account.");
      const applicationId = actor.applicationId;
      const values = { programRating: rating(params.programRating, "program"), mentorRating: rating(params.mentorRating, "mentoring"), recommend: params.recommend === true, comment: typeof params.comment === "string" ? params.comment.trim().slice(0, 2000) : "" };
      return transact(key, actor, { method, params }, async session => {
        if (!(await interns.findOne({ applicationId, status: "Completed" }, { session, projection: { _id: 1 } }))) throw new DomainError("CONFLICT", "Feedback opens when your internship is completed.");
        try {
          await feedback.insertOne({ _id: `FB-${randomUUID()}`, applicationId, ...values, submittedOn: new Date().toISOString() }, { session });
        } catch (error: any) {
          if (error?.code === 11000) throw new DomainError("CONFLICT", "You've already shared your feedback. Thank you!");
          throw error;
        }
        await events.insertOne({ _id: `EVT-${randomUUID()}`, type: "feedback.submitted", applicationIds: [applicationId], createdAt: new Date() }, { session });
        return { submitted: true };
      });
    }
    // feedback.summary
    if (actor?.role !== "company" || !(isAdmin(actor) || can(actor, "overview.read"))) throw new DomainError("FORBIDDEN", "Your role can't view feedback.");
    const rows = await feedback.find({}).sort({ submittedOn: -1 }).limit(1000).toArray() as any[];
    const summary = summarizeFeedback(rows);
    if (!isAdmin(actor)) return { ...summary, comments: [] };
    const withComments = rows.filter(row => row.comment).slice(0, 50);
    const names = new Map((await applications.find({ _id: { $in: withComments.map(row => row.applicationId) } }, { projection: { name: 1, program: 1 } }).toArray()).map(row => [row._id, row]));
    return { ...summary, comments: withComments.map(row => ({ id: row._id, comment: row.comment, programRating: row.programRating, mentorRating: row.mentorRating, submittedOn: row.submittedOn, name: String(names.get(row.applicationId)?.name || "Former intern"), program: String(names.get(row.applicationId)?.program || "") })) };
  }
  return { initialize, supports: (method: string) => methods.has(method), execute };
}
