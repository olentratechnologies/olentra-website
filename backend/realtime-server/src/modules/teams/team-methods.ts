/** Team commands, shared by the access policy and the team service. */
export const TEAM_READ_METHODS = new Set(["team.settings", "team.list", "team.get", "team.unassigned", "team.batches", "team.plan"]);
export const TEAM_WRITE_METHODS = new Set(["team.settings.save", "team.create", "team.createMany", "team.update", "team.addMembers", "team.removeMember", "team.moveMember", "team.assignProject", "team.unassignProject", "team.archive", "team.restore"]);
export const isTeamMethod = (method: string) => TEAM_READ_METHODS.has(method) || TEAM_WRITE_METHODS.has(method);
