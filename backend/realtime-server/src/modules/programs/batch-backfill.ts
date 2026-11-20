import type { Collection, Document } from "mongodb";

/** The intake that was open when batches were introduced. */
export const INITIAL_BATCH = "Batch 1";

/** Batch names that were later renamed; old name → new name. */
export const RENAMED_BATCHES: Record<string, string> = { "Batch 2026-1": INITIAL_BATCH };

type Row = Document & { _id: string };
type CollectionOf = (name: string) => Collection<Row>;

const missing = { $or: [{ batch: { $exists: false } }, { batch: null }, { batch: "" }] };

/**
 * Idempotently applies batch renames, files records created before batches
 * existed under the first batch, and makes it the current batch if none is
 * configured yet.
 */
export async function backfillBatches(collection: CollectionOf) {
  const settings = collection("settings");
  for (const [from, to] of Object.entries(RENAMED_BATCHES)) {
    await Promise.all([
      collection("applications").updateMany({ batch: from }, { $set: { batch: to } }),
      collection("interns").updateMany({ batch: from }, { $set: { batch: to } }),
      collection("staff_views").updateMany({ "filters.batch": from }, { $set: { "filters.batch": to } }),
      settings.updateOne({ _id: "program", defaultBatch: from }, { $set: { defaultBatch: to } }),
    ]);
  }
  await settings.updateOne({ _id: "program", $or: [{ defaultBatch: { $exists: false } }, { defaultBatch: null }, { defaultBatch: "" }] }, { $set: { defaultBatch: INITIAL_BATCH } });
  await Promise.all([
    collection("applications").updateMany(missing, { $set: { batch: INITIAL_BATCH } }),
    collection("interns").updateMany(missing, { $set: { batch: INITIAL_BATCH } }),
  ]);
}
