import type { Principal } from "../../shared/principal";
import type { createInternshipDomain } from "../../app/command-dispatcher";

/** Program configuration facade; the dispatcher remains the single policy boundary. */
export function createProgramService(domain: ReturnType<typeof createInternshipDomain>) {
  return {
    publicData: domain.publicData,
    configure: (params: Record<string, any>, actor: Principal | null, key?: string) => domain.execute("program.configure", params, actor, key),
  };
}
