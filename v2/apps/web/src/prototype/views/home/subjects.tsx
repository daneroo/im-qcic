// PROTOTYPE — throwaway. See ../../README.md.
//
// The QCIC overview's subject list, derived once so all three variants state
// the same facts and differ only in how they arrange them.
//
// Two sources, always distinguishable: `live` subjects are read from NATS in
// the browser right now; `fixture` subjects are shapes taken from
// scripts/bash/qcic-sh.sh, because a browser cannot observe a tailnet or run
// an HTTP probe. Nothing here blends the two silently — a fixture subject
// carries the marker wherever it is rendered.

import { formatCoverage, formatMissing } from "../../derive/missing";
import { since } from "../../derive/tedcheck";
import {
  NETWORK_FIXTURE,
  summariseFabric,
  summariseProbes,
} from "../../fixtures/network";
import type { Liveness } from "../../ui/primitives";
import type { ScastFeed } from "../scast/data";
import { genLabel } from "../scast/shared";
import type { TedcheckFeed } from "../tedcheck/data";

/** Dependency rung. Ordering by this is the only ordering the page uses. */
export type Layer = "fabric" | "bus" | "services";

export interface Subject {
  id: string;
  label: string;
  qualifier: string;
  layer: Layer;
  source: "live" | "fixture";
  /** The headline reading. */
  value: string;
  unit?: string;
  secondary: { label: string; value: string }[];
  byline: string;
  /** Something is currently wrong with this subject. */
  bad: boolean;
  status?: Liveness;
  /** Route to the subject's own page, when it has one. */
  to?: "/tedcheck" | "/scast" | "/prototype/network";
}

const F = NETWORK_FIXTURE;

export function buildSubjects(ted: TedcheckFeed, scast: ScastFeed): Subject[] {
  const day = ted.lastDay.view;
  const month = ted.weekByDay.view;
  const now = day?.stamp ?? new Date();
  const fabric = summariseFabric(F.peers);
  const probes = summariseProbes(F.probes);
  const lastSplit = scast.state.lastDivergence;

  return [
    {
      id: "ted1k",
      label: "ted1k",
      qualifier: "continuity · 1 Hz since 2007",
      layer: "services",
      source: "live",
      // The hero is the DAY, and it names its own window - the secondaries
      // carry a month figure beside it, so an unlabelled hero would invite
      // exactly the wrong reading. An earlier version repeated the day's
      // duration as a secondary, which spent a row saying the same thing
      // twice; the month is the reading that was actually missing.
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
          // Significant gaps over the month window - see the glossary.
          label: "last big gap",
          value: month?.lastSignificantGap
            ? since(month.lastSignificantGap.start, now)
            : "none this month",
        },
      ],
      byline: "kv:ted1k-derive",
      bad: false,
      status: ted.lastDay.status,
      to: "/tedcheck",
    },
    {
      id: "scast",
      label: "scrobblecast",
      qualifier: `agreement · ${scast.state.hosts.length} copies`,
      layer: "services",
      source: "live",
      value: scast.state.latestSettled
        ? scast.state.agreed
          ? "agreed"
          : "split"
        : "waiting",
      secondary: [
        {
          label: "longest split",
          value: scast.state.longestSplit
            ? `${scast.state.longestSplit} gen`
            : "none",
        },
        {
          label: "last split",
          value: lastSplit
            ? `${genLabel(lastSplit.to)} · ${lastSplit.generations} gen`
            : "none",
        },
      ],
      byline: "im.scast.scrape.digest",
      bad: Boolean(scast.state.latestSettled) && !scast.state.agreed,
      status: scast.status,
      to: "/scast",
    },
    {
      id: "endpoints",
      label: "endpoints",
      qualifier: "http probes",
      layer: "services",
      source: "fixture",
      value: `${probes.ok}/${probes.total}`,
      unit: "answering",
      secondary: [
        {
          label: "slowest",
          value: `${Math.max(...F.probes.map((p) => p.ms ?? 0))} ms`,
        },
        { label: "failing", value: String(probes.failing.length) },
      ],
      byline: "curl",
      bad: probes.failing.length > 0,
      to: "/prototype/network",
    },
    {
      id: "heartbeat",
      label: "heartbeat",
      qualifier: "hosts broadcasting",
      layer: "services",
      source: "fixture",
      value: String(F.heartbeat.hosts),
      unit: "hosts",
      secondary: [
        { label: "delay", value: `${F.heartbeat.delaySeconds}s` },
        { label: "last", value: F.heartbeat.lastHost },
      ],
      byline: "im.qcic.heartbeat",
      bad: false,
      to: "/prototype/network",
    },
    {
      id: "nats",
      label: "nats",
      qualifier: "the bus everything rides",
      layer: "bus",
      source: "live",
      value: ted.busStatus === "connected" ? "live" : ted.busStatus,
      secondary: [
        { label: "watches", value: "4" },
        { label: "conns", value: `${F.bus.connections} (fixture)` },
        { label: "subs", value: `${F.bus.subscriptions} (fixture)` },
      ],
      byline: "nats websocket",
      bad: ted.busStatus !== "connected",
      status: ted.busStatus,
      to: "/prototype/network",
    },
    {
      id: "tailnet",
      label: "tailnet",
      qualifier: "the fabric underneath",
      layer: "fabric",
      source: "fixture",
      value: `${fabric.online}/${fabric.total}`,
      unit: "peers online",
      secondary: [
        { label: "direct", value: String(fabric.direct) },
        { label: "relayed", value: String(fabric.relayed) },
        { label: "offline", value: String(fabric.offline) },
        { label: "median", value: `${fabric.medianDelayMs} ms` },
      ],
      byline: "tailscale",
      // NOT bad. Several peers in the roster are retired or normally powered
      // down (goedel, fermat, dirac) - a tailnet lists them whether or not
      // anyone expects them up. Colouring "3 offline" as an anomaly is the
      // same mistake as painting ted1k's ordinary 36s-a-day loss red: it
      // spends the alarm colour on the resting state. What would deserve it
      // is a peer that *was* reachable and stopped, which needs history this
      // page does not have.
      bad: false,
      to: "/prototype/network",
    },
  ];
}

export const LAYER_TITLE: Record<Layer, string> = {
  services: "Services — the things that do the work",
  bus: "Bus — how state gets anywhere",
  fabric: "Fabric — what everything else travels over",
};
