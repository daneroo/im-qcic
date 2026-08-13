import { useState } from "react";
import { ConnectionDot, type ConnectionState } from "../components/marks";
import { formatDuration, formatSeconds } from "../format/duration";
import { localHM, tzLabel, utcISO } from "../format/time";
import {
  CRITICAL_GENERATIONS,
  type GenerationReading,
  type ScastReading,
} from "./derive";

const MATCH_MARKS = ["●", "◆", "■", "▲"];

function Digest({ value }: { value: string }) {
  return (
    <>
      <span className="sm:hidden">{value.slice(0, 4)}</span>
      <span className="hidden sm:inline">{value.slice(0, 7)}</span>
    </>
  );
}

export function ConvergenceStrip({
  generations,
}: {
  generations: GenerationReading[];
}) {
  const newestFirst = [...generations].reverse();
  const oldest = generations[0]?.generation;
  const newest = generations.at(-1)?.generation;
  const spanHours =
    oldest && newest
      ? Math.round((newest.getTime() - oldest.getTime()) / 3_600_000)
      : null;

  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[11px] text-ink-3">agreement by generation</span>
        <span className="qc-num text-[10px] text-ink-3">
          {generations.length} generations
        </span>
      </div>
      <div className="flex h-14 w-full items-start border-t border-rule-strong">
        {newestFirst.map((generation) => {
          const key = generation.generation.toISOString();
          if (generation.agreement === "converged") {
            return (
              <span
                key={key}
                title={`${utcISO(generation.generation)} — all copies converged`}
                className="min-w-0 flex-1"
              />
            );
          }
          if (generation.settlement === "pending") {
            return (
              <span
                key={key}
                title={`${utcISO(generation.generation)} — waiting on ${generation.missing.join(", ")}`}
                className="h-0 min-w-0 flex-1 border-t border-dashed border-partial"
              />
            );
          }
          return (
            <span
              key={key}
              title={`${utcISO(generation.generation)} — ${generation.distinct.length} distinct digests`}
              className={`h-full min-w-0 flex-1 ${generation.critical ? "bg-alarm" : "bg-ink-3/70"}`}
            />
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-ink-3">
        <span>now</span>
        {spanHours !== null && <span className="qc-num">{spanHours}h ago</span>}
      </div>
    </div>
  );
}

function SpanArrow({ flip = false }: { flip?: boolean }) {
  return (
    <span className={`min-w-0 flex-1 ${flip ? "-scale-x-100" : ""}`}>
      <svg
        className="block h-3 w-full text-rule-strong"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5.125 1.5 L0.625 6 L5.125 10.5" />
        <line x1="0.625" y1="6" x2="100%" y2="6" />
      </svg>
    </span>
  );
}

function GenerationTable({ reading }: { reading: ScastReading }) {
  const [showAll, setShowAll] = useState(false);
  const allRows = [...reading.generations].reverse();
  const latestRows = [...reading.latestDivergenceRows].reverse();
  const rows = showAll ? allRows : latestRows;
  const divergence = reading.latestDivergence;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs text-ink-2">
          {showAll
            ? `Full record — ${allRows.length} generations`
            : !divergence
              ? `No divergence in the window — the most recent ${latestRows.length}`
              : divergence.ongoing
                ? `Diverged for ${divergence.generations} generation${divergence.generations === 1 ? "" : "s"}, still open`
                : `Latest divergence — ${divergence.generations} generation${divergence.generations === 1 ? "" : "s"}, healed`}
        </p>
        <button
          type="button"
          onClick={() => setShowAll((current) => !current)}
          className="rounded-full border border-rule px-2.5 py-0.5 text-[11px] text-ink-2 hover:bg-surface-2 hover:text-ink"
        >
          {showAll ? "Latest divergence" : `Full record (${allRows.length})`}
        </button>
      </div>
      <p className="mb-3 text-[11px] text-ink-3">
        <span className="text-ink-2">●</span> same digest as another copy ·
        times in {tzLabel()}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[17rem] table-fixed border-collapse text-sm sm:min-w-[34rem]">
          <thead>
            <tr className="border-b border-rule-strong text-[10px] uppercase tracking-[0.12em] text-ink-3">
              <th className="w-[26%] py-1.5 pr-2 text-left font-semibold sm:pr-3">
                <span className="sm:hidden">gen</span>
                <span className="hidden sm:inline">generation</span>
              </th>
              {reading.hosts.map((host) => (
                <th
                  key={host}
                  className="px-2 py-1.5 text-center font-semibold sm:px-3"
                  style={{ width: `${74 / reading.hosts.length}%` }}
                >
                  {host}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((generation) => (
              <tr
                key={generation.generation.toISOString()}
                className={`border-b border-rule/60 last:border-0 ${generation.critical ? "bg-alarm/10" : "hover:bg-surface-2/60"}`}
              >
                <td
                  className="qc-num py-1.5 pr-2 text-ink-2 sm:pr-3"
                  title={utcISO(generation.generation)}
                >
                  {localHM(generation.generation)}
                  {generation.settlement === "pending" && (
                    <span className="ml-2 rounded-sm border border-dashed border-partial px-1 text-[9px] uppercase tracking-wider text-partial">
                      pending
                    </span>
                  )}
                </td>
                {generation.agreement === "converged" ? (
                  <td
                    colSpan={reading.hosts.length}
                    className="py-1.5 text-center"
                    title={`all copies hold ${generation.reports[0]?.digest}`}
                  >
                    <span className="mx-auto flex w-2/3 items-center gap-3">
                      <SpanArrow />
                      <span className="qc-digest shrink-0 text-[12px] text-ink-2">
                        <Digest value={generation.reports[0]?.digest ?? ""} />
                      </span>
                      <SpanArrow flip />
                    </span>
                  </td>
                ) : (
                  reading.hosts.map((host) => {
                    const report = generation.reports.find(
                      (candidate) => candidate.host === host,
                    );
                    if (!report) {
                      return (
                        <td
                          key={host}
                          title="no report for this generation"
                          className="px-2 py-1.5 text-center text-ink-3/50 sm:px-3"
                        >
                          —
                        </td>
                      );
                    }
                    const mark = generation.matchGroup[host];
                    return (
                      <td
                        key={host}
                        title={`${report.digest} · reported ${formatDuration(report.lagMs)} after the cycle`}
                        className={`qc-digest px-2 py-1.5 text-center text-[12px] sm:px-3 ${generation.critical ? "text-alarm" : "text-ink-2"}`}
                      >
                        <span className="relative inline-block">
                          <Digest value={report.digest} />
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function GenerationRecord({ reading }: { reading: ScastReading }) {
  return (
    <details className="group rounded-lg border border-rule bg-surface/50 open:bg-surface">
      <summary className="flex cursor-pointer list-none items-baseline justify-between gap-3 px-3 py-2 text-sm text-ink-2 hover:text-ink">
        <span className="text-ink">Generation digests by copy</span>
        <span className="text-[11px] text-ink-3">
          <span className="group-open:hidden">show ▾</span>
          <span className="hidden group-open:inline">hide ▴</span>
        </span>
      </summary>
      <div className="border-t border-rule px-3 py-3">
        <GenerationTable reading={reading} />
      </div>
    </details>
  );
}

export function CopyTable({
  reading,
  status,
}: {
  reading: ScastReading;
  status: ConnectionState;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] table-fixed border-collapse text-sm">
        <thead>
          <tr className="border-b border-rule-strong text-[10px] uppercase tracking-[0.12em] text-ink-3">
            <th className="py-1.5 pr-3 text-left font-semibold">copy</th>
            <th className="px-3 py-1.5 text-right font-semibold">reports</th>
            <th className="px-3 py-1.5 text-right font-semibold">lag</th>
            <th className="px-3 py-1.5 text-right font-semibold">scrape</th>
            <th className="px-3 py-1.5 text-right font-semibold">missed</th>
          </tr>
        </thead>
        <tbody>
          {reading.perHost.map((host) => (
            <tr
              key={host.host}
              className="border-b border-rule/60 last:border-0 hover:bg-surface-2/60"
            >
              <td className="py-2 pr-3">
                <span className="flex items-center gap-2">
                  <ConnectionDot status={status} />
                  <span className="qc-digest text-[13px] text-ink">
                    {host.host}
                  </span>
                </span>
              </td>
              <td className="qc-num px-3 py-2 text-right text-ink-2">
                {host.reports}
              </td>
              <td className="qc-num px-3 py-2 text-right text-ink">
                {host.medianLagMs === null
                  ? "—"
                  : formatDuration(host.medianLagMs)}
              </td>
              <td className="qc-num px-3 py-2 text-right text-ink-2">
                {host.medianElapsed === null
                  ? "—"
                  : formatSeconds(host.medianElapsed)}
              </td>
              <td className="qc-num px-3 py-2 text-right text-ink-3">
                {host.missed || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-ink-3">
        Lag is publish time minus generation; scrape is the run duration.
      </p>
    </div>
  );
}

export function ConvergenceVerdict({ reading }: { reading: ScastReading }) {
  const latest = reading.latestDivergence;
  if (!reading.latestSettled) return <>Waiting for a complete generation.</>;
  if (!reading.converged) {
    const length = latest?.generations ?? 1;
    return (
      <>
        The copies are{" "}
        <span
          className={latest?.critical ? "font-medium text-alarm" : "text-ink"}
        >
          diverged
        </span>{" "}
        and have been for <span className="qc-num">{length}</span>{" "}
        {length === 1 ? "generation" : "generations"}
        {length > CRITICAL_GENERATIONS
          ? " — longer than they normally take to reconcile."
          : " — reconciliation is expected to close it."}
      </>
    );
  }
  if (!latest) {
    return (
      <>All {reading.hosts.length} copies converged for the whole window.</>
    );
  }
  return (
    <>
      All {reading.hosts.length} copies converged. Latest divergence lasted{" "}
      <span className="qc-num text-ink">{latest.generations}</span>{" "}
      {latest.generations === 1 ? "generation" : "generations"} and healed.
    </>
  );
}
