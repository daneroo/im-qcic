// web is fully static/client-rendered - there's no gitignored credentials
// file here (see v2/AGENTS.md's Credentials section for that convention on
// the server side). The NATS server address isn't a secret - it ships in
// the client bundle either way - so it's a plain build-time env var instead,
// defaulting to v2/infra/compose.yaml's local dev address.
export const NATS_WS_URL =
  import.meta.env.VITE_NATS_WS_URL || "ws://localhost:9222";

// Temporary exception to ADR-0004 for #267: the browser reads the NATS
// monitoring API until the network collector owns it. This address is public
// client configuration just like NATS_WS_URL.
export const NATS_MONITOR_URL =
  import.meta.env.VITE_NATS_MONITOR_URL || "http://localhost:8222";
