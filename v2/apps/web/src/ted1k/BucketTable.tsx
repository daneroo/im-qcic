import { useState } from "react";
import { formatCoverage } from "../format/coverage";
import { formatMissing } from "../format/duration";
import { localHM, tzLabel, utcDate, utcISO } from "../format/time";
import type { Ted1kBucket, Ted1kReading } from "./derive";

function bucketLabel(bucket: Ted1kBucket, unit: string): string {
  return unit === "hour" ? localHM(bucket.start) : utcDate(bucket.start);
}

export function BucketTable({ reading }: { reading: Ted1kReading }) {
  const [showAll, setShowAll] = useState(false);
  const ordered = [...reading.buckets].reverse();
  const notable = reading.significantGaps.length
    ? ordered.filter((bucket) => bucket.partial || bucket.significant)
    : ordered.slice(0, 8);
  const rows = showAll ? ordered : notable;
  const hiddenCount = ordered.length - notable.length;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs text-ink-2">
          {showAll
            ? `Full record — ${reading.buckets.length} buckets`
            : reading.significantGaps.length === 0
              ? `No significant gaps in ${reading.whole.length} whole ${reading.unit}s`
              : `${reading.significantGaps.length} significant gap${reading.significantGaps.length === 1 ? "" : "s"} in ${reading.whole.length} whole ${reading.unit}s`}
        </p>
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setShowAll((value) => !value)}
            className="rounded-full border border-rule px-2.5 py-0.5 text-[11px] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {showAll
              ? "Significant only"
              : `Show all ${reading.buckets.length}`}
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[30rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-rule-strong text-[10px] uppercase tracking-[0.12em] text-ink-3">
              <th className="py-1.5 pr-3 text-left font-semibold">
                {reading.unit}{" "}
                <span className="normal-case">
                  ({reading.unit === "hour" ? tzLabel() : "UTC"})
                </span>
              </th>
              <th className="px-3 py-1.5 text-right font-semibold">watt</th>
              <th className="px-3 py-1.5 text-right font-semibold">samples</th>
              <th className="px-3 py-1.5 text-right font-semibold">missing</th>
              <th className="py-1.5 pl-3 text-right font-semibold">ok</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((bucket) => (
              <tr
                key={bucket.start.toISOString()}
                className="border-b border-rule/60 last:border-0 hover:bg-surface-2/60"
              >
                <td
                  className="qc-num py-1.5 pr-3 text-left text-ink-2"
                  title={utcISO(bucket.start)}
                >
                  {bucketLabel(bucket, reading.unit)}
                  {bucket.partial && (
                    <span
                      className="ml-2 rounded-sm border border-dashed border-partial px-1 text-[9px] uppercase tracking-wider text-partial"
                      title="Clipped by the rolling window — incomplete, not faulty"
                    >
                      partial
                    </span>
                  )}
                </td>
                <td className="qc-num px-3 py-1.5 text-right text-ink">
                  {bucket.watt ?? "—"}
                </td>
                <td className="qc-num px-3 py-1.5 text-right text-ink-2">
                  {bucket.samples.toLocaleString()}
                </td>
                <td
                  className={`qc-num px-3 py-1.5 text-right ${
                    bucket.partial
                      ? "text-partial"
                      : bucket.significant
                        ? "font-medium text-alarm"
                        : bucket.missing > 0
                          ? "text-ink-2"
                          : "text-ink-3/50"
                  }`}
                  title={
                    bucket.partial
                      ? `raw ${bucket.rawMissing}; ${bucket.missing} within the covered window`
                      : `${bucket.missing} samples`
                  }
                >
                  {bucket.missing > 0 ? formatMissing(bucket.missing) : "—"}
                </td>
                <td
                  className={`qc-num py-1.5 pl-3 text-right ${bucket.significant ? "font-medium text-alarm" : "text-ink-2"}`}
                >
                  {formatCoverage(bucket.missing, bucket.expected)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
