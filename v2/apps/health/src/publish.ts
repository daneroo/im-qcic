import type { HealthObserver } from "./health";
import type { NatsHealth, PublicHealth, TailnetHealth } from "./types";
import {
  DiscardPolicy,
  RetentionPolicy,
  StorageType,
} from "@nats-io/jetstream";

export const PUBLIC_HEALTH_STREAM_SUBJECT = "pub.im.qcic.health.stream";
export const PUBLIC_HEALTH_REQUEST_SUBJECT = "pub.im.qcic.health.request";
export const PUBLIC_HEALTH_QUEUE_GROUP = "pub.im.qcic.health";
export const PUBLIC_HEALTH_RETENTION_MS = 60_000;
export const PUBLIC_HEALTH_STREAM_CONFIG = {
  name: "PUB_IM_QCIC_HEALTH",
  subjects: [PUBLIC_HEALTH_STREAM_SUBJECT],
  retention: RetentionPolicy.Limits,
  discard: DiscardPolicy.Old,
  storage: StorageType.File,
  // JetStream's max_age unit is nanoseconds.
  max_age: PUBLIC_HEALTH_RETENTION_MS * 1_000_000,
} as const;
export const HEALTH_KV_BUCKET = "im-qcic-health";
export const HEALTH_KV_KEYS = {
  nats: "nats",
  tailnet: "tailnet",
} as const;

export interface HealthPublisher {
  publishPublic(reading: PublicHealth): Promise<void>;
  publishNats(reading: NatsHealth): Promise<void>;
  publishTailnet(reading: TailnetHealth): Promise<void>;
  close(): Promise<void>;
}

export async function publishCurrentHealth(
  health: HealthObserver,
  publisher: HealthPublisher,
): Promise<PublicHealth> {
  const reading = await health.read();
  await publishHealthReading(health, publisher, reading);
  return reading;
}

export async function publishHealthReading(
  health: HealthObserver,
  publisher: HealthPublisher,
  reading: PublicHealth,
): Promise<void> {
  const writes: Promise<void>[] = [publisher.publishPublic(reading)];

  const nats = health.latestNats();
  if (reading.nats.available && nats) {
    writes.push(publisher.publishNats(nats));
  }

  const tailnet = health.latestTailnet();
  if (reading.tailnet.available && tailnet) {
    writes.push(publisher.publishTailnet(tailnet));
  }

  await Promise.all(writes);
}

export async function encodeCurrentHealth(
  health: HealthObserver,
): Promise<Uint8Array> {
  return new TextEncoder().encode(JSON.stringify(await health.read()));
}
