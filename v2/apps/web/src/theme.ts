// Two independent axes, deliberately kept apart:
//
//   LIGHT/DARK is the `.dark` class on <html>, and follows the system
//   preference until the reader overrides it.
//
//   FAMILY is `data-theme` on <html> - which of the three palettes in
//   theme.css is in play. There is no system signal for it, so it defaults to
//   `sketch` and is otherwise the reader's choice alone.
//
// Both persist, and both are set before hydration by THEME_INIT_SCRIPT.

export type Theme = "light" | "dark";

export const THEME_FAMILIES = ["sketch", "chromatic", "catppuccin"] as const;
export type ThemeFamily = (typeof THEME_FAMILIES)[number];

/** Monochrome, so the one chromatic token still shocks when it appears. */
export const DEFAULT_THEME_FAMILY: ThemeFamily = "sketch";

export const THEME_FAMILY_LABEL: Record<ThemeFamily, string> = {
  sketch: "Sketch",
  chromatic: "Chromatic",
  catppuccin: "Catppuccin",
};

export const THEME_STORAGE_KEY = "qcic-web:theme";
export const THEME_FAMILY_STORAGE_KEY = "qcic-web:theme-family";

// Kept as narrow Pick<> types (not the full Storage/DOMTokenList interfaces)
// so tests can inject plain objects instead of a real DOM.
// Each axis asks for only the part of <html> it touches, so neither can reach
// the other's.
type ThemeStorage = Pick<Storage, "getItem" | "setItem">;
type ThemeRoot = { classList: Pick<DOMTokenList, "add" | "remove"> };
type ThemeFamilyRoot = { dataset: DOMStringMap };

export function getStoredTheme(storage: ThemeStorage): Theme | null {
  const value = storage.getItem(THEME_STORAGE_KEY);
  return value === "light" || value === "dark" ? value : null;
}

export function resolveInitialTheme(
  storage: ThemeStorage,
  systemPrefersDark: boolean,
): Theme {
  return getStoredTheme(storage) ?? (systemPrefersDark ? "dark" : "light");
}

export function toggleTheme(current: Theme): Theme {
  return current === "dark" ? "light" : "dark";
}

export function applyTheme(root: ThemeRoot, theme: Theme): void {
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function persistTheme(storage: ThemeStorage, theme: Theme): void {
  storage.setItem(THEME_STORAGE_KEY, theme);
}

function isThemeFamily(value: unknown): value is ThemeFamily {
  return THEME_FAMILIES.includes(value as ThemeFamily);
}

export function getStoredThemeFamily(
  storage: ThemeStorage,
): ThemeFamily | null {
  const value = storage.getItem(THEME_FAMILY_STORAGE_KEY);
  return isThemeFamily(value) ? value : null;
}

export function resolveInitialThemeFamily(storage: ThemeStorage): ThemeFamily {
  return getStoredThemeFamily(storage) ?? DEFAULT_THEME_FAMILY;
}

/**
 * The next family in the list, wrapping at the end. The family control is one
 * button with three states rather than three buttons, so it reads the same way
 * as the light/dark toggle beside it — a control that says what it currently
 * is, and advances when pressed.
 */
export function cycleThemeFamily(current: ThemeFamily): ThemeFamily {
  const next = (THEME_FAMILIES.indexOf(current) + 1) % THEME_FAMILIES.length;
  return THEME_FAMILIES[next]!;
}

export function applyThemeFamily(
  root: ThemeFamilyRoot,
  family: ThemeFamily,
): void {
  root.dataset.theme = family;
}

export function persistThemeFamily(
  storage: ThemeStorage,
  family: ThemeFamily,
): void {
  storage.setItem(THEME_FAMILY_STORAGE_KEY, family);
}

// Inlined into __root.tsx's <head> as a raw <script> - runs before React
// hydrates, so both axes are already on <html> for first paint (no flash of
// the wrong theme, in either axis). Kept as a plain string, not a function
// stringified at runtime, since it must survive being embedded in
// server-rendered HTML exactly as written.
//
// The family is written first, so a browser that refuses localStorage (Safari
// in private mode throws on access) still lands on a named family rather than
// falling through to theme.css's bare `html` rule. theme.test.ts runs this
// string against fakes rather than trusting it by eye.
export const THEME_INIT_SCRIPT = `(function(){try{var r=document.documentElement;r.dataset.theme=${JSON.stringify(
  DEFAULT_THEME_FAMILY,
)};var f=localStorage.getItem(${JSON.stringify(
  THEME_FAMILY_STORAGE_KEY,
)});if(${JSON.stringify(THEME_FAMILIES)}.indexOf(f)>=0)r.dataset.theme=f;var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});var d=t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d)r.classList.add("dark");}catch(e){}})();`;
