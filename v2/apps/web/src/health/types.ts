import type { ConnectionState } from "../components/marks";

export interface PublicHealth {
  schema: 1;
  observer: string;
  tailnet: { available: boolean; observedAt: string };
  nats: { available: boolean; observedAt: string };
}

export interface NatsHealth {
  schema: 1;
  observer: string;
  observedAt: string;
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

export interface TailnetHealth {
  schema: 1;
  observer: string;
  observedAt: string;
  version: string;
  backendState: string;
  selfHostName: string;
  selfDnsName: string;
  selfTailscaleIp: string;
  peers: TailnetPeer[];
}

export interface HealthReading<T> {
  status: "loading" | "live" | "unavailable";
  value: T | null;
  transportStatus: ConnectionState;
}

export interface HealthFeedState {
  publicReading: PublicHealth | null;
  nats: HealthReading<NatsHealth>;
  tailnet: HealthReading<TailnetHealth>;
}
