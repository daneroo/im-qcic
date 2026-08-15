import {
  jetstream,
  jetstreamManager,
  JetStreamApiCodes,
  JetStreamApiError,
} from "@nats-io/jetstream";
import { Kvm } from "@nats-io/kv";
import { connect, type Subscription } from "@nats-io/transport-node";
import type { HealthObserver } from "./health";
import {
  HEALTH_KV_BUCKET,
  HEALTH_KV_KEYS,
  PUBLIC_HEALTH_QUEUE_GROUP,
  PUBLIC_HEALTH_REQUEST_SUBJECT,
  PUBLIC_HEALTH_STREAM_CONFIG,
  PUBLIC_HEALTH_STREAM_SUBJECT,
  encodeCurrentHealth,
  type HealthPublisher,
} from "./publish";

export async function createNatsPublisher(options: {
  servers: string;
  timeoutMs: number;
  health: HealthObserver;
  onError?: (error: unknown, operation: string) => void;
}): Promise<HealthPublisher> {
  const nc = await connect({
    servers: options.servers,
    timeout: options.timeoutMs,
  });
  const jsm = await jetstreamManager(nc);

  try {
    await jsm.streams.info(PUBLIC_HEALTH_STREAM_CONFIG.name);
    await jsm.streams.update(PUBLIC_HEALTH_STREAM_CONFIG.name, {
      ...PUBLIC_HEALTH_STREAM_CONFIG,
      subjects: [...PUBLIC_HEALTH_STREAM_CONFIG.subjects],
    });
  } catch (error) {
    if (
      !(error instanceof JetStreamApiError) ||
      error.code !== JetStreamApiCodes.StreamNotFound
    ) {
      throw error;
    }
    await jsm.streams.add({
      ...PUBLIC_HEALTH_STREAM_CONFIG,
      subjects: [...PUBLIC_HEALTH_STREAM_CONFIG.subjects],
    });
  }

  const js = jetstream(nc);
  const kv = await new Kvm(nc).create(HEALTH_KV_BUCKET, { history: 1 });
  const requests = nc.subscribe(PUBLIC_HEALTH_REQUEST_SUBJECT, {
    queue: PUBLIC_HEALTH_QUEUE_GROUP,
  });
  void answerRequests(requests, options.health, options.onError);

  return {
    async publishPublic(reading) {
      await js.publish(PUBLIC_HEALTH_STREAM_SUBJECT, JSON.stringify(reading));
    },
    async publishNats(reading) {
      await kv.put(HEALTH_KV_KEYS.nats, JSON.stringify(reading));
    },
    async publishTailnet(reading) {
      await kv.put(HEALTH_KV_KEYS.tailnet, JSON.stringify(reading));
    },
    async close() {
      requests.unsubscribe();
      await nc.close();
    },
  };
}

async function answerRequests(
  requests: Subscription,
  health: HealthObserver,
  onError: ((error: unknown, operation: string) => void) | undefined,
): Promise<void> {
  for await (const request of requests) {
    try {
      request.respond(await encodeCurrentHealth(health));
    } catch (error) {
      onError?.(error, "answer health request");
    }
  }
}
