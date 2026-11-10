"use client";

import { createContext, useCallback, useContext, useLayoutEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { ADMIN_THEME_KEY, DEFAULT_ADMIN_THEME, isAdminTheme, readAdminTheme, saveAdminTheme } from "@/lib/admin/theme.mjs";

const ThemeContext = createContext(null);

function browserStorage() {
  try { return window.localStorage; } catch { return undefined; }
}

export function DashboardThemeProvider({ children }) {
  const [theme, setTheme] = useState(DEFAULT_ADMIN_THEME);
  const [message, setMessage] = useState("");

  useLayoutEffect(() => {
    const apply = next => {
      document.documentElement.setAttribute("data-admin-theme", next);
      setTheme(next);
    };
    apply(readAdminTheme(browserStorage()));
    const synchronize = event => {
      if (event.key !== ADMIN_THEME_KEY && event.key !== null) return;
      apply(isAdminTheme(event.newValue) ? event.newValue : DEFAULT_ADMIN_THEME);
      setMessage("");
    };
    window.addEventListener("storage", synchronize);
    return () => {
      window.removeEventListener("storage", synchronize);
      document.documentElement.removeAttribute("data-admin-theme");
    };
  }, []);

  const chooseTheme = useCallback(next => {
    if (!isAdminTheme(next)) return;
    document.documentElement.setAttribute("data-admin-theme", next);
    setTheme(next);
    const result = saveAdminTheme(browserStorage(), next);
    setMessage(result.persisted ? `${next === "dark" ? "Dark" : "Light"} mode saved.` : result.error);
  }, []);

  return <ThemeContext.Provider value={{ theme, chooseTheme, message }}>{children}</ThemeContext.Provider>;
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
    <button type="button" className="ad-theme-toggle" aria-label={`Switch to ${dark ? "light" : "dark"} mode`} aria-pressed={dark} title={message || `${dark ? "Dark" : "Light"} mode`} onClick={() => chooseTheme(dark ? "light" : "dark")}>
      {dark ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}<span>{dark ? "Dark" : "Light"}</span>
    </button>
    <span className="ad-theme-status" role="status" aria-live="polite">{message}</span>
  </>;
}
