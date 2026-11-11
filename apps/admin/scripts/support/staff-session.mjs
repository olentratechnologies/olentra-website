// Test helper: the company workspace receives verified staff identities from the
// realtime account service. Tests establish one directly for a workspace level.
import { executeCommand } from "../../src/lib/admin/model.mjs";

export const STAFF = {
  owner: { id: "ACC-owner", email: "owner@example.com", name: "Company owner", role: "Owner" },
  administrator: { id: "ACC-administrator", email: "admin@example.com", name: "Workspace administrator", role: "Administrator" },
  editor: { id: "ACC-editor", email: "editor@example.com", name: "Content editor", role: "Editor" },
  recruiter: { id: "ACC-recruiter", email: "recruiter@example.com", name: "Recruiter", role: "Recruiter" },
  analyst: { id: "ACC-analyst", email: "analyst@example.com", name: "Analyst", role: "Analyst" },
};
const BY_EMAIL = Object.fromEntries(Object.entries(STAFF).map(([key, value]) => [value.email, key]));

/** Returns a new state signed in as the given staff level (key or email). */
export function signedIn(state, who = "owner", options = {}) {
  const staff = STAFF[who] || STAFF[BY_EMAIL[who]];
  if (!staff) throw new Error("Unknown staff fixture: " + who);
  const result = executeCommand(state, "auth.session.establish", staff, options);
  if (!result.ok) throw new Error(result.error);
  return result.state;
}
