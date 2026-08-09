// PROTOTYPE — throwaway. See ../../README.md.
//
// The scast marks, shared by all three variants.

import { useState } from "react";
import {
  formatDuration,
  formatSeconds,
  SELF_HEALING_CYCLES,
  type GenerationRow,
  type ScastState,
} from "../../derive/scast";
import { LivenessDot, type Liveness } from "../../ui/primitives";
import { localHM, tzLabel, utcISO } from "../../derive/time";

/** Generations are ten-minute cycles - an hour/minute label, so localised. */
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
 *   converged  floor tick, near-invisible. The resting state disappears.
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
          if (g.state === "converged") {
            return (
              <div
                key={key}
                title={`${utcISO(g.generation)} — all ${g.reports.length} copies agree on ${shortDigest(g.consensus ?? "")}`}
                className="min-w-0 flex-1 rounded-[2px] bg-absent/70"
                style={{ height: "14%" }}
              />
            );
          }
          // A one- or two-cycle split is the system reconciling itself
          // exactly as described, so it is drawn in neutral ink at half
          // height. Only a run that outlasted that gets the alarm colour.
          return (
            <div
              key={key}
              title={`${utcISO(g.generation)} — ${g.distinct.length} different digests; ${g.dissenting.join(", ") || "no majority"} out of step${g.stuckRun ? " (run exceeded 2 cycles)" : ""}`}
              className={`min-w-0 flex-1 rounded-[2px] ${g.stuckRun ? "bg-alarm" : "bg-ink-3/45"}`}
              style={{ height: g.stuckRun ? "100%" : "48%" }}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * The cross-tab, rewritten around the question it exists to answer.
 *
 * The production view prints a 7-character digest in every cell and leaves
 * the reader to diff hex across columns. But agreement is the expected state
 * and it is the same value in every column — so it is written ONCE, at the
 * row head, and each agreeing copy carries a ditto. Only a copy that
 * disagrees spells its digest out.
 *
 * The result: a page of quiet dittos, where divergence is the only thing that
 * speaks. Same information, and the eye does none of the work.
 * ------------------------------------------------------------------ */
export function GenerationTable({ state }: { state: ScastState }) {
  const [showAll, setShowAll] = useState(false);

  const ordered = [...state.generations].reverse();
  const notable = ordered.filter((g) => g.state !== "converged");
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

      <p className="mb-3 max-w-prose text-[11px] leading-relaxed text-ink-3">
        Agreement is written once, at the row head. A{" "}
        <span className="text-ink-2">&ldquo;</span> means that copy matched it.
        A copy that disagrees spells out its own digest; a copy that
        hasn&rsquo;t reported yet shows a dash.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-rule-strong text-[10px] uppercase tracking-[0.12em] text-ink-3">
              <th className="py-1.5 pr-3 text-left font-semibold">
                generation <span className="normal-case">({tzLabel()})</span>
              </th>
              <th className="py-1.5 px-3 text-left font-semibold">agreed</th>
              {state.hosts.map((h) => (
                <th key={h} className="py-1.5 px-3 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((g) => (
              <tr
                key={g.generation.toISOString()}
                className="border-b border-rule/60 last:border-0 hover:bg-surface-2/60"
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
                <td className="qc-digest py-1.5 px-3 text-[12px]">
                  {g.consensus ? (
                    <span
                      className={
                        g.state === "diverged" ? "text-ink" : "text-ink-2"
                      }
                    >
                      {shortDigest(g.consensus)}
                    </span>
                  ) : (
                    <span className="text-alarm">no majority</span>
                  )}
                </td>
                {state.hosts.map((h) => {
                  const report = g.reports.find((r) => r.host === h);
                  if (!report) {
                    return (
                      <td
                        key={h}
                        className="py-1.5 px-3 text-ink-3/50"
                        title="no report for this generation"
                      >
                        —
                      </td>
                    );
                  }
                  if (report.digest === g.consensus) {
                    return (
                      <td
                        key={h}
                        className="py-1.5 px-3 text-ink-3"
                        title={`${report.digest} · reported ${formatDuration(report.lagMs)} after the cycle`}
                      >
                        &ldquo;
                      </td>
                    );
                  }
                  return (
                    <td
                      key={h}
                      className={`qc-digest py-1.5 px-3 text-[12px] ${g.stuckRun ? "font-medium text-alarm" : "text-ink-2"}`}
                      title={`${report.digest} · out of step${g.stuckRun ? " (run exceeded 2 cycles)" : ""}`}
                    >
                      {shortDigest(report.digest)}
                    </td>
                  );
                })}
              </tr>
            ))}
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
      <table className="w-full min-w-[34rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-rule-strong text-[10px] uppercase tracking-[0.12em] text-ink-3">
            <th className="py-1.5 pr-3 text-left font-semibold">copy</th>
            <th className="py-1.5 px-3 text-right font-semibold">reports</th>
            <th className="py-1.5 px-3 text-right font-semibold">
              reporting lag
            </th>
            <th className="py-1.5 px-3 text-right font-semibold">scrape</th>
            <th className="py-1.5 px-3 text-right font-semibold">missed</th>
            <th className="py-1.5 pl-3 text-right font-semibold">
              out of step
            </th>
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
              <td
                className={`qc-num py-2 pl-3 text-right ${h.dissented > 0 ? "font-medium text-alarm" : "text-ink-3/50"}`}
              >
                {h.dissented || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 max-w-prose text-[11px] text-ink-3">
        Reporting lag is the copy&rsquo;s publish time minus the cycle it
        belongs to; scrape is how long its own run took. Both ride on every
        message and neither is shown by the current view.
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
  if (!state.converged) {
    const cycles = last?.cycles ?? 1;
    return (
      <>
        The copies are{" "}
        <span className="font-medium text-alarm">out of step</span> and have
        been for <span className="qc-num">{cycles}</span>{" "}
        {cycles === 1 ? "cycle" : "cycles"}
        {cycles > SELF_HEALING_CYCLES ? (
          <> — longer than they normally take to reconcile.</>
        ) : (
          <> — within the one or two cycles they normally take.</>
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
      <span className="qc-num text-ink">{last.cycles}</span>{" "}
      {last.cycles === 1 ? "cycle" : "cycles"}
      {last.stuck ? " — longer than usual." : " and it healed itself."}
    </>
  );
}
