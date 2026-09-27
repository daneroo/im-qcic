// Where the browser finds NATS (websocket) and health's /healthz. Deployed,
// both are on the page's own origin: Caddy routes /nats and /healthz beside
// web (infra/qcic-core), so one build serves every name it is reached by.
// An override (VITE_* build-time env, see config.ts) wins - `bun dev` sets
// them in .env.development to reach v2/infra's published ports.

export interface PageLocation {
  protocol: string;
  host: string;
}

export interface EndpointOverrides {
  natsWsUrl?: string;
  healthHttpUrl?: string;
}

export interface Endpoints {
  natsWsUrl: string;
  healthHttpUrl: string;
}

// No location is the server render: nothing connects there (connections
// open in effects), so an empty URL is never used.
export function resolveEndpoints(
  location: PageLocation | undefined,
  overrides: EndpointOverrides,
): Endpoints {
  const ws = location?.protocol === "https:" ? "wss:" : "ws:";
  return {
    natsWsUrl:
      overrides.natsWsUrl || (location ? `${ws}//${location.host}/nats` : ""),
    healthHttpUrl:
      overrides.healthHttpUrl ||
      (location ? `${location.protocol}//${location.host}/healthz` : ""),
  };
}
