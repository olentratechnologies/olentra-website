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
export const ADMIN_THEME_BOOTSTRAP = `(function(){var t="light";try{var s=localStorage.getItem("${ADMIN_THEME_KEY}");if(s==="light"||s==="dark")t=s}catch(e){}document.documentElement.setAttribute("data-admin-theme",t)})()`;
