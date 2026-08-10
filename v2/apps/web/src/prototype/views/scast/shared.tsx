// PROTOTYPE — throwaway. See ../../README.md.
//
// The scast marks, shared by all three variants.

import { useState } from "react";
import {
  formatDuration,
  formatSeconds,
  CRITICAL_GENERATIONS,
  type GenerationRow,
  type ScastState,
} from "../../derive/scast";
import { LivenessDot, type Liveness } from "../../ui/primitives";
import { localHM, tzLabel, utcISO } from "../../derive/time";

/** Generations are ten minutes apart - an hour/minute label, so localised. */
export function genLabel(d: Date): string {
  return localHM(d);
}

export function shortDigest(d: string): string {
  return d.slice(0, 7);
}

/* ------------------------------------------------------------------ *
 * Convergence strip — one tick per generation, same grammar as the
 * tedcheck coverage strip so the two pages read as one system.
 *
 *   agreed     floor tick, near-invisible. The resting state disappears.
 *   diverged   full height, chromatic. Rare, so it reads instantly.
 *   pending    dashed outline. The copies report minutes apart, so the
 *              newest generation is nearly always incomplete — showing that
 *              as disagreement would cry wolf every ten minutes.
 * ------------------------------------------------------------------ */
export function ConvergenceStrip({
  generations,
  height = 44,
  title,
  chrome = true,
}: {
  generations: GenerationRow[];
  height?: number;
  title?: string;
  /** Off when the strip is a thumbnail inside a table row - the label row
      would otherwise add its own height and break the cell's rhythm. */
  chrome?: boolean;
}) {
  return (
    <div className="w-full">
      {chrome && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <span className="text-[11px] text-ink-3">{title}</span>
          <span className="qc-num text-[10px] text-ink-3">
            {generations.length} generations
          </span>
        </div>
      )}
      <div
        className="flex w-full items-end gap-[2px] border-b border-rule"
        style={{ height }}
      >
        {generations.map((g) => {
          const key = g.generation.toISOString();
          if (g.state === "pending") {
            return (
              <div
                key={key}
                title={`${utcISO(g.generation)} — ${g.reports.length}/${g.reports.length + g.missing.length} copies in; waiting on ${g.missing.join(", ")}`}
                className="min-w-0 flex-1 rounded-[2px] border border-dashed border-partial"
                style={{ height: "100%" }}
              />
            );
          }
          if (g.state === "agreed") {
            return (
              <div
                key={key}
                title={`${utcISO(g.generation)} — all ${g.reports.length} copies agree`}
                className="min-w-0 flex-1 rounded-[2px] bg-absent/70"
                style={{ height: "14%" }}
              />
            );
          }
          // A short split is the reconciliation working as designed, so it is
          // drawn in neutral ink at half height. Only a run past
          // CRITICAL_GENERATIONS gets the alarm colour.
          return (
            <div
              key={key}
              title={`${utcISO(g.generation)} — ${g.ways} distinct digests${g.critical ? ", split over an hour" : ""}`}
              className={`min-w-0 flex-1 rounded-[2px] ${g.critical ? "bg-alarm" : "bg-ink-3/45"}`}
              style={{ height: g.critical ? "100%" : "48%" }}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * GENERATION TABLE — three visual layers, one job each, no overlap.
 *
 *   COLLAPSE    agreed vs split. Three identical digests are replaced by ONE,
 *               in a merged cell spanning the host columns. Centring alone is
 *               not enough - the centre of three equal columns IS the middle
 *               one, so a bare centred digest reads as that copy's value. The
 *               span is therefore stated by a dimension line whose width is
 *               chosen to cross the column boundaries: wider than any single
 *               column, narrower than the table. See the note at the cell.
 *
 *               The fallback, if this fails on the page, is to give up the
 *               collapse and carry agreement by ink alone - an agreed row
 *               dimmed, a split row not - which is where this started.
 *
 *   MARKER       which digests are identical, for aiming a manual resync.
 *                Only groups with more than one member get one, so a
 *                three-way split shows NO markers - the correct answer, since
 *                nothing matches. Shape, not colour or weight: shape is a
 *                nominal channel, so no group can look weightier than another
 *                and the majority reading cannot creep back in through the
 *                visual system. Also survives the monochrome theme.
 *
 *   ROW BAND     this split has run past CRITICAL_GENERATIONS. Consecutive rows
 *                form a contiguous block, so the DURATION of a divergence
 *                reads as a bar without counting - which is the thing this
 *                page is watched for.
 *
 * What is gone: consensus, majority, dissenter, ditto marks pointing at a
 * privileged value. Two copies agreeing are not more right than the third.
 * ------------------------------------------------------------------ */

/** Nominal, ordered by first appearance. Shapes, never letters - a-f are hex
    digits and would be read as part of the digest. */
const MATCH_MARKS = ["\u25CF", "\u25C6", "\u25A0", "\u25B2"];

/**
 * One arrow: head and shaft in a single coordinate system, pointing left.
 * The right-hand one is the same element flipped with scaleX(-1).
 *
 * Deliberately NOT a triangle plus a gap plus a hairline div: composing it
 * that way makes the shaft the leftover of flexbox arithmetic, so its length
 * depends on gaps and cell padding, and the shaft itself is a 1px background
 * span - the very construct that reads as a stray row rule. Here there is no
 * viewBox, so user units are CSS pixels: the head is a fixed 12x10 at the tip
 * and the shaft runs to `100%`, whatever width flex hands the element.
 */
function SpanArrow({ flip = false }: { flip?: boolean }) {
  return (
    <span className={`min-w-0 flex-1 ${flip ? "-scale-x-100" : ""}`}>
      <svg
        className="block h-2.5 w-full text-ink-3"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M12 0 L0 5 L12 10 Z" fill="currentColor" />
        <line
          x1="11"
          y1="5"
          x2="100%"
          y2="5"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.55"
        />
      </svg>
    </span>
  );
}

export function GenerationTable({ state }: { state: ScastState }) {
  const [showAll, setShowAll] = useState(false);

  const ordered = [...state.generations].reverse();
  const notable = ordered.filter((g) => g.state !== "agreed");
  const rows = showAll
    ? ordered
    : notable.length
      ? notable
      : ordered.slice(0, 8);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs text-ink-2">
          {showAll
            ? `Full record — ${ordered.length} generations`
            : notable.length
              ? `${notable.length} generation${notable.length === 1 ? "" : "s"} not settled and agreed`
              : `All ${state.settled.length} settled generations agree — showing the most recent 8`}
        </p>
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="rounded-full border border-rule px-2.5 py-0.5 text-[11px] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          {showAll ? "Notable only" : `Show all ${ordered.length}`}
        </button>
      </div>

      <p className="mb-3 text-[11px] text-ink-3">
        <span className="text-ink-2">●</span> same digest as another copy
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] table-fixed border-collapse text-sm">
          <thead>
            <tr className="border-b border-rule-strong text-[10px] uppercase tracking-[0.12em] text-ink-3">
              {/* table-fixed with EQUAL host columns: without it the columns
                  are content-sized (d1-px1 vs scast-hilbert), so the centre of
                  a merged cell is not the centre of anything, and the digests
                  do not line up down the page either. */}
              <th className="w-[26%] py-1.5 pr-3 text-left font-semibold">
                generation <span className="normal-case">({tzLabel()})</span>
              </th>
              {state.hosts.map((h) => (
                <th
                  key={h}
                  className="py-1.5 px-3 text-center font-semibold"
                  style={{ width: `${74 / state.hosts.length}%` }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((g) => {
              const agreed = g.state === "agreed";
              return (
                <tr
                  key={g.generation.toISOString()}
                  className={`border-b border-rule/60 last:border-0 ${
                    g.critical ? "bg-alarm/10" : "hover:bg-surface-2/60"
                  }`}
                >
                  <td
                    className="qc-num py-1.5 pr-3 text-ink-2"
                    title={utcISO(g.generation)}
                  >
                    {genLabel(g.generation)}
                    {g.state === "pending" && (
                      <span
                        className="ml-2 rounded-sm border border-dashed border-partial px-1 text-[9px] uppercase tracking-wider text-partial"
                        title="Not every copy has reported yet"
                      >
                        pending
                      </span>
                    )}
                  </td>

                  {agreed ? (
                    /* THE WIDTH IS 2/3, AND THAT NUMBER IS EXACT. The host
                       columns are centred, so with n equal columns the two
                       OUTER digests sit at 1/(2n) and 1-1/(2n) of the merged
                       cell - 1/6 and 5/6 for three. A mark spanning exactly
                       the middle 2/3 therefore lands its arrow TIPS on those
                       two digest positions: it reaches from where one copy's
                       value would be printed to where the other's would. Both
                       are fractions of the same cell, so it holds at any table
                       width. No cell padding here - px-3 would shrink the
                       content box and the 2/3 would stop being 2/3.

                       Centring the COLUMNS is what makes a centred collapse
                       legible. While they were left-aligned the digests sat at
                       471/684/898 against a cell centred at 779, so no centred
                       mark could point at anything, and the arrows were never
                       going to rescue it. */
                    <td
                      colSpan={state.hosts.length}
                      className="py-1.5 text-center"
                      title={`all ${g.reports.length} copies hold ${g.reports[0]?.digest}`}
                    >
                      <span className="mx-auto flex w-2/3 items-center gap-2">
                        <SpanArrow />
                        <span className="qc-digest shrink-0 text-[12px] text-ink-2">
                          {shortDigest(g.reports[0]?.digest ?? "")}
                        </span>
                        <SpanArrow flip />
                      </span>
                    </td>
                  ) : (
                    state.hosts.map((h) => {
                      const report = g.reports.find((r) => r.host === h);
                      if (!report) {
                        return (
                          <td
                            key={h}
                            className="py-1.5 px-3 text-center text-ink-3/50"
                            title="no report for this generation"
                          >
                            —
                          </td>
                        );
                      }
                      const mark = g.matchGroup[h];
                      return (
                        <td
                          key={h}
                          className={`qc-digest py-1.5 px-3 text-center text-[12px] ${
                            g.critical ? "text-alarm" : "text-ink-2"
                          }`}
                          title={`${report.digest} · reported ${formatDuration(report.lagMs)} after the cycle`}
                        >
                          {/* The digest is centred in its column; the marker
                              hangs OUT of the flow beside it. In flow it added
                              ~14px to the right of every digest, so the whole
                              grid of digests sat 7px left of the column grid -
                              and the agreed row's arrow tips then could not
                              land on both neighbours symmetrically. */}
                          <span className="relative inline-block">
                            {shortDigest(report.digest)}
                            <span className="absolute top-0 left-full ml-1.5 w-2 text-[9px] text-ink-3/70">
                              {mark === undefined
                                ? ""
                                : MATCH_MARKS[mark % MATCH_MARKS.length]}
                            </span>
                          </span>
                        </td>
                      );
                    })
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Per-copy behaviour: how late, how long, how reliable. */
export function CopyRows({
  state,
  status,
}: {
  state: ScastState;
  status: Liveness;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] table-fixed border-collapse text-sm">
        <thead>
          <tr className="border-b border-rule-strong text-[10px] uppercase tracking-[0.12em] text-ink-3">
            <th className="py-1.5 pr-3 text-left font-semibold">copy</th>
            <th className="py-1.5 px-3 text-right font-semibold">reports</th>
            <th className="py-1.5 px-3 text-right font-semibold">
              reporting lag
            </th>
            <th className="py-1.5 px-3 text-right font-semibold">scrape</th>
            <th className="py-1.5 px-3 text-right font-semibold">missed</th>
          </tr>
        </thead>
        <tbody>
          {state.perHost.map((h) => (
            <tr
              key={h.host}
              className="border-b border-rule/60 last:border-0 hover:bg-surface-2/60"
            >
              <td className="py-2 pr-3">
                <span className="flex items-center gap-2">
                  <LivenessDot status={status} />
                  <span className="qc-digest text-[13px] text-ink">
                    {h.host}
                  </span>
                </span>
              </td>
              <td className="qc-num py-2 px-3 text-right text-ink-2">
                {h.reports}
              </td>
              <td className="qc-num py-2 px-3 text-right text-ink">
                {h.medianLagMs === null ? "—" : formatDuration(h.medianLagMs)}
              </td>
              <td className="qc-num py-2 px-3 text-right text-ink-2">
                {h.medianElapsed === null
                  ? "—"
                  : formatSeconds(h.medianElapsed)}
              </td>
              <td
                className={`qc-num py-2 px-3 text-right ${h.missed > 0 ? "text-ink-2" : "text-ink-3/50"}`}
              >
                {h.missed || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 max-w-prose text-[11px] text-ink-3">
        Lag is publish time minus the generation; scrape is how long the run
        took.
      </p>
    </div>
  );
}

/** The verdict sentence, shared so all three variants say the same thing. */
export function ConvergenceVerdict({ state }: { state: ScastState }) {
  const last = state.lastDivergence;
  if (!state.latestSettled) {
    return <>Waiting for a complete generation.</>;
  }
  if (!state.agreed) {
    const generations = last?.generations ?? 1;
    return (
      <>
        The copies are{" "}
        <span className="font-medium text-alarm">out of step</span> and have
        been for <span className="qc-num">{generations}</span>{" "}
        {generations === 1 ? "generation" : "generations"}
        {generations > CRITICAL_GENERATIONS ? (
          <> — longer than they normally take to reconcile.</>
        ) : (
          <> — the reconciliation is expected to close it.</>
        )}
      </>
    );
  }
  if (!last) {
    return (
      <>All {state.hosts.length} copies agree, and have for the whole window.</>
    );
  }
  return (
    <>
      All {state.hosts.length} copies agree. Last divergence{" "}
      <span className="qc-num text-ink">{genLabel(last.to)}</span>, lasting{" "}
      <span className="qc-num text-ink">{last.generations}</span>{" "}
      {last.generations === 1 ? "generation" : "generations"}
      {last.critical ? " — longer than usual." : " and it healed itself."}
    </>
  );
}
