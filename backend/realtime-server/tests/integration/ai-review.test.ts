import { afterAll, beforeAll, expect, test } from "bun:test";
import { createHash, randomUUID } from "node:crypto";
import { internshipTestMongoUri } from "./config";
import { connectInternDatabase, createInternshipDomain } from "./domain";
import { TransientAiError } from "../../src/modules/ai-review/groq";
import { AI_MAX_ATTEMPTS, type AiWorkerDeps } from "../../src/modules/ai-review/ai-review.service";
import type { ReviewOutcome } from "../../src/modules/ai-review/review";

const uri = internshipTestMongoUri();
if (!uri) throw new Error("Set INTERNSHIP_TEST_MONGODB_URI for isolated internship integration tests.");
const prefix = `test_intern_ai_${randomUUID().replaceAll("-", "")}_`;
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
let connection: Awaited<ReturnType<typeof connectInternDatabase>>;
let domain: ReturnType<typeof createInternshipDomain>;
const admin = { id: "ai-admin", role: "company", staffRole: "admin", name: "Admin", email: "ai-admin@example.test", applicationId: null, sessionVersion: 1 } as any;
const reviewer = { id: "ai-reviewer", role: "company", staffRole: "recruiter", name: "Reviewer", email: "ai-reviewer@example.test", applicationId: null, sessionVersion: 1, permissions: ["applications.read", "applications.review"] } as any;
const viewer = { ...reviewer, id: "ai-viewer", email: "ai-viewer@example.test", permissions: ["applications.read"] } as any;

beforeAll(async () => {
  connection = await connectInternDatabase(uri!);
  domain = createInternshipDomain({ ...connection, prefix });
  domain.setHooks({ async sendApplicationConfirmation() {}, async sendMagicLink() {} } as any);
  await domain.initialize();
  await domain.collection("programs").updateOne({ _id: "software-engineer" }, { $set: { enabled: true, fee: 0, stipend: 0 } });
  await domain.collection("settings").updateOne({ _id: "program" }, { $set: { programEnabled: true } });
  // Writes check the staff account still exists, as in production.
  await domain.collection("accounts").insertMany([admin, reviewer, viewer].map(({ id, ...person }) => ({ _id: id, role: "company", staffRole: person.staffRole, name: person.name, email: person.email, sessionVersion: 1 })));
}, 20000);
afterAll(async () => {
  if (!connection) return;
  const names = await connection.db.listCollections({}, { nameOnly: true }).toArray();
  for (const { name } of names) if (name.startsWith(prefix)) await connection.db.collection(name).drop();
  await connection.client.close();
}, 20000);

async function apply(tag: string) {
  const fileId = `FILE-${randomUUID()}`, fileToken = randomUUID(), email = `ai-${tag}-${randomUUID().slice(0, 8)}@example.test`;
  await domain.collection("files").insertOne({ _id: fileId, kind: "resume", status: "ready", name: "resume.pdf", accessTokenHash: digest(fileToken) });
  const result = await domain.execute("application.submit", { name: "Alex Morgan", email, linkedin: `https://www.linkedin.com/in/ai-${tag}`, programId: "software-engineer", schedule: "part_time", skills: ["React"], resumeAttachmentId: fileId, resumeAccessToken: fileToken }, null, `ai-apply-${randomUUID()}`) as any;
  return { applicationId: String(result.applicationId), fileId, email };
}
const outcome = (score: number | null, status: "done" | "manual" = "done", recommendation: ReviewOutcome["recommendation"] = "Recommended"): ReviewOutcome => ({
  status, recommendation, score, reason: status === "manual" ? "Unreadable" : "",
  extraction: { method: "text", pages: 1, characters: 900, warnings: [] }, result: null, model: "fake-model", promptVersion: "test",
});
const deps = (analyze: AiWorkerDeps["analyze"]): AiWorkerDeps => ({ readFile: async () => new Uint8Array([1, 2, 3]), analyze });
const queueRow = (id: string) => domain.collection("ai_reviews").findOne({ _id: id });
const application = (id: string) => domain.collection("applications").findOne({ _id: id });
/** Runs the worker until this application's job is no longer due. */
async function drain(applicationId: string, worker: AiWorkerDeps) {
  for (let i = 0; i < 20; i++) {
    const row = await queueRow(applicationId);
    if (!row || row.status !== "queued" || row.nextAttemptAt > new Date()) return;
    await domain.aiReviews.process(worker, 5);
  }
}

