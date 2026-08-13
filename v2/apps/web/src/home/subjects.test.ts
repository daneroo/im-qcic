import { describe, expect, test } from "bun:test";
import type { BusReading } from "../network/direct-monitoring-source";
import { deriveScast } from "../scast/derive";
import type { DigestRecord } from "../scast/generation";
import type { ScastFeedState } from "../scast/useScastFeed";
import type { Ted1kReading } from "../ted1k/derive";
import type { Ted1kFeed } from "../ted1k/useTed1kFeed";
import { buildHomeSubjects } from "./subjects";

const NOW = new Date("2026-08-13T19:00:00Z");

function ted1kReading(): Ted1kReading {
  return {
    label: "Last Day",
    unit: "day",
    stamp: new Date("2026-08-13T18:59:00Z"),
    buckets: [],
    whole: [],
    worst: null,
    significantGaps: [],
    total: { expected: 86_400, missing: 49 },
    significantThreshold: 300,
    meanWatt: 500,
  };
}

function ted1kFeed(): Ted1kFeed {
  return {
    lastDay: { status: "connected", reading: ted1kReading() },
    dayByHour: { status: "connected", reading: null },
    weekByDay: { status: "connected", reading: null },
    busStatus: "connected",
    producer: "galois",
  };
}

function scastFeed(): ScastFeedState {
  const generation = new Date("2026-08-13T18:50:00Z");
  const records: DigestRecord[] = ["darwin", "d1-px1", "scast-hilbert"].map(
    (host) => ({
      generation,
      stamp: new Date(generation.getTime() + 60_000),
      host,
      digest: "8c8c0ae",
      elapsed: 6,
    }),
  );
  return { status: "connected", reading: deriveScast(records) };
}

const LIVE_BUS: BusReading = {
  status: "live",
  stats: {
    server: "nats",
    connections: 5,
    subscriptions: 12,
    msgsPerSecIn: 3,
    msgsPerSecOut: 4,
    slowConsumers: 0,
  },
};

describe("buildHomeSubjects", () => {
  test("returns every subject in the selected reading order with its own byline and no healthy alarms", () => {
    const subjects = buildHomeSubjects({
      ted: ted1kFeed(),
      scast: scastFeed(),
      bus: LIVE_BUS,
      now: NOW,
    });

    expect(subjects.map(({ id, layer }) => `${layer}:${id}`)).toEqual([
      "services:ted1k",
      "services:scast",
      "services:endpoints",
      "services:heartbeat",
      "bus:nats",
      "fabric:tailnet",
    ]);
    expect(subjects.every((subject) => subject.byline.length > 0)).toBe(true);
    expect(subjects.filter((subject) => subject.tone === "alarm")).toEqual([]);
  });

  test("propagates an unavailable bus upward as unverifiable without alarms", () => {
    const subjects = buildHomeSubjects({
      ted: ted1kFeed(),
      scast: scastFeed(),
      bus: { status: "unavailable", stats: null },
      now: NOW,
    });

    expect(
      subjects.find((subject) => subject.id === "tailnet")?.knowledge,
    ).toBe("fixture");
    expect(subjects.find((subject) => subject.id === "nats")?.knowledge).toBe(
      "unverifiable",
    );
    expect(
      subjects
        .filter((subject) => subject.layer === "services")
        .every((subject) => subject.knowledge === "unverifiable"),
    ).toBe(true);
    expect(subjects.filter((subject) => subject.tone === "alarm")).toEqual([]);
  });
});
