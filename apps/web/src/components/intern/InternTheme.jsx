"use client";

import { createContext, useCallback, useContext, useLayoutEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import {
  DEFAULT_INTERN_THEME,
  INTERN_DARK_PRESET_ATTRIBUTE,
  INTERN_THEME_ATTRIBUTE,
  INTERN_THEME_KEY,
  isInternTheme,
  readInternTheme,
  saveInternTheme,
} from "@olentra/ui/theme/intern-theme.mjs";
import {
  DARK_PRESET_KEY, DEFAULT_DARK_PRESET, readDarkPreset,
} from "@olentra/ui/theme/dark-presets.mjs";
import "@olentra/ui/theme/sky-tokens.css";
import "@olentra/ui/theme/dark-presets.css";
import styles from "./intern-theme.module.css";

const ThemeContext = createContext(null);

function browserStorage() {
  try { return window.localStorage; } catch { return undefined; }
}

export function InternThemeProvider({ children }) {
  const [theme, setTheme] = useState(DEFAULT_INTERN_THEME);
  const [darkPreset, setDarkPreset] = useState(DEFAULT_DARK_PRESET);
  const [message, setMessage] = useState("");

  useLayoutEffect(() => {
    const restore = () => {
      const storage = browserStorage();
      const nextTheme = readInternTheme(storage);
      const nextPreset = readDarkPreset(storage);
      document.documentElement.setAttribute(INTERN_THEME_ATTRIBUTE, nextTheme);
      document.documentElement.setAttribute(INTERN_DARK_PRESET_ATTRIBUTE, nextPreset);
      setTheme(nextTheme);
      setDarkPreset(nextPreset);
    };
    restore();
    const synchronize = event => {
      if (event.key !== INTERN_THEME_KEY && event.key !== DARK_PRESET_KEY && event.key !== null) return;
      restore();
      setMessage("");
    };
    window.addEventListener("storage", synchronize);
    return () => {
      window.removeEventListener("storage", synchronize);
      // Pages outside the themed area (sign-in, public careers page) must not inherit the palette.
      document.documentElement.removeAttribute(INTERN_THEME_ATTRIBUTE);
      document.documentElement.removeAttribute(INTERN_DARK_PRESET_ATTRIBUTE);
    };
  }, []);

  const chooseTheme = useCallback(next => {
    if (!isInternTheme(next)) return;
    document.documentElement.setAttribute(INTERN_THEME_ATTRIBUTE, next);
    setTheme(next);
    const result = saveInternTheme(browserStorage(), next);
    setMessage(result.persisted ? `${next === "dark" ? "Dark" : "Light"} mode saved.` : result.error);
  }, []);

  return <ThemeContext.Provider value={{ theme, darkPreset, chooseTheme, message }}>{children}</ThemeContext.Provider>;
}

export function InternThemeToggle({ className = "", floating = false }) {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("Theme controls must be inside InternThemeProvider.");
  const { theme, chooseTheme, message } = context;
  const dark = theme === "dark";
  return <div className={[styles.controls, floating ? styles.floating : ""].filter(Boolean).join(" ")}>
    <button
      type="button"
      className={[styles.toggle, className].filter(Boolean).join(" ")}
      aria-label={`Switch to ${dark ? "light" : "dark"} mode`}
      aria-pressed={dark}
      title={message || `${dark ? "Dark" : "Light"} mode`}
      onClick={() => chooseTheme(dark ? "light" : "dark")}
    >
      {dark ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
      <span>{dark ? "Dark" : "Light"}</span>
    </button>
    <span className={styles.status} role="status" aria-live="polite">{message}</span>
  </div>;
}
