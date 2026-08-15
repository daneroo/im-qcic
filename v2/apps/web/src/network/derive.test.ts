import { describe, expect, test } from "bun:test";
import type { TailnetPath, TailnetPeer } from "../health/types";
import { isRelayed, summariseProbes, summariseTailnet } from "./derive";
import type { HttpProbe } from "./types";

const peer = (path: TailnetPath): TailnetPeer => ({
  hostName: "peer",
  dnsName: "peer.tail.test.",
  tailscaleIp: "100.64.0.1",
  online: true,
  lastSeen: "0001-01-01T00:00:00Z",
  path,
});

describe("isRelayed", () => {
  test("distinguishes a DERP path from direct and unreachable paths", () => {
    expect(
      isRelayed(peer({ kind: "derp", region: "tor", latencyMs: 31 })),
    ).toBe(true);
    expect(isRelayed(peer({ kind: "direct", latencyMs: 2 }))).toBe(false);
    expect(isRelayed(peer(null))).toBe(false);
  });
});

describe("summariseTailnet", () => {
  test("rolls up reachability and path shape from peer readings", () => {
    const relayedPeer = {
      ...peer({ kind: "derp", region: "tor", latencyMs: 31 }),
      hostName: "relay",
    };
    const peers: TailnetPeer[] = [
      { ...peer({ kind: "direct", latencyMs: 2 }), hostName: "direct" },
      relayedPeer,
      { ...peer({ kind: "direct", latencyMs: 5 }), hostName: "slow" },
      {
        ...peer(null),
        hostName: "offline",
        online: false,
      },
    ];

    expect(summariseTailnet(peers)).toEqual({
      total: 4,
      online: 3,
      notOnline: 1,
      relayed: 1,
      direct: 2,
      unknownPath: 0,
      medianDelayMs: 5,
      worst: relayedPeer,
    });
  });

  test("has no latency claims when no online peer answered a ping", () => {
    const notOnline = { ...peer(null), online: false };

    expect(summariseTailnet([notOnline])).toEqual({
      total: 1,
      online: 0,
      notOnline: 1,
      relayed: 0,
      direct: 0,
      unknownPath: 0,
      medianDelayMs: null,
      worst: null,
    });
  });
});

describe("summariseProbes", () => {
  test("counts only 2xx answers as healthy and preserves failing readings", () => {
    const failed = { url: "https://failed.test", status: 503, ms: 40 };
    const silent = { url: "https://silent.test", status: null, ms: null };
    const probes: HttpProbe[] = [
      { url: "https://healthy.test", status: 204, ms: 12 },
      failed,
      silent,
    ];

    expect(summariseProbes(probes)).toEqual({
      ok: 1,
      total: 3,
      failing: [failed, silent],
    });
  });
});
