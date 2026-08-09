// PROTOTYPE — throwaway. See ../../README.md.
//
// CIRCUIT: hierarchy as connections. Health lives on the EDGES, not the nodes.
//
// The claim being tested: for a homelab, "is X up?" is usually the wrong
// question — what actually breaks is the link between two things that are both
// individually fine. ted1k's own history is the proof. The sensor runs, MySQL
// runs, and yet 39 minutes went missing on 2026-08-03: the loss happened
// *between* them. A page of node badges can never show that; a page of edges
// can.
//
// So every node here is drawn plainly and every edge carries a property that
// is separately observable:
//
//   ted → mysql      1 Hz, and the continuity figure for the last 24h
//   mysql → derive   the poll cadence, per view, all three out of step
//   derive → kv      when it last published
//   kv → browser     the websocket, which is the only edge we observe directly
//
// Selecting an edge shows what is known about that link and nothing else.

import { useState } from "react";
import {
  formatAbsence,
  formatKwhPerDay,
  formatNines,
} from "../../derive/nines";
import { since } from "../../derive/tedcheck";
import {
  Byline,
  CoverageStrip,
  Eyebrow,
  Masthead,
  LivenessDot,
  LivenessLabel,
  NinesFigure,
  Figure,
  Sparkline,
} from "../../ui/primitives";
import { BucketTable } from "./BucketTable";
import type { TedcheckFeed } from "./data";

type EdgeId = "capture" | "poll" | "publish" | "transport";

interface EdgeSpec {
  id: EdgeId;
  from: string;
  to: string;
  property: string;
  detail: string;
  state: "ok" | "excursion" | "unknown" | "down";
}

function edgeInk(state: EdgeSpec["state"]): string {
  switch (state) {
    case "excursion":
      return "text-excursion";
    case "down":
      return "text-excursion";
    case "unknown":
      return "text-partial";
    default:
      return "text-ink-2";
  }
}

/** A node is just a name. Deliberately unstyled — it isn't the subject here. */
function Node({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="flex min-w-0 shrink-0 flex-col items-center text-center">
      <div className="rounded-md border border-rule-strong bg-surface px-3 py-1.5">
        <span className="text-[13px] font-medium text-ink">{label}</span>
      </div>
      {sub && (
        <span className="qc-digest mt-1 text-[10px] text-ink-3">{sub}</span>
      )}
    </div>
  );
}

/** The edge carries the health. Its line is the state; its label is the fact. */
function Edge({
  spec,
  selected,
  onSelect,
}: {
  spec: EdgeSpec;
  selected: boolean;
  onSelect(): void;
}) {
  const line =
    spec.state === "excursion" || spec.state === "down"
      ? "bg-excursion"
      : spec.state === "unknown"
        ? "bg-partial"
        : "bg-rule-strong";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="group flex min-w-[5rem] flex-1 flex-col items-center gap-1 px-1 pt-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <span
        className={`text-[10px] font-medium tracking-wide ${edgeInk(spec.state)} ${
          selected ? "" : "opacity-80"
        }`}
      >
        {spec.property}
      </span>
      <span className="relative flex w-full items-center">
        <span
          className={`h-px w-full ${line} ${
            spec.state === "unknown" ? "opacity-70" : ""
          }`}
        />
        <span
          className={`absolute left-1/2 h-1.5 w-1.5 -translate-x-1/2 rotate-45 ${
            selected ? "bg-accent" : line
          }`}
        />
      </span>
      <span
        className={`text-[10px] ${selected ? "text-ink" : "text-ink-3 group-hover:text-ink-2"}`}
      >
        {selected ? "showing" : "inspect"}
      </span>
    </button>
  );
}

