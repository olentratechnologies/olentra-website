/** Up to 10 skills, each trimmed, at most 32 characters, duplicates (ignoring case) dropped. */
export const MAX_SKILLS = 10, MAX_SKILL_LENGTH = 32;

export function normalizeSkills(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  const seen = new Set<string>(), skills: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") continue;
    const skill = entry.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim().slice(0, MAX_SKILL_LENGTH).trim();
    const key = skill.toLowerCase();
    if (!skill || seen.has(key)) continue;
    seen.add(key); skills.push(skill);
    if (skills.length === MAX_SKILLS) break;
  }
  return skills;
}
