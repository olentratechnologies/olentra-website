import { expect, test } from "bun:test";
import { affectsInsights, createPublicInsights, publicApplicantName, throttle } from "../../src/modules/insights/insights.service";

const BOTH = [{ _id: "explorer", name: "Tech Explorer", enabled: true, fee: 0, stipend: 0 }, { _id: "innovator", name: "Tech Innovator", enabled: true, fee: 0, stipend: 15000 }];

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
  tracks: [{ _id: "explorer", count: 20 }, { _id: "innovator", count: 10 }, { _id: null, count: 0 }],
  roles: [{ _id: "build", count: 18 }, { _id: "automate", count: 7 }, { _id: "grow", count: 5 }, { _id: null, count: 2 }, { _id: "intern", count: 1 }],
  monthly: [{ _id: { month, program: "explorer" }, count: 7 }, { _id: { month, program: "innovator" }, count: 2 }],
  skills: [{ name: "React", count: 6 }, { name: "Python", count: 3 }],
};
const recent = [
  { createdAt: new Date("2026-11-12T10:15:42.123Z"), programId: "explorer", name: "Priya Sharma", email: "priya@example.test" },
  { createdAt: new Date("2026-11-12T09:00:00Z") },
];

test("public insights compute the selection funnel and monthly totals", async () => {
  const { collection } = stubCollections({ facets, recent, projects: 4, certificates: 3 });
  const value = await createPublicInsights({ collection }).calculate();
  expect(value.tracks).toEqual([{ id: "explorer", name: "Tech Explorer" }, { id: "innovator", name: "Tech Innovator" }]);
  expect(value.totals).toEqual({ applied: 30, reviewed: 14, shortlisted: 10, selected: 7, onboarded: 5, certified: 3, projects: 4 });
  expect(value.byTrack).toEqual({ explorer: 20, innovator: 10 });
  expect(value.byRole).toEqual({ build: 18, automate: 7, grow: 5 });
  expect(value.thisMonth).toBe(9);
  expect(value.months).toHaveLength(12);
  expect(value.topSkills).toEqual([{ name: "React", count: 6 }, { name: "Python", count: 3 }]);
});

test("public insights keep only known intern roles", async () => {
  const { collection } = stubCollections({ facets, recent });
  const value = await createPublicInsights({ collection }).calculate();
  expect(value.byRole).toEqual({ build: 18, automate: 7, grow: 5 });
  expect(JSON.stringify(value.byRole)).not.toContain("intern");
});

test("public insights shorten applicant names and round activity to the minute", async () => {
  const { collection } = stubCollections({ facets, recent });
  const value = await createPublicInsights({ collection }).calculate();
  expect(value.recent).toEqual([{ track: "explorer", at: "2026-11-12T10:15:00.000Z", name: "Priya S." }]);
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
  const programs = [BOTH[0], { ...BOTH[1], enabled: false }];
  const { collection, pipelines, counts } = stubCollections({ facets, recent: [...recent, { createdAt: new Date(), programId: "innovator" }], programs });
  const value = await createPublicInsights({ collection }).calculate();
  expect(value.tracks).toEqual([{ id: "explorer", name: "Tech Explorer" }]);
  expect(pipelines.applications[0]).toEqual({ $match: { programId: { $in: ["explorer"] } } });
  expect(value.byTrack).toEqual({ explorer: 20 });
  expect(value.recent.every(item => item.track === "explorer")).toBe(true);
  expect(value.months.every(entry => entry.innovator === 0)).toBe(true);
  expect(value.thisMonth).toBe(7);
  expect(counts.projects).toEqual({ program: { $in: ["Tech Explorer"] } });
  expect(counts.certificates).toEqual({ programId: { $in: ["explorer"] } });
});

test("compensation mode in Settings hides tracks exactly like the dashboard", async () => {
  const free = await createPublicInsights({ collection: stubCollections({ facets, recent, compensationMode: "free" }).collection }).calculate();
  expect(free.tracks.map(track => track.id)).toEqual(["explorer"]);
  expect(free.byTrack).toEqual({ explorer: 20 });
  const paid = await createPublicInsights({ collection: stubCollections({ facets, recent, compensationMode: "paid" }).collection }).calculate();
  expect(paid.tracks.map(track => track.id)).toEqual(["innovator"]);
  const unconfigured = await createPublicInsights({ collection: stubCollections({ facets, recent, programs: [{ ...BOTH[0], fee: null }, BOTH[1]] }).collection }).calculate();
  expect(unconfigured.tracks.map(track => track.id)).toEqual(["innovator"]);
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
