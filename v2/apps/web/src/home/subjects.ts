import type { ConnectionState } from "../components/marks";
import { formatCoverage } from "../format/coverage";
import { formatMissing, since } from "../format/duration";
import { localHM } from "../format/time";
import type { HealthFeedState } from "../health/types";
import { summariseProbes, summariseTailnet } from "../network/derive";
import { NETWORK_FIXTURE } from "../network/fixture";
import type { ScastFeedState } from "../scast/useScastFeed";
import type { Ted1kFeed } from "../ted1k/useTed1kFeed";

export type HomeLayer = "tailnet" | "nats" | "endpoints";
export type HomeSource = "live" | "fixture";
export type Verifiability = "available" | "unverifiable";

export interface HomeSubject {
  id: "tailnet" | "nats" | "ted1k" | "scast" | "endpoints" | "heartbeat";
  label: string;
  layer: HomeLayer;
  value: string;
  unit?: string;
  secondary: { label: string; value: string }[];
  byline: string;
  source: HomeSource;
  verifiability: Verifiability;
  age?: string;
  tone: "normal" | "alarm";
  status?: ConnectionState;
  to: "/network" | "/ted1k" | "/scast";
}

export interface HomeInputs {
  ted: Ted1kFeed;
  scast: ScastFeedState;
  health: HealthFeedState;
  now: Date;
}

function readingVerifiability(
  own: ConnectionState | "fixture",
  hasReading = true,
): Verifiability {
  if (own === "fixture") return "available";
  return own === "connected" && hasReading ? "available" : "unverifiable";
}

function withVerifiabilityTone(
  verifiability: Verifiability,
  anomaly: boolean,
): HomeSubject["tone"] {
  return verifiability !== "unverifiable" && anomaly ? "alarm" : "normal";
}

