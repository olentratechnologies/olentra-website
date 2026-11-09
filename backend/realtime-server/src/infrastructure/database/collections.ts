import type { Collection, Document } from "mongodb";

/** Mongo records are intentionally service-local; collection names are not public API. */
export type InternshipRow = Document & { _id: string };
export type CollectionFactory = (name: string) => Collection<InternshipRow>;
