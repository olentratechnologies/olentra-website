import { expect, test } from "bun:test";
import { LEGACY_PROGRAM_IDS, LEGACY_PROGRAM_NAMES, migrateLegacyPrograms, PROGRAM_ID, PROGRAM_NAME } from "../../src/modules/programs/legacy-program-migration";

test("legacy program migration rewrites references and can be rerun", async () => {
  const store: Record<string, any[]> = {
    applications: [{ _id: "a1", programId: "explorer", program: "Tech Explorer" }, { _id: "a2", programId: "innovator", program: "Tech Innovator" }],
    interns: [{ _id: "i1", programId: "innovator", program: "Tech Innovator" }],
    projects: [{ _id: "p1", program: "Tech Explorer" }],
    certificates: [{ _id: "c1", programId: "explorer", program: "Tech Explorer" }],
    stories: [{ _id: "s1", programId: "innovator", program: "Tech Innovator" }],
    resources: [{ _id: "r1", programIds: ["explorer", "innovator", "software-engineer"] }],
    notifications: [{ _id: "n1", audience: "innovator" }],
    views: [{ _id: "v1", filters: { programId: "explorer" } }],
    programs: [{ _id: "software-engineer" }, { _id: "explorer" }, { _id: "innovator" }],
    settings: [{ _id: "program", explorerEnabled: true, innovatorEnabled: false }],
  };
  const collection = (name: string) => ({
    async updateMany(filter: any, update: any) {
      const rows = store[name] || [];
      for (const row of rows) {
        if (filter.$or && filter.$or.some((clause: any) => clause.programId?.$in?.includes(row.programId) || clause.program?.$in?.includes(row.program))) Object.assign(row, update.$set);
        if (filter.programIds?.$in?.some((id: string) => row.programIds?.includes(id))) {
          if (update.$addToSet && !row.programIds.includes(update.$addToSet.programIds)) row.programIds.push(update.$addToSet.programIds);
          if (update.$pull) row.programIds = row.programIds.filter((id: string) => !update.$pull.programIds.$in.includes(id));
        }
        if (filter.audience?.$in?.includes(row.audience)) Object.assign(row, update.$set);
        if (filter["filters.programId"]?.$in?.includes(row.filters?.programId)) row.filters.programId = update.$set["filters.programId"];
      }
      return { modifiedCount: 0 };
    },
    async deleteMany(filter: any) {
      store[name] = (store[name] || []).filter(row => !filter._id.$in.includes(row._id));
      return { deletedCount: 0 };
    },
    async updateOne(filter: any, update: any) {
      const row = (store[name] || []).find(item => item._id === filter._id);
      if (row) for (const key of Object.keys(update.$unset || {})) delete row[key];
      return { modifiedCount: 0 };
    },
  });

  await migrateLegacyPrograms(collection as any);
  await migrateLegacyPrograms(collection as any);

  for (const name of ["applications", "interns", "projects", "certificates", "stories"]) {
    expect(store[name].every(row => row.programId === PROGRAM_ID && row.program === PROGRAM_NAME)).toBe(true);
  }
  expect(store.resources[0].programIds).toEqual([PROGRAM_ID]);
  expect(store.notifications[0].audience).toBe(PROGRAM_ID);
  expect(store.views[0].filters.programId).toBe(PROGRAM_ID);
  expect(store.programs.map(row => row._id)).toEqual([PROGRAM_ID]);
  expect(store.settings[0]).toEqual({ _id: "program" });
  expect(LEGACY_PROGRAM_IDS).toEqual(["explorer", "innovator"]);
  expect(LEGACY_PROGRAM_NAMES).toEqual(["Tech Explorer", "Tech Innovator"]);
});
