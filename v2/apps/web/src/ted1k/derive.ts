import type { ViewName } from "./config";
import type { Table, Ted1kViewPayload } from "./types";

const HOUR = 3_600;
const DAY = 86_400;

const VIEW_SHAPE: Record<
  ViewName,
  {
    bucketSeconds: number;
    windowSeconds: number;
    label: string;
    unit: string;
    significantSeconds: number;
  }
> = {
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
  missingWeekByDay: {
    bucketSeconds: DAY,
    windowSeconds: 32 * DAY,
    label: "Last Month by Day",
    unit: "day",
    significantSeconds: 300,
  },
};

export interface Ted1kBucket {
  start: Date;
  watt: number | null;
  samples: number;
  rawMissing: number;
  missing: number;
  expected: number;
  partial: boolean;
  significant: boolean;
}

export interface Ted1kReading {
  label: string;
  unit: string;
  stamp: Date;
  buckets: Ted1kBucket[];
  whole: Ted1kBucket[];
  worst: Ted1kBucket | null;
  significantGaps: Ted1kBucket[];
  total: { expected: number; missing: number };
  significantThreshold: number;
  meanWatt: number | null;
}

function numberFrom(cell: unknown): number | null {
  if (typeof cell === "number") return Number.isFinite(cell) ? cell : null;
  if (typeof cell === "string" && cell.trim() !== "") {
    const value = Number(cell);
    return Number.isFinite(value) ? value : null;
  }
  return null;
}

function columns(header: Table[number]) {
  const names = header.map((cell) => String(cell ?? "").toLowerCase());
  const find = (...candidates: string[]) =>
    candidates.reduce((found, candidate) => {
      return found >= 0 ? found : names.indexOf(candidate);
    }, -1);
  return {
    time: find("since", "day", "hour"),
    watt: find("watt"),
    samples: find("samples"),
    missing: find("missing"),
  };
}

export function deriveView(
  view: ViewName,
  payload: Ted1kViewPayload | null,
): Ted1kReading | null {
  if (!payload || payload.data.length < 2) return null;
  const [header, ...rows] = payload.data;
  if (!header) return null;
  const column = columns(header);
  if (column.time < 0 || column.samples < 0) return null;

  const shape = VIEW_SHAPE[view];
  const stamp = new Date(payload.meta.stamp);
  const windowStart = stamp.getTime() - shape.windowSeconds * 1_000;
  const buckets = rows.flatMap<Ted1kBucket>((row) => {
    const rawStart = row[column.time];
    if (typeof rawStart !== "string") return [];
    const start = new Date(rawStart);
    if (Number.isNaN(start.getTime())) return [];

    const bucketStart = start.getTime();
    const coveredStart = Math.max(bucketStart, windowStart);
    const coveredEnd = Math.min(
      bucketStart + shape.bucketSeconds * 1_000,
      stamp.getTime(),
    );
    const expected = Math.max(
      0,
      Math.min(shape.bucketSeconds, (coveredEnd - coveredStart) / 1_000),
    );
    const partial = expected < shape.bucketSeconds - 1;
    const samples = numberFrom(row[column.samples]) ?? 0;
    const rawMissing = numberFrom(row[column.missing]) ?? 0;

    return [
      {
        start,
        watt: numberFrom(row[column.watt]),
        samples,
        rawMissing,
        missing: partial
          ? Math.max(0, Math.round(expected - samples))
          : rawMissing,
        expected,
        partial,
        significant: false,
      },
    ];
  });

  if (buckets.length === 0) return null;
  for (const bucket of buckets) {
    bucket.significant =
      !bucket.partial && bucket.missing > shape.significantSeconds;
  }
  const whole = buckets.filter((bucket) => !bucket.partial);
  const worst = whole.reduce<Ted1kBucket | null>((largest, bucket) => {
    if (bucket.missing <= 0) return largest;
    return largest === null || bucket.missing > largest.missing
      ? bucket
      : largest;
  }, null);
  const significantGaps = whole.filter((bucket) => bucket.significant);
  const weighted = buckets.reduce(
    (summary, bucket) =>
      bucket.watt === null
        ? summary
        : {
            energy: summary.energy + bucket.watt * bucket.samples,
            samples: summary.samples + bucket.samples,
          },
    { energy: 0, samples: 0 },
  );
  return {
    label: shape.label,
    unit: shape.unit,
    stamp,
    buckets,
    whole,
    worst,
    significantGaps,
    total: {
      expected: buckets.reduce((sum, bucket) => sum + bucket.expected, 0),
      missing: buckets.reduce((sum, bucket) => sum + bucket.missing, 0),
    },
    significantThreshold: shape.significantSeconds,
    meanWatt: weighted.samples > 0 ? weighted.energy / weighted.samples : null,
  };
}
