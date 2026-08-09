// PROTOTYPE — throwaway. See ./README.md.

export const VARIANTS = ["strata", "circuit", "sheet"] as const;
export type Variant = (typeof VARIANTS)[number];

export const THEMES = ["sketch", "chromatic", "catppuccin"] as const;
export type ThemeFamily = (typeof THEMES)[number];

export const VARIANT_LABEL: Record<Variant, string> = {
  strata: "Strata",
  circuit: "Circuit",
  sheet: "Sheet",
};

export const VARIANT_BLURB: Record<Variant, string> = {
  strata:
    "Hierarchy as layers — substrate first, and honest about what it can't vouch for",
  circuit: "Hierarchy as connections — health lives on the links",
  sheet: "Hierarchy as one shared vocabulary — everything comparable in a line",
};

export const THEME_LABEL: Record<ThemeFamily, string> = {
  sketch: "Sketch",
  chromatic: "Chromatic",
  catppuccin: "Catppuccin",
};

export const THEME_FAMILY_KEY = "qcic-web:theme-family";

export interface PrototypeSearch {
  variant: Variant;
  theme: ThemeFamily;
}

function asVariant(value: unknown): Variant {
  return VARIANTS.includes(value as Variant) ? (value as Variant) : "strata";
}

function asTheme(value: unknown): ThemeFamily {
  return THEMES.includes(value as ThemeFamily)
    ? (value as ThemeFamily)
    : "sketch";
}

/** TanStack Router `validateSearch` for every prototyped route. */
export function validatePrototypeSearch(
  search: Record<string, unknown>,
): PrototypeSearch {
  return {
    variant: asVariant(search.variant),
    theme: asTheme(search.theme),
  };
}

/** Mirrors src/theme.ts's approach: a plain function over a narrow DOM type. */
export function applyThemeFamily(
  root: { dataset: DOMStringMap },
  family: ThemeFamily,
): void {
  root.dataset.theme = family;
}
