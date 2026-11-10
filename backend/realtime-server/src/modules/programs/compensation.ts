export type CompensationMode = "free" | "paid" | "both";

export function isCompensationMode(value: unknown): value is CompensationMode {
  return value === "free" || value === "paid" || value === "both";
}

/** Existing installations accept both stipend types until an admin chooses otherwise. */
export function normalizeCompensationMode(value: unknown): CompensationMode {
  return isCompensationMode(value) ? value : "both";
}

export function acceptsCompensationMode(stipend: unknown, mode: unknown): boolean {
  if (typeof stipend !== "number" || !Number.isSafeInteger(stipend) || stipend < 0) return false;
  const selected = normalizeCompensationMode(mode);
  return selected === "both" || (selected === "free" ? stipend === 0 : stipend > 0);
}
