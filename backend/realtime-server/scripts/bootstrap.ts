import { internshipEnv, internshipMongoUri } from "../src/config/env";
import { connectInternDatabase, createInternshipDomain } from "../src/app/command-dispatcher";
const uri = internshipMongoUri();
const email = internshipEnv("INTERNSHIP_TEST_STAFF_EMAIL", "INTERN_TEST_STAFF_EMAIL");
const password = internshipEnv("INTERNSHIP_TEST_STAFF_PASSWORD", "INTERN_TEST_STAFF_PASSWORD");
if (!uri || !email || !password) throw new Error("Set INTERNSHIP_MONGODB_URI, INTERNSHIP_TEST_STAFF_EMAIL, and INTERNSHIP_TEST_STAFF_PASSWORD in the local environment.");
const connection = await connectInternDatabase(uri);
try {
  const domain = createInternshipDomain(connection);
  await domain.initialize();
  await domain.createTestStaff(email, password);
  console.info("Internship staff test account created.");
} finally { await connection.client.close(); }
