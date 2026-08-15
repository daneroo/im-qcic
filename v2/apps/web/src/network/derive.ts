import type { TailnetPeer } from "../health/types";
import type { HttpProbe } from "./types";

/** Whether a peer's path is relayed rather than direct. */
export function isRelayed(peer: TailnetPeer): boolean {
  return peer.path?.kind === "derp" || peer.path?.kind === "peer-relay";
}

export interface TailnetSummary {
  total: number;
  online: number;
  notOnline: number;
  relayed: number;
  direct: number;
  unknownPath: number;
  medianDelayMs: number | null;
  worst: TailnetPeer | null;
}

export function summariseTailnet(peers: TailnetPeer[]): TailnetSummary {
  const online = peers.filter((candidate) => candidate.online);
  const relayed = online.filter(isRelayed);
  const direct = online.filter((peer) => peer.path?.kind === "direct");
  const reachable = online
    .filter(
      (
        candidate,
      ): candidate is TailnetPeer & {
        path: Exclude<TailnetPeer["path"], null>;
      } => candidate.path !== null,
    )
    .sort((left, right) => left.path.latencyMs - right.path.latencyMs);

  return {
    total: peers.length,
    online: online.length,
    notOnline: peers.length - online.length,
    relayed: relayed.length,
    direct: direct.length,
    unknownPath: online.length - relayed.length - direct.length,
    medianDelayMs:
      reachable[Math.floor(reachable.length / 2)]?.path.latencyMs ?? null,
    worst: reachable.at(-1) ?? null,
  };
}

export interface ProbeSummary {
  ok: number;
  total: number;
  failing: HttpProbe[];
}

export function summariseProbes(probes: HttpProbe[]): ProbeSummary {
  const failing = probes.filter(
    (probe) =>
      probe.status === null || probe.status < 200 || probe.status > 299,
  );

  return {
    ok: probes.length - failing.length,
    total: probes.length,
    failing,
  };
}
