// Not secrets - they ship in the client bundle. See endpoints.ts.
import { resolveEndpoints } from "./endpoints";

const endpoints = resolveEndpoints(globalThis.location, {
  natsWsUrl: import.meta.env.VITE_NATS_WS_URL,
  healthHttpUrl: import.meta.env.VITE_HEALTH_HTTP_URL,
});

export const NATS_WS_URL = endpoints.natsWsUrl;

// Public coarse bootstrap. Detailed readings and subsequent coarse readings
// arrive over NATS; the static browser never reaches monitoring/LocalAPI.
export const HEALTH_HTTP_URL = endpoints.healthHttpUrl;
