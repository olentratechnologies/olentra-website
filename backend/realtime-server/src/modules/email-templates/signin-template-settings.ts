import type { Collection } from "mongodb";
import type { InternshipRow } from "../../infrastructure/database/collections";

export const SIGNIN_EMAIL_TEMPLATE_DEFAULT = "professional";
export const SIGNIN_EMAIL_TEMPLATE_VARIANTS = ["professional", "warm", "minimal"] as const;
export type SigninEmailTemplateVariant = typeof SIGNIN_EMAIL_TEMPLATE_VARIANTS[number];

const SETTING_ID = "account.signin-link";

function isVariant(value: unknown): value is SigninEmailTemplateVariant {
  return typeof value === "string" && SIGNIN_EMAIL_TEMPLATE_VARIANTS.includes(value as SigninEmailTemplateVariant);
}

export function createSigninEmailTemplateSettings(rows: Collection<InternshipRow>) {
  return {
    async read(): Promise<{ variantId: SigninEmailTemplateVariant }> {
      const row = await rows.findOne({ _id: SETTING_ID });
      if (!row) return { variantId: SIGNIN_EMAIL_TEMPLATE_DEFAULT };
      if (!isVariant(row.variantId)) throw new Error("The saved sign-in email template setting is invalid.");
      return { variantId: row.variantId };
    },
  };
}
