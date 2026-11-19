/** Idempotently migrate the internship database to Software Engineer Intern. */
import { connectInternDatabase } from "../src/infrastructure/database/client";
import { migrateLegacyPrograms, PROGRAM_ID, PROGRAM_NAME } from "../src/modules/programs/legacy-program-migration";

async function migrate() {
  const uri = process.env.INTERNSHIP_MONGODB_URI || process.env.INTERN_TEST_MONGODB_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error("Set INTERNSHIP_MONGODB_URI to run this migration");
  const { client, db } = await connectInternDatabase(uri);
  try {
    const collection = (name: string) => db.collection(`intern_${name}`) as any;
    await collection("programs").updateOne(
      { _id: PROGRAM_ID },
      { $setOnInsert: { name: PROGRAM_NAME, fee: null, stipend: null, enabled: false } },
      { upsert: true },
    );
    await migrateLegacyPrograms(collection);
    console.log("Migrated legacy internship records to Software Engineer Intern.");
  } finally {
    await client.close();
  }
}

migrate().catch(error => {
  console.error("Migration failed:", error);
  process.exitCode = 1;
});
