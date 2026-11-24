import { DomainError } from "../../shared/errors";
import type { Principal } from "../../shared/principal";

export const isAdmin = (actor: Principal | null) => actor?.role === "company" && actor.staffRole === "admin";
export const can = (actor: Principal | null, permission: string) => !!actor && actor.role === "company" && (isAdmin(actor) || !!actor.staffRole && !!actor.permissions?.includes(permission));
export function requirePermission(actor: Principal | null, ...permissions: string[]) {
  if (!permissions.every(permission => can(actor, permission))) throw new DomainError("FORBIDDEN", "Your internship staff role does not allow this action.");
}
export function requireAdmin(actor: Principal | null) {
  if (!isAdmin(actor)) throw new DomainError("FORBIDDEN", "Internship admin access is required.");
}

/** All staff entry points must be listed here; unknown operations fail closed. */
export function authorizeStaff(method: string, params: Record<string, any>, actor: Principal) {
  if (!actor.staffRole) throw new DomainError("FORBIDDEN", "Your staff account has no role assigned.");
  if (isAdmin(actor)) return;
  const basic: Record<string, string[]> = {
    "intern.public": [], "intern.snapshot": [],
    "application.list": ["applications.read"], "application.get": ["applications.read"], "application.workflow": ["applications.read"], "application.resume": ["applications.read", "resumes.read"],
    "intern.list": ["interns.read"], "task.list": ["tasks.read"], "submission.list": ["submissions.read"], "certificate.list": ["certificates.read"], "story.list": ["certificates.read"], "certificate.verify": [], "story.public": [],
    "analytics.get": ["overview.read"], "notification.list": ["notifications.read"], "notification.markRead": ["notifications.read"],
    "project.plan.get": ["projects.read"], "project.link.save": ["projects.read", "projects.manage"], "project.link.delete": ["projects.read", "projects.manage"], "project.link.access": ["projects.read", "projects.manage"], "github.resend": ["projects.read", "projects.manage"], "github.repositories": ["projects.read", "projects.manage"], "project.plan.save": ["projects.read", "projects.manage"],
    "project.assign": ["projects.read", "projects.manage"], "project.create": ["projects.read", "projects.manage"], "project.update": ["projects.read", "projects.manage"], "project.delete": ["projects.read", "projects.manage"],
    "task.remind": ["tasks.read", "tasks.manage"], "task.create": ["tasks.read", "tasks.manage"], "task.update": ["tasks.read", "tasks.manage"], "task.delete": ["tasks.read", "tasks.manage"],
    "application.update": ["applications.read", "applications.review"], "application.bulkUpdate": ["applications.read", "applications.review"], "review.list": ["applications.read"], "staff.reviewers": ["applications.read"], "template.list": [], "view.list": [], "resource.list": [], "checkin.list": [], "feedback.summary": ["overview.read"], "checkin.reply": [], "view.save": [], "view.delete": [], "application.assign": ["applications.read", "applications.review"], "application.bookmark": ["applications.read", "applications.review"], "application.aiReview": ["applications.read"], "application.aiQueue": ["applications.read"], "application.aiReviewRerun": ["applications.read", "applications.review"], "review.save": ["applications.read", "applications.review"], "interview.schedule": ["applications.read", "applications.review"], "interview.cancel": ["applications.read", "applications.review"], "submission.review": ["submissions.read", "submissions.feedback"],
    "message.list": [], "message.send": [],
  };
  if (method === "project.list") {
    if (!can(actor, "projects.read") && !can(actor, "projects.summary")) throw new DomainError("FORBIDDEN", "Your internship staff role does not allow this action.");
    return;
  }
  if (!Object.hasOwn(basic, method)) return requireAdmin(actor);
  requirePermission(actor, ...basic[method]!);
  if (method === "application.update" || method === "application.bulkUpdate") {
    const patch = params.patch || {};
    const status = typeof (params.status || patch.status) === "string" ? String(params.status || patch.status).trim() : "";
    if (status && !["Applied", "Under Review", "Shortlisted"].includes(status)) throw new DomainError("FORBIDDEN", "Only an admin can make final application decisions.");
  }
  if (method === "submission.review" && params.decision !== "Changes requested") throw new DomainError("FORBIDDEN", "Only an admin can approve submitted work.");
}
