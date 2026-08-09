// PROTOTYPE — throwaway. See ../README.md.
//
// "Nines" — a readable shorthand for how many samples went missing over a day
// or a month, read off a log scale. The number of leading nines in an
// availability figure.
//
//   nines = -log10(1 - availability)
//
//   0.993   -> -log10(0.007)     = 2.15 nines
//   0.99912 -> -log10(0.00088)   = 3.06 nines
//
// This is the right unit for ted1k precisely because it samples once a second:
// 86400 samples/day gives the ratio enough resolution for the log to be
// meaningful. It is the *wrong* unit for scast, whose 48h window holds only
// ~288 generations - there, one divergent generation is already 2.46 nines and
// two is 2.16, so the scale is too coarse and too jumpy to say anything. scast
// gets the divergence vocabulary instead (see ./scast.ts).

/**
 * Nines for `missing` absences out of `expected` opportunities.
 *
 * Returns `null` for the two cases that have no finite answer, so the UI is
 * forced to render them as their own states rather than as a number:
 * - `missing === 0` — perfect; the log diverges. This is a *distinct state*,
 *   not "infinity nines", and it deserves its own mark.
 * - `expected <= 0` — nothing was expected, so nothing can be claimed.
 */
export function nines(missing: number, expected: number): number | null {
  if (!Number.isFinite(missing) || !Number.isFinite(expected)) return null;
  if (expected <= 0) return null;
  if (missing <= 0) return null;
  return -Math.log10(Math.min(missing, expected) / expected);
}

/**
 * The best *non-perfect* figure this many opportunities can resolve — one
 * single absence, i.e. -log10(1/expected) = log10(expected).
 *
 * A 24h window of 1Hz samples tops out at 4.94, 30 days at 6.41, an hour at
 * 3.56. NOT DISPLAYED: nines is a shorthand label rather than a measurement,
 * and giving it an axis overstated its precision. Still computed, because it
 * is what makes the unit meaningful for ted1k and meaningless for scast.
 */
export function ninesCeiling(expected: number): number {
  if (!Number.isFinite(expected) || expected <= 1) return 0;
  return Math.log10(expected);
}

/** Availability as a plain ratio, for when the raw number is wanted. */
export function availability(missing: number, expected: number): number | null {
  if (expected <= 0) return null;
  return Math.max(0, Math.min(1, (expected - missing) / expected));
}

export type NinesQuality = "perfect" | "high" | "fair" | "poor" | "unknown";

/**
 * Bands for the nines figure, expressed as a *fraction of what's resolvable*
 * rather than as absolute thresholds - so the same bands apply to an hour, a
 * day and a month without three sets of magic numbers.
 */
export function ninesQuality(
  value: number | null,
  ceiling: number,
): NinesQuality {
  if (value === null) return ceiling > 0 ? "perfect" : "unknown";
  if (ceiling <= 0) return "unknown";
  const fraction = value / ceiling;
  if (fraction >= 0.7) return "high";
  if (fraction >= 0.4) return "fair";
  return "poor";
}

/**
 * `3.1` — one decimal.
 *
 * Nines here is a readable shorthand for "how many samples went missing over a
 * day/month", on a log scale, and not a measurement in its own right. Two
 * decimals implied a precision the figure does not claim, and the resolvable
 * ceiling is deliberately NOT shown alongside it for the same reason: a
 * shorthand does not get an axis. (This is the one place the "always define
 * the y-scale" rule does not apply - it is a label, not a plot.)
 */
export function formatNines(value: number | null): string {
  if (value === null) return "—";
  return value.toFixed(1);
}

/**
 * Household energy, in the unit this house actually thinks in.
 *
 *   kWh/d = W x 24 / 1000
 *
 * Technically still a power figure, but a scale everyone here reads at a
 * glance - "44.7" means something, "1864 W" needs converting in your head.
 */
export function kwhPerDay(watt: number): number {
  return (watt * 24) / 1000;
}

export function formatKwhPerDay(watt: number | null): string {
  if (watt === null) return "—";
  return kwhPerDay(watt).toFixed(1);
}

/** Watts as kilowatts, for plotting. Always drawn from zero - see Sparkline. */
export function formatKw(watt: number): string {
  return (watt / 1000).toFixed(2);
}

/**
 * Humanised absence. `missing` is a count of seconds everywhere in this app
 * (ted1k samples once a second), so it doubles as a duration - which is far
 * more legible than the count: "39m" says more than "2347".
 */
export function formatMissing(seconds: number): string {
  if (seconds <= 0) return "none";
  // Seconds up to two minutes: "71s" is the honest figure, and rounding it to
  // "1m" throws away precision the reader came for at exactly the scale where
  // ted1k's ordinary losses live.
  if (seconds < 120) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const hours = seconds / 3600;
  if (hours < 24) {
    const h = Math.floor(hours);
    const m = Math.round((seconds - h * 3600) / 60);
    return m > 0 ? `${h}h${m}m` : `${h}h`;
  }
  const d = Math.floor(hours / 24);
  const h = Math.round(hours - d * 24);
  return h > 0 ? `${d}d${h}h` : `${d}d`;
}
