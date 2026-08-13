// The real KvEntrySource (see watch.ts) - thin wiring over wsconnect() +
// @nats-io/kv's watch(). Kept separate from watch.ts's retry orchestration
// and untested directly here (verified live instead, see README) - same
// split scast/nats-source.ts uses relative to scast/feed.ts.

import { wsconnect } from "@nats-io/nats-core";
import { Kvm, type KvWatchEntry } from "@nats-io/kv";
import type { KvCredentials, KvEntrySource } from "./watch";

export const natsKvSource: KvEntrySource = {
  async open(credentials: KvCredentials, bucket: string, key: string) {
    const nc = await wsconnect({ servers: credentials.servers });
    const kvm = new Kvm(nc);
    // open(), not create() - web only ever reads; the bucket is
    // ted1k-derive's to create, not ours (see its README).
    const kv = await kvm.open(bucket);
    const watch = await kv.watch({ key });

    async function* entries(): AsyncGenerator<KvWatchEntry> {
      for await (const entry of watch) {
        yield entry;
      }
    }

    return {
      entries: entries(),
      async close(): Promise<void> {
        watch.stop();
        await nc.close();
      },
    };
  },
};
