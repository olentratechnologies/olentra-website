import { DARK_PRESET_KEY, DEFAULT_DARK_PRESET, DARK_PRESETS } from "./dark-presets.mjs";

export {
  DARK_PRESET_KEY as INTERN_DARK_PRESET_KEY,
  DEFAULT_DARK_PRESET as DEFAULT_INTERN_DARK_PRESET,
  DARK_PRESETS as INTERN_DARK_PRESETS,
  isDarkPreset as isInternDarkPreset,
  readDarkPreset as readInternDarkPreset,
  saveDarkPreset as saveInternDarkPreset,
} from "./dark-presets.mjs";

// Light/dark preference for the internship dashboards. Kept separate from the
// admin dashboard preference so staff and interns choose independently.
export const INTERN_THEME_KEY = "olentra.intern.theme.v1";
export const INTERN_THEME_ATTRIBUTE = "data-intern-theme";
export const INTERN_DARK_PRESET_ATTRIBUTE = "data-intern-dark-preset";
export const DEFAULT_INTERN_THEME = "light";

export function isInternTheme(value) {
  return value === "light" || value === "dark";
}

export function readInternTheme(storage) {
  try {
    const saved = storage?.getItem(INTERN_THEME_KEY);
    return isInternTheme(saved) ? saved : DEFAULT_INTERN_THEME;
  } catch {
    return DEFAULT_INTERN_THEME;
  }
}

export function saveInternTheme(storage, theme) {
  if (!isInternTheme(theme)) return { ok: false, persisted: false, error: "Choose light or dark mode." };
  try {
    if (!storage) throw new Error("Browser storage is unavailable.");
    storage.setItem(INTERN_THEME_KEY, theme);
    return { ok: true, persisted: true };
  } catch {
    return { ok: true, persisted: false, error: "Theme changed for this visit. Browser storage is unavailable." };
  }
}

// Static application code only: no request or user input is interpolated here.
export const INTERN_THEME_BOOTSTRAP = `(function(){var t="${DEFAULT_INTERN_THEME}",p="${DEFAULT_DARK_PRESET}";try{var s=localStorage.getItem("${INTERN_THEME_KEY}");if(s==="light"||s==="dark")t=s}catch(e){}try{var d=localStorage.getItem("${DARK_PRESET_KEY}");if(${JSON.stringify(DARK_PRESETS.map(preset => preset.id))}.indexOf(d)!==-1)p=d}catch(e){}document.documentElement.setAttribute("${INTERN_THEME_ATTRIBUTE}",t);document.documentElement.setAttribute("${INTERN_DARK_PRESET_ATTRIBUTE}",p)})()`;
