import type { Collection, Document, GridFSBucket } from "mongodb";

export const ORPHAN_AGE_MS = 24 * 60 * 60_000;

/**
 * Deletes uploads that were never attached to anything: anonymous resume
 * uploads with no application and no owner, older than a day. Files that
 * belong to an applicant or intern are never touched here.
 */
export async function removeOrphanedUploads(files: Collection<Document & { _id: string }>, bucket: GridFSBucket, now = Date.now(), limit = 200) {
  const orphans = await files.find({
    applicationId: { $exists: false },
    ownerApplicationId: { $exists: false },
    createdAt: { $lt: new Date(now - ORPHAN_AGE_MS) },
  }, { projection: { gridId: 1 }, limit }).toArray();
  let removed = 0;
  for (const orphan of orphans) {
    // Remove the record first, and only if it is still unattached, so an
    // application submitted at this moment keeps its resume.
    const { deletedCount } = await files.deleteOne({ _id: orphan._id, applicationId: { $exists: false }, ownerApplicationId: { $exists: false } });
    if (!deletedCount) continue;
    removed++;
    try { await bucket.delete(orphan.gridId); }
    catch (error: any) { if (!/not found|FileNotFound/i.test(String(error?.message))) throw error; }
  }
  return removed;
}
