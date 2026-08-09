// PROTOTYPE — throwaway. See ../../README.md.
//
// STRATA: hierarchy as layers, read downward into the substrate.
//
// The verdict comes first, then the page descends through the things that
// verdict depends on, each layer sitting on a lower rung of the surface
// elevation ladder (paper -> sunken -> deep). Nothing here is a shadow or a
// card; depth is carried by the token ladder itself.
//
// The rule that makes it more than a layout: WHEN A LOWER STRATUM IS
// UNHEALTHY, THE STRATA ABOVE IT GO UNVERIFIABLE, NOT RED. If the bus is
// reconnecting, this page does not know the state of ted1k - it knows the last
// thing it was told, and when.
//
// SIGNAL IS ARRANGED SYMMETRICALLY, in two halves:
//
//   SNAPSHOT      Last Day and Last Month side by side, three readings each.
//   GAP ANALYSIS  Last Day by hour and Last Month by day - two identical
//                 blocks of [missing chart, power chart, collapsed table].
//
// The symmetry does structural work. Two identical blocks read as one pattern
// rather than as two things to parse, and that is what buys the extra level of
// nesting. The discipline is that neither block may acquire something the
// other lacks.

import {
  formatCoverage,
  formatKwhPerDay,
  formatMissing,
} from "../../derive/missing";
import { since, type TedcheckView } from "../../derive/tedcheck";
import { localHM, tzLabel, utcDate } from "../../derive/time";
import {
  Byline,
  CoverageStrip,
  Eyebrow,
  Figure,
  LivenessLabel,
  Masthead,
  Sparkline,
  type Liveness,
} from "../../ui/primitives";
import { BucketTable } from "./BucketTable";
import type { TedcheckFeed } from "./data";

