import { describe, expect, test } from "bun:test";
import {
  applyTheme,
  applyThemeFamily,
  cycleThemeFamily,
  DEFAULT_THEME_FAMILY,
  getStoredTheme,
  getStoredThemeFamily,
  persistTheme,
  persistThemeFamily,
  resolveInitialTheme,
  resolveInitialThemeFamily,
  THEME_FAMILIES,
  THEME_FAMILY_STORAGE_KEY,
  THEME_INIT_SCRIPT,
  THEME_STORAGE_KEY,
  toggleTheme,
  type ThemeFamily,
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
    dataset: {} as { theme?: string },
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

describe("theme family", () => {
  test("all three families ship", () => {
    expect(THEME_FAMILIES).toEqual(["sketch", "chromatic", "catppuccin"]);
  });

  test("getStoredThemeFamily returns null when nothing stored or invalid", () => {
    expect(getStoredThemeFamily(fakeStorage())).toBeNull();
    expect(
      getStoredThemeFamily(fakeStorage({ [THEME_FAMILY_STORAGE_KEY]: "dark" })),
    ).toBeNull();
  });

  test("getStoredThemeFamily returns the stored family when valid", () => {
    for (const family of THEME_FAMILIES) {
      const storage = fakeStorage({ [THEME_FAMILY_STORAGE_KEY]: family });
      expect(getStoredThemeFamily(storage)).toBe(family);
    }
  });

  test("resolveInitialThemeFamily prefers the stored family", () => {
    const storage = fakeStorage({ [THEME_FAMILY_STORAGE_KEY]: "catppuccin" });
    expect(resolveInitialThemeFamily(storage)).toBe("catppuccin");
  });

  test("resolveInitialThemeFamily falls back to sketch", () => {
    // No system signal for a family the way there is for light/dark, so the
    // default is a choice: monochrome, where the one chromatic token shocks.
    expect(resolveInitialThemeFamily(fakeStorage())).toBe("sketch");
    expect(DEFAULT_THEME_FAMILY).toBe("sketch");
  });

  test("applyThemeFamily writes data-theme, replacing any previous family", () => {
    const root = fakeRoot();
    applyThemeFamily(root, "chromatic");
    expect(root.dataset.theme).toBe("chromatic");
    applyThemeFamily(root, "sketch");
    expect(root.dataset.theme).toBe("sketch");
  });

  test("the family axis is independent of the light/dark axis", () => {
    const root = fakeRoot();
    applyThemeFamily(root, "catppuccin");
    applyTheme(root, "dark");
    expect(root.dataset.theme).toBe("catppuccin");
    expect(root._classes.has("dark")).toBe(true);

    applyTheme(root, "light");
    expect(root.dataset.theme).toBe("catppuccin");
  });

  test("cycleThemeFamily advances through the families and wraps", () => {
    // One control, three states - the same shape as the light/dark toggle,
    // which is why the picker is a button and not three of them.
    expect(cycleThemeFamily("sketch")).toBe("chromatic");
    expect(cycleThemeFamily("chromatic")).toBe("catppuccin");
    expect(cycleThemeFamily("catppuccin")).toBe("sketch");
  });

  test("cycling through every family returns to where it started", () => {
    let family: ThemeFamily = DEFAULT_THEME_FAMILY;
    const seen = new Set<ThemeFamily>();
    for (let i = 0; i < THEME_FAMILIES.length; i++) {
      seen.add(family);
      family = cycleThemeFamily(family);
    }
    expect(seen.size).toBe(THEME_FAMILIES.length);
    expect(family).toBe(DEFAULT_THEME_FAMILY);
  });

  test("persistThemeFamily writes under its own key, not the theme key", () => {
    const storage = fakeStorage();
    persistThemeFamily(storage, "chromatic");
    expect(storage._store[THEME_FAMILY_STORAGE_KEY]).toBe("chromatic");
    expect(storage._store[THEME_STORAGE_KEY]).toBeUndefined();
  });
});

// The no-flash script is a string embedded in server-rendered HTML, so it can
// be run here against fakes: its parameters shadow the globals it names.
function runInitScript(options: {
  stored?: Record<string, string>;
  systemPrefersDark?: boolean;
  storageThrows?: boolean;
}) {
  const root = fakeRoot();
  const storage = options.storageThrows
    ? {
        getItem() {
          throw new Error("localStorage is disabled");
        },
      }
    : fakeStorage(options.stored);
  const run = new Function(
    "localStorage",
    "window",
    "document",
    THEME_INIT_SCRIPT,
  );
  run(
    storage,
    { matchMedia: () => ({ matches: options.systemPrefersDark ?? false }) },
    { documentElement: root },
  );
  return root;
}

describe("THEME_INIT_SCRIPT", () => {
  test("applies both axes from storage before paint", () => {
    const root = runInitScript({
      stored: {
        [THEME_STORAGE_KEY]: "dark",
        [THEME_FAMILY_STORAGE_KEY]: "catppuccin",
      },
    });
    expect(root._classes.has("dark")).toBe(true);
    expect(root.dataset.theme).toBe("catppuccin");
  });

  test("falls back to the system preference for light/dark only", () => {
    const dark = runInitScript({ systemPrefersDark: true });
    expect(dark._classes.has("dark")).toBe(true);
    expect(dark.dataset.theme).toBe("sketch");

    const light = runInitScript({ systemPrefersDark: false });
    expect(light._classes.has("dark")).toBe(false);
    expect(light.dataset.theme).toBe("sketch");
  });

  test("a stored light theme wins over a dark system preference", () => {
    const root = runInitScript({
      stored: { [THEME_STORAGE_KEY]: "light" },
      systemPrefersDark: true,
    });
    expect(root._classes.has("dark")).toBe(false);
  });

  test("ignores a family it does not ship", () => {
    const root = runInitScript({
      stored: { [THEME_FAMILY_STORAGE_KEY]: "solarized" },
    });
    expect(root.dataset.theme).toBe("sketch");
  });

  test("still names a family when storage is unavailable", () => {
    // Safari in private mode throws on access. A page with no family at all
    // would fall through to the bare `html` rule, which is sketch anyway -
    // this just makes the rendered state say so.
    const root = runInitScript({ storageThrows: true });
    expect(root.dataset.theme).toBe("sketch");
    expect(root._classes.has("dark")).toBe(false);
  });

  test("names both storage keys, so the script and the module cannot drift", () => {
    expect(THEME_INIT_SCRIPT).toContain(JSON.stringify(THEME_STORAGE_KEY));
    expect(THEME_INIT_SCRIPT).toContain(
      JSON.stringify(THEME_FAMILY_STORAGE_KEY),
    );
  });
});

// theme.css is the other half of the theme layer, and the half no unit test
// would normally reach. Parsing it here is cheap and guards the thing that
// actually breaks in a 230-line palette file: a token quietly missing from
// one of the six, which shows up as an unstyled element in that theme only.
const THEME_CSS = await Bun.file(
  new URL("./theme.css", import.meta.url),
).text();

function paletteBlocks(source: string): Record<string, Record<string, string>> {
  const palettes: Record<string, Record<string, string>> = {};
  // Comments first: theme.css carries the argument for each palette, and
  // those paragraphs contain the commas this splits selectors on.
  const css = source.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const tokens = Object.fromEntries(
      [...body!.matchAll(/(--qc-[\w-]+)\s*:\s*([^;]+);/g)].map(([, k, v]) => [
        k!,
        v!.trim(),
      ]),
    );
    if (Object.keys(tokens).length === 0) continue;
    for (const one of selector!.split(",")) {
      const name = one.trim().replace(/^html/, "").trim();
      palettes[name === "" ? "(bare html)" : name] = tokens;
    }
  }
  return palettes;
}

