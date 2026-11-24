/**
 * Idempotently import a Markdown plan for one existing project.
 *
 *   bun scripts/import-project-plan.ts --name "Multi-Vendor AI Orchestration" --file plan.md
 *     Dry run: lists matching projects (id, name, description) and the plan state. Writes nothing.
 *
 *   bun scripts/import-project-plan.ts --name "..." --file plan.md --project-id PRJ-... --write
 *     Writes the plan to that project after checking its name still matches. Re-running with the
 *     same text is a no-op; a different existing plan is reported as a conflict and left untouched.
 */
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { connectInternDatabase } from "../src/infrastructure/database/client";

function arg(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? "" : String(process.argv[index + 1] || "");
}

async function run() {
  const name = arg("name").trim(), file = arg("file"), projectId = arg("project-id"), write = process.argv.includes("--write");
  if (!name || !file) throw new Error("Pass --name <project name> and --file <plan.md>.");
  const markdown = readFileSync(file, "utf8").replace(/\r\n?/g, "\n");
  if (!markdown.trim()) throw new Error("The plan file is empty.");
  if (markdown.length > 100_000) throw new Error(`The plan has ${markdown.length} characters; the limit is 100,000.`);
  const uri = process.env.INTERNSHIP_MONGODB_URI || process.env.INTERN_TEST_MONGODB_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error("Set INTERNSHIP_MONGODB_URI to run this import.");
  const { client, db } = await connectInternDatabase(uri);
  try {
    const projects = db.collection<any>("intern_projects"), plans = db.collection<any>("intern_project_plans");
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matches = await projects.find({ name: { $regex: `^\\s*${escaped}\\s*$`, $options: "i" } }).project({ _id: 1, name: 1, description: 1, team: 1 }).toArray();
    const existing = new Map((await plans.find({ _id: { $in: matches.map(project => project._id) } }).toArray()).map(plan => [plan._id, plan]));
    console.log(`${matches.length} project(s) named "${name}":`);
    for (const project of matches) {
      const plan = existing.get(project._id);
      const state = !plan?.markdown ? "no plan" : plan.markdown === markdown ? "same plan already saved" : `different plan saved (revision ${plan.revision})`;
      console.log(`- ${project._id}: ${project.name}\n  description: ${project.description}\n  plan: ${state}`);
    }
    if (!matches.length) throw new Error("No project has that name.");
    if (!projectId) {
      if (matches.length > 1) console.log("\nConflict: several projects match. Choose one with --project-id.");
      console.log(`\nDry run only. Check the description above, then re-run with --project-id ${matches.length === 1 ? matches[0]._id : "<id>"} --write.`);
      return;
    }
    const target = matches.find(project => project._id === projectId);
    if (!target) throw new Error(`${projectId} is not one of the projects named "${name}".`);
    const plan = existing.get(projectId);
    if (plan?.markdown === markdown) { console.log(`\n${projectId} already has this plan. Nothing to do.`); return; }
    if (plan?.markdown) throw new Error(`Conflict: ${projectId} already has a different plan (revision ${plan.revision}). Nothing was written.`);
    if (!write) { console.log(`\nDry run: would save ${markdown.length} characters to ${projectId}. Add --write to save.`); return; }
    const revision = (plan?.revision ?? 0) + 1;
    // Only write when the plan is still empty, so a manager's concurrent save is never overwritten.
    const saved = await plans.updateOne({ _id: projectId, revision: plan?.revision ?? { $exists: false } }, { $set: { markdown, revision } }, { upsert: true }).catch(error => {
      if (error?.code === 11000) throw new Error(`Conflict: ${projectId}'s plan changed during the import. Nothing was written.`);
      throw error;
    });
    if (!saved.upsertedCount && !saved.modifiedCount) throw new Error(`Conflict: ${projectId}'s plan changed during the import. Nothing was written.`);
    await projects.updateOne({ _id: projectId }, { $set: { hasPlan: true } });
    await db.collection<any>("intern_events").insertOne({ _id: randomUUID(), type: "project.plan.save", applicationIds: target.team || [], createdAt: new Date() });
    const check = await plans.findOne({ _id: projectId });
    if (check?.markdown !== markdown) throw new Error("The saved plan does not match the file. Check the project before retrying.");
    console.log(`\nSaved ${markdown.length} characters to ${projectId} (revision ${revision}). Read-back matches the file exactly.`);
  } finally {
    await client.close();
  }
}

run().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
