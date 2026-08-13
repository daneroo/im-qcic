import { useEffect, useState, type ReactNode } from "react";
import {
  Byline,
  ConnectionLabel,
  type ConnectionState,
} from "../components/marks";
import { Stratum } from "../components/Stratum";
import { formatCoverage } from "../format/coverage";
import { formatMissing, since } from "../format/duration";
import { localHM, tzLabel, utcDate } from "../format/time";
import { BucketTable } from "./BucketTable";
import type { Ted1kReading } from "./derive";
import { ConsumptionStrip, CoverageStrip, Reading } from "./marks";
import { useTed1kFeed, type Ted1kFeed } from "./useTed1kFeed";

function Snapshot({
  label,
  reading,
  now,
  largest,
}: {
  label: string;
  reading: Ted1kReading | null;
  now: Date;
  largest?: boolean;
}) {
  if (!reading) {
    return (
      <div>
        <div className="mb-1 text-[11px] text-ink-3">{label}</div>
        <p className="text-sm text-ink-3">Waiting…</p>
      </div>
    );
  }
  const kwh =
    reading.meanWatt === null
      ? "—"
      : ((reading.meanWatt * 24) / 1_000).toFixed(1);
  return (
    <div>
      <Reading
        value={formatMissing(reading.total.missing)}
        unit={`missing · ${formatCoverage(reading.total.missing, reading.total.expected)} ok`}
        label={label}
      />
      <p className="mt-3 text-xs text-ink-3">
        consumption <span className="qc-num text-ink-2">{kwh} kWh/d</span>
        {largest && reading.worst && (
          <>
            {" · largest gap "}
            <span className="qc-num text-ink-2">
              {formatMissing(reading.worst.missing)}
            </span>{" "}
            on{" "}
            <span className="qc-num text-ink-2">
              {utcDate(reading.worst.start)}
            </span>
          </>
        )}
      </p>
      <p className="mt-1 text-[10px] text-ink-3">
        updated {since(reading.stamp, now)}
      </p>
    </div>
  );
}

function GapAnalysis({ reading, now }: { reading: Ted1kReading; now: Date }) {
  const first = reading.buckets[0];
  const last = reading.buckets.at(-1);
  const axis = reading.unit === "hour" ? localHM : utcDate;
  return (
    <section className="rounded-xl border border-rule bg-surface/40 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm text-ink">{reading.label}</h3>
        <span className="text-[10px] text-ink-3">
          updated {since(reading.stamp, now)}
        </span>
      </div>
      <CoverageStrip buckets={reading.buckets} />
      <div className="mt-5">
        <ConsumptionStrip buckets={reading.buckets} />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-ink-3">
        <span className="qc-num">{first && axis(first.start)}</span>
        <span className="qc-num">
          {reading.unit === "hour" ? tzLabel() : "UTC"}
        </span>
        <span className="qc-num">{last && axis(last.start)}</span>
      </div>
      <details className="group mt-5 rounded-lg border border-rule bg-surface">
        <summary className="flex cursor-pointer list-none items-baseline justify-between gap-3 px-3 py-2 text-sm text-ink-2 hover:text-ink">
          <span>
            <span className="text-ink">Table of gaps</span>
            <span className="ml-2 text-xs text-ink-3">
              {reading.significantGaps.length === 0
                ? "none significant"
                : `${reading.significantGaps.length} significant`}{" "}
              · over {formatMissing(reading.significantThreshold)}
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
          <BucketTable reading={reading} />
        </div>
      </details>
    </section>
  );
}

function FlowLink({
  fact,
  unavailable,
}: {
  fact: ReactNode;
  unavailable?: boolean;
}) {
  return (
    <div
      className={`relative h-[3.25rem] min-w-[6rem] flex-1 ${unavailable ? "opacity-35" : ""}`}
    >
      <span className="absolute inset-x-1 top-0 text-center text-[10px] leading-4 text-ink-2">
        {fact}
      </span>
      <span
        className="absolute inset-x-0 top-9 h-px bg-rule-strong"
        aria-hidden="true"
      >
        <span className="absolute top-1/2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-rule-strong" />
      </span>
    </div>
  );
}

function FlowNode({ children }: { children: ReactNode }) {
  return (
    <span className="mt-5 flex h-8 shrink-0 items-center rounded-md border border-rule-strong bg-surface px-3 text-[13px] font-medium text-ink">
      {children}
    </span>
  );
}

