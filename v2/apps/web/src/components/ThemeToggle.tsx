import { useEffect, useState } from "react";
import { PILL } from "./pill";
import {
  applyTheme,
  persistTheme,
  resolveInitialTheme,
  toggleTheme,
  type Theme,
} from "../theme";

// Matches the server's fixed guess for the very first client render
// (localStorage/matchMedia don't exist during SSR - "light" is what the
// server always renders) - corrected below once mounted. THEME_INIT_SCRIPT
// already set the real class on <html> before hydration, so there's no
// visible flash there; only this component's own label briefly shows the
// wrong value until the correction effect runs, a frame or two after mount.
const SSR_THEME: Theme = "light";

// WHO WRITES <html>: the same division as ThemeFamilyToggle's. This component
// writes only a value it has resolved or been given, never the SSR guess —
// applying `theme` from an effect keyed on it would strip `.dark` on mount
// before the resolve effect put it back.
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(SSR_THEME);

  useEffect(() => {
    const initial = resolveInitialTheme(
      window.localStorage,
      window.matchMedia("(prefers-color-scheme: dark)").matches,
    );
    applyTheme(document.documentElement, initial);
    setTheme(initial);
  }, []);

  function handleClick() {
    const next = toggleTheme(theme);
    persistTheme(window.localStorage, next);
    applyTheme(document.documentElement, next);
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      // The visible label is the current state, so the accessible name has to
      // carry both it and the action - "Toggle light and dark" alone would
      // hide which one is showing from a screen reader.
      aria-label={
        theme === "dark" ? "Dark — switch to light" : "Light — switch to dark"
      }
      className={`${PILL} border border-rule text-ink-2 hover:bg-surface-2 hover:text-ink`}
    >
      {theme === "dark" ? "Dark" : "Light"}
    </button>
  );
}