describe("theme.css", () => {
  const palettes = paletteBlocks(THEME_CSS);

  test("every family ships a light and a dark member", () => {
    // Object.keys, not toHaveProperty: these selectors are bracket paths to
    // that matcher, and it would go looking for a nested `data-theme` key.
    const selectors = Object.keys(palettes);
    for (const family of THEME_FAMILIES) {
      expect(selectors).toContain(`[data-theme="${family}"]`);
      expect(selectors).toContain(`[data-theme="${family}"].dark`);
    }
  });

  test("the bare html rule exists, and is the default family", () => {
    // A page whose family was never set still needs a palette, and it must be
    // the one DEFAULT_THEME_FAMILY names.
    expect(palettes["(bare html)"]).toEqual(
      palettes[`[data-theme="${DEFAULT_THEME_FAMILY}"]`]!,
    );
  });

  test("all six palettes define exactly the same token set", () => {
    const reference = Object.keys(
      palettes[`[data-theme="${DEFAULT_THEME_FAMILY}"]`]!,
    ).sort();
    expect(reference.length).toBeGreaterThan(0);
    for (const family of THEME_FAMILIES) {
      for (const selector of [
        `[data-theme="${family}"]`,
        `[data-theme="${family}"].dark`,
      ]) {
        expect({
          selector,
          tokens: Object.keys(palettes[selector]!).sort(),
        }).toEqual({ selector, tokens: reference });
      }
    }
  });

  test("every token is a plain hex colour", () => {
    for (const family of THEME_FAMILIES) {
      for (const selector of [
        `[data-theme="${family}"]`,
        `[data-theme="${family}"].dark`,
      ]) {
        for (const [token, value] of Object.entries(palettes[selector]!)) {
          expect(`${selector} ${token}: ${value}`).toMatch(/#[0-9a-f]{6}$/);
        }
      }
    }
  });

  test("every token is exposed as a Tailwind utility", () => {
    // The @theme inline block is what turns --qc-ink into text-ink. A token
    // defined and never exposed is invisible to every page.
    const exposed = [
      ...THEME_CSS.matchAll(/--color-([\w-]+):\s*var\((--qc-[\w-]+)\)/g),
    ].map(([, , token]) => token!);
    const defined = Object.keys(
      palettes[`[data-theme="${DEFAULT_THEME_FAMILY}"]`]!,
    );
    expect(exposed.sort()).toEqual(defined.sort());
  });
});
