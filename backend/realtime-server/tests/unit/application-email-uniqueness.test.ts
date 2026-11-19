import { expect, test } from "bun:test";
import { createInternshipDomain } from "../../src/app/command-dispatcher";

const payload = { name: "Test Candidate", email: "  CANDIDATE@Example.Test  ", programId: "software-engineer", schedule: "part_time", linkedin: "https://www.linkedin.com/in/test-candidate", resumeAttachmentId: "resume", resumeAccessToken: "resume-token" };
function fixture(existing?: any, race = false) {
  let application = existing;
  const commandRecords = new Map<string, any>();
  const emails: any[] = [], writes: string[] = [];
  const collection = (name: string) => ({
    collectionName: name,
    findOne: async (filter: any) => {
      if (name === "test_applications") return application || null;
      if (name === "test_commands") return commandRecords.get(filter._id) || null;
      if (name === "test_programs") return { _id: "software-engineer", enabled: true, fee: 0, stipend: 0, name: "Software Engineer Intern" };
      if (name === "test_settings") return { programEnabled: true, compensationMode: "both", applicationAlerts: false };
      if (name === "test_files") return { _id: "resume" };
      return null;
    },
    find: () => ({ toArray: async () => [] }),
    insertOne: async (row: any) => {
      if (name === "test_applications" && race) throw Object.assign(new Error("Duplicate email"), { code: 11000, keyPattern: { email: 1 } });
      writes.push(name);
      if (name === "test_applications") application = row;
      if (name === "test_outbox") emails.push(row);
      if (name === "test_commands") commandRecords.set(row._id, row);
    },
    updateOne: async () => { writes.push(name); return { matchedCount: 1 }; },
  });
  const session = { withTransaction: async (run: any) => run(), endSession: async () => {} };
  const domain = createInternshipDomain({ db: { collection } as any, client: { startSession: () => session } as any, prefix: "test_" });
  return { domain, writes, emails, getApplication: () => application };
}

test("the same normalized email cannot apply again, regardless of status or chosen track", async () => {
  for (const status of ["Applied", "Under Review", "Shortlisted", "Selected", "Joined", "Rejected", "Declined", "Withdrawn"]) {
    const original = { _id: "OL-existing", email: "candidate@example.test", programId: "software-engineer", status };
    const f = fixture(original);
    await expect(f.domain.execute("application.submit", payload, null, "repeat-application-request")).rejects.toMatchObject({ code: "ALREADY_APPLIED", message: expect.stringContaining("application already exists") });
    expect(f.writes).toEqual([]);
    expect(f.emails).toHaveLength(0);
    expect(f.getApplication()).toBe(original);
  }
});

test("new applicants are stored by normalized email; request replay succeeds without a second application or email", async () => {
  const f = fixture();
  const first = await f.domain.execute("application.submit", payload, null, "first-application-request");
  expect(first.received).toBe(true);
  expect(f.getApplication().email).toBe("candidate@example.test");
  expect(await f.domain.execute("application.submit", payload, null, "first-application-request")).toEqual(first);
  expect(f.writes.filter(name => name === "test_applications")).toHaveLength(1);
  expect(f.emails).toHaveLength(1);
  await expect(f.domain.execute("application.submit", { ...payload, email: "candidate@example.test" }, null, "another-application-request")).rejects.toMatchObject({ code: "ALREADY_APPLIED" });
  expect(f.emails).toHaveLength(1);
});

test("a concurrent duplicate email insert returns the same already-applied error", async () => {
  const f = fixture(undefined, true);
  await expect(f.domain.execute("application.submit", payload, null, "racing-application-request")).rejects.toMatchObject({ code: "ALREADY_APPLIED" });
  expect(f.emails).toHaveLength(0);
});
