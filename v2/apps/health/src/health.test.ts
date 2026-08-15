import { describe, expect, test } from "bun:test";
import { createHealthObserver } from "./health";
import type { NatsFacts, TailnetFacts } from "./types";

const NOW = new Date("2026-08-15T14:02:31Z");

const NATS: NatsFacts = {
  serverName: "nats-1",
  version: "2.14.4",
  uptime: "11m38s",
  connections: 5,
  subscriptions: 12,
  inMessages: 226,
  outMessages: 422,
  slowConsumers: 0,
  jetstreamMemoryBytes: 0,
  jetstreamStorageBytes: 3303,
};

const TAILNET: TailnetFacts = {
  version: "1.102.1",
  backendState: "Running",
  selfHostName: "galois",
  selfDnsName: "galois.tail.test.",
  selfTailscaleIp: "100.64.0.1",
  peers: [],
};

describe("health observer", () => {
  test("projects successful probes into the exact public contract and flat private values", async () => {
    const health = createHealthObserver({
      observer: "syno",
      natsFreshnessMs: 5_000,
      tailnetFreshnessMs: 5_000,
      now: () => NOW,
      probeNats: async () => NATS,
      probeTailnet: async () => TAILNET,
    });

    await expect(health.read()).resolves.toEqual({
      schema: 1,
      observer: "syno",
      tailnet: {
        available: true,
        observedAt: "2026-08-15T14:02:31.000Z",
      },
      nats: { available: true, observedAt: "2026-08-15T14:02:31.000Z" },
    });
    expect(health.latestNats()).toEqual({
      schema: 1,
      observer: "syno",
      observedAt: "2026-08-15T14:02:31.000Z",
      ...NATS,
    });
    expect(health.latestTailnet()).toEqual({
      schema: 1,
      observer: "syno",
      observedAt: "2026-08-15T14:02:31.000Z",
      ...TAILNET,
    });
  });

  test("returns the in-memory snapshot while it is sufficiently recent", async () => {
    let current = NOW;
    let natsCalls = 0;
    const health = createHealthObserver({
      observer: "syno",
      natsFreshnessMs: 5_000,
      tailnetFreshnessMs: 5_000,
      now: () => current,
      probeNats: async () => {
        natsCalls++;
        return NATS;
      },
      probeTailnet: async () => TAILNET,
    });

    await health.read();
    current = new Date(NOW.getTime() + 4_999);
    const cachedPublic = await health.read();

    expect(natsCalls).toBe(1);
    expect(cachedPublic.nats.observedAt).toBe("2026-08-15T14:02:31.000Z");
    expect(cachedPublic.tailnet.observedAt).toBe("2026-08-15T14:02:31.000Z");
    expect(health.latestNats()?.observedAt).toBe("2026-08-15T14:02:31.000Z");
  });

  test("coalesces concurrent callers behind one bounded probe", async () => {
    let releaseProbe: () => void = () => {};
    const probeGate = new Promise<void>((resolve) => {
      releaseProbe = resolve;
    });
    let natsCalls = 0;
    const health = createHealthObserver({
      observer: "syno",
      natsFreshnessMs: 5_000,
      tailnetFreshnessMs: 5_000,
      now: () => NOW,
      probeNats: async () => {
        natsCalls++;
        await probeGate;
        return NATS;
      },
      probeTailnet: async () => TAILNET,
    });

    const first = health.read();
    const second = health.read();
    await Promise.resolve();

    expect(natsCalls).toBe(1);
    releaseProbe();
    expect(await second).toEqual(await first);
  });

  test("retains last-known detail through failure and replaces it on recovery", async () => {
    let current = NOW;
    let natsAvailable = true;
    const health = createHealthObserver({
      observer: "syno",
      natsFreshnessMs: 5_000,
      tailnetFreshnessMs: 5_000,
      now: () => current,
      probeNats: async () => {
        if (!natsAvailable) throw new Error("monitoring unavailable");
        return NATS;
      },
      probeTailnet: async () => TAILNET,
    });

    await health.read();
    const liveNats = health.latestNats();
    natsAvailable = false;
    current = new Date(NOW.getTime() + 5_001);
    const failed = await health.read();

    expect(failed.nats.available).toBe(false);
    expect(failed.tailnet.available).toBe(true);
    expect(health.latestNats()).toBe(liveNats);
    expect(health.latestTailnet()?.observedAt).toBe("2026-08-15T14:02:36.001Z");

    natsAvailable = true;
    current = new Date(NOW.getTime() + 10_002);
    const recovered = await health.read();
    expect(recovered.nats.available).toBe(true);
    expect(health.latestNats()?.observedAt).toBe("2026-08-15T14:02:41.002Z");
  });
});
