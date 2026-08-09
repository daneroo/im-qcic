// PROTOTYPE — throwaway. See ../../README.md.
//
// STRATA: hierarchy as layers, read downward into the substrate.
//
// The verdict comes first, then the page descends through the things that
// verdict depends on, each layer sitting on a lower rung of the surface
// elevation ladder (paper -> sunken -> deep). Nothing here is a shadow or a
// card; depth is carried by the token ladder itself, which is exactly what
// Catppuccin's crust/mantle/base sequence was built for.
//
// The rule that makes it more than a layout: WHEN A LOWER STRATUM IS
// UNHEALTHY, THE STRATA ABOVE IT GO UNVERIFIABLE, NOT RED. If the bus is
// reconnecting, this page genuinely does not know the state of ted1k - it only
// knows the last thing it was told, and when. Saying "3.09 nines" in that
// moment would be a claim the page cannot support. So it dims, marks itself
// stale, and says so. That is the entire "who watches the watchers" thesis
// compressed into one interaction.

import {
  formatAbsence,
  formatKwhPerDay,
  formatNines,
} from "../../derive/nines";
import { since, type TedcheckView } from "../../derive/tedcheck";
import { localHM, tzLabel, utcDate } from "../../derive/time";
import {
  Byline,
  CoverageStrip,
  Eyebrow,
  Masthead,
  LivenessLabel,
  NinesFigure,
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
  /** Bedrock fills whatever height is left — it goes down forever. */
  grow?: boolean;
  children: React.ReactNode;
}) {
  const bg =
    tone === "paper" ? "bg-paper" : tone === "sunken" ? "bg-sunken" : "bg-deep";

  return (
    <section className={`${bg} border-t border-rule ${grow ? "flex-1" : ""}`}>
      <div className="mx-auto flex max-w-5xl gap-5 px-5 py-8 sm:gap-8 sm:px-8">
        {/* Stratigraphic legend: depth index then layer name, set vertically in
            the margin the way a core-sample column is labelled — so the label
            sits beside the layer it names rather than floating above it. */}
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
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <Eyebrow>{role}</Eyebrow>
            {unverifiable && (
              <span className="rounded-full border border-dashed border-partial px-2 py-0.5 text-[10px] uppercase tracking-wider text-partial">
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

/** Disclosure around the full table — summary first, record on request. */
function Record({ label, view }: { label: string; view: TedcheckView }) {
  return (
    <details className="group rounded-lg border border-rule bg-surface/50 open:bg-surface">
      <summary className="flex cursor-pointer list-none items-baseline justify-between gap-3 px-3 py-2 text-sm text-ink-2 hover:text-ink">
        <span>
          <span className="text-ink">{label}</span>
          <span className="ml-2 text-xs text-ink-3">
            {view.excursions.length === 0
              ? "no excursions"
              : `${view.excursions.length} excursion${view.excursions.length === 1 ? "" : "s"}`}
          </span>
        </span>
        <span className="text-[11px] text-ink-3 group-open:hidden">
          show record ▾
        </span>
        <span className="hidden text-[11px] text-ink-3 group-open:inline">
          hide ▴
        </span>
      </summary>
      <div className="border-t border-rule px-3 py-3">
        <BucketTable view={view} />
      </div>
    </details>
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
  const headline = feed.lastDay.view;
  const today = feed.dayByHour.view;
  const month = feed.weekByDay.view;
  const now = headline?.stamp ?? new Date();
  const unverifiable = feed.busStatus !== "connected";

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <Masthead running={<>ted1k &middot; continuity</>} />

      {/* ---- 01 SIGNAL: the verdict, and the shape of today --------------- */}
      <Stratum
        index={1}
        name="signal"
        role="What ted1k has actually recorded"
        tone="paper"
        unverifiable={unverifiable}
      >
        {headline ? (
          <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:items-start">
            <div>
              {/* Continuity is the hero; consumption is context. This page is
                  about service quality - Grafana is where power actually gets
                  looked at, and the moment these two carry equal weight this
                  has quietly become a second energy dashboard. */}
              <NinesFigure value={headline.total.nines} label="Last Day" />
              <p className="mt-3 text-xs text-ink-2">
                {headline.total.missing === 0 ? (
                  <>Every second accounted for.</>
                ) : (
                  <>
                    <span className="qc-num font-medium text-ink">
                      {formatAbsence(headline.total.missing)}
                    </span>{" "}
                    unrecorded — a house never draws zero, so a gap means the
                    power was out.
                  </>
                )}
              </p>
              <p className="mt-2 text-xs text-ink-3">
                consumption{" "}
                <span className="qc-num text-ink-2">
                  {formatKwhPerDay(headline.meanWatt)} kWh/d
                </span>
              </p>

              {month && (
                <div className="mt-7 border-t border-rule pt-5">
                  <NinesFigure
                    value={month.total.nines}
                    size="sm"
                    label="Last Month"
                  />
                  <p className="mt-2 text-xs text-ink-3">
                    consumption{" "}
                    <span className="qc-num text-ink-2">
                      {formatKwhPerDay(month.meanWatt)} kWh/d
                    </span>
                  </p>
                  <p className="mt-2 text-xs text-ink-2">
                    {month.lastExcursion ? (
                      <>
                        <span className="qc-num text-ink">
                          {month.excursions.length}
                        </span>{" "}
                        excursion
                        {month.excursions.length === 1 ? "" : "s"} — last on{" "}
                        <span className="qc-num text-ink">
                          {utcDate(month.lastExcursion.start)}
                        </span>
                        ,{" "}
                        <span className="qc-num text-excursion">
                          {formatAbsence(month.lastExcursion.missing)}
                        </span>{" "}
                        absent ({formatNines(month.lastExcursion.nines)} nines).
                        Otherwise a typical{" "}
                        <span className="qc-num">
                          {formatAbsence(month.baseline)}
                        </span>{" "}
                        a day.
                      </>
                    ) : (
                      <>
                        No excursions in {month.whole.length} days — a typical{" "}
                        <span className="qc-num text-ink">
                          {formatAbsence(month.baseline)}
                        </span>{" "}
                        lost per day.
                      </>
                    )}
                  </p>
                </div>
              )}
            </div>

            <div>
              {today && (
                <>
                  <CoverageStrip
                    buckets={today.buckets}
                    title="absence by hour"
                    height={56}
                  />
                  <div className="mt-1 flex justify-between text-[10px] text-ink-3">
                    <span className="qc-num">
                      {today.buckets[0] && localHM(today.buckets[0].start)}
                    </span>
                    <span className="qc-num">{tzLabel()}</span>
                    <span className="qc-num">
                      {today.buckets.at(-1) &&
                        localHM(today.buckets.at(-1)!.start)}
                    </span>
                  </div>

                  {today.wattRange && (
                    <div className="mt-6 text-accent">
                      <Sparkline
                        values={today.buckets.map((b) => b.watt)}
                        label={
                          <span className="text-ink-3">power, same window</span>
                        }
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink-3">Waiting for the first value…</p>
        )}

        {/* The record is available, not the page. Summary above; the full
            table is one click away and opens to excursions only. */}
        <div className="mt-9 space-y-3 border-t border-rule pt-6">
          {today && <Record label="Last Day by hour" view={today} />}
          {month && <Record label="Last Month by day" view={month} />}
        </div>

        <Byline>im.ted1k · kv:ted1k-derive</Byline>
      </Stratum>

      {/* ---- 02 PRODUCER ------------------------------------------------- */}
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

      {/* ---- 03 SUBSTRATE: bedrock. Everything above rests on this. ------ */}
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
