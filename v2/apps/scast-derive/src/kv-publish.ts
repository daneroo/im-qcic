// Publishes to the NEW NATS server (from #236), not production - the
// modern @nats-io/* client, kept deliberately separate from
// scrobblecast-datasource.ts's legacy client. See README.md.

import { connect, type NatsConnection } from "@nats-io/transport-node";
import { Kvm, type KV } from "@nats-io/kv";

const BUCKET = "scast-derive";
const KEY = "digest";

export interface NatsCredentials {
  servers: string;
}

export type Publish = (payload: unknown) => Promise<void>;

export interface KvSink {
  publish: Publish;
  close(): Promise<void>;
}

export function createKvPublish(credentials: NatsCredentials | null): KvSink {
  // Tracked separately from `kv` (rather than fished out of it) - the KV
  // type doesn't expose the underlying connection.
  let ncPromise: Promise<NatsConnection> | null = null;
  let kvPromise: Promise<KV> | null = null;

  async function getKv(): Promise<KV> {
    if (!credentials) {
      throw new Error(
        "scast-derive: new-server NATS credentials not configured",
      );
    }
    if (!ncPromise) {
      ncPromise = connect({ servers: credentials.servers });
    }
    if (!kvPromise) {
      kvPromise = ncPromise.then((nc) => new Kvm(nc).create(BUCKET));
    }
    return kvPromise;
  }

  return {
    async publish(payload: unknown): Promise<void> {
      const kv = await getKv();
      await kv.put(KEY, JSON.stringify(payload));
    },
    async close(): Promise<void> {
      if (ncPromise) {
        const nc = await ncPromise;
        await nc.drain();
      }
    },
  };
}