export function TedcheckCircuit({ feed }: { feed: TedcheckFeed }) {
  const [edge, setEdge] = useState<EdgeId>("capture");
  const headline = feed.lastDay.view;
  const today = feed.dayByHour.view;
  const month = feed.weekByDay.view;
  const now = headline?.stamp ?? new Date();
  const busDown = feed.busStatus !== "connected";

  const edges: EdgeSpec[] = [
    {
      id: "capture",
      from: "ted",
      to: "mysql",
      property: "1 Hz",
      detail: headline
        ? `${formatAbsence(headline.total.missing)} unrecorded in the last 24h`
        : "waiting",
      state: month?.lastExcursion ? "excursion" : "ok",
    },
    {
      id: "poll",
      from: "mysql",
      to: "ted1k-derive",
      property: "60s / 5m / 10m",
      detail: "three views, three cadences, never in step",
      state: "ok",
    },
    {
      id: "publish",
      from: "ted1k-derive",
      to: "kv",
      property: headline ? since(headline.stamp, now) : "—",
      detail: "last write to the ted1k-derive bucket",
      state: "ok",
    },
    {
      id: "transport",
      from: "kv",
      to: "browser",
      property: busDown ? feed.busStatus : "websocket",
      detail: "the only edge this page observes directly",
      state: busDown ? "down" : "ok",
    },
  ];

  const active = edges.find((e) => e.id === edge)!;

  return (
    <div className="min-h-screen bg-paper pb-28">
      <Masthead running={<LivenessLabel status={feed.busStatus} />} />

      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <Eyebrow>the path a watt-second takes to reach this page</Eyebrow>

        {/* The topology. Fixed, hand-authored order — never force-directed,
            because the sequence is a fact about the system, not a layout
            result that should be free to wander between renders. */}
        <div className="mt-4 overflow-x-auto pb-2">
          <div className="flex min-w-[46rem] items-start gap-1">
            <Node label="ted" sub="power monitor" />
            <Edge
              spec={edges[0]!}
              selected={edge === "capture"}
              onSelect={() => setEdge("capture")}
            />
            <Node label="mysql" sub="watt" />
            <Edge
              spec={edges[1]!}
              selected={edge === "poll"}
              onSelect={() => setEdge("poll")}
            />
            <Node label="ted1k-derive" sub={feed.producer ?? undefined} />
            <Edge
              spec={edges[2]!}
              selected={edge === "publish"}
              onSelect={() => setEdge("publish")}
            />
            <Node label="nats kv" sub="ted1k-derive" />
            <Edge
              spec={edges[3]!}
              selected={edge === "transport"}
              onSelect={() => setEdge("transport")}
            />
            <Node label="this page" />
          </div>
        </div>

        {/* What is known about the selected link, and nothing else. */}
        <section className="mt-8 rounded-xl border border-rule bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm text-ink">
              <span className="qc-digest text-ink-2">{active.from}</span>
              <span className="mx-2 text-ink-3">→</span>
              <span className="qc-digest text-ink-2">{active.to}</span>
            </h2>
            <p className={`text-xs ${edgeInk(active.state)}`}>
              {active.detail}
            </p>
          </div>

          <div className="mt-5">
            {active.id === "capture" && headline && (
              <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                <div>
                  <div className="flex flex-wrap items-start gap-x-12 gap-y-5">
                    <NinesFigure
                      value={headline.total.nines}
                      label="continuity across this link, last day"
                    />
                    <Figure
                      value={formatKwhPerDay(headline.meanWatt)}
                      unit="kWh/d"
                      label="carried"
                    />
                  </div>
                  <p className="mt-3 text-xs text-ink-2">
                    {
                      <>
                        Loss on this edge is the only reason a second goes
                        unrecorded — both ends stay up throughout.
                      </>
                    }
                  </p>
                  {month && (
                    <div className="mt-6 border-t border-rule pt-5">
                      <NinesFigure
                        value={month.total.nines}
                        size="sm"
                        label="Last Month"
                        caption={
                          month.lastExcursion ? (
                            <>
                              Last break{" "}
                              <span className="qc-num text-ink">
                                {month.lastExcursion.start
                                  .toISOString()
                                  .slice(0, 10)}
                              </span>{" "}
                              —{" "}
                              <span className="qc-num text-excursion">
                                {formatAbsence(month.lastExcursion.missing)}
                              </span>{" "}
                              ({formatNines(month.lastExcursion.nines)} nines)
                            </>
                          ) : (
                            <>No breaks in the window</>
                          )
                        }
                      />
                    </div>
                  )}
                </div>
                <div>
                  {today && (
                    <>
                      <CoverageStrip
                        buckets={today.buckets}
                        title="absence by hour"
                        height={54}
                      />
                      {today.wattRange && (
                        <div className="mt-6 text-accent">
                          <Sparkline
                            values={today.buckets.map((b) => b.watt)}
                            label={
                              <span className="text-ink-3">power carried</span>
                            }
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {active.id === "poll" && (
              <div className="space-y-1">
                {[
                  ["missingLastDay", "60s", feed.lastDay],
                  ["missingDayByHour", "5min", feed.dayByHour],
                  ["missingWeekByDay", "10min", feed.weekByDay],
                ].map(([name, cadence, w]) => {
                  const watched = w as TedcheckFeed["lastDay"];
                  return (
                    <div
                      key={name as string}
                      className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule/60 py-2 last:border-0"
                    >
                      <span className="text-sm text-ink">
                        {name as string}{" "}
                        <span className="text-xs text-ink-3">
                          every {cadence as string}
                        </span>
                      </span>
                      <span className="flex items-center gap-4 text-[11px] text-ink-3">
                        <span className="qc-num">
                          {watched.view
                            ? `updated ${since(watched.view.stamp, now)}`
                            : "waiting"}
                        </span>
                        <LivenessDot status={watched.status} />
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {active.id === "publish" && headline && (
              <p className="text-sm text-ink-2">
                Each view is written to its own key, so a slow query on one
                cannot stall the others. Newest write{" "}
                <span className="qc-num text-ink">
                  {headline.stamp.toISOString().replace("T", " ").slice(0, 19)}Z
                </span>
                .
              </p>
            )}

            {active.id === "transport" && (
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <p className="max-w-prose text-sm text-ink-2">
                  Three independent KV watches share one websocket. This is the
                  browser&rsquo;s own connection state — if it drops, everything
                  upstream becomes unverifiable rather than false.
                </p>
                <LivenessLabel status={feed.busStatus} />
              </div>
            )}
          </div>
        </section>

        {(today || month) && (
          <div className="mt-6 space-y-3">
            {today && (
              <details className="rounded-lg border border-rule bg-surface/50">
                <summary className="cursor-pointer list-none px-3 py-2 text-sm text-ink-2 hover:text-ink">
                  Last Day by hour — record
                </summary>
                <div className="border-t border-rule px-3 py-3">
                  <BucketTable view={today} />
                </div>
              </details>
            )}
            {month && (
              <details className="rounded-lg border border-rule bg-surface/50">
                <summary className="cursor-pointer list-none px-3 py-2 text-sm text-ink-2 hover:text-ink">
                  Last Month by day — record
                </summary>
                <div className="border-t border-rule px-3 py-3">
                  <BucketTable view={month} />
                </div>
              </details>
            )}
          </div>
        )}

        <Byline>im.ted1k · kv:ted1k-derive</Byline>
      </main>
    </div>
  );
}
