import type { createInternshipDomain } from "./command-dispatcher";
import { createInternshipAuth } from "../modules/auth/auth.service";
import { createAccountService } from "../modules/accounts/account.service";
import { createApplicationService } from "../modules/applications/application.service";
import { createProgramService } from "../modules/programs/program.service";
import { createInternshipMailer } from "../infrastructure/email/mailer";

export function createInternshipContainer({ domain, secret, mailer, siteOrigin }: {
  domain: ReturnType<typeof createInternshipDomain>;
  secret: string;
  mailer: ReturnType<typeof createInternshipMailer>;
  siteOrigin: string;
}) {
  return {
    domain,
    auth: createInternshipAuth(domain, secret),
    accounts: createAccountService(domain),
    applications: createApplicationService(domain),
    programs: createProgramService(domain),
    mailer,
    siteOrigin,
  };
}
