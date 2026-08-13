// PROTOTYPE — throwaway. See ../README.md.
//
// Turns ted1k-derive's wire tables into typed, window-corrected rows.
//
// The wire shape is a headerless-typed matrix (Cell[][]) whose header row
// comes from MySQL, so nothing downstream knows which column is a time, a
// measurement or an absence count. That's why the production DataTable can't
// right-align a number. This module supplies the missing column meaning, and
// one genuine correction on top of it.
//
// THE CORRECTION. Each query computes `<bucketSeconds> - count(*)` per bucket
// over a *rolling* window (24h, or 32 days). The first and last buckets are
// therefore partial, and report the unelapsed remainder as if it were a gap.
// Live values at the time of writing:
//
//   hour 2026-08-07T21:00Z  samples 2803  missing 797     <- window opened at 21:13
//   hour 2026-08-08T21:00Z  samples  797  missing 2803    <- window closes at 21:13
//
// 2803 + 797 = 3600 exactly. Neither hour lost anything; corrected against
// meta.stamp they are 1 and 0 missing - the two cleanest hours on the page.
// Rendering them raw (which is what the app does today) makes a healthy day
// look like it began and ended in catastrophe.
//
// CORRECTED HERE, ON PURPOSE, AND NOT PUSHED UPSTREAM. It was proposed that
// ted1k-derive publish an `expected` per bucket, since it owns the NOW() that
// clips them and could hand consumers the answer. REJECTED: `expected` is a
// poor concept to freeze into the wire format. How boundaries should be
// treated is not settled and will change, and a field like that in temporary
// upstream code would fix today's answer in place just as it starts to move.
// The consumer absorbing it is the reversible choice.

import type { Table, TedcheckViewPayload } from "../../tedcheck/types";
import type { ViewName } from "../../tedcheck/config";

const HOUR = 3600;
const DAY = 86400;

/**
 * Bucket size and window span per view, matching ted1k-derive's SQL.
 *
 * NAMING RULE. The four windows are NAMES, so both words are capitalised:
 * Last Day, Last Month, Last Day by Hour, Last Month by Day ("by" stays
 * lowercase, as a connector). Everything else on the page is a description and
 * stays sentence case or lowercase - "missing by hour", "power, same window",
 * "Table of gaps". That is why the same word appears both ways: `Hour` in a
 * window's name, `hour` in a chart's label.
 */
const VIEW_SHAPE: Record<
  ViewName,
  {
    bucketSeconds: number;
    windowSeconds: number;
    label: string;
    unit: string;
    /** Missing time above which a bucket is a SIGNIFICANT GAP. Fixed, not
        derived - see the note in deriveView. */
    significantSeconds: number;
  }
> = {
  // A single row covering the whole rolling 24h - complete by construction,
  // so it needs no boundary correction.
  missingLastDay: {
    bucketSeconds: DAY,
    windowSeconds: DAY,
    label: "Last Day",
    unit: "day",
    significantSeconds: 300,
  },
  missingDayByHour: {
    bucketSeconds: HOUR,
    windowSeconds: DAY,
    label: "Last Day by Hour",
    unit: "hour",
    significantSeconds: 60,
  },
  // "Last Month" reads better than "32 days" and is what it's for; the query's
  // 32-day span is padding, so a full month of buckets is always available
  // however the window happens to land.
  missingWeekByDay: {
    bucketSeconds: DAY,
    windowSeconds: 32 * DAY,
    label: "Last Month by Day",
    unit: "day",
    significantSeconds: 300,
  },
};

export interface Bucket {
  /** Start of the bucket, from the table's first column. */
  start: Date;
  /** Mean watts over the bucket. Arrives from the wire as a string. */
  watt: number | null;
  /** Samples actually recorded. */
  samples: number;
  /** Absences as reported by the query - wrong at window boundaries. */
  rawMissing: number;
  /**
   * Absences within the part of this bucket that the window actually covers.
   * Equal to rawMissing for interior buckets.
   */
  missing: number;
  /** Seconds of this bucket the window covers. < bucketSeconds at the edges. */
  expected: number;
  /** True when the bucket is clipped by the window - opening, or in progress. */
  partial: boolean;
  /**
   * Missing time past `significantThreshold`. This, not `missing > 0`, is what
   * earns the one chromatic token.
   */
  significant: boolean;
}

