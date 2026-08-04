import { describe, expect, test } from "bun:test";
import {
  applyTheme,
  getStoredTheme,
  persistTheme,
  resolveInitialTheme,
  THEME_STORAGE_KEY,
  toggleTheme,
} from "./theme";

function fakeStorage(initial: Record<string, string> = {}) {
  const store = { ...initial };
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    _store: store,
  };
}

function fakeRoot() {
  const classes = new Set<string>();
  return {
    classList: {
      add: (c: string) => classes.add(c),
      remove: (c: string) => classes.delete(c),
    },
    _classes: classes,
  };
}

describe("theme", () => {
  test("getStoredTheme returns null when nothing stored or value is invalid", () => {
    expect(getStoredTheme(fakeStorage())).toBeNull();
    expect(
      getStoredTheme(fakeStorage({ [THEME_STORAGE_KEY]: "purple" })),
    ).toBeNull();
  });

  test("getStoredTheme returns the stored theme when valid", () => {
    expect(getStoredTheme(fakeStorage({ [THEME_STORAGE_KEY]: "dark" }))).toBe(
      "dark",
    );
  });

  test("resolveInitialTheme prefers the stored theme over system preference", () => {
    const storage = fakeStorage({ [THEME_STORAGE_KEY]: "light" });
    expect(resolveInitialTheme(storage, true)).toBe("light");
  });

  test("resolveInitialTheme falls back to system preference when nothing stored", () => {
    expect(resolveInitialTheme(fakeStorage(), true)).toBe("dark");
    expect(resolveInitialTheme(fakeStorage(), false)).toBe("light");
  });

  test("toggleTheme flips between light and dark", () => {
    expect(toggleTheme("light")).toBe("dark");
    expect(toggleTheme("dark")).toBe("light");
  });

  test("applyTheme adds the dark class only for dark", () => {
    const darkRoot = fakeRoot();
    applyTheme(darkRoot, "dark");
    expect(darkRoot._classes.has("dark")).toBe(true);

    const lightRoot = fakeRoot();
    applyTheme(lightRoot, "light");
    expect(lightRoot._classes.has("dark")).toBe(false);
  });

  test("persistTheme writes to storage under the theme key", () => {
    const storage = fakeStorage();
    persistTheme(storage, "dark");
    expect(storage._store[THEME_STORAGE_KEY]).toBe("dark");
  });
});
