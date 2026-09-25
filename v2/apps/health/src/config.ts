import type { LocalApiConfig } from "./local-api";

export interface Config {
  observer: string;
  port: number;
  publishIntervalMs: number;
  natsFreshnessMs: number;
  tailnetFreshnessMs: number;
  probeTimeoutMs: number;
  natsServers: string;
  natsMonitorUrl: string;
  tailscale: LocalApiConfig;
}

// HOSTALIAS is required: in a container the hostname is the container ID,
// never the observer name (#297).
export function readConfig(
  environment: Record<string, string | undefined> = process.env,
): Config {
  if (!environment.HOSTALIAS) {
    throw new Error("health: HOSTALIAS is required");
  }
  return {
    observer: environment.HOSTALIAS,
    port: positiveNumber(environment.PORT, 8000),
    publishIntervalMs: positiveNumber(environment.PUBLISH_INTERVAL_MS, 10_000),
    natsFreshnessMs: positiveNumber(environment.NATS_FRESHNESS_MS, 10_000),
    tailnetFreshnessMs: positiveNumber(
      environment.TAILNET_FRESHNESS_MS,
      30_000,
    ),
    probeTimeoutMs: positiveNumber(environment.PROBE_TIMEOUT_MS, 2_000),
    natsServers: environment.NATS_SERVERS || "localhost:4222",
    natsMonitorUrl: environment.NATS_MONITOR_URL || "http://localhost:8222",
    tailscale:
      environment.TAILSCALE_LOCALAPI_MODE === "macos"
        ? {
            kind: "macos",
            credentialPath:
              environment.TAILSCALE_CREDENTIAL_PATH ||
              "/run/secrets/tailscale-localapi.json",
            host: environment.TAILSCALE_LOCALAPI_HOST || "host.docker.internal",
          }
        : {
            kind: "unix",
            socketPath:
              environment.TAILSCALE_SOCKET_PATH ||
              "/run/tailscale/tailscaled.sock",
          },
  };
}

function positiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
