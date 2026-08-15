import type { NatsFacts } from "./types";

interface Varz {
  server_id: string;
  server_name?: string;
  version: string;
  uptime: string;
  subscriptions: number;
  in_msgs: number;
  out_msgs: number;
  slow_consumers: number;
  jetstream?: { stats?: { memory?: number; storage?: number } };
}

interface Connz {
  num_connections: number;
}

type Fetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export function createNatsProbe(options: {
  baseUrl: string;
  timeoutMs: number;
  fetch?: Fetch;
}): () => Promise<NatsFacts> {
  const request = options.fetch ?? globalThis.fetch;
  const baseUrl = options.baseUrl.replace(/\/$/, "");

  return async () => {
    const signal = AbortSignal.timeout(options.timeoutMs);
    const [varzResponse, connzResponse] = await Promise.all([
      request(`${baseUrl}/varz`, { signal }),
      request(`${baseUrl}/connz?subs=0`, { signal }),
    ]);
    if (!varzResponse.ok || !connzResponse.ok) {
      throw new Error("NATS monitoring request failed");
    }

    const [varz, connz] = (await Promise.all([
      varzResponse.json(),
      connzResponse.json(),
    ])) as [Varz, Connz];

    return {
      serverName:
        varz.server_name && varz.server_name !== varz.server_id
          ? varz.server_name
          : shortenServerId(varz.server_id),
      version: varz.version,
      uptime: varz.uptime,
      connections: connz.num_connections,
      subscriptions: varz.subscriptions,
      inMessages: varz.in_msgs,
      outMessages: varz.out_msgs,
      slowConsumers: varz.slow_consumers,
      jetstreamMemoryBytes: varz.jetstream?.stats?.memory ?? 0,
      jetstreamStorageBytes: varz.jetstream?.stats?.storage ?? 0,
    };
  };
}

function shortenServerId(serverId: string): string {
  return serverId.length > 13
    ? `${serverId.slice(0, 8)}…${serverId.slice(-4)}`
    : serverId;
}
