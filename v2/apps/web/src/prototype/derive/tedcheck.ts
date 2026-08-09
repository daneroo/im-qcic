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

import type { Table, TedcheckViewPayload } from "../../tedcheck/types";
import type { ViewName } from "../../tedcheck/config";
import { nines, ninesCeiling, type NinesQuality, ninesQuality } from "./nines";

const HOUR = 3600;
const DAY = 86400;

/** Bucket size and window span per view, matching ted1k-derive's SQL. */
const VIEW_SHAPE: Record<
  ViewName,
  { bucketSeconds: number; windowSeconds: number; label: string; unit: string }
> = {
  // A single row covering the whole rolling 24h - complete by construction,
  // so it needs no boundary correction.
  missingLastDay: {
    bucketSeconds: DAY,
    windowSeconds: DAY,
    label: "Last Day",
    unit: "day",
  },
  missingDayByHour: {
    bucketSeconds: HOUR,
    windowSeconds: DAY,
    label: "Last Day by hour",
    unit: "hour",
  },
  // "Last Month" reads better than "32 days" and is what it's for; the query's
  // 32-day span is padding, so a full month of buckets is always available
  // however the window happens to land.
  missingWeekByDay: {
    bucketSeconds: DAY,
    windowSeconds: 32 * DAY,
    label: "Last Month by day",
    unit: "day",
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
   * Materially worse than this window's own normal loss - see
   * `excursionThreshold`. This, not `missing > 0`, is what earns the one
   * chromatic token.
   */
  excursion: boolean;
  nines: number | null;
  ninesCeiling: number;
  quality: NinesQuality;
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
  total: {
    expected: number;
    missing: number;
    nines: number | null;
    ceiling: number;
    quality: NinesQuality;
  };
  /** Worst interior bucket by absence - the thing worth naming. */
  worst: Bucket | null;
  /** Most recent genuine excursion, partial buckets excluded. */
  lastExcursion: Bucket | null;
  /** Every genuine excursion, newest last. */
  excursions: Bucket[];
  /**
   * Median absence across whole buckets that lost anything - ted1k's *normal*
   * rate of loss for this window. Roughly 3-60s/day in practice.
   */
  baseline: number;
  /** Absence above which a bucket stops being normal. See deriveView. */
  excursionThreshold: number;
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

    const ceiling = ninesCeiling(expected);
    const value = nines(missing, expected);

    buckets.push({
      start,
      watt: toNumber(row[col.watt]),
      samples,
      rawMissing,
      missing,
      expected,
      partial,
      excursion: false, // set below, once the window's own baseline is known
      nines: value,
      ninesCeiling: ceiling,
      quality: ninesQuality(value, ceiling),
    });
  }

  if (buckets.length === 0) return null;

  const whole = buckets.filter((b) => !b.partial);

  // WHAT COUNTS AS AN EXCURSION. ted1k drops a handful of samples most days -
  // that is its resting state, not an incident, and painting every one of them
  // in the alarm colour would make the alarm colour meaningless (which is
  // exactly what the first draft of this page did). So the bar is set by the
  // window's own behaviour: an excursion is an absence well above this
  // window's median loss, and above a floor of 0.5% of a bucket so that a
  // freakishly clean stretch doesn't make ordinary noise look alarming.
  //
  // On live data this picks out exactly one day in 32 (2026-08-03, 39m) and no
  // hours at all in the last 24h - which matches what actually happened.
  const losses = whole
    .filter((b) => b.missing > 0)
    .map((b) => b.missing)
    .sort((a, b) => a - b);
  const baseline = losses.length
    ? (losses[Math.floor(losses.length / 2)] ?? 0)
    : 0;
  const excursionThreshold = Math.max(
    shape.bucketSeconds * 0.005,
    baseline * 8,
  );
  for (const b of buckets) {
    b.excursion = !b.partial && b.missing > excursionThreshold;
  }
  const totalExpected = buckets.reduce((sum, b) => sum + b.expected, 0);
  const totalMissing = buckets.reduce((sum, b) => sum + b.missing, 0);
  const totalCeiling = ninesCeiling(totalExpected);
  const totalNines = nines(totalMissing, totalExpected);

  const withAbsence = whole.filter((b) => b.missing > 0);
  const worst = withAbsence.reduce<Bucket | null>(
    (acc, b) => (acc === null || b.missing > acc.missing ? b : acc),
    null,
  );
  const excursions = whole.filter((b) => b.excursion);
  const lastExcursion = excursions.reduce<Bucket | null>(
    (acc, b) => (acc === null || b.start > acc.start ? b : acc),
    null,
  );

  const watts = buckets
    .map((b) => b.watt)
    .filter((w): w is number => w !== null);

  return {
    view,
    label: shape.label,
    unit: shape.unit,
    stamp,
    hostname: payload.meta.hostname,
    buckets,
    whole,
    total: {
      expected: totalExpected,
      missing: totalMissing,
      nines: totalNines,
      ceiling: totalCeiling,
      quality: ninesQuality(totalNines, totalCeiling),
    },
    worst,
    lastExcursion,
    excursions,
    baseline,
    excursionThreshold,
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
