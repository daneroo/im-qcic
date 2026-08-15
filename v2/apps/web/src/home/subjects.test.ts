import { describe, expect, test } from "bun:test";
import type { HealthFeedState } from "../health/types";
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
    natsStatus: "connected",
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

const LIVE_HEALTH: HealthFeedState = {
  publicReading: {
    schema: 1,
    observer: "syno",
    nats: { available: true, observedAt: "2026-08-13T18:59:00Z" },
    tailnet: { available: true, observedAt: "2026-08-13T18:59:00Z" },
  },
  nats: {
    status: "live",
    transportStatus: "connected",
    value: {
      schema: 1,
      observer: "syno",
      observedAt: "2026-08-13T18:59:00Z",
      serverName: "nats",
      version: "2.14.4",
      uptime: "1h",
      connections: 5,
      subscriptions: 12,
      inMessages: 3,
      outMessages: 4,
      slowConsumers: 0,
      jetstreamMemoryBytes: 0,
      jetstreamStorageBytes: 100,
    },
  },
  tailnet: {
    status: "live",
    transportStatus: "connected",
    value: {
      schema: 1,
      observer: "syno",
      observedAt: "2026-08-13T18:59:00Z",
      version: "1.102.1",
      backendState: "Running",
      selfHostName: "syno",
      selfDnsName: "syno.tail.test.",
      selfTailscaleIp: "100.64.0.1",
      peers: [
        {
          hostName: "galois",
          dnsName: "galois.tail.test.",
          tailscaleIp: "100.64.0.2",
          online: true,
          lastSeen: "0001-01-01T00:00:00Z",
          path: { kind: "direct", latencyMs: 2 },
        },
      ],
    },
  },
};

describe("buildHomeSubjects", () => {
  test("returns every subject in the selected reading order with its own byline and no healthy alarms", () => {
    const subjects = buildHomeSubjects({
      ted: ted1kFeed(),
      scast: scastFeed(),
      health: LIVE_HEALTH,
      now: NOW,
    });

    expect(subjects.map(({ id, layer }) => `${layer}:${id}`)).toEqual([
      "endpoints:ted1k",
      "endpoints:scast",
      "endpoints:endpoints",
      "endpoints:heartbeat",
      "nats:nats",
      "tailnet:tailnet",
    ]);
    expect(subjects.find(({ id }) => id === "scast")?.label).toBe("scast");
    expect(subjects.find(({ id }) => id === "ted1k")?.byline).toBe(
      "kv:im-ted1k-derive",
    );
    expect(subjects.every((subject) => subject.byline.length > 0)).toBe(true);
    expect(subjects.filter((subject) => subject.tone === "alarm")).toEqual([]);
  });

  test("keeps independent NATS failure scoped to NATS", () => {
    const subjects = buildHomeSubjects({
      ted: ted1kFeed(),
      scast: scastFeed(),
      health: {
        ...LIVE_HEALTH,
        nats: { ...LIVE_HEALTH.nats, status: "unavailable" },
      },
      now: NOW,
    });

    expect(subjects.find((subject) => subject.id === "tailnet")).toMatchObject({
      source: "live",
      verifiability: "available",
    });
    expect(subjects.find((subject) => subject.id === "nats")).toMatchObject({
      source: "live",
      verifiability: "unverifiable",
    });
    expect(
      subjects
        .filter((subject) => subject.layer === "endpoints")
        .every((subject) => subject.verifiability === "available"),
    ).toBe(true);
    expect(
      subjects
        .filter(({ id }) => id === "endpoints" || id === "heartbeat")
        .every(({ source }) => source === "fixture"),
    ).toBe(true);
    expect(subjects.filter((subject) => subject.tone === "alarm")).toEqual([]);
  });

  test("marks a disconnected live subject unverifiable with its retained age", () => {
    const ted = ted1kFeed();
    ted.lastDay.status = "closed";
    const subjects = buildHomeSubjects({
      ted,
      scast: scastFeed(),
      health: LIVE_HEALTH,
      now: NOW,
    });

    expect(subjects.find(({ id }) => id === "ted1k")).toMatchObject({
      source: "live",
      verifiability: "unverifiable",
      age: "just now",
      tone: "normal",
    });
    expect(subjects.find(({ id }) => id === "scast")?.verifiability).toBe(
      "available",
    );
  });
});
