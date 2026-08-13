/**
 * The header's one control shape: a small capsule, used by the nav links and
 * by both theme toggles. Only the shape is shared — each caller adds its own
 * tone (a border, an ink level, an active ground), because those are what
 * distinguish a link from a control.
 */
export const PILL =
  "rounded-full px-3 py-1 text-[11px] font-medium tracking-wide transition-colors";
