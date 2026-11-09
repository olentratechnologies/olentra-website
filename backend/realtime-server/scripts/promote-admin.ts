import { internshipEnv, internshipMongoUri } from "../src/config/env";
import { connectInternDatabase, createInternshipDomain } from "../src/app/command-dispatcher";

const uri = internshipMongoUri();
const email = internshipEnv("INTERNSHIP_INITIAL_ADMIN_EMAIL", "INTERN_INITIAL_ADMIN_EMAIL");
if (!uri || !email) throw new Error("Set INTERNSHIP_MONGODB_URI and INTERNSHIP_INITIAL_ADMIN_EMAIL for the existing staff account.");
const connection = await connectInternDatabase(uri);
try {
  const domain = createInternshipDomain(connection);
  await domain.initialize();
  await domain.bootstrapFirstAdmin(email);
  console.info("The specified internship staff account is the initial admin.");
} finally { await connection.client.close(); }