function Stratum({
  index,
  name,
  role,
  tone,
  unverifiable,
  grow,
  children,
}: {
  index: number;
  name: string;
  role: string;
  tone: "paper" | "sunken" | "deep";
  unverifiable?: boolean;
  grow?: boolean;
  children: React.ReactNode;
}) {
  const bg =
    tone === "paper" ? "bg-paper" : tone === "sunken" ? "bg-sunken" : "bg-deep";

  return (
    <section className={`${bg} border-t border-rule ${grow ? "flex-1" : ""}`}>
      <div className="mx-auto flex max-w-5xl gap-5 px-5 py-8 sm:gap-8 sm:px-8">
        <div className="flex w-7 shrink-0 flex-col items-center gap-2 sm:w-9">
          <span className="qc-num text-[11px] font-medium tabular-nums text-ink-2">
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

        <div className={`min-w-0 flex-1 ${unverifiable ? "opacity-45" : ""}`}>
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
            <Eyebrow>{role}</Eyebrow>
            {unverifiable && (
              <span className="rounded-full border border-dashed border-partial px-2 py-0.5 text-[10px] text-partial">
                unverifiable — substrate down
              </span>
            )}
          </div>
          {children}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * SNAPSHOT — one half of the symmetrical top.
 *
 * The duration is the reading, and its qualifier stays on the SAME BASELINE.
 * Split across elements, a line reading "missing · 99.9%" on its own would
 * parse as "99.9% missing", which is the exact opposite of the truth; the
 * word `ok` settles it even out of context.
 * ------------------------------------------------------------------ */
function Snapshot({
  label,
  view,
  now,
  largest,
}: {
  label: string;
  view: TedcheckView | null;
  now: Date;
  /**
   * Month only. A month's total is usually dominated by a single bad day, and
   * a bare "1h04m missing" cannot tell that from being chronically flaky. An
   * earlier version showed the median ("typical 36s/day"), which answered the
   * question only if you knew what a median was and did the arithmetic. Naming
   * the largest gap answers it directly.
   */
  largest?: boolean;
}) {
  if (!view) {
    return (
      <div>
        <div className="mb-1 text-[11px] text-ink-3">{label}</div>
        <p className="text-sm text-ink-3">Waiting…</p>
      </div>
    );
  }

  return (
    <div>
      <Figure
        value={formatMissing(view.total.missing)}
        unit={`missing · ${formatCoverage(view.total.missing, view.total.expected)} ok`}
        label={label}
      />
      <p className="mt-3 text-xs text-ink-3">
        consumption{" "}
        <span className="qc-num text-ink-2">
          {formatKwhPerDay(view.meanWatt)} kWh/d
        </span>
        {largest && view.worst && (
          <>
            {" · largest gap "}
            <span className="qc-num text-ink-2">
              {formatMissing(view.worst.missing)}
            </span>{" "}
            on{" "}
            <span className="qc-num text-ink-2">
              {utcDate(view.worst.start)}
            </span>
          </>
        )}
      </p>
      {/* The pair is not equally fresh - Last Day has its own 60s query, Last
          Month is aggregated from a 10min one. Perfect symmetry would hide
          that, so it is stated. */}
      <p className="mt-1 text-[10px] text-ink-3">
        updated {since(view.stamp, now)}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * GAP ANALYSIS — the other half. Identical in both blocks.
 *
 * The two charts share an x-axis and are stacked so the time axes line up.
 * That alignment is the closest this page can get to "was that an outage or
 * the sensor?", since a gap beside an otherwise ordinary power trace reads
 * very differently from one in a disturbed stretch. Putting them behind the
 * disclosure would throw it away - and the charts ARE the summary; the table
 * is the record.
 * ------------------------------------------------------------------ */
function GapAnalysis({ view, now }: { view: TedcheckView; now: Date }) {
  const first = view.buckets[0];
  const last = view.buckets.at(-1);
  const axis = view.unit === "hour" ? localHM : utcDate;

  return (
    <section className="rounded-xl border border-rule bg-surface/40 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm text-ink">{view.label}</h3>
        <span className="text-[10px] text-ink-3">
          updated {since(view.stamp, now)}
        </span>
      </div>

      <CoverageStrip
        buckets={view.buckets}
        title={`missing by ${view.unit}`}
        height={48}
      />

      <div className="mt-5 text-accent">
        <Sparkline
          values={view.buckets.map((b) => b.watt)}
          label={<span className="text-ink-3">power, same window</span>}
        />
      </div>

      {/* One shared axis label for both charts - same window, same width. */}
      <div className="mt-1 flex justify-between text-[10px] text-ink-3">
        <span className="qc-num">{first && axis(first.start)}</span>
        <span className="qc-num">
          {view.unit === "hour" ? tzLabel() : "UTC"}
        </span>
        <span className="qc-num">{last && axis(last.start)}</span>
      </div>

      <details className="group mt-5 rounded-lg border border-rule bg-surface">
        <summary className="flex cursor-pointer list-none items-baseline justify-between gap-3 px-3 py-2 text-sm text-ink-2 hover:text-ink">
          <span>
            <span className="text-ink">Table of gaps</span>
            <span className="ml-2 text-xs text-ink-3">
              {view.significantGaps.length === 0
                ? "none significant"
                : `${view.significantGaps.length} significant`}
              {" · over "}
              {formatMissing(view.significantThreshold)}
            </span>
          </span>
          <span className="text-[11px] text-ink-3 group-open:hidden">
            show ▾
          </span>
          <span className="hidden text-[11px] text-ink-3 group-open:inline">
            hide ▴
          </span>
        </summary>
        <div className="border-t border-rule px-3 py-3">
          <BucketTable view={view} />
        </div>
      </details>
    </section>
  );
}

function CadenceRow({
  label,
  view,
  status,
  now,
}: {
  label: string;
  view: TedcheckView | null;
  status: Liveness;
  now: Date;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule/60 py-2 last:border-0">
      <span className="text-sm text-ink">{label}</span>
      <span className="flex items-center gap-4 text-[11px] text-ink-3">
        {view ? (
          <>
            <span className="qc-num">
              {view.buckets.length}{" "}
              {view.buckets.length === 1 ? "bucket" : "buckets"}
            </span>
            <span className="qc-num">updated {since(view.stamp, now)}</span>
          </>
        ) : (
          <span>waiting</span>
        )}
        <LivenessLabel status={status} />
      </span>
    </div>
  );
}

export function TedcheckStrata({ feed }: { feed: TedcheckFeed }) {
  const day = feed.lastDay.view;
  const today = feed.dayByHour.view;
  const month = feed.weekByDay.view;
  const now = day?.stamp ?? new Date();
  const unverifiable = feed.busStatus !== "connected";

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <Masthead running={<>ted1k &middot; continuity</>} />

      <Stratum
        index={1}
        name="signal"
        role="Where ted1k stands, and which periods lost time"
        tone="paper"
        unverifiable={unverifiable}
      >
        <div className="grid gap-8 sm:grid-cols-2">
          <Snapshot label="Last Day" view={day} now={now} />
          <Snapshot label="Last Month" view={month} now={now} largest />
        </div>

        <div className="mt-9 space-y-4 border-t border-rule pt-7">
          {today && <GapAnalysis view={today} now={now} />}
          {month && <GapAnalysis view={month} now={now} />}
        </div>

        <Byline>im.ted1k · kv:ted1k-derive</Byline>
      </Stratum>

      <Stratum
        index={2}
        name="producer"
        role="Who computed it, and how recently"
        tone="sunken"
        unverifiable={unverifiable}
      >
        <p className="mb-4 text-sm text-ink-2">
          <span className="font-medium text-ink">ted1k-derive</span>
          {feed.producer && (
            <>
              {" "}
              on <span className="qc-digest text-ink">{feed.producer}</span>
            </>
          )}{" "}
          polls MySQL and republishes three views, each on its own cadence — so
          they are never in step, and each carries its own timestamp.
        </p>
        <CadenceRow
          label="missingLastDay · every 60s"
          view={feed.lastDay.view}
          status={feed.lastDay.status}
          now={now}
        />
        <CadenceRow
          label="missingDayByHour · every 5min"
          view={feed.dayByHour.view}
          status={feed.dayByHour.status}
          now={now}
        />
        <CadenceRow
          label="missingWeekByDay · every 10min"
          view={feed.weekByDay.view}
          status={feed.weekByDay.status}
          now={now}
        />
      </Stratum>

      <Stratum
        index={3}
        name="substrate"
        role="The bus this page is reading over"
        tone="deep"
        grow
      >
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="text-sm text-ink">
              NATS — three independent KV watches over one websocket
            </p>
            <p className="mt-1 text-xs text-ink-3">
              Not an inference: this is the browser&rsquo;s own connection
              state. If it drops, nothing above can be vouched for.
            </p>
          </div>
          <LivenessLabel status={feed.busStatus} />
        </div>
      </Stratum>
    </div>
  );
}
