import {
  DARK_PRESET_KEY as ADMIN_DARK_PRESET_KEY,
  DEFAULT_DARK_PRESET as DEFAULT_ADMIN_DARK_PRESET,
  DARK_PRESETS as ADMIN_DARK_PRESETS,
  isDarkPreset as isAdminDarkPreset,
  readDarkPreset as readAdminDarkPreset,
  saveDarkPreset as saveAdminDarkPreset,
} from "../theme/dark-presets.mjs";

export { ADMIN_DARK_PRESET_KEY, DEFAULT_ADMIN_DARK_PRESET, ADMIN_DARK_PRESETS, isAdminDarkPreset, readAdminDarkPreset, saveAdminDarkPreset };
export const ADMIN_THEME_KEY = "olentra.admin.theme.v1";
export const DEFAULT_ADMIN_THEME = "light";

export function isAdminTheme(value) {
  return value === "light" || value === "dark";
}

export function readAdminTheme(storage) {
  try {
    const saved = storage?.getItem(ADMIN_THEME_KEY);
    return isAdminTheme(saved) ? saved : DEFAULT_ADMIN_THEME;
  } catch {
    return DEFAULT_ADMIN_THEME;
  }
}

export function saveAdminTheme(storage, theme) {
  if (!isAdminTheme(theme)) return { ok: false, persisted: false, error: "Choose light or dark mode." };
  try {
    if (!storage) throw new Error("Browser storage is unavailable.");
    storage.setItem(ADMIN_THEME_KEY, theme);
    return { ok: true, persisted: true };
  } catch {
    return { ok: true, persisted: false, error: "Theme changed for this visit. Browser storage is unavailable." };
  }
}

// Static application code only: no request or user input is interpolated here.
export const ADMIN_THEME_BOOTSTRAP = `(function(){var t="${DEFAULT_ADMIN_THEME}",p="${DEFAULT_ADMIN_DARK_PRESET}";try{var s=localStorage.getItem("${ADMIN_THEME_KEY}");if(s==="light"||s==="dark")t=s}catch(e){}try{var d=localStorage.getItem("${ADMIN_DARK_PRESET_KEY}");if(${JSON.stringify(ADMIN_DARK_PRESETS.map(preset => preset.id))}.indexOf(d)!==-1)p=d}catch(e){}document.documentElement.setAttribute("data-admin-theme",t);document.documentElement.setAttribute("data-admin-dark-preset",p)})()`;
