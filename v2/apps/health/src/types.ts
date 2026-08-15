export interface PublicHealth {
  schema: 1;
  observer: string;
  tailnet: { available: boolean; observedAt: string };
  nats: { available: boolean; observedAt: string };
}

export interface NatsFacts {
  serverName: string;
  version: string;
  uptime: string;
  connections: number;
  subscriptions: number;
  inMessages: number;
  outMessages: number;
  slowConsumers: number;
  jetstreamMemoryBytes: number;
  jetstreamStorageBytes: number;
}

export interface NatsHealth extends NatsFacts {
  schema: 1;
  observer: string;
  observedAt: string;
}

export type TailnetPath =
  | { kind: "direct"; latencyMs: number }
  | { kind: "derp"; region: string; latencyMs: number }
  | { kind: "peer-relay"; latencyMs: number }
  | null;

export interface TailnetPeer {
  hostName: string;
  dnsName: string;
  tailscaleIp: string;
  online: boolean;
  lastSeen: string;
  path: TailnetPath;
}

export interface TailnetFacts {
  version: string;
  backendState: string;
  selfHostName: string;
  selfDnsName: string;
  selfTailscaleIp: string;
  peers: TailnetPeer[];
}

export interface TailnetHealth extends TailnetFacts {
  schema: 1;
  observer: string;
  observedAt: string;
}
