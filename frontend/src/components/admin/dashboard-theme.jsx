"use client";

import { createContext, useCallback, useContext, useLayoutEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import {
  ADMIN_THEME_KEY, ADMIN_DARK_PRESET_KEY, ADMIN_DARK_PRESETS,
  DEFAULT_ADMIN_THEME, DEFAULT_ADMIN_DARK_PRESET,
  isAdminTheme, isAdminDarkPreset, readAdminTheme, readAdminDarkPreset,
  saveAdminTheme, saveAdminDarkPreset,
} from "@/lib/admin/theme.mjs";
import { DarkThemePicker } from "@/components/theme/DarkThemePicker";

const ThemeContext = createContext(null);

function browserStorage() {
  try { return window.localStorage; } catch { return undefined; }
}

export function DashboardThemeProvider({ children }) {
  const [theme, setTheme] = useState(DEFAULT_ADMIN_THEME);
  const [darkPreset, setDarkPreset] = useState(DEFAULT_ADMIN_DARK_PRESET);
  const [message, setMessage] = useState("");

  useLayoutEffect(() => {
    const restore = () => {
      const storage = browserStorage();
      const nextTheme = readAdminTheme(storage);
      const nextPreset = readAdminDarkPreset(storage);
      document.documentElement.setAttribute("data-admin-theme", nextTheme);
      document.documentElement.setAttribute("data-admin-dark-preset", nextPreset);
      setTheme(nextTheme);
      setDarkPreset(nextPreset);
    };
    restore();
    const synchronize = event => {
      if (event.key !== ADMIN_THEME_KEY && event.key !== ADMIN_DARK_PRESET_KEY && event.key !== null) return;
      restore();
      setMessage("");
    };
    window.addEventListener("storage", synchronize);
    return () => {
      window.removeEventListener("storage", synchronize);
      document.documentElement.removeAttribute("data-admin-theme");
      document.documentElement.removeAttribute("data-admin-dark-preset");
    };
  }, []);

  const chooseTheme = useCallback(next => {
    if (!isAdminTheme(next)) return;
    document.documentElement.setAttribute("data-admin-theme", next);
    setTheme(next);
    const result = saveAdminTheme(browserStorage(), next);
    setMessage(result.persisted ? `${next === "dark" ? "Dark" : "Light"} mode saved.` : result.error);
  }, []);

  const chooseDarkPreset = useCallback(next => {
    if (!isAdminDarkPreset(next)) return;
    document.documentElement.setAttribute("data-admin-dark-preset", next);
    document.documentElement.setAttribute("data-admin-theme", "dark");
    setDarkPreset(next);
    setTheme("dark");
    const storage = browserStorage();
    const presetResult = saveAdminDarkPreset(storage, next);
    const themeResult = saveAdminTheme(storage, "dark");
    const label = ADMIN_DARK_PRESETS.find(preset => preset.id === next).label;
    setMessage(presetResult.persisted && themeResult.persisted
      ? `${label} saved.`
      : `${label} applied for this visit. Your appearance could not be saved in this browser.`);
  }, []);

  return <ThemeContext.Provider value={{ theme, darkPreset, chooseTheme, chooseDarkPreset, message }}>{children}</ThemeContext.Provider>;
}

export function useDashboardTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("Dashboard theme controls must be inside DashboardThemeProvider.");
  return context;
}

export function DashboardThemeToggle() {
  const { theme, chooseTheme, message } = useDashboardTheme();
  const dark = theme === "dark";
  return <>
    <button type="button" className="workspace-theme-toggle" aria-label={`Switch to ${dark ? "light" : "dark"} mode`} aria-pressed={dark} title={message || `${dark ? "Dark" : "Light"} mode`} onClick={() => chooseTheme(dark ? "light" : "dark")}>
      {dark ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}<span>{dark ? "Dark" : "Light"}</span>
    </button>
    <span className="workspace-theme-status" role="status" aria-live="polite">{message}</span>
  </>;
}

export function DashboardAppearance() {
  return <DarkThemePicker {...useDashboardTheme()} triggerClassName="workspace-theme-toggle" />;
}
