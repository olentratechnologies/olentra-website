import type { createInternshipDomain } from "../../app/command-dispatcher";

/** Account-facing facade over the application domain port. */
export function createAccountService(domain: ReturnType<typeof createInternshipDomain>) {
  return {
    login: domain.login,
    find: domain.account,
    resetPassword: domain.selfResetPassword,
    changePassword: domain.changePassword,
  };
}
