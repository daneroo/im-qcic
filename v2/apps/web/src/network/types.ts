/** `tailscale status --json` → `.Peer[]`, plus `tailscale ping` details. */
export interface Peer {
  hostName: string;
  tailscaleIp: string;
  online: boolean;
  /** `DERP(tor)` for a relay or an `ip:port` for a direct path. */
  via: string | null;
  delayMs: number | null;
}

export interface Identity {
  hostnameShort: string;
  hostnameFqdn: string;
  lanIp: string;
  tailscaleIp: string;
  tailscaleHostname: string;
}

/** The bus reading a future network collector will publish. */
export interface BusStats {
  server: string;
  connections: number;
  subscriptions: number;
  msgsPerSecIn: number;
  msgsPerSecOut: number;
  slowConsumers: number;
}

export interface HttpProbe {
  url: string;
  status: number | null;
  ms: number | null;
}

export interface Heartbeat {
  hosts: number;
  delaySeconds: number;
  lastText: string;
  lastHost: string;
}

export interface NetworkFixture {
  identity: Identity;
  peers: Peer[];
  probes: HttpProbe[];
  heartbeat: Heartbeat;
}
