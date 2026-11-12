import type { ClientSession, Collection, Document } from "mongodb";
import { id } from "../../shared/ids";
import type { Principal } from "../../shared/principal";

/**
 * Application decisions share the staff audit log. Rows are written inside
 * the decision's own transaction, so a decision and its audit row always
 * commit (or roll back) together. Actions are prefixed by area, which is
 * what the audit viewer filters on.
 */
export const AUDIT_AREAS = {
  staff: /^(staff|role|admin)\./,
  applications: /^(application|offer|onboarding|certificate|applicant)\./,
} as const;
export type AuditArea = keyof typeof AUDIT_AREAS;

export async function auditDecision(audit: Collection<any>, session: ClientSession, actor: Principal | null, action: string, targetId: string, detail: Document = {}) {
  if (actor?.role !== "company") return;
  await audit.insertOne({ _id: id("AUD"), action, actorId: actor.id, actorName: actor.name, targetId, detail, createdAt: new Date() }, { session });
}