function Flow({ feed, now }: { feed: Ted1kFeed; now: Date }) {
  const day = feed.lastDay.reading;
  const unavailable = feed.busStatus !== "connected";
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-[48rem] items-start gap-0">
        <FlowNode>ted</FlowNode>
        <FlowLink
          unavailable={unavailable}
          fact={
            day
              ? `${formatMissing(day.total.missing)} missing / 24h`
              : "1 Hz · waiting"
          }
        />
        <FlowNode>mysql</FlowNode>
        <FlowLink unavailable={unavailable} fact="60s · 5m · 10m polls" />
        <FlowNode>derive</FlowNode>
        <FlowLink
          unavailable={unavailable}
          fact={day ? `published ${since(day.stamp, now)}` : "publish waiting"}
        />
        <FlowNode>kv</FlowNode>
        <FlowLink
          fact={
            feed.busStatus === "connected"
              ? "3 websockets live"
              : feed.busStatus
          }
        />
        <FlowNode>browser</FlowNode>
      </div>
    </div>
  );
}

function CadenceRow({
  label,
  reading,
  status,
  now,
}: {
  label: string;
  reading: Ted1kReading | null;
  status: ConnectionState;
  now: Date;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule/60 py-2 last:border-0">
      <span className="text-sm text-ink">{label}</span>
      <span className="flex items-center gap-4 text-[11px] text-ink-3">
        <span className="qc-num">
          {reading
            ? `${reading.buckets.length} buckets · ${since(reading.stamp, now)}`
            : "waiting"}
        </span>
        <ConnectionLabel status={status} />
      </span>
    </div>
  );
}

export function Ted1kPage() {
  const feed = useTed1kFeed();
  const day = feed.lastDay.reading;
  const today = feed.dayByHour.reading;
  const month = feed.weekByDay.reading;
  const now = useCurrentTime();
  const unverifiable = feed.busStatus !== "connected";

  return (
    <main className="min-h-screen bg-paper">
      <Stratum
        index={1}
        name="signal"
        role="Where ted1k stands, and which periods lost time"
        tone="paper"
        health={unverifiable ? "unverifiable" : "live"}
      >
        <div className="grid gap-8 sm:grid-cols-2">
          <Snapshot label="Last Day" reading={day} now={now} />
          <Snapshot label="Last Month" reading={month} now={now} largest />
        </div>
        <div className="mt-9 space-y-4 border-t border-rule pt-7">
          {today && <GapAnalysis reading={today} now={now} />}
          {month && <GapAnalysis reading={month} now={now} />}
        </div>
        <Byline>im.ted1k · kv:ted1k-derive</Byline>
      </Stratum>

      <Stratum
        index={2}
        name="flow"
        role="The path a watt-second takes to reach this page"
        tone="sunken"
      >
        <Flow feed={feed} now={now} />
      </Stratum>

      <Stratum
        index={3}
        name="producer"
        role="Who computed each reading, and how recently"
        tone="sunken"
        health={unverifiable ? "unverifiable" : "live"}
      >
        <p className="mb-4 text-sm text-ink-2">
          <span className="font-medium text-ink">ted1k-derive</span>
          {feed.producer && (
            <>
              {" "}
              on <span className="qc-digest text-ink">{feed.producer}</span>
            </>
          )}{" "}
          polls MySQL and republishes three independently stamped views.
        </p>
        <CadenceRow
          label="missingLastDay · every 60s"
          reading={day}
          status={feed.lastDay.status}
          now={now}
        />
        <CadenceRow
          label="missingDayByHour · every 5min"
          reading={today}
          status={feed.dayByHour.status}
          now={now}
        />
        <CadenceRow
          label="missingWeekByDay · every 10min"
          reading={month}
          status={feed.weekByDay.status}
          now={now}
        />
      </Stratum>

      <Stratum
        index={4}
        name="substrate"
        role="The bus this page is reading over"
        tone="deep"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="text-sm text-ink">
              NATS — three KV watches over three WebSocket connections
            </p>
            <p className="mt-1 text-xs text-ink-3">
              This is the browser&rsquo;s own connection state. If it drops, the
              readings above become unverifiable.
            </p>
          </div>
          <ConnectionLabel status={feed.busStatus} />
        </div>
      </Stratum>
    </main>
  );
}

function useCurrentTime(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  return now;
}
