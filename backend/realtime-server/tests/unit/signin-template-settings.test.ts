import { describe, expect, test } from "bun:test";
import type { Collection } from "mongodb";
import type { InternshipRow } from "../../src/infrastructure/database/collections";
import { createSigninEmailTemplateSettings } from "../../src/modules/email-templates/signin-template-settings";

function createRows() {
  const records = new Map<string, Record<string, unknown>>();
  const rows = {
    async findOne(filter: { _id: string }) {
      return records.get(filter._id) ?? null;
    },
    async updateOne(filter: { _id: string }, update: { $set: Record<string, unknown> }) {
      records.set(filter._id, { ...(records.get(filter._id) || {}), ...update.$set, _id: filter._id });
      return { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0 };
    },
  } as unknown as Collection<InternshipRow>;
  return { rows, records };
}

describe("sign-in email template settings", () => {
  test("defaults to Clean White and persists the selected variant for workspace delivery", async () => {
    const { rows, records } = createRows();
    const settings = createSigninEmailTemplateSettings(rows);

    expect(await settings.read()).toEqual({ variantId: "professional" });
    expect(await settings.write("warm", "admin@example.test")).toEqual({ variantId: "warm" });
    expect(await settings.read()).toEqual({ variantId: "warm" });
    expect(records.get("account.signin-link")?.updatedBy).toBe("admin@example.test");
  });

  test("rejects unknown variants and malformed saved values", async () => {
    const { rows, records } = createRows();
    const settings = createSigninEmailTemplateSettings(rows);

    await expect(settings.write("unknown", "admin@example.test")).rejects.toThrow("Choose a valid sign-in email design.");
    records.set("account.signin-link", { _id: "account.signin-link", variantId: "unknown" });
    await expect(settings.read()).rejects.toThrow("The saved sign-in email template setting is invalid.");
  });
});
