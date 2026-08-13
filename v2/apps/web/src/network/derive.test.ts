import { describe, expect, test } from "bun:test";
import { isRelayed, summariseFabric, summariseProbes } from "./derive";
import type { HttpProbe, Peer } from "./types";

const peer = (via: string | null): Peer => ({
  hostName: "peer",
  tailscaleIp: "100.64.0.1",
  online: true,
  via,
  delayMs: 5,
});

describe("isRelayed", () => {
  test("distinguishes a DERP path from direct and unreachable paths", () => {
    expect(isRelayed(peer("DERP(tor)"))).toBe(true);
    expect(isRelayed(peer("192.168.1.31:41641"))).toBe(false);
    expect(isRelayed(peer(null))).toBe(false);
  });
});

describe("summariseFabric", () => {
  test("rolls up reachability and path shape from peer readings", () => {
    const relayedPeer = {
      ...peer("DERP(tor)"),
      hostName: "relay",
      delayMs: 31,
    };
    const peers: Peer[] = [
      { ...peer("192.168.1.31:41641"), hostName: "direct", delayMs: 2 },
      relayedPeer,
      { ...peer("192.168.1.42:41641"), hostName: "slow", delayMs: 5 },
      {
        ...peer(null),
        hostName: "offline",
        online: false,
        delayMs: null,
      },
    ];

    expect(summariseFabric(peers)).toEqual({
      total: 4,
      online: 3,
      unreachable: 1,
      relayed: 1,
      direct: 2,
      medianDelayMs: 5,
      worst: relayedPeer,
    });
  });

  test("has no latency claims when no online peer answered a ping", () => {
    const unreachable = { ...peer(null), online: false, delayMs: null };

    expect(summariseFabric([unreachable])).toEqual({
      total: 1,
      online: 0,
      unreachable: 1,
      relayed: 0,
      direct: 0,
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
