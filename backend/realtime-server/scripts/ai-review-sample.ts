/**
 * Runs the AI resume review on one local file and prints the result.
 * No database is touched. Use sample or demo resumes, not real applicants'.
 *
 *   GROQ_API_KEY=… bun scripts/ai-review-sample.ts path/to/resume.pdf ["Applicant Name"] [email]
 */
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { createGroq } from "../src/modules/ai-review/groq";
import { analyzeResume } from "../src/modules/ai-review/review";

const [path, name = "Alex Morgan", email = ""] = process.argv.slice(2);
const apiKey = process.env.GROQ_API_KEY?.trim();
if (!path || !apiKey) {
  console.error("Usage: GROQ_API_KEY=… bun scripts/ai-review-sample.ts <resume.pdf|.docx|.doc> [name] [email]");
  process.exit(1);
}
const groq = createGroq({ apiKey, reviewModel: process.env.GROQ_REVIEW_MODEL || undefined, visionModel: process.env.GROQ_VISION_MODEL || undefined });
const started = Date.now();
const outcome = await analyzeResume(
  { bytes: new Uint8Array(await readFile(path)), name: basename(path) },
  { name, email, program: "Software Engineer Intern", skills: [], linkedin: true, github: false, video: false },
  groq,
);
console.log(JSON.stringify({ ...outcome, seconds: Math.round((Date.now() - started) / 100) / 10 }, null, 2));
