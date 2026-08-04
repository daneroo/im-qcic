import { useEffect, useState } from "react";
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

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(SSR_THEME);

  useEffect(() => {
    setTheme(
      resolveInitialTheme(
        window.localStorage,
        window.matchMedia("(prefers-color-scheme: dark)").matches,
      ),
    );
  }, []);

  useEffect(() => {
    applyTheme(document.documentElement, theme);
  }, [theme]);

  function handleClick() {
    const next = toggleTheme(theme);
    persistTheme(window.localStorage, next);
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Toggle color theme"
      className="rounded border border-gray-300 px-3 py-1 text-sm dark:border-gray-600"
    >
      {theme === "dark" ? "Dark" : "Light"}
    </button>
  );
}
