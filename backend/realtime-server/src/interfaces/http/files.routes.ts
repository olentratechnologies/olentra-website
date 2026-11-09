import { ObjectId, type Collection, type Document } from "mongodb";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { GridFSBucket } from "mongodb";
import type { createInternshipAuth } from "../../modules/auth/auth.service";
import { DomainError } from "../../shared/errors";
import { can } from "../../modules/access/policy";
import { bearerToken } from "./middleware";

export const FILES_PATH = "/intern/files";

export const isFileUploadPath = (pathname: string, method: string) => pathname === FILES_PATH && method === "POST";
export const isFileDownloadPath = (pathname: string, method: string) => pathname.startsWith(`${FILES_PATH}/`) && method === "GET";
export const fileIdFromPath = (pathname: string) => decodeURIComponent(pathname.slice(`${FILES_PATH}/`.length));

type Auth = ReturnType<typeof createInternshipAuth>;
type FileRow = Document & { _id: string };
type SendJson = (body: unknown, origin: string | null, status?: number, extra?: Record<string, string>) => Response;
type Cors = (origin: string | null, extra?: Record<string, string>) => Headers;

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

/** GridFS-backed file transport adapter. */
export function createFilesRoutes({ auth, bucket, files, withCors, sendJson }: {
  auth: Auth;
  bucket: GridFSBucket;
  files: Collection<FileRow>;
  withCors: Cors;
  sendJson: SendJson;
}) {
  const authenticate = async (request: Request) => {
    const value = bearerToken(request);
    return value ? (await auth.verify(value)).account : null;
  };

  return {
    async upload(request: Request, origin: string | null) {
      const kind = request.headers.get("x-file-kind") || "resume";
      const name = (request.headers.get("x-file-name") || "").split(/[\\/]/).pop()?.replace(/[\x00-\x1f\x7f]/g, "").trim() || "";
      if (!name || name.length > 200 || !["resume", "work"].includes(kind) || (kind === "resume" && !/\.(pdf|doc|docx)$/i.test(name))) throw new DomainError("INVALID_REQUEST", "Choose a valid file.");
      const account = await authenticate(request);
      if (kind === "work" && !account) throw new DomainError("UNAUTHENTICATED", "Sign in to upload work.");
      if (account?.role === "company") throw new DomainError("FORBIDDEN", "Staff accounts cannot upload intern attachments.");
      const maximum = (kind === "resume" ? 5 : 10) * 1024 * 1024;
      const declared = Number(request.headers.get("content-length") || 0);
      if (declared > maximum || !request.body) throw new DomainError("INVALID_REQUEST", "The file is too large or empty.");
      const gridId = new ObjectId();
      const attachmentId = randomUUID();
      const accessToken = randomBytes(32).toString("base64url");
      const upload = bucket.openUploadStreamWithId(gridId, name);
      let size = 0;
      const limit = new Transform({ transform(chunk, _encoding, callback) { size += chunk.length; callback(size > maximum ? new Error("LIMIT") : null, chunk); } });
      try {
        await pipeline(Readable.fromWeb(request.body as any), limit, upload);
        if (!size) throw new Error("EMPTY");
      } catch {
        try { await bucket.delete(gridId); } catch {}
        throw new DomainError("INVALID_REQUEST", "The file is too large, empty, or could not be uploaded.");
      }
      try {
        await files.insertOne({ _id: attachmentId, gridId, kind, name, type: request.headers.get("content-type") || "application/octet-stream", size, status: "ready", accessTokenHash: hash(accessToken), ...(account?.applicationId ? { ownerApplicationId: account.applicationId } : {}), createdAt: new Date() });
      } catch (error) {
        try { await bucket.delete(gridId); } catch {}
        throw error;
      }
      return sendJson({ ok: true, data: { id: attachmentId, name, type: request.headers.get("content-type") || "application/octet-stream", size, accessToken } }, origin);
    },

    async download(request: Request, origin: string | null) {
      const file = await files.findOne({ _id: fileIdFromPath(new URL(request.url).pathname), status: "ready" });
      if (!file) throw new DomainError("NOT_FOUND", "File not found.");
      const account = await authenticate(request);
      const accessToken = request.headers.get("x-file-token") || "";
      const staffAccess = account?.role === "company" && (file.kind === "resume" ? can(account, "resumes.read") : can(account, "submissions.read"));
      const ownerAccess = account?.role === "intern" && account.applicationId && account.applicationId === (file.applicationId || file.ownerApplicationId);
      const pendingUploadAccess = !account && !file.applicationId && !file.ownerApplicationId && accessToken && file.accessTokenHash === hash(accessToken);
      if (!(staffAccess || ownerAccess || pendingUploadAccess)) throw new DomainError("FORBIDDEN", "File access denied.");
      const stream = Readable.toWeb(bucket.openDownloadStream(file.gridId)) as ReadableStream;
      return new Response(stream, { headers: withCors(origin, { "Content-Type": file.type, "Content-Disposition": `attachment; filename="${file.name.replace(/["\\]/g, "_")}"`, "Content-Length": String(file.size), "Access-Control-Expose-Headers": "Content-Disposition" }) });
    },
  };
}
