// web is fully static/client-rendered - there's no gitignored credentials
// file here (see v2/AGENTS.md's Credentials section for that convention on
// the server side). The NATS and health addresses aren't secrets - they ship
// in the client bundle either way. Deployed, both default to the page's own
// origin (see endpoints.ts); `bun dev` overrides them with build-time env
// vars from .env.development.
import { resolveEndpoints } from "./endpoints";

const endpoints = resolveEndpoints(globalThis.location, {
  natsWsUrl: import.meta.env.VITE_NATS_WS_URL,
  healthHttpUrl: import.meta.env.VITE_HEALTH_HTTP_URL,
});

export const NATS_WS_URL = endpoints.natsWsUrl;

// Public coarse bootstrap. Detailed readings and subsequent coarse readings
// arrive over NATS; the static browser never reaches monitoring/LocalAPI.
export const HEALTH_HTTP_URL = endpoints.healthHttpUrl;
