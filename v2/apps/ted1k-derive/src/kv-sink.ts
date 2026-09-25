import { connect } from "@nats-io/transport-node";
import { Kvm } from "@nats-io/kv";
import { KV_BUCKET_NAME, type NatsCredentials, type ViewName } from "./config";
import type { ViewPayload } from "./poll";

export interface KvSink {
  publish(view: ViewName, payload: ViewPayload): Promise<void>;
  close(): Promise<void>;
}

// What the sink needs from an opened bucket - the seam tests fake.
export interface KvHandle {
  put(key: string, value: string): Promise<unknown>;
  close(): Promise<void>;
}

export type OpenKv = (servers: string) => Promise<KvHandle>;

// Unlimited reconnects: once open, a nats restart must not leave a
// permanently closed connection behind a resolved handle.
async function openKv(servers: string): Promise<KvHandle> {
  const nc = await connect({ servers, maxReconnectAttempts: -1 });
  try {
    // create() opens the bucket if it already exists - idempotent.
    const kv = await new Kvm(nc).create(KV_BUCKET_NAME);
    return { put: (key, value) => kv.put(key, value), close: () => nc.drain() };
  } catch (err) {
    await nc.close();
    throw err;
  }
}

export function createKvSink(
  credentials: NatsCredentials | null,
  open: OpenKv = openKv,
): KvSink {
  let handlePromise: Promise<KvHandle> | null = null;

  // A failed open is forgotten, not cached: at boot nats may not be up (or
  // even resolvable) yet, and the next poll cycle must dial again (#297).
  function getHandle(): Promise<KvHandle> {
    if (!credentials) {
      return Promise.reject(
        new Error("ted1k-derive: NATS credentials not configured"),
      );
    }
    if (!handlePromise) {
      const attempt = open(credentials.servers);
      handlePromise = attempt;
      attempt.catch(() => {
        if (handlePromise === attempt) handlePromise = null;
      });
    }
    return handlePromise;
  }

  return {
    async publish(view: ViewName, payload: ViewPayload): Promise<void> {
      const kv = await getHandle();
      await kv.put(view, JSON.stringify(payload));
    },

    async close(): Promise<void> {
      const handle = await handlePromise?.catch(() => null);
      await handle?.close();
    },
  };
}
