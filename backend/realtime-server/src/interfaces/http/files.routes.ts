import { ObjectId, type Collection, type Document } from "mongodb";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { GridFSBucket } from "mongodb";
import type { createInternshipAuth } from "../../modules/auth/auth.service";
import { DomainError } from "../../shared/errors";
import { can } from "../../modules/access/policy";
import { bearerToken } from "./middleware";
import { clientAddress } from "../../modules/auth/login-throttle";
import type { RateLimiter } from "../../modules/auth/rate-limit";
import type { createResumeGrants } from "../../modules/files/resume-grant";
import { SIGNATURE_BYTES, allowedType, matchesSignature } from "../../modules/files/file-types";

export const FILES_PATH = "/intern/files";

export const isFileUploadPath = (pathname: string, method: string) => pathname === FILES_PATH && method === "POST";
export const isFileDownloadPath = (pathname: string, method: string) => pathname.startsWith(`${FILES_PATH}/`) && method === "GET";
export const fileIdFromPath = (pathname: string) => decodeURIComponent(pathname.slice(`${FILES_PATH}/`.length));

type Auth = ReturnType<typeof createInternshipAuth>;
type FileRow = Document & { _id: string };
type SendJson = (body: unknown, origin: string | null, status?: number, extra?: Record<string, string>) => Response;
type Cors = (origin: string | null, extra?: Record<string, string>) => Headers;

const MAX_CONCURRENT_PUBLIC_UPLOADS = 16;

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

/** GridFS-backed file transport adapter. */
export function createFilesRoutes({ auth, bucket, files, withCors, sendJson, limiter, resumeGrants }: {
  auth: Auth;
  bucket: GridFSBucket;
  files: Collection<FileRow>;
  withCors: Cors;
  sendJson: SendJson;
  limiter?: RateLimiter;
  resumeGrants?: ReturnType<typeof createResumeGrants>;
}) {
  const authenticate = async (request: Request) => {
    const value = bearerToken(request);
    return value ? (await auth.verify(value)).account : null;
  };
  const addressFor = (request: Request, peerAddress?: string) =>
    clientAddress(request, peerAddress, /^(true|1)$/i.test(process.env.REALTIME_TRUST_PROXY || ""));

  let activePublicUploads = 0;

  return {
    async authorizeResume(request: Request, origin: string | null) {
      if (!resumeGrants || !origin) throw new DomainError("FORBIDDEN", "Resume verification is unavailable for this request.");
      const challenge = request.headers.get("x-resume-challenge") || "";
      const grant = await resumeGrants.verifyChallenge(challenge, new URL(origin).hostname);
      return sendJson({ ok: true, data: grant }, origin);
    },

    async upload(request: Request, origin: string | null, peerAddress = "direct") {
      const kind = request.headers.get("x-file-kind") || "resume";
      const name = (request.headers.get("x-file-name") || "").split(/[\\/]/).pop()?.replace(/[\x00-\x1f\x7f]/g, "").trim() || "";
      if (!name || name.length > 200 || (kind !== "resume" && kind !== "work")) throw new DomainError("INVALID_REQUEST", "Choose a valid file.");
      const type = allowedType(name, kind);
      if (!type) throw new DomainError("UNSUPPORTED_MEDIA_TYPE", kind === "resume" ? "Upload your resume as a PDF or Word document." : "This file type isn't supported. Use a document, spreadsheet, slides, image, text or zip file.");
      const account = await authenticate(request);
      if (kind === "work" && !account) throw new DomainError("UNAUTHENTICATED", "Sign in to upload work.");
      if (account?.role === "company") throw new DomainError("FORBIDDEN", "Staff accounts cannot upload intern attachments.");
      const maximum = (kind === "resume" ? 5 : 10) * 1024 * 1024;
      const declared = Number(request.headers.get("content-length") || 0);
      if (declared > maximum || !request.body) throw new DomainError("INVALID_REQUEST", "The file is too large or empty.");
      if (account) {
        await limiter?.consume("upload", addressFor(request, peerAddress), account.id);
      } else {
        if (activePublicUploads >= MAX_CONCURRENT_PUBLIC_UPLOADS) {
          throw new DomainError("SERVICE_UNAVAILABLE", "Resume uploads are busy. Please retry in a moment.");
        }
        activePublicUploads++;
      }
      try {
        if (resumeGrants && !account) {
          const draftId = await resumeGrants.draftId(request.headers.get("x-resume-grant") || "");
          await limiter?.consume("verifiedResume", null, draftId);
        }
        const gridId = new ObjectId();
        const attachmentId = randomUUID();
        const accessToken = randomBytes(32).toString("base64url");
        const upload = bucket.openUploadStreamWithId(gridId, name);
        let size = 0, head = new Uint8Array(0);
        const limit = new Transform({ transform(chunk, _encoding, callback) {
          if (head.length < SIGNATURE_BYTES) head = Uint8Array.from([...head, ...chunk.subarray(0, SIGNATURE_BYTES - head.length)]);
          size += chunk.length;
          callback(size > maximum ? new Error("LIMIT") : null, chunk);
        } });
        try {
          await pipeline(Readable.fromWeb(request.body as any), limit, upload);
          if (!size) throw new Error("EMPTY");
        } catch {
          try { await bucket.delete(gridId); } catch {}
          throw new DomainError("INVALID_REQUEST", "The file is too large, empty, or could not be uploaded.");
        }
        if (!matchesSignature(name, kind, head)) {
          try { await bucket.delete(gridId); } catch {}
          throw new DomainError("UNSUPPORTED_MEDIA_TYPE", "This file's contents don't match its type. Save it again as a real ." + type.extension + " file.");
        }
        try {
          await files.insertOne({ _id: attachmentId, gridId, kind, name, type: type.mime, size, status: "ready", accessTokenHash: hash(accessToken), ...(account?.applicationId ? { ownerApplicationId: account.applicationId } : {}), createdAt: new Date() });
        } catch (error) {
          try { await bucket.delete(gridId); } catch {}
          throw error;
        }
        return sendJson({ ok: true, data: { id: attachmentId, name, type: type.mime, size, accessToken } }, origin);
      } finally {
        if (!account) activePublicUploads--;
      }
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
      return new Response(stream, { headers: withCors(origin, { "Content-Type": file.type, "Content-Disposition": `attachment; filename="${file.name.replace(/["\\]/g, "_")}"`, "Content-Length": String(file.size), "Access-Control-Expose-Headers": "Content-Disposition", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" }) });
    },
  };
}
