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
export type Knowledge = "live" | "fixture" | "unverifiable";

export interface HomeSubject {
  id: "tailnet" | "nats" | "ted1k" | "scast" | "endpoints" | "heartbeat";
  label: string;
  layer: HomeLayer;
  value: string;
  unit?: string;
  secondary: { label: string; value: string }[];
  byline: string;
  knowledge: Knowledge;
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

function serviceKnowledge(
  bus: BusReading,
  own: ConnectionState | "fixture",
  hasReading = true,
): Knowledge {
  if (bus.status !== "live") return "unverifiable";
  if (own === "fixture") return "fixture";
  return own === "connected" && hasReading ? "live" : "unverifiable";
}

function withKnowledgeTone(
  knowledge: Knowledge,
  anomaly: boolean,
): HomeSubject["tone"] {
  return knowledge !== "unverifiable" && anomaly ? "alarm" : "normal";
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

  const tedKnowledge = serviceKnowledge(bus, ted.lastDay.status, day !== null);
  const scastKnowledge = serviceKnowledge(
    bus,
    scast.status,
    scast.reading.latestSettled !== null,
  );
  const endpointsKnowledge = serviceKnowledge(bus, "fixture");
  const heartbeatKnowledge = serviceKnowledge(bus, "fixture");

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
      knowledge: tedKnowledge,
      tone: withKnowledgeTone(
        tedKnowledge,
        Boolean(day?.significantGaps.length),
      ),
      status: ted.lastDay.status,
      to: "/ted1k",
    },
    {
      id: "scast",
      label: "scrobblecast",
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
      knowledge: scastKnowledge,
      tone: withKnowledgeTone(
        scastKnowledge,
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
      knowledge: endpointsKnowledge,
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
      knowledge: heartbeatKnowledge,
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
      knowledge: bus.status === "live" ? "live" : "unverifiable",
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
      knowledge: "fixture",
      tone: "normal",
      to: "/network",
    },
  ];
}
