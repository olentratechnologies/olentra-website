import { MongoClient, type Db } from "mongodb";

/** Creates the service-owned MongoDB connection with the production pool limits. */
export async function connectInternDatabase(uri: string): Promise<{ client: MongoClient; db: Db }> {
  const client = new MongoClient(uri, {
    maxPoolSize: 50,
    maxConnecting: 10,
    waitQueueTimeoutMS: 30_000,
    serverSelectionTimeoutMS: 15_000,
  });
  await client.connect();
  return { client, db: client.db() };
}
