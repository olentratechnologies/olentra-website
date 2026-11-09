import type { ClientSession } from "mongodb";

/** Shared transaction callback shape used by write-oriented domain modules. */
export type TransactionCallback<T> = (session: ClientSession) => Promise<T>;
