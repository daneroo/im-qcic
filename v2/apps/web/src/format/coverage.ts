// Coverage: missing time normalised against its window, so windows of
// different lengths can be compared.
//
// WHY THERE IS NO `nines` HERE. `nines = -log10(missing/expected)` is a
// bijection with `missing` once the window is known - it derives nothing, it
// only rescales. It exists in the industry because people insist on
// PERCENTAGES, and percentages crowd at the top: 99.943% and 99.912% are hard
// to tell apart, so a log buys the resolution back.
//
// A duration never had that problem. As things improve the number moves toward
// zero, where there is plenty of room, instead of piling up against 100%:
//
//     49s    78s    112s     <- obvious at a glance
//   99.943% 99.912% 99.87%   <- not
//
// So the duration is the reading (see ./duration.ts), and the good idea inside
// "nines" survives as a formatting rule rather than a number on screen: the
// count of leading nines decides how much precision the percentage gets.

/** Digits the nine-counting and the truncation both read the value at. */
const MAX_PRECISION = 8;

/**
 * Coverage, with precision set by how many nines it has.
 *
 *     83%       0 leading nines -> 0 decimals
 *     91%       1               -> 0
 *     99%       2               -> 0   (from 99.3%)
 *     99.9%     3               -> 1   (from 99.921%)
 *     99.99%    4               -> 2
 *
 * `decimals = max(0, leadingNines - 2)`.
 *
 * ALWAYS TRUNCATES, NEVER ROUNDS. A month at 99.8611% - an hour gone out of
 * thirty days - has two leading nines and so gets zero decimals; rounding
 * would print "100%" for a month with an outage in it. Never claim more nines
 * than the data supports, and reserve 100% for nothing missing at all.
 */
export function formatCoverage(missing: number, expected: number): string {
  if (!Number.isFinite(expected) || expected <= 0) return "—";
  if (!Number.isFinite(missing)) return "—";
  if (missing <= 0) return "100%";

  // 100% is reserved for nothing missing at all, and anything missing puts the
  // true percentage below 100 — but reading it at MAX_PRECISION can carry it
  // there. Hold it one digit under, so the loss stays visible however small.
  const pct = Math.min(
    ((expected - Math.min(missing, expected)) / expected) * 100,
    100 - 10 ** -MAX_PRECISION,
  );

  // Below 10% the rule would leave a single digit ("8%"). Vanishingly
  // unlikely - it means nine samples in ten are gone - but not worth a rough
  // edge.
  if (pct < 10) return `${truncate(pct, 1)}%`;

  let leadingNines = 0;
  for (const ch of pct.toFixed(MAX_PRECISION).replace(".", "")) {
    if (ch === "9") leadingNines++;
    else break;
  }
  return `${truncate(pct, Math.max(0, leadingNines - 2))}%`;
}

/**
 * Truncate, printed at that width. Cuts the decimal string rather than
 * `Math.floor(pct * 10 ** decimals)`, because a percentage sitting a float
 * epsilon *below* a boundary — 58% arrives as 57.999999999999993 — floors to
 * the digit under it, and 58% must not read as 57%. Rounding the value to
 * `MAX_PRECISION` first absorbs that noise; truncating what is left keeps the
 * rule.
 */
function truncate(pct: number, decimals: number): string {
  const fixed = pct.toFixed(MAX_PRECISION);
  const dot = fixed.indexOf(".");
  const kept =
    decimals === 0 ? fixed.slice(0, dot) : fixed.slice(0, dot + 1 + decimals);
  return Number(kept).toFixed(decimals);
}
