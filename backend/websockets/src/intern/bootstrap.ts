import { connectInternDatabase, createInternshipDomain } from "./domain";
const uri = process.env.MONGODB_URI || process.env.MONGODB;
const email = process.env.INTERN_TEST_STAFF_EMAIL;
const password = process.env.INTERN_TEST_STAFF_PASSWORD;
if (!uri || !email || !password) throw new Error("Set MONGODB, INTERN_TEST_STAFF_EMAIL, and INTERN_TEST_STAFF_PASSWORD in the local environment.");
const connection = await connectInternDatabase(uri);
try {
  const domain = createInternshipDomain(connection);
  await domain.initialize();
  await domain.createTestStaff(email, password);
  console.info("Internship staff test account created.");
} finally { await connection.client.close(); }
