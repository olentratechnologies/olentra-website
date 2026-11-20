import type { Collection, Document } from "mongodb";

/** The intake that was open when batches were introduced. */
export const INITIAL_BATCH = "Batch 2026-1";

type Row = Document & { _id: string };
type CollectionOf = (name: string) => Collection<Row>;

const missing = { $or: [{ batch: { $exists: false } }, { batch: null }, { batch: "" }] };

/**
 * Idempotently files records created before batches existed under the first
 * batch, and makes it the current batch if none is configured yet.
 */
export async function backfillBatches(collection: CollectionOf) {
  const settings = collection("settings");
  await settings.updateOne({ _id: "program", $or: [{ defaultBatch: { $exists: false } }, { defaultBatch: null }, { defaultBatch: "" }] }, { $set: { defaultBatch: INITIAL_BATCH } });
  await Promise.all([
    collection("applications").updateMany(missing, { $set: { batch: INITIAL_BATCH } }),
    collection("interns").updateMany(missing, { $set: { batch: INITIAL_BATCH } }),
  ]);
}
