import { expect, test } from "bun:test";
import { affectsInsights, createPublicInsights, publicApplicantName, throttle } from "../../src/modules/insights/insights.service";

const BOTH = [{ _id: "software-engineer", name: "Software Engineer Intern", enabled: true, fee: 0, stipend: 15000 }];

function stubCollections({ facets, recent, projects = 0, certificates = 0, programs = BOTH, compensationMode = "both" }: { facets: any; recent: any[]; projects?: number; certificates?: number; programs?: any[]; compensationMode?: string }) {
  const calls: Record<string, number> = {}, pipelines: Record<string, any[]> = {}, counts: Record<string, any> = {};
  const make = (name: string) => ({
    collectionName: `test_${name}`,
    find: () => ({ sort: () => ({ toArray: async () => programs }) }),
    findOne: async () => ({ _id: "program", compensationMode }),
    aggregate: (pipeline: any[]) => { calls[name] = (calls[name] || 0) + 1; pipelines[name] = pipeline; return { toArray: async () => (name === "applications" ? [facets] : recent) }; },
    countDocuments: async (filter: any) => { counts[name] = filter; return name === "projects" ? projects : certificates; },
  });
  return { collection: (name: string) => make(name) as any, calls, pipelines, counts };
}

const month = new Date().toISOString().slice(0, 7);
const facets = {
  statuses: [
    { _id: "Applied", count: 10 }, { _id: "Under Review", count: 4 }, { _id: "Shortlisted", count: 3 },
    { _id: "Selected", count: 2 }, { _id: "Joined", count: 5 }, { _id: "Rejected", count: 6 },
  ],
  tracks: [{ _id: "software-engineer", count: 30 }],
  roles: [{ _id: "build", count: 18 }, { _id: "automate", count: 7 }, { _id: null, count: 2 }, { _id: "intern", count: 1 }],
  monthly: [{ _id: { month, program: "software-engineer" }, count: 9 }],
  skills: [{ name: "React", count: 6 }, { name: "Python", count: 3 }],
};
const recent = [
  { createdAt: new Date("2026-11-12T10:15:42.123Z"), programId: "software-engineer", name: "Priya Sharma", email: "priya@example.test" },
  { createdAt: new Date("2026-11-12T09:00:00Z") },
];

test("public insights compute the selection funnel and monthly totals", async () => {
  const { collection } = stubCollections({ facets, recent, projects: 4, certificates: 3 });
  const value = await createPublicInsights({ collection }).calculate();
  expect(value.tracks).toEqual([{ id: "software-engineer", name: "Software Engineer Intern" }]);
  expect(value.totals).toEqual({ applied: 30, reviewed: 14, shortlisted: 10, selected: 7, onboarded: 5, certified: 3, projects: 4 });
  expect(value.byTrack).toEqual({ "software-engineer": 30 });
  expect(value.byRole).toEqual({ build: 18, automate: 7 });
  expect(value.thisMonth).toBe(9);
  expect(value.months).toHaveLength(12);
  expect(value.months[11]["software-engineer"]).toBe(9);
  expect(value.topSkills).toEqual([{ name: "React", count: 6 }, { name: "Python", count: 3 }]);
});

test("public insights keep only known intern roles", async () => {
  const { collection } = stubCollections({ facets, recent });
  const value = await createPublicInsights({ collection }).calculate();
  expect(value.byRole).toEqual({ build: 18, automate: 7 });
  expect(JSON.stringify(value.byRole)).not.toContain("intern");
});

test("public insights shorten applicant names and round activity to the minute", async () => {
  const { collection } = stubCollections({ facets, recent });
  const value = await createPublicInsights({ collection }).calculate();
  expect(value.recent).toEqual([{ track: "software-engineer", at: "2026-11-12T10:15:00.000Z", name: "Priya S." }]);
  const json = JSON.stringify(value);
  expect(json).not.toContain("@");
  expect(json).not.toContain("Sharma");
});

test("public applicant names keep a first name and last initial only", () => {
  expect(publicApplicantName("Priya Sharma")).toBe("Priya S.");
  expect(publicApplicantName("  aarav ")).toBe("Aarav");
  expect(publicApplicantName("bethi manideep kumar")).toBe("Bethi K.");
  expect(publicApplicantName("")).toBe("");
  expect(publicApplicantName(undefined)).toBe("");
  expect(publicApplicantName("A".repeat(80)).length).toBe(32);
});

test("public insights cover only tracks enabled in program settings", async () => {
  const programs = [{ ...BOTH[0], enabled: false }];
  const { collection } = stubCollections({ facets, recent: [...recent, { createdAt: new Date(), programId: "software-engineer" }], programs });
  const value = await createPublicInsights({ collection }).calculate();
  expect(value.tracks).toEqual([]);
  expect(value.byTrack).toEqual({});
  expect(value.recent).toEqual([]);
  expect(value.thisMonth).toBe(0);
});

test("compensation mode in Settings hides tracks exactly like the dashboard", async () => {
  const free = await createPublicInsights({ collection: stubCollections({ facets, recent, compensationMode: "free" }).collection }).calculate();
  expect(free.tracks.map(track => track.id)).toEqual([]);
  expect(free.byTrack).toEqual({});
  const paid = await createPublicInsights({ collection: stubCollections({ facets, recent, compensationMode: "paid" }).collection }).calculate();
  expect(paid.tracks.map(track => track.id)).toEqual(["software-engineer"]);
  expect(paid.byTrack).toEqual({ "software-engineer": 30 });
  const both = await createPublicInsights({ collection: stubCollections({ facets, recent, compensationMode: "both" }).collection }).calculate();
  expect(both.tracks.map(track => track.id)).toEqual(["software-engineer"]);
  expect(both.byTrack).toEqual({ "software-engineer": 30 });
  const unconfigured = await createPublicInsights({ collection: stubCollections({ facets, recent, programs: [{ ...BOTH[0], fee: null }] }).collection }).calculate();
  expect(unconfigured.tracks.map(track => track.id)).toEqual([]);
});

test("public insights are empty when every track is disabled", async () => {
  const { collection, calls } = stubCollections({ facets, recent, programs: BOTH.map(row => ({ ...row, enabled: false })) });
  const value = await createPublicInsights({ collection }).calculate();
  expect(value.tracks).toEqual([]);
  expect(value.totals.applied).toBe(0);
  expect(value.recent).toEqual([]);
  expect(value.byRole).toEqual({});
  expect(calls.applications).toBeUndefined();
});

test("public insights share one aggregation until invalidated", async () => {
  const { collection, calls } = stubCollections({ facets, recent });
  const insights = createPublicInsights({ collection });
  await Promise.all([insights.get(), insights.get()]);
  await insights.get();
  expect(calls.applications).toBe(1);
  insights.invalidate();
  await insights.get();
  expect(calls.applications).toBe(2);
});

test("only internship lifecycle events move public insights", () => {
  for (const type of ["program.configure", "application.created", "application.updated", "onboarding.approve", "offer.accept", "certificate.generate", "project.create", "intern.update"]) expect(affectsInsights(type)).toBe(true);
  for (const type of ["changed", "staff.changed", undefined]) expect(affectsInsights(type)).toBe(false);
});

test("throttle coalesces a burst into a leading and a trailing call", async () => {
  let count = 0;
  const run = throttle(() => { count++; }, 40);
  for (let i = 0; i < 10; i++) run();
  await new Promise(resolve => setTimeout(resolve, 5));
  expect(count).toBe(1);
  for (let i = 0; i < 10; i++) run();
  await new Promise(resolve => setTimeout(resolve, 80));
  expect(count).toBe(2);
  run.cancel();
});
