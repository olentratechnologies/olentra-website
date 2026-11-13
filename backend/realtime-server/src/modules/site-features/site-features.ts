import type { Collection, Document } from "mongodb";
import { DomainError } from "../../shared/errors";
import type { Principal } from "../../shared/principal";

/**
 * Website feature switches, shared by the public website and the company
 * workspace (separate deployments that can't share files). The website reads
 * them; staff with website-control access save them. Each save is a
 * compare-and-set on `revision`, so concurrent saves can't overwrite each other.
 */
export const SITE_FEATURES_PATH = "/intern/site-features";
const MAX_BYTES = 16_384;

/** Owner (staff admin) or workspace administrator, matching the workspace rule. */
export const canControlWebsite = (account: Principal | null) =>
  account?.role === "company" && ((account as any).staffRole === "admin" || (Array.isArray((account as any).permissions) && (account as any).permissions.includes("workspace.administrator")));

/** Shape check only: the workspace owns the feature list and validates names. */
export function validateState(value: any) {
  if (!value || typeof value !== "object" || value.schemaVersion !== 1 || !Number.isInteger(value.revision) || value.revision < 0) throw new DomainError("INVALID_REQUEST", "Invalid website feature data.");
  if (!value.environments || typeof value.environments !== "object") throw new DomainError("INVALID_REQUEST", "Invalid website feature data.");
  for (const flags of Object.values(value.environments)) {
    if (!flags || typeof flags !== "object" || Object.values(flags as object).some(flag => typeof flag !== "boolean")) throw new DomainError("INVALID_REQUEST", "Feature switches must be on or off.");
  }
  if (JSON.stringify(value).length > MAX_BYTES) throw new DomainError("INVALID_REQUEST", "The website settings are too large.");
  return value;
}

export function createSiteFeatureStore(rows: Collection<Document & { _id: string }>) {
  return {
    async read() {
      const row = await rows.findOne({ _id: "site-features" });
      if (!row) return null;
      const { _id, ...state } = row;
      return state;
    },
    /** Saves `state` only if the stored revision still equals `expectedRevision`. */
    async write(state: any, expectedRevision: number) {
      validateState(state);
      if (state.revision !== expectedRevision + 1) throw new DomainError("INVALID_REQUEST", "The new revision must follow the current one.");
      const filter = expectedRevision === 0 ? { _id: "site-features", $or: [{ revision: 0 }, { revision: { $exists: false } }] } : { _id: "site-features", revision: expectedRevision };
      try {
        const result = await rows.replaceOne(filter as any, state, { upsert: expectedRevision === 0 });
        if (!result.matchedCount && !result.upsertedCount) throw new DomainError("CONFLICT", "The website settings changed. Refresh and try again.");
      } catch (error: any) {
        if (error?.code === 11000) throw new DomainError("CONFLICT", "The website settings changed. Refresh and try again.");
        throw error;
      }
      return state;
    },
  };
}
