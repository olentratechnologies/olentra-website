import { expect, test } from "bun:test";
import { createInternshipDomain, type Principal } from "./domain";
import { acceptsCompensationMode, isCompensationMode, normalizeCompensationMode } from "../../src/modules/programs/compensation";
import { DEFAULT_INTERNSHIP_DURATION, applicationDurationLabel } from "../../src/modules/programs/opportunities.mjs";

const admin: Principal = { id: "admin", role: "company", staffRole: "admin", name: "Admin", email: "admin@example.test", applicationId: null, sessionVersion: 1 };

function fixture(compensationMode?: unknown, stipend = 0) {
  const config: Record<string, any> = { _id: "program", programEnabled: true, compensationMode };
  const programs = [{ _id: "software-engineer", name: "Software Engineer Intern", fee: 500, stipend, enabled: true }];
  const inserted: { collection: string; document: any }[] = [];
  const db = {
    collection(name: string) {
      return {
        async findOne(filter: Record<string, any>) {
          if (name === "programs") return programs.find(row => row._id === filter._id) || null;
          if (name === "settings") return config;
          if (name === "files") return { _id: "resume", kind: "resume", status: "ready" };
          return null;
        },
        find() { return { sort() { return this; }, async toArray() { return name === "programs" ? programs : []; } }; },
        async updateOne(_filter: unknown, update: Record<string, any>) {
          if (name === "settings") Object.assign(config, update.$set);
          return { matchedCount: 1 };
        },
        async insertOne(document: any) { inserted.push({ collection: name, document }); },
      };
    },
  };
  const client = { startSession() { return { async withTransaction(action: () => Promise<void>) { await action(); }, async endSession() {} }; } };
  return { domain: createInternshipDomain({ db: db as any, client: client as any, prefix: "" }), config, programs, inserted };
}

test("compensation modes keep legacy defaults and classify stipend rather than program fees", () => {
  for (const value of [undefined, null, "", "other", {}, 0]) {
    expect(isCompensationMode(value)).toBe(false);
    expect(normalizeCompensationMode(value)).toBe("both");
  }
  for (const mode of ["free", "paid", "both"] as const) expect(normalizeCompensationMode(mode)).toBe(mode);
  expect(acceptsCompensationMode(0, "free")).toBe(true);
  expect(acceptsCompensationMode(1000, "free")).toBe(false);
  expect(acceptsCompensationMode(0, "paid")).toBe(false);
  expect(acceptsCompensationMode(1000, "paid")).toBe(true);
  expect(acceptsCompensationMode(0, "both")).toBe(true);
  expect(acceptsCompensationMode(1000, "both")).toBe(true);
  for (const stipend of [null, undefined, -1, 1.5, "1000", Number.NaN]) {
    expect(acceptsCompensationMode(stipend, "both")).toBe(false);
  }
});

test("public settings normalize missing and invalid saved compensation modes", async () => {
  for (const mode of [undefined, "invalid", "free", "paid", "both"]) {
    const { domain } = fixture(mode);
    expect((await domain.publicData()).settings.compensationMode).toBe(normalizeCompensationMode(mode));
  }
});

test("admin settings save each compensation mode without changing track details and refresh cached public data", async () => {
  const { domain, config, programs } = fixture();
  const originalPrograms = structuredClone(programs);
  expect((await domain.publicData()).settings.compensationMode).toBe("both");
  for (const mode of ["free", "paid", "both"] as const) {
    await domain.execute("settings.update", { patch: { compensationMode: mode } }, admin, `compensation-save-${mode}`);
    expect(config.compensationMode).toBe(mode);
    expect((await domain.publicData()).settings.compensationMode).toBe(mode);
    expect(programs).toEqual(originalPrograms);
  }
});

test("invalid modes and non-admin settings changes fail before writing", async () => {
  const { domain, config, inserted } = fixture("both");
  for (const mode of [null, "", "FREE", "salary", true, 1]) {
    await expect(domain.execute("settings.update", { patch: { compensationMode: mode } }, admin, "invalid-mode-test")).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  }
  const mentor: Principal = { ...admin, id: "mentor", staffRole: "mentor", permissions: ["overview.read"] };
  await expect(domain.execute("settings.update", { patch: { compensationMode: "paid" } }, mentor, "mentor-mode-test")).rejects.toMatchObject({ code: "FORBIDDEN" });
  expect(config.compensationMode).toBe("both");
  expect(inserted).toEqual([]);
});

test("application submission enforces free, paid and both against the current stipend settings", async () => {
  const cases = [
    { mode: "free", stipend: 0, accepts: true },
    { mode: "free", stipend: 1000, accepts: false },
    { mode: "paid", stipend: 0, accepts: false },
    { mode: "paid", stipend: 1000, accepts: true },
    { mode: "both", stipend: 0, accepts: true },
    { mode: "both", stipend: 1000, accepts: true },
    { mode: undefined, stipend: 1000, accepts: true },
  ];
  for (const { mode, stipend, accepts } of cases) {
    const { domain, inserted } = fixture(mode, stipend);
    const request = domain.execute("application.submit", { name: "Test Candidate", email: "candidate@example.test", linkedin: "https://www.linkedin.com/in/test-candidate", programId: "software-engineer", schedule: "part_time", resumeAttachmentId: "resume", resumeAccessToken: "test-file-token" }, null, "compensation-apply-test");
    if (accepts) {
      expect(await request).toMatchObject({ received: true });
      const applications = inserted.filter(write => write.collection === "applications");
      expect(applications).toHaveLength(1);
      expect(applications[0]!.document.programId).toBe("software-engineer");
    } else {
      await expect(request).rejects.toMatchObject({ code: "CLOSED" });
      expect(inserted).toEqual([]);
    }
  }
});

test("admin duration changes update public data and new applications keep their submission snapshot", async () => {
  const { domain, config, inserted } = fixture("both", 0);
  expect((await domain.publicData()).settings.duration).toBe(DEFAULT_INTERNSHIP_DURATION);

  await domain.execute("settings.update", { patch: { duration: "  8-10 weeks  " } }, admin, "duration-save-test");
  expect(config.duration).toBe("8-10 weeks");
  expect((await domain.publicData()).opportunities.duration).toBe("8-10 weeks");

  await domain.execute("application.submit", {
    name: "Test Candidate",
    email: "duration@example.test",
    linkedin: "https://www.linkedin.com/in/duration-candidate",
    programId: "software-engineer",
    schedule: "part_time",
    duration: "client-value",
    durationMonths: 99,
    resumeAttachmentId: "resume",
    resumeAccessToken: "test-file-token",
  }, null, "duration-apply-test");
  const application = inserted.find(write => write.collection === "applications")!.document;
  expect(application.duration).toBe("8-10 weeks");
  expect(applicationDurationLabel(application)).toBe("8-10 weeks");

  await domain.execute("settings.update", { patch: { duration: "4-6 months" } }, admin, "duration-change-test");
  expect((await domain.publicData()).settings.duration).toBe("4-6 months");
  expect(application.duration).toBe("8-10 weeks");
  expect(applicationDurationLabel({ durationMonths: 2 })).toBe("2 months");
});