export interface TedcheckView {
  view: ViewName;
  label: string;
  unit: string;
  stamp: Date;
  hostname: string;
  buckets: Bucket[];
  /** Interior (non-partial) buckets only - the fair basis for any summary. */
  whole: Bucket[];
  /** Roll-up over the whole window, boundary-corrected. */
  total: { expected: number; missing: number };
  /** Worst interior bucket by missing time - the thing worth naming. */
  worst: Bucket | null;
  /** Most recent significant gap, partial buckets excluded. */
  lastSignificantGap: Bucket | null;
  /** Every significant gap, newest last. */
  significantGaps: Bucket[];
  /**
   * Median missing time across whole buckets that lost anything - ted1k's
   * resting state for this window, shown as context and never as the bar.
   */
  baseline: number;
  /** Missing time above which a bucket counts as a significant gap. */
  significantThreshold: number;
  /**
   * Sample-weighted mean watts across the window - total energy over total
   * samples, so a partial bucket contributes exactly its share rather than
   * counting as a whole day. This is the second thing ted1k is for: not just
   * whether it recorded, but what it recorded.
   *
   * `avg(watt)` here IS the non-zero average: the upstream capture never
   * writes a zero-watt row, because a zero is not something the sensor can
   * legitimately measure - such readings are treated as bad and excluded
   * before they reach the `watt` table. So the set of rows and the set of
   * non-zero values are the same set, and no producer-side change is needed.
   *
   * The consequence worth knowing: a genuine power outage does not appear
   * here as low watts, it appears as MISSING SAMPLES - so `missing` conflates
   * "the recorder failed" with "there was nothing to record", and nothing in
   * this data can tell them apart. See the README.
   */
  meanWatt: number | null;
  wattRange: { min: number; max: number } | null;
}

