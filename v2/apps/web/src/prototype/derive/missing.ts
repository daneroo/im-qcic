// PROTOTYPE — throwaway. See ../README.md.
//
// Formatting for missing time, coverage and power. Replaces the old nines.ts.
//
// WHY NINES IS GONE. `nines = -log10(missing/expected)` is a bijection with
// `missing` once the window is known - it derives nothing, it only rescales.
// It exists in the industry because people insist on PERCENTAGES, and
// percentages crowd at the top: 99.943% and 99.912% are hard to tell apart, so
// a log buys the resolution back.
//
// A duration never had that problem. As things improve the number moves toward
// zero, where there is plenty of room, instead of piling up against 100%:
//
//     49s    78s    112s     <- obvious at a glance
//   99.943% 99.912% 99.87%   <- not
//
// So the duration is the reading, and the good idea inside "nines" survives as
// a FORMATTING RULE rather than a number on screen: the count of leading nines
// decides how much precision the percentage gets.

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
 * ALWAYS TRUNCATES, NEVER ROUNDS. A month at 99.8611% with two leading nines
 * gets zero decimals; rounding would print "100%" for a month containing a
 * 39-minute outage. Never claim more nines than the data supports, and reserve
 * 100% for nothing missing at all.
 */
export function formatCoverage(missing: number, expected: number): string {
  if (!Number.isFinite(expected) || expected <= 0) return "—";
  if (missing <= 0) return "100%";

  const pct = ((expected - Math.min(missing, expected)) / expected) * 100;

  // Below 10% the rule would leave a single digit ("8%"). Vanishingly
  // unlikely - it means nine samples in ten are gone - but not worth a rough
  // edge.
  if (pct < 10) return `${(Math.floor(pct * 10) / 10).toFixed(1)}%`;

  let leadingNines = 0;
  for (const ch of pct.toFixed(8).replace(".", "")) {
    if (ch === "9") leadingNines++;
    else break;
  }
  const decimals = Math.max(0, leadingNines - 2);
  const factor = 10 ** decimals;
  return `${(Math.floor(pct * factor) / factor).toFixed(decimals)}%`;
}

/**
 * Go-style duration. `missing` is a count of seconds everywhere in this app
 * (ted1k samples once a second), so the count *is* a duration - and the unit
 * carries the magnitude while the digits carry the precision, which is the
 * logarithmic behaviour nines was reaching for.
 *
 * THE RULES, in order:
 *
 *  1. Prefer the largest unit that fits. 60s is `1m`, never `60s`.
 *  2. The leading segment is unpadded; every later one is padded to two
 *     digits, so the string keeps a constant shape as it changes: `1m02s`,
 *     not `1m2s`, and `2h` rather than `02h`.
 *  3. Trailing zero segments are dropped: `13h59m`, not `13h59m00s`.
 *  4. INTERIOR zero segments are NOT dropped, because skipping one would make
 *     the units ambiguous at a glance: two hours and three seconds is
 *     `2h00m03s`, never `2h3s`.
 *
 *     49s          3600 -> 1h          7203  -> 2h00m03s
 *     60  -> 1m    3660 -> 1h01m       50340 -> 13h59m
 *     62  -> 1m02s 3663 -> 1h01m03s    90000 -> 1d01h
 *
 * These cases are the spec: if this graduates, they become the unit tests.
 */
const UNITS: [seconds: number, suffix: string][] = [
  [86400, "d"],
  [3600, "h"],
  [60, "m"],
  [1, "s"],
];

export function formatMissing(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "none";

  let rest = Math.round(seconds);
  const counts = UNITS.map(([size]) => {
    const n = Math.floor(rest / size);
    rest -= n * size;
    return n;
  });

  const first = counts.findIndex((n) => n > 0);
  if (first === -1) return "none";
  let last = counts.length - 1;
  while (last > first && counts[last] === 0) last--;

  return counts
    .slice(first, last + 1)
    .map((n, i) => {
      const suffix = UNITS[first + i]![1];
      return i === 0
        ? `${n}${suffix}`
        : `${String(n).padStart(2, "0")}${suffix}`;
    })
    .join("");
}

/**
 * Household energy, in the unit this house thinks in: kWh/d = W x 24 / 1000.
 * Still a power figure, but a scale that reads at a glance.
 */
export function kwhPerDay(watt: number): number {
  return (watt * 24) / 1000;
}

export function formatKwhPerDay(watt: number | null): string {
  if (watt === null) return "—";
  return kwhPerDay(watt).toFixed(1);
}
