import { Byline, ConnectionLabel } from "../components/marks";
import { Stratum } from "../components/Stratum";
import type { ScastFeedState } from "./useScastFeed";
import {
  ConvergenceStrip,
  ConvergenceVerdict,
  CopyTable,
  GenerationRecord,
} from "./marks";

function Headline({ feed }: { feed: ScastFeedState }) {
  const { reading } = feed;
  const critical = reading.latestDivergence?.critical === true;
  const word = !reading.latestSettled
    ? "waiting"
    : reading.converged
      ? "converged"
      : "diverged";

  return (
    <div>
      <div className="flex items-baseline gap-3">
        <span
          className={`text-5xl leading-none font-light tracking-tight ${
            !reading.latestSettled
              ? "text-partial"
              : critical
                ? "text-alarm"
                : "text-ink"
          }`}
        >
          {word}
        </span>
        {reading.latestSettled?.agreement === "converged" && (
          <span className="qc-digest text-sm text-ink-3">
            {reading.latestSettled.reports[0]?.digest.slice(0, 7)}
          </span>
        )}
      </div>
      <p className="mt-3 max-w-prose text-sm text-ink-2">
        <ConvergenceVerdict reading={reading} />
      </p>
      {reading.longestDivergence !== null && (
        <p className="mt-2 text-xs text-ink-3">
          Longest divergence{" "}
          <span className="qc-num text-ink-2">{reading.longestDivergence}</span>
          {reading.longestDivergence === 1 ? " generation" : " generations"}
        </p>
      )}
    </div>
  );
}

export function ScastPage({ feed }: { feed: ScastFeedState }) {
  const unavailable = feed.status !== "connected";

  return (
    <main className="min-h-[calc(100vh-3rem)] bg-paper">
      <Stratum
        index={1}
        name="signal"
        role="Whether the copies hold the same history"
        tone="paper"
        health={unavailable ? "unverifiable" : "live"}
      >
        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:items-start">
          <Headline feed={feed} />
          <ConvergenceStrip generations={feed.reading.generations} />
        </div>
        <div className="mt-9 border-t border-rule pt-6">
          <GenerationRecord reading={feed.reading} />
        </div>
        <Byline>im.scast.scrape.digest</Byline>
      </Stratum>

      <Stratum
        index={2}
        name="copies"
        role="The copies that have to converge"
        tone="sunken"
        health={unavailable ? "unverifiable" : "live"}
      >
        <CopyTable reading={feed.reading} status={feed.status} />
      </Stratum>

      <Stratum
        index={3}
        name="substrate"
        role="The stream this page is reading over"
        tone="deep"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="text-sm text-ink">
            NATS JetStream — ordered consumer on{" "}
            <span className="qc-digest">scastDigest</span>, 24h replay
          </p>
          <ConnectionLabel status={feed.status} />
        </div>
      </Stratum>
    </main>
  );
}