test("applying queues one AI review in the same transaction and the worker fills the AI columns", async () => {
  const { applicationId } = await apply("done");
  expect(await domain.collection("ai_reviews").countDocuments({ _id: applicationId })).toBe(1);
  expect(await application(applicationId)).toMatchObject({ aiReviewStatus: "pending" });
  expect(await domain.execute("application.aiReview", { applicationId }, viewer)).toMatchObject({ status: "pending", outcome: null });

  let seen: any;
  await drain(applicationId, deps(async (file, applicant) => { seen = { file, applicant }; return outcome(7.4); }));
  expect(seen.applicant).toMatchObject({ name: "Alex Morgan", program: "Software Engineer Intern", skills: ["React"], linkedin: true });
  expect(seen.file.name).toBe("resume.pdf");
  expect(await application(applicationId)).toMatchObject({ aiReviewStatus: "done", aiScore: 7.4, aiRecommendation: "Recommended" });
  expect(await domain.execute("application.aiReview", { applicationId }, viewer)).toMatchObject({ status: "done", outcome: { score: 7.4, model: "fake-model" } });
  expect(await domain.collection("events").findOne({ type: "application.aiReviewed", applicationIds: applicationId })).not.toBeNull();

  // Staff can filter and sort by the AI result; the applicant never sees it.
  const listed = await domain.execute("application.list", { aiRecommendation: "Recommended", sortField: "aiScore", facets: true }, viewer) as any;
  expect(listed.items.map((row: any) => row.id)).toContain(applicationId);
  expect(listed.counts.aiRecommendations.Recommended).toBeGreaterThanOrEqual(1);
  const own = await domain.execute("application.get", { id: applicationId }, { id: "ai-applicant", role: "intern", name: "Alex", email: "a@example.test", applicationId, sessionVersion: 1 } as any) as any;
  for (const field of ["aiScore", "aiRecommendation", "aiReviewStatus", "aiReviewedOn"]) expect(own[field]).toBeUndefined();
});

test("a resume still being scanned waits; a blocked or missing one goes to manual review", async () => {
  const scanning = await apply("scan");
  await domain.collection("files").updateOne({ _id: scanning.fileId }, { $set: { status: "pending" } });
  let calls = 0;
  await domain.aiReviews.process(deps(async () => { calls++; return outcome(8); }), 5);
  expect(calls).toBe(0);
  expect(await queueRow(scanning.applicationId)).toMatchObject({ status: "queued", attempts: 0 });
  expect((await queueRow(scanning.applicationId))!.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());

  const blocked = await apply("blocked");
  await domain.collection("files").updateOne({ _id: blocked.fileId }, { $set: { status: "rejected" } });
  await drain(blocked.applicationId, deps(async () => outcome(8)));
  expect(await application(blocked.applicationId)).toMatchObject({ aiReviewStatus: "manual", aiRecommendation: "Needs manual review" });
  expect((await application(blocked.applicationId))!.aiScore).toBeUndefined();
});

test("rate limits only delay a review and never use up its attempts", async () => {
  const { applicationId } = await apply("ratelimit");
  const limited = deps(async () => { throw new TransientAiError("Groq returned HTTP 429.", 15_000, true); });
  for (let round = 0; round < AI_MAX_ATTEMPTS + 2; round++) {
    await domain.aiReviews.process(limited, 5);
    const row = await queueRow(applicationId);
    expect(row).toMatchObject({ status: "queued", attempts: 0 });
    expect(row!.nextAttemptAt.getTime()).toBeGreaterThan(Date.now() + 10_000);
    // While paused, the worker leaves every other resume alone.
    let touched = false;
    await domain.aiReviews.process(deps(async () => { touched = true; return outcome(5); }), 5);
    expect(touched).toBe(false);
    domain.aiReviews.clearRateLimitPause();
    await domain.collection("ai_reviews").updateOne({ _id: applicationId }, { $set: { nextAttemptAt: new Date(0) } });
  }
  expect(await application(applicationId)).toMatchObject({ aiReviewStatus: "pending" });
  await drain(applicationId, deps(async () => outcome(7)));
  expect(await application(applicationId)).toMatchObject({ aiReviewStatus: "done", aiScore: 7 });
});

