// PROTOTYPE — throwaway. See ../../README.md.
//
// The full record, shared by all three variants. Two things it does that the
// production DataTable structurally cannot, because that component receives an
// untyped Cell[][] and has no idea what any column means:
//
//   1. Numerals are right-aligned and tabular, so magnitudes line up.
//   2. `missing` is rendered as a DURATION, not a count. ted1k samples once a
//      second, so 2347 *is* 39 minutes - and "39m" is the sentence a human
//      wanted. The raw count is kept in the title attribute.
//
// Collapsed to significant gaps by default: the brief is summary-first, with the
// full table available underneath rather than being the page.

import { useState } from "react";
import { formatMissing, formatNines } from "../../derive/nines";
import type { Bucket, TedcheckView } from "../../derive/tedcheck";
import { localHM, tzLabel, utcDate, utcISO } from "../../derive/time";

// Hours are a time of day, so they are shown in the reader's zone. Days are
// UTC calendar days by construction (the query groups on the UTC date), so
// relabelling one as a local date would name a different 24 hours than the
// row actually measures. See ../../derive/time.ts.
function stampLabel(b: Bucket, unit: string): string {
  return unit === "hour" ? localHM(b.start) : utcDate(b.start);
}

export function BucketTable({ view }: { view: TedcheckView }) {
  const [showAll, setShowAll] = useState(false);

  // Newest first. The buckets arrive chronologically because the coverage
  // strips need a left-to-right time axis, but a table is read top-down and
  // the row you want is almost always the most recent one.
  const ordered = [...view.buckets].reverse();
  // Collapsed view: the significant gaps, plus the window edges. When nothing went
  // wrong that would leave only two partial rows on screen, which reads as a
  // broken table rather than as good news - so fall back to the most recent
  // buckets, which is what someone opening a clean record wants anyway.
  const notable = view.significantGaps.length
    ? ordered.filter((b) => b.partial || b.significant)
    : ordered.slice(0, 8);
  const rows = showAll ? ordered : notable;
  const hiddenCount = ordered.length - notable.length;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs text-ink-2">
          {showAll ? (
            <>Full record — {view.buckets.length} buckets</>
          ) : view.significantGaps.length === 0 ? (
            <>
              No significant gaps in {view.whole.length} whole {view.unit}s —
              showing the most recent {Math.min(8, view.buckets.length)}
            </>
          ) : (
            <>
              <span className="qc-num text-ink">
                {view.significantGaps.length}
              </span>{" "}
              significant gap{view.significantGaps.length === 1 ? "" : "s"} in{" "}
              {view.whole.length} whole {view.unit}s
            </>
          )}
        </p>
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="rounded-full border border-rule px-2.5 py-0.5 text-[11px] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            {showAll ? "Significant only" : `Show all ${view.buckets.length}`}
          </button>
        )}
      </div>

      {/* "Excursion" is a precise word doing real work here, but it is not
          self-explanatory, so it gets defined in place rather than in a
          tooltip nobody opens. The numbers are this window's own, not a
          constant - which is the point of the definition. */}
      <p className="mb-3 max-w-prose text-[11px] leading-relaxed text-ink-3">
        <span className="text-ink-2">Excursion</span> — a gap far larger than
        this window&rsquo;s ordinary loss. ted1k drops a few samples most{" "}
        {view.unit}s and that is its resting state, so the bar is set from the
        data itself: a typical{" "}
        <span className="qc-num">{formatMissing(view.baseline)}</span> per{" "}
        {view.unit} here, and anything past{" "}
        <span className="qc-num">
          {formatMissing(Math.round(view.significantThreshold))}
        </span>{" "}
        counts.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[30rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-rule-strong text-[10px] uppercase tracking-[0.12em] text-ink-3">
              <th className="py-1.5 pr-3 text-left font-semibold">
                {view.unit}{" "}
                <span className="normal-case">
                  ({view.unit === "hour" ? tzLabel() : "UTC"})
                </span>
              </th>
              <th className="py-1.5 px-3 text-right font-semibold">watt</th>
              <th className="py-1.5 px-3 text-right font-semibold">samples</th>
              <th className="py-1.5 px-3 text-right font-semibold">missing</th>
              <th className="py-1.5 pl-3 text-right font-semibold">nines</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr
                key={b.start.toISOString()}
                className="border-b border-rule/60 last:border-0 hover:bg-surface-2/60"
              >
                <td
                  className="qc-num py-1.5 pr-3 text-left text-ink-2"
                  title={utcISO(b.start)}
                >
                  {stampLabel(b, view.unit)}
                  {b.partial && (
                    <span
                      className="ml-2 rounded-sm border border-dashed border-partial px-1 text-[9px] uppercase tracking-wider text-partial"
                      title="Clipped by the rolling window — incomplete, not faulty"
                    >
                      partial
                    </span>
                  )}
                </td>
                <td className="qc-num py-1.5 px-3 text-right text-ink">
                  {b.watt ?? "—"}
                </td>
                <td className="qc-num py-1.5 px-3 text-right text-ink-2">
                  {b.samples.toLocaleString()}
                </td>
                <td
                  className={`qc-num py-1.5 px-3 text-right ${
                    b.partial
                      ? "text-partial"
                      : b.significant
                        ? "font-medium text-alarm"
                        : b.missing > 0
                          ? "text-ink-2"
                          : "text-ink-3/50"
                  }`}
                  title={
                    b.partial
                      ? `raw ${b.rawMissing} — window artifact; ${b.missing} within the ${Math.round(b.expected)}s actually covered`
                      : `${b.missing} samples`
                  }
                >
                  {b.missing > 0 ? formatMissing(b.missing) : "—"}
                </td>
                {/* Deliberately NOT coloured by quality band: a "poor" nines
                    figure on a bucket that lost 3 seconds is arithmetically
                    true and completely uninteresting. Only a genuinely significant gap
                    earns ink here. */}
                <td
                  className={`qc-num py-1.5 pl-3 text-right ${
                    b.significant ? "font-medium text-alarm" : "text-ink-2"
                  }`}
                >
                  {formatNines(b.nines)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-sm text-ink-3">
                  Nothing missing across the whole window.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
