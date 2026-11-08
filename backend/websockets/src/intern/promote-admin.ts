import { connectInternDatabase, createInternshipDomain } from "./domain";

const uri = process.env.MONGODB_URI || process.env.MONGODB;
const email = process.env.INTERN_INITIAL_ADMIN_EMAIL;
if (!uri || !email) throw new Error("Set the internship MongoDB connection and INTERN_INITIAL_ADMIN_EMAIL for the existing staff account.");
const connection = await connectInternDatabase(uri);
try {
  const domain = createInternshipDomain(connection);
  await domain.initialize();
  await domain.bootstrapFirstAdmin(email);
  console.info("The specified internship staff account is the initial admin.");
} finally { await connection.client.close(); }