function toNumber(cell: unknown): number | null {
  if (typeof cell === "number") return Number.isFinite(cell) ? cell : null;
  if (typeof cell === "string" && cell.trim() !== "") {
    const n = Number(cell);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Column indices by header name rather than by position - the header row is
 * whatever MySQL aliased, and the time column is named `since`/`day`/`hour`
 * depending on the view.
 */
function columnIndex(header: Table[number]): {
  time: number;
  watt: number;
  samples: number;
  missing: number;
} {
  const names = header.map((c) => String(c ?? "").toLowerCase());
  const find = (...candidates: string[]) => {
    for (const c of candidates) {
      const i = names.indexOf(c);
      if (i >= 0) return i;
    }
    return -1;
  };
  return {
    time: find("since", "day", "hour"),
    watt: find("watt"),
    samples: find("samples"),
    missing: find("missing"),
  };
}

export function deriveView(
  view: ViewName,
  payload: TedcheckViewPayload | null,
): TedcheckView | null {
  if (!payload || !payload.data || payload.data.length < 2) return null;

  const shape = VIEW_SHAPE[view];
  const [header, ...rows] = payload.data;
  if (!header) return null;
  const col = columnIndex(header);
  if (col.time < 0 || col.samples < 0) return null;

  const stamp = new Date(payload.meta.stamp);
  const windowStartMs = stamp.getTime() - shape.windowSeconds * 1000;

  const buckets: Bucket[] = [];
  for (const row of rows) {
    const startRaw = row[col.time];
    if (typeof startRaw !== "string") continue;
    const start = new Date(startRaw);
    if (Number.isNaN(start.getTime())) continue;

    const samples = toNumber(row[col.samples]) ?? 0;
    const rawMissing = col.missing >= 0 ? (toNumber(row[col.missing]) ?? 0) : 0;

    // How much of this bucket the rolling window actually covers: clip the
    // bucket to [windowStart, stamp]. Interior buckets are untouched.
    const bucketStartMs = start.getTime();
    const bucketEndMs = bucketStartMs + shape.bucketSeconds * 1000;
    const coveredStart = Math.max(bucketStartMs, windowStartMs);
    const coveredEnd = Math.min(bucketEndMs, stamp.getTime());
    const expected = Math.max(
      0,
      Math.min(shape.bucketSeconds, (coveredEnd - coveredStart) / 1000),
    );
    const partial = expected < shape.bucketSeconds - 1;

    // Clamped: the SQL window and meta.stamp are evaluated a beat apart, so a
    // partial bucket can report a few more samples than our reconstruction
    // expects. Never report negative absence.
    const missing = partial
      ? Math.max(0, Math.round(expected - samples))
      : rawMissing;

    buckets.push({
      start,
      watt: toNumber(row[col.watt]),
      samples,
      rawMissing,
      missing,
      expected,
      partial,
      significant: false, // set below, against the view's fixed threshold
    });
  }

  if (buckets.length === 0) return null;

  const whole = buckets.filter((b) => !b.partial);

  // WHAT MAKES A GAP SIGNIFICANT, and why the threshold is FIXED rather than
  // derived from the data.
  //
  // The threshold is where the explanation changes. Below it the sensor simply
  // failed to deliver some samples - it has never managed a perfect 1 Hz, and
  // a few tens of seconds a day is its resting state, not an incident. Above
  // it something stopped, and since a house never draws zero, "the power was
  // out" is the most plausible reading.
  //
  // An earlier version derived the bar from the window's own median (8x), and
  // that was a mistake: a moving threshold means "significant" quietly means
  // something different this month than last, so the page's own history stops
  // being citable. One minute in an hour, five minutes in a day - round,
  // memorable, and the same in December as today. The median is still computed
  // and shown, as CONTEXT ("typical 36s/day"), never as the bar.
  //
  // Caveat this cannot escape: these are per-bucket TOTALS, not contiguous
  // runs. 60s missing in an hour might be one 60-second outage or sixty
  // separate 1-second drops, and an aggregate cannot tell them apart. Only the
  // raw 1 Hz series can, and that lives in Grafana.
  const significantThreshold = shape.significantSeconds;
  for (const b of buckets) {
    b.significant = !b.partial && b.missing > significantThreshold;
  }

  // The window's resting state: median missing time across whole buckets that
  // lost anything. Context only - it no longer sets the bar.
  const losses = whole
    .filter((b) => b.missing > 0)
    .map((b) => b.missing)
    .sort((a, b) => a - b);
  const baseline = losses.length
    ? (losses[Math.floor(losses.length / 2)] ?? 0)
    : 0;
  const totalExpected = buckets.reduce((sum, b) => sum + b.expected, 0);
  const totalMissing = buckets.reduce((sum, b) => sum + b.missing, 0);

  const withAbsence = whole.filter((b) => b.missing > 0);
  const worst = withAbsence.reduce<Bucket | null>(
    (acc, b) => (acc === null || b.missing > acc.missing ? b : acc),
    null,
  );
  const significantGaps = whole.filter((b) => b.significant);
  const lastSignificantGap = significantGaps.reduce<Bucket | null>(
    (acc, b) => (acc === null || b.start > acc.start ? b : acc),
    null,
  );

  const watts = buckets
    .map((b) => b.watt)
    .filter((w): w is number => w !== null);

  // Sample-weighted, not a mean of means: a day with 10230 samples must not
  // carry the same weight as one with 86400.
  const weighted = buckets.reduce(
    (acc, b) =>
      b.watt === null
        ? acc
        : {
            energy: acc.energy + b.watt * b.samples,
            samples: acc.samples + b.samples,
          },
    { energy: 0, samples: 0 },
  );
  const meanWatt =
    weighted.samples > 0 ? weighted.energy / weighted.samples : null;

  return {
    view,
    label: shape.label,
    unit: shape.unit,
    stamp,
    hostname: payload.meta.hostname,
    buckets,
    whole,
    total: { expected: totalExpected, missing: totalMissing },
    worst,
    lastSignificantGap,
    significantGaps,
    baseline,
    significantThreshold,
    meanWatt,
    wattRange: watts.length
      ? { min: Math.min(...watts), max: Math.max(...watts) }
      : null,
  };
}

/** "6h ago", "3d ago" - relative to the view's own stamp, not wall clock. */
export function since(from: Date, to: Date): string {
  const seconds = Math.max(0, (to.getTime() - from.getTime()) / 1000);
  if (seconds < 90) return "just now";
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
  return `${Math.round(seconds / 86400)}d ago`;
}
