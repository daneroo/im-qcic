import { connect, type NatsConnection } from "@nats-io/transport-node";
import { Kvm, type KV } from "@nats-io/kv";
import { KV_BUCKET_NAME, KV_KEY, type NatsCredentials } from "./config";
import type { TedcheckPayload } from "./poll";

export interface KvSink {
  publish(payload: TedcheckPayload): Promise<void>;
  close(): Promise<void>;
}

export function createKvSink(credentials: NatsCredentials | null): KvSink {
  let ncPromise: Promise<NatsConnection> | null = null;
  let kvPromise: Promise<KV> | null = null;

  async function getKv(): Promise<KV> {
    if (!credentials) {
      throw new Error("ted1k-derive: NATS credentials not configured");
    }
    if (!ncPromise) {
      ncPromise = connect({ servers: credentials.servers });
    }
    if (!kvPromise) {
      kvPromise = (async () => {
        const nc = await ncPromise!;
        const kvm = new Kvm(nc);
        // create() opens the bucket if it already exists - idempotent.
        return kvm.create(KV_BUCKET_NAME);
      })();
    }
    return kvPromise;
  }

  return {
    async publish(payload: TedcheckPayload): Promise<void> {
      const kv = await getKv();
      await kv.put(KV_KEY, JSON.stringify(payload));
    },

    async close(): Promise<void> {
      if (ncPromise) {
        const nc = await ncPromise;
        await nc.drain();
      }
    },
  };
}
