/**
 * Queues an AI resume review for every application that has a resume but was
 * never reviewed. Run once after the first deploy; the server's worker then
 * reviews them one at a time.
 *
 *   bun scripts/ai-review-backfill.ts
 */
import { internshipMongoUri } from "../src/config/env";
import { connectInternDatabase, createInternshipDomain } from "../src/app/command-dispatcher";

const uri = internshipMongoUri();
if (!uri) throw new Error("Set INTERNSHIP_MONGODB_URI.");
const connection = await connectInternDatabase(uri);
try {
  const domain = createInternshipDomain(connection);
  await domain.initialize();
  const queued = await domain.aiReviews.backfill();
  console.info(`Queued ${queued} application${queued === 1 ? "" : "s"} for AI resume review.`);
} finally { await connection.client.close(); }
