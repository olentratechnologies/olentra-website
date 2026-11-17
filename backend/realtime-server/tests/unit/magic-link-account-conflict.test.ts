import { expect, test } from "bun:test";
import { createInternshipDomain } from "./domain";

test("an applicant link for a staff email reports the account conflict without modifying the staff account", async () => {
  const writes: string[] = [];
  const staff = { _id: "staff-admin", email: "admin@example.test", role: "company", staffRole: "admin" };
  const application = { _id: "OL-test", email: staff.email, status: "Selected" };
  const collection = (name: string) => ({
    findOne: async () => name === "test_applications" ? application : null,
    find: () => ({ toArray: async () => name === "test_accounts" ? [staff] : [] }),
    insertOne: async () => { writes.push(name); },
    updateOne: async () => { writes.push(name); },
  });
  const domain = createInternshipDomain({ db: { collection } as any, client: {} as any, prefix: "test_" });
  await expect(domain.autoProvisionAccount(application._id, staff.email)).rejects.toMatchObject({
    code: "CONFLICT", message: expect.stringContaining("already belongs to a staff account"),
  });
  expect(writes).toEqual([]);
  expect(staff.role).toBe("company");
});
