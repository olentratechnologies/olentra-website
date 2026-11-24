import { expect, test } from "bun:test";
import { planTeams, teamSizes } from "../../src/modules/teams/team-planner";

const people = (count: number, colleges = ["IIT", "NIT", "VIT"]) => Array.from({ length: count }, (_, i) => ({ id: `A${String(i + 1).padStart(3, "0")}`, name: `Intern ${String(i + 1).padStart(3, "0")}`, college: colleges[i % colleges.length] }));
const sizesOf = (plan: ReturnType<typeof planTeams>) => plan.teams.map(team => team.members.length);
const everyone = (plan: ReturnType<typeof planTeams>) => [...plan.teams.flatMap(team => team.members), ...plan.individuals];

test("50 interns in teams of 5 make exactly 10 teams", () => {
  const plan = planTeams(people(50), { size: 5, leftover: "smaller", mix: "random", seed: 7 });
  expect(sizesOf(plan)).toEqual(Array(10).fill(5));
  expect(plan.individuals).toEqual([]);
  expect(new Set(everyone(plan)).size).toBe(50);
  expect(plan.teams.map(team => team.name).slice(0, 2)).toEqual(["Team 1", "Team 2"]);
});

test("52 interns: each leftover choice", () => {
  expect(teamSizes(52, 5, "smaller")).toEqual({ sizes: [...Array(10).fill(5), 2], individuals: 0 });
  expect(teamSizes(52, 5, "spread")).toEqual({ sizes: [6, 6, ...Array(8).fill(5)], individuals: 0 });
  expect(teamSizes(52, 5, "individual")).toEqual({ sizes: Array(10).fill(5), individuals: 2 });
  const solo = planTeams(people(52), { size: 5, leftover: "individual", mix: "alphabetical" });
  expect(solo.individuals).toEqual(["A051", "A052"]);
  for (const leftover of ["smaller", "spread", "individual"] as const) expect(new Set(everyone(planTeams(people(52), { size: 5, leftover, mix: "random" }))).size).toBe(52);
});

test("team size is configurable, including teams of 10", () => {
  expect(sizesOf(planTeams(people(50), { size: 10, leftover: "smaller", mix: "random" }))).toEqual(Array(5).fill(10));
  expect(sizesOf(planTeams(people(53), { size: 10, leftover: "smaller", mix: "random" }))).toEqual([10, 10, 10, 10, 10, 3]);
  expect(sizesOf(planTeams(people(7), { size: 1, leftover: "smaller", mix: "random" }))).toEqual(Array(7).fill(1));
});

test("fewer interns than one team", () => {
  expect(teamSizes(3, 5, "smaller")).toEqual({ sizes: [3], individuals: 0 });
  expect(teamSizes(3, 5, "spread")).toEqual({ sizes: [3], individuals: 0 });
  expect(teamSizes(3, 5, "individual")).toEqual({ sizes: [], individuals: 3 });
  expect(planTeams([], { size: 5, leftover: "smaller", mix: "random" })).toEqual({ teams: [], individuals: [] });
});

test("the same seed gives the same teams; another seed reshuffles", () => {
  const a = planTeams(people(20), { size: 5, leftover: "smaller", mix: "random", seed: 42 });
  expect(planTeams(people(20), { size: 5, leftover: "smaller", mix: "random", seed: 42 })).toEqual(a);
  expect(planTeams(people(20), { size: 5, leftover: "smaller", mix: "random", seed: 43 })).not.toEqual(a);
});

test("mixing by college spreads each college across teams", () => {
  const plan = planTeams(people(30), { size: 5, leftover: "smaller", mix: "college", seed: 3 });
  const collegeOf = new Map(people(30).map(person => [person.id, person.college]));
  for (const team of plan.teams) expect(new Set(team.members.map(member => collegeOf.get(member))).size).toBe(3);
  expect(sizesOf(plan)).toEqual(Array(6).fill(5));
});

test("team names continue after existing teams and use the chosen prefix", () => {
  const plan = planTeams(people(10), { size: 5, leftover: "smaller", mix: "random", prefix: "Squad", startAt: 11 });
  expect(plan.teams.map(team => team.name)).toEqual(["Squad 11", "Squad 12"]);
});
