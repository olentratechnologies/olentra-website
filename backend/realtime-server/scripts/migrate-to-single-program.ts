/**
 * Migration script to remove Tech Explorer and Tech Innovator tracks
 * and consolidate to a single Software Engineer Intern program.
 *
 * Run with: bun scripts/migrate-to-single-program.ts
 *
 * This script:
 * 1. Deletes the "explorer" and "innovator" program documents
 * 2. Updates all applications with programId "explorer" or "innovator" to "software-engineer"
 * 3. Updates program names in certificates
 * 4. Ensures "software-engineer" program exists
 */

import { connectInternDatabase } from "../src/infrastructure/database/client";
import { id } from "../src/shared/id";

async function migrate() {
  const uri = process.env.INTERNSHIP_MONGODB_URI || process.env.INTER_TEST_MONGODB_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error("Set INTERNSHIP_MONGODB_URI to run this migration");
  const { client, db } = await connectInternDatabase(uri);

  const programs = db.collection("programs");
  const applications = db.collection("applications");
  const certificates = db.collection("certificates");
  const projects = db.collection("projects");

  console.log("Starting migration to single Software Engineer Intern program...");

  // Check current state
  const explorerProgram = await programs.findOne({ _id: "explorer" });
  const innovatorProgram = await programs.findOne({ _id: "innovator" });
  const softwareEngineerProgram = await programs.findOne({ _id: "software-engineer" });

  console.log("Current programs:");
  console.log("  - explorer:", explorerProgram ? "exists" : "not found");
  console.log("  - innovator:", innovatorProgram ? "exists" : "not found");
  console.log("  - software-engineer:", softwareEngineerProgram ? "exists" : "not found");

  // Update applications from explorer/innovator to software-engineer
  const applicationUpdate = await applications.updateMany(
    { programId: { $in: ["explorer", "innovator"] } },
    { $set: { programId: "software-engineer", program: "Software Engineer Intern" } }
  );
  console.log(`Updated ${applicationUpdate.modifiedCount} applications to software-engineer`);

  // Update certificates
  const certificateUpdate = await certificates.updateMany(
    { programId: { $in: ["explorer", "innovator"] } },
    { $set: { programId: "software-engineer", program: "Software Engineer Intern" } }
  );
  console.log(`Updated ${certificateUpdate.modifiedCount} certificates to software-engineer`);

  // Update projects
  const projectUpdate = await projects.updateMany(
    { program: { $in: ["Software Engineer Intern - Tech Explorer", "Software Engineer Intern - Tech Innovator", "Tech Explorer", "Tech Innovator"] } },
    { $set: { program: "Software Engineer Intern" } }
  );
  console.log(`Updated ${projectUpdate.modifiedCount} projects to Software Engineer Intern`);

  // Delete old programs
  if (explorerProgram) {
    await programs.deleteOne({ _id: "explorer" });
    console.log("Deleted explorer program");
  }
  if (innovatorProgram) {
    await programs.deleteOne({ _id: "innovator" });
    console.log("Deleted innovator program");
  }

  // Ensure software-engineer program exists
  if (!softwareEngineerProgram) {
    await programs.updateOne(
      { _id: "software-engineer" },
      { $setOnInsert: { name: "Software Engineer Intern", fee: null, stipend: null, enabled: false } },
      { upsert: true }
    );
    console.log("Created software-engineer program");
  }

  console.log("Migration complete!");
  await client.close();
}

migrate().catch(error => {
  console.error("Migration failed:", error);
  process.exit(1);
});
