// Keep the original storage key so existing dashboard choices carry everywhere.
export const DARK_PRESET_KEY = "olentra.admin.dark-preset.v1";
export const DEFAULT_DARK_PRESET = "obsidian-blue";

export const DARK_PRESETS = Object.freeze([
  { id: "obsidian-blue", label: "Obsidian Blue", description: "Cool black surfaces with blue accents." },
  { id: "carbon-silver", label: "Carbon Silver", description: "Neutral charcoal with silver accents." },
  { id: "black-emerald", label: "Black Emerald", description: "Deep black surfaces with emerald accents." },
  { id: "night-sky", label: "Original Night Sky", description: "The original blue and purple night-sky design." },
].map(preset => Object.freeze(preset)));

export function isDarkPreset(value) {
  return DARK_PRESETS.some(preset => preset.id === value);
}

export function readDarkPreset(storage) {
  try {
    const saved = storage?.getItem(DARK_PRESET_KEY);
    return isDarkPreset(saved) ? saved : DEFAULT_DARK_PRESET;
  } catch {
    return DEFAULT_DARK_PRESET;
  }
}

export function saveDarkPreset(storage, preset) {
  if (!isDarkPreset(preset)) return { ok: false, persisted: false, error: "Choose a valid dark design." };
  try {
    if (!storage) throw new Error("Browser storage is unavailable.");
    storage.setItem(DARK_PRESET_KEY, preset);
    return { ok: true, persisted: true };
  } catch {
    return { ok: true, persisted: false, error: "Dark design changed for this visit. Browser storage is unavailable." };
  }
}
