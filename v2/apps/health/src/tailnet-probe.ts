import type { TailnetFacts, TailnetPath, TailnetPeer } from "./types";

export interface LocalApi {
  request(path: string, init?: RequestInit): Promise<Response>;
}

interface PeerStatus {
  HostName: string;
  DNSName: string;
  TailscaleIPs: string[];
  Online: boolean;
  LastSeen: string;
}

interface TailnetStatus {
  Version: string;
  BackendState: string;
  Self: {
    HostName: string;
    DNSName: string;
    TailscaleIPs: string[];
  };
  Peer: Record<string, PeerStatus>;
}

interface PingResult {
  Err?: string;
  LatencySeconds: number;
  Endpoint?: string;
  PeerRelay?: string;
  DERPRegionCode?: string;
}

export function createTailnetProbe(options: {
  localApi: LocalApi;
  timeoutMs: number;
}): () => Promise<TailnetFacts> {
  return async () => {
    const response = await options.localApi.request("/localapi/v0/status", {
      signal: AbortSignal.timeout(options.timeoutMs),
    });
    if (!response.ok) throw new Error("Tailscale LocalAPI status failed");
    const status = (await response.json()) as TailnetStatus;
    if (status.BackendState !== "Running") {
      throw new Error(`Tailnet backend is ${status.BackendState}`);
    }

    const peers = await Promise.all(
      Object.values(status.Peer).map((peer) => selectPeer(peer, options)),
    );

    return {
      version: status.Version,
      backendState: status.BackendState,
      selfHostName: status.Self.HostName,
      selfDnsName: status.Self.DNSName,
      selfTailscaleIp: firstIp(status.Self.TailscaleIPs),
      peers,
    };
  };
}

async function selectPeer(
  peer: PeerStatus,
  options: { localApi: LocalApi; timeoutMs: number },
): Promise<TailnetPeer> {
  const tailscaleIp = firstIp(peer.TailscaleIPs);
  return {
    hostName: peer.HostName,
    dnsName: peer.DNSName,
    tailscaleIp,
    online: peer.Online,
    lastSeen: peer.LastSeen,
    path: peer.Online ? await pingPath(tailscaleIp, options) : null,
  };
}

async function pingPath(
  ip: string,
  options: { localApi: LocalApi; timeoutMs: number },
): Promise<TailnetPath> {
  try {
    const response = await options.localApi.request(
      `/localapi/v0/ping?ip=${encodeURIComponent(ip)}&type=disco`,
      { method: "POST", signal: AbortSignal.timeout(options.timeoutMs) },
    );
    if (!response.ok) return null;
    const ping = (await response.json()) as PingResult;
    if (ping.Err) return null;
    const latencyMs = ping.LatencySeconds * 1_000;
    if (ping.Endpoint) return { kind: "direct", latencyMs };
    if (ping.PeerRelay) return { kind: "peer-relay", latencyMs };
    if (ping.DERPRegionCode) {
      return { kind: "derp", region: ping.DERPRegionCode, latencyMs };
    }
    return null;
  } catch {
    return null;
  }
}

function firstIp(ips: string[]): string {
  return ips.find((candidate) => candidate.includes(".")) ?? ips[0] ?? "";
}
