// PROTOTYPE — throwaway. See ../README.md.
//
// FIXTURE DATA, AND THE RULES IT OBEYS.
//
// A browser cannot observe a tailnet, a `nats-top` connection table or an HTTP
// probe. Those signals exist in this repo only as shell output, so the hosts
// and network surface is drawn from fixtures - and fixtures are where a design
// prototype starts inventing a product nobody asked for. So:
//
//   1. Every field below appears in `scripts/bash/qcic-sh.sh` (or its zx twin)
//      as something that command actually prints. Nothing is added because it
//      would look good on a dashboard.
//   2. Every host name is a real one from CONTEXT-MAP.md's host roster or from
//      the live NATS data.
//   3. Nothing here implies a capability that does not exist: no alerting, no
//      remediation, no configuration, no users or roles, no deploy actions.
//      These are readings, and only readings.
//
// The values are plausible rather than recorded - that is the only liberty
// taken, and it is confined to the numbers, never to the shape.

/** `tailscale status --json` → .Peer[] , plus what `tailscale ping` adds. */
export interface Peer {
  hostName: string;
  tailscaleIp: string;
  online: boolean;
  /** `pong ... via DERP(tor)` vs `via 74.12.24.130:41641`. */
  via: string | null;
  /** Milliseconds, from the `in 25ms` tail of a tailscale ping. */
  delayMs: number | null;
}

/** Whether a peer's path is relayed. Direct is materially better than DERP. */
export function isRelayed(peer: Peer): boolean {
  return peer.via?.startsWith("DERP") ?? false;
}

export interface Identity {
  hostnameShort: string;
  hostnameFqdn: string;
  lanIp: string;
  tailscaleIp: string;
  tailscaleHostname: string;
}

/** `nats-top -o -` connection/subscription counts. */
export interface BusStats {
  server: string;
  connections: number;
  subscriptions: number;
  msgsPerSecIn: number;
  msgsPerSecOut: number;
  slowConsumers: number;
}

/** One `curl -s -o /dev/null -w '%{http_code}'` probe. */
export interface HttpProbe {
  url: string;
  status: number | null;
  ms: number | null;
}

/** `im.qcic.heartbeat` — hosts broadcasting per second, and the delay. */
export interface Heartbeat {
  hosts: number;
  delaySeconds: number;
  /** e.g. {"host":"capture.ted1k","text":"watts: 4810"} */
  lastText: string;
  lastHost: string;
}

export interface NetworkFixture {
  identity: Identity;
  peers: Peer[];
  bus: BusStats;
  probes: HttpProbe[];
  heartbeat: Heartbeat;
}

