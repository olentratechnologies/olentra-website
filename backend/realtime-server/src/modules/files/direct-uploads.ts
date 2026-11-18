import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Collection, Document } from "mongodb";
import type { ObjectStore } from "../../infrastructure/files/oci.store";
import { DomainError } from "../../shared/errors";
import { matchesSignature } from "./file-types";
import type { FileKind } from "./file-types";

export type UploadRow = Document & { _id: string };
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export const uploadTopic = (id: string) => `intern:upload:${id}`;
const forbidden = () => new DomainError("FORBIDDEN", "File access denied.");

/** File rows double as a durable queue, avoiding a database/queue dual-write gap. */
export function createDirectUploads({ files, store, scan, notify = () => {}, now = Date.now }: {
  files: Collection<UploadRow>; store: ObjectStore; scan: (bytes: Uint8Array) => Promise<boolean>;
  notify?: (id: string, status: string) => void | Promise<void>; now?: () => number;
}) {
  const visible = (row: UploadRow) => ({ id: row._id, name: row.name, type: row.type, size: row.size, status: row.status });
  const access = async (id: string, token: string, owner?: string) => {
    const row = await files.findOne({ _id: id, storage: "oci" });
    if (!row || !((token && token.length <= 128 && digest(token) === row.accessTokenHash) || (owner && row.ownerApplicationId === owner))) throw forbidden();
    return row;
  };
  return {
    async initialize() { await files.createIndex({ storage: 1, status: 1, nextAttemptAt: 1, leaseUntil: 1 }); },
    async begin(input: { name: string; kind: FileKind; type: string; size: number; ownerApplicationId?: string }) {
      const id = randomUUID(), accessToken = randomBytes(32).toString("base64url"), at = now();
      const row: UploadRow = { _id: id, ...input, storage: "oci", objectKey: `quarantine/${id}`, status: "uploading", accessTokenHash: digest(accessToken), createdAt: new Date(at), uploadExpiresAt: new Date(at + 300_000), nextAttemptAt: new Date(at + 330_000), attempts: 0, leaseUntil: null };
      await files.insertOne(row);
      const par = await store.issue(row.objectKey, row.uploadExpiresAt);
      const updated = await files.updateOne({ _id: id, status: "uploading" }, { $set: { parId: par.id } });
      if (!updated.matchedCount) { await store.revoke(par.id); throw new Error("Upload intent disappeared"); }
      return { ...visible(row), accessToken, uploadUrl: par.url, expiresAt: row.uploadExpiresAt.getTime() };
    },
    async status(id: string, token: string, owner?: string) { return visible(await access(id, token, owner)); },
    async complete(id: string, token: string, owner?: string) {
      const row = await access(id, token, owner);
      await files.updateOne({ _id: id, status: "uploading" }, { $set: { status: "pending", nextAttemptAt: new Date(now()) } });
      return { ...visible(row), status: row.status === "uploading" ? "pending" : row.status };
    },
    async process(limit = 4) {
      for (let count = 0; count < limit; count++) {
        const at = now(), leaseId = randomUUID();
        const row = await files.findOneAndUpdate({ storage: "oci", status: { $in: ["uploading", "pending", "processing"] }, nextAttemptAt: { $lte: new Date(at) }, $or: [{ leaseUntil: null }, { leaseUntil: { $lt: new Date(at) } }] }, { $set: { status: "processing", leaseId, leaseUntil: new Date(at + 300_000) }, $inc: { attempts: 1 } }, { returnDocument: "after", sort: { nextAttemptAt: 1 } });
        if (!row) break;
        const fence = { _id: row._id, status: "processing", leaseId };
        // Every attempt writes a fresh clean key. A stale worker cannot replace a published object.
        const cleanKey = `ready/${row._id}/${leaseId}`;
        let promoted = false;
        try {
          if (row.parId) await store.revoke(row.parId);
          else if (now() < row.uploadExpiresAt.getTime()) throw new Error("Upload authorization is still active");
          const maximum = (row.kind === "resume" ? 5 : 10) * 1024 * 1024;
          const bytes = await store.read(row.objectKey, maximum);
          if (bytes.length !== row.size || !matchesSignature(row.name, row.kind, bytes.subarray(0, 16))) throw new Error("FILE_INVALID");
          if (!(await scan(bytes))) throw new Error("FILE_MALWARE");
          const reserved = await files.updateOne(fence, { $push: { candidateKeys: cleanKey } } as any);
          if (!reserved.matchedCount) continue;
          await store.promote(cleanKey, bytes, row.type); promoted = true;
          const result = await files.updateOne(fence, { $set: { status: "ready", cleanKey, readyAt: new Date(now()), leaseUntil: null }, $unset: { leaseId: "" } });
          if (!result.matchedCount) { await store.remove(cleanKey, true); continue; }
          await notify(row._id, "ready");
        } catch (error: any) {
          // A lost database acknowledgement may already have marked this object ready.
          // Keep candidate keys for durable cleanup rather than deleting on an uncertain commit.
          if (promoted) {
            const current = await files.findOne({ _id: row._id });
            if (current?.status === "ready" && current.cleanKey === cleanKey) continue;
          }
          const rejected = /^FILE_/.test(error.message) || row.attempts >= 6;
          const result = await files.updateOne(fence, { $set: { status: rejected ? "rejected" : "pending", leaseUntil: null, nextAttemptAt: new Date(now() + Math.min(300_000, 5000 * 2 ** row.attempts)) }, $unset: { leaseId: "" } });
          if (result.matchedCount && rejected) await notify(row._id, "rejected");
        }
      }
    },
    async cleanup() {
      const candidates = await files.find({ storage: "oci", status: { $in: ["ready", "rejected"] }, candidatesCleaned: { $ne: true }, nextAttemptAt: { $lt: new Date(now() - 900_000) } }, { limit: 100 }).toArray();
      for (const row of candidates) {
        for (const key of row.candidateKeys || []) if (key !== row.cleanKey) await store.remove(key, true);
        await files.updateOne({ _id: row._id, status: row.status }, { $set: { candidatesCleaned: true } });
      }
      // Kept as durable deletion tombstones so failures and late in-flight PUTs are retried.
      const rows = await files.find({ storage: "oci", $or: [
        { status: { $in: ["ready", "rejected"] }, quarantineDeleted: { $ne: true }, uploadExpiresAt: { $lt: new Date(now() - 60_000) } },
        { status: "deleting" },
        { applicationId: { $exists: false }, ownerApplicationId: { $exists: false }, createdAt: { $lt: new Date(now() - 86_400_000) } },
      ] }, { limit: 100 }).toArray();
      for (const row of rows) {
        let deleting = row.status === "deleting";
        if (!deleting && row.createdAt.getTime() < now() - 86_400_000 && !row.applicationId && !row.ownerApplicationId) {
          const result = await files.updateOne({ _id: row._id, applicationId: { $exists: false }, ownerApplicationId: { $exists: false }, leaseUntil: null }, { $set: { status: "deleting" } });
          if (!result.matchedCount) continue;
          deleting = true;
        }
        if (row.parId) await store.revoke(row.parId);
        await store.remove(row.objectKey);
        if (deleting) {
          for (const key of new Set<string>([...(row.candidateKeys || []), ...(row.cleanKey ? [row.cleanKey] : [])])) await store.remove(key, true);
          // Wait for any old worker / in-flight browser upload before dropping tombstone.
          if (now() > Math.max(row.uploadExpiresAt.getTime(), row.leaseUntil?.getTime() || 0) + 600_000) await files.deleteOne({ _id: row._id, status: "deleting" });
        } else await files.updateOne({ _id: row._id }, { $set: { quarantineDeleted: true } });
      }
    },
  };
}
export type DirectUploads = ReturnType<typeof createDirectUploads>;