export function buildHomeSubjects({
  ted,
  scast,
  health,
  now,
}: HomeInputs): HomeSubject[] {
  const fixture = NETWORK_FIXTURE;
  const probes = summariseProbes(fixture.probes);
  const day = ted.lastDay.reading;
  const month = ted.weekByDay.reading;
  const latestGap = month?.significantGaps.at(-1) ?? null;
  const latestDivergence = scast.reading.latestDivergence;
  const latestScastStamp =
    scast.reading.latestSettled?.reports.reduce<Date | null>(
      (latest, report) =>
        !latest || report.stamp > latest ? report.stamp : latest,
      null,
    );

  const tedVerifiability = readingVerifiability(
    ted.lastDay.status,
    day !== null,
  );
  const scastVerifiability = readingVerifiability(
    scast.status,
    scast.reading.latestSettled !== null,
  );
  const endpointsVerifiability = readingVerifiability("fixture");
  const heartbeatVerifiability = readingVerifiability("fixture");

  return [
    {
      id: "ted1k",
      label: "ted1k",
      layer: "endpoints",
      value: day ? formatMissing(day.total.missing) : "—",
      unit: day
        ? `missing 24h · ${formatCoverage(day.total.missing, day.total.expected)} ok`
        : undefined,
      secondary: [
        {
          label: "month",
          value: month ? formatMissing(month.total.missing) : "—",
        },
        {
          label: "last significant gap",
          value: latestGap ? since(latestGap.start, now) : "none this month",
        },
      ],
      byline: "kv:im-ted1k-derive",
      source: "live",
      verifiability: tedVerifiability,
      age:
        tedVerifiability === "unverifiable" && day
          ? since(day.stamp, now)
          : undefined,
      tone: withVerifiabilityTone(
        tedVerifiability,
        Boolean(day?.significantGaps.length),
      ),
      status: ted.lastDay.status,
      to: "/ted1k",
    },
    {
      id: "scast",
      label: "scast",
      layer: "endpoints",
      value: scast.reading.latestSettled
        ? scast.reading.converged
          ? "converged"
          : "diverged"
        : "waiting",
      secondary: [
        {
          label: "longest divergence",
          value:
            scast.reading.longestDivergence === null
              ? "none"
              : `${scast.reading.longestDivergence} gen`,
        },
        {
          label: "latest divergence",
          value: latestDivergence
            ? `${localHM(latestDivergence.to)} · ${latestDivergence.generations} gen`
            : "none",
        },
      ],
      byline: "im.scast.scrape.digest",
      source: "live",
      verifiability: scastVerifiability,
      age:
        scastVerifiability === "unverifiable" && latestScastStamp
          ? since(latestScastStamp, now)
          : undefined,
      tone: withVerifiabilityTone(
        scastVerifiability,
        latestDivergence?.critical === true,
      ),
      status: scast.status,
      to: "/scast",
    },
    {
      id: "endpoints",
      label: "endpoints",
      layer: "endpoints",
      value: `${probes.ok}/${probes.total}`,
      unit: "answering",
      secondary: [
        {
          label: "slowest",
          value: `${Math.max(...fixture.probes.map((probe) => probe.ms ?? 0))} ms`,
        },
        { label: "failing", value: String(probes.failing.length) },
      ],
      byline: "curl",
      source: "fixture",
      verifiability: endpointsVerifiability,
      tone: "normal",
      to: "/network",
    },
    {
      id: "heartbeat",
      label: "heartbeat",
      layer: "endpoints",
      value: String(fixture.heartbeat.hosts),
      unit: "hosts broadcasting",
      secondary: [
        { label: "delay", value: `${fixture.heartbeat.delaySeconds}s` },
        { label: "last", value: fixture.heartbeat.lastHost },
      ],
      byline: "im.qcic.heartbeat",
      source: "fixture",
      verifiability: heartbeatVerifiability,
      tone: "normal",
      to: "/network",
    },
    {
      id: "nats",
      label: "nats",
      layer: "nats",
      value: health.nats.status === "live" ? "live" : "unknown",
      secondary: health.nats.value
        ? [
            {
              label: "connections",
              value: String(health.nats.value.connections),
            },
            {
              label: "subscriptions",
              value: String(health.nats.value.subscriptions),
            },
            {
              label: "messages",
              value: String(
                health.nats.value.inMessages + health.nats.value.outMessages,
              ),
            },
          ]
        : [],
      byline: "kv:im-qcic-health/nats",
      source: "live",
      verifiability:
        health.nats.status === "live" ? "available" : "unverifiable",
      age:
        health.nats.status === "unavailable" && health.nats.value
          ? since(new Date(health.nats.value.observedAt), now)
          : undefined,
      tone: "normal",
      status: health.nats.transportStatus,
      to: "/network",
    },
    {
      id: "tailnet",
      label: "tailnet",
      layer: "tailnet",
      value: health.tailnet.value
        ? `${summariseTailnet(health.tailnet.value.peers).online}/${health.tailnet.value.peers.length}`
        : "—",
      unit: "peers online",
      secondary: health.tailnet.value
        ? tailnetSecondary(health.tailnet.value.peers)
        : [],
      byline: "kv:im-qcic-health/tailnet",
      source: "live",
      verifiability:
        health.tailnet.status === "live" ? "available" : "unverifiable",
      age:
        health.tailnet.status === "unavailable" && health.tailnet.value
          ? since(new Date(health.tailnet.value.observedAt), now)
          : undefined,
      tone: "normal",
      status: health.tailnet.transportStatus,
      to: "/network",
    },
  ];
}

function tailnetSecondary(
  peers: NonNullable<HealthFeedState["tailnet"]["value"]>["peers"],
): HomeSubject["secondary"] {
  const summary = summariseTailnet(peers);
  return [
    { label: "direct", value: String(summary.direct) },
    { label: "relayed", value: String(summary.relayed) },
    { label: "not online", value: String(summary.notOnline) },
  ];
}
