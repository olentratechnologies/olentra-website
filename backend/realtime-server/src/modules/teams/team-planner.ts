/**
 * Splits a batch of interns into teams. Pure and deterministic for a given
 * seed, so a preview can be reshuffled and then created exactly as shown.
 */
export type Leftover = "smaller" | "spread" | "individual";
export type Mix = "random" | "alphabetical" | "college";
export type Person = { id: string; name: string; college?: string };
export type TeamPlan = { teams: { name: string; members: string[] }[]; individuals: string[] };

export const TEAM_SIZE_MIN = 1;
export const TEAM_SIZE_MAX = 50;
export const LEFTOVERS: Leftover[] = ["smaller", "spread", "individual"];
export const MIXES: Mix[] = ["random", "alphabetical", "college"];

/** Small seeded generator: the same seed always gives the same order. */
function seeded(seed: number) {
  let state = (seed >>> 0) || 1;
  return () => {
    state ^= state << 13; state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5; state >>>= 0;
    return state / 4294967296;
  };
}

function order(people: Person[], mix: Mix, seed: number) {
  const byName = (a: Person, b: Person) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }) || a.id.localeCompare(b.id);
  if (mix === "alphabetical") return [...people].sort(byName);
  const random = seeded(seed);
  const shuffled = [...people].sort(byName);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  if (mix !== "college") return shuffled;
  // Group by college (shuffled inside each group) so dealing round-robin spreads colleges across teams.
  const groups = new Map<string, Person[]>();
  for (const person of shuffled) {
    const key = (person.college || "").trim().toLowerCase();
    groups.set(key, [...(groups.get(key) || []), person]);
  }
  return [...groups.values()].sort((a, b) => b.length - a.length).flat();
}

/** How many people each team gets, and how many are left to work on their own. */
export function teamSizes(count: number, size: number, leftover: Leftover) {
  if (count <= 0) return { sizes: [] as number[], individuals: 0 };
  const full = Math.floor(count / size), rest = count % size;
  if (full === 0) return leftover === "individual" ? { sizes: [], individuals: count } : { sizes: [count], individuals: 0 };
  const sizes = Array.from({ length: full }, () => size);
  if (!rest) return { sizes, individuals: 0 };
  if (leftover === "smaller") return { sizes: [...sizes, rest], individuals: 0 };
  if (leftover === "individual") return { sizes, individuals: rest };
  for (let i = 0; i < rest; i++) sizes[i % full]! += 1;
  return { sizes, individuals: 0 };
}

export function planTeams(people: Person[], { size, leftover, mix, seed = 1, prefix = "Team", startAt = 1 }: { size: number; leftover: Leftover; mix: Mix; seed?: number; prefix?: string; startAt?: number }): TeamPlan {
  const ordered = order(people, mix, seed);
  const { sizes, individuals } = teamSizes(ordered.length, size, leftover);
  const teams = sizes.map((_, index) => ({ name: `${prefix} ${startAt + index}`, members: [] as string[] }));
  const placed = ordered.slice(0, ordered.length - individuals);
  if (mix === "college") {
    // Deal one person per team in turn, skipping full teams.
    let index = 0;
    for (const person of placed) {
      while (teams[index % teams.length]!.members.length >= sizes[index % teams.length]!) index++;
      teams[index % teams.length]!.members.push(person.id);
      index++;
    }
  } else {
    let cursor = 0;
    sizes.forEach((teamSize, index) => { teams[index]!.members = placed.slice(cursor, cursor + teamSize).map(person => person.id); cursor += teamSize; });
  }
  return { teams, individuals: ordered.slice(ordered.length - individuals).map(person => person.id) };
}
