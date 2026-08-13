import type { HttpProbe, Peer } from "./types";

/** Whether a peer's path is relayed rather than direct. */
export function isRelayed(peer: Peer): boolean {
  return peer.via?.startsWith("DERP") ?? false;
}

export interface FabricSummary {
  total: number;
  online: number;
  unreachable: number;
  relayed: number;
  direct: number;
  medianDelayMs: number | null;
  worst: Peer | null;
}

export function summariseFabric(peers: Peer[]): FabricSummary {
  const online = peers.filter((candidate) => candidate.online);
  const relayed = online.filter(isRelayed);
  const reachable = online
    .filter(
      (candidate): candidate is Peer & { delayMs: number } =>
        candidate.delayMs !== null,
    )
    .sort((left, right) => left.delayMs - right.delayMs);

  return {
    total: peers.length,
    online: online.length,
    unreachable: peers.length - online.length,
    relayed: relayed.length,
    direct: online.length - relayed.length,
    medianDelayMs: reachable[Math.floor(reachable.length / 2)]?.delayMs ?? null,
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
