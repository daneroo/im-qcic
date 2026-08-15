import { describe, expect, test } from "bun:test";
import { createApp } from "./app";
import type { HealthObserver } from "./health";
import {
  HEALTH_KV_BUCKET,
  HEALTH_KV_KEYS,
  PUBLIC_HEALTH_REQUEST_SUBJECT,
  PUBLIC_HEALTH_QUEUE_GROUP,
  PUBLIC_HEALTH_RETENTION_MS,
  PUBLIC_HEALTH_STREAM_CONFIG,
  PUBLIC_HEALTH_STREAM_SUBJECT,
  encodeCurrentHealth,
  publishCurrentHealth,
  type HealthPublisher,
} from "./publish";
import type { NatsHealth, PublicHealth, TailnetHealth } from "./types";

const publicReading: PublicHealth = {
  schema: 1,
  observer: "syno",
  tailnet: { available: true, observedAt: "2026-08-15T14:02:29.000Z" },
  nats: { available: true, observedAt: "2026-08-15T14:02:30.000Z" },
};

const natsReading: NatsHealth = {
  schema: 1,
  observer: "syno",
  observedAt: "2026-08-15T14:02:30.000Z",
  serverName: "nats-1",
  version: "2.14.4",
  uptime: "3h",
  connections: 4,
  subscriptions: 12,
  inMessages: 100,
  outMessages: 90,
  slowConsumers: 0,
  jetstreamMemoryBytes: 20,
  jetstreamStorageBytes: 30,
};

const tailnetReading: TailnetHealth = {
  schema: 1,
  observer: "syno",
  observedAt: "2026-08-15T14:02:29.000Z",
  version: "1.102.1",
  backendState: "Running",
  selfHostName: "syno",
  selfDnsName: "syno.example.ts.net.",
  selfTailscaleIp: "100.64.0.1",
  peers: [],
};

function observer(reading = publicReading): HealthObserver {
  return {
    read: async () => reading,
    latestNats: () => natsReading,
    latestTailnet: () => tailnetReading,
  };
}

describe("health publication contracts", () => {
  test("fixes the public subjects and two private KV keys", () => {
    expect(PUBLIC_HEALTH_STREAM_SUBJECT).toBe("pub.im.qcic.health.stream");
    expect(PUBLIC_HEALTH_REQUEST_SUBJECT).toBe("pub.im.qcic.health.request");
    expect(PUBLIC_HEALTH_QUEUE_GROUP).toBe("pub.im.qcic.health");
    expect(PUBLIC_HEALTH_STREAM_CONFIG.subjects).toEqual([
      "pub.im.qcic.health.stream",
    ]);
    expect(PUBLIC_HEALTH_RETENTION_MS).toBe(60_000);
    expect(PUBLIC_HEALTH_STREAM_CONFIG.max_age).toBe(60_000 * 1_000_000);
    expect(HEALTH_KV_BUCKET).toBe("im-qcic-health");
    expect(HEALTH_KV_KEYS).toEqual({ nats: "nats", tailnet: "tailnet" });
  });

  test("publishes a redacted public reading and independent current private values", async () => {
    const calls: unknown[] = [];
    const publisher: HealthPublisher = {
      publishPublic: async (reading) => {
        calls.push(["public", reading]);
      },
      publishNats: async (reading) => {
        calls.push(["nats", reading]);
      },
      publishTailnet: async (reading) => {
        calls.push(["tailnet", reading]);
      },
      close: async () => undefined,
    };

    await publishCurrentHealth(observer(), publisher);

    expect(calls).toEqual([
      ["public", publicReading],
      ["nats", natsReading],
      ["tailnet", tailnetReading],
    ]);
    expect(JSON.stringify(calls[0])).not.toContain("serverName");
    expect(JSON.stringify(calls[0])).not.toContain("tailscaleIp");
  });

  test("does not rewrite a failed subsystem's retained private value", async () => {
    const calls: string[] = [];
    const publisher: HealthPublisher = {
      publishPublic: async () => {
        calls.push("public");
      },
      publishNats: async () => {
        calls.push("nats");
      },
      publishTailnet: async () => {
        calls.push("tailnet");
      },
      close: async () => undefined,
    };

    await publishCurrentHealth(
      observer({
        ...publicReading,
        tailnet: { ...publicReading.tailnet, available: false },
      }),
      publisher,
    );

    expect(calls).toEqual(["public", "nats"]);
  });

  test("NATS request/reply returns the same coarse reading as HTTP", async () => {
    const health = observer();
    const http = await createApp(health).request("/healthz");
    const reply = JSON.parse(
      new TextDecoder().decode(await encodeCurrentHealth(health)),
    );

    expect(reply).toEqual(await http.json());
    expect(reply).toEqual(publicReading);
  });
});
