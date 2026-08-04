import { connect, type NatsConnection } from "@nats-io/transport-node";
import { Kvm, type KV } from "@nats-io/kv";
import { KV_BUCKET_NAME, type NatsCredentials, type ViewName } from "./config";
import type { ViewPayload } from "./poll";

export interface KvSink {
  publish(view: ViewName, payload: ViewPayload): Promise<void>;
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
    async publish(view: ViewName, payload: ViewPayload): Promise<void> {
      const kv = await getKv();
      await kv.put(view, JSON.stringify(payload));
    },

    async close(): Promise<void> {
      if (ncPromise) {
        const nc = await ncPromise;
        await nc.drain();
      }
    },
  };
}
