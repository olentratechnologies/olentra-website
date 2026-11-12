import { expect, test } from "bun:test";
import { createStories, displayNameFor, MAX_QUOTE, validateStory } from "../../src/modules/stories/stories.service";
import { allowVerify } from "../../src/app/create-service";

test("public story names show only first name and last initial", () => {
  expect(displayNameFor("Priya Sharma")).toBe("Priya S.");
  expect(displayNameFor("  bethi   manideep  ")).toBe("bethi M.");
  expect(displayNameFor("Madonna")).toBe("Madonna");
  expect(displayNameFor("")).toBe("Olentra intern");
});

test("a story needs explicit consent and a quote of sensible length", () => {
  expect(() => validateStory({ quote: "I learned so much building real features." })).toThrow("confirm");
  expect(() => validateStory({ quote: "Too short", consent: true })).toThrow("between");
  expect(() => validateStory({ quote: "x".repeat(MAX_QUOTE + 1), consent: true })).toThrow("between");
  expect(validateStory({ quote: "  I learned   so much building real features.  ", consent: true })).toEqual({ quote: "I learned so much building real features." });
});

function fakeStories(rows: any[]) {
  const collection = (name: string) => ({
    createIndex: async () => "",
    find: (filter: any) => ({ sort: () => ({ limit: () => ({ toArray: async () => rows.filter(row => !filter.status || row.status === filter.status) }) }) }),
    findOne: async () => null,
  }) as any;
  return createStories({ collection, transact: (async () => { throw new Error("no writes in this test"); }) as any });
}

test("only approved stories are public, with no private fields", async () => {
  const stories = fakeStories([
    { _id: "S1", status: "Approved", displayName: "Priya S.", program: "Tech Explorer", programId: "explorer", quote: "Loved it", applicationId: "OL-1", consentedOn: "x", reviewerAccountId: "ACC" },
    { _id: "S2", status: "Pending", displayName: "Ravi K.", program: "Tech Explorer", programId: "explorer", quote: "Pending one", applicationId: "OL-2" },
  ]);
  const result = await stories.execute("story.public", {}, null, "");
  expect(result).toEqual([{ id: "S1", displayName: "Priya S.", program: "Tech Explorer", programId: "explorer", quote: "Loved it" }]);
});

test("story permissions: interns submit, only admins review, staff need certificates.read to list", async () => {
  const stories = fakeStories([]);
  await expect(stories.execute("story.submit", { quote: "A long enough story about my internship.", consent: true }, null, "k")).rejects.toThrow("intern account");
  await expect(stories.execute("story.review", { id: "S1", decision: "Approved" }, { id: "A", role: "company", staffRole: "recruiter", permissions: ["certificates.read"] } as any, "k")).rejects.toThrow("admin");
  await expect(stories.execute("story.list", {}, { id: "A", role: "company", staffRole: "viewer", permissions: [] } as any, "")).rejects.toThrow("cannot view");
});

test("certificate verification is limited to 20 checks per connection per minute", () => {
  const socket = { data: {} as any };
  for (let i = 0; i < 20; i++) expect(allowVerify(socket, 1000)).toBe(true);
  expect(allowVerify(socket, 1000)).toBe(false);
  expect(allowVerify(socket, 1000 + 60_000)).toBe(true);
});