test("server errors are retried with backoff, then the review goes to a person", async () => {
  const { applicationId } = await apply("retry");
  const failing = deps(async () => { throw new TransientAiError("Groq returned HTTP 503.", 1000); });
  for (let attempt = 1; attempt < AI_MAX_ATTEMPTS; attempt++) {
    await domain.aiReviews.process(failing, 5);
    const row = await queueRow(applicationId);
    expect(row).toMatchObject({ status: "queued", attempts: attempt });
    expect(row!.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
    await domain.collection("ai_reviews").updateOne({ _id: applicationId }, { $set: { nextAttemptAt: new Date(0) } });
  }
  await domain.aiReviews.process(failing, 5);
  expect(await queueRow(applicationId)).toMatchObject({ status: "manual" });
  expect(await application(applicationId)).toMatchObject({ aiReviewStatus: "manual", aiRecommendation: "Needs manual review" });
});

test("reviewers can re-run a review; read-only staff cannot; a re-run mid-review wins", async () => {
  const { applicationId } = await apply("rerun");
  await drain(applicationId, deps(async () => outcome(4, "done", "Not recommended")));
  await expect(domain.execute("application.aiReviewRerun", { applicationIds: [applicationId] }, viewer, `ai-rerun-${randomUUID()}`)).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(domain.execute("application.aiReviewRerun", { applicationIds: Array.from({ length: 101 }, (_, i) => `OL-${i}`) }, admin, `ai-rerun-${randomUUID()}`)).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  expect(await domain.execute("application.aiReviewRerun", { applicationIds: [applicationId, "OL-missing"] }, reviewer, `ai-rerun-${randomUUID()}`)).toEqual({ queued: 1, skipped: 1 });
  expect(await application(applicationId)).toMatchObject({ aiReviewStatus: "pending" });
  expect((await application(applicationId))!.aiScore).toBeUndefined();

  // The resume is re-queued while the worker is still reviewing the old one: the stale result is dropped.
  await domain.aiReviews.process(deps(async () => {
    await domain.execute("application.aiReviewRerun", { applicationIds: [applicationId] }, reviewer, `ai-rerun-${randomUUID()}`);
    return outcome(9.5, "done", "Strongly recommended");
  }), 1);
  expect(await application(applicationId)).toMatchObject({ aiReviewStatus: "pending" });
  await drain(applicationId, deps(async () => outcome(6.6)));
  expect(await application(applicationId)).toMatchObject({ aiReviewStatus: "done", aiScore: 6.6, aiRecommendation: "Recommended" });
});

test("the backfill queues only applications that have a resume and no review yet", async () => {
  const reviewed = await apply("backfill-done");
  await drain(reviewed.applicationId, deps(async () => outcome(7)));
  const legacy = `OL-legacy-${randomUUID()}`;
  await domain.collection("applications").insertMany([
    { _id: legacy, name: "Legacy", email: `${legacy}@example.test`, resumeAttachmentId: "FILE-legacy", appliedOn: "2026-01-01", status: "Applied", version: 1 },
    { _id: `${legacy}-none`, name: "No resume", email: `${legacy}-none@example.test`, appliedOn: "2026-01-01", status: "Applied", version: 1 },
  ]);
  expect(await domain.aiReviews.backfill()).toBe(1);
  expect(await queueRow(legacy)).toMatchObject({ status: "queued", fileId: "FILE-legacy" });
  expect(await queueRow(`${legacy}-none`)).toBeNull();
  expect(await application(reviewed.applicationId)).toMatchObject({ aiReviewStatus: "done" });
});

test("admins can score every unscored application from the dashboard; other staff cannot", async () => {
  const fresh = `OL-unscored-${randomUUID()}`;
  await domain.collection("applications").insertOne({ _id: fresh, name: "Unscored", email: `${fresh}@example.test`, resumeAttachmentId: "FILE-unscored", appliedOn: "2026-01-01", status: "Applied", version: 1 });
  await expect(domain.execute("application.aiReviewBackfill", {}, reviewer, `ai-all-${randomUUID()}`)).rejects.toMatchObject({ code: "FORBIDDEN" });
  const { queued } = await domain.execute("application.aiReviewBackfill", {}, admin, `ai-all-${randomUUID()}`) as any;
  expect(queued).toBeGreaterThanOrEqual(1);
  expect(await queueRow(fresh)).toMatchObject({ status: "queued" });
  expect(await application(fresh)).toMatchObject({ aiReviewStatus: "pending" });
});

test("the live queue shows who is being reviewed, who is next and recent results", async () => {
  // Clear anything earlier tests left due, so the worker picks one of these two next.
  await domain.aiReviews.process(deps(async () => outcome(5)), 50);
  const first = await apply("live-a"), second = await apply("live-b");
  let snapshot: any;
  await domain.aiReviews.process(deps(async (_file, _applicant, progress) => {
    await progress("Scoring with AI");
    snapshot = await domain.execute("application.aiQueue", {}, viewer);
    return outcome(8.2, "done", "Strongly recommended");
  }), 1);
  const working = snapshot.processing.find((row: any) => row.applicationId === first.applicationId || row.applicationId === second.applicationId);
  expect(working).toMatchObject({ name: "Alex Morgan", step: "Scoring with AI" });
  expect(snapshot.queued).toBeGreaterThanOrEqual(2);
  expect(snapshot.next.length).toBeGreaterThanOrEqual(1);
  const after = await domain.execute("application.aiQueue", {}, viewer) as any;
  expect(after.processing).toEqual([]);
  expect(after.recent[0]).toMatchObject({ applicationId: working.applicationId, status: "done", score: 8.2, recommendation: "Strongly recommended" });
  expect(after.perMinute).toBeGreaterThan(0);
  expect(["off", "idle", "running", "rate-limited", "working"]).toContain(after.worker);
  expect((await queueRow(working.applicationId))!.step).toBeUndefined();
  await drain(first.applicationId, deps(async () => outcome(6)));
  await drain(second.applicationId, deps(async () => outcome(6)));
});