export const NETWORK_FIXTURE: NetworkFixture = {
  // `hostname -f` / `hostname -s` / `ipconfig getifaddr` / `tailscale ip --4`
  identity: {
    hostnameShort: "galois",
    hostnameFqdn: "galois.imetrical.com",
    lanIp: "192.168.1.24",
    tailscaleIp: "100.94.17.6",
    tailscaleHostname: "galois",
  },

  // Host roster from CONTEXT-MAP.md. `via` values follow the two real forms
  // tailscale ping prints: a direct ip:port, or DERP(<region>).
  peers: [
    {
      hostName: "hilbert",
      tailscaleIp: "100.72.4.19",
      online: true,
      via: "192.168.1.31:41641",
      delayMs: 2,
    },
    {
      hostName: "darwin",
      tailscaleIp: "100.101.55.3",
      online: true,
      via: "192.168.1.18:41641",
      delayMs: 3,
    },
    {
      hostName: "gauss",
      tailscaleIp: "100.88.201.44",
      online: true,
      via: "192.168.1.42:41641",
      delayMs: 2,
    },
    {
      hostName: "d1-px1",
      tailscaleIp: "100.119.8.72",
      online: true,
      via: "192.168.1.57:41641",
      delayMs: 4,
    },
    {
      hostName: "scast-hilbert",
      tailscaleIp: "100.65.31.90",
      online: true,
      via: "192.168.1.33:41641",
      delayMs: 3,
    },
    {
      hostName: "gateway",
      tailscaleIp: "100.77.12.5",
      online: true,
      via: "192.168.1.2:41641",
      delayMs: 1,
    },
    {
      hostName: "syno",
      tailscaleIp: "100.91.44.21",
      online: true,
      via: "192.168.1.10:41641",
      delayMs: 2,
    },
    // Offsite: reached over a relay, which is a qualitative difference, not
    // just a slower number.
    {
      hostName: "synk",
      tailscaleIp: "100.85.169.81",
      online: true,
      via: "DERP(tor)",
      delayMs: 27,
    },
    {
      hostName: "shannon",
      tailscaleIp: "100.100.25.28",
      online: true,
      via: "DERP(tor)",
      delayMs: 31,
    },
    {
      hostName: "davinci",
      tailscaleIp: "100.83.9.14",
      online: true,
      via: "192.168.1.61:41641",
      delayMs: 5,
    },
    {
      hostName: "dizzy",
      tailscaleIp: "100.70.55.8",
      online: true,
      via: "192.168.1.34:41641",
      delayMs: 4,
    },
    {
      hostName: "plex-audiobook",
      tailscaleIp: "100.68.2.77",
      online: true,
      via: "192.168.1.32:41641",
      delayMs: 3,
    },
    // Offline peers: `tailscale status` lists them, ping never runs.
    {
      hostName: "goedel",
      tailscaleIp: "100.75.140.2",
      online: false,
      via: null,
      delayMs: null,
    },
    {
      hostName: "fermat",
      tailscaleIp: "100.99.61.30",
      online: false,
      via: null,
      delayMs: null,
    },
    {
      hostName: "dirac",
      tailscaleIp: "100.86.7.51",
      online: false,
      via: null,
      delayMs: null,
    },
  ],

  bus: {
    server: "nats.ts.imetrical.com",
    connections: 14,
    subscriptions: 39,
    msgsPerSecIn: 12.4,
    msgsPerSecOut: 31.7,
    slowConsumers: 0,
  },

  // The exact probe list qcic-sh.sh builds: two status endpoints, plus
  // /api/status on each of Scrobblecast's three copies.
  probes: [
    { url: "https://status.dl.imetrical.com/", status: 200, ms: 84 },
    {
      url: "https://status.dl.imetrical.com/api/logcheck",
      status: 200,
      ms: 131,
    },
    { url: "http://d1-px1.imetrical.com:8000/api/status", status: 200, ms: 22 },
    { url: "http://darwin.imetrical.com:8000/api/status", status: 200, ms: 19 },
    {
      url: "http://scast-hilbert.imetrical.com:8000/api/status",
      status: 200,
      ms: 26,
    },
  ],

  heartbeat: {
    hosts: 12,
    delaySeconds: 0.4,
    lastText: "watts: 4810",
    lastHost: "capture.ted1k",
  },
};

/* ------------------------------------------------------------------ *
 * Derived roll-ups. Kept here so every variant states the same facts.
 * ------------------------------------------------------------------ */

export interface FabricSummary {
  total: number;
  online: number;
  offline: number;
  relayed: number;
  direct: number;
  /** Median delay across reachable peers, in ms. */
  medianDelayMs: number | null;
  worst: Peer | null;
}

export function summariseFabric(peers: Peer[]): FabricSummary {
  const online = peers.filter((p) => p.online);
  const reachable = online.filter((p) => p.delayMs !== null);
  const delays = reachable.map((p) => p.delayMs!).sort((a, b) => a - b);
  const relayed = online.filter(isRelayed);

  return {
    total: peers.length,
    online: online.length,
    offline: peers.length - online.length,
    relayed: relayed.length,
    direct: online.length - relayed.length,
    medianDelayMs: delays.length
      ? (delays[Math.floor(delays.length / 2)] ?? null)
      : null,
    worst: reachable.reduce<Peer | null>(
      (acc, p) => (acc === null || p.delayMs! > acc.delayMs! ? p : acc),
      null,
    ),
  };
}

export function summariseProbes(probes: HttpProbe[]): {
  ok: number;
  total: number;
  failing: HttpProbe[];
} {
  const failing = probes.filter(
    (p) => p.status === null || p.status < 200 || p.status > 299,
  );
  return { ok: probes.length - failing.length, total: probes.length, failing };
}
