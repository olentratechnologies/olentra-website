import { randomUUID } from "node:crypto";
import type { ClientSession, Collection, Document } from "mongodb";
import { DomainError } from "../../shared/errors";
import type { Principal } from "../../shared/principal";
import { TransientAiError } from "./groq";
import { PROMPT_VERSION, RECOMMENDATIONS, type ApplicantContext, type ReviewOutcome } from "./review";

type Row = Document & { _id: string };
type Tx = <T>(key: string, actor: Principal | null, input: unknown, fn: (session: ClientSession) => Promise<T>) => Promise<T>;

export const AI_MAX_ATTEMPTS = 5;
const LEASE_MS = 5 * 60_000;
/** While the resume is still being virus-scanned. */
const SCAN_WAIT_MS = 30_000;
/** When Groq rate-limits without saying how long to wait. */
const RATE_LIMIT_WAIT_MS = 20_000;
/** 1, 2, 4, 8 minutes between failed attempts. */
export const aiBackoff = (attempts: number) => Math.min(60_000 * 2 ** Math.max(0, attempts - 1), 30 * 60_000);

/** Fields the applications list reads; never shown to the applicant. */
export const AI_APPLICATION_FIELDS = ["aiScore", "aiRecommendation", "aiReviewStatus", "aiReviewedOn"] as const;

export type AnalyzeInput = { bytes: Uint8Array; name: string };
export type AiWorkerDeps = {
  readFile: (file: Row) => Promise<Uint8Array>;
  /** `progress` records the current step ("Scoring with AI", …) for the live queue view. */
  analyze: (file: AnalyzeInput, applicant: ApplicantContext, progress: (step: string) => Promise<void>) => Promise<ReviewOutcome>;
  onManual?: (applicationId: string, reason: string) => void;
};

/**
 * AI resume review queue: one row per application in `ai_reviews`. A job is
 * queued in the same transaction as the application, so it exists only if the
 * application does. One server at a time runs the worker (leased job), and each
 * row carries its own lease, so a crashed run is simply picked up again.
 */
