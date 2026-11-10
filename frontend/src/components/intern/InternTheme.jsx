"use client";

import { createContext, useCallback, useContext, useLayoutEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import {
  DEFAULT_INTERN_THEME,
  INTERN_THEME_ATTRIBUTE,
  INTERN_THEME_KEY,
  isInternTheme,
  readInternTheme,
  saveInternTheme,
} from "@/lib/intern/theme.mjs";
import "@/components/theme/sky-tokens.css";
import styles from "./intern-theme.module.css";

const ThemeContext = createContext(null);

function browserStorage() {
  try { return window.localStorage; } catch { return undefined; }
}

export function InternThemeProvider({ children }) {
  const [theme, setTheme] = useState(DEFAULT_INTERN_THEME);
  const [message, setMessage] = useState("");

  useLayoutEffect(() => {
    const apply = next => {
      document.documentElement.setAttribute(INTERN_THEME_ATTRIBUTE, next);
      setTheme(next);
    };
    apply(readInternTheme(browserStorage()));
    const synchronize = event => {
      if (event.key !== INTERN_THEME_KEY && event.key !== null) return;
      apply(isInternTheme(event.newValue) ? event.newValue : DEFAULT_INTERN_THEME);
      setMessage("");
    };
    window.addEventListener("storage", synchronize);
    return () => {
      window.removeEventListener("storage", synchronize);
      // Pages outside the themed area (sign-in, public careers page) must not inherit the palette.
      document.documentElement.removeAttribute(INTERN_THEME_ATTRIBUTE);
    };
  }, []);

  const chooseTheme = useCallback(next => {
    if (!isInternTheme(next)) return;
    document.documentElement.setAttribute(INTERN_THEME_ATTRIBUTE, next);
    setTheme(next);
    const result = saveInternTheme(browserStorage(), next);
    setMessage(result.persisted ? `${next === "dark" ? "Dark" : "Light"} mode saved.` : result.error);
  }, []);

  return <ThemeContext.Provider value={{ theme, chooseTheme, message }}>{children}</ThemeContext.Provider>;
}

export function InternThemeToggle({ className = "", floating = false }) {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("Theme controls must be inside InternThemeProvider.");
  const { theme, chooseTheme, message } = context;
  const dark = theme === "dark";
  return <>
    <button
      type="button"
      className={[styles.toggle, floating ? styles.floating : "", className].filter(Boolean).join(" ")}
      aria-label={`Switch to ${dark ? "light" : "dark"} mode`}
      aria-pressed={dark}
      title={message || `${dark ? "Dark" : "Light"} mode`}
      onClick={() => chooseTheme(dark ? "light" : "dark")}
    >
      {dark ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
      <span>{dark ? "Dark" : "Light"}</span>
    </button>
    <span className={styles.status} role="status" aria-live="polite">{message}</span>
  </>;
}
