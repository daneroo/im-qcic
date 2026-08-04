export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "qcic-web:theme";

// Kept as narrow Pick<> types (not the full Storage/DOMTokenList interfaces)
// so tests can inject plain objects instead of a real DOM.
type ThemeStorage = Pick<Storage, "getItem" | "setItem">;
type ThemeRoot = { classList: Pick<DOMTokenList, "add" | "remove"> };

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

// Inlined into __root.tsx's <head> as a raw <script> - runs before React
// hydrates, so the correct class is already on <html> for first paint (no
// flash of the wrong theme). Kept as a plain string, not a function stringified
// at runtime, since it must survive being embedded in server-rendered HTML
// exactly as written.
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});var d=t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark");}catch(e){}})();`;
