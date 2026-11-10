// Light/dark preference for the internship dashboards. Kept separate from the
// admin dashboard preference so staff and interns choose independently.
export const INTERN_THEME_KEY = "olentra.intern.theme.v1";
export const INTERN_THEME_ATTRIBUTE = "data-intern-theme";
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
export const INTERN_THEME_BOOTSTRAP = `(function(){var t="light";try{var s=localStorage.getItem("${INTERN_THEME_KEY}");if(s==="light"||s==="dark")t=s}catch(e){}document.documentElement.setAttribute("${INTERN_THEME_ATTRIBUTE}",t)})()`;
