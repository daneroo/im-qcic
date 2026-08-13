import type { ConnectionState } from "../components/marks";
import { formatCoverage } from "../format/coverage";
import { formatMissing, since } from "../format/duration";
import { localHM } from "../format/time";
import { summariseFabric, summariseProbes } from "../network/derive";
import type { BusReading } from "../network/direct-monitoring-source";
import { NETWORK_FIXTURE } from "../network/fixture";
import type { ScastFeedState } from "../scast/useScastFeed";
import type { Ted1kFeed } from "../ted1k/useTed1kFeed";

export type HomeLayer = "fabric" | "bus" | "services";
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
  bus: BusReading;
  now: Date;
}

function serviceVerifiability(
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
  bus,
  now,
}: HomeInputs): HomeSubject[] {
  const fixture = NETWORK_FIXTURE;
  const fabric = summariseFabric(fixture.peers);
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

  const tedVerifiability = serviceVerifiability(
    ted.lastDay.status,
    day !== null,
  );
  const scastVerifiability = serviceVerifiability(
    scast.status,
    scast.reading.latestSettled !== null,
  );
  const endpointsVerifiability = serviceVerifiability("fixture");
  const heartbeatVerifiability = serviceVerifiability("fixture");

  return [
    {
      id: "ted1k",
      label: "ted1k",
      layer: "services",
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
      byline: "kv:ted1k-derive",
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
      layer: "services",
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
      layer: "services",
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
      layer: "services",
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
      layer: "bus",
      value: bus.status === "live" ? "live" : "unknown",
      secondary:
        bus.status === "live"
          ? [
              { label: "connections", value: String(bus.stats.connections) },
              {
                label: "subscriptions",
                value: String(bus.stats.subscriptions),
              },
              {
                label: "messages",
                value: `${Math.round(bus.stats.msgsPerSecIn + bus.stats.msgsPerSecOut)}/s`,
              },
            ]
          : [],
      byline: "/varz · /connz",
      source: "live",
      verifiability: bus.status === "live" ? "available" : "unverifiable",
      tone: "normal",
      to: "/network",
    },
    {
      id: "tailnet",
      label: "tailnet",
      layer: "fabric",
      value: `${fabric.online}/${fabric.total}`,
      unit: "peers reachable",
      secondary: [
        { label: "direct", value: String(fabric.direct) },
        { label: "relayed", value: String(fabric.relayed) },
        { label: "unreachable", value: String(fabric.unreachable) },
      ],
      byline: "tailscale status · tailscale ping",
      source: "fixture",
      verifiability: "available",
      tone: "normal",
      to: "/network",
    },
  ];
}
