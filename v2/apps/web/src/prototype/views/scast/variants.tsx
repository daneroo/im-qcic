// PROTOTYPE — throwaway. See ../../README.md.
//
// The three scast variants. Kept in one file (unlike tedcheck's) because each
// is thin: the substance lives in ../../derive/scast.ts and ./shared.tsx, and
// what differs between them is only how hierarchy and summary are arranged.

import { formatDuration, SELF_HEALING_CYCLES } from "../../derive/scast";
import {
  Byline,
  Eyebrow,
  LivenessDot,
  LivenessLabel,
  Masthead,
} from "../../ui/primitives";
import {
  ConvergenceStrip,
  ConvergenceVerdict,
  CopyRows,
  GenerationTable,
  genLabel,
  shortDigest,
} from "./shared";
import type { ScastFeed } from "./data";

/** Big, plain statement of the only thing most visits want to know. */
function Headline({ feed }: { feed: ScastFeed }) {
  const { state } = feed;
  return (
    <div>
      <div className="flex items-baseline gap-3">
        <span
          className={`text-5xl leading-none font-light tracking-tight ${
            state.latestSettled
              ? state.converged
                ? "text-ink"
                : "text-alarm"
              : "text-partial"
          }`}
        >
          {state.latestSettled
            ? state.converged
              ? "agreed"
              : "split"
            : "waiting"}
        </span>
        {state.latestSettled && (
          <span className="qc-digest text-sm text-ink-3">
            {shortDigest(state.latestSettled.consensus ?? "")}
          </span>
        )}
      </div>
      <p className="mt-3 max-w-prose text-sm text-ink-2">
        <ConvergenceVerdict state={state} />
      </p>
      {state.convergenceRate !== null && (
        <p className="mt-2 text-xs text-ink-3">
          <span className="qc-num text-ink-2">
            {(state.convergenceRate * 100).toFixed(1)}%
          </span>{" "}
          of {state.settled.length} settled generations agreed;{" "}
          <span className="qc-num text-ink-2">{state.divergences.length}</span>{" "}
          divergence{state.divergences.length === 1 ? "" : "s"}, of which{" "}
          <span className="qc-num text-ink-2">
            {state.divergences.filter((e) => e.stuck).length}
          </span>{" "}
          lasted more than {SELF_HEALING_CYCLES} cycles.
        </p>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- STRATA */

function Stratum({
  index,
  name,
  role,
  tone,
  grow,
  children,
}: {
  index: number;
  name: string;
  role: string;
  tone: "paper" | "sunken" | "deep";
  grow?: boolean;
  children: React.ReactNode;
}) {
  const bg =
    tone === "paper" ? "bg-paper" : tone === "sunken" ? "bg-sunken" : "bg-deep";
  return (
    <section className={`${bg} border-t border-rule ${grow ? "flex-1" : ""}`}>
      <div className="mx-auto flex max-w-5xl gap-5 px-5 py-8 sm:gap-8 sm:px-8">
        <div className="flex w-7 shrink-0 flex-col items-center gap-2 sm:w-9">
          <span className="qc-num text-[11px] font-medium text-ink-2">
            {String(index).padStart(2, "0")}
          </span>
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-3"
            style={{ writingMode: "vertical-rl" }}
          >
            {name}
          </span>
          <div className="w-px flex-1 bg-rule" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-4">
            <Eyebrow>{role}</Eyebrow>
          </div>
          {children}
        </div>
      </div>
    </section>
  );
}

export function ScastStrata({ feed }: { feed: ScastFeed }) {
  const { state } = feed;
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <Masthead running={<>scrobblecast &middot; agreement</>} />

      <Stratum
        index={1}
        name="signal"
        role="Whether the three copies hold the same history"
        tone="paper"
      >
        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:items-start">
          <Headline feed={feed} />
          <ConvergenceStrip
            generations={state.generations}
            title="agreement by generation"
            height={56}
          />
        </div>

        <div className="mt-9 border-t border-rule pt-6">
          <details className="group rounded-lg border border-rule bg-surface/50 open:bg-surface">
            <summary className="flex cursor-pointer list-none items-baseline justify-between gap-3 px-3 py-2 text-sm text-ink-2 hover:text-ink">
              <span className="text-ink">Cross-tab record</span>
              <span className="text-[11px] text-ink-3">show record ▾</span>
            </summary>
            <div className="border-t border-rule px-3 py-3">
              <GenerationTable state={state} />
            </div>
          </details>
        </div>

        <Byline>im.scast.scrape.digest</Byline>
      </Stratum>

      <Stratum
        index={2}
        name="copies"
        role="The three that have to agree"
        tone="sunken"
      >
        <CopyRows state={state} status={feed.status} />
      </Stratum>

      <Stratum
        index={3}
        name="substrate"
        role="The stream this page is reading over"
        tone="deep"
        grow
      >
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="text-sm text-ink">
              NATS JetStream — ordered consumer on{" "}
              <span className="qc-digest">scastDigest</span>, 24h replay
            </p>
            <p className="mt-1 text-xs text-ink-3">
              <span className="qc-num">{feed.count}</span> records held, a 48h
              rolling window. {state.historyRecords} of them are the{" "}
              <span className="qc-digest">history</span> scope, which this view
              does not use.
            </p>
          </div>
          <LivenessLabel status={feed.status} />
        </div>
      </Stratum>
    </div>
  );
}

/* --------------------------------------------------------------- CIRCUIT */

export function ScastCircuit({ feed }: { feed: ScastFeed }) {
  const { state } = feed;

  return (
    <div className="min-h-screen bg-paper pb-28">
      <Masthead running={<LivenessLabel status={feed.status} />} />
      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <Eyebrow>three copies, one history, and how far apart they run</Eyebrow>

        {/* Each copy is a lane into the stream. The lane's label is its own
            reporting lag — the property that actually differs between them,
            and the reason the newest generation always looks incomplete. */}
        <div className="mt-5 overflow-x-auto">
          <div className="min-w-[38rem]">
            {state.perHost.map((h) => {
              const dissenting =
                state.latestSettled?.dissenting.includes(h.host) ?? false;
              return (
                <div
                  key={h.host}
                  className="flex items-center gap-3 border-b border-rule/60 py-2.5 last:border-0"
                >
                  <span className="flex w-40 shrink-0 items-center gap-2">
                    <LivenessDot status={feed.status} />
                    <span className="qc-digest text-[13px] text-ink">
                      {h.host}
                    </span>
                  </span>

                  <span className="relative flex min-w-0 flex-1 items-center">
                    <span
                      className={`h-px w-full ${dissenting ? "bg-alarm" : "bg-rule-strong"}`}
                    />
                    <span className="absolute left-1/2 -translate-x-1/2 bg-paper px-2 text-[10px] text-ink-3">
                      {h.medianLagMs === null
                        ? "—"
                        : `reports ${formatDuration(h.medianLagMs)} after the cycle`}
                    </span>
                  </span>

                  <span
                    className={`w-24 shrink-0 text-right text-[11px] ${dissenting ? "text-alarm" : "text-ink-3"}`}
                  >
                    {dissenting ? "out of step" : "in step"}
                  </span>
                </div>
              );
            })}

            <div className="mt-4 flex items-center gap-3">
              <span className="w-40 shrink-0" />
              <span className="min-w-0 flex-1 text-center">
                <span className="rounded-md border border-rule-strong bg-surface px-3 py-1.5 text-[13px] font-medium text-ink">
                  scastDigest
                </span>
              </span>
              <span className="w-24 shrink-0" />
            </div>
          </div>
        </div>

        <section className="mt-8 rounded-xl border border-rule bg-surface p-5 sm:p-6">
          <Headline feed={feed} />
          <div className="mt-6">
            <ConvergenceStrip
              generations={state.generations}
              title="agreement by generation"
              height={48}
            />
          </div>
        </section>

        <details className="mt-6 rounded-lg border border-rule bg-surface/50">
          <summary className="cursor-pointer list-none px-3 py-2 text-sm text-ink-2 hover:text-ink">
            Cross-tab record
          </summary>
          <div className="border-t border-rule px-3 py-3">
            <GenerationTable state={state} />
          </div>
        </details>

        <div className="mt-6">
          <CopyRows state={state} status={feed.status} />
        </div>

        <Byline>im.scast.scrape.digest</Byline>
      </main>
    </div>
  );
}

/* ----------------------------------------------------------------- SHEET */

export function ScastSheet({ feed }: { feed: ScastFeed }) {
  const { state } = feed;
  const last = state.lastDivergence;

  return (
    <div className="min-h-screen bg-paper pb-28">
      <Masthead running={<>agreement sheet</>} />
      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[42rem] border-collapse">
            <thead>
              <tr className="border-b border-rule-strong text-[10px] uppercase tracking-[0.14em] text-ink-3">
                <th className="py-2 pr-3 text-left font-semibold">subject</th>
                <th className="py-2 px-3 text-right font-semibold">agreed</th>
                <th className="py-2 px-3 text-right font-semibold">
                  last excursion
                </th>
                <th className="py-2 px-3 text-right font-semibold">lasted</th>
                <th className="py-2 pl-3 text-left font-semibold">window</th>
              </tr>
            </thead>
            <tbody>
              {/* The group line: the only row where "agreed" is a property of
                  the set rather than of a member. */}
              <tr className="border-b border-rule/70">
                <td className="py-2.5 pr-3">
                  <span className="flex items-center gap-2">
                    <LivenessDot status={feed.status} />
                    <span className="text-sm text-ink">scrobblecast</span>
                    <span className="text-[11px] text-ink-3">
                      {state.hosts.length} copies
                    </span>
                  </span>
                </td>
                <td
                  className={`qc-num px-3 py-2.5 text-right ${state.converged ? "text-ink" : "text-alarm"}`}
                >
                  {state.convergenceRate === null
                    ? "—"
                    : `${(state.convergenceRate * 100).toFixed(1)}%`}
                </td>
                <td className="qc-num px-3 py-2.5 text-right text-[13px] text-ink-2">
                  {last ? genLabel(last.to) : "none in window"}
                </td>
                <td
                  className={`qc-num px-3 py-2.5 text-right text-[13px] ${last?.stuck ? "font-medium text-alarm" : "text-ink-3"}`}
                >
                  {last ? `${last.cycles} cyc` : "—"}
                </td>
                <td className="w-[34%] py-2.5 pl-3">
                  <ConvergenceStrip
                    generations={state.generations}
                    height={22}
                    chrome={false}
                  />
                </td>
              </tr>

              {state.perHost.map((h) => (
                <tr key={h.host} className="border-b border-rule/70">
                  <td className="py-2.5 pr-3 pl-6">
                    <span className="flex items-center gap-2">
                      <LivenessDot status={feed.status} />
                      <span className="qc-digest text-[13px] text-ink">
                        {h.host}
                      </span>
                    </span>
                  </td>
                  <td className="qc-num px-3 py-2.5 text-right text-ink-2">
                    {h.dissented === 0 ? "always" : `${h.dissented} off`}
                  </td>
                  <td className="qc-num px-3 py-2.5 text-right text-[13px] text-ink-3">
                    {h.medianLagMs === null
                      ? "—"
                      : `+${formatDuration(h.medianLagMs)} lag`}
                  </td>
                  <td className="qc-num px-3 py-2.5 text-right text-[13px] text-ink-3">
                    {h.missed > 0 ? `${h.missed} missed` : "—"}
                  </td>
                  <td className="py-2.5 pl-3 text-[11px] text-ink-3">
                    {h.reports} reports
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 max-w-prose text-xs text-ink-3">
          Convergence is reported in cycles, not nines: a 48h window holds only
          ~{state.generations.length} generations, so one divergence would
          already read as 2.46 nines. The unit has to match what the data can
          carry.
        </p>

        <details className="mt-6 rounded-lg border border-rule bg-surface/50">
          <summary className="cursor-pointer list-none px-3 py-2 text-sm text-ink-2 hover:text-ink">
            Cross-tab record
          </summary>
          <div className="border-t border-rule px-3 py-3">
            <GenerationTable state={state} />
          </div>
        </details>

        <Byline>im.scast.scrape.digest</Byline>
      </main>
    </div>
  );
}
