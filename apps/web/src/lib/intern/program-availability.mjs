const compensationModes = new Set(["free", "paid", "both"]);
const configuredAmount = amount => Number.isSafeInteger(amount) && amount >= 0;

// The single internship program remains available for either stipend setup until staff choose a mode.
export const normalizeCompensationMode = value => compensationModes.has(value) ? value : "both";

export function matchesCompensationMode(program, mode) {
  if (!configuredAmount(program?.stipend)) return false;
  const selectedMode = normalizeCompensationMode(mode);
  return selectedMode === "both" || (selectedMode === "free" ? program.stipend === 0 : program.stipend > 0);
}

export function isProgramAvailable(program, settings) {
  return Boolean(settings?.programEnabled && program?.enabled && configuredAmount(program.fee) && matchesCompensationMode(program, settings.compensationMode));
}

export function resolveProgramSelection(selectedId, availableIds) {
  if (availableIds.length === 1) return availableIds[0];
  return availableIds.includes(selectedId) ? selectedId : "";
}

export function programCompensationLabel(program) {
  if (!configuredAmount(program?.stipend)) return "Stipend to be announced";
  return program.stipend === 0 ? "Unpaid · No stipend" : `Paid · Stipend ₹${program.stipend.toLocaleString("en-IN")}/month`;
}
