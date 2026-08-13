// Durations, from one rule.
//
// `missing` is a count of seconds everywhere in this app (ted1k samples once a
// second), so the count *is* a duration - and the unit carries the magnitude
// while the digits carry the precision. That is the logarithmic behaviour the
// old `nines` reading was reaching for, kept as a formatting rule instead of a
// number on screen (see ./coverage.ts for the other half of that argument).
//
// Every multi-unit duration on any page goes through `segments` below. The
// exported entry points differ only in what they take in and what they print
// for zero.

const UNITS: [seconds: number, suffix: string][] = [
  [86400, "d"],
  [3600, "h"],
  [60, "m"],
  [1, "s"],
];

/**
 * THE CANONICAL RULE, in order:
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
 * Takes a whole, positive count of seconds; the callers below own rounding and
 * the zero case, which is the only thing they disagree about.
 */
function segments(seconds: number): string {
  let rest = seconds;
  const counts = UNITS.map(([size]) => {
    const n = Math.floor(rest / size);
    rest -= n * size;
    return n;
  });

  const first = counts.findIndex((n) => n > 0);
  if (first === -1) return "0s";
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
 * Missing time, in seconds. Nothing missing prints **"none"**, not "0s" — an
 * unbroken window is a different statement from a very short gap, and the word
 * says so where a zero invites a second look.
 */
export function formatMissing(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "none";
  const whole = Math.round(seconds);
  return whole <= 0 ? "none" : segments(whole);
}

/**
 * The millisecond adapter over the canonical rule — reporting lag and scrape
 * durations arrive in ms. Rounds to the nearest second, and prints **"0s"**
 * rather than "none": a copy that reported within half a second of its
 * generation did report, and "none" would deny it.
 *
 * It used to cap at minutes, so a two-hour lag printed "127m" — exactly the
 * ambiguity rule 2 exists to prevent. Now it says `2h07m`.
 */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms)) return "0s";
  return segments(Math.max(0, Math.round(ms / 1000)));
}

/**
 * Sub-10s precision, deliberately outside the canonical rule: a scrape elapsed
 * of 9.4s and one of 9.8s are different readings, and the canonical rule would
 * print both as `9s`. Above 10s the fraction stops carrying anything, so it
 * goes.
 */
export function formatSeconds(value: number): string {
  return value < 10 ? `${value.toFixed(1)}s` : `${Math.round(value)}s`;
}

/**
 * "6h ago", "3d ago" — relative to the view's own stamp, not wall clock, so a
 * page rendered from a fixture ages against the fixture.
 *
 * Single-unit on purpose, and rounded rather than truncated: this answers "is
 * this reading current?", where `5h ago` and `5h47m ago` mean the same thing.
 * The canonical rule is for quantities being compared to each other.
 */
export function since(from: Date, to: Date): string {
  const seconds = Math.max(0, (to.getTime() - from.getTime()) / 1000);
  if (seconds < 90) return "just now";
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
  return `${Math.round(seconds / 86400)}d ago`;
}
