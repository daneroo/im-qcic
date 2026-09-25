import { describe, expect, test } from "bun:test";
import { readConfig } from "./config";

describe("health configuration", () => {
  test("uses bootstrap-safe defaults and HOSTALIAS as the observer", () => {
    expect(readConfig({ HOSTALIAS: "syno" })).toEqual({
      observer: "syno",
      port: 8000,
      publishIntervalMs: 10_000,
      natsFreshnessMs: 10_000,
      tailnetFreshnessMs: 30_000,
      probeTimeoutMs: 2_000,
      natsServers: "localhost:4222",
      natsMonitorUrl: "http://localhost:8222",
      tailscale: {
        kind: "unix",
        socketPath: "/run/tailscale/tailscaled.sock",
      },
    });
  });

  test("requires HOSTALIAS rather than falling back to the hostname", () => {
    expect(() => readConfig({})).toThrow("HOSTALIAS");
  });

  test("accepts cadence overrides", () => {
    const config = readConfig({
      HOSTALIAS: "syno",
      PORT: "9000",
      PUBLISH_INTERVAL_MS: "30000",
      NATS_FRESHNESS_MS: "12000",
      TAILNET_FRESHNESS_MS: "45000",
      PROBE_TIMEOUT_MS: "4500",
      NATS_SERVERS: "nats:4222",
      NATS_MONITOR_URL: "http://nats:8222/",
      TAILSCALE_SOCKET_PATH: "/var/packages/Tailscale/var/tailscaled.sock",
    });

    expect(config).toMatchObject({
      observer: "syno",
      port: 9000,
      publishIntervalMs: 30_000,
      natsFreshnessMs: 12_000,
      tailnetFreshnessMs: 45_000,
      probeTimeoutMs: 4_500,
      natsServers: "nats:4222",
      natsMonitorUrl: "http://nats:8222/",
      tailscale: {
        kind: "unix",
        socketPath: "/var/packages/Tailscale/var/tailscaled.sock",
      },
    });
  });

  test("selects the mounted macOS credential transport without embedding it in config", () => {
    const config = readConfig({
      HOSTALIAS: "galois",
      TAILSCALE_LOCALAPI_MODE: "macos",
      TAILSCALE_CREDENTIAL_PATH: "/secrets/tailscale.json",
      TAILSCALE_LOCALAPI_HOST: "docker-host",
    });

    expect(config.tailscale).toEqual({
      kind: "macos",
      credentialPath: "/secrets/tailscale.json",
      host: "docker-host",
    });
  });
});
