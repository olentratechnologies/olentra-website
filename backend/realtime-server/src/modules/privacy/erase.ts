import { GridFSBucket, type ClientSession, type Collection, type Db, type MongoClient } from "mongodb";
import { DomainError } from "../../shared/errors";

type Row = Record<string, any> & { _id: any };

/**
 * Permanently removes one applicant: their application, account, sign-in data,
 * internship records, messages, uploads and queued emails. Projects are kept
 * but no longer list them. Database rows go in one transaction; stored file
 * bytes are deleted after it commits. Returns how many rows each area lost.
 */
export async function eraseApplicant({ db, client, prefix, applicationId, beforeCommit }: {
  db: Db; client: MongoClient; prefix: string; applicationId: string;
  /** Runs inside the transaction (used to write the audit row). */
  beforeCommit?: (session: ClientSession, application: Row) => Promise<void>;
}) {
  const c = (name: string) => db.collection<any>(prefix + name);
  const session = client.startSession();
  const removed: Record<string, number> = {};
  let gridIds: unknown[] = [];
  try {
    await session.withTransaction(async () => {
      for (const key of Object.keys(removed)) delete removed[key];
      const opts = { session };
      const application = await c("applications").findOne({ _id: applicationId }, opts);
      if (!application) throw new DomainError("NOT_FOUND", "Application not found.");
      if (await c("interns").findOne({ applicationId, status: "Active" }, opts)) throw new DomainError("CONFLICT", "End this internship before erasing the applicant's data.");
      const email = String(application.email || "").toLowerCase();
      const accountIds = (await c("accounts").find({ applicationId, role: "intern" }, { ...opts, projection: { _id: 1 } }).toArray()).map(row => row._id);
      const internIds = (await c("interns").find({ applicationId }, { ...opts, projection: { _id: 1 } }).toArray()).map(row => row._id);
      const uploads = await c("files").find({ $or: [{ applicationId }, { ownerApplicationId: applicationId }] }, { ...opts, projection: { gridId: 1, storage: 1 } }).toArray();
      gridIds = uploads.map(row => row.gridId).filter(Boolean);
      const wipe = async (name: string, filter: Record<string, unknown>) => { removed[name] = (await c(name).deleteMany(filter, opts)).deletedCount; };
      await wipe("applications", { _id: applicationId });
      await wipe("accounts", { _id: { $in: accountIds } });
      await wipe("test_credentials", { userId: { $in: accountIds } });
      await wipe("sessions", { userId: { $in: accountIds } });
      await wipe("notification_reads", { accountId: { $in: accountIds } });
      for (const name of ["offers", "offer_versions", "onboarding", "interns", "tasks", "submissions", "messages", "notifications", "stories", "interviews", "activity", "reviews", "checkins", "feedback", "resource_progress"]) await wipe(name, { applicationId });
      await wipe("certificates", { $or: [{ applicationId }, { internId: { $in: internIds } }] });
      // OCI bytes are deleted by the durable cleanup worker after commit.
      await c("files").updateMany({ _id: { $in: uploads.filter(row => row.storage === "oci").map(row => row._id) } }, { $set: { status: "deleting" }, $unset: { applicationId: "", ownerApplicationId: "", accessTokenHash: "", name: "", type: "", size: "" } }, opts);
      await wipe("files", { _id: { $in: uploads.filter(row => row.storage !== "oci").map(row => row._id) } });
      await wipe("outbox", { $or: [{ "payload.applicationId": applicationId }, ...(email ? [{ "payload.to": email }] : [])] });
      await wipe("events", { applicationIds: applicationId });
      // Saved request results (kept a week for safe retries) can echo the application.
      await wipe("commands", { $or: [{ "result.id": applicationId }, { "result.applicationId": applicationId }] });
      removed.projects = (await c("projects").updateMany({ team: applicationId }, { $pull: { team: applicationId } } as any, opts)).modifiedCount;
      await beforeCommit?.(session, application);
    });
  } finally {
    await session.endSession();
  }
  const bucket = new GridFSBucket(db, { bucketName: prefix + "uploads" });
  for (const gridId of gridIds) await bucket.delete(gridId as any).catch(() => undefined);
  return removed;
}

export const FINAL_STATUSES = ["Rejected", "Declined", "Withdrawn"];

/** Applications whose final status (rejected, declined or withdrawn) is older than `days`. */
export async function expiredApplicationIds(applications: Collection<Row>, days: number, now = Date.now(), limit = 100) {
  const cutoff = new Date(now - days * 86_400_000).toISOString();
  const rows = await applications.find({ status: { $in: FINAL_STATUSES }, statusChangedOn: { $lt: cutoff } }, { projection: { _id: 1 }, limit }).toArray();
  return rows.map(row => String(row._id));
}