export function createAiReviews({ collection, transact, now = Date.now }: { collection: (name: string) => Collection<Row>; transact: Tx; now?: () => number }) {
  const queue = collection("ai_reviews"), applications = collection("applications"), files = collection("files"), events = collection("events");
  const methods = new Set(["application.aiReview", "application.aiReviewRerun", "application.aiReviewBackfill", "application.aiQueue"]);

  async function initialize() {
    await Promise.all([
      queue.createIndex({ status: 1, nextAttemptAt: 1 }),
      queue.createIndex({ status: 1, completedAt: -1 }),
      applications.createIndex({ aiScore: -1, _id: -1 }),
      applications.createIndex({ aiRecommendation: 1, appliedOn: -1 }),
    ]);
  }

  /**
   * Queues (or re-queues) the review of an application's current resume.
   * A brand-new application already carries `aiReviewStatus: "pending"`, so it passes `markApplication: false`.
   */
  async function enqueue(applicationId: string, fileId: string, session?: ClientSession, { markApplication = true } = {}) {
    const at = new Date(now());
    const options = session ? { session } : {};
    await queue.updateOne(
      { _id: applicationId },
      { $set: { fileId, status: "queued", attempts: 0, nextAttemptAt: at, leaseUntil: null, queuedAt: at }, $unset: { leaseId: "", error: "" } },
      { ...options, upsert: true },
    );
    if (markApplication) await applications.updateOne({ _id: applicationId }, { $set: { aiReviewStatus: "pending" }, $unset: { aiScore: "", aiRecommendation: "", aiReviewedOn: "" } }, options);
  }

  async function finish(row: Row, leaseId: string, outcome: ReviewOutcome) {
    const at = new Date(now());
    const fenced = await queue.updateOne(
      { _id: row._id, leaseId, fileId: row.fileId },
      { $set: { status: outcome.status, outcome, completedAt: at, leaseUntil: null }, $unset: { leaseId: "", error: "", step: "" } },
    );
    // Re-queued (a new resume or a re-run) while this one was working: drop this result.
    if (!fenced.modifiedCount) return;
    await applications.updateOne({ _id: row._id }, {
      $set: { aiReviewStatus: outcome.status, aiRecommendation: outcome.recommendation, aiReviewedOn: at.toISOString(), ...(outcome.score === null ? {} : { aiScore: outcome.score }) },
      ...(outcome.score === null ? { $unset: { aiScore: "" } } : {}),
    });
    await events.insertOne({ _id: `EVT-${randomUUID()}`, type: "application.aiReviewed", applicationIds: [row._id], createdAt: at });
  }

  const manualOutcome = (reason: string): ReviewOutcome => ({ status: "manual", recommendation: "Needs manual review", score: null, reason, extraction: { method: "none", pages: 0, characters: 0, warnings: [] }, result: null, model: "", promptVersion: PROMPT_VERSION });

  /** Reviews up to `limit` due resumes. */
  async function process(deps: AiWorkerDeps, limit = 1) {
    let handled = 0;
    while (handled < limit) {
      const at = new Date(now()), leaseId = randomUUID();
      const row = await queue.findOneAndUpdate(
        { status: "queued", nextAttemptAt: { $lte: at }, $or: [{ leaseUntil: null }, { leaseUntil: { $lt: at } }] },
        { $set: { leaseId, leaseUntil: new Date(at.getTime() + LEASE_MS), step: "Reading the resume", startedAt: at } },
        { sort: { nextAttemptAt: 1 }, returnDocument: "after" },
      );
      if (!row) break;
      handled++;
      const release = (update: Document) => queue.updateOne({ _id: row._id, leaseId }, { ...update, $set: { ...(update.$set || {}), leaseUntil: null }, $unset: { leaseId: "", step: "" } });
      const progress = async (step: string) => { await queue.updateOne({ _id: row._id, leaseId }, { $set: { step: step.slice(0, 80) } }); };
      const application = await applications.findOne({ _id: row._id });
      if (!application) { await queue.deleteOne({ _id: row._id, leaseId }); continue; }
      const file = await files.findOne({ _id: String(row.fileId), kind: "resume" });
      if (!file) { await finish(row, leaseId, manualOutcome("The resume file could not be found.")); deps.onManual?.(row._id, "missing file"); continue; }
      if (file.status === "rejected") { await finish(row, leaseId, manualOutcome("The resume was blocked by the virus scanner.")); continue; }
      if (file.status !== "ready") { await release({ $set: { nextAttemptAt: new Date(now() + SCAN_WAIT_MS) } }); continue; }
      try {
        const bytes = await deps.readFile(file);
        const outcome = await deps.analyze({ bytes, name: String(file.name || "resume") }, {
          name: String(application.name || ""), email: String(application.email || ""), program: String(application.program || ""),
          skills: Array.isArray(application.skills) ? application.skills.map(String) : [],
          linkedin: Boolean(application.linkedin), github: Boolean(application.github), video: Boolean(application.hasVideo),
        }, progress);
        await finish(row, leaseId, outcome);
        if (outcome.status === "manual") deps.onManual?.(row._id, outcome.reason);
      } catch (error) {
        // A rate limit says nothing about this resume: wait and try again without using up an attempt.
        if (error instanceof TransientAiError && error.rateLimited) {
          await release({ $set: { error: "Waiting for Groq's rate limit.", nextAttemptAt: new Date(now() + Math.max(error.retryAfterMs || 0, RATE_LIMIT_WAIT_MS)) } });
          break;
        }
        const attempts = Number(row.attempts || 0) + 1;
        const message = String((error as Error)?.message || error).slice(0, 300);
        if (attempts >= AI_MAX_ATTEMPTS || !(error instanceof TransientAiError || isStorageError(error))) {
          await finish(row, leaseId, manualOutcome(`The AI review failed: ${message}`));
          deps.onManual?.(row._id, message);
        } else {
          const wait = Math.max(aiBackoff(attempts), error instanceof TransientAiError ? error.retryAfterMs || 0 : 0);
          await release({ $set: { attempts, error: message, nextAttemptAt: new Date(now() + wait) } });
        }
        // A rate limit applies to the whole account: stop this run and let the next tick try again.
        if (error instanceof TransientAiError) break;
      }
    }
    return handled;
  }

  /** What the AI is doing right now, for the dashboard's live view. Read-only and bounded. */
  async function queueStatus() {
    const at = new Date(now()), tenMinutesAgo = new Date(at.getTime() - 10 * 60_000);
    const [working, waiting, next, recent, queued, finishedRecently, done, manual, lease] = await Promise.all([
      queue.find({ status: "queued", leaseUntil: { $gt: at } }, { projection: { step: 1, startedAt: 1 } }).limit(5).toArray(),
      queue.countDocuments({ status: "queued", error: "Waiting for Groq's rate limit.", nextAttemptAt: { $gt: at } }),
      queue.find({ status: "queued", $or: [{ leaseUntil: null }, { leaseUntil: { $lte: at } }] }, { projection: { nextAttemptAt: 1, attempts: 1, error: 1 } }).sort({ nextAttemptAt: 1 }).limit(6).toArray(),
      queue.find({ status: { $in: ["done", "manual"] } }, { projection: { status: 1, completedAt: 1, startedAt: 1, "outcome.score": 1, "outcome.recommendation": 1, "outcome.reason": 1, "outcome.extraction.method": 1 } }).sort({ completedAt: -1 }).limit(10).toArray(),
      queue.countDocuments({ status: "queued" }),
      queue.countDocuments({ status: { $in: ["done", "manual"] }, completedAt: { $gte: tenMinutesAgo } }),
      queue.countDocuments({ status: "done" }),
      queue.countDocuments({ status: "manual" }),
      collection("job_leases").findOne({ _id: "ai-resume-review" }),
    ]);
    const ids = [...working, ...next, ...recent].map(row => row._id);
    const people = new Map((await applications.find({ _id: { $in: ids } }, { projection: { name: 1, program: 1 } }).toArray()).map(row => [row._id, row]));
    const person = (row: Row) => ({ applicationId: row._id, name: String(people.get(row._id)?.name || "Applicant") });
    const iso = (value: unknown) => (value instanceof Date ? value.toISOString() : null);
    const perMinute = Math.round((finishedRecently / 10) * 10) / 10;
    return {
      // off: no server is running the reviewer · working: reviewing now · rate-limited: pausing for Groq · idle: nothing to do.
      worker: !(lease?.until instanceof Date && lease.until > at) ? "off" : working.length ? "working" : !queued ? "idle" : waiting ? "rate-limited" : "running",
      queued, done, manual, perMinute,
      etaMinutes: queued && perMinute ? Math.ceil(queued / perMinute) : null,
      processing: working.map(row => ({ ...person(row), step: String(row.step || "Working"), startedAt: iso(row.startedAt) })),
      next: next.map(row => ({ ...person(row), dueAt: iso(row.nextAttemptAt), waiting: row.error === "Waiting for Groq's rate limit." ? "rate limit" : row.attempts ? "retrying" : null })),
      recent: recent.map(row => ({ ...person(row), status: row.status, score: typeof row.outcome?.score === "number" ? row.outcome.score : null, recommendation: String(row.outcome?.recommendation || ""), reason: row.status === "manual" ? String(row.outcome?.reason || "") : "", method: String(row.outcome?.extraction?.method || ""), completedAt: iso(row.completedAt), seconds: row.completedAt instanceof Date && row.startedAt instanceof Date ? Math.max(0, Math.round((row.completedAt.getTime() - row.startedAt.getTime()) / 1000)) : null })),
      checkedAt: at.toISOString(),
    };
  }

  /** Queues applications that have a resume but were never reviewed (for the one-off backfill). */
  async function backfill(limit = 5000) {
    const rows = await applications.find({ aiReviewStatus: { $exists: false }, resumeAttachmentId: { $type: "string", $ne: "" } }, { projection: { resumeAttachmentId: 1 }, limit }).toArray();
    // Batched writes: a few round trips for hundreds of applications instead of two each.
    const at = new Date(now());
    for (let start = 0; start < rows.length; start += 500) {
      const chunk = rows.slice(start, start + 500);
      await queue.bulkWrite(chunk.map(row => ({
        updateOne: {
          filter: { _id: row._id },
          update: { $set: { fileId: String(row.resumeAttachmentId), status: "queued", attempts: 0, nextAttemptAt: at, leaseUntil: null, queuedAt: at }, $unset: { leaseId: "", error: "" } },
          upsert: true,
        },
      })), { ordered: false });
      await applications.updateMany({ _id: { $in: chunk.map(row => row._id) }, aiReviewStatus: { $exists: false } }, { $set: { aiReviewStatus: "pending" } });
    }
    return rows.length;
  }

  async function execute(method: string, params: Record<string, any>, actor: Principal | null, key: string) {
    if (actor?.role !== "company") throw new DomainError("FORBIDDEN", "Staff access is required.");
    if (method === "application.aiReview") {
      const applicationId = typeof params.applicationId === "string" ? params.applicationId.trim().slice(0, 120) : "";
      if (!applicationId) throw new DomainError("INVALID_REQUEST", "Choose an application.");
      const row = await queue.findOne({ _id: applicationId });
      if (!row) return { status: "none" };
      return {
        status: row.status === "queued" ? "pending" : row.status,
        attempts: row.attempts || 0,
        queuedAt: row.queuedAt instanceof Date ? row.queuedAt.toISOString() : null,
        completedAt: row.completedAt instanceof Date ? row.completedAt.toISOString() : null,
        outcome: row.status === "queued" ? null : row.outcome || null,
      };
    }
    if (method === "application.aiQueue") return queueStatus();
    // Admin only (not in the staff permission map): score every application that has none yet.
    if (method === "application.aiReviewBackfill") return { queued: await backfill() };
    // application.aiReviewRerun
    const ids = (Array.isArray(params.applicationIds) ? params.applicationIds : [params.applicationId]).map((value: unknown) => (typeof value === "string" ? value.trim().slice(0, 120) : "")).filter(Boolean);
    if (!ids.length || ids.length > 100 || new Set(ids).size !== ids.length) throw new DomainError("INVALID_REQUEST", "Choose up to 100 applications.");
    return transact(key, actor, { method, params }, async session => {
      const rows = await applications.find({ _id: { $in: ids }, resumeAttachmentId: { $type: "string", $ne: "" } }, { session, projection: { resumeAttachmentId: 1 } }).toArray();
      for (const row of rows) await enqueue(row._id, String(row.resumeAttachmentId), session);
      return { queued: rows.length, skipped: ids.length - rows.length };
    });
  }

  return { initialize, enqueue, process, backfill, supports: (method: string) => methods.has(method), execute };
}
export type AiReviews = ReturnType<typeof createAiReviews>;

/** Object storage hiccups are worth a retry; anything else is reported. */
const isStorageError = (error: unknown) => /storage|ECONN|ETIMEDOUT|socket|network/i.test(String((error as Error)?.message || ""));

export const isRecommendation = (value: unknown): value is typeof RECOMMENDATIONS[number] => typeof value === "string" && (RECOMMENDATIONS as readonly string[]).includes(value);
