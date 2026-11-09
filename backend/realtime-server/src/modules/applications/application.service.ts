import type { Principal } from "../../shared/principal";
import type { createInternshipDomain } from "../../app/command-dispatcher";

/** Application use-case facade. Authorization remains enforced by the domain dispatcher. */
export function createApplicationService(domain: ReturnType<typeof createInternshipDomain>) {
  const execute = (method: string, params: Record<string, any>, actor: Principal | null, idempotencyKey = "") => domain.execute(method, params, actor, idempotencyKey);
  return {
    list: (params: Record<string, any>, actor: Principal | null, key?: string) => execute("application.list", params, actor, key),
    get: (params: Record<string, any>, actor: Principal | null) => execute("application.get", params, actor),
    submit: (params: Record<string, any>, actor: Principal | null, key?: string) => execute("application.submit", params, actor, key),
    update: (params: Record<string, any>, actor: Principal | null, key?: string) => execute("application.update", params, actor, key),
  };
}
