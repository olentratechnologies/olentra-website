import type { ServerWebSocket } from "bun";
import type { Principal } from "../../shared/principal";
import { can, isAdmin } from "../../modules/access/policy";
import { applicationTopic, INTERN_TOPICS, STAFF_TOPICS } from "./topics";
import type { InternSocketData } from "./protocol";

export function clearSubscriptions(socket: ServerWebSocket<InternSocketData>) {
  for (const topic of STAFF_TOPICS) socket.unsubscribe(topic);
  if (socket.data.principal?.applicationId) socket.unsubscribe(applicationTopic(socket.data.principal.applicationId));
}

export function subscribeForPrincipal(socket: ServerWebSocket<InternSocketData>, principal: Principal | null) {
  if (principal?.role === "company") {
    if (isAdmin(principal)) socket.subscribe(INTERN_TOPICS.company);
    else {
      if (["overview.read", "applications.read", "interns.read"].some(permission => can(principal, permission))) socket.subscribe(INTERN_TOPICS.applications);
      if (["overview.read", "projects.summary", "projects.read", "tasks.read", "submissions.read", "interns.read", "certificates.read"].some(permission => can(principal, permission))) socket.subscribe(INTERN_TOPICS.work);
      if (can(principal, "messages.applicants")) socket.subscribe(INTERN_TOPICS.applicantMessages);
      if (can(principal, "messages.interns")) socket.subscribe(INTERN_TOPICS.internMessages);
    }
  } else if (principal?.applicationId) {
    socket.subscribe(applicationTopic(principal.applicationId));
  }
}
