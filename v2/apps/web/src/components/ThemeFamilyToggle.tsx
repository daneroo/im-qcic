import { useEffect, useState } from "react";
import { PILL } from "./pill";
import {
  applyThemeFamily,
  cycleThemeFamily,
  DEFAULT_THEME_FAMILY,
  persistThemeFamily,
  resolveInitialThemeFamily,
  THEME_FAMILY_LABEL,
  type ThemeFamily,
} from "../theme";

// One button, three states — the same control as ThemeToggle beside it, over
// the other theme axis. It says which family is showing and advances when
// pressed.
//
// The initial value is DEFAULT_THEME_FAMILY for the same reason ThemeToggle
// guesses "light": the server has no localStorage, so the mount effect
// corrects it. THEME_INIT_SCRIPT has already put the real family on <html>,
// so the page never flashes — only this control's own label, for a frame.
//
// WHO WRITES <html>. The init script owns first paint; this component writes
// only what it has resolved — the mount effect writes the resolved family
// (a no-op unless the script was blocked), and the handler writes the chosen
// one. Applying `family` from an effect keyed on it would instead write the
// SSR guess over the script's correct value on mount, which is a flash of the
// wrong palette and exactly what the no-flash machinery exists to prevent.
export function ThemeFamilyToggle() {
  const [family, setFamily] = useState<ThemeFamily>(DEFAULT_THEME_FAMILY);

  useEffect(() => {
    const initial = resolveInitialThemeFamily(window.localStorage);
    applyThemeFamily(document.documentElement, initial);
    setFamily(initial);
  }, []);

  function handleClick() {
    const next = cycleThemeFamily(family);
    persistThemeFamily(window.localStorage, next);
    applyThemeFamily(document.documentElement, next);
    setFamily(next);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      // Names the current family and the next one: the visible label is only
      // half the control, and three states cannot be guessed from one word.
      aria-label={`Theme ${THEME_FAMILY_LABEL[family]} — switch to ${
        THEME_FAMILY_LABEL[cycleThemeFamily(family)]
      }`}
      className={`${PILL} border border-rule text-ink-2 hover:bg-surface-2 hover:text-ink`}
    >
      {THEME_FAMILY_LABEL[family]}
    </button>
  );
}
