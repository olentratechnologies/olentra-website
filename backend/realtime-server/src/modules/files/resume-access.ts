import type { Collection, Document } from "mongodb";
import { DomainError } from "../../shared/errors";
import type { Principal } from "../../shared/principal";
import { can } from "../access/policy";

export const RESUME_METHOD = "application.resume";

/** Staff need both: reading applications and the narrower "download applicant resumes" grant. */
export const RESUME_STAFF_PERMISSIONS = ["applications.read", "resumes.read"] as const;

type Row = Document & { _id: string };

/** True when this staff member may open applicant resumes. */
export const canReadResumes = (actor: Principal | null) => RESUME_STAFF_PERMISSIONS.every(permission => can(actor, permission));

/** True when the file row is linked to an application (never an anonymous, unclaimed upload). */
export const linkedApplicationId = (file: Row) => String(file.applicationId || file.ownerApplicationId || "");

/**
 * Describes an application's resume without returning its bytes, so the
 * dashboard can show the file name, size and whether it can be previewed.
 * The bytes themselves are served by the authenticated `/intern/files/:id`
 * route, which applies the same rules.
 */
export function createResumeAccess({ applications, files }: { applications: Collection<Row>; files: Collection<Row> }) {
  return {
    supports: (method: string) => method === RESUME_METHOD,
    async execute(params: Record<string, any>, actor: Principal | null) {
      if (!actor) throw new DomainError("UNAUTHENTICATED", "Sign in to view resumes.");
      const applicationId = typeof params.applicationId === "string" ? params.applicationId.trim().slice(0, 200) : "";
      if (!applicationId) throw new DomainError("INVALID_REQUEST", "Choose an application.");
      // Checked before any lookup, so an applicant learns nothing about other IDs.
      if (actor.role === "intern") {
        if (!actor.applicationId || actor.applicationId !== applicationId) throw new DomainError("FORBIDDEN", "File access denied.");
      } else if (!canReadResumes(actor)) {
        throw new DomainError("FORBIDDEN", "Your internship staff role does not allow downloading resumes.");
      }
      const application = await applications.findOne({ _id: applicationId }, { projection: { resumeAttachmentId: 1 } });
      if (!application) throw new DomainError("NOT_FOUND", "Application not found.");
      const fileId = typeof application.resumeAttachmentId === "string" ? application.resumeAttachmentId : "";
      if (!fileId) return { resume: null };
      const file = await files.findOne(
        { _id: fileId, kind: "resume", $or: [{ applicationId }, { ownerApplicationId: applicationId }] },
        { projection: { name: 1, type: 1, size: 1, status: 1, createdAt: 1, readyAt: 1 } },
      );
      if (!file) return { resume: null };
      const ready = file.status === "ready";
      return {
        resume: {
          id: file._id,
          name: String(file.name || "resume"),
          type: String(file.type || ""),
          size: Number(file.size) || 0,
          status: ready ? "ready" : file.status === "rejected" ? "rejected" : "processing",
          uploadedAt: (file.readyAt || file.createdAt) instanceof Date ? (file.readyAt || file.createdAt).toISOString() : null,
          previewable: ready && file.type === "application/pdf",
        },
      };
    },
  };
}
